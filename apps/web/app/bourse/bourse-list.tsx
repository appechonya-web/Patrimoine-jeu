"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MIN_TRADE_CASH, MIN_TRADE_UNITS } from "@patrimoine-jeu/domain";
import type { CommodityMarketView } from "../../lib/session";
import { GameError, buyCommodity, sellCommodity } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

const SECTOR_ICONS: Record<string, string> = {
  Bois: "🪵",
  Métaux: "⚙️",
  Agriculture: "🌾",
  "Textile brut": "🧵",
  Extraction: "⛏️",
};

function CommodityCard({ market }: { market: CommodityMarketView }) {
  const router = useRouter();
  const [cashAmount, setCashAmount] = useState(100);
  const [units, setUnits] = useState(Math.min(10, Math.max(MIN_TRADE_UNITS, market.myHolding)));
  const [pending, setPending] = useState<"buy" | "sell" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const priceDelta = market.previousPrice !== null ? market.price - market.previousPrice : null;

  async function handleBuy(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending("buy");
    try {
      await buyCommodity(market.sectorId, cashAmount);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(null);
    }
  }

  async function handleSell(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending("sell");
    try {
      await sellCommodity(market.sectorId, units);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {SECTOR_ICONS[market.sector] ?? "📦"} {market.sector}
        </div>
        <div className={styles.jobStats}>
          <span>💹 {currencyFormatter.format(market.price)}/unité</span>
          {priceDelta !== null && (
            <span>
              {priceDelta >= 0 ? "📈" : "📉"} {priceDelta >= 0 ? "+" : ""}
              {currencyFormatter.format(priceDelta)} depuis le dernier cycle
            </span>
          )}
          <span>🗃️ Réserve {market.commodityReserve.toFixed(0)} unités</span>
          <span>🎒 Tu possèdes {market.myHolding.toFixed(2)} unités</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <form className={styles.form} onSubmit={handleBuy}>
          <input
            className={styles.formInput}
            type="number"
            min={MIN_TRADE_CASH}
            step={10}
            value={cashAmount}
            onChange={(e) => setCashAmount(Number(e.target.value))}
          />
          <button className={styles.apply} type="submit" disabled={pending !== null}>
            {pending === "buy" ? "…" : "🛒 Acheter (€)"}
          </button>
        </form>
        <form className={styles.form} onSubmit={handleSell}>
          <input
            className={styles.formInput}
            type="number"
            min={MIN_TRADE_UNITS}
            max={market.myHolding}
            step={1}
            value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
          />
          <button className={styles.logout} type="submit" disabled={pending !== null || market.myHolding <= 0}>
            {pending === "sell" ? "…" : "💰 Vendre (unités)"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function BourseList({ markets }: { markets: CommodityMarketView[] }) {
  if (markets.length === 0) {
    return <p className={styles.jobMeta}>Aucun marché disponible pour l'instant.</p>;
  }

  return (
    <div className={styles.jobList}>
      {markets.map((market) => (
        <CommodityCard key={market.sectorId} market={market} />
      ))}
    </div>
  );
}
