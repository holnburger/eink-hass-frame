import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
  ariaLabel?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
  ariaLabel,
}: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <span>{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full border border-border-strong transition",
          checked ? "bg-foreground" : "bg-panel",
        )}
      >
        <span
          className={cn(
            "absolute left-1 top-[0.2rem] block h-4 w-4 rounded-full transition",
            checked
              ? "translate-x-5 bg-background"
              : "translate-x-0 bg-foreground",
          )}
        />
      </button>
    </label>
  );
}
