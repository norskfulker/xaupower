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

    const body = (await request.json()) as {
      paymentId?: string;
      adminNote?: string;
    };

    if (!body.paymentId || !body.adminNote?.trim()) {
      return NextResponse.json(
        { error: "paymentId and adminNote are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("reject_payment", {
      p_payment_id: body.paymentId,
      p_admin_note: body.adminNote.trim(),
    });

    if (error) {
      console.error("reject_payment failed", error);
      return NextResponse.json(
        { error: "Could not reject payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reject payment error", err);
    return NextResponse.json(
      { error: "Could not reject payment" },
      { status: 500 }
    );
  }
}
