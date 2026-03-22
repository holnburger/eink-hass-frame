import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  return (
    <div
      className={cn(
        "h-3 w-full overflow-hidden rounded-full border border-border-strong bg-panel-strong",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-foreground transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
