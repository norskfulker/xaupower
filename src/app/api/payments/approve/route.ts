import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const body = (await request.json()) as { paymentId?: string };
    if (!body.paymentId) {
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    const { error } = await supabase.rpc("approve_payment_and_activate", {
      p_payment_id: body.paymentId,
    });

    if (error) {
      console.error("approve_payment_and_activate failed", error);
      return NextResponse.json(
        { error: "Could not approve payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("approve payment error", err);
    return NextResponse.json(
      { error: "Could not approve payment" },
      { status: 500 }
    );
  }
}
