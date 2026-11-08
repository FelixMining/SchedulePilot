/**
 * Simplified drawings of the calendar apps used in the setup guide. They show
 * where to click, with the target highlighted, rather than an exact copy of
 * each interface.
 */
import type { ReactNode } from "react";
import { cx } from "../../components/ui";

const SAMPLE_URL = "https://schedulepilot.dev/feed/x7Kp…/algo.ics";

export function Pointer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cx("pointer-events-none absolute size-5 drop-shadow", className)}>
      <path d="M5 3l14 8-6 1.5L10 19z" fill="#0f172a" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Wraps the element the reader should click. */
function Target({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("relative inline-block rounded-md ring-2 ring-brand-500 ring-offset-1", className)}>
      {children}
      <Pointer className="-right-3 -bottom-4" />
    </span>
  );
}

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-xl bg-white text-[13px] text-slate-700 shadow-sm ring-1 ring-slate-200 select-none",
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

function MacChrome({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Frame>
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        {title && <span className="ml-3 text-xs font-medium text-slate-500">{title}</span>}
      </div>
      {children}
    </Frame>
  );
}

export function BrowserChrome({ url, children }: { url: string; children: ReactNode }) {
  return (
    <Frame>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
          {url}
        </span>
      </div>
      {children}
    </Frame>
  );
}

export function PhoneChrome({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="mx-auto w-60 rounded-[2rem] bg-slate-900 p-2 shadow-sm" aria-hidden>
      <div className="relative h-[25rem] overflow-hidden rounded-[1.6rem] bg-slate-50 text-[13px] text-slate-800 select-none">
        <div className="flex justify-between px-5 pt-2 pb-1 text-[11px] font-semibold">
          <span>9:41</span>
          <span className="mt-1 h-2 w-14 rounded-full bg-slate-900" />
          <span>100 %</span>
        </div>
        {title && <p className="px-4 pt-2 pb-2 text-xl font-bold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/* ---------- Apple Calendar (Mac) ---------- */

export function MacFileMenu() {
  const items = [
    "Nouvel évènement",
    "Nouveau calendrier",
    "Nouvel abonnement à un calendrier…",
    "Importer…",
    "Exporter",
  ];
  return (
    <MacChrome>
      <div className="flex gap-4 border-b border-slate-200 bg-white px-4 py-1.5 text-xs">
        <span className="font-semibold">Calendrier</span>
        <span className="rounded bg-brand-600 px-1.5 text-white">Fichier</span>
        <span>Édition</span>
        <span>Présentation</span>
        <span>Fenêtre</span>
      </div>
      <div className="h-52 bg-slate-50 p-3 pl-16">
        <div className="w-64 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {items.map((item) =>
            item.startsWith("Nouvel abonnement") ? (
              <div key={item} className="px-1">
                <Target className="flex w-full justify-between rounded bg-brand-600 px-2 py-1 text-white">
                  <span>{item}</span>
                  <span className="text-brand-100">⌥⌘S</span>
                </Target>
              </div>
            ) : (
              <p key={item} className="px-3 py-1">
                {item}
              </p>
            ),
          )}
        </div>
      </div>
    </MacChrome>
  );
}

export function MacUrlDialog() {
  return (
    <MacChrome>
      <div className="space-y-3 p-5">
        <p className="font-semibold">Saisissez l'URL du calendrier auquel vous souhaitez vous abonner.</p>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-500">URL du calendrier :</span>
          <span className="ring-brand-300 flex-1 truncate rounded-md bg-white px-2 py-1 text-xs ring-2">
            {SAMPLE_URL}
          </span>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <span className="rounded-md bg-slate-100 px-3 py-1 ring-1 ring-slate-200">Annuler</span>
          <Target className="rounded-md bg-brand-600 px-3 py-1 text-white">S'abonner</Target>
        </div>
      </div>
    </MacChrome>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-center gap-3">
      <span className="text-right text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function MacSubscriptionSettings() {
  return (
    <MacChrome>
      <div className="space-y-2.5 p-5">
        <Row label="Nom :">
          <span className="flex-1 rounded-md bg-white px-2 py-1 ring-1 ring-slate-300">Algorithmique 1</span>
          <span className="size-4 rounded-full bg-blue-500" />
        </Row>
        <Row label="Emplacement :">
          <span className="rounded-md bg-white px-2 py-1 ring-2 ring-brand-500">iCloud ⌄</span>
        </Row>
        <Row label="Supprimer :">
          <span className="rounded-md px-1 ring-2 ring-brand-500">☐ Alertes</span>
          <span>☐ Pièces jointes</span>
        </Row>
        <Row label="Actualisation auto :">
          <span className="rounded-md bg-white px-2 py-1 ring-2 ring-brand-500">Toutes les heures ⌄</span>
        </Row>
        <div className="flex justify-end gap-2 pt-2">
          <span className="rounded-md bg-slate-100 px-3 py-1 ring-1 ring-slate-200">Annuler</span>
          <Target className="rounded-md bg-brand-600 px-4 py-1 text-white">OK</Target>
        </div>
      </div>
    </MacChrome>
  );
}

/* ---------- Apple Calendar (iPhone) ---------- */

export function PhoneSubscribeLink() {
  return (
    <PhoneChrome>
      <div className="mx-3 mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <p className="font-semibold">Vos calendriers</p>
        {[
          ["#3b82f6", "Algorithmique 1"],
          ["#f97316", "Programmation fonct."],
          ["#ef4444", "Examens"],
        ].map(([color, name], i) => (
          <div key={name} className="flex items-center gap-2 border-t border-slate-100 py-2 first-of-type:border-0">
            <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="flex-1 truncate">{name}</span>
            {i === 0 ? (
              <Target className="rounded px-1 text-brand-600">S'abonner</Target>
            ) : (
              <span className="text-brand-600">S'abonner</span>
            )}
          </div>
        ))}
      </div>
      <p className="absolute inset-x-0 bottom-3 mx-auto w-40 rounded-full bg-slate-200 py-1 text-center text-[11px]">
        schedulepilot.dev
      </p>
    </PhoneChrome>
  );
}

export function PhoneSubscribeAlert() {
  return (
    <PhoneChrome>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
        <div className="w-52 overflow-hidden rounded-2xl bg-white/95 text-center shadow-lg">
          <p className="px-4 pt-4 font-semibold">S'abonner à « Algorithmique 1 » ?</p>
          <p className="px-4 pt-1 pb-3 text-[11px] text-slate-500">schedulepilot.dev</p>
          <div className="grid grid-cols-2 border-t border-slate-200">
            <span className="py-2 text-brand-600">Annuler</span>
            <span className="border-l border-slate-200 py-1">
              <Target className="px-2 py-1 font-semibold text-brand-600">S'abonner</Target>
            </span>
          </div>
        </div>
      </div>
    </PhoneChrome>
  );
}

export function PhoneSettingsList({ items, target, title }: { items: string[]; target: string; title: string }) {
  return (
    <PhoneChrome title={title}>
      <div className="mx-3 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5 first:border-0"
          >
            {item === target ? <Target className="px-1 text-brand-700">{item}</Target> : <span>{item}</span>}
            <span className="text-slate-300">›</span>
          </div>
        ))}
      </div>
    </PhoneChrome>
  );
}

