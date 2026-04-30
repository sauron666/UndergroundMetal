/**
 * Inline SVG sparkline for a ticket link's price history. No external chart
 * dependency — at most ~30 points, plain SVG path.
 */

import { formatPrice } from "@/lib/utils";

interface Point {
  observedAt: Date;
  priceMinor: number;
}

export function PriceHistorySparkline({
  points,
  currency,
  width = 240,
  height = 48,
}: {
  points: Point[];
  currency?: string | null;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const sorted = [...points].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime()
  );
  const min = Math.min(...sorted.map((p) => p.priceMinor));
  const max = Math.max(...sorted.map((p) => p.priceMinor));
  const span = Math.max(1, max - min);
  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = innerW / Math.max(1, sorted.length - 1);

  const path = sorted
    .map((p, i) => {
      const x = padX + i * stepX;
      const y =
        padY + innerH - ((p.priceMinor - min) / span) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  const trend =
    last.priceMinor < first.priceMinor
      ? "down"
      : last.priceMinor > first.priceMinor
      ? "up"
      : "flat";

  return (
    <div className="inline-flex items-center gap-2">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-primary"
        aria-hidden="true"
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        {trend === "down" && "▼ "}
        {trend === "up" && "▲ "}
        {formatPrice(first.priceMinor, currency ?? "EUR")} →{" "}
        {formatPrice(last.priceMinor, currency ?? "EUR")}
      </span>
    </div>
  );
}
