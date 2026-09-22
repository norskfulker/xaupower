/**
 * Robust clipboard write with fallback for non-secure contexts
 * (HTTP, sandboxes without clipboard API, etc.).
 *
 * Usage:
 *   await copyToClipboard("hello");  // returns true on success
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  // 1. Modern path — requires HTTPS or localhost + clipboard permission.
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the textarea fallback.
    }
  }

  // 2. Legacy fallback — works in non-secure contexts and older browsers.
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
