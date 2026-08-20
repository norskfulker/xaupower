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
      signalId?: string;
      exitPrice?: number;
    };

    if (!body.signalId || body.exitPrice == null) {
      return NextResponse.json(
        { error: "signalId and exitPrice are required" },
        { status: 400 }
      );
    }

    const { data: signal, error: fetchError } = await supabase
      .from("signals")
      .select("*")
      .eq("id", body.signalId)
      .single();

    if (fetchError || !signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    if (signal.status !== "open") {
      return NextResponse.json(
        { error: "Signal is not open" },
        { status: 400 }
      );
    }

    const entry = Number(signal.entry_price);
    const exit = Number(body.exitPrice);
    // Simplified USD P&L per 1 unit notionally — feed performance metric
    const pnl =
      signal.direction === "long" ? exit - entry : entry - exit;

    const { data, error } = await supabase
      .from("signals")
      .update({
        status: "closed",
        pnl_usd: Number(pnl.toFixed(2)),
        closed_at: new Date().toISOString(),
      })
      .eq("id", body.signalId)
      .select("*")
      .single();

    if (error) {
      console.error("close signal failed", error);
      return NextResponse.json(
        { error: "Could not close signal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signal: data });
  } catch (err) {
    console.error("close signal error", err);
    return NextResponse.json(
      { error: "Could not close signal" },
      { status: 500 }
    );
  }
}