/* ---------- Google Agenda ---------- */

function GoogleSidebar({ menu }: { menu?: boolean }) {
  return (
    <BrowserChrome url="calendar.google.com">
      <div className="relative grid h-60 grid-cols-[13rem_1fr]">
        <div className="space-y-3 border-r border-slate-100 p-3">
          <span className="inline-block rounded-2xl bg-white px-4 py-2 shadow ring-1 ring-slate-200">＋ Créer</span>
          <div>
            <p className="font-medium">Mes agendas</p>
            <p className="mt-1 flex items-center gap-2 text-xs">
              <span className="size-3 rounded-sm bg-blue-600" /> Félix
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium">Autres agendas</p>
            {menu ? <span className="px-1">＋</span> : <Target className="px-1">＋</Target>}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-px bg-slate-100">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="bg-white" />
          ))}
        </div>
        {menu && (
          <div className="absolute top-28 left-40 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200">
            <p className="px-3 py-1.5">S'abonner à l'agenda</p>
            <p className="px-3 py-1.5">Créer un agenda</p>
            <p className="px-3 py-1.5">Parcourir les agendas…</p>
            <div className="px-1">
              <Target className="w-full bg-brand-50 px-2 py-1.5">À partir de l'URL</Target>
            </div>
            <p className="px-3 py-1.5">Importer</p>
          </div>
        )}
      </div>
    </BrowserChrome>
  );
}

