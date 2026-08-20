import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getPrestigeProperties } from "../../lib/session";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function PrestigePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const properties = await getPrestigeProperties();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="🏰"
              title="Immobilier de prestige"
              mechanic="Personnalise le nom affiché publiquement d'un bien immobilier de luxe que tu possèdes — visible par tous les joueurs, mais purement cosmétique : aucun effet sur le loyer, la valeur ou quoi que ce soit d'économique."
              realWorld="C'est du pur statut social — comme baptiser sa propriété ou son yacht dans la vraie vie, ça n'améliore rien financièrement mais ça affiche ta réussite aux yeux des autres."
            />{" "}
            Immobilier de prestige
          </h1>
          <p className={styles.subtitle}>Le statut social des joueurs — purement symbolique, sans avantage économique</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      {properties.length === 0 ? (
        <p className={styles.jobMeta}>Aucun bien de prestige personnalisé pour l'instant. 🕊️</p>
      ) : (
        <div className={styles.jobList}>
          {properties.map((property) => (
            <div key={property.id} className={styles.jobCard}>
              <div>
                <div className={styles.jobTitle}>🏰 {property.customName}</div>
                <div className={styles.jobMeta}>
                  {property.ownerPseudo} — {property.municipality}, {property.region}
                </div>
                <div className={styles.jobStats}>
                  <span>État {property.condition.toFixed(0)}/100</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
