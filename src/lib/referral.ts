export const REFERRAL_CODE_MIN = 4;
export const REFERRAL_CODE_MAX = 12;

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidReferralCodeFormat(raw: string): boolean {
  const code = normalizeReferralCode(raw);
  return (
    code.length >= REFERRAL_CODE_MIN && code.length <= REFERRAL_CODE_MAX
  );
}

export function referralSignupPath(code: string): string {
  const normalized = normalizeReferralCode(code);
  return `/login?ref=${encodeURIComponent(normalized)}`;
}
