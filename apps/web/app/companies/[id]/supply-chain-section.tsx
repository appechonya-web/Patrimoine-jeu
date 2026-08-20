import type { SupplyContractView } from "../../../lib/session";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

export function SupplyChainSection({ contracts }: { contracts: SupplyContractView[] }) {
  if (contracts.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🔗"
          title="Chaîne de valeur — contrats B2B"
          mechanic="Les entreprises de transformation (palier 1) s'approvisionnent automatiquement en matières premières auprès des entreprises de palier 0 du même secteur, à chaque cycle — leur production réelle est plafonnée par ce qu'elles réussissent à sécuriser."
          realWorld="C'est une chaîne d'approvisionnement (supply chain) simplifiée : une usine de transformation ne peut produire que si elle sécurise assez de matière première en amont — une pénurie chez les fournisseurs limite directement la production en aval, même si la demande finale est là."
        />
        <span>Chaîne de valeur — contrats B2B</span>
      </h2>
      <p className={styles.subtitle}>
        Appariement automatique à chaque cycle avec les entreprises du palier voisin — cf. document de conception,
        section 8.
      </p>
      <div className={styles.jobList}>
        {contracts.map((contract) => (
          <div key={contract.id} className={styles.jobCard}>
            <div>
              <div className={styles.jobTitle}>
                {contract.role === "buyer" ? "⬅️ Achat" : "➡️ Vente"} — {contract.counterpartyName}
              </div>
              <div className={styles.jobMeta}>
                {contract.sectorName} — cycle n°{contract.cycleNumber} — {contract.quantity.toFixed(1)} unités à{" "}
                {currencyFormatter.format(contract.price)}
              </div>
            </div>
            <div className={styles.jobActions}>
              <div className={styles.jobSalary}>
                {contract.role === "buyer" ? "−" : "+"}
                {currencyFormatter.format(contract.total)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
