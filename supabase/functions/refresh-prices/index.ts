import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PAIR = { pair: "XAUUSD", symbol: "XAU-USD-SPOT" } as const;
const MIN_FETCH_GAP_MS = 4 * 60 * 1000;

type GoldPriceResponse = {
  symbols?: Array<{
    price?: string;
    is_stale?: boolean;
  }>;
  error?: string;
  message?: string;
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: existing } = await supabase
    .from("price_cache")
    .select("pair, price, fetched_at")
    .eq("pair", PAIR.pair)
    .maybeSingle();

  if (
    existing &&
    Date.now() - new Date(existing.fetched_at).getTime() < MIN_FETCH_GAP_MS
  ) {
    return json({ updated: [], skipped: [`${PAIR.pair}:fresh`] });
  }

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const apiKey = Deno.env.get("GOLDPRICE_API_KEY");
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(
      `https://api.goldprice.dev/v1/prices?symbol=${PAIR.symbol}`,
      { headers }
    );
    const body = (await res.json()) as GoldPriceResponse;

    if (!res.ok) {
      return json({ updated: [], skipped: [`${PAIR.pair}:${body.error ?? res.status}`] });
    }

    const price = Number(body.symbols?.[0]?.price);
    if (!Number.isFinite(price) || price <= 0) {
      return json({ updated: [], skipped: [`${PAIR.pair}:invalid_price`] });
    }

    const prevPrice = existing ? Number(existing.price) : null;
    const changePct =
      prevPrice && prevPrice > 0
        ? ((price - prevPrice) / prevPrice) * 100
        : null;

    const { error } = await supabase.from("price_cache").upsert({
      pair: PAIR.pair,
      price,
      change_pct: changePct,
      fetched_at: new Date().toISOString(),
    });

    if (error) {
      return json({ updated: [], skipped: [`${PAIR.pair}:${error.message}`] }, 500);
    }

    return json({ updated: [PAIR.pair], skipped: [] });
  } catch (err) {
    return json(
      {
        updated: [],
        skipped: [
          `${PAIR.pair}:${err instanceof Error ? err.message : "fetch_failed"}`,
        ],
      },
      500
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
