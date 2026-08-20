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
              mechanic="Chaque actif suit une marche aléatoire indépendante des joueurs (dérive + volatilité propres à l'actif) — le prix bouge tout seul à chaque cycle, ni piloté par l'offre/demande des joueurs (contrairement à la bourse de matières premières), ni par tes actions."
              realWorld="C'est un modèle simplifié de marché financier réel : prix imprévisible à court terme mais avec une tendance de fond (dérive) propre à chaque classe d'actif — plus volatil pour la cryptomonnaie, plus stable pour l'art, comme dans la vraie vie."
              tip="La plus-value à la revente est taxée comme celle de l'épargne, avec la même franchise à vie partagée entre tous tes placements — vends stratégiquement plutôt que tout d'un coup si tu veux ménager cette franchise."
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
