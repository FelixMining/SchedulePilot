import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, Navigate, useParams } from "react-router";
import { api, type CalendarDetail } from "../api";
import { ColorDot, cx, ErrorMessage, Spinner } from "../components/ui";
import { CoursesTab } from "./calendar/CoursesTab";
import { FeedsTab } from "./calendar/FeedsTab";
import { PreviewTab } from "./calendar/PreviewTab";
import { RulesTab } from "./calendar/RulesTab";
import { SettingsTab } from "./calendar/SettingsTab";

const tabs = [
  { id: "courses", label: "Cours", component: CoursesTab },
  { id: "rules", label: "Règles", component: RulesTab },
  { id: "feeds", label: "Abonnement & couleurs", component: FeedsTab },
  { id: "preview", label: "Aperçu", component: PreviewTab },
  { id: "settings", label: "Paramètres", component: SettingsTab },
] as const;

export interface TabProps {
  detail: CalendarDetail;
  invalidate: () => void;
}

export function useCalendarDetail(id: string) {
  return useQuery({ queryKey: ["calendar", id], queryFn: () => api.calendar(id) });
}

export function CalendarPage() {
  const { id = "", tab = "courses" } = useParams();
  const qc = useQueryClient();
  const { data, isPending, error } = useCalendarDetail(id);

  const current = tabs.find((t) => t.id === tab);
  if (!current) return <Navigate to={`/app/calendars/${id}/courses`} replace />;
  if (isPending) return <Spinner className="text-brand-600" />;
  if (error) return <ErrorMessage error={error} />;

  const invalidate = () => {
    for (const key of ["calendar", "courses", "preview"]) qc.invalidateQueries({ queryKey: [key, id] });
    qc.invalidateQueries({ queryKey: ["calendars"] });
  };

  const Tab = current.component;

  return (
    <div>
      <Link to="/app" className="text-sm text-slate-500 hover:text-slate-700">
        ← Calendriers
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <ColorDot color={data.calendar.color} className="size-4" />
        <h1 className="text-2xl font-semibold">{data.calendar.name}</h1>
      </div>
      {data.calendar.lastError && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Dernière synchronisation échouée : {data.calendar.lastError}. La dernière version connue reste servie.
        </p>
      )}

      <nav className="mt-6 -mb-px flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <NavLink
            key={t.id}
            to={`/app/calendars/${id}/${t.id}`}
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
        <Tab detail={data} invalidate={invalidate} />
      </div>
    </div>
  );
}
