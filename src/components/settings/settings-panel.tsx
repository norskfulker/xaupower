"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRail, PAYMENT_RAILS, isPaymentRail, type PaymentRail } from "@/lib/wallets";
import { validateCryptoAddress, addressNetworkHint, isValidCryptoAddress } from "@/lib/address-validation";
import type {
  NotificationPreferences,
  SavedPayoutAddress,
} from "@/lib/types";
import { CurrencyNetworkFields } from "@/components/finance/currency-network-fields";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function ProfileSettings({
  userId,
  email,
  fullName,
  phone,
  memberSince,
}: {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  memberSince: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), phone: phoneValue.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    router.refresh();
  }

  return (
    <section className="rounded-2xl bg-card p-6 text-ink shadow-card sm:p-7">
      <h2 className="text-lg font-bold text-ink">Profile</h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="settings-name">Name</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-border bg-canvas text-ink"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input
            id="settings-email"
            value={email}
            disabled
            className="border-border bg-canvas text-ink/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-phone">Phone</Label>
          <Input
            id="settings-phone"
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            className="border-border bg-canvas text-ink"
            placeholder="+1…"
          />
        </div>
        <div className="space-y-2">
          <Label>Member since</Label>
          <Input
            value={
              memberSince ? format(new Date(memberSince), "d MMMM yyyy") : "—"
            }
            disabled
            className="border-border bg-canvas text-ink/60"
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-orange text-white hover:bg-orange/90"
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function SecuritySettings() {
  const [enabled, setEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshFactors() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp.find((f) => f.status === "verified");
    setEnabled(Boolean(totp));
    setFactorId(totp?.id ?? null);
  }

  useEffect(() => {
    void refreshFactors();
  }, []);

  async function startEnroll() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
    });
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not start 2FA");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function verifyEnroll() {
    if (!factorId) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Two-factor authentication is on");
    setQr(null);
    setSecret(null);
    setCode("");
    await refreshFactors();
  }

  async function unenroll() {
    if (!factorId) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Two-factor authentication is off");
    setEnabled(false);
    setFactorId(null);
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Use at least 6 characters");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    setPassword("");
  }

  return (
    <section className="rounded-2xl bg-card p-6 text-ink shadow-card sm:p-7">
      <h2 className="text-lg font-bold text-ink">Security</h2>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-canvas px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Authenticator app (2FA)</p>
          <p className="text-xs text-muted-label">
            {enabled
              ? "Verified TOTP factor is required at sign-in."
              : "Add an authenticator app for a second sign-in step."}
          </p>
        </div>
        {enabled ? (
          <Button
            type="button"
            variant="outline"
            className="border-border bg-canvas text-ink"
            disabled={busy}
            onClick={() => void unenroll()}
          >
            Turn off
          </Button>
        ) : (
          !qr && (
            <Button
              type="button"
              className="bg-orange text-white hover:bg-orange/90"
              disabled={busy}
              onClick={() => void startEnroll()}
            >
              Turn on
            </Button>
          )
        )}
      </div>

      {qr && (
        <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm text-ink/70">
            Scan this QR in your authenticator app, then enter the 6-digit code.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="2FA QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
          {secret && (
            <p className="break-all font-mono text-xs text-muted-label">{secret}</p>
          )}
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="max-w-[160px] border-border bg-canvas text-ink tabular"
          />
          <Button
            type="button"
            className="bg-orange text-white hover:bg-orange/90"
            disabled={busy || code.length < 6}
            onClick={() => void verifyEnroll()}
          >
            Verify and enable
          </Button>
        </div>
      )}

      <form onSubmit={changePassword} className="mt-6 space-y-3">
        <Label htmlFor="new-password">Change password</Label>
        <div className="flex max-w-md flex-wrap gap-3">
          <Input
            id="new-password"
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-border bg-canvas text-ink"
            placeholder="New password"
          />
          <Button
            type="submit"
            disabled={busy}
            variant="outline"
            className="border-border bg-canvas text-ink"
          >
            Update password
          </Button>
        </div>
      </form>
    </section>
  );
}

