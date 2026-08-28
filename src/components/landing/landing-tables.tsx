import {
  Card,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  step: string;
  title: string;
  body: string;
};

export function LandingStepsTable({
  rows,
  stepLabel = "Step",
  actionLabel = "Action",
  detailsLabel = "Details",
  className,
}: {
  rows: Row[];
  stepLabel?: string;
  actionLabel?: string;
  detailsLabel?: string;
  className?: string;
}) {
  return (
    <Card className={cn("w-full overflow-hidden p-0", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-canvas hover:bg-canvas">
            <TableHead className="w-14 px-3 py-3 text-[10px] uppercase tracking-wide text-muted-label sm:text-xs">
              {stepLabel}
            </TableHead>
            <TableHead className="px-3 py-3 text-[10px] uppercase tracking-wide text-muted-label sm:text-xs">
              {actionLabel}
            </TableHead>
            <TableHead className="hidden px-3 py-3 text-[10px] uppercase tracking-wide text-muted-label sm:table-cell sm:text-xs">
              {detailsLabel}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="px-3 py-3 align-top text-sm font-bold tabular text-orange">
                {row.step}
              </TableCell>
              <TableCell className="px-3 py-3 align-top">
                <p className="text-sm font-semibold leading-snug">{row.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-label sm:hidden">
                  {row.body}
                </p>
              </TableCell>
              <TableCell className="hidden px-3 py-3 align-top text-sm leading-relaxed text-muted-label sm:table-cell">
                {row.body}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

type KeyValueRow = {
  label: string;
  value: string;
};

export function LandingKeyValueTable({
  rows,
  labelHeading = "Parameter",
  valueHeading = "Value",
  className,
}: {
  rows: KeyValueRow[];
  labelHeading?: string;
  valueHeading?: string;
  className?: string;
}) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="bg-canvas hover:bg-canvas">
          <TableHead className="px-3 py-2.5 text-[10px] uppercase tracking-wide text-muted-label sm:text-xs">
            {labelHeading}
          </TableHead>
          <TableHead className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wide text-muted-label sm:text-xs">
            {valueHeading}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="px-3 py-2.5 align-top text-sm whitespace-normal text-muted-label">
              {row.label}
            </TableCell>
            <TableCell className="px-3 py-2.5 text-right text-sm font-extrabold whitespace-normal tabular text-ink">
              {row.value}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type FeatureRow = {
  title: string;
  body: string;
};

export function LandingFeaturesTable({
  rows,
  className,
}: {
  rows: FeatureRow[];
  className?: string;
}) {
  return (
    <Card className={cn("w-full overflow-hidden p-0", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-canvas hover:bg-canvas">
            <TableHead className="px-3 py-3 text-[10px] uppercase tracking-wide text-muted-label sm:text-xs">
              Feature
            </TableHead>
            <TableHead className="px-3 py-3 text-[10px] uppercase tracking-wide text-muted-label sm:text-xs">
              Details
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.title}>
              <TableCell className="px-3 py-3 align-top text-sm font-semibold whitespace-normal">
                {row.title}
              </TableCell>
              <TableCell className="px-3 py-3 align-top text-sm whitespace-normal text-muted-label">
                {row.body}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

type StatRow = {
  kicker: string;
  label: string;
};

export function LandingStatsTable({
  rows,
  className,
}: {
  rows: StatRow[];
  className?: string;
}) {
  return (
    <Card className={cn("w-full overflow-hidden p-0", className)}>
      <Table>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.kicker}>
              <TableCell className="px-6 py-4 text-xl font-black tabular text-orange sm:text-2xl">
                {row.kicker}
              </TableCell>
              <TableCell className="px-6 py-4 text-sm text-muted-label">
                {row.label}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

type PerformanceRow = {
  period: string;
  trades: string;
  winRate: string;
  pips: string;
  result: string;
};

export function LandingPerformanceTable({
  rows,
  className,
}: {
  rows: PerformanceRow[];
  className?: string;
}) {
  const lastIndex = rows.length - 1;

  const headClass =
    "px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-label sm:text-xs";
  const cellClass = "px-6 py-4";

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-canvas">
              <th className={cn(headClass, "rounded-tl-2xl text-left")}>
                Period
              </th>
              <th className={cn(headClass, "text-left")}>Trades</th>
              <th className={cn(headClass, "text-left")}>Win rate</th>
              <th className={cn(headClass, "text-left")}>Net pips</th>
              <th className={cn(headClass, "rounded-tr-2xl text-right")}>
                Result
              </th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {rows.map((row, index) => (
              <tr
                key={row.period}
                className="border-b border-border last:border-b-0 hover:bg-canvas/40"
              >
                <td
                  className={cn(
                    cellClass,
                    "text-sm font-semibold text-ink",
                    index === lastIndex && "rounded-bl-2xl"
                  )}
                >
                  {row.period}
                </td>
                <td className={cn(cellClass, "tabular text-sm text-ink")}>
                  {row.trades}
                </td>
                <td className={cn(cellClass, "tabular text-sm text-ink")}>
                  {row.winRate}
                </td>
                <td
                  className={cn(
                    cellClass,
                    "tabular text-sm font-semibold text-teal"
                  )}
                >
                  {row.pips}
                </td>
                <td
                  className={cn(
                    cellClass,
                    "text-right text-sm font-semibold text-teal",
                    index === lastIndex && "rounded-br-2xl"
                  )}
                >
                  {row.result}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
