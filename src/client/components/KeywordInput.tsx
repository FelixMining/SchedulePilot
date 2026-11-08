import { useState, type KeyboardEvent } from "react";

export function KeywordInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
  label: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const words = draft
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w && !value.some((v) => v.toLowerCase() === w.toLowerCase()));
    if (words.length) onChange([...value, ...words]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
      {value.map((word) => (
        <span key={word} className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pr-1 pl-2 text-sm">
          {word}
          <button
            type="button"
            aria-label={`Retirer ${word}`}
            onClick={() => onChange(value.filter((w) => w !== word))}
            className="rounded px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
