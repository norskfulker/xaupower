import { NextResponse } from "next/server";

const FALLBACK = { XAUUSD: 2341.2, XAGUSD: 27.84 };

export async function GET() {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) {
    return NextResponse.json(FALLBACK);
  }

  try {
    const [xauRes, xagRes] = await Promise.all([
      fetch(
        `https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${key}`,
        { next: { revalidate: 25 } }
      ),
      fetch(
        `https://api.twelvedata.com/price?symbol=XAG/USD&apikey=${key}`,
        { next: { revalidate: 25 } }
      ),
    ]);

    const xau = await xauRes.json();
    const xag = await xagRes.json();

    return NextResponse.json({
      XAUUSD: Number(xau.price) || FALLBACK.XAUUSD,
      XAGUSD: Number(xag.price) || FALLBACK.XAGUSD,
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
