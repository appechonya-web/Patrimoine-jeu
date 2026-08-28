import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getGroupOverview } from "../../lib/session";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function GroupePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const overview = await getGroupOverview();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="🏛️"
              title="Groupe"
              mechanic="Toutes les entreprises ACTIVES que tu contrôles en dernier ressort — directement, ou via une chaîne de holding (cf. rachats 'en tant que') — avec des KPIs consolidés sur l'ensemble du groupe : trésorerie cumulée, revenu du dernier cycle, profit net cumulé. La filiale la moins performante (en perte au dernier cycle) est signalée si elle existe."
              realWorld="Le tableau de bord d'un dirigeant de groupe multi-filiales : au-delà de chaque fiche individuelle, ce qui compte c'est la performance consolidée — et savoir vite laquelle de tes entreprises tire l'ensemble vers le bas."
            />{" "}
            Groupe
          </h1>
          <p className={styles.subtitle}>Vue consolidée de toutes les entreprises que tu contrôles</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      {overview.companies.length === 0 ? (
        <p className={styles.jobMeta}>Tu ne contrôles encore aucune entreprise. 🕊️</p>
      ) : (
        <>
          <section className={styles.section}>
            <div className={styles.jobStats}>
              <div className={`${styles.card} ${styles.cardGold}`}>
                <span className={styles.label}>🏢 Entreprises</span>
                <span className={styles.value}>{overview.companies.length}</span>
              </div>
              <div className={`${styles.card} ${styles.cardGold}`}>
                <span className={styles.label}>🏦 Trésorerie cumulée</span>
                <span className={styles.value}>{currencyFormatter.format(overview.totalCashReserve)}</span>
              </div>
              <div className={`${styles.card} ${styles.cardGold}`}>
                <span className={styles.label}>💰 Revenu (dernier cycle)</span>
                <span className={styles.value}>{currencyFormatter.format(overview.totalLatestRevenue)}</span>
              </div>
              <div className={`${styles.card} ${styles.cardGold}`}>
                <span className={styles.label}>{overview.totalLatestNetProfit >= 0 ? "📈" : "📉"} Profit net (dernier cycle)</span>
                <span className={styles.value}>{currencyFormatter.format(overview.totalLatestNetProfit)}</span>
              </div>
              <div className={`${styles.card} ${styles.cardGold}`}>
                <span className={styles.label}>📊 Profit cumulé total</span>
                <span className={styles.value}>{currencyFormatter.format(overview.totalCumulativeNetProfit)}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Détail par entreprise</h2>
            <div className={styles.jobList}>
              {overview.companies.map((company) => (
                <div key={company.id} className={styles.jobCard}>
                  <div>
                    <div className={styles.jobTitle}>
                      <Link href={`/companies/${company.id}`}>{company.name}</Link>
                      {company.isSubsidiary && " 🏢"}
                      {company.id === overview.worstPerformerId && " ⚠️"}
                    </div>
                    <div className={styles.jobMeta}>
                      {company.sector} — {company.municipality}
                      {company.isSubsidiary && " — filiale"}
                    </div>
                    <div className={styles.jobStats}>
                      <span>🏦 {currencyFormatter.format(company.cashReserve)} de trésorerie</span>
                      <span>💰 {currencyFormatter.format(company.latestRevenue)} de revenu (dernier cycle)</span>
                      <span>
                        {company.latestNetProfit >= 0 ? "📈" : "📉"} {currencyFormatter.format(company.latestNetProfit)}{" "}
                        de profit net (dernier cycle)
                      </span>
                      <span>💎 Valorisation ×{company.valorizationMultiplier.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
