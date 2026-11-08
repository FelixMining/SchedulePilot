import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, feedUrl, webcalUrl, type Group } from "../../api";
import { Button, Card, ColorDot, CopyField, ErrorMessage, Input } from "../../components/ui";
import type { TabProps } from "../CalendarPage";

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

function FeedRow({ title, color, url, hint }: { title: string; color?: string | null; url: string; hint?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {color !== undefined && <ColorDot color={color} />}
          <span className="font-medium">{title}</span>
        </div>
        <a href={webcalUrl(url)} className="text-sm font-medium text-brand-600 hover:underline">
          S'abonner
        </a>
      </div>
      <CopyField value={url} />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function GroupEditor({
  calendarId,
  group,
  token,
  onChange,
}: {
  calendarId: string;
  group: Group;
  token: string;
  onChange: () => void;
}) {
  const [name, setName] = useState(group.name);
  const update = useMutation({
    mutationFn: (input: Partial<{ name: string; color: string }>) => api.updateGroup(calendarId, group.id, input),
    onSuccess: onChange,
  });
  const remove = useMutation({ mutationFn: () => api.deleteGroup(calendarId, group.id), onSuccess: onChange });

  return (
    <li className="space-y-3 py-4">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={group.color}
          onChange={(e) => update.mutate({ color: e.target.value })}
          className="size-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          aria-label="Couleur"
        />
        <Input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== group.name && update.mutate({ name: name.trim() })}
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600"
          loading={remove.isPending}
          onClick={() => confirm(`Supprimer le groupe « ${group.name} » ?`) && remove.mutate()}
        >
          Supprimer
        </Button>
      </div>
      <FeedRow title={`Flux « ${group.name} »`} url={feedUrl(token, group.id)} />
      <ErrorMessage error={update.error ?? remove.error} />
    </li>
  );
}

export function FeedsTab({ detail, invalidate }: TabProps) {
  const { calendar, groups } = detail;
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => api.createGroup(calendar.id, { name, color: PALETTE[groups.length % PALETTE.length]! }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });
  const rotate = useMutation({ mutationFn: () => api.rotateToken(calendar.id), onSuccess: invalidate });

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="space-y-5 p-6">
          <div>
            <h2 className="font-semibold">Un seul calendrier</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tous vos cours visibles, dans un calendrier d'une seule couleur.
            </p>
          </div>
          <FeedRow title="Flux complet" color={calendar.color} url={feedUrl(calendar.feedToken)} />
        </Card>

        <Card className="space-y-4 p-6 text-sm text-slate-600">
          <h2 className="font-semibold text-slate-900">Ajouter le flux dans Apple Calendar</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Cliquez sur « S'abonner », ou copiez le lien.</li>
            <li>
              Sur Mac : <em>Fichier → Nouvel abonnement à un calendrier</em>. Sur iPhone :{" "}
              <em>
                Réglages → Calendrier → Comptes → Ajouter un compte → Autre → Ajouter un calendrier avec abonnement
              </em>
              .
            </li>
            <li>Choisissez « Actualisation automatique : toutes les heures » et la couleur de votre choix.</li>
          </ol>
          <p>
            Les liens contiennent une clé secrète : toute personne qui la possède peut lire votre emploi du temps. En
            cas de fuite, régénérez-la (les anciens abonnements cesseront de fonctionner).
          </p>
          <Button
            variant="danger"
            size="sm"
            loading={rotate.isPending}
            onClick={() => confirm("Régénérer les liens ?") && rotate.mutate()}
          >
            Régénérer les liens
          </Button>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">Un calendrier par couleur</h2>
        <p className="mt-1 text-sm text-slate-500">
          Apple Calendar ne gère qu'une couleur par calendrier. Créez des groupes (« Maths », « Info », « Examens »…),
          rangez-y vos cours depuis l'onglet « Cours » ou via une règle, puis abonnez-vous à chaque groupe séparément
          ainsi qu'au flux « Autres » qui contient tout le reste.
        </p>

        <ul className="mt-2 divide-y divide-slate-100">
          {groups.map((g) => (
            <GroupEditor
              key={g.id}
              calendarId={calendar.id}
              group={g}
              token={calendar.feedToken}
              onChange={invalidate}
            />
          ))}
        </ul>

        {groups.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <FeedRow
              title="Autres"
              color={null}
              url={feedUrl(calendar.feedToken, "ungrouped")}
              hint="Les cours visibles qui ne sont dans aucun groupe."
            />
          </div>
        )}

        <form onSubmit={onCreate} className="mt-6 flex gap-2">
          <Input
            placeholder="Nom du groupe"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" variant="secondary" loading={create.isPending}>
            Ajouter
          </Button>
        </form>
        <div className="mt-2">
          <ErrorMessage error={create.error} />
        </div>
      </Card>
    </div>
  );
}
