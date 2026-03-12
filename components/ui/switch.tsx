import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
};

export function Switch({ checked, onCheckedChange, label, id }: SwitchProps) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 text-sm text-zinc-300">
      <span>{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full border border-zinc-500 transition",
          checked ? "bg-zinc-100" : "bg-zinc-800",
        )}
      >
        <span
          className={cn(
            "absolute left-1 top-1 block h-4 w-4 rounded-full transition",
            checked ? "translate-x-5 bg-zinc-900" : "translate-x-0 bg-zinc-300",
          )}
        />
      </button>
    </label>
  );
}
