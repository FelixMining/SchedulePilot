import { useMemo, useState } from "react";
import { ColorPicker } from "../../components/ColorPicker";
import { EventCard } from "../../components/EventCard";
import { Button, Card, cx, EmptyState, Input, Toggle } from "../../components/ui";
import { formatTime } from "../../format";
import { listFeeds } from "../../../shared/render";
import { useEditor, type EditorEvent } from "./editor";

const HOUR_PX = 52;
const DAY_MS = 24 * 3600_000;
const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

const toDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
const eventId = (e: EditorEvent) => `${e.info.uid}|${e.info.start}`;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

interface Placed {
  event: EditorEvent;
  start: Date;
  end: Date;
  lane: number;
  lanes: number;
}

/** Side-by-side layout for overlapping events of one day. */
function layoutDay(events: EditorEvent[]): Placed[] {
  const items = events
    .map((event) => {
      const start = toDate(event.info.start!);
      const end = event.info.end ? toDate(event.info.end) : new Date(start.getTime() + 3600_000);
      return { event, start, end, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cluster: Placed[] = [];
  let clusterEnd = 0;
  let laneEnds: number[] = [];
  const close = () => cluster.forEach((p) => (p.lanes = laneEnds.length));

  for (const item of items) {
    if (item.start.getTime() >= clusterEnd) {
      close();
      cluster = [];
      laneEnds = [];
    }
    let lane = laneEnds.findIndex((end) => end <= item.start.getTime());
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = item.end.getTime();
    item.lane = lane;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end.getTime());
  }
  close();
  return items;
}

function initialWeek(events: EditorEvent[]): Date {
  const now = Date.now();
  const next = events
    .filter((e) => e.info.start && toDate(e.info.end ?? e.info.start).getTime() >= now)
    .sort((a, b) => toDate(a.info.start!).getTime() - toDate(b.info.start!).getTime())[0];
  return startOfWeek(next ? toDate(next.info.start!) : new Date());
}

function CourseQuickEdit({ event }: { event: EditorEvent }) {
  const { settings, updateCourse, setEventHidden } = useEditor();
  const { info, view } = event;
  const course = settings.courses[info.key] ?? {};
  const eventHidden = view.hiddenReason === "event";

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Cet événement</p>
        <Button
          variant={eventHidden ? "secondary" : "danger"}
          size="sm"
          className="w-full"
          onClick={() => setEventHidden(info.id, !eventHidden)}
        >
          {eventHidden ? "Réafficher cet événement" : "Masquer cet événement uniquement"}
        </Button>
        {view.hiddenReason === "keyword" && (
          <p className="text-xs text-slate-500">Masqué par un mot-clé (onglet Affichage).</p>
        )}
      </div>
      <p className="border-t border-slate-100 pt-3 text-xs font-medium tracking-wide text-slate-400 uppercase">
        Toute la matière
      </p>
      <label className="block">
        <span className="mb-1.5 block font-medium text-slate-700">Nom de la matière</span>
        <Input
          value={course.name ?? ""}
          placeholder={info.courseName}
          onChange={(e) => updateCourse(info.key, { name: e.target.value })}
        />
      </label>
      <div className="flex items-center justify-between">
        {settings.colorMode === "course" && !view.exam ? (
          <span className="flex items-center gap-2 text-slate-700">
            <ColorPicker value={view.color} onChange={(color) => updateCourse(info.key, { color })} />
            Couleur
          </span>
        ) : (
          <span />
        )}
        <label className="flex items-center gap-2 text-slate-700">
          Afficher la matière
          <Toggle
            checked={!course.hidden}
            onChange={(v) => updateCourse(info.key, { hidden: !v })}
            label="Afficher la matière"
          />
        </label>
      </div>
      <details className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <summary className="cursor-pointer font-medium">Données d'origine</summary>
        <dl className="mt-2 space-y-1.5">
          <div>
            <dt className="font-medium text-slate-600">Titre</dt>
            <dd>{info.original.summary || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Lieu</dt>
            <dd>{info.original.location || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Description</dt>
            <dd className="whitespace-pre-line">{info.original.description || "—"}</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}

export function WeekTab() {
  const { events, settings, eventsLoading } = useEditor();
  const [week, setWeek] = useState<Date | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const weekStart = week ?? initialWeek(events);
  const feeds = useMemo(
    () =>
      listFeeds(
        events.map((e) => e.info),
        settings,
      ),
    [events, settings],
  );

  const weekEvents = events.filter((e) => {
    if (!e.info.start || e.info.start.length === 10) return false;
    const t = toDate(e.info.start).getTime() - weekStart.getTime();
    return t >= 0 && t < 7 * DAY_MS && (showHidden || !e.view.hidden);
  });
  const hiddenCount = events.filter((e) => e.view.hidden).length;

  const dayCount = weekEvents.some((e) => toDate(e.info.start!).getDay() === 0)
    ? 7
    : weekEvents.some((e) => toDate(e.info.start!).getDay() === 6)
      ? 6
      : 5;
  const days = Array.from({ length: dayCount }, (_, i) => addDays(weekStart, i));

  const hours = weekEvents.flatMap((e) => {
    const s = toDate(e.info.start!);
    const end = e.info.end ? toDate(e.info.end) : s;
    return [s.getHours(), end.getHours() + (end.getMinutes() ? 1 : 0)];
  });
  const firstHour = Math.min(8, ...hours);
  const lastHour = Math.max(18, ...hours);

  const selected = events.find((e) => eventId(e) === selectedId) ?? null;

  if (eventsLoading) return null;
  if (events.length === 0) return <EmptyState title="Aucun événement dans ce calendrier" />;

  const byDay = days.map((day) =>
    layoutDay(weekEvents.filter((e) => toDate(e.info.start!).toDateString() === day.toDateString())),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeek(addDays(weekStart, -7))}
            aria-label="Semaine précédente"
          >
            ‹
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeek(startOfWeek(new Date()))}>
            Aujourd'hui
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeek(addDays(weekStart, 7))}
            aria-label="Semaine suivante"
          >
            ›
          </Button>
          <span className="ml-2 font-medium capitalize">{monthName.format(addDays(weekStart, 3))}</span>
        </div>
        {hiddenCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            {hiddenCount > 1 ? `Afficher les ${hiddenCount} événements masqués` : "Afficher l'événement masqué"}
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
        {feeds.map((f) => (
          <span key={f.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: f.color }} />
            {f.name}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="hidden overflow-x-auto md:block">
          <div className="min-w-[44rem]">
            <div
              className="grid border-b border-slate-200 text-xs font-medium text-slate-500"
              style={{ gridTemplateColumns: `3rem repeat(${dayCount}, minmax(0, 1fr))` }}
            >
              <span />
              {days.map((d) => (
                <span
                  key={d.toISOString()}
                  className={cx(
                    "py-2 text-center capitalize",
                    d.toDateString() === new Date().toDateString() && "text-brand-600",
                  )}
                >
                  {dayName.format(d)}
                </span>
              ))}
            </div>
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `3rem repeat(${dayCount}, minmax(0, 1fr))`,
                height: (lastHour - firstHour) * HOUR_PX,
              }}
            >
              <div className="relative">
                {Array.from({ length: lastHour - firstHour }, (_, i) => (
                  <span
                    key={i}
                    className="absolute right-2 -translate-y-1/2 text-[11px] text-slate-400 tabular-nums"
                    style={{ top: i * HOUR_PX }}
                  >
                    {i === 0 ? "" : `${firstHour + i}h`}
                  </span>
                ))}
              </div>
              {byDay.map((placed, i) => (
                <div key={i} className="relative border-l border-slate-100">
                  {Array.from({ length: lastHour - firstHour }, (_, h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-slate-100"
                      style={{ top: h * HOUR_PX }}
                    />
                  ))}
                  {placed.map(({ event, start, end, lane, lanes }) => {
                    const top = ((start.getHours() - firstHour) * 60 + start.getMinutes()) * (HOUR_PX / 60);
                    const height = Math.max(((end.getTime() - start.getTime()) / 60_000) * (HOUR_PX / 60), 22);
                    const id = eventId(event);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedId(id === selectedId ? null : id)}
                        className={cx(
                          "absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight transition hover:z-10 hover:shadow-md",
                          event.view.hidden && "opacity-40",
                          id === selectedId && "z-10 ring-2 ring-slate-900/70",
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                          backgroundColor: `${event.view.color}1f`,
                          borderColor: event.view.color,
                        }}
                      >
                        <span className={cx("block font-semibold text-slate-800", event.view.exam && "text-red-700")}>
                          {event.view.title}
                        </span>
                        <span className="block text-slate-600">
                          {formatTime(event.info.start)}
                          {event.view.location && ` · ${event.view.location}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="space-y-4 md:hidden">
          {days.map((day, i) =>
            byDay[i]!.length === 0 ? null : (
              <section key={day.toISOString()}>
                <h3 className="mb-1.5 text-sm font-medium text-slate-500 capitalize">{dayName.format(day)}</h3>
                <Card className="divide-y divide-slate-100">
                  {byDay[i]!.map(({ event }) => {
                    const id = eventId(event);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedId(id === selectedId ? null : id)}
                        className={cx(
                          "flex w-full gap-3 px-3 py-2.5 text-left text-sm",
                          event.view.hidden && "opacity-40",
                        )}
                      >
                        <span className="w-12 shrink-0 text-slate-500 tabular-nums">
                          {formatTime(event.info.start)}
                        </span>
                        <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: event.view.color }} />
                        <span className="min-w-0">
                          <span className={cx("block font-medium", event.view.exam && "text-red-700")}>
                            {event.view.title}
                          </span>
                          {event.view.location && <span className="block text-slate-500">{event.view.location}</span>}
                        </span>
                      </button>
                    );
                  })}
                </Card>
              </section>
            ),
          )}
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <EventCard view={selected.view} start={selected.info.start} end={selected.info.end} />
              <Card className="p-4">
                <CourseQuickEdit event={selected} />
              </Card>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              Cliquez sur un cours pour voir comment il apparaîtra dans votre calendrier et le modifier.
              {weekEvents.length === 0 && <p className="mt-2">Aucun cours cette semaine.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
