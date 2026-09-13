import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ScanProgress({ steps, done }: { steps: string[]; done: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (done) return;
    const timer = window.setInterval(() => {
      setActive((current) => Math.min(current + 1, steps.length - 1));
    }, 1400);
    return () => window.clearInterval(timer);
  }, [done, steps.length]);

  return (
    <div className="surface mx-auto w-full max-w-xl p-5 sm:p-6">
      <div className="relative mb-5 h-1 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 w-1/3 animate-[sweep_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite] rounded-full bg-primary" />
      </div>
      <ul className="space-y-3">
        {steps.map((step, index) => {
          const complete = done || index < active;
          const current = !done && index === active;
          return (
            <li
              key={step}
              className={`flex items-center gap-3 text-sm transition-opacity ${
                complete || current ? "opacity-100" : "opacity-40"
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                  complete
                    ? "border-safe bg-safe-soft text-safe"
                    : current
                      ? "border-primary bg-info-soft text-primary"
                      : "border-border text-muted-foreground"
                }`}
              >
                {complete ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : current ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className={complete || current ? "text-ink" : "text-muted-foreground"}>
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
