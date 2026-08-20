import { redirect } from "next/navigation";
import Link from "next/link";
import { PRESS_CATEGORY_ICONS, PRESS_CATEGORY_LABELS } from "@patrimoine-jeu/domain";
import { getCurrentPlayer, getPressArticles } from "../../lib/session";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function PressePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const articles = await getPressArticles();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="📰"
              title="Presse économique"
              mechanic="Fil d'actualité généré automatiquement à partir des événements réels de la partie — faillites, OPA, cartels démantelés, chocs sectoriels — visible par tous les joueurs, jamais un texte décoratif inventé."
              realWorld="L'équivalent d'un fil d'actualité économique : chaque article correspond à un événement qui s'est vraiment produit dans la partie, exactement comme une dépêche financière rapporte un fait réel."
            />{" "}
            Presse économique
          </h1>
          <p className={styles.subtitle}>Les scandales et réussites qui font l'actualité du jeu</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      {articles.length === 0 ? (
        <p className={styles.jobMeta}>Aucune actualité pour l'instant — le calme avant la tempête. 🕊️</p>
      ) : (
        <div className={styles.jobList}>
          {articles.map((article) => (
            <div key={article.id} className={styles.jobCard}>
              <div>
                <div className={styles.jobTitle}>
                  {PRESS_CATEGORY_ICONS[article.category]} {PRESS_CATEGORY_LABELS[article.category]}
                </div>
                <div className={styles.jobMeta}>{article.headline}</div>
                <div className={styles.jobStats}>
                  <span>🗓️ Cycle {article.cycle}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
