import { useEffect, useRef, useState } from "react";
import { PALETTE } from "../../shared/settings";
import { cx } from "./ui";

export function ColorPicker({
  value,
  onChange,
  label = "Couleur",
  size = "md",
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(!open)}
        className={cx(
          "block rounded-full ring-1 ring-black/10 transition hover:scale-110",
          size === "sm" ? "size-4" : "size-6",
        )}
        style={{ backgroundColor: value }}
      />
      {open && (
        <div className="absolute top-full left-0 z-20 mt-2 w-44 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200">
          <div className="grid grid-cols-6 gap-2">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                className={cx(
                  "size-5 rounded-full ring-offset-2 transition hover:scale-110",
                  color.toLowerCase() === value.toLowerCase() && "ring-2 ring-slate-400",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <label className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
            Autre couleur
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-6 w-10 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
        </div>
      )}
    </div>
  );
}
