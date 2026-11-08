import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, NavLink, useParams } from "react-router";
import { api } from "../api";
import { cx, ErrorMessage, Spinner } from "../components/ui";
import { formatRelative } from "../format";
import { CoursesTab } from "./calendar/CoursesTab";
import { DisplayTab } from "./calendar/DisplayTab";
import { EditorProvider, useEditor } from "./calendar/editor";
import { SettingsTab } from "./calendar/SettingsTab";
import { SubscribeTab } from "./calendar/SubscribeTab";
import { WeekTab } from "./calendar/WeekTab";

const tabs = [
  { id: "week", label: "Aperçu", component: WeekTab },
  { id: "courses", label: "Matières", component: CoursesTab },
  { id: "display", label: "Affichage", component: DisplayTab },
  { id: "subscribe", label: "Couleurs & abonnement", component: SubscribeTab },
  { id: "settings", label: "Paramètres", component: SettingsTab },
] as const;

function SaveIndicator() {
  const { saveState, saveError } = useEditor();
  if (saveState === "idle") return null;
  if (saveState === "error") {
    return (
      <span className="text-sm text-red-600" title={saveError instanceof Error ? saveError.message : undefined}>
        Échec de l'enregistrement
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-slate-500">
      {saveState === "saving" ? <Spinner className="size-3" /> : <span className="text-emerald-600">✓</span>}
      {saveState === "saving" ? "Enregistrement…" : "Enregistré"}
    </span>
  );
}

function Body({ tab }: { tab: (typeof tabs)[number] }) {
  const { calendar, eventsLoading, eventsError } = useEditor();
  const Tab = tab.component;

  return (
    <div>
      <Link to="/app" className="text-sm text-slate-500 hover:text-slate-700">
        ← Calendriers
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{calendar.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">Synchronisé {formatRelative(calendar.cachedAt)}</p>
        </div>
        <SaveIndicator />
      </div>
      {calendar.lastError && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Dernière synchronisation échouée : {calendar.lastError}. La dernière version connue reste servie.
        </p>
      )}

      <nav className="mt-6 -mb-px flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <NavLink
            key={t.id}
            to={`/app/calendars/${calendar.id}/${t.id}`}
            className={({ isActive }) =>
              cx(
                "border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
                isActive ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-6">
        {eventsError ? (
          <ErrorMessage error={eventsError} />
        ) : eventsLoading && tab.id !== "settings" ? (
          <Spinner className="text-brand-600" />
        ) : (
          <Tab />
        )}
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { id = "", tab = "week" } = useParams();
  const { data, isPending, error } = useQuery({ queryKey: ["calendar", id], queryFn: () => api.calendar(id) });

  const current = tabs.find((t) => t.id === tab);
  if (!current) return <Navigate to={`/app/calendars/${id}/week`} replace />;
  if (isPending) return <Spinner className="text-brand-600" />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <EditorProvider key={data.calendar.id} calendar={data.calendar}>
      <Body tab={current} />
    </EditorProvider>
  );
}
