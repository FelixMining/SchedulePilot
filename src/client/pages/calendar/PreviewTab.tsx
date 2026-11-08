import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api";
import { Badge, Card, ColorDot, cx, EmptyState, ErrorMessage, Spinner } from "../../components/ui";
import { dayKey, formatDay, formatTime } from "../../format";
import type { PreviewEvent } from "../../../shared/calendar";
import type { TabProps } from "../CalendarPage";

function groupByDay(events: PreviewEvent[]) {
  const days: { key: string; date: string; events: PreviewEvent[] }[] = [];
  for (const e of events) {
    const key = dayKey(e.start);
    const last = days[days.length - 1];
    if (last && last.key === key) last.events.push(e);
    else days.push({ key, date: e.start ?? "", events: [e] });
  }
  return days;
}

export function PreviewTab({ detail }: TabProps) {
  const id = detail.calendar.id;
  const { data, isPending, error } = useQuery({ queryKey: ["preview", id], queryFn: () => api.preview(id) });
  const [showHidden, setShowHidden] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  if (isPending) return <Spinner className="text-brand-600" />;
  if (error) return <ErrorMessage error={error} />;

  const groupById = new Map(detail.groups.map((g) => [g.id, g]));
  const hiddenCount = data.events.filter((e) => e.result.hidden).length;
  const events = showHidden ? data.events : data.events.filter((e) => !e.result.hidden);
  const days = groupByDay(events);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span>
          {data.events.length} événements à venir, dont {hiddenCount} masqués.
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Afficher les masqués
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />
          Comparer avec l'original
        </label>
      </div>

      {days.length === 0 && <EmptyState title="Aucun événement à venir" />}

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.key}>
            <h2 className="mb-2 text-sm font-semibold text-slate-500 capitalize">
              {day.date ? formatDay(day.date) : "Sans date"}
            </h2>
            <Card>
              <ul className="divide-y divide-slate-100">
                {day.events.map((e) => {
                  const group = e.result.groupId ? groupById.get(e.result.groupId) : undefined;
                  return (
                    <li
                      key={`${e.uid}-${e.start}`}
                      className={cx("flex gap-4 px-4 py-3", e.result.hidden && "bg-slate-50 opacity-60")}
                    >
                      <div className="w-24 shrink-0 text-sm text-slate-500 tabular-nums">
                        {formatTime(e.start)}
                        {e.end && formatTime(e.end) ? ` – ${formatTime(e.end)}` : ""}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <ColorDot color={group?.color ?? detail.calendar.color} />
                          <span className={cx("font-medium", e.result.hidden && "line-through")}>
                            {e.result.summary}
                          </span>
                          {e.result.hidden && <Badge>masqué</Badge>}
                          {group && <Badge>{group.name}</Badge>}
                        </div>
                        {e.result.location && <p className="text-sm text-slate-600">{e.result.location}</p>}
                        {e.result.description && (
                          <p className="mt-1 text-xs whitespace-pre-line text-slate-500">{e.result.description}</p>
                        )}
                        {showOriginal && (
                          <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                            <p>
                              <strong>Original :</strong> {e.original.summary}
                              {e.original.location ? ` · ${e.original.location}` : ""}
                            </p>
                            {e.original.description && (
                              <p className="mt-1 whitespace-pre-line">{e.original.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
