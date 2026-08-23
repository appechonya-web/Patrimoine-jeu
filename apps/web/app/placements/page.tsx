import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getFinancialAssets } from "../../lib/session";
import { PlacementsList } from "./placements-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function PlacementsPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const assets = await getFinancialAssets();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="📈"
              title="Placements"
              mechanic="Chaque actif suit une marche aléatoire indépendante des joueurs (dérive + volatilité propres à l'actif) — le prix bouge tout seul à chaque cycle, jamais piloté par l'offre/demande des joueurs (contrairement à la bourse de matières premières) ni par tes propres actions. Les actions rattachées à un secteur réel (badge 🏭) réagissent en plus aux crises/booms sectoriels nationaux qui touchent aussi les entreprises de ce secteur — les deux actions généralistes, la crypto et l'art restent hors de portée de ces aléas. Certaines actions (badge 💸) versent aussi un dividende chaque cycle, au choix en liquide ou réinvesti automatiquement en davantage de parts — jamais la crypto ni l'art, fidèle à la réalité."
              realWorld="C'est un modèle simplifié de marché financier réel : prix imprévisible à court terme mais avec une tendance de fond (dérive) propre à chaque classe d'actif — plus volatil pour la cryptomonnaie, plus stable pour l'art. Le lien entre crise sectorielle et cours de bourse reflète aussi la réalité : une crise agricole nationale pèse aussi bien sur les exploitations que sur les actions du secteur qui en dépendent. Les dividendes récompensent aussi la réalité économique : les grandes valeurs stables (utilities, grandes entreprises établies) en versent, les PME/coopératives en croissance réinvestissent tout au lieu d'en distribuer."
              tip="Une action liée à un secteur en crise peut perdre gros, mais elle peut aussi profiter d'un boom sectoriel — c'est un pari plus risqué que les deux actions généralistes, qui ne bougent qu'au hasard. Réinvestir le dividende (plutôt que le toucher en liquide) compose au fil des cycles : tu détiens un peu plus de parts à chaque versement, qui rapportent elles-mêmes un peu plus au suivant — un vrai effet boule de neige pour qui reste investi longtemps. La plus-value ET les dividendes sont taxés comme les intérêts d'épargne, avec la même franchise à vie partagée entre tous tes placements — vends/encaisse stratégiquement plutôt que tout d'un coup si tu veux ménager cette franchise."
            />{" "}
            Placements
          </h1>
          <p className={styles.subtitle}>
            Actions, cryptomonnaies, art — prix fluctuant à chaque cycle, indépendant du marché de matières
            premières. La plus-value réalisée à la revente est taxée comme celle de l'épargne, avec la même
            franchise à vie.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <PlacementsList assets={assets} />
    </main>
  );
}
