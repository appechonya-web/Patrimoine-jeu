"use client";

import { useRouter } from "next/navigation";
import type { PropertyListingView, PropertyView } from "../../lib/session";
import { MyPropertiesList, PropertyMarketList } from "./immobilier-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export function PropertyMarketPageClient({
  listings,
  myProperties,
}: {
  listings: PropertyListingView[];
  myProperties: PropertyView[];
}) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏠"
            title="Mes biens"
            mechanic="Chaque bien perd de l'état à chaque cycle — deux fois plus vite s'il est loué (usure par le locataire). Une rénovation coûte 15% de la valeur du bien et restaure son état, ce qui conditionne le loyer que tu peux en tirer."
            realWorld="C'est l'entretien immobilier réel : un bien loué s'use plus vite qu'un bien vacant, et négliger l'entretien fait baisser sa valeur locative — d'où l'arbitrage entre rénover régulièrement ou laisser se dégrader."
          />
          <span>Mes biens</span>
        </h2>
        <MyPropertiesList properties={myProperties} onDone={handleDone} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏘️"
            title="Marché immobilier"
            mechanic="Achète directement au prix affiché, ou emprunte via une hypothèque (jusqu'à 80% de la valeur du bien, le reste en apport). Chaque achat déclenche des droits d'enregistrement fixés par la commune, prélevés immédiatement."
            realWorld="C'est le vrai parcours d'achat immobilier belge : apport personnel + prêt hypothécaire + droits d'enregistrement communaux, souvent 10-12,5% du prix — une charge non négligeable à prévoir en plus du prix affiché."
          />
          <span>Marché immobilier</span>
        </h2>
        <PropertyMarketList listings={listings} />
      </section>
    </>
  );
}
