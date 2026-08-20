import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAdminDepositAlert } from "@/lib/email";
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
      packageVariantId?: string;
      currency?: CryptoCurrency;
      txHash?: string;
      userNote?: string;
    };

    if (!body.packageVariantId || !body.currency || !body.txHash?.trim()) {
      return NextResponse.json(
        { error: "Package, currency, and tx hash are required" },
        { status: 400 }
      );
    }

    if (!["BTC", "ETH", "USDT"].includes(body.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const { data: payment, error } = await supabase.rpc("submit_manual_payment", {
      p_package_variant_id: body.packageVariantId,
      p_currency: body.currency,
      p_tx_hash: body.txHash.trim(),
      p_user_note: body.userNote?.trim() || null,
    });

    if (error || !payment) {
      console.error("submit_manual_payment failed", error);
      return NextResponse.json(
        { error: "Could not submit payment" },
        { status: 500 }
      );
    }

    const { data: variant } = await supabase
      .from("package_variants")
      .select("risk_tier, price_usd, packages(name)")
      .eq("id", body.packageVariantId)
      .single();

    const packageName =
      (variant?.packages as { name?: string } | null)?.name ?? "Package";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      await sendAdminDepositAlert({
        userEmail: user.email ?? "unknown",
        packageLabel: packageName,
        riskTier: String(variant?.risk_tier ?? ""),
        currency: body.currency,
        amountUsd: Number(variant?.price_usd ?? payment.amount_usd),
        txHash: body.txHash.trim(),
        reviewUrl: `${appUrl}/admin#payments`,
      });
    } catch (emailErr) {
      console.error("admin deposit email failed", emailErr);
    }

    return NextResponse.json({ payment });
  } catch (err) {
    console.error("payment submit error", err);
    return NextResponse.json(
      { error: "Could not submit payment" },
      { status: 500 }
    );
  }
}
