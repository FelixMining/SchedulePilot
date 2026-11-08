import { Link } from "react-router";
import { PublicHeader, SiteFooter } from "../components/PublicLayout";

const features = [
  {
    title: "Les vrais noms des cours",
    text: "« HAI101I Portail Info GrC » devient « Algorithmique 1 · TD ». Le nom est retrouvé automatiquement, vous pouvez le changer.",
  },
  {
    title: "Des descriptions lisibles",
    text: "Le type de séance, la salle et l'enseignant. Plus la liste des douze groupes ni la date d'export.",
  },
  {
    title: "Une couleur par matière",
    text: "Ou par type de séance. Les examens sont repérés automatiquement et mis en évidence, avec un rappel la veille.",
  },
  {
    title: "Seulement ce qui vous concerne",
    text: "Masquez une matière ou tout ce qui contient « mentorat » en un clic. Les mises à jour de la fac continuent d'arriver.",
  },
];

const steps = [
  { title: "Collez le lien", text: "Le lien ICS de votre emploi du temps, fourni par l'ENT (ADE, Hyperplanning…)." },
  { title: "Ajustez", text: "Noms, couleurs, cours masqués : l'aperçu de la semaine se met à jour en direct." },
  { title: "Abonnez-vous", text: "Ajoutez les liens générés dans Apple Calendar, sur iPhone comme sur Mac." },
];

function Before() {
  return (
    <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
      <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">Avant</p>
      <p className="font-semibold">HAI101I Portail Info GrC</p>
      <p className="text-slate-500">TD 5.202</p>
      <p className="mt-2 border-t border-slate-100 pt-2 font-mono text-[11px] leading-relaxed text-slate-400">
        INFO GR C - L1 Portail informatique - Gr C - Info OuiSi / Oui
        <br />
        Algorithmique 1
        <br />
        MARTIN&nbsp;&nbsp;&nbsp;CLAIRE
        <br />A valider
        <br />
        (Exported :08/11/2026 17:52)
      </p>
    </div>
  );
}

function After() {
  return (
    <div className="rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
      <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">Après</p>
      <div className="flex gap-3">
        <span className="w-1 shrink-0 rounded-full bg-orange-500" />
        <div>
          <p className="font-semibold">Algorithmique 1 · TD</p>
          <p className="text-slate-500">Lundi 9 novembre · 08:45 – 10:45</p>
          <p className="text-slate-700">Salle 5.202</p>
          <p className="mt-2 border-t border-slate-100 pt-2 text-slate-600">
            TD · Salle 5.202
            <br />
            Claire Martin
          </p>
        </div>
      </div>
    </div>
  );
}

const freePoints = [
  "Aucun moyen de paiement demandé, jamais",
  "Pas d'abonnement, pas de version payante, pas de publicité",
  "Pour tous les étudiants, quelle que soit leur université",
  "Un compte suffit : une adresse e-mail et un mot de passe",
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-5 pt-12 pb-20 md:grid-cols-[1.1fr_1fr] md:pt-20">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Votre emploi du temps de fac, lisible dans Apple Calendar.
            </h1>
            <p className="mt-5 text-lg text-pretty text-slate-600">
              SchedulePilot récupère l'emploi du temps publié par votre université, le nettoie selon vos réglages et
              vous le renvoie sous forme d'abonnement, toujours à jour. Gratuit et open source.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Créer un compte gratuit
              </Link>
              <Link
                to="/guide"
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Voir le guide
              </Link>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:p-6">
            <Before />
            <After />
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="text-xl font-semibold">Ce que ça change</h2>
            <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {features.map((f) => (
                <div key={f.title}>
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-xl font-semibold">Comment ça marche</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="text-sm font-medium text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-slate-600">
            Apple Calendar, Google Agenda ou Outlook :{" "}
            <Link to="/guide" className="font-medium text-slate-900 underline underline-offset-4">
              le guide montre chaque étape
            </Link>
            .
          </p>
        </section>

        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-16 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-xl font-semibold">Gratuit, pour toujours</h2>
              <p className="mt-3 text-slate-600">
                SchedulePilot est un projet personnel et open source. Il est entièrement gratuit et le restera, pour
                tout le monde.
              </p>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-700">
              {freePoints.map((p) => (
                <li key={p} className="flex gap-3">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
