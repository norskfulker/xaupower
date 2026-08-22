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
import { StatusPill } from "@/components/ui/status-pill";
import { ArrowRight, Cpu, Wallet, Zap } from "lucide-react";

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
  { label: "Display", className: "text-5xl font-black tracking-tight", sample: "Automated Gold Trading" },
  { label: "H1", className: "text-4xl font-extrabold tracking-tight", sample: "Page heading" },
  { label: "H2", className: "text-3xl font-extrabold tracking-tight", sample: "Section heading" },
  { label: "H3", className: "text-xl font-bold", sample: "Card title" },
  { label: "Body", className: "text-base", sample: "Body copy for descriptions and paragraphs." },
  { label: "Small", className: "text-sm text-muted-label", sample: "Secondary text and hints" },
  {
    label: "Kicker",
    className: "text-xs font-semibold uppercase tracking-[0.2em] text-orange",
    sample: "System Overview",
  },
  { label: "Tabular", className: "text-2xl font-black tabular text-orange", sample: "2,648.50" },
];

export default function AdminDesignPage() {
  return (
    <div className="space-y-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
          Admin · Design
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-label">
          Brand colors, typography scale, and UI components used across XAUPower.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Colors</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_COLORS.map((color) => (
            <Card key={color.name} className="overflow-hidden">
              <div className={cnSwatch(color.className, color.text)}>
                Aa
              </div>
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
              <div key={row.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-8">
                <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-label">
                  {row.label}
                </span>
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
            <Button variant="link">Link</Button>
            <Button size="lg">
              Large CTA
              <ArrowRight />
            </Button>
            <Button size="sm">Small</Button>
            <Button size="xs">Extra small</Button>
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
            <Badge variant="destructive">Destructive</Badge>
            <StatusPill status="active" />
            <StatusPill status="pending_review" />
            <StatusPill status="rejected" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Cards</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Default card</CardTitle>
              <CardDescription>With header, content, and footer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-label">
                Used for feature blocks, testimonials, and dashboard panels.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
          <StatCard label="Revenue" value="$12,450" hint="Last 30 days" icon={Wallet} />
          <StatCard label="Active bots" value="128" hint="VPS nodes online" icon={Cpu} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Form controls</h2>
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="design-email">Email</Label>
              <Input id="design-email" placeholder="you@example.com" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="design-amount">Amount (USD)</Label>
              <Input id="design-amount" type="number" placeholder="100.00" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Landing patterns</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="flex size-10 items-center justify-center rounded-full bg-orange/10">
                <Zap className="size-5 text-orange" />
              </span>
              <div>
                <CardTitle>Icon + title</CardTitle>
                <CardDescription>Feature card pattern from landing.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-label">
                Pair an orange-tinted icon circle with a bold title and muted body.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl bg-ink text-white ring-0">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Dark panel
              </p>
              <p className="mt-2 text-3xl font-black tabular text-gold">2,648.50</p>
              <p className="mt-1 text-xs text-white/40">Chart / terminal preview style</p>
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
