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
    <Card className={cn("w-full overflow-hidden", className)}>
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
    <Card className={cn("w-full overflow-hidden", className)}>
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
    <Card className={cn("w-full overflow-hidden", className)}>
      <Table>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.kicker}>
              <TableCell className="px-3 py-3 text-xl font-black tabular text-orange sm:px-4 sm:text-2xl">
                {row.kicker}
              </TableCell>
              <TableCell className="px-3 py-3 text-sm text-muted-label sm:px-4">
                {row.label}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
