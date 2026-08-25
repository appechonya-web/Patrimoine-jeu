"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_PROPERTY_CUSTOM_NAME_LENGTH,
  MIN_LISTING_PRICE,
  MIN_MORTGAGE_PRINCIPAL,
  MORTGAGE_TERM_OPTIONS_CYCLES,
  type MortgageTermCycles,
} from "@patrimoine-jeu/domain";
import type { PropertyListingView, PropertyView } from "../../lib/session";
import {
  GameError,
  buyProperty,
  cancelPropertyListing,
  endPropertyRent,
  listPropertyForAuction,
  listPropertyForSale,
  payoffMortgage,
  placeBid,
  rentProperty,
  renovateProperty,
  requestMortgage,
  setPropertyCustomName,
} from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { StatHint } from "../stat-hint";
import styles from "../page.module.css";

const PROPERTY_TYPE_ICONS: Record<string, string> = {
  RESIDENTIAL: "🏠",
  PARKING: "🅿️",
  APARTMENT: "🏢",
  HOUSE: "🏡",
  COMMERCIAL: "🏬",
  LUXURY: "🏰",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: "Résidentiel",
  PARKING: "Place de parking",
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  COMMERCIAL: "Commercial",
  LUXURY: "Bien de luxe",
};

function conditionEmoji(condition: number): string {
  if (condition >= 70) return "✨";
  if (condition < 35) return "🛠️";
  return "🔧";
}

function mortgageTermLabel(cycles: number): string {
  const years = cycles / 365;
  return `${years} an${years > 1 ? "s" : ""}`;
}

function timeRemainingLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Terminée";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) return `⏳ ${hours} h restantes`;
  return `⏳ ${Math.ceil(hours / 24)} j restants`;
}

