import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";
import { PublicLayout } from "../components/PublicLayout";
import { cx } from "../components/ui";
import {
  GoogleColor,
  GoogleFromUrl,
  GooglePlus,
  GoogleUrlForm,
  MacFileMenu,
  MacSubscriptionSettings,
  MacUrlDialog,
  OutlookAddCalendar,
  OutlookSubscribe,
  PhoneSettingsList,
  PhoneSubscribeAlert,
  PhoneSubscribeLink,
} from "./guide/mockups";

interface Step {
  title: string;
  body: ReactNode;
  visual?: ReactNode;
}

const COPY_LINK: Step = {
  title: "Copiez votre lien dans SchedulePilot",
  body: (
    <>
      <p>
        Ouvrez votre calendrier dans SchedulePilot, puis l'onglet <b>Couleurs & abonnement</b>. Choisissez comment
        colorer vos cours : SchedulePilot crée un calendrier par matière (ou par type de séance), plus un pour les
        examens.
      </p>
      <p>
        Dans la liste <b>Vos calendriers</b>, cliquez sur <b>Copier</b> à côté du premier calendrier.
      </p>
    </>
  ),
  visual: (
    <img
      src="/guide/schedulepilot-liens.png"
      alt="L'onglet Couleurs & abonnement de SchedulePilot, avec la liste des calendriers et leurs boutons Copier"
      className="w-full rounded-xl shadow-sm ring-1 ring-slate-200"
      loading="lazy"
    />
  ),
};

