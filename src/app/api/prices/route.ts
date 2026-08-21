import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PriceQuote } from "@/lib/prices";

/** Reads the server-side cache only. Does not call goldprice.dev. */
export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("price_cache")
    .select("pair, price, change_pct, fetched_at")
    .eq("pair", "XAUUSD");

  if (error) {
    return NextResponse.json({ quotes: [] as PriceQuote[] }, { status: 200 });
  }

  return NextResponse.json({ quotes: (data ?? []) as PriceQuote[] });
}
