import { cn } from "@/lib/utils";

export function Badge({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-zinc-700 bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-700",
        className,
      )}
    >
      {children}
    </div>
  );
}
