import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SignalDirection, SignalPair } from "@/lib/types";

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
      pair?: SignalPair;
      direction?: SignalDirection;
      entryPrice?: number;
      stopLoss?: number;
      takeProfit?: number;
    };

    if (
      !body.pair ||
      !body.direction ||
      body.entryPrice == null ||
      body.stopLoss == null ||
      body.takeProfit == null
    ) {
      return NextResponse.json(
        { error: "All signal fields are required" },
        { status: 400 }
      );
    }

    if (body.pair !== "XAUUSD") {
      return NextResponse.json(
        { error: "XAUPower posts XAUUSD (gold) signals only" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("signals")
      .insert({
        pair: body.pair,
        direction: body.direction,
        entry_price: body.entryPrice,
        stop_loss: body.stopLoss,
        take_profit: body.takeProfit,
        status: "open",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("signal insert failed", error);
      return NextResponse.json(
        { error: "Could not post signal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signal: data });
  } catch (err) {
    console.error("create signal error", err);
    return NextResponse.json(
      { error: "Could not post signal" },
      { status: 500 }
    );
  }
}
