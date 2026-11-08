import { Link } from "react-router";

const examples = [
  <>
    « HAI301I Algorithmique avancée TD » devient <strong>« Algorithmique · TD »</strong>.
  </>,
  <>Les séances de mentorat, ou les cours d'un autre groupe, n'apparaissent plus.</>,
  <>La description n'affiche que l'essentiel : le type de séance et la salle.</>,
  <>Les maths en bleu, l'info en vert : chaque groupe de cours a sa couleur.</>,
];

const steps = [
  "Créez un compte et collez le lien ICS de votre emploi du temps (celui fourni par l'ENT).",
  "Renommez, masquez ou regroupez vos cours.",
  "Abonnez-vous au nouveau lien dans Apple Calendar. Les changements de la fac continuent d'arriver automatiquement.",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
        <header className="flex items-center justify-between text-sm">
          <span className="font-semibold">SchedulePilot</span>
          <nav className="flex gap-5 text-slate-600">
            <Link to="/login" className="hover:text-slate-900">
              Connexion
            </Link>
            <Link to="/register" className="hover:text-slate-900">
              Créer un compte
            </Link>
          </nav>
        </header>

        <main className="mt-16 space-y-12 leading-relaxed text-slate-700 sm:mt-24">
          <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Votre emploi du temps de fac, à votre façon.</h1>
            <p>
              SchedulePilot est un outil gratuit et open source pour mieux gérer son emploi du temps universitaire dans
              Apple Calendar.
            </p>
            <p>
              Le calendrier de la fac s'importe facilement, mais on ne peut ensuite ni renommer un cours, ni en masquer
              un, ni changer les couleurs. SchedulePilot récupère votre emploi du temps, applique vos réglages et vous
              donne un nouveau lien d'abonnement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Par exemple</h2>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-300">
              {examples.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Comment ça marche</h2>
            <ol className="list-decimal space-y-2 pl-5 marker:text-slate-400">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="pt-2">
              <Link to="/register" className="font-medium text-slate-900 underline underline-offset-4">
                Créer un compte
              </Link>
            </p>
          </section>
        </main>

        <footer className="mt-20 border-t border-slate-100 pt-6 text-sm text-slate-500">
          Fonctionne aussi avec Google Agenda et Outlook. Code source sur{" "}
          <a
            href="https://github.com/FelixMining/SchedulePilot"
            className="underline underline-offset-4 hover:text-slate-700"
          >
            GitHub
          </a>
          .
        </footer>
      </div>
    </div>
  );
}
