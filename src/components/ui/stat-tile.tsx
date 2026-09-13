import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  tone = "text-ink",
  compact = false,
}: {
  label: string;
  value: string | number;
  tone?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("stat-tile", compact && "stat-tile-compact")}>
      <dt className="stat-tile-label">{label}</dt>
      <dd className={cn("stat-tile-value", tone)}>{value}</dd>
    </div>
  );
}