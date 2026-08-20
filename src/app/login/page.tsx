import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
        <div>
          <p className="text-4xl font-black tracking-tight">
            XAU<span className="text-orange">Power</span>
          </p>
          <p className="mt-3 text-sm text-white/70">
            XAUUSD / XAGUSD signal terminal
          </p>
        </div>

        <div className="space-y-3 opacity-60">
          <div className="flex gap-6 font-medium tabular text-sm">
            <span className="text-orange">XAUUSD 2,341.20</span>
            <span className="text-teal">XAGUSD 27.84</span>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-orange/40 via-gold/30 to-transparent" />
          <div className="flex gap-6 font-medium tabular text-xs text-white/40">
            <span>XAUUSD 2,338.10</span>
            <span>XAGUSD 27.91</span>
          </div>
        </div>
      </aside>

      <main className="flex w-full items-center justify-center bg-canvas p-8 lg:w-1/2">
        <Suspense fallback={<div className="text-muted-label">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
