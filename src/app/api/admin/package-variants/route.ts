import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RiskTier, RoadmapStep } from "@/lib/types";

export async function PATCH(request: Request) {
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
      id?: string;
      price_usd?: number;
      max_lot_size?: number;
      profit_target_pct?: number;
      max_drawdown_pct?: number;
      roadmap?: RoadmapStep[];
      risk_tier?: RiskTier;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const price = Number(body.price_usd);
    const lots = Number(body.max_lot_size);
    const target = Number(body.profit_target_pct);
    const drawdown = Number(body.max_drawdown_pct);
    if (!(price > 0) || !(lots > 0) || !Number.isFinite(target) || !Number.isFinite(drawdown)) {
      return NextResponse.json(
        { error: "Price and lot size must be greater than 0" },
        { status: 400 }
      );
    }

    const roadmap = Array.isArray(body.roadmap)
      ? body.roadmap
          .filter((s) => s && String(s.label ?? "").trim())
          .map((s, i) => ({ step: i + 1, label: String(s.label).trim() }))
      : [];

    const { data, error } = await supabase
      .from("package_variants")
      .update({
        price_usd: price,
        max_lot_size: lots,
        profit_target_pct: target,
        max_drawdown_pct: drawdown,
        roadmap,
      })
      .eq("id", body.id)
      .select("*, packages(*)")
      .single();

    if (error) {
      console.error("package variant update failed", error);
      return NextResponse.json(
        { error: "Could not save package variant" },
        { status: 500 }
      );
    }

    return NextResponse.json({ variant: data });
  } catch (err) {
    console.error("package variant update error", err);
    return NextResponse.json(
      { error: "Could not save package variant" },
      { status: 500 }
    );
  }
}
