import type { RenderedEvent } from "../../shared/render";
import { formatDay, formatTime } from "../format";
import { cx } from "./ui";

/** An event as it will look in the calendar app. */
export function EventCard({
  view,
  start,
  end,
  className,
}: {
  view: RenderedEvent;
  start: string | null;
  end: string | null;
  className?: string;
}) {
  const time = [formatTime(start), formatTime(end)].filter(Boolean).join(" – ");
  return (
    <div className={cx("overflow-hidden rounded-xl bg-white ring-1 ring-slate-200", className)}>
      <div className="flex gap-3 p-4">
        <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: view.color }} />
        <div className="min-w-0 space-y-1.5">
          <p className={cx("leading-snug font-semibold", view.exam && "text-red-600")}>{view.title}</p>
          {start && (
            <p className="text-sm text-slate-500 first-letter:uppercase">
              {formatDay(start)}
              {time && ` · ${time}`}
            </p>
          )}
          {view.location && <p className="text-sm text-slate-700">{view.location}</p>}
          {view.description && (
            <p className="border-t border-slate-100 pt-2 text-sm whitespace-pre-line text-slate-600">
              {view.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
