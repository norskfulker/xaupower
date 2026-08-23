import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { Wordmark } from "@/components/brand/wordmark";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Suspense } from "react";

export default function AuthMfaPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next =
    searchParams.next && searchParams.next.startsWith("/")
      ? searchParams.next
      : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md space-y-6">
        <Wordmark href="/" className="inline-block text-2xl text-ink" />
        <SurfaceCard padding="lg">
          <h1 className="text-display text-3xl sm:text-4xl">Two-factor check</h1>
          <p className="mt-2 text-sm text-muted-label">
            Enter the code from your authenticator app to continue.
          </p>
          <div className="mt-6">
            <Suspense>
              <MfaChallengeForm nextPath={next} />
            </Suspense>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
