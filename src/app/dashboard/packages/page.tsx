import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PackagesCatalog } from "./packages-catalog";
import { StatusPill } from "@/components/ui/status-pill";
import { buttonVariants } from "@/components/ui/button";
import { daysRemaining, RISK_LABEL } from "@/lib/format";
import { packageDisplayLabel, resolveUserPackageTerms } from "@/lib/package-terms";
import type { Package, PackageVariant, UserPackage } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";

export default async function PackagesPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [packagesRes, variantsRes, historyRes] = await Promise.all([
    supabase.from("packages").select("*").eq("is_active", true).order("price_usd"),
    supabase.from("package_variants").select("*"),
    supabase
      .from("user_packages")
      .select(
        "id, status, purchased_at, expires_at, variant_snapshot, package_variants(risk_tier, packages(name))"
      )
      .eq("user_id", user!.id)
      .order("purchased_at", { ascending: false }),
  ]);

  const history = (historyRes.data ?? []) as unknown as UserPackage[];
  const active = history.find((row) => row.status === "active") ?? null;
  const terms = active
    ? resolveUserPackageTerms(active)
    : null;
  const label = packageDisplayLabel(terms);
  const daysLeft = daysRemaining(active?.expires_at);

  let elapsedPct = 0;
  if (active?.purchased_at && active.expires_at) {
    const start = new Date(active.purchased_at).getTime();
    const end = new Date(active.expires_at).getTime();
    const span = Math.max(end - start, 1);
    elapsedPct = Math.min(100, Math.max(0, ((Date.now() - start) / span) * 100));
  }

  const variants = ((variantsRes.data ?? []) as PackageVariant[]).map((v) => ({
    ...v,
    roadmap: Array.isArray(v.roadmap) ? v.roadmap : [],
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow-sm p-5 sm:p-6">
        <p className="text-xs uppercase tracking-wide text-muted-label">
          Current package
        </p>
        {terms && active ? (
          <>
            <h2 className="mt-2 text-2xl font-bold text-ink">{label}</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-muted-label">Risk tier</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {RISK_LABEL[terms.risk_tier]}
                </dd>
              </div>
              <div>
                <dt className="text-muted-label">Start</dt>
                <dd className="mt-1 tabular text-ink">
                  {active.purchased_at
                    ? format(new Date(active.purchased_at), "d MMM yyyy")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-label">Expires</dt>
                <dd className="mt-1 tabular text-ink">
                  {active.expires_at
                    ? format(new Date(active.expires_at), "d MMM yyyy")
                    : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-muted-label">
                <span>Access period</span>
                <span>{daysLeft ?? 0} days remaining</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-orange"
                  style={{ width: `${elapsedPct}%` }}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/payment"
                prefetch={false}
                className={buttonVariants({
                  className: "bg-orange text-white hover:bg-orange/90",
                })}
              >
                Renew package
              </Link>
              <Link
                href="/dashboard/payment"
                prefetch={false}
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "border-border bg-canvas text-ink hover:bg-orange/10",
                })}
              >
                Upgrade plan
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-label">
            No active access period. Choose a package below to start a deposit.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Access history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-label">
              <tr>
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-label">
                    No package access yet.
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const rowTerms = resolveUserPackageTerms(row);
                  return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {packageDisplayLabel(rowTerms) ?? "Package"}
                      </td>
                      <td className="px-4 py-3 tabular text-ink/70">
                        {row.purchased_at
                          ? format(new Date(row.purchased_at), "d MMM yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 tabular text-ink/70">
                        {row.expires_at
                          ? format(new Date(row.expires_at), "d MMM yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PackagesCatalog
        packages={(packagesRes.data ?? []) as Package[]}
        variants={variants}
      />
    </div>
  );
}
