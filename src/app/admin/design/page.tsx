import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/ui/stat-card";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Cpu,
  LayoutDashboard,
  Settings,
  Wallet,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "Design System — XAUPower Admin",
};

const BRAND_COLORS = [
  { name: "Ink", token: "--ink", className: "bg-ink", text: "text-white" },
  { name: "Canvas", token: "--canvas", className: "bg-canvas", text: "text-ink" },
  { name: "Orange", token: "--orange", className: "bg-orange", text: "text-white" },
  { name: "Gold", token: "--gold", className: "bg-gold", text: "text-ink" },
  { name: "Teal", token: "--teal", className: "bg-teal", text: "text-white" },
  { name: "Hot Pink", token: "--hotpink", className: "bg-hotpink", text: "text-white" },
  {
    name: "Muted Label",
    token: "--muted-label",
    className: "bg-muted-label",
    text: "text-white",
  },
];

const TYPE_SCALE = [
  { label: "Display", className: "text-display", sample: "Automated Gold Trading" },
  { label: "Metric", className: "text-metric text-orange", sample: "2,648.50" },
  { label: "Kicker", className: "text-kicker", sample: "System Overview" },
  { label: "H2", className: "text-2xl font-black tracking-tight", sample: "Section heading" },
  { label: "Card title", className: "text-lg font-bold", sample: "Card title" },
  { label: "Body", className: "text-base", sample: "Body copy for descriptions." },
  { label: "Small", className: "text-sm text-muted-label", sample: "Secondary text" },
];

export default function AdminDesignPage() {
  return (
    <div className="space-y-12">
      <header>
        <p className="text-kicker text-orange">Admin · Design</p>
        <h1 className="text-display mt-2 text-3xl sm:text-4xl">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-label">
          Bold-minimal tokens, floating nav, surface cards, and UI primitives.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Shadow & radius tokens</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SurfaceCard>
            <p className="text-kicker">Surface card</p>
            <p className="mt-2 text-sm text-muted-label">
              <code className="text-xs">rounded-2xl shadow-card</code>
            </p>
          </SurfaceCard>
          <div className="surface-float p-5">
            <p className="text-kicker">Float surface</p>
            <p className="mt-2 text-sm text-muted-label">
              Nav bars · <code className="text-xs">shadow-float backdrop-blur</code>
            </p>
          </div>
          <Card>
            <CardContent className="pt-5">
              <p className="text-kicker">Card primitive</p>
              <p className="mt-2 text-sm text-muted-label">Default shadcn Card with updated radius.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Floating nav (mockup)</h2>
        <div className="surface-float mx-auto max-w-3xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <span className="text-sm font-black text-ink">
              XAU<span className="text-orange">Power</span>
            </span>
            {[
              { label: "Dashboard", icon: LayoutDashboard, active: true },
              { label: "Buy Bot", icon: Boxes, active: false },
              { label: "Cashier", icon: Wallet, active: false },
              { label: "Settings", icon: Settings, active: false },
            ].map(({ label, icon: Icon, active }) => (
              <span
                key={label}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold",
                  active ? "bg-orange text-white" : "text-ink/60"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-label">
          Desktop: fixed top pill. Mobile: minimal top bar + floating bottom nav with 48px touch targets.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Colors</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_COLORS.map((color) => (
            <Card key={color.name} className="overflow-hidden">
              <div className={cnSwatch(color.className, color.text)}>Aa</div>
              <CardContent className="pt-4">
                <p className="font-semibold">{color.name}</p>
                <p className="font-mono text-xs text-muted-label">{color.token}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Typography</h2>
        <Card>
          <CardContent className="divide-y divide-border space-y-0 pt-4">
            {TYPE_SCALE.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <span className="text-kicker w-24 shrink-0">{row.label}</span>
                <p className={row.className}>{row.sample}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Buttons</h2>
        <Card>
          <CardContent className="flex flex-wrap gap-3 pt-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="lg">
              Large CTA
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Badges & status</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-4">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <StatusPill status="active" />
            <StatusPill status="pending_review" />
            <StatusPill status="rejected" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Stat cards</h2>
        <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Revenue" value="$12,450" hint="Last 30 days" icon={Wallet} />
          <StatCard label="Active bots" value="128" hint="VPS nodes online" icon={Cpu} />
          <StatCard label="Feed P&L" value="+$4,820" icon={BarChart3} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Form controls</h2>
        <SurfaceCard className="max-w-md">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="design-email">Email</Label>
              <Input id="design-email" placeholder="you@example.com" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="design-amount">Amount (USD)</Label>
              <Input id="design-amount" type="number" placeholder="100.00" />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Landing patterns</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="flex size-10 items-center justify-center rounded-xl bg-orange/10">
                <Zap className="size-5 text-orange" />
              </span>
              <div>
                <CardTitle>Icon + title</CardTitle>
                <CardDescription>Feature card pattern.</CardDescription>
              </div>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl bg-ink text-white ring-0">
            <CardContent className="pt-5">
              <p className="text-kicker text-white/40">Live price</p>
              <p className="text-metric mt-4 text-gold">2,648.50</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function cnSwatch(bg: string, text: string) {
  return `${bg} ${text} flex h-24 items-center justify-center text-2xl font-black`;
}
