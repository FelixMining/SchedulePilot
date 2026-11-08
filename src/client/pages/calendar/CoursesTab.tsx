import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type Course, type CourseEdit, type Group } from "../../api";
import {
  Badge,
  Button,
  Card,
  ColorDot,
  cx,
  EmptyState,
  ErrorMessage,
  Input,
  Select,
  Spinner,
  Toggle,
} from "../../components/ui";
import { formatDateTime } from "../../format";
import { renderTemplate } from "../../../shared/rules/template";
import type { TabProps } from "../CalendarPage";

function editFromCourse(course: Course): CourseEdit {
  const actions = course.rule?.actions ?? [];
  const title = actions.find((a) => a.type === "set_title");
  const group = actions.find((a) => a.type === "set_group");
  return {
    title: title?.type === "set_title" ? title.template : "",
    hidden: actions.some((a) => a.type === "hide"),
    groupId: group?.type === "set_group" ? group.groupId : null,
  };
}

function CourseRow({
  calendarId,
  course,
  groups,
  groupColor,
  onSaved,
}: {
  calendarId: string;
  course: Course;
  groups: Group[];
  groupColor?: string;
  onSaved: () => void;
}) {
  const initial = useMemo(() => editFromCourse(course), [course]);
  const [edit, setEdit] = useState(initial);
  const dirty = JSON.stringify(edit) !== JSON.stringify(initial);

  const save = useMutation({
    mutationFn: (next: CourseEdit) => api.saveCourse(calendarId, course.key, next),
    onSuccess: onSaved,
  });

  const preview = edit.title
    ? renderTemplate(edit.title, {
        summary: course.sample,
        code: course.code,
        type: course.types[0] ?? "",
        title: course.sample,
        location: "",
        description: "",
      })
    : course.sample;

  return (
    <li
      className={cx(
        "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_10rem_auto] sm:items-center",
        edit.hidden && "bg-slate-50",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {groupColor && <ColorDot color={groupColor} className="size-2.5" />}
          <span className={cx("truncate font-medium", edit.hidden && "text-slate-400 line-through")}>
            {course.code || course.sample}
          </span>
          <Badge>{course.count}×</Badge>
          {course.types.map((t) => (
            <Badge key={t} className="bg-brand-50 text-brand-700">
              {t}
            </Badge>
          ))}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500" title={course.sample}>
          {course.code ? course.sample : null}
          {course.code && course.nextStart ? " · " : null}
          {course.nextStart ? `prochain : ${formatDateTime(course.nextStart)}` : "aucun créneau à venir"}
        </p>
      </div>

      <div className="min-w-0">
        <Input
          value={edit.title}
          disabled={edit.hidden}
          placeholder="Nom affiché, ex. Algorithmique {type}"
          onChange={(e) => setEdit({ ...edit, title: e.target.value })}
          aria-label={`Nom affiché pour ${course.key}`}
        />
        {!edit.hidden && edit.title && <p className="mt-1 truncate text-xs text-slate-500">→ {preview}</p>}
      </div>

      <Select
        value={edit.groupId ?? ""}
        disabled={edit.hidden || groups.length === 0}
        onChange={(e) => setEdit({ ...edit, groupId: e.target.value || null })}
        aria-label="Groupe"
      >
        <option value="">{groups.length ? "Sans groupe" : "Aucun groupe"}</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>

      <div className="flex items-center justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Toggle checked={!edit.hidden} onChange={(v) => setEdit({ ...edit, hidden: !v })} label="Afficher ce cours" />
          <span className="sm:hidden">Afficher</span>
        </label>
        <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(edit)}>
          Enregistrer
        </Button>
      </div>
      {save.error && (
        <div className="sm:col-span-4">
          <ErrorMessage error={save.error} />
        </div>
      )}
    </li>
  );
}

export function CoursesTab({ detail, invalidate }: TabProps) {
  const id = detail.calendar.id;
  const { data, isPending, error } = useQuery({ queryKey: ["courses", id], queryFn: () => api.courses(id) });
  const [filter, setFilter] = useState("");

  if (isPending) return <Spinner className="text-brand-600" />;
  if (error) return <ErrorMessage error={error} />;

  const needle = filter.trim().toLowerCase();
  const courses = data.courses.filter((c) => !needle || `${c.key} ${c.sample}`.toLowerCase().includes(needle));
  const groupColor = new Map(detail.groups.map((g) => [g.id, g.color]));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-slate-600">
          Les cours sont regroupés par code. Donnez-leur un nom lisible, masquez ceux qui ne vous concernent pas et
          rangez-les dans des groupes pour leur donner une couleur. Variables : <code>{"{type}"}</code>,{" "}
          <code>{"{code}"}</code>, <code>{"{summary}"}</code>.
        </p>
        <Input
          className="sm:max-w-60"
          placeholder="Filtrer…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {courses.length === 0 ? (
        <EmptyState title="Aucun cours trouvé" />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {courses.map((course) => (
              <CourseRow
                key={course.key}
                calendarId={id}
                course={course}
                groups={detail.groups}
                groupColor={course.preview.groupId ? groupColor.get(course.preview.groupId) : undefined}
                onSaved={invalidate}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
