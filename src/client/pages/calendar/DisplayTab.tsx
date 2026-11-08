import type { ReactNode } from "react";
import { EventCard } from "../../components/EventCard";
import { KeywordInput } from "../../components/KeywordInput";
import { Segmented } from "../../components/Segmented";
import { Card, Select } from "../../components/ui";
import { formatDateTime } from "../../format";
import type { Settings, TypePosition } from "../../../shared/settings";
import { useEditor, type EditorEvent } from "./editor";

const DESCRIPTION_FIELDS: { key: keyof Settings["description"]; label: string }[] = [
  { key: "type", label: "Type de séance (CM, TD, TP…)" },
  { key: "rooms", label: "Salle" },
  { key: "teachers", label: "Enseignant" },
  { key: "course", label: "Intitulé complet et code du cours" },
  { key: "groups", label: "Groupes concernés" },
];

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A few representative upcoming events to preview the formatting on. */
function samples(events: EditorEvent[]): EditorEvent[] {
  const now = Date.now();
  const upcoming = events.filter((e) => !e.view.hidden && e.info.start && Date.parse(e.info.start) >= now);
  const pool = upcoming.length ? upcoming : events.filter((e) => !e.view.hidden);
  const picked: EditorEvent[] = [];
  for (const type of ["Examen", "CM", "TD", "TP"]) {
    const e = pool.find((p) => p.view.type === type && !picked.includes(p));
    if (e) picked.push(e);
  }
  return (picked.length ? picked : pool).slice(0, 3);
}

export function DisplayTab() {
  const { settings, update, events } = useEditor();
  const exams = events.filter((e) => e.view.exam && !e.view.hidden);
  const upcomingExams = exams.filter((e) => e.info.start && Date.parse(e.info.start) >= Date.now());
  const hiddenByKeyword = events.filter((e) => e.view.hidden && !settings.courses[e.info.key]?.hidden).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="divide-y divide-slate-100">
        <Section title="Titre des événements">
          <Segmented<TypePosition>
            label="Position du type"
            value={settings.title.typePosition}
            onChange={(typePosition) => update((s) => ({ ...s, title: { ...s.title, typePosition } }))}
            options={[
              { value: "after", label: "Algorithmique · TD" },
              { value: "before", label: "TD · Algorithmique" },
              { value: "none", label: "Algorithmique" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings.title.highlightExams}
              onChange={(e) => update((s) => ({ ...s, title: { ...s.title, highlightExams: e.target.checked } }))}
            />
            Préfixer les examens par « EXAMEN »
          </label>
        </Section>

        <Section title="Description" hint="Ce qui s'affiche quand vous ouvrez un événement.">
          <div className="grid gap-2 sm:grid-cols-2">
            {DESCRIPTION_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.description[f.key]}
                  onChange={(e) =>
                    update((s) => ({ ...s, description: { ...s.description, [f.key]: e.target.checked } }))
                  }
                />
                {f.label}
              </label>
            ))}
          </div>
        </Section>

        <Section
          title="Détection des examens"
          hint="Un événement dont le titre contient l'un de ces mots est considéré comme un examen."
        >
          <KeywordInput
            label="Mots-clés d'examen"
            value={settings.examKeywords}
            onChange={(examKeywords) => update({ examKeywords })}
            placeholder="examen, partiel…"
          />
          {upcomingExams.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {upcomingExams.slice(0, 6).map((e) => (
                <li key={`${e.info.uid}${e.info.start}`} className="flex justify-between gap-3">
                  <span className="truncate font-medium text-red-700">{e.view.name}</span>
                  <span className="shrink-0 text-slate-500">{formatDateTime(e.info.start)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucun examen à venir détecté.</p>
          )}
        </Section>

        <Section
          title="Masquer automatiquement"
          hint="Les événements dont le titre contient l'un de ces mots disparaissent."
        >
          <KeywordInput
            label="Mots-clés à masquer"
            value={settings.hideKeywords}
            onChange={(hideKeywords) => update({ hideKeywords })}
            placeholder="mentorat, réunion…"
          />
          {hiddenByKeyword > 0 && <p className="text-sm text-slate-500">{hiddenByKeyword} événements masqués.</p>}
        </Section>

        <Section
          title="Rappels"
          hint="Sur Mac, décochez « Ignorer les alertes » dans les réglages de l'abonnement pour les recevoir."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Avant un examen</span>
              <Select
                value={settings.alarms.examDaysBefore}
                onChange={(e) =>
                  update((s) => ({ ...s, alarms: { ...s.alarms, examDaysBefore: Number(e.target.value) } }))
                }
              >
                <option value={0}>Aucun rappel</option>
                <option value={1}>La veille</option>
                <option value={2}>2 jours avant</option>
                <option value={3}>3 jours avant</option>
                <option value={7}>Une semaine avant</option>
              </Select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Avant chaque cours</span>
              <Select
                value={settings.alarms.minutesBefore}
                onChange={(e) =>
                  update((s) => ({ ...s, alarms: { ...s.alarms, minutesBefore: Number(e.target.value) } }))
                }
              >
                <option value={0}>Aucun rappel</option>
                <option value={10}>10 minutes avant</option>
                <option value={15}>15 minutes avant</option>
                <option value={30}>30 minutes avant</option>
                <option value={60}>1 heure avant</option>
              </Select>
            </label>
          </div>
        </Section>
      </Card>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <p className="text-sm font-medium text-slate-500">Aperçu</p>
        {samples(events).map((e) => (
          <EventCard key={`${e.info.uid}${e.info.start}`} view={e.view} start={e.info.start} end={e.info.end} />
        ))}
      </aside>
    </div>
  );
}
