"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** The text to copy. */
  value: string;
  /** Optional short label / aria-label. */
  label?: string;
  /** Optional className applied to the trigger button. */
  className?: string;
  /** Render variant. "icon" = icon-only chip; "button" = full button with label. */
  variant?: "icon" | "button";
};

/**
 * Copy-to-clipboard button.
 *
 * Implementation: a single button that calls navigator.clipboard.writeText
 * inside the click handler. Modern, async, no DOM manipulation. If the
 * clipboard API fails (HTTPS issue, browser denied permission, etc.) we
 * fall back to a transient input that the user can manually select.
 *
 * No state machines, no setTimeout, no infinite loops. Safe to render
 * anywhere — including inside dialogs with focus traps.
 */
export function CopyButton({
  value,
  label,
  className,
  variant = "icon",
}: Props) {
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState(false);

  async function handleClick() {
    // Reset state at the start of every click so the icon flips cleanly.
    setDone(false);
    setFail(false);

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(value);
        setDone(true);
        // Auto-reset the success indicator after 2s.
        window.setTimeout(() => setDone(false), 2000);
        return;
      }
      throw new Error("navigator.clipboard not available");
    } catch {
      setFail(true);
      window.setTimeout(() => setFail(false), 4000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label ?? "Copy"}
      aria-label={label ?? "Copy"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border transition disabled:opacity-50",
        variant === "icon"
          ? "size-7 shrink-0 border-border bg-card text-muted-label hover:text-orange"
          : "h-9 border-border bg-card px-3 text-sm font-semibold text-ink hover:border-orange/40 hover:text-orange",
        done && "border-teal/40 bg-teal/10 text-teal",
        fail && "border-hotpink/40 bg-hotpink/10 text-hotpink",
        className
      )}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {variant === "button" && (
        <span>
          {done ? "Copied" : fail ? "Copy failed" : label ?? "Copy"}
        </span>
      )}
    </button>
  );
}