import { useRef } from "react";
import { Input } from "../../components/ui";
import { TITLE_VARIABLES } from "../../../shared/render";
import { useEditor } from "./editor";

const PRESETS = [
  { label: "Salle en premier", template: "{num_salle} · {matiere} {type}" },
  { label: "Avec l'enseignant", template: "{matiere} {type} · {prof}" },
  { label: "Type et salle", template: "{type} {num_salle} · {matiere}" },
];

export function TitleTemplateEditor() {
  const { settings, update, events } = useEditor();
  const input = useRef<HTMLInputElement>(null);
  const template = settings.title.template;

  const setTemplate = (value: string) => update((s) => ({ ...s, title: { ...s.title, template: value } }));

  const insert = (variable: string) => {
    const el = input.current;
    const token = `{${variable}}`;
    if (!el) return setTemplate(`${template}${token}`);
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    const before = template.slice(0, start);
    const spacer = before && !before.endsWith(" ") ? " " : "";
    setTemplate(`${before}${spacer}${token}${template.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + spacer.length + token.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const examples = events
    .filter((e) => !e.view.hidden && !e.view.exam && e.info.rooms.length > 0)
    .filter((e, i, all) => all.findIndex((x) => x.view.type === e.view.type) === i)
    .slice(0, 3);

  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <Input
        ref={input}
        value={template}
        maxLength={200}
        onChange={(e) => setTemplate(e.target.value)}
        aria-label="Modèle de titre"
        className="font-mono"
      />
      <div className="flex flex-wrap gap-1.5">
        {TITLE_VARIABLES.map((v) => (
          <button
            key={v.name}
            type="button"
            onClick={() => insert(v.name)}
            title={`${v.label}, ex. ${v.example}`}
            className="rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-300 hover:ring-brand-500"
          >
            {`{${v.name}}`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        Exemples :
        {PRESETS.map((p) => (
          <button
            key={p.template}
            type="button"
            onClick={() => setTemplate(p.template)}
            className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400"
          >
            {p.label}
          </button>
        ))}
      </div>
      {examples.length > 0 && (
        <ul className="space-y-1 border-t border-slate-200 pt-3 text-sm">
          {examples.map((e) => (
            <li key={e.info.id} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.view.color }} />
              <span className="truncate font-medium">{e.view.title}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        Mettre la salle en premier la rend lisible dans le widget Calendrier de l'écran verrouillé, où les titres sont
        coupés. Les séparateurs inutiles disparaissent quand une information manque.
      </p>
    </div>
  );
}
