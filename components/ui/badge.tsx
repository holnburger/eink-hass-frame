import { cn } from "@/lib/utils";

export function Badge({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border-strong bg-panel px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
