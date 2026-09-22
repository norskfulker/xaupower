import { NextResponse } from "next/server";
import { createClient, getOwnProfile } from "@/lib/supabase/server";

/**
 * POST /api/admin/credit-daily-returns
 *
 * External scheduler (Supabase cron, Vercel Cron, GitHub Actions, etc.)
 * calls this once per day, ideally at 00:00 UTC. The endpoint is idempotent
 * thanks to the UNIQUE (account_id, credit_date) constraint on
 * public.daily_return_credit — calling it twice in a row credits once.
 *
 * Optional JSON body:
 *   { "creditDate": "2026-09-22" } — defaults to today (UTC)
 *
 * Daily-return pct is rolled per account:
 *   days 1-3: uniform random in [0%, +5%]
 *   day 4+:  uniform random in [-30%, +10%]
 *
 * Returns { credited: number } on success.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
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

    let body: { creditDate?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      // Empty body is fine — defaults to today.
    }

    const { data, error } = await supabase.rpc("credit_daily_returns", {
      p_credit_date: body.creditDate ?? undefined,
    });

    if (error) {
      console.error("credit_daily_returns failed", error);
      return NextResponse.json(
        { error: "Could not credit daily returns" },
        { status: 500 }
      );
    }

    return NextResponse.json({ credited: data ?? 0 });
  } catch (err) {
    console.error("credit-daily-returns error", err);
    return NextResponse.json(
      { error: "Could not credit daily returns" },
      { status: 500 }
    );
  }
}