export const GooglePlus = () => <GoogleSidebar />;
export const GoogleFromUrl = () => <GoogleSidebar menu />;

export function GoogleUrlForm() {
  return (
    <BrowserChrome url="calendar.google.com/calendar/u/0/r/settings/addbyurl">
      <div className="space-y-4 p-6">
        <p className="text-base font-medium">À partir de l'URL</p>
        <div className="ring-brand-300 rounded-md px-3 py-2 ring-2">
          <p className="text-[10px] text-brand-700">URL de l'agenda</p>
          <p className="truncate text-xs">{SAMPLE_URL}</p>
        </div>
        <p className="text-xs text-slate-500">☐ Rendre l'agenda public</p>
        <Target className="rounded-md bg-blue-600 px-4 py-1.5 text-white">Ajouter un agenda</Target>
      </div>
    </BrowserChrome>
  );
}

export function GoogleColor() {
  const colors = ["#d50000", "#e67c73", "#f4511e", "#f6bf26", "#33b679", "#0b8043", "#039be5", "#3f51b5", "#8e24aa"];
  return (
    <BrowserChrome url="calendar.google.com">
      <div className="relative h-56 p-3">
        <p className="font-medium">Autres agendas</p>
        <div className="mt-2 flex w-56 items-center justify-between rounded-md bg-slate-100 px-2 py-1.5">
          <span className="flex items-center gap-2 text-xs">
            <span className="size-3 rounded-sm bg-blue-500" /> Algorithmique 1
          </span>
          <Target className="px-1">⋮</Target>
        </div>
        <div className="absolute top-20 left-40 w-52 rounded-lg bg-white p-2 shadow-lg ring-1 ring-slate-200">
          <p className="px-1 py-1">Afficher uniquement cet agenda</p>
          <p className="px-1 py-1">Paramètres</p>
          <div className="mt-1 grid grid-cols-9 gap-1 border-t border-slate-100 pt-2">
            {colors.map((c) => (
              <span key={c} className="size-4 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

/* ---------- Outlook ---------- */

export function OutlookAddCalendar() {
  return (
    <BrowserChrome url="outlook.live.com/calendar">
      <div className="grid h-56 grid-cols-[12rem_1fr]">
        <div className="space-y-3 border-r border-slate-100 p-3">
          <span className="inline-block rounded-md bg-blue-600 px-3 py-1.5 text-white">Nouvel évènement</span>
          <div className="space-y-1 text-xs">
            <p className="font-medium">Mes calendriers</p>
            <p className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-blue-600" /> Calendrier
            </p>
          </div>
          <Target className="px-1 text-xs text-blue-700">Ajouter un calendrier</Target>
        </div>
        <div className="grid grid-cols-5 gap-px bg-slate-100">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="bg-white" />
          ))}
        </div>
      </div>
    </BrowserChrome>
  );
}

export function OutlookSubscribe({ form }: { form?: boolean }) {
  return (
    <BrowserChrome url="outlook.live.com/calendar">
      <div className="grid h-60 grid-cols-[11rem_1fr]">
        <div className="space-y-1 border-r border-slate-100 bg-slate-50 p-2 text-xs">
          <p className="px-2 py-1.5">Ajouter un calendrier vide</p>
          <p className="px-2 py-1.5">Ajouter des calendriers de vacances</p>
          {form ? (
            <p className="rounded bg-white px-2 py-1.5 font-medium shadow-sm">S'abonner à partir du web</p>
          ) : (
            <Target className="w-full bg-white px-2 py-1.5 font-medium">S'abonner à partir du web</Target>
          )}
          <p className="px-2 py-1.5">Charger à partir d'un fichier</p>
        </div>
        <div className="space-y-3 p-4">
          <p className="font-medium">S'abonner à partir du web</p>
          {form ? (
            <>
              <p className="ring-brand-300 truncate rounded-md px-2 py-1 text-xs ring-2">{SAMPLE_URL}</p>
              <p className="rounded-md px-2 py-1 text-xs ring-1 ring-slate-300">Algorithmique 1</p>
              <div className="flex gap-1.5">
                {["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"].map((c) => (
                  <span key={c} className="size-4 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <Target className="rounded-md bg-blue-600 px-4 py-1 text-white">Importer</Target>
            </>
          ) : (
            <p className="text-xs text-slate-400">Lien vers le calendrier…</p>
          )}
        </div>
      </div>
    </BrowserChrome>
  );
}
