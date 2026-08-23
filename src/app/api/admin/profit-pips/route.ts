import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOwnProfile(user.id);
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      userId?: string;
      profitPips?: number;
    };

    if (!body.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const pips = Number(body.profitPips);
    if (!Number.isFinite(pips)) {
      return NextResponse.json({ error: "Invalid pips value" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("wallet_balances")
      .select("id")
      .eq("user_id", body.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("wallet_balances")
        .update({ profit_pips: pips, updated_at: new Date().toISOString() })
        .eq("user_id", body.userId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("wallet_balances").insert({
        user_id: body.userId,
        available_usd: 0,
        pending_usd: 0,
        profit_pips: pips,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, profitPips: pips });
  } catch (err) {
    console.error("profit-pips update failed", err);
    return NextResponse.json({ error: "Could not update pips" }, { status: 500 });
  }
}
