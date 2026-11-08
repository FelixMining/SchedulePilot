import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type Calendar } from "../../api";
import type { EventInfo } from "../../../shared/extract";
import { renderEvent, type RenderedEvent } from "../../../shared/render";
import { PALETTE, type CourseSettings, type Settings } from "../../../shared/settings";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface EditorEvent {
  info: EventInfo;
  view: RenderedEvent;
}

interface EditorValue {
  calendar: Calendar;
  settings: Settings;
  events: EditorEvent[];
  eventsError: unknown;
  eventsLoading: boolean;
  update: (patch: Partial<Settings> | ((s: Settings) => Settings)) => void;
  updateCourse: (key: string, patch: Partial<CourseSettings>) => void;
  saveState: SaveState;
  saveError: unknown;
}

const EditorContext = createContext<EditorValue | null>(null);

export function useEditor(): EditorValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor must be used inside <EditorProvider>");
  return value;
}

const SAVE_DELAY = 500;

/**
 * Keeps the settings locally so every change re-renders the preview instantly,
 * and saves them in the background once the user pauses.
 */
export function EditorProvider({ calendar, children }: { calendar: Calendar; children: ReactNode }) {
  const qc = useQueryClient();
  const [settings, setSettings] = useState(calendar.settings);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<unknown>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Settings | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["events", calendar.id],
    queryFn: () => api.events(calendar.id),
    staleTime: 5 * 60_000,
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setSaveState("saving");
    try {
      const res = await api.saveSettings(calendar.id, next);
      qc.setQueryData(["calendar", calendar.id], res);
      setSaveState(pending.current ? "saving" : "saved");
      setSaveError(null);
    } catch (err) {
      setSaveState("error");
      setSaveError(err);
    }
  }, [calendar.id, qc]);

  useEffect(() => () => void flush(), [flush]);

  const update = useCallback<EditorValue["update"]>(
    (patch) => {
      setSettings((current) => {
        const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
        pending.current = next;
        return next;
      });
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  const updateCourse = useCallback<EditorValue["updateCourse"]>(
    (key, patch) =>
      update((s) => {
        const course = { ...s.courses[key], ...patch };
        if (!course.name?.trim()) delete course.name;
        if (!course.hidden) delete course.hidden;
        if (!course.color) delete course.color;
        const courses = { ...s.courses };
        if (Object.keys(course).length) courses[key] = course;
        else delete courses[key];
        return { ...s, courses };
      }),
    [update],
  );

  // First visit: give every course its own color, so no two courses look alike.
  const colored = useRef(false);
  useEffect(() => {
    if (colored.current || !eventsQuery.data) return;
    colored.current = true;
    const names = new Map<string, string>();
    for (const e of eventsQuery.data.events) if (e.code && !names.has(e.key)) names.set(e.key, e.courseName);
    const missing = [...names]
      .filter(([key]) => !settings.courses[key]?.color)
      .sort((a, b) => a[1].localeCompare(b[1], "fr"))
      .map(([key]) => key);
    if (missing.length === 0) return;
    const used = new Set(Object.values(settings.courses).map((c) => c.color));
    const free = PALETTE.filter((c) => !used.has(c));
    update((s) => {
      const courses = { ...s.courses };
      missing.forEach((key, i) => {
        courses[key] = { ...courses[key], color: free[i] ?? PALETTE[i % PALETTE.length]! };
      });
      return { ...s, courses };
    });
  }, [eventsQuery.data, settings.courses, update]);

  const events = useMemo(
    () => (eventsQuery.data?.events ?? []).map((info) => ({ info, view: renderEvent(info, settings) })),
    [eventsQuery.data, settings],
  );

  const value: EditorValue = {
    calendar,
    settings,
    events,
    eventsError: eventsQuery.error,
    eventsLoading: eventsQuery.isPending,
    update,
    updateCourse,
    saveState,
    saveError,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
