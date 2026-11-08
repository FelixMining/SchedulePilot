import { NavLink, Outlet, useNavigate } from "react-router";
import { useLogout, useMe } from "../auth";
import { Logo } from "./Logo";
import { SiteFooter } from "./PublicLayout";
import { cx } from "./ui";

export function AppLayout() {
  const { data } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  const link = ({ isActive }: { isActive: boolean }) =>
    cx(
      "rounded-md px-3 py-1.5 text-sm font-medium",
      isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900",
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3 sm:gap-6">
            <Logo to="/app" compact />
            <nav className="flex gap-1">
              <NavLink to="/app" end className={link}>
                Calendriers
              </NavLink>
              <NavLink to="/app/account" className={link}>
                Compte
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 md:inline">{data?.user?.email}</span>
            <button
              className="text-slate-600 hover:text-slate-900"
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/") })}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
