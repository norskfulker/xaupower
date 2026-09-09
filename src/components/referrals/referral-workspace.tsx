"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Gift, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  isValidReferralCodeFormat,
  normalizeReferralCode,
  referralSignupPath,
} from "@/lib/referral";

export type ReferredMember = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

export function ReferralWorkspace({
  referralCode,
  wasReferred,
  referredMembers,
}: {
  referralCode: string;
  wasReferred: boolean;
  referredMembers: ReferredMember[];
}) {
  const [code, setCode] = useState(referralCode);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}${referralSignupPath(code)}`;

  async function saveCode(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeReferralCode(code);
    if (!isValidReferralCodeFormat(normalized)) {
      toast.error("Use 4 to 12 letters or numbers");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("set_own_referral_code", {
      p_code: normalized,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.replace(/^.*: /, "") || "Could not save code");
      return;
    }
    setCode(String(data ?? normalized));
    toast.success("Referral code saved");
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.message(`${label} copied`);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-kicker">Invite</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight text-ink sm:text-3xl">
          Referrals
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-label">
          Create a code, share your link, and track who joins. You cannot refer
          yourself.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-kicker">Your code</p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
              <Gift className="size-4" />
            </span>
          </div>
          <p className="text-metric mt-2 font-mono text-ink">{code || "—"}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-kicker">People referred</p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
              <Users className="size-4" />
            </span>
          </div>
          <p className="text-metric mt-2 text-ink">{referredMembers.length}</p>
        </div>
      </div>

      {wasReferred && (
        <p className="text-sm text-muted-label">
          You joined with someone else&apos;s referral code. You still cannot
          use your own code.
        </p>
      )}

      <SurfaceCard padding="lg">
        <h2 className="font-display text-lg text-ink">Your referral code</h2>
        <p className="mt-1 text-sm text-muted-label">
          Share this with new users. They enter it during signup. Your own code
          will not work for you.
        </p>
        <form onSubmit={saveCode} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="referral-code">Code</Label>
            <Input
              id="referral-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="bg-white font-mono uppercase"
              minLength={4}
              maxLength={12}
              required
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={saving}
              className="h-11 bg-orange text-white hover:bg-orange/90"
            >
              {saving ? "Saving…" : "Save code"}
            </Button>
          </div>
        </form>
        <div className="mt-5 space-y-2">
          <Label>Invite link</Label>
          <div className="flex gap-2">
            <Input readOnly value={link} className="bg-white" />
            <Button
              type="button"
              variant="outline"
              onClick={() => void copy(link, "Invite link")}
            >
              <Copy className="size-4" />
              Copy
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard padding="lg">
        <h2 className="font-display text-lg text-ink">Referred members</h2>
        {referredMembers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-label">
            No one has used your code yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {referredMembers.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {member.full_name || "Member"}
                  </p>
                  <p className="text-xs text-muted-label">{member.email}</p>
                </div>
                <p className="text-xs text-muted-label">
                  {new Date(member.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>
    </div>
  );
}
