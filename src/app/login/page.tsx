import { LoginForm } from "@/components/auth/login-form";
import { Wordmark } from "@/components/brand/wordmark";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md space-y-6">
        <Wordmark href="/" className="inline-block text-2xl text-ink" />
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <Suspense fallback={<div className="text-muted-label">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
