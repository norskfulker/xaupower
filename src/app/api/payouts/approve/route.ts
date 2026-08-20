import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNowPayout, mapPayCurrency } from "@/lib/nowpayments/client";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { payoutId?: string };
    if (!body.payoutId) {
      return NextResponse.json({ error: "payoutId required" }, { status: 400 });
    }

    const { data: payout, error: approveError } = await supabase.rpc(
      "approve_payout_start",
      { p_payout_id: body.payoutId }
    );

    if (approveError || !payout) {
      console.error("approve_payout_start failed", approveError);
      return NextResponse.json(
        { error: "Could not approve payout" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (!process.env.NOWPAYMENTS_API_KEY) {
      return NextResponse.json({
        payout,
        requiresVerification: false,
        stub: true,
        message: "Approved. Configure NOWPayments sandbox keys to send crypto.",
      });
    }

    try {
      const np = await createNowPayout({
        address: payout.destination_address,
        currency: mapPayCurrency(payout.currency),
        amount: Number(payout.amount_usd),
        fiatAmount: Number(payout.amount_usd),
        ipnCallbackUrl: `${appUrl}/api/webhooks/nowpayments-payout`,
      });

      const npId = String(
        np.id ?? np.batch_withdrawal_id ?? np.withdrawals?.[0]?.id ?? ""
      );

      if (npId) {
        await supabase.rpc("attach_nowpayments_payout_id", {
          p_payout_id: payout.id,
          p_nowpayments_payout_id: npId,
        });
      }

      return NextResponse.json({
        payout: { ...payout, nowpayments_payout_id: npId || null },
        requiresVerification: true,
        batchId: npId,
      });
    } catch (npErr) {
      console.error("NOWPayments payout create failed", npErr);
      await supabase.rpc("mark_payout_provider_failed", {
        p_payout_id: payout.id,
        p_note: "Payout provider failed to start — balance restored",
      });

      return NextResponse.json(
        { error: "Payout provider failed. Balance restored." },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("approve payout error", err);
    return NextResponse.json(
      { error: "Could not approve payout" },
      { status: 500 }
    );
  }
}
