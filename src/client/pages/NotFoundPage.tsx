import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <Link to="/" className="text-sm text-brand-600 hover:underline">
        Retour à l'accueil
      </Link>
    </div>
  );
}
