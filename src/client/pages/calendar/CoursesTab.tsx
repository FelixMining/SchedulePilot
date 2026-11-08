import { useMemo, useState } from "react";
import { ColorPicker } from "../../components/ColorPicker";
import { Badge, Card, cx, Input, Toggle } from "../../components/ui";
import { formatDateTime } from "../../format";
import { summarizeCourses, type CourseSummary } from "./courses";
import { useEditor } from "./editor";

function CourseRow({ course }: { course: CourseSummary }) {
  const { settings, updateCourse } = useEditor();
  const custom = settings.courses[course.key] ?? {};
  const details = [
    `${course.count} séance${course.count > 1 ? "s" : ""}`,
    course.teachers.slice(0, 2).join(", ") + (course.teachers.length > 2 ? "…" : ""),
    course.next ? `prochain : ${formatDateTime(course.next)}` : "",
  ].filter(Boolean);

  return (
    <li className={cx("flex items-start gap-3 px-4 py-3 sm:items-center", course.hidden && "bg-slate-50")}>
      <div className="pt-2 sm:pt-0">
        {settings.colorMode === "course" ? (
          <ColorPicker value={course.color} onChange={(color) => updateCourse(course.key, { color })} />
        ) : (
          <span className="block size-6 rounded-full ring-1 ring-black/10" style={{ backgroundColor: course.color }} />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center sm:gap-4 sm:space-y-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cx("truncate text-sm font-medium", course.hidden && "text-slate-400 line-through")}>
              {course.code || course.courseName}
            </span>
            {course.types.map((t) => (
              <Badge key={t} className={t === "Examen" ? "bg-red-50 text-red-700" : undefined}>
                {t}
              </Badge>
            ))}
          </div>
          <p className="truncate text-xs text-slate-500">{details.join(" · ")}</p>
        </div>
        <Input
          value={custom.name ?? ""}
          placeholder={course.courseName}
          disabled={course.hidden}
          onChange={(e) => updateCourse(course.key, { name: e.target.value })}
          aria-label={`Nom affiché pour ${course.key}`}
        />
      </div>
      <div className="pt-2 sm:pt-0">
        <Toggle
          checked={!custom.hidden}
          onChange={(v) => updateCourse(course.key, { hidden: !v })}
          label={`Afficher ${course.name}`}
        />
      </div>
    </li>
  );
}

export function CoursesTab() {
  const { events } = useEditor();
  const [filter, setFilter] = useState("");
  const [showPast, setShowPast] = useState(false);
  const courses = useMemo(() => summarizeCourses(events), [events]);

  const needle = filter.trim().toLowerCase();
  const visible = courses.filter(
    (c) => !needle || `${c.key} ${c.courseName} ${c.name} ${c.teachers.join(" ")}`.toLowerCase().includes(needle),
  );
  const regular = visible.filter((c) => c.regular);
  const oneOff = visible.filter((c) => !c.regular && (showPast || c.upcoming > 0));
  const pastCount = visible.filter((c) => !c.regular && c.upcoming === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-slate-600">
          Les noms sont repris automatiquement de la description des cours. Modifiez-les si besoin, choisissez une
          couleur et masquez ce qui ne vous concerne pas. Tout est enregistré au fil de l'eau.
        </p>
        <Input
          className="sm:max-w-60"
          placeholder="Rechercher…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Matières</h2>
        <Card>
          <ul className="divide-y divide-slate-100">
            {regular.map((c) => (
              <CourseRow key={c.key} course={c} />
            ))}
          </ul>
        </Card>
      </section>

      {(oneOff.length > 0 || pastCount > 0) && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Événements ponctuels</h2>
            {pastCount > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
                Inclure les {pastCount} passés
              </label>
            )}
          </div>
          {oneOff.length > 0 && (
            <Card>
              <ul className="divide-y divide-slate-100">
                {oneOff.map((c) => (
                  <CourseRow key={c.key} course={c} />
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
