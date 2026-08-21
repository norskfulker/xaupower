const BASE =
  process.env.NOWPAYMENTS_API_URL ??
  "https://api.sandbox.nowpayments.io/v1";

function apiKey() {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not configured");
  return key;
}

export async function getPayoutJwt() {
  const email = process.env.NOWPAYMENTS_EMAIL;
  const password = process.env.NOWPAYMENTS_PASSWORD;
  if (!email || !password) {
    throw new Error("NOWPAYMENTS_EMAIL and NOWPAYMENTS_PASSWORD required for payouts");
  }

  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data?.message || "Failed to authenticate with NOWPayments");
  }
  return data.token as string;
}

export async function createNowPayout(input: {
  address: string;
  currency: string;
  amount: number;
  ipnCallbackUrl: string;
  fiatAmount: number;
}) {
  const token = await getPayoutJwt();
  const res = await fetch(`${BASE}/payout`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ipn_callback_url: input.ipnCallbackUrl,
      withdrawals: [
        {
          address: input.address,
          currency: input.currency.toLowerCase(),
          amount: input.amount,
          fiat_amount: input.fiatAmount,
          fiat_currency: "usd",
          ipn_callback_url: input.ipnCallbackUrl,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to create NOWPayments payout");
  }
  return data as {
    id?: string | number;
    batch_withdrawal_id?: string | number;
    withdrawals?: Array<{ id?: string | number }>;
  };
}

export async function verifyNowPayout(batchId: string, verificationCode: string) {
  const token = await getPayoutJwt();
  const res = await fetch(`${BASE}/payout/${batchId}/verify`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ verification_code: verificationCode }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to verify NOWPayments payout");
  }
  return data;
}

export function mapPayCurrency(currency: string): string {
  const map: Record<string, string> = {
    BTC: "btc",
    ETH: "eth",
    BNB: "bnbbsc",
    TRX: "trx",
    USDT: "usdttrc20",
    USDT_ERC20: "usdterc20",
    USDT_BEP20: "usdtbsc",
    USDT_TRC20: "usdttrc20",
    USDC_ERC20: "usdc",
    USDC_BEP20: "usdcbsc",
    USDC_TRC20: "usdctrc20",
  };
  return map[currency] ?? currency.toLowerCase();
}
