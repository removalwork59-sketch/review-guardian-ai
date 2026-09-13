import { Star } from "lucide-react";

export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none">
        <path
          d="M12 2.5 20 5.4v6.1c0 4.6-3.2 8.6-8 10-4.8-1.4-8-5.4-8-10V5.4L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="m12 7.6 1.42 2.88 3.18.46-2.3 2.24.54 3.17L12 14.85l-2.84 1.5.54-3.17-2.3-2.24 3.18-.46L12 7.6Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="size-8" />
      <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
        Review Shield
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
