"use client";

import { Gift, Users } from "lucide-react";
import type { Profile, ReferralLeaderboardRow } from "@/lib/types";

export function ReferralWorkspace({
  profile,
  leaderboard,
}: {
  profile: Pick<Profile, "email" | "full_name">;
  leaderboard: ReferralLeaderboardRow[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-ink sm:text-3xl">
          Referrals
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-label">
          Invite other users. Earn rewards when they activate their first account.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Your account</p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
              <Gift className="size-4" />
            </span>
          </div>
          <p
            className="mt-3 text-orange"
            style={{
              fontFamily:
                "var(--font-feature-display), FeatureDisplayNumerals, var(--font-inter), sans-serif",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              fontSize: "2rem",
              lineHeight: 1,
            }}
          >
            {profile.full_name || profile.email}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Top referrers</p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
              <Users className="size-4" />
            </span>
          </div>
          <p
            className="mt-3 text-orange"
            style={{
              fontFamily:
                "var(--font-feature-display), FeatureDisplayNumerals, var(--font-inter), sans-serif",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              fontSize: "2rem",
              lineHeight: 1,
            }}
          >
            {leaderboard.length}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-7">
        <h2 className="font-display text-lg text-ink">Top referrers (this week)</h2>
        {leaderboard.length === 0 ? (
          <p className="mt-3 text-sm text-muted-label">
            No referrals yet. Be the first to invite a friend.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {leaderboard.map((row, idx) => (
              <li
                key={row.user_id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-orange/10 text-xs font-bold text-orange">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">
                      {row.display_name || "Member"}
                    </p>
                    <p className="text-xs text-muted-label">
                      {row.referred_count} referred
                    </p>
                  </div>
                </div>
                <p className="text-xs font-bold tabular text-ink">
                  ${Number(row.total_deposits ?? 0).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
