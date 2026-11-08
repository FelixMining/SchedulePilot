import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api";
import { Badge, Button, Card, cx, EmptyState, Toggle } from "../../components/ui";
import type { Rule, RuleInput } from "../../../shared/rules/schema";
import type { TabProps } from "../CalendarPage";
import { emptyRule, RuleEditor } from "./RuleEditor";
import { describeAction, describeConditions } from "./ruleText";

const toInput = ({ id: _id, position: _position, ...input }: Rule): RuleInput => input;

export function RulesTab({ detail, invalidate }: TabProps) {
  const id = detail.calendar.id;
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const save = useMutation({
    mutationFn: ({ ruleId, input }: { ruleId: string | null; input: RuleInput }) =>
      ruleId ? api.updateRule(id, ruleId, input) : api.createRule(id, input),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });
  const remove = useMutation({ mutationFn: (ruleId: string) => api.deleteRule(id, ruleId), onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: (ids: string[]) => api.reorderRules(id, ids), onSuccess: invalidate });
  const toggle = useMutation({
    mutationFn: (rule: Rule) => api.updateRule(id, rule.id, { ...toInput(rule), enabled: !rule.enabled }),
    onSuccess: invalidate,
  });

  const rules = detail.rules;
  const move = (index: number, delta: number) => {
    const ids = rules.map((r) => r.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    reorder.mutate(ids);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-slate-600">
          Les règles s'appliquent de haut en bas sur chaque événement d'origine. Si plusieurs règles modifient le même
          champ, la dernière l'emporte. Les règles créées depuis l'onglet « Cours » apparaissent ici aussi.
        </p>
        {editing === null && <Button onClick={() => setEditing("new")}>Nouvelle règle</Button>}
      </div>

      {editing === "new" && (
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Nouvelle règle</h2>
          <RuleEditor
            initial={emptyRule()}
            groups={detail.groups}
            saving={save.isPending}
            error={save.error}
            onCancel={() => setEditing(null)}
            onSubmit={(input) => save.mutate({ ruleId: null, input })}
          />
        </Card>
      )}

      {rules.length === 0 && editing !== "new" ? (
        <EmptyState title="Aucune règle">
          Exemple : si le titre contient « Mentorat », alors masquer l'événement.
        </EmptyState>
      ) : (
        <ol className="space-y-2">
          {rules.map((rule, i) =>
            editing === rule.id ? (
              <li key={rule.id}>
                <Card className="p-6">
                  <RuleEditor
                    initial={toInput(rule)}
                    groups={detail.groups}
                    saving={save.isPending}
                    error={save.error}
                    onCancel={() => setEditing(null)}
                    onSubmit={(input) => save.mutate({ ruleId: rule.id, input })}
                  />
                </Card>
              </li>
            ) : (
              <li key={rule.id}>
                <Card className={cx("flex items-start gap-4 p-4", !rule.enabled && "opacity-60")}>
                  <div className="flex flex-col pt-0.5">
                    <button
                      className="text-xs text-slate-400 hover:text-slate-700 disabled:invisible"
                      disabled={i === 0 || reorder.isPending}
                      onClick={() => move(i, -1)}
                      aria-label="Monter"
                    >
                      ▲
                    </button>
                    <button
                      className="text-xs text-slate-400 hover:text-slate-700 disabled:invisible"
                      disabled={i === rules.length - 1 || reorder.isPending}
                      onClick={() => move(i, 1)}
                      aria-label="Descendre"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{rule.name || `Règle ${i + 1}`}</span>
                      {rule.courseKey && <Badge>cours</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="text-slate-400">Si</span> {describeConditions(rule)}
                    </p>
                    <ul className="mt-1 text-sm text-slate-600">
                      {rule.actions.map((a, j) => (
                        <li key={j}>
                          <span className="text-slate-400">→</span> {describeAction(a, detail.groups)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Toggle checked={rule.enabled} onChange={() => toggle.mutate(rule)} label="Activer la règle" />
                    <Button variant="ghost" size="sm" onClick={() => setEditing(rule.id)}>
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => confirm("Supprimer cette règle ?") && remove.mutate(rule.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </Card>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}
