export function normalizeScannedAddress(raw: string): string {
  const t = raw.trim();
  const uri = t.match(
    /^(?:bitcoin|ethereum|bitcoincash|tether):(?:\/\/)?([^?]+)/i
  );
  if (uri?.[1]) return decodeURIComponent(uri[1]);
  return t;
}
