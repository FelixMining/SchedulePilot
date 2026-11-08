import { useState, type FormEvent } from "react";
import type { Group } from "../../api";
import { Button, ErrorMessage, Field, Input, Select } from "../../components/ui";
import { FIELDS, OPERATORS } from "../../../shared/rules/constants";
import type { Action, Condition, RuleInput } from "../../../shared/rules/schema";
import { TEMPLATE_VARIABLES } from "../../../shared/rules/template";
import { ACTION_LABELS, FIELD_LABELS, OPERATOR_LABELS } from "./ruleText";

const ACTION_TYPES = Object.keys(ACTION_LABELS) as Action["type"][];

function defaultAction(type: Action["type"], groups: Group[]): Action {
  switch (type) {
    case "hide":
      return { type };
    case "set_group":
      return { type, groupId: groups[0]?.id ?? null };
    default:
      return { type, template: "" };
  }
}

export const emptyRule = (): RuleInput => ({
  name: "",
  enabled: true,
  matchMode: "all",
  conditions: [{ field: "summary", operator: "contains", value: "" }],
  actions: [{ type: "set_title", template: "" }],
});

export function RuleEditor({
  initial,
  groups,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  initial: RuleInput;
  groups: Group[];
  onSubmit: (rule: RuleInput) => void;
  onCancel: () => void;
  saving: boolean;
  error: unknown;
}) {
  const [rule, setRule] = useState<RuleInput>(initial);

  const setCondition = (i: number, patch: Partial<Condition>) =>
    setRule({ ...rule, conditions: rule.conditions.map((c, j) => (i === j ? { ...c, ...patch } : c)) });
  const setAction = (i: number, action: Action) =>
    setRule({ ...rule, actions: rule.actions.map((a, j) => (i === j ? action : a)) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(rule);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label="Nom de la règle (optionnel)">
        <Input value={rule.name} maxLength={120} onChange={(e) => setRule({ ...rule, name: e.target.value })} />
      </Field>

      <section>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
          <span>Si</span>
          <div className="w-56">
            <Select
              value={rule.matchMode}
              onChange={(e) => setRule({ ...rule, matchMode: e.target.value as RuleInput["matchMode"] })}
            >
              <option value="all">toutes les conditions</option>
              <option value="any">au moins une condition</option>
            </Select>
          </div>
          <span>sont remplies :</span>
        </div>

        {rule.conditions.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Aucune condition : la règle s'applique à tous les événements.
          </p>
        )}

        <ul className="space-y-2">
          {rule.conditions.map((c, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[10rem_11rem_1fr_auto_auto] sm:items-center">
              <Select
                value={c.field}
                onChange={(e) => setCondition(i, { field: e.target.value as Condition["field"] })}
              >
                {FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {FIELD_LABELS[f]}
                  </option>
                ))}
              </Select>
              <Select
                value={c.operator}
                onChange={(e) => setCondition(i, { operator: e.target.value as Condition["operator"] })}
              >
                {OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {OPERATOR_LABELS[o]}
                  </option>
                ))}
              </Select>
              <Input
                required
                value={c.value}
                className={c.operator === "regex" ? "font-mono" : undefined}
                placeholder={c.operator === "regex" ? "(?<salle>\\d+\\.\\d+)" : "HAI301I"}
                onChange={(e) => setCondition(i, { value: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={c.caseSensitive ?? false}
                  onChange={(e) => setCondition(i, { caseSensitive: e.target.checked })}
                />
                Aa
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Supprimer la condition"
                onClick={() => setRule({ ...rule, conditions: rule.conditions.filter((_, j) => j !== i) })}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() =>
            setRule({
              ...rule,
              conditions: [...rule.conditions, { field: "summary", operator: "contains", value: "" }],
            })
          }
        >
          + Ajouter une condition
        </Button>
        {rule.conditions.some((c) => c.operator === "regex") && (
          <p className="mt-1 text-xs text-slate-500">
            Les groupes nommés d'une regex, comme <code>{"(?<salle>...)"}</code>, deviennent des variables :{" "}
            <code>{"{salle}"}</code>.
          </p>
        )}
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-slate-700">Alors :</p>
        <ul className="space-y-2">
          {rule.actions.map((a, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-start">
              <Select
                value={a.type}
                onChange={(e) => setAction(i, defaultAction(e.target.value as Action["type"], groups))}
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACTION_LABELS[t]}
                  </option>
                ))}
              </Select>

              {a.type === "set_group" ? (
                <Select
                  value={a.groupId ?? ""}
                  onChange={(e) => setAction(i, { ...a, groupId: e.target.value || null })}
                >
                  <option value="">Aucun groupe</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              ) : a.type === "set_description" ? (
                <textarea
                  rows={3}
                  value={a.template}
                  placeholder={"{type} · {location}"}
                  onChange={(e) => setAction(i, { ...a, template: e.target.value })}
                  className="block w-full rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              ) : a.type === "hide" ? (
                <p className="py-2 text-sm text-slate-500">L'événement n'apparaîtra dans aucun flux.</p>
              ) : (
                <Input
                  value={a.template}
                  placeholder={a.type === "set_title" ? "Algorithmique {type}" : "Salle {location}"}
                  onChange={(e) => setAction(i, { ...a, template: e.target.value })}
                />
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Supprimer l'action"
                disabled={rule.actions.length === 1}
                onClick={() => setRule({ ...rule, actions: rule.actions.filter((_, j) => j !== i) })}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setRule({ ...rule, actions: [...rule.actions, { type: "set_title", template: "" }] })}
        >
          + Ajouter une action
        </Button>
      </section>

      <details className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium">Variables disponibles</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {TEMPLATE_VARIABLES.map((v) => (
            <div key={v.name} className="contents">
              <dt>
                <code>{`{${v.name}}`}</code>
              </dt>
              <dd>{v.description}</dd>
            </div>
          ))}
        </dl>
      </details>

      <ErrorMessage error={error} />
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          Enregistrer
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
