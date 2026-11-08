import type { ReactNode } from "react";
import { Link } from "react-router";
import { useMe } from "../auth";
import { Logo } from "./Logo";

export const AUTHOR_URL = "https://felixlenci.com";
export const REPO_URL = "https://github.com/FelixMining/SchedulePilot";
export const CONTACT_EMAIL = "contact@schedulepilot.dev";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Développé par{" "}
          <a href={AUTHOR_URL} className="font-medium text-slate-700 hover:text-slate-900">
            Félix Lenci
          </a>{" "}
          · gratuit et open source
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/guide" className="hover:text-slate-800">
            Guide
          </Link>
          <Link to="/confidentialite" className="hover:text-slate-800">
            Confidentialité
          </Link>
          <Link to="/conditions" className="hover:text-slate-800">
            Conditions
          </Link>
          <Link to="/mentions-legales" className="hover:text-slate-800">
            Mentions légales
          </Link>
          <a href={REPO_URL} className="hover:text-slate-800">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function PublicHeader() {
  const { data } = useMe();
  return (
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-5">
      <Logo />
      <nav className="flex items-center gap-1 text-sm font-medium">
        <Link to="/guide" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900 sm:block">
          Guide
        </Link>
        {data?.user ? (
          <Link to="/app" className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-700">
            Mon espace
          </Link>
        ) : (
          <>
            <Link to="/login" className="rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900">
              Connexion
            </Link>
            <Link to="/register" className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-700">
              Créer un compte
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Long-form text pages (legal notices, privacy policy…). */
export function Prose({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-5 pt-10 pb-20 text-[15px] leading-relaxed text-slate-700 [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mt-1 [&_p]:mt-3 [&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-slate-200 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:pr-4 [&_th]:pb-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-900 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {updated && <p className="!mt-2 text-sm text-slate-500">Dernière mise à jour : {updated}</p>}
        {children}
      </article>
    </PublicLayout>
  );
}
