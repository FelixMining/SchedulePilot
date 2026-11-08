import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api";
import { Button, Card, ColorDot, EmptyState, ErrorMessage, Field, Input, Spinner } from "../components/ui";
import { formatRelative } from "../format";

function NewCalendarForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState("Emploi du temps");
  const [sourceUrl, setSourceUrl] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: () => api.createCalendar({ name, sourceUrl }),
    onSuccess: ({ calendar }) => {
      qc.invalidateQueries({ queryKey: ["calendars"] });
      onDone?.();
      navigate(`/app/calendars/${calendar.id}/courses`);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nom">
        <Input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field
        label="URL du calendrier de la fac"
        hint="Le lien d'abonnement ICS / webcal fourni par l'ENT. Il ne sera jamais affiché publiquement."
      >
        <Input
          required
          type="text"
          inputMode="url"
          placeholder="https://ade.univ-exemple.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?…"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      </Field>
      <ErrorMessage error={create.error} />
      <Button type="submit" loading={create.isPending}>
        {create.isPending ? "Vérification du calendrier…" : "Ajouter"}
      </Button>
    </form>
  );
}

export function DashboardPage() {
  const { data, isPending, error } = useQuery({ queryKey: ["calendars"], queryFn: api.calendars });
  const [adding, setAdding] = useState(false);

  if (isPending) return <Spinner className="text-brand-600" />;
  if (error) return <ErrorMessage error={error} />;

  const calendars = data.calendars;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vos calendriers</h1>
          <p className="mt-1 text-sm text-slate-500">Chaque calendrier relaie un flux ICS de votre fac.</p>
        </div>
        {calendars.length > 0 && !adding && <Button onClick={() => setAdding(true)}>Nouveau calendrier</Button>}
      </div>

      {(adding || calendars.length === 0) && (
        <Card className="max-w-xl p-6">
          <h2 className="mb-4 font-semibold">Ajouter un calendrier</h2>
          <NewCalendarForm onDone={() => setAdding(false)} />
        </Card>
      )}

      {calendars.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {calendars.map((cal) => (
            <Link key={cal.id} to={`/app/calendars/${cal.id}/courses`} className="group">
              <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
                <div className="flex items-center gap-2">
                  <ColorDot color={cal.color} />
                  <h2 className="truncate font-semibold">{cal.name}</h2>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{new URL(cal.sourceUrl).host}</p>
                <dl className="mt-4 space-y-1 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <dt>Synchronisé</dt>
                    <dd>{formatRelative(cal.cachedAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Dernier abonnement</dt>
                    <dd>{formatRelative(cal.lastServedAt)}</dd>
                  </div>
                </dl>
                {cal.lastError && <p className="mt-3 text-xs text-amber-700">⚠ {cal.lastError}</p>}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        !adding && (
          <EmptyState title="Aucun calendrier pour l'instant">
            Commencez par coller l'URL ICS de votre emploi du temps ci-dessus.
          </EmptyState>
        )
      )}
    </div>
  );
}
