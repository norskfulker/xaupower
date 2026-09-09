"use client";

import { createClient } from "@/lib/supabase/client";
import { isMfaChallengePending } from "@/lib/supabase/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  isValidReferralCodeFormat,
  normalizeReferralCode,
} from "@/lib/referral";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(
    searchParams.get("ref") ?? ""
  );
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("email") ? "signup" : "signin"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const preset = searchParams.get("email");
    const ref = searchParams.get("ref");
    if (preset) {
      setEmail(preset);
      setMode("signup");
    }
    if (ref) {
      setReferralCode(ref);
      setMode("signup");
    }
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (!fullName.trim()) {
          setError("Enter your full name");
          return;
        }
        const normalizedRef = normalizeReferralCode(referralCode);
        if (referralCode.trim()) {
          if (!isValidReferralCodeFormat(referralCode)) {
            setError("Referral code must be 4 to 12 letters or numbers");
            return;
          }
          const { data: exists } = await supabase.rpc("referral_code_exists", {
            p_code: normalizedRef,
          });
          if (!exists) {
            setError("That referral code was not found");
            return;
          }
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              ...(normalizedRef ? { referral_code: normalizedRef } : {}),
            },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Check your email to confirm your account, then sign in.");
        return;
      }

      const next = searchParams.get("next");
      if (await isMfaChallengePending(supabase)) {
        router.replace(
          `/auth/mfa?next=${encodeURIComponent(
            next && next.startsWith("/") ? next : "/dashboard"
          )}`
        );
        router.refresh();
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      if (mode === "signup" && fullName.trim()) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName.trim() })
          .eq("id", user.id);
      }

      if (profile?.role === "admin") {
        router.replace("/admin");
      } else if (next && next.startsWith("/dashboard")) {
        router.replace(next);
      } else {
        router.replace("/dashboard");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const reduce = useReducedMotion();

  return (
    <motion.div
      className="w-full space-y-6"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <h1 className="text-display text-3xl sm:text-4xl">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-muted-label">
          Access your gold (XAUUSD) signal terminal
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-white"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white"
          />
        </div>
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="referral-code">Referral code (optional)</Label>
            <Input
              id="referral-code"
              type="text"
              autoComplete="off"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="bg-white uppercase"
              placeholder="If someone invited you"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white"
          />
        </div>

        {error && (
          <p className="text-sm text-hotpink" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-orange text-white hover:bg-orange/90"
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-label">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              type="button"
              className="font-medium text-orange"
              onClick={() => setMode("signup")}
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-orange"
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </motion.div>
  );
}
