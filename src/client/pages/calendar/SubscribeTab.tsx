import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { api, feedUrl, webcalUrl } from "../../api";
import { ColorPicker } from "../../components/ColorPicker";
import { Button, Card, CopyField, cx, ErrorMessage, Toggle } from "../../components/ui";
import type { SessionType } from "../../../shared/extract";
import { listFeeds } from "../../../shared/render";
import type { ColorMode } from "../../../shared/settings";
import { useEditor } from "./editor";

const MODES: { value: ColorMode; title: string; text: string }[] = [
  { value: "course", title: "Une couleur par matière", text: "Un calendrier par matière dans Apple Calendar." },
  { value: "type", title: "Une couleur par type", text: "CM, TD, TP et examens chacun dans leur couleur." },
  { value: "single", title: "Une seule couleur", text: "Tout dans un seul calendrier." },
];

const TYPES: SessionType[] = ["CM", "TD", "TP", "Autre"];

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 p-5">
      <h2 className="flex items-center gap-2.5 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SubscribeTab() {
  const { calendar, settings, update, updateCourse, events } = useEditor();
  const qc = useQueryClient();
  const feeds = useMemo(
    () =>
      listFeeds(
        events.map((e) => e.info),
        settings,
      ),
    [events, settings],
  );
  const token = calendar.feedToken;

  const rotate = useMutation({
    mutationFn: () => api.rotateToken(calendar.id),
    onSuccess: (data) => qc.setQueryData(["calendar", calendar.id], data),
  });

  const courseKeyForFeed = (feedKey: string) => events.find((e) => e.view.feed === feedKey)?.info.key;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="divide-y divide-slate-100 self-start">
        <Step n={1} title="Choisissez comment colorer vos cours">
          <p className="text-sm text-slate-500">
            Apple Calendar n'attribue qu'une couleur par calendrier abonné : SchedulePilot répartit donc vos cours dans
            plusieurs calendriers.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => update({ colorMode: m.value })}
                className={cx(
                  "rounded-lg p-3 text-left ring-1 transition",
                  settings.colorMode === m.value
                    ? "bg-brand-50 ring-2 ring-brand-500"
                    : "bg-white ring-slate-200 hover:ring-slate-300",
                )}
              >
                <span className="block text-sm font-medium">{m.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{m.text}</span>
              </button>
            ))}
          </div>

          {settings.colorMode === "type" && (
            <div className="flex flex-wrap gap-4">
              {TYPES.map((t) => (
                <span key={t} className="flex items-center gap-2 text-sm">
                  <ColorPicker
                    value={settings.typeColors[t]}
                    onChange={(color) => update((s) => ({ ...s, typeColors: { ...s.typeColors, [t]: color } }))}
                  />
                  {t}
                </span>
              ))}
            </div>
          )}
          {settings.colorMode === "single" && (
            <span className="flex items-center gap-2 text-sm">
              <ColorPicker value={settings.singleColor} onChange={(singleColor) => update({ singleColor })} />
              Couleur du calendrier
            </span>
          )}

          {settings.colorMode !== "type" && (
            <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
              <span>
                Examens dans un calendrier à part, en rouge
                <span className="block text-xs text-slate-500">Pour les repérer d'un coup d'œil.</span>
              </span>
              <Toggle
                checked={settings.examsSeparate}
                onChange={(examsSeparate) => update({ examsSeparate })}
                label="Examens à part"
              />
            </label>
          )}
        </Step>

        <Step n={2} title="Abonnez-vous dans Apple Calendar">
          <p className="text-sm text-slate-500">
            {feeds.length > 1
              ? `Ajoutez chacun des ${feeds.length} calendriers de la liste : un clic sur « S'abonner » ouvre directement Calendrier.`
              : "Cliquez sur « S'abonner » : Calendrier s'ouvre directement."}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
            <li>Mac : Fichier → Nouvel abonnement à un calendrier, puis collez le lien.</li>
            <li>
              iPhone : Réglages → Calendrier → Comptes → Ajouter un compte → Autre → Ajouter un calendrier avec
              abonnement.
            </li>
            <li>Choisissez une actualisation toutes les heures. La couleur se change avec un clic droit → Infos.</li>
          </ul>
        </Step>
      </Card>

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="font-semibold">Vos calendriers</h2>
          <p className="mt-0.5 text-sm text-slate-500">Mis à jour automatiquement, au fil des changements de la fac.</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {feeds.map((f) => {
              const url = feedUrl(token, f.key);
              const courseKey =
                settings.colorMode === "course" && f.key !== "examens" ? courseKeyForFeed(f.key) : undefined;
              return (
                <li key={f.key} className="flex items-center gap-3 py-2.5">
                  {courseKey ? (
                    <ColorPicker size="sm" value={f.color} onChange={(color) => updateCourse(courseKey, { color })} />
                  ) : (
                    <span
                      className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: f.color }}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                  <a href={webcalUrl(url)} className="text-sm text-brand-600 hover:underline">
                    S'abonner
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(url)}
                    className="text-sm text-slate-500 hover:text-slate-800"
                  >
                    Copier
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Google Agenda, Outlook…</h2>
          <p className="text-sm text-slate-500">Un lien unique avec tous vos cours, à ajouter « depuis une URL ».</p>
          <CopyField value={feedUrl(token)} />
        </Card>

        <Card className="space-y-3 p-5 text-sm">
          <h2 className="font-semibold">Confidentialité</h2>
          <p className="text-slate-500">
            Ces liens contiennent une clé secrète. En cas de fuite, régénérez-les : les anciens abonnements cesseront de
            fonctionner.
          </p>
          <Button
            variant="danger"
            size="sm"
            loading={rotate.isPending}
            onClick={() => confirm("Régénérer les liens ?") && rotate.mutate()}
          >
            Régénérer les liens
          </Button>
          <ErrorMessage error={rotate.error} />
        </Card>
      </div>
    </div>
  );
}
