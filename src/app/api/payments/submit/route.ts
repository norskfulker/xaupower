import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAdminDepositAlert, sendUserDepositNotice } from "@/lib/email";
import { isPaymentRail } from "@/lib/wallets";
import { MIN_DEPOSIT_USD, MAX_DEPOSIT_USD } from "@/lib/types";

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
      accountId?: string;
      amountUsd?: number;
      currency?: string;
      txHash?: string;
      userNote?: string;
    };

    if (!body.accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }
    if (!body.currency || !isPaymentRail(body.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }
    if (!body.txHash?.trim()) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }
    const amount = Number(body.amountUsd);
    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_USD) {
      return NextResponse.json(
        { error: `Minimum deposit is $${MIN_DEPOSIT_USD}` },
        { status: 400 }
      );
    }
    if (amount > MAX_DEPOSIT_USD) {
      return NextResponse.json(
        { error: `Maximum per payment is $${MAX_DEPOSIT_USD.toLocaleString()}` },
        { status: 400 }
      );
    }

    const { data: payment, error } = await supabase.rpc("submit_deposit", {
      p_account_id: body.accountId,
      p_amount_usd: amount,
      p_currency: body.currency,
      p_tx_hash: body.txHash.trim(),
      p_user_note: body.userNote?.trim() || null,
    });

    if (error || !payment) {
      console.error("submit_deposit failed", error);
      const message =
        error?.message?.replace(/^.*ERROR:\s*/i, "").split("\n")[0] ||
        "Could not submit deposit";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      await sendAdminDepositAlert({
        userEmail: user.email ?? "unknown",
        accountCode: (payment as { account_id?: string }).account_id ?? "",
        currency: body.currency,
        amountUsd: amount,
        txHash: body.txHash.trim(),
        reviewUrl: `${appUrl}/admin/payments`,
      });
    } catch (emailErr) {
      console.error("admin deposit email failed", emailErr);
    }

    try {
      const { data: prefsRow } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();
      const prefs = prefsRow?.notification_preferences as
        | { email_deposits?: boolean }
        | null;
      if (prefs?.email_deposits !== false && user.email) {
        await sendUserDepositNotice({
          to: user.email,
          amountUsd: amount,
          currency: body.currency,
        });
      }
    } catch (emailErr) {
      console.error("user deposit notice failed", emailErr);
    }

    return NextResponse.json({ payment });
  } catch (err) {
    console.error("deposit submit error", err);
    return NextResponse.json(
      { error: "Could not submit deposit" },
      { status: 500 }
    );
  }
}