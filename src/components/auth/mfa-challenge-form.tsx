"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function MfaChallengeForm({
  nextPath = "/dashboard",
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();
    if (listError) {
      setError(listError.message);
      setLoading(false);
      return;
    }
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (!factor) {
      setError("No authenticator is enrolled on this account.");
      setLoading(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.trim(),
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mfa-code">Authenticator code</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="bg-white tabular"
          placeholder="123456"
          required
        />
      </div>
      {error && <p className="text-sm text-hotpink">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-orange text-white hover:bg-orange/90"
      >
        {loading ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}