function BidForm({ propertyId, minNextBid, onDone }: { propertyId: string; minNextBid: number; onDone: () => void }) {
  const [maxAmount, setMaxAmount] = useState(Math.ceil(minNextBid));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await placeBid(propertyId, maxAmount);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={minNextBid}
        step={10}
        value={maxAmount}
        onChange={(e) => setMaxAmount(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🔨 Enchérir"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function MortgageForm({
  propertyId,
  maxPrincipal,
  buttonLabel,
  onDone,
}: {
  propertyId: string;
  maxPrincipal: number;
  buttonLabel: string;
  onDone: () => void;
}) {
  const roundedMax = Math.floor(maxPrincipal / 50) * 50;
  const [principal, setPrincipal] = useState(Math.max(MIN_MORTGAGE_PRINCIPAL, roundedMax));
  const [termCycles, setTermCycles] = useState<MortgageTermCycles>(MORTGAGE_TERM_OPTIONS_CYCLES[1]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await requestMortgage(propertyId, principal, termCycles);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  if (roundedMax < MIN_MORTGAGE_PRINCIPAL) return null;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={MIN_MORTGAGE_PRINCIPAL}
        max={roundedMax}
        step={50}
        value={principal}
        onChange={(e) => setPrincipal(Number(e.target.value))}
      />
      <select
        className={styles.formInput}
        value={termCycles}
        onChange={(e) => setTermCycles(Number(e.target.value) as MortgageTermCycles)}
      >
        {MORTGAGE_TERM_OPTIONS_CYCLES.map((cycles) => (
          <option key={cycles} value={cycles}>
            {mortgageTermLabel(cycles)}
          </option>
        ))}
      </select>
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : buttonLabel}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function MarketCard({ listing }: { listing: PropertyListingView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMortgage, setShowMortgage] = useState(false);
  const { property } = listing;

  async function handleBuy() {
    setError(null);
    setPending(true);
    try {
      await buyProperty(property.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const maxMortgagePrincipal = Math.min(property.maxMortgagePrincipal, listing.price);
  const { auction } = listing;

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {PROPERTY_TYPE_ICONS[property.type] ?? "🏢"} {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
        </div>
        <div className={styles.jobMeta}>
          {property.municipality} — {property.region} {property.hasOwner && "— revendu par un particulier"}
        </div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="Se dégrade à chaque cycle (deux fois plus vite si loué) et conditionne directement le loyer réel perçu. Une rénovation restaure l'état pour 15% de la valeur du bien.">
              {conditionEmoji(property.condition)} État {property.condition.toFixed(0)}/100
            </StatHint>
          </span>
          <span>
            <StatHint hint="Loyer par cycle si le bien était en parfait état (100/100) — le loyer réellement perçu est réduit au prorata de l'état actuel du bien.">
              💵 Loyer potentiel {currencyFormatter.format(property.baseRent)}/cycle
            </StatHint>
          </span>
          {listing.isAuction ? (
            <span>
              <StatHint hint="Taxe provinciale prélevée immédiatement à l'achat, en plus du prix final — le taux varie selon la province et peut être réduit pour un premier achat de résidence principale.">
                📋 Droits d'enregistrement {(listing.registrationDuty.rate * 100).toFixed(1)}% sur le prix final
                {listing.registrationDuty.isReducedRate ? " (taux réduit 1ère habitation)" : ""}
              </StatHint>
            </span>
          ) : (
            <span>
              <StatHint hint="Taxe provinciale prélevée immédiatement à l'achat, en plus du prix affiché — le taux varie selon la province et peut être réduit pour un premier achat de résidence principale.">
                📋 + {currencyFormatter.format(listing.registrationDuty.amount)} de droits d'enregistrement (
                {(listing.registrationDuty.rate * 100).toFixed(1)}%{listing.registrationDuty.isReducedRate ? ", taux réduit 1ère habitation" : ""})
              </StatHint>
            </span>
          )}
          {auction && (
            <>
              <span>
                🔨 {auction.bidCount} offre{auction.bidCount > 1 ? "s" : ""}
              </span>
              <span>{timeRemainingLabel(auction.expiresAt)}</span>
              {auction.isLeader && <span>👑 Tu es en tête</span>}
              {auction.myMaxBid !== null && (
                <span>
                  <StatHint hint="Ton plafond réel — le prix affiché ne monte qu'au minimum nécessaire pour dépasser le second enchérisseur, jamais jusqu'à ton plafond (enchère à la eBay). Tu peux rester en tête sans jamais payer ce montant.">
                    Ton plafond {currencyFormatter.format(auction.myMaxBid)}
                  </StatHint>
                </span>
              )}
            </>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {!listing.isAuction && showMortgage && (
          <MortgageForm
            propertyId={property.id}
            maxPrincipal={maxMortgagePrincipal}
            buttonLabel="🏦 Financer l'achat"
            onDone={() => router.refresh()}
          />
        )}
      </div>
      <div className={styles.jobActions}>
        {listing.isAuction && auction ? (
          <>
            <div className={styles.jobSalary}>{currencyFormatter.format(auction.currentPrice)}</div>
            <BidForm propertyId={property.id} minNextBid={auction.minNextBid} onDone={() => router.refresh()} />
          </>
        ) : (
          <>
            <div className={styles.jobSalary}>
              {currencyFormatter.format(listing.price + listing.registrationDuty.amount)}
              <span className={styles.jobMeta}> total</span>
            </div>
            <button className={styles.apply} type="button" disabled={pending} onClick={handleBuy}>
              {pending ? "…" : "🛒 Acheter"}
            </button>
            {maxMortgagePrincipal >= MIN_MORTGAGE_PRINCIPAL && (
              <button className={styles.logout} type="button" onClick={() => setShowMortgage((v) => !v)}>
                {showMortgage ? "✕ Annuler" : "🏦 Financer"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RenovateButton({ property, onDone }: { property: PropertyView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      await renovateProperty(property.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  if (property.renovationCost <= 0) return null;

  return (
    <>
      <button className={styles.logout} type="button" disabled={pending} onClick={handleClick}>
        {pending ? "…" : `🔧 Rénover (${currencyFormatter.format(property.renovationCost)})`}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}

function CustomNameForm({ property, onDone }: { property: PropertyView; onDone: () => void }) {
  const [name, setName] = useState(property.customName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await setPropertyCustomName(property.id, name.trim() === "" ? null : name.trim());
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  if (property.type !== "LUXURY") return null;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="text"
        placeholder="Nom personnalisé (statut social, visible publiquement)"
        maxLength={MAX_PROPERTY_CUSTOM_NAME_LENGTH}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🏰 Enregistrer"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function SellForm({ propertyId, marketValue, onDone }: { propertyId: string; marketValue: number; onDone: () => void }) {
  const [price, setPrice] = useState(marketValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await listPropertyForSale(propertyId, price);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={MIN_LISTING_PRICE}
        step={50}
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🏷️ Mettre en vente"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function AuctionListForm({ propertyId, marketValue, onDone }: { propertyId: string; marketValue: number; onDone: () => void }) {
  const [startingPrice, setStartingPrice] = useState(Math.round(marketValue * 0.7));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await listPropertyForAuction(propertyId, startingPrice);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={MIN_LISTING_PRICE}
        step={50}
        value={startingPrice}
        onChange={(e) => setStartingPrice(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🔨 Mettre aux enchères"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function PayoffMortgageButton({ propertyId, onDone }: { propertyId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      await payoffMortgage(propertyId);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button className={styles.logout} type="button" disabled={pending} onClick={handleClick}>
        {pending ? "…" : "💳 Rembourser par anticipation"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}

function MyPropertyCard({ property, onDone }: { property: PropertyView; onDone: () => void }) {
  const [pending, setPending] = useState<"rent" | "endRent" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMortgage, setShowMortgage] = useState(false);
  const [showAuctionForm, setShowAuctionForm] = useState(false);

  async function handleRent() {
    setError(null);
    setPending("rent");
    try {
      await rentProperty(property.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(null);
    }
  }

  async function handleEndRent() {
    setError(null);
    setPending("endRent");
    try {
      await endPropertyRent(property.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(null);
    }
  }

  async function handleCancelListing() {
    setError(null);
    setPending("cancel");
    try {
      await cancelPropertyListing(property.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(null);
    }
  }

  const statusLabel =
    property.status === "OWNED"
      ? "🔑 Libre"
      : property.status === "RENTED"
        ? "🏘️ Loué"
        : property.status === "LISTED"
          ? property.auction
            ? "🔨 Aux enchères"
            : "🏷️ En vente"
          : property.status;

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {PROPERTY_TYPE_ICONS[property.type] ?? "🏢"} {property.customName ?? property.municipality}{" "}
          <span className={styles.jobMeta}>({PROPERTY_TYPE_LABELS[property.type]?.toLowerCase() ?? property.type})</span>
        </div>
        <div className={styles.jobStats}>
          <span>{statusLabel}</span>
          <span>
            <StatHint hint="Se dégrade à chaque cycle (deux fois plus vite si loué) et conditionne directement le loyer réel perçu. Une rénovation restaure l'état pour 15% de la valeur du bien.">
              {conditionEmoji(property.condition)} État {property.condition.toFixed(0)}/100
            </StatHint>
          </span>
          <span>
            <StatHint hint="Valeur de marché actuelle — sert de base au calcul du montant empruntable en hypothèque et au prix par défaut si tu mets le bien en vente.">
              💰 Valeur {currencyFormatter.format(property.marketValue)}
            </StatHint>
          </span>
          {property.lease && (
            <span>
              <StatHint hint="Loyer réellement perçu à chaque cycle — réduit par rapport au loyer potentiel maximal si l'état du bien s'est dégradé.">
                💵 Loyer perçu {currencyFormatter.format(property.lease.rentAmount)}/cycle
              </StatHint>
            </span>
          )}
          {property.mortgage && (
            <span>
              <StatHint hint="Taux fixé une fois pour toutes à la souscription — ne bouge jamais ensuite. Le capital restant est prélevé automatiquement à chaque cycle sur ton patrimoine liquide.">
                🏦 Prêt {currencyFormatter.format(property.mortgage.remainingBalance)} restant à{" "}
                {(property.mortgage.rate * 100).toFixed(1)}% ({mortgageTermLabel(property.mortgage.termCycles)})
              </StatHint>
            </span>
          )}
          {property.auction && (
            <>
              <span>
                🔨 {currencyFormatter.format(property.auction.currentPrice)} ({property.auction.bidCount} offre
                {property.auction.bidCount > 1 ? "s" : ""})
              </span>
              <span>{timeRemainingLabel(property.auction.expiresAt)}</span>
            </>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {showMortgage && !property.mortgage && (
          <MortgageForm
            propertyId={property.id}
            maxPrincipal={property.maxMortgagePrincipal}
            buttonLabel="🏦 Emprunter"
            onDone={onDone}
          />
        )}
        {showAuctionForm && (
          <AuctionListForm propertyId={property.id} marketValue={property.marketValue} onDone={onDone} />
        )}
      </div>
      <div className={styles.jobActions}>
        {property.status === "OWNED" && (
          <>
            <button className={styles.apply} type="button" disabled={pending !== null} onClick={handleRent}>
              {pending === "rent" ? "…" : "🏘️ Louer à un locataire"}
            </button>
            <SellForm propertyId={property.id} marketValue={property.marketValue} onDone={onDone} />
            <button className={styles.logout} type="button" onClick={() => setShowAuctionForm((v) => !v)}>
              {showAuctionForm ? "✕ Annuler" : "🔨 Mettre aux enchères"}
            </button>
            <RenovateButton property={property} onDone={onDone} />
            <CustomNameForm property={property} onDone={onDone} />
            {property.mortgage ? (
              <PayoffMortgageButton propertyId={property.id} onDone={onDone} />
            ) : (
              property.maxMortgagePrincipal >= MIN_MORTGAGE_PRINCIPAL && (
                <button className={styles.logout} type="button" onClick={() => setShowMortgage((v) => !v)}>
                  {showMortgage ? "✕ Annuler" : "🏦 Emprunter sur ce bien"}
                </button>
              )
            )}
          </>
        )}
        {property.status === "RENTED" && (
          <>
            <button className={styles.logout} type="button" disabled={pending !== null} onClick={handleEndRent}>
              {pending === "endRent" ? "…" : "🚫 Résilier le bail"}
            </button>
            {property.mortgage && <PayoffMortgageButton propertyId={property.id} onDone={onDone} />}
          </>
        )}
        {property.status === "LISTED" &&
          (property.auction && property.auction.bidCount > 0 ? (
            <span className={styles.jobMeta}>Enchère en cours — non annulable</span>
          ) : (
            <button className={styles.logout} type="button" disabled={pending !== null} onClick={handleCancelListing}>
              {pending === "cancel" ? "…" : "🚫 Retirer de la vente"}
            </button>
          ))}
      </div>
    </div>
  );
}

const ALL_FILTER = "TOUS";

function PropertyFilters({
  listings,
  region,
  province,
  type,
  minPrice,
  maxPrice,
  onRegionChange,
  onProvinceChange,
  onTypeChange,
  onMinPriceChange,
  onMaxPriceChange,
  onReset,
  hasActiveFilters,
}: {
  listings: PropertyListingView[];
  region: string;
  province: string;
  type: string;
  minPrice: number | "";
  maxPrice: number | "";
  onRegionChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onMinPriceChange: (value: number | "") => void;
  onMaxPriceChange: (value: number | "") => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}) {
  const regions = useMemo(
    () => [...new Set(listings.map((l) => l.property.region))].sort(),
    [listings],
  );
  const provinces = useMemo(
    () =>
      [
        ...new Set(
          listings
            .filter((l) => region === ALL_FILTER || l.property.region === region)
            .map((l) => l.property.municipality),
        ),
      ].sort(),
    [listings, region],
  );
  const types = useMemo(() => [...new Set(listings.map((l) => l.property.type))], [listings]);

  return (
    <div className={styles.filterBar}>
      <select
        className={styles.formInput}
        value={region}
        onChange={(e) => {
          onRegionChange(e.target.value);
          onProvinceChange(ALL_FILTER);
        }}
      >
        <option value={ALL_FILTER}>Toutes les régions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select className={styles.formInput} value={province} onChange={(e) => onProvinceChange(e.target.value)}>
        <option value={ALL_FILTER}>Toutes les provinces</option>
        {provinces.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select className={styles.formInput} value={type} onChange={(e) => onTypeChange(e.target.value)}>
        <option value={ALL_FILTER}>Tous types de bien</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {PROPERTY_TYPE_LABELS[t] ?? t}
          </option>
        ))}
      </select>
      <input
        className={styles.formInput}
        type="number"
        placeholder="Prix min"
        min={0}
        step={1000}
        value={minPrice}
        onChange={(e) => onMinPriceChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
      <input
        className={styles.formInput}
        type="number"
        placeholder="Prix max"
        min={0}
        step={1000}
        value={maxPrice}
        onChange={(e) => onMaxPriceChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
      {hasActiveFilters && (
        <button type="button" className={styles.logout} onClick={onReset}>
          ✕ Réinitialiser
        </button>
      )}
    </div>
  );
}

export function PropertyMarketList({ listings }: { listings: PropertyListingView[] }) {
  const [region, setRegion] = useState(ALL_FILTER);
  const [province, setProvince] = useState(ALL_FILTER);
  const [type, setType] = useState(ALL_FILTER);
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");

  const hasActiveFilters =
    region !== ALL_FILTER || province !== ALL_FILTER || type !== ALL_FILTER || minPrice !== "" || maxPrice !== "";

  function handleReset() {
    setRegion(ALL_FILTER);
    setProvince(ALL_FILTER);
    setType(ALL_FILTER);
    setMinPrice("");
    setMaxPrice("");
  }

  const filtered = listings.filter((listing) => {
    if (region !== ALL_FILTER && listing.property.region !== region) return false;
    if (province !== ALL_FILTER && listing.property.municipality !== province) return false;
    if (type !== ALL_FILTER && listing.property.type !== type) return false;
    if (minPrice !== "" && listing.price < minPrice) return false;
    if (maxPrice !== "" && listing.price > maxPrice) return false;
    return true;
  });

  if (listings.length === 0) {
    return <p className={styles.jobMeta}>Aucun bien en vente pour l'instant.</p>;
  }

  return (
    <>
      <PropertyFilters
        listings={listings}
        region={region}
        province={province}
        type={type}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onRegionChange={setRegion}
        onProvinceChange={setProvince}
        onTypeChange={setType}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
      />
      <p className={styles.jobMeta}>
        {filtered.length} bien{filtered.length > 1 ? "s" : ""} sur {listings.length}
      </p>
      {filtered.length === 0 ? (
        <p className={styles.jobMeta}>Aucun bien ne correspond à ces filtres.</p>
      ) : (
        <div className={styles.jobList}>
          {filtered.map((listing) => (
            <MarketCard key={listing.listingId} listing={listing} />
          ))}
        </div>
      )}
    </>
  );
}

export function MyPropertiesList({ properties, onDone }: { properties: PropertyView[]; onDone: () => void }) {
  if (properties.length === 0) {
    return <p className={styles.jobMeta}>Tu ne possèdes encore aucun bien immobilier.</p>;
  }

  return (
    <div className={styles.jobList}>
      {properties.map((property) => (
        <MyPropertyCard key={property.id} property={property} onDone={onDone} />
      ))}
    </div>
  );
}
