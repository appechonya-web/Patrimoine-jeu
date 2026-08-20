"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FINANCIAL_ASSET_TYPE_LABELS, MIN_ASSET_BUY_AMOUNT, type FinancialAssetType } from "@patrimoine-jeu/domain";
import type { FinancialAssetView } from "../../lib/session";
import { GameError, buyFinancialAsset, sellFinancialAsset } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function variationLabel(price: number, previousPrice: number): string {
  if (previousPrice <= 0) return "";
  const change = ((price - previousPrice) / previousPrice) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${change >= 0 ? "📈" : "📉"} ${sign}${change.toFixed(1)}% depuis le dernier cycle`;
}

function AssetCard({ asset, onDone }: { asset: FinancialAssetView; onDone: () => void }) {
  const [amount, setAmount] = useState(MIN_ASSET_BUY_AMOUNT);
  const [sellQuantity, setSellQuantity] = useState(asset.quantity);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleBuy() {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      await buyFinancialAsset(asset.key, amount);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  async function handleSell() {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await sellFinancialAsset(asset.key, sellQuantity);
      setNotice(
        result.tax > 0
          ? `Vendu pour ${currencyFormatter.format(result.saleProceeds)} — ${currencyFormatter.format(result.tax)} de taxe sur la plus-value, ${currencyFormatter.format(result.net)} net`
          : `Vendu pour ${currencyFormatter.format(result.net)}, plus-value exonérée`,
      );
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
        <div className={styles.jobTitle}>{asset.name}</div>
        <div className={styles.jobMeta}>{variationLabel(asset.price, asset.previousPrice)}</div>
        <div className={styles.jobStats}>
          <span>💰 {currencyFormatter.format(asset.price)}</span>
          {asset.quantity > 0 && (
            <>
              <span>📦 {asset.quantity.toFixed(4)} détenues</span>
              <span>Valeur {currencyFormatter.format(asset.marketValue)}</span>
              <span>
                {asset.unrealizedGain >= 0 ? "🟢" : "🔴"} {currencyFormatter.format(asset.unrealizedGain)} de
                plus-value latente
              </span>
            </>
          )}
        </div>
        {notice && <p className={styles.jobMeta}>{notice}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            handleBuy();
          }}
        >
          <input
            className={styles.formInput}
            type="number"
            min={MIN_ASSET_BUY_AMOUNT}
            step={5}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <button className={styles.apply} type="submit" disabled={pending}>
            {pending ? "…" : "Acheter"}
          </button>
        </form>
        {asset.quantity > 0 && (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              handleSell();
            }}
          >
            <input
              className={styles.formInput}
              type="number"
              min={0.0001}
              max={asset.quantity}
              step={0.0001}
              value={sellQuantity}
              onChange={(e) => setSellQuantity(Number(e.target.value))}
            />
            <button className={styles.logout} type="submit" disabled={pending}>
              {pending ? "…" : "Vendre"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function PlacementsList({ assets }: { assets: FinancialAssetView[] }) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  const byType = new Map<FinancialAssetType, FinancialAssetView[]>();
  for (const asset of assets) {
    const type = asset.type as FinancialAssetType;
    const list = byType.get(type) ?? [];
    list.push(asset);
    byType.set(type, list);
  }

  return (
    <>
      {[...byType.entries()].map(([type, list]) => (
        <section key={type} className={styles.section}>
          <h2 className={styles.sectionTitle}>{FINANCIAL_ASSET_TYPE_LABELS[type]}</h2>
          <div className={styles.jobList}>
            {list.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onDone={handleDone} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
