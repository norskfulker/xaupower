import { sendUserPayoutNotice } from "@/lib/email";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCryptoAddress } from "@/lib/address-validation";
import { isPaymentRail } from "@/lib/wallets";
import { MIN_WITHDRAWAL_USD } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
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
      accountId?: string;
    };

    const amount = Number(body.amountUsd);
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_USD) {
      return NextResponse.json(
        { error: `Minimum withdrawal is $${MIN_WITHDRAWAL_USD.toFixed(2)}` },
        { status: 400 }
      );
    }

    if (!body.accountId) {
      return NextResponse.json({ error: "Account id required" }, { status: 400 });
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

    const { data: payoutId, error } = await supabase.rpc("request_withdrawal", {
      p_account_id: body.accountId,
      p_amount_usd: amount,
      p_currency: body.currency,
      p_destination_address: body.destinationAddress!.trim(),
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
