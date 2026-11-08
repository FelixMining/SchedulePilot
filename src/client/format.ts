const dateTime = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

const parse = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);

export const formatDateTime = (iso: string | null) => (iso ? dateTime.format(parse(iso)) : "—");
export const formatDay = (iso: string) => day.format(parse(iso));
export const formatTime = (iso: string | null) => (iso && iso.length > 10 ? time.format(parse(iso)) : "");
export const dayKey = (iso: string | null) => (iso ? parse(iso).toDateString() : "");

export function formatRelative(iso: string | null): string {
  if (!iso) return "jamais";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}
