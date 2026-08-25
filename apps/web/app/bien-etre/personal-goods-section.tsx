"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PERSONAL_GOOD_CATEGORIES,
  PERSONAL_GOOD_CATEGORY_LABELS,
  type PersonalGoodCategory,
} from "@patrimoine-jeu/domain";
import type { PersonalGoodCatalogEntry, PersonalGoodView, PersonalGoodsOverview } from "../../lib/session";
import { GameError, buyPersonalGood, sellPersonalGood } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import { StatHint } from "../stat-hint";
import styles from "../page.module.css";

function CatalogCard({ item, onDone }: { item: PersonalGoodCatalogEntry; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setError(null);
    setPending(true);
    try {
      await buyPersonalGood(item.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{item.label}</div>
        <div className={styles.jobMeta}>{item.description}</div>
        <div className={styles.jobStats}>
          <span>💗 Bien-être +{item.wellbeingBonusPerCycle.toFixed(3)}/cycle</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(item.price)}</div>
        <button className={styles.apply} type="button" disabled={pending} onClick={handleBuy}>
          {pending ? "…" : "🛒 Acheter"}
        </button>
      </div>
    </div>
  );
}

function OwnedGoodCard({ good, onDone }: { good: PersonalGoodView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSell() {
    setError(null);
    setPending(true);
    try {
      await sellPersonalGood(good.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{good.label}</div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="Ce que tu as payé à l'achat — la valeur de revente affichée à droite est plus basse, déjà dépréciée dans le temps (jusqu'à un plancher de 10% du prix d'achat).">
              💰 Acheté {currencyFormatter.format(good.purchasePrice)}
            </StatHint>
          </span>
          <span>💗 Bien-être +{good.wellbeingBonusPerCycle.toFixed(3)}/cycle</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(good.currentValue)}</div>
        <button className={styles.logout} type="button" disabled={pending} onClick={handleSell}>
          {pending ? "…" : "🏷️ Revendre"}
        </button>
      </div>
    </div>
  );
}

export function PersonalGoodsSection({ overview }: { overview: PersonalGoodsOverview }) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🛍️"
            title="Biens de consommation"
            mechanic="Un bonus de bien-être passif tant que tu le possèdes, cumulable entre plusieurs biens — mais sa valeur de revente se déprécie avec le temps (exponentiellement), jusqu'à un plancher résiduel de 10% du prix d'achat."
            realWorld="C'est la vraie différence entre un bien de consommation et un investissement : une voiture ou de l'électronique achète du confort de vie immédiat, mais perd de la valeur chaque année — contrairement à l'immobilier ou aux actions qui peuvent s'apprécier."
            tip="Un bien acheté depuis longtemps ne vaut presque plus rien à la revente — s'il ne t'apporte plus grand-chose en bien-être, le garder coûte plus cher (en valeur immobilisée) que ce qu'il rapporte."
          />
          <span>Biens de consommation</span>
        </h2>
        <p className={styles.subtitle}>
          Voiture, mobilier, électronique — de vrais biens possédés qui donnent un petit bonus de bien-être en
          continu tant que tu les gardes, mais se déprécient avec le temps. Revendables à tout moment pour leur
          valeur résiduelle.
        </p>
        {overview.owned.length === 0 ? (
          <p className={styles.jobMeta}>Tu ne possèdes encore aucun bien de consommation.</p>
        ) : (
          <div className={styles.jobList}>
            {overview.owned.map((good) => (
              <OwnedGoodCard key={good.id} good={good} onDone={handleDone} />
            ))}
          </div>
        )}
      </section>

      {PERSONAL_GOOD_CATEGORIES.map((category: PersonalGoodCategory) => {
        const items = overview.catalog.filter((item) => item.category === category);
        if (items.length === 0) return null;
        return (
          <section className={styles.section} key={category}>
            <h2 className={styles.sectionTitle}>{PERSONAL_GOOD_CATEGORY_LABELS[category]}</h2>
            <div className={styles.jobList}>
              {items.map((item) => (
                <CatalogCard key={item.id} item={item} onDone={handleDone} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
