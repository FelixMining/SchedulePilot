import { Link } from "react-router";

export function Logo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-semibold text-slate-900">
      <img src="/favicon.svg" alt="" className="size-7" />
      <span className={compact ? "hidden sm:inline" : undefined}>SchedulePilot</span>
    </Link>
  );
}