export function NotificationSettings({
  userId,
  initial,
}: {
  userId: string;
  initial: NotificationPreferences;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(key: keyof NotificationPreferences) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: next })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      setPrefs(prefs);
      return;
    }
    toast.success("Notification preferences saved");
  }

  return (
    <section className="rounded-2xl bg-card p-6 text-ink shadow-card sm:p-7">
      <h2 className="text-lg font-bold text-ink">Notifications</h2>
      <p className="mt-1 text-sm text-muted-label">
        Emails about your own deposit and payout submissions.
      </p>
      <div className="mt-4 space-y-3">
        <ToggleRow
          label="Email notifications for deposits"
          checked={prefs.email_deposits}
          disabled={saving}
          onChange={() => void toggle("email_deposits")}
        />
        <ToggleRow
          label="Email notifications for payouts"
          checked={prefs.email_payouts}
          disabled={saving}
          onChange={() => void toggle("email_payouts")}
        />
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className="flex w-full items-center justify-between rounded-xl bg-canvas px-4 py-3 text-left"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-teal" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function SavedAddressesSettings({
  userId,
  initial,
}: {
  userId: string;
  initial: SavedPayoutAddress[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [label, setLabel] = useState("Main payout");
  const [rail, setRail] = useState<PaymentRail>("USDT_TRC20");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const err = validateCryptoAddress(rail, address);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("saved_payout_addresses")
      .insert({
        user_id: userId,
        currency: rail,
        address: address.trim(),
        label: label.trim() || "Payout address",
        is_primary: rows.length === 0,
      })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not save address");
      return;
    }
    setRows((prev) => [...prev, data as SavedPayoutAddress]);
    setAddress("");
    toast.success("Address saved");
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("saved_payout_addresses")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  }

  async function makePrimary(id: string) {
    const supabase = createClient();
    await supabase
      .from("saved_payout_addresses")
      .update({ is_primary: false })
      .eq("user_id", userId);
    const { error } = await supabase
      .from("saved_payout_addresses")
      .update({ is_primary: true })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) => ({ ...r, is_primary: r.id === id }))
    );
    router.refresh();
  }

  return (
    <section className="rounded-2xl bg-card p-6 text-ink shadow-card sm:p-7">
      <h2 className="text-lg font-bold text-ink">Saved payout addresses</h2>
      <p className="mt-1 text-sm text-muted-label">
        Reuse a crypto destination when you request a payout. Crypto only.
      </p>

      <ul className="mt-4 space-y-2">
        {rows.length === 0 && (
          <li className="text-sm text-muted-label">No saved addresses yet.</li>
        )}
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-ink">
                {row.label}
                {row.is_primary ? (
                  <span className="ml-2 text-xs font-medium text-orange">
                    Primary
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-label">
                {isPaymentRail(row.currency)
                  ? formatRail(row.currency)
                  : row.currency}
              </p>
              <p className="mt-1 max-w-[360px] truncate font-mono text-xs text-ink/60">
                {row.address}
              </p>
            </div>
            <div className="flex gap-2">
              {!row.is_primary && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-border bg-canvas text-ink"
                  onClick={() => void makePrimary(row.id)}
                >
                  Make primary
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-hotpink hover:text-hotpink"
                onClick={() => void remove(row.id)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="addr-label">Label</Label>
          <Input
            id="addr-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="border-border bg-canvas text-ink"
          />
        </div>
        <CurrencyNetworkFields
          rail={rail}
          rails={PAYMENT_RAILS}
          onChange={setRail}
        />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="addr-value">Address</Label>
          <Input
            id="addr-value"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={cn(
              "border-border bg-canvas text-ink tabular",
              address.trim() &&
                (isValidCryptoAddress(rail, address)
                  ? "border-teal"
                  : "border-hotpink")
            )}
            placeholder="Wallet address"
          />
          <p className="text-xs text-muted-label">
            Format check · {addressNetworkHint(rail)}
          </p>
          {address.trim() && !isValidCryptoAddress(rail, address) && (
            <p className="text-xs text-hotpink">
              {validateCryptoAddress(rail, address)}
            </p>
          )}
        </div>
        <div>
          <Button
            type="submit"
            disabled={saving}
            className="bg-orange text-white hover:bg-orange/90"
          >
            {saving ? "Saving…" : "Add address"}
          </Button>
        </div>
      </form>
    </section>
  );
}
