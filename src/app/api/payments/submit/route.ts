import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAdminDepositAlert, sendUserDepositNotice } from "@/lib/email";
import { PAYMENT_KIND_LABEL } from "@/lib/format";
import { isPaymentRail } from "@/lib/wallets";
import { SIGNAL_PRICE_USD, type PaymentKind } from "@/lib/types";

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
      kind?: PaymentKind;
      packageVariantId?: string;
      amountUsd?: number;
      currency?: string;
      txHash?: string;
      userNote?: string;
    };

    const kind: PaymentKind = body.kind ?? "package";
    if (!["package", "balance", "signal"].includes(kind)) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    if (!body.currency || !body.txHash?.trim()) {
      return NextResponse.json(
        { error: "Currency and tx hash are required" },
        { status: 400 }
      );
    }

    if (!body.currency || !isPaymentRail(body.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (kind === "package" && !body.packageVariantId) {
      return NextResponse.json(
        { error: "Package, currency, and tx hash are required" },
        { status: 400 }
      );
    }

    const { data: payment, error } = await supabase.rpc("submit_manual_payment", {
      p_kind: kind,
      p_currency: body.currency,
      p_tx_hash: body.txHash.trim(),
      p_package_variant_id: kind === "package" ? body.packageVariantId : null,
      p_amount_usd: kind === "balance" ? Number(body.amountUsd) : null,
      p_user_note: body.userNote?.trim() || null,
    });

    if (error || !payment) {
      console.error("submit_manual_payment failed", error);
      const message =
        error?.message?.replace(/^.*ERROR:\s*/i, "").split("\n")[0] ||
        "Could not submit payment";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let packageLabel = PAYMENT_KIND_LABEL[kind];
    let riskTier = String(kind);
    let amountUsd = Number(payment.amount_usd ?? 0);

    if (kind === "package" && body.packageVariantId) {
      const { data: variant } = await supabase
        .from("package_variants")
        .select("risk_tier, price_usd, packages(name)")
        .eq("id", body.packageVariantId)
        .single();
      packageLabel =
        (variant?.packages as { name?: string } | null)?.name ?? "Package";
      riskTier = String(variant?.risk_tier ?? "");
      amountUsd = Number(variant?.price_usd ?? payment.amount_usd);
    } else if (kind === "signal") {
      amountUsd = SIGNAL_PRICE_USD;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      await sendAdminDepositAlert({
        userEmail: user.email ?? "unknown",
        packageLabel,
        riskTier,
        currency: body.currency,
        amountUsd,
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
          amountUsd,
          currency: body.currency,
        });
      }
    } catch (emailErr) {
      console.error("user deposit notice failed", emailErr);
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
