import { NOTIFICATION_ICONS, type NotificationType } from "@patrimoine-jeu/domain";
import type { DigestPeriod } from "../../lib/session";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export function DigestSection({ periods }: { periods: DigestPeriod[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="📰"
          title="Digest périodique"
          mechanic="Le fil d'actualité non-urgent (relevés de cycle, mouvements de la concurrence) est regroupé par blocs de 7 cycles plutôt qu'affiché en continu — l'urgent reste dans l'alerte mail séparée."
          realWorld="C'est le même principe qu'un résumé hebdomadaire d'activité (relevé bancaire, digest de newsletter) : les informations non critiques sont groupées pour éviter la surcharge, contrairement aux alertes vraiment urgentes."
        />
        <span>Digest périodique</span>
      </h2>
      <p className={styles.jobMeta}>
        Le fil informatif (relevé de cycle, mouvements de la concurrence...) regroupé par période plutôt qu'en flux
        continu.
      </p>
      {periods.length === 0 ? (
        <p className={styles.jobMeta}>Rien à résumer pour l'instant.</p>
      ) : (
        periods.map((period) => (
          <div key={period.periodStartCycle} className={styles.jobList}>
            <h3 className={styles.jobMeta}>
              Cycles {period.periodStartCycle} à {period.periodEndCycle}
            </h3>
            {period.items.map((item) => (
              <div key={item.id} className={styles.jobCard}>
                <div>
                  <div className={styles.jobTitle}>
                    {NOTIFICATION_ICONS[item.type as NotificationType] ?? "🔔"} {item.message}
                  </div>
                  <div className={styles.jobMeta}>Cycle n°{item.cycle}</div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
