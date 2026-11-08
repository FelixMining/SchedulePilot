import { Link } from "react-router";
import { AUTHOR_URL, CONTACT_EMAIL, Prose, REPO_URL } from "../components/PublicLayout";

const UPDATED = "8 novembre 2026";
const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function LegalNoticePage() {
  return (
    <Prose title="Mentions légales" updated={UPDATED}>
      <h2>Éditeur</h2>
      <p>
        SchedulePilot est un service gratuit édité à titre non professionnel par <a href={AUTHOR_URL}>Félix Lenci</a>,
        personne physique, également directeur de la publication.
      </p>
      <p>
        Contact : <Mail />
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site et son application sont hébergés par <strong>Cloudflare, Inc.</strong>, 101 Townsend St, San Francisco,
        CA 94107, États-Unis — +1 (650) 319-8930 — <a href="https://www.cloudflare.com">cloudflare.com</a>.
      </p>
      <p>
        La base de données est hébergée par <strong>Neon</strong> (<a href="https://neon.tech">neon.tech</a>) sur des
        serveurs situés à Francfort, en Allemagne.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le code source de SchedulePilot est publié sous licence MIT et disponible sur <a href={REPO_URL}>GitHub</a>.
        SchedulePilot n'est affilié à aucune université ni à aucun éditeur de logiciel d'emploi du temps. Les noms et
        marques cités (Apple, Google, Microsoft, ADE…) appartiennent à leurs propriétaires respectifs.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>
    </Prose>
  );
}

export function PrivacyPage() {
  return (
    <Prose title="Politique de confidentialité" updated={UPDATED}>
      <p>
        SchedulePilot collecte le strict minimum pour fonctionner. Pas de publicité, pas de mesure d'audience, pas de
        revente de données, pas de cookie de suivi.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        Félix Lenci, éditeur du service. Pour toute question ou pour exercer vos droits : <Mail />.
      </p>

      <h2>Données traitées</h2>
      <table>
        <thead>
          <tr>
            <th>Données</th>
            <th>Pourquoi</th>
            <th>Durée de conservation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Adresse e-mail et mot de passe (stocké sous forme d'empreinte, jamais en clair)</td>
            <td>Créer votre compte et vous connecter</td>
            <td>Jusqu'à la suppression du compte</td>
          </tr>
          <tr>
            <td>Session de connexion (identifiant aléatoire, date d'expiration)</td>
            <td>Vous garder connecté</td>
            <td>30 jours, prolongés tant que vous utilisez le service</td>
          </tr>
          <tr>
            <td>Lien de votre emploi du temps, nom du calendrier et réglages (noms de cours, couleurs…)</td>
            <td>Fournir le service</td>
            <td>Jusqu'à la suppression du calendrier ou du compte</td>
          </tr>
          <tr>
            <td>
              Copie de votre emploi du temps (cours, salles, horaires, noms des enseignants tels que publiés par
              l'université)
            </td>
            <td>Continuer à servir votre calendrier si le serveur de l'université est indisponible</td>
            <td>Remplacée à chaque actualisation, supprimée avec le calendrier</td>
          </tr>
          <tr>
            <td>Dates de dernière connexion et de dernière actualisation de vos calendriers</td>
            <td>Supprimer les comptes abandonnés</td>
            <td>Jusqu'à la suppression du compte</td>
          </tr>
          <tr>
            <td>Journaux techniques (adresse IP, page demandée, date)</td>
            <td>Sécurité et diagnostic des erreurs</td>
            <td>Quelques jours, chez l'hébergeur</td>
          </tr>
        </tbody>
      </table>
      <p>
        Un compte sur lequel personne ne s'est connecté et dont aucun calendrier n'a été consulté depuis{" "}
        <strong>deux ans</strong> est supprimé automatiquement, avec toutes ses données.
      </p>

      <h2>Bases légales</h2>
      <ul>
        <li>
          L'exécution du service que vous demandez en créant un compte (article 6.1.b du RGPD) pour le compte, les
          calendriers et leurs réglages.
        </li>
        <li>
          L'intérêt légitime (article 6.1.f) pour la sécurité du service : journaux techniques et limitation des
          tentatives de connexion.
        </li>
      </ul>
      <p>
        Les noms des enseignants proviennent de l'emploi du temps publié par votre université. Ils ne sont affichés qu'à
        vous et ne sont utilisés à aucune autre fin.
      </p>

      <h2>Destinataires et sous-traitants</h2>
      <p>Vos données ne sont ni vendues ni partagées. Seuls les prestataires techniques suivants y ont accès :</p>
      <ul>
        <li>
          <strong>Cloudflare, Inc.</strong> (États-Unis) : hébergement de l'application et du site.
        </li>
        <li>
          <strong>Neon</strong> (États-Unis) : base de données, hébergée sur des serveurs situés à Francfort
          (Allemagne).
        </li>
      </ul>
      <p>
        Ces prestataires peuvent être soumis au droit américain. Les transferts de données hors de l'Union européenne
        sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) et par les clauses
        contractuelles types de la Commission européenne prévues dans leurs conditions de traitement des données.
      </p>

      <h2>Liens d'abonnement</h2>
      <p>
        Les liens d'abonnement que génère SchedulePilot contiennent une clé secrète : toute personne qui possède un de
        ces liens peut consulter l'emploi du temps correspondant. Ne les partagez qu'avec des personnes de confiance.
        Vous pouvez les régénérer à tout moment, ce qui désactive les anciens.
      </p>

      <h2>Cookies</h2>
      <p>
        SchedulePilot utilise un seul cookie, <code>sp_session</code>, strictement nécessaire pour vous garder connecté.
        Conformément aux recommandations de la CNIL, il ne requiert pas de consentement. Aucun cookie de mesure
        d'audience, de publicité ou de réseau social n'est utilisé.
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS). Les mots de passe sont stockés sous forme d'empreinte (PBKDF2-SHA256 avec
        sel). Les tentatives de connexion sont limitées pour empêcher les attaques par force brute.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité
        de vos données. Depuis la page <Link to="/app/account">Compte</Link>, vous pouvez à tout moment :
      </p>
      <ul>
        <li>télécharger toutes vos données (fichier JSON) ;</li>
        <li>supprimer votre compte, ce qui efface immédiatement toutes vos données.</li>
      </ul>
      <p>
        Pour toute autre demande, écrivez à <Mail />. Une réponse vous sera apportée dans un délai d'un mois. Si vous
        estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (
        <a href="https://www.cnil.fr/fr/plaintes">cnil.fr</a>).
      </p>

      <h2>Âge minimum</h2>
      <p>Le service est destiné aux étudiants. Il faut avoir au moins 15 ans pour créer un compte.</p>

      <h2>Modifications</h2>
      <p>
        En cas de changement important de cette politique, les utilisateurs en seront informés lors de leur prochaine
        connexion.
      </p>
    </Prose>
  );
}

