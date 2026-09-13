import { Star } from "lucide-react";

export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`brand-mark relative inline-flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="size-full overflow-visible" fill="none">
        <defs>
          <linearGradient id="rw-v" x1="6" y1="6" x2="26" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--brand-cyan)" />
            <stop offset="1" stopColor="var(--brand-violet)" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="var(--brand-surface)" />
        <rect
          x="1.5"
          y="1.5"
          width="29"
          height="29"
          rx="9"
          stroke="url(#rw-v)"
          strokeOpacity=".45"
          strokeWidth="1.2"
        />
        <path
          className="brand-v"
          d="M9 12.5 14.6 22 24 8.5"
          stroke="url(#rw-v)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="brand-star"
          d="M24.6 5.1l.75 1.65 1.65.75-1.65.75-.75 1.65-.75-1.65L22.2 7.5l1.65-.75.75-1.65Z"
          fill="var(--brand-cyan)"
        />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="size-8" />
      <span className="font-display text-[15px] font-bold tracking-tight text-ink sm:text-base">
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
