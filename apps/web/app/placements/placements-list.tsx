"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_RISK_LEVEL_LABELS,
  FINANCIAL_ASSET_TYPE_LABELS,
  MIN_ASSET_BUY_AMOUNT,
  type FinancialAssetType,
} from "@patrimoine-jeu/domain";
import type { AssetOrderView, AssetPricePoint, AssetTransactionView, FinancialAssetView } from "../../lib/session";
import {
  GameError,
  buyFinancialAsset,
  cancelAssetOrder,
  createAssetOrder,
  sellFinancialAsset,
  setDividendPolicy,
} from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { AssetPriceChart } from "./asset-price-chart";
import { InfoTip } from "../info-tip";
import { StatHint } from "../stat-hint";
import styles from "../page.module.css";

function variationLabel(price: number, previousPrice: number): string {
  if (previousPrice <= 0) return "";
  const change = ((price - previousPrice) / previousPrice) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${change >= 0 ? "📈" : "📉"} ${sign}${change.toFixed(1)}% depuis le dernier cycle`;
}

function OrderForm({ asset, onDone }: { asset: FinancialAssetView; onDone: () => void }) {
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [condition, setCondition] = useState<"ABOVE" | "BELOW">("BELOW");
  const [triggerPrice, setTriggerPrice] = useState(Math.round(asset.price * 100) / 100);
  const [amount, setAmount] = useState(MIN_ASSET_BUY_AMOUNT);
  const [quantity, setQuantity] = useState(asset.quantity || 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createAssetOrder(asset.key, {
        direction,
        condition,
        triggerPrice,
        amount: direction === "BUY" ? amount : undefined,
        quantity: direction === "SELL" ? quantity : undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit} style={{ flexWrap: "wrap" }}>
      <select
        className={styles.formInput}
        style={{ width: "auto" }}
        value={direction}
        onChange={(e) => setDirection(e.target.value as "BUY" | "SELL")}
      >
        <option value="BUY">Acheter</option>
        <option value="SELL">Vendre</option>
      </select>
      <select
        className={styles.formInput}
        style={{ width: "auto" }}
        value={condition}
        onChange={(e) => setCondition(e.target.value as "ABOVE" | "BELOW")}
      >
        <option value="BELOW">si le cours descend à</option>
        <option value="ABOVE">si le cours monte à</option>
      </select>
      <input
        className={styles.formInput}
        type="number"
        min={0.01}
        step={0.01}
        value={triggerPrice}
        onChange={(e) => setTriggerPrice(Number(e.target.value))}
      />
      {direction === "BUY" ? (
        <input
          className={styles.formInput}
          type="number"
          min={MIN_ASSET_BUY_AMOUNT}
          step={5}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          title="Montant à dépenser (€) au déclenchement"
        />
      ) : (
        <input
          className={styles.formInput}
          type="number"
          min={0.0001}
          step={0.0001}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          title="Unités à vendre au déclenchement"
        />
      )}
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🎯 Placer l'ordre"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
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
  const [showOrderForm, setShowOrderForm] = useState(false);
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
            <span>
              <StatHint hint={`Volatilité ${(asset.volatility * 100).toFixed(1)}%/cycle (écart-type approximatif de la marche aléatoire) — plus c'est élevé, plus le cours peut varier fort d'un cycle à l'autre, dans un sens comme dans l'autre.`}>
                {ASSET_RISK_LEVEL_LABELS[asset.riskLevel]}
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
          <button
            type="button"
            className={styles.collapsibleToggle}
            aria-expanded={showOrderForm}
            onClick={() => setShowOrderForm((value) => !value)}
          >
            <span>🎯 Ordre à cours déclenché</span>
            <span className={`${styles.collapsibleChevron} ${showOrderForm ? styles.collapsibleChevronOpen : ""}`}>▾</span>
          </button>
          {showOrderForm && <OrderForm asset={asset} onDone={onDone} />}
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

function OrderRow({ order, onDone }: { order: AssetOrderView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelAssetOrder(order.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const conditionLabel = order.condition === "BELOW" ? "descend à" : "monte à";
  const directionLabel = order.direction === "BUY" ? "Acheter" : "Vendre";
  const sizeLabel =
    order.direction === "BUY" ? currencyFormatter.format(order.amount ?? 0) : `${(order.quantity ?? 0).toFixed(4)} unités`;

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {directionLabel} {order.assetName}
        </div>
        <div className={styles.jobMeta}>
          si le cours {conditionLabel} {currencyFormatter.format(order.triggerPrice)} — {sizeLabel}
        </div>
        <div className={styles.jobStats}>
          <span>
            {order.status === "OPEN" && "🟡 En attente"}
            {order.status === "FILLED" && `🟢 Exécuté (cycle n°${order.filledCycle})`}
            {order.status === "CANCELLED" && "⚪ Annulé"}
          </span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      {order.status === "OPEN" && (
        <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
          {pending ? "…" : "Annuler"}
        </button>
      )}
    </div>
  );
}

function OpenOrdersSection({ orders, onDone }: { orders: AssetOrderView[]; onDone: () => void }) {
  const openOrders = orders.filter((o) => o.status === "OPEN");
  if (openOrders.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🎯"
          title="Ordres en cours"
          mechanic="Un ordre à cours déclenché couvre à la fois l'ordre à cours limité et le stop-loss : achète si le cours descend (bonne affaire) ou monte (cassure haussière), vends si le cours monte (prise de bénéfice) ou descend (stop-loss). Vérifié et exécuté à chaque clôture de cycle, jamais en direct — le cours ne bouge qu'à la clôture. Si les fonds ou la position ne suffisent plus au moment du déclenchement, l'ordre est annulé plutôt qu'exécuté partiellement."
          realWorld="Comme un ordre stop ou à cours limité chez un vrai courtier : tu fixes la condition à l'avance, l'exécution se fait automatiquement sans que tu doives surveiller le marché en continu."
        />
        <span>Ordres en cours</span>
      </h2>
      <div className={styles.jobList}>
        {openOrders.map((order) => (
          <OrderRow key={order.id} order={order} onDone={onDone} />
        ))}
      </div>
    </section>
  );
}

function TransactionHistorySection({ transactions }: { transactions: AssetTransactionView[] }) {
  const [expanded, setExpanded] = useState(false);
  if (transactions.length === 0) return null;
  const visible = expanded ? transactions : transactions.slice(0, 5);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🧾"
          title="Historique de mes transactions"
          mechanic="Le relevé personnel de tes 100 derniers achats/ventes, distinct de l'historique de cours du marché (public, affiché sous chaque actif) — un vrai relevé de compte-titres."
          realWorld="Comme le relevé d'opérations d'un compte-titres réel : chaque ligne, avec le prix exact et la plus-value/taxe si c'était une vente."
        />
        <span>Historique de mes transactions</span>
      </h2>
      <div className={styles.jobList}>
        {visible.map((t) => (
          <div key={t.id} className={styles.jobCard}>
            <div>
              <div className={styles.jobTitle}>
                {t.type === "BUY" ? "🟢 Achat" : "🔴 Vente"} — {t.assetName}
              </div>
              <div className={styles.jobMeta}>
                {t.quantity.toFixed(4)} unités à {currencyFormatter.format(t.price)} — {currencyFormatter.format(t.amount)}
                {t.gain !== null && t.gain > 0 && ` (plus-value ${currencyFormatter.format(t.gain)}${t.tax ? `, taxe ${currencyFormatter.format(t.tax)}` : ""})`}
              </div>
              <div className={styles.jobMeta}>{new Date(t.createdAt).toLocaleString("fr-BE")}</div>
            </div>
          </div>
        ))}
      </div>
      {transactions.length > 5 && (
        <button type="button" className={styles.collapsibleToggle} onClick={() => setExpanded((v) => !v)}>
          <span>{expanded ? "Replier" : `Afficher les ${transactions.length} transactions`}</span>
          <span className={`${styles.collapsibleChevron} ${expanded ? styles.collapsibleChevronOpen : ""}`}>▾</span>
        </button>
      )}
    </section>
  );
}

export function PlacementsList({
  assets,
  priceHistory,
  orders,
  transactions,
}: {
  assets: FinancialAssetView[];
  priceHistory: Record<string, AssetPricePoint[]>;
  orders: AssetOrderView[];
  transactions: AssetTransactionView[];
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
      <OpenOrdersSection orders={orders} onDone={handleDone} />
      {[...byType.entries()].map(([type, list]) => (
        <AssetTypeSection key={type} type={type} list={list} priceHistory={priceHistory} onDone={handleDone} />
      ))}
      <TransactionHistorySection transactions={transactions} />
    </>
  );
}
