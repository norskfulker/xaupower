import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCryptoAddress } from "@/lib/address-validation";
import type { CryptoCurrency } from "@/lib/types";

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
      currency?: CryptoCurrency;
      destinationAddress?: string;
    };

    const amount = Number(body.amountUsd);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    }

    if (!body.currency || !["BTC", "ETH", "USDT"].includes(body.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const addressError = validateCryptoAddress(
      body.currency,
      body.destinationAddress ?? ""
    );
    if (addressError) {
      return NextResponse.json({ error: addressError }, { status: 400 });
    }

    const { data: wallet } = await supabase
      .from("wallet_balances")
      .select("available_usd")
      .eq("user_id", user.id)
      .single();

    const available = Number(wallet?.available_usd ?? 0);
    if (amount > available) {
      return NextResponse.json(
        {
          error: `Amount exceeds your available balance of $${available.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const { data: payoutId, error } = await supabase.rpc("request_payout", {
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

    return NextResponse.json({ payoutId });
  } catch (err) {
    console.error("payout request error", err);
    return NextResponse.json(
      { error: "Could not request payout" },
      { status: 500 }
    );
  }
}
