import { Star } from "lucide-react";

export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`brand-mark relative inline-flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <span className="brand-spark absolute" />
      <svg viewBox="0 0 32 32" className="size-full overflow-visible" fill="none">
        <defs>
          <linearGradient id="removal-work-v" x1="5" y1="5" x2="27" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--brand-violet)" />
            <stop offset=".52" stopColor="var(--brand-cyan)" />
            <stop offset="1" stopColor="var(--brand-magenta)" />
          </linearGradient>
        </defs>
        <path
          d="M5.5 7.5 14 25c.8 1.7 3.2 1.7 4 0l8.5-17.5-5.3 2.2L16 20.9 10.8 9.7 5.5 7.5Z"
          fill="url(#removal-work-v)"
          stroke="currentColor"
          strokeWidth=".7"
          strokeLinejoin="round"
        />
        <path
          d="m11 9 5 10.4L21 9l-3.1 1.3L16 14.5l-1.9-4.2L11 9Z"
          fill="var(--brand-surface)"
        />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="size-8" />
      <span className="font-display text-[15px] font-bold text-ink">
        Removal Work
      </span>
    </span>
  );
}

export function StarRating({
  value,
  size = 16,
  showValue = true,
}: {
  value: number;
  size?: number;
  showValue?: boolean;
}) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${value} out of 5 stars`}>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={
              i <= rounded ? "fill-star text-star" : "fill-muted text-muted-foreground/40"
            }
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-sm font-semibold tabular-nums text-ink">{value.toFixed(1)}</span>
      ) : null}
    </span>
  );
}
