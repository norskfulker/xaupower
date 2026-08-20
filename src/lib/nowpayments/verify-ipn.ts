import crypto from "crypto";

export function verifyNowPaymentsSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return false;
  }

  const sorted = JSON.stringify(parsed, Object.keys(parsed).sort());
  const hmac = crypto
    .createHmac("sha512", secret)
    .update(sorted)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}
