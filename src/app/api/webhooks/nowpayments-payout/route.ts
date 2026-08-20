import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { verifyNowPaymentsSignature } from "@/lib/nowpayments/verify-ipn";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-nowpayments-sig");
  const secret = process.env.NOWPAYMENTS_IPN_SECRET ?? "";

  if (!verifyNowPaymentsSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = String(payload.status ?? payload.withdrawal_status ?? "");
  const id = String(
    payload.id ?? payload.batch_withdrawal_id ?? payload.payment_id ?? ""
  );
  const txHash =
    typeof payload.hash === "string"
      ? payload.hash
      : typeof payload.txid === "string"
        ? payload.txid
        : null;

  try {
    const admin = createServiceClient();
    const { data: payout } = await admin
      .from("payouts")
      .select("*")
      .eq("nowpayments_payout_id", id)
      .maybeSingle();

    if (!payout) {
      console.error("payout webhook not found", { id, payload });
      return NextResponse.json({ ok: true });
    }

    const finished =
      status === "FINISHED" ||
      status === "finished" ||
      status === "COMPLETED" ||
      status === "completed" ||
      status === "sent";

    const failed =
      status === "FAILED" ||
      status === "failed" ||
      status === "REJECTED" ||
      status === "rejected";

    if (finished) {
      await admin.rpc("complete_payout_sent", {
        p_payout_id: payout.id,
        p_tx_hash: txHash,
      });
    } else if (failed) {
      await admin.rpc("fail_payout_and_restore", {
        p_payout_id: payout.id,
        p_note: "Payout failed at provider — balance restored",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("payout webhook error", { id, payload, error: err });
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
