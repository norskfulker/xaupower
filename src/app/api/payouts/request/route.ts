import { sendUserPayoutNotice } from "@/lib/email";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCryptoAddress } from "@/lib/address-validation";
import { isPaymentRail } from "@/lib/wallets";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      amountUsd?: number;
      currency?: string;
      destinationAddress?: string;
      userPackageId?: string;
    };

    const amount = Number(body.amountUsd);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    }

    if (!body.userPackageId) {
      return NextResponse.json({ error: "Bot account required" }, { status: 400 });
    }

    if (!body.currency || !isPaymentRail(body.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const addressError = validateCryptoAddress(
      body.currency,
      body.destinationAddress ?? ""
    );
    if (addressError) {
      return NextResponse.json({ error: addressError }, { status: 400 });
    }

    const { data: botAccount } = await supabase
      .from("user_packages")
      .select("available_usd")
      .eq("id", body.userPackageId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const available = Number(botAccount?.available_usd ?? 0);
    if (amount > available) {
      return NextResponse.json(
        {
          error: `Amount exceeds available balance of $${available.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const { data: payoutId, error } = await supabase.rpc("request_payout", {
      p_amount_usd: amount,
      p_currency: body.currency,
      p_destination_address: body.destinationAddress!.trim(),
      p_user_package_id: body.userPackageId,
    });

    if (error) {
      console.error("request_payout failed", error);
      return NextResponse.json(
        { error: "Could not request payout" },
        { status: 500 }
      );
    }

    try {
      const { data: prefsRow } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();
      const prefs = prefsRow?.notification_preferences as
        | { email_payouts?: boolean }
        | null;
      if (prefs?.email_payouts !== false && user.email) {
        await sendUserPayoutNotice({
          to: user.email,
          amountUsd: amount,
          currency: body.currency,
        });
      }
    } catch (emailErr) {
      console.error("user payout notice failed", emailErr);
    }

    return NextResponse.json({ payoutId });
  } catch (err) {
    console.error("payout request error", err);
    return NextResponse.json(
      { error: "Could not request payout" },
      { status: 500 }
    );
  }
}
