import { LoginForm } from "@/components/auth/login-form";
import { Wordmark } from "@/components/brand/wordmark";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md space-y-6">
        <Wordmark href="/" className="inline-block text-2xl text-ink" />
        <SurfaceCard padding="lg">
          <Suspense fallback={<div className="text-muted-label">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </SurfaceCard>
      </div>
    </div>
  );
}
