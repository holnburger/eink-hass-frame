import { cn } from "@/lib/utils";

export function Badge({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-zinc-600 px-2.5 py-0.5 text-xs font-medium text-zinc-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
