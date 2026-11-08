import { Link } from "react-router";
import { Logo } from "../components/Logo";

const features = [
  {
    title: "Des vrais noms de cours",
    text: "« HAI301I » devient « Algorithmique · TD ». Les variables {type}, {code} ou {location} construisent les titres pour vous.",
  },
  {
    title: "Fini le mentorat fantôme",
    text: "Masquez en un clic les créneaux qui ne vous concernent pas : ils disparaissent de votre calendrier.",
  },
  {
    title: "Une couleur par matière",
    text: "Regroupez vos cours et abonnez-vous à un flux par groupe : Apple Calendar attribue une couleur à chacun.",
  },
  {
    title: "Des descriptions lisibles",
    text: "Remplacez la liste des groupes et la date d'export par ce qui compte : le type de séance et la salle.",
  },
];

const steps = [
  ["Collez l'URL ICS", "celle fournie par l'ENT de votre fac (ADE, Hyperplanning, Celcat…)."],
  ["Configurez vos règles", "renommez, filtrez, regroupez. L'aperçu se met à jour au fur et à mesure."],
  ["Abonnez-vous", "avec le lien SchedulePilot dans Apple Calendar, Google Agenda ou Outlook."],
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link to="/login" className="rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900">
            Connexion
          </Link>
          <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">
            Créer un compte
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-16 pb-20 text-center sm:pt-24">
        <p className="mb-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Gratuit et open source
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          L'emploi du temps de la fac, enfin lisible.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-slate-600">
          SchedulePilot se place entre l'ENT et votre calendrier : il récupère votre emploi du temps, applique vos
          règles et vous renvoie un flux propre, toujours à jour.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/register"
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Commencer
          </Link>
          <a
            href="https://github.com/FelixMining/SchedulePilot"
            className="rounded-lg px-5 py-2.5 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Code source
          </a>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-2xl font-semibold">Comment ça marche</h2>
        <ol className="mt-10 space-y-6">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <p className="pt-1 text-slate-700">
                <strong className="font-semibold text-slate-900">{title}</strong> {text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        SchedulePilot · MIT ·{" "}
        <a href="https://github.com/FelixMining/SchedulePilot" className="hover:text-slate-700">
          GitHub
        </a>
      </footer>
    </div>
  );
}