export function TermsPage() {
  return (
    <Prose title="Conditions d'utilisation" updated={UPDATED}>
      <h2>1. Le service</h2>
      <p>
        SchedulePilot récupère l'emploi du temps que vous lui indiquez, le transforme selon vos réglages et le rend
        disponible sous forme de liens d'abonnement pour vos applications de calendrier.
      </p>

      <h2>2. Gratuité</h2>
      <p>
        Le service est entièrement gratuit, pour tout le monde et sans limite de durée. Aucun moyen de paiement n'est
        demandé, il n'y a ni abonnement ni publicité.
      </p>

      <h2>3. Compte</h2>
      <p>
        Il faut créer un compte avec une adresse e-mail valide et avoir au moins 15 ans. Vous êtes responsable de la
        confidentialité de votre mot de passe et de vos liens d'abonnement. Vous pouvez supprimer votre compte à tout
        moment depuis la page Compte.
      </p>

      <h2>4. Utilisation acceptable</h2>
      <ul>
        <li>N'ajoutez que des emplois du temps que vous êtes autorisé à consulter.</li>
        <li>N'utilisez pas le service pour surcharger un serveur tiers ou pour un usage automatisé abusif.</li>
        <li>N'essayez pas d'accéder aux données d'autres utilisateurs.</li>
      </ul>
      <p>Un compte qui ne respecte pas ces règles peut être suspendu ou supprimé.</p>

      <h2>5. Exactitude des informations</h2>
      <p>
        SchedulePilot reprend les informations publiées par votre université, sans les vérifier. La détection
        automatique (type de séance, examens, noms des cours) peut se tromper et les calendriers ne sont actualisés que
        périodiquement. <strong>L'emploi du temps officiel de votre université fait foi</strong>, en particulier pour
        les examens.
      </p>

      <h2>6. Disponibilité</h2>
      <p>
        Le service est fourni « en l'état », sans garantie de disponibilité. Il peut être interrompu, modifié ou arrêté.
        En cas d'arrêt définitif, les utilisateurs seront prévenus à l'avance dans la mesure du possible.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        L'éditeur ne pourra être tenu responsable d'un dommage résultant d'une information inexacte, d'une absence
        d'actualisation ou d'une indisponibilité du service, notamment d'un cours ou d'un examen manqué.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Voir la <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>9. Modification des conditions</h2>
      <p>
        Ces conditions peuvent évoluer. La version en vigueur est toujours accessible sur cette page. Continuer à
        utiliser le service après une modification vaut acceptation.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit français. Pour toute question : <Mail />.
      </p>
    </Prose>
  );
}