const GUIDES = {
  apple: {
    name: "Apple Calendar",
    short: "Mac, iPhone, iPad",
    intro: (
      <p>
        Apple Calendar affiche une couleur par calendrier : vous allez vous abonner à chacun des calendriers créés par
        SchedulePilot. Si vous le faites sur Mac avec l'emplacement <b>iCloud</b>, ils apparaîtront aussi
        automatiquement sur votre iPhone et votre iPad.
      </p>
    ),
    sections: [
      {
        title: "Sur Mac",
        steps: [
          COPY_LINK,
          {
            title: "Créez un abonnement",
            body: (
              <p>
                Ouvrez l'application <b>Calendrier</b>. Dans la barre de menus, choisissez <b>Fichier</b> puis{" "}
                <b>Nouvel abonnement à un calendrier…</b> (raccourci ⌥ ⌘ S).
              </p>
            ),
            visual: <MacFileMenu />,
          },
          {
            title: "Collez le lien",
            body: (
              <p>
                Collez le lien copié dans le champ <b>URL du calendrier</b> (⌘ V), puis cliquez sur <b>S'abonner</b>.
              </p>
            ),
            visual: <MacUrlDialog />,
          },
          {
            title: "Réglez l'abonnement",
            body: (
              <ul>
                <li>
                  <b>Nom</b> et <b>couleur</b> : déjà remplis, modifiables.
                </li>
                <li>
                  <b>Emplacement</b> : choisissez <b>iCloud</b> pour retrouver le calendrier sur tous vos appareils
                  Apple.
                </li>
                <li>
                  <b>Supprimer</b> : décochez <b>Alertes</b> pour recevoir les rappels d'examen.
                </li>
                <li>
                  <b>Actualisation automatique</b> : <b>Toutes les heures</b>.
                </li>
              </ul>
            ),
            visual: <MacSubscriptionSettings />,
          },
          {
            title: "Recommencez pour chaque calendrier",
            body: (
              <p>
                Répétez les étapes 1 à 4 pour chaque calendrier de la liste. Astuce : le bouton <b>S'abonner</b> de
                SchedulePilot ouvre directement l'étape 3 dans Calendrier.
              </p>
            ),
          },
        ],
      },
      {
        title: "Sur iPhone ou iPad",
        steps: [
          {
            title: "Ouvrez SchedulePilot dans Safari",
            body: (
              <p>
                Connectez-vous sur <b>schedulepilot.dev</b> depuis Safari, ouvrez votre calendrier puis l'onglet{" "}
                <b>Couleurs & abonnement</b>. Touchez <b>S'abonner</b> à côté d'un calendrier.
              </p>
            ),
            visual: <PhoneSubscribeLink />,
          },
          {
            title: "Confirmez",
            body: (
              <p>
                iOS demande de confirmer : touchez <b>S'abonner</b>, puis validez. Recommencez pour chaque calendrier.
              </p>
            ),
            visual: <PhoneSubscribeAlert />,
          },
          {
            title: "Ou ajoutez-le depuis les Réglages",
            body: (
              <>
                <p>
                  Si le bouton ne fonctionne pas, copiez le lien puis ouvrez <b>Réglages</b> → <b>Apps</b> →{" "}
                  <b>Calendrier</b> → <b>Comptes de calendrier</b> → <b>Ajouter un compte</b> → <b>Autre</b> →{" "}
                  <b>Ajouter un calendrier avec abonnement</b>. Collez le lien dans <b>Serveur</b>, touchez{" "}
                  <b>Suivant</b> puis <b>Enregistrer</b>.
                </p>
                <p className="text-slate-500">
                  Avant iOS 18 : Réglages → Calendrier → Comptes. Pour changer la couleur : app Calendrier → Calendriers
                  → ⓘ à côté du calendrier.
                </p>
              </>
            ),
            visual: (
              <PhoneSettingsList
                title="Ajouter un compte"
                items={["iCloud", "Microsoft Exchange", "Google", "Yahoo!", "Autre"]}
                target="Autre"
              />
            ),
          },
        ],
      },
    ],
  },
  google: {
    name: "Google Agenda",
    short: "Web, Android, iPhone",
    intro: (
      <p>
        L'ajout se fait depuis un ordinateur, sur le site de Google Agenda : l'application mobile ne permet pas de
        s'abonner à un lien. Une fois ajouté, le calendrier apparaît aussi sur votre téléphone.
      </p>
    ),
    sections: [
      {
        title: "",
        steps: [
          COPY_LINK,
          {
            title: "Ouvrez Google Agenda",
            body: (
              <p>
                Rendez-vous sur <b>calendar.google.com</b>. Dans la colonne de gauche, cliquez sur le <b>+</b> à côté de{" "}
                <b>Autres agendas</b>.
              </p>
            ),
            visual: <GooglePlus />,
          },
          {
            title: "Choisissez « À partir de l'URL »",
            body: <p>Dans le menu qui s'ouvre, cliquez sur À partir de l'URL.</p>,
            visual: <GoogleFromUrl />,
          },
          {
            title: "Collez le lien",
            body: (
              <p>
                Collez le lien dans <b>URL de l'agenda</b>, laissez <b>Rendre l'agenda public</b> décoché, puis cliquez
                sur <b>Ajouter un agenda</b>.
              </p>
            ),
            visual: <GoogleUrlForm />,
          },
          {
            title: "Choisissez la couleur",
            body: (
              <p>
                Le calendrier apparaît sous <b>Autres agendas</b>. Survolez-le, cliquez sur <b>⋮</b> et choisissez une
                couleur. Pour le renommer, ouvrez <b>Paramètres</b>. Recommencez pour chaque calendrier.
              </p>
            ),
            visual: <GoogleColor />,
          },
          {
            title: "Sur votre téléphone",
            body: (
              <p>
                Le calendrier s'affiche dans l'application Google Agenda. S'il n'apparaît pas : menu ☰ →{" "}
                <b>Paramètres</b> → touchez le calendrier → activez <b>Synchronisation</b>.
              </p>
            ),
          },
        ],
      },
    ],
    note: "Google actualise les agendas ajoutés par URL toutes les quelques heures, parfois jusqu'à 24 h. Ce délai est imposé par Google et ne peut pas être réglé.",
  },
  outlook: {
    name: "Outlook",
    short: "Web, Windows, Mac, mobile",
    intro: (
      <p>
        Ces étapes valent pour Outlook sur le web (outlook.com, Microsoft 365) et le nouvel Outlook pour Windows et Mac.
        Le calendrier est ensuite synchronisé avec l'application mobile Outlook.
      </p>
    ),
    sections: [
      {
        title: "",
        steps: [
          COPY_LINK,
          {
            title: "Ouvrez le calendrier Outlook",
            body: (
              <p>
                Ouvrez <b>outlook.live.com</b> (ou outlook.office.com avec un compte de l'université), allez dans{" "}
                <b>Calendrier</b> puis cliquez sur <b>Ajouter un calendrier</b> dans la colonne de gauche.
              </p>
            ),
            visual: <OutlookAddCalendar />,
          },
          {
            title: "Choisissez « S'abonner à partir du web »",
            body: <p>Dans la fenêtre qui s'ouvre, sélectionnez S'abonner à partir du web.</p>,
            visual: <OutlookSubscribe />,
          },
          {
            title: "Collez le lien et importez",
            body: (
              <p>
                Collez le lien, donnez un nom au calendrier, choisissez une couleur puis cliquez sur <b>Importer</b>.
                Recommencez pour chaque calendrier.
              </p>
            ),
            visual: <OutlookSubscribe form />,
          },
          {
            title: "Outlook classique pour Windows",
            body: (
              <p>
                Dans l'ancienne version d'Outlook : <b>Accueil</b> → <b>Ajouter un calendrier</b> →{" "}
                <b>À partir d'Internet</b>, collez le lien puis confirmez avec <b>Oui</b>.
              </p>
            ),
          },
        ],
      },
    ],
    note: "Outlook actualise les calendriers abonnés toutes les quelques heures. Ce délai est imposé par Microsoft.",
  },
} as const;

type GuideId = keyof typeof GUIDES;

function StepView({ step, n }: { step: Step; n: number }) {
  return (
    <li className="grid grid-cols-1 gap-6 border-t border-slate-100 py-10 first:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-10">
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-600 [&_b]:font-semibold [&_b]:text-slate-900 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        <p className="flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {n}
          </span>
          <span className="text-lg font-semibold text-slate-900">{step.title}</span>
        </p>
        {step.body}
      </div>
      {step.visual && <div className="min-w-0">{step.visual}</div>}
    </li>
  );
}

export function GuidePage() {
  const { app } = useParams();
  if (!app) return <Navigate to="/guide/apple" replace />;
  if (!(app in GUIDES)) return <Navigate to="/guide/apple" replace />;
  const guide = GUIDES[app as GuideId];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-5 pt-10 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight">Ajouter vos cours à votre calendrier</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Une fois votre emploi du temps configuré dans SchedulePilot, il reste à l'ajouter à votre application de
          calendrier. Choisissez la vôtre :
        </p>

        <nav className="mt-8 grid gap-3 sm:grid-cols-3">
          {(Object.keys(GUIDES) as GuideId[]).map((id) => (
            <Link
              key={id}
              to={`/guide/${id}`}
              className={cx(
                "rounded-xl p-4 ring-1 transition",
                id === app ? "bg-slate-900 text-white ring-slate-900" : "bg-white ring-slate-200 hover:ring-slate-300",
              )}
            >
              <span className="block font-semibold">{GUIDES[id].name}</span>
              <span className={cx("text-sm", id === app ? "text-slate-300" : "text-slate-500")}>
                {GUIDES[id].short}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-10 max-w-3xl text-[15px] leading-relaxed text-slate-600 [&_b]:font-semibold [&_b]:text-slate-900">
          {guide.intro}
        </div>

        {guide.sections.map((section) => (
          <section key={section.title} className="mt-8">
            {section.title && <h2 className="text-xl font-semibold">{section.title}</h2>}
            <ol className="mt-2">
              {section.steps.map((step, i) => (
                <StepView key={step.title} step={step} n={i + 1} />
              ))}
            </ol>
          </section>
        ))}

        {"note" in guide && (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            {guide.note}
          </p>
        )}

        <div className="mt-12 rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200">
          <h2 className="font-semibold">Pas encore de compte ?</h2>
          <p className="mt-1 text-sm text-slate-600">
            SchedulePilot est gratuit, sans publicité et sans limite de durée. Il suffit de créer un compte.
          </p>
          <Link
            to="/register"
            className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
