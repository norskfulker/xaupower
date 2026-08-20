import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { verifyNowPayout } from "@/lib/nowpayments/client";

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

    const body = (await request.json()) as {
      payoutId?: string;
      verificationCode?: string;
    };

    if (!body.payoutId || !body.verificationCode?.trim()) {
      return NextResponse.json(
        { error: "payoutId and verificationCode are required" },
        { status: 400 }
      );
    }

    const admin = createServiceClient();
    const { data: payout } = await admin
      .from("payouts")
      .select("*")
      .eq("id", body.payoutId)
      .single();

    if (!payout?.nowpayments_payout_id) {
      return NextResponse.json(
        { error: "Payout has no NOWPayments batch id" },
        { status: 400 }
      );
    }

    await verifyNowPayout(
      payout.nowpayments_payout_id,
      body.verificationCode.trim()
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("verify payout error", err);
    return NextResponse.json(
      { error: "Could not verify payout" },
      { status: 500 }
    );
  }
}
