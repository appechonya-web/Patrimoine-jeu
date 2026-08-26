"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FINANCIAL_ASSET_TYPE_LABELS, MIN_ASSET_BUY_AMOUNT, type FinancialAssetType } from "@patrimoine-jeu/domain";
import type { AssetPricePoint, FinancialAssetView } from "../../lib/session";
import { GameError, buyFinancialAsset, sellFinancialAsset, setDividendPolicy } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { AssetPriceChart } from "./asset-price-chart";
import { StatHint } from "../stat-hint";
import styles from "../page.module.css";

function variationLabel(price: number, previousPrice: number): string {
  if (previousPrice <= 0) return "";
  const change = ((price - previousPrice) / previousPrice) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${change >= 0 ? "📈" : "📉"} ${sign}${change.toFixed(1)}% depuis le dernier cycle`;
}

function AssetCard({
  asset,
  history,
  onDone,
}: {
  asset: FinancialAssetView;
  history: AssetPricePoint[];
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(MIN_ASSET_BUY_AMOUNT);
  const [sellMode, setSellMode] = useState<"quantity" | "value">("quantity");
  const [sellQuantity, setSellQuantity] = useState(asset.quantity);
  const [sellValue, setSellValue] = useState(asset.quantity * asset.price);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchSellMode(mode: "quantity" | "value") {
    if (mode === "value") {
      setSellValue(sellQuantity * asset.price);
    } else {
      setSellQuantity(asset.price > 0 ? sellValue / asset.price : 0);
    }
    setSellMode(mode);
  }

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
      const quantityToSell =
        sellMode === "quantity" ? sellQuantity : Math.min(asset.quantity, asset.price > 0 ? sellValue / asset.price : 0);
      const result = await sellFinancialAsset(asset.key, quantityToSell);
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

  async function handleDividendPolicyChange(policy: "CASH" | "REINVEST") {
    setError(null);
    setPending(true);
    try {
      await setDividendPolicy(asset.key, policy);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.assetCardWrapper}>
      <div className={styles.jobCard}>
        <div>
          <div className={styles.jobTitle}>{asset.name}</div>
          <div className={styles.jobMeta}>{variationLabel(asset.price, asset.previousPrice)}</div>
          <div className={styles.jobStats}>
            <span>
              <StatHint hint="Cours actuel — recalculé à chaque cycle par une marche aléatoire propre à cet actif (dérive + volatilité), indépendante de tes propres achats/ventes.">
                💰 {currencyFormatter.format(asset.price)}
              </StatHint>
            </span>
            {asset.sectorName && (
              <span>
                <StatHint hint={`Liée au secteur réel ${asset.sectorName} : réagit aussi aux crises/booms sectoriels nationaux qui touchent les entreprises de ce secteur, en plus de sa dérive et sa volatilité propres.`}>
                  🏭 {asset.sectorName}
                </StatHint>
              </span>
            )}
            {asset.dividendRate > 0 && (
              <span>
                <StatHint hint="Taux annuel versé à chaque cycle, proportionnellement aux parts détenues — au choix en liquide ou réinvesti automatiquement en davantage de parts (voir le sélecteur ci-dessous).">
                  💸 Dividende {(asset.dividendRate * 100).toFixed(1)}%/an
                </StatHint>
              </span>
            )}
            {asset.quantity > 0 && (
              <>
                <span>
                  <StatHint hint="Quantité de parts que tu possèdes actuellement sur cet actif.">
                    📦 {asset.quantity.toFixed(4)} détenues
                  </StatHint>
                </span>
                <span>
                  <StatHint hint="Valeur actuelle de ta position = quantité détenue × cours actuel.">
                    Valeur {currencyFormatter.format(asset.marketValue)}
                  </StatHint>
                </span>
                <span>
                  <StatHint hint="Différence entre la valeur actuelle de ta position et ce que tu as payé pour l'obtenir — pas encore taxée tant que tu ne vends pas, contrairement à la plus-value réalisée à la revente.">
                    {asset.unrealizedGain >= 0 ? "🟢" : "🔴"} {currencyFormatter.format(asset.unrealizedGain)} de
                    plus-value latente
                  </StatHint>
                </span>
              </>
            )}
          </div>
          {asset.quantity > 0 && asset.dividendRate > 0 && (
            <div className={styles.jobStats} style={{ marginTop: "0.4rem" }}>
              <span>
                <StatHint hint="En liquide : le dividende s'ajoute à ton patrimoine liquide chaque cycle. Réinvesti : il achète automatiquement plus de parts au cours du moment — un effet boule de neige sur la durée, mais rien en cash immédiat. Les deux sont taxés pareil, avec la même franchise à vie que la plus-value.">
                  Dividende :
                </StatHint>
              </span>
              <select
                className={styles.formInput}
                style={{ width: "auto", padding: "0.3rem 0.5rem" }}
                value={asset.dividendPolicy}
                disabled={pending}
                onChange={(e) => handleDividendPolicyChange(e.target.value as "CASH" | "REINVEST")}
              >
                <option value="CASH">💵 En liquide</option>
                <option value="REINVEST">📈 Réinvesti (plus de parts)</option>
              </select>
            </div>
          )}
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
            <>
              <div className={styles.sellModeToggle}>
                <button
                  type="button"
                  className={sellMode === "quantity" ? styles.sellModeButtonActive : styles.sellModeButton}
                  onClick={() => switchSellMode("quantity")}
                >
                  Unités
                </button>
                <button
                  type="button"
                  className={sellMode === "value" ? styles.sellModeButtonActive : styles.sellModeButton}
                  onClick={() => switchSellMode("value")}
                >
                  €
                </button>
              </div>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSell();
                }}
              >
                {sellMode === "quantity" ? (
                  <input
                    className={styles.formInput}
                    type="number"
                    min={0.0001}
                    max={asset.quantity}
                    step={0.0001}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(Number(e.target.value))}
                  />
                ) : (
                  <input
                    className={styles.formInput}
                    type="number"
                    min={0.01}
                    max={asset.marketValue}
                    step={1}
                    value={sellValue}
                    onChange={(e) => setSellValue(Number(e.target.value))}
                  />
                )}
                <button className={styles.logout} type="submit" disabled={pending}>
                  {pending ? "…" : "Vendre"}
                </button>
              </form>
              <p className={styles.jobMeta}>
                {sellMode === "quantity"
                  ? `≈ ${currencyFormatter.format(sellQuantity * asset.price)}`
                  : `≈ ${(asset.price > 0 ? sellValue / asset.price : 0).toFixed(4)} unités`}
              </p>
            </>
          )}
        </div>
      </div>
      <AssetPriceChart history={history} />
    </div>
  );
}

function AssetTypeSection({
  type,
  list,
  priceHistory,
  onDone,
}: {
  type: FinancialAssetType;
  list: FinancialAssetView[];
  priceHistory: Record<string, AssetPricePoint[]>;
  onDone: () => void;
}) {
  const [expanded, setExpanded] = useState(list.length <= 4);
  const sorted = [...list].sort((a, b) => (a.sectorName ?? "").localeCompare(b.sectorName ?? ""));

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{FINANCIAL_ASSET_TYPE_LABELS[type]}</h2>
      {list.length > 4 && (
        <button
          type="button"
          className={styles.collapsibleToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <span>{expanded ? "Replier" : `Afficher les ${list.length} actifs`}</span>
          <span className={`${styles.collapsibleChevron} ${expanded ? styles.collapsibleChevronOpen : ""}`}>▾</span>
        </button>
      )}
      {expanded && (
        <div className={styles.jobList} style={{ marginTop: list.length > 4 ? "0.75rem" : 0 }}>
          {sorted.map((asset) => (
            <AssetCard key={asset.id} asset={asset} history={priceHistory[asset.key] ?? []} onDone={onDone} />
          ))}
        </div>
      )}
    </section>
  );
}

export function PlacementsList({
  assets,
  priceHistory,
}: {
  assets: FinancialAssetView[];
  priceHistory: Record<string, AssetPricePoint[]>;
}) {
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
        <AssetTypeSection key={type} type={type} list={list} priceHistory={priceHistory} onDone={handleDone} />
      ))}
    </>
  );
}
