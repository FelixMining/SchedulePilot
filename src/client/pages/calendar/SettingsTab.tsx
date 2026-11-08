import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "../../api";
import { Button, Card, ErrorMessage, Field, Input } from "../../components/ui";
import { formatRelative } from "../../format";
import type { TabProps } from "../CalendarPage";

export function SettingsTab({ detail, invalidate }: TabProps) {
  const { calendar } = detail;
  const [name, setName] = useState(calendar.name);
  const [sourceUrl, setSourceUrl] = useState(calendar.sourceUrl);
  const [color, setColor] = useState(calendar.color ?? "#6366f1");
  const navigate = useNavigate();

  const update = useMutation({
    mutationFn: () => api.updateCalendar(calendar.id, { name, sourceUrl, color }),
    onSuccess: invalidate,
  });
  const refresh = useMutation({ mutationFn: () => api.refresh(calendar.id), onSuccess: invalidate });
  const remove = useMutation({
    mutationFn: () => api.deleteCalendar(calendar.id),
    onSuccess: () => {
      invalidate();
      navigate("/app");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate();
  };

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nom">
            <Input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="URL source" hint="Le flux ICS d'origine fourni par votre fac.">
            <Input required value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          </Field>
          <Field label="Couleur du flux complet" hint="Suggérée à Apple Calendar lors de l'abonnement.">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-16 cursor-pointer rounded-lg border-0 bg-transparent p-0"
            />
          </Field>
          <ErrorMessage error={update.error} />
          {update.isSuccess && !update.isPending && <p className="text-sm text-emerald-700">Enregistré.</p>}
          <Button type="submit" loading={update.isPending}>
            Enregistrer
          </Button>
        </form>
      </Card>

      <div className="space-y-6">
        <Card className="space-y-3 p-6 text-sm">
          <h2 className="font-semibold">Synchronisation</h2>
          <p className="text-slate-600">
            Le flux d'origine est relu au plus toutes les 15 minutes, et en arrière-plan pour les calendriers utilisés.
          </p>
          <dl className="space-y-1 text-slate-600">
            <div className="flex justify-between">
              <dt>Dernière lecture</dt>
              <dd>{formatRelative(calendar.cachedAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Dernier abonnement</dt>
              <dd>{formatRelative(calendar.lastServedAt)}</dd>
            </div>
          </dl>
          <Button variant="secondary" size="sm" loading={refresh.isPending} onClick={() => refresh.mutate()}>
            Synchroniser maintenant
          </Button>
          <ErrorMessage error={refresh.error ?? refresh.data?.error} />
        </Card>

        <Card className="space-y-3 p-6 text-sm">
          <h2 className="font-semibold text-red-700">Supprimer le calendrier</h2>
          <p className="text-slate-600">Les liens d'abonnement cesseront de fonctionner.</p>
          <Button
            variant="danger"
            size="sm"
            loading={remove.isPending}
            onClick={() => confirm(`Supprimer « ${calendar.name} » ?`) && remove.mutate()}
          >
            Supprimer
          </Button>
        </Card>
      </div>
    </div>
  );
}
