"use client";

import { useState, type FormEvent } from "react";
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
            {conditionEmoji(property.condition)} État {property.condition.toFixed(0)}/100
          </span>
          <span>💵 Loyer potentiel {currencyFormatter.format(property.baseRent)}/cycle</span>
          {listing.isAuction ? (
            <span>
              📋 Droits d'enregistrement {(listing.registrationDuty.rate * 100).toFixed(1)}% sur le prix final
              {listing.registrationDuty.isReducedRate ? " (taux réduit 1ère habitation)" : ""}
            </span>
          ) : (
            <span>
              📋 + {currencyFormatter.format(listing.registrationDuty.amount)} de droits d'enregistrement (
              {(listing.registrationDuty.rate * 100).toFixed(1)}%{listing.registrationDuty.isReducedRate ? ", taux réduit 1ère habitation" : ""})
            </span>
          )}
          {auction && (
            <>
              <span>
                🔨 {auction.bidCount} offre{auction.bidCount > 1 ? "s" : ""}
              </span>
              <span>{timeRemainingLabel(auction.expiresAt)}</span>
              {auction.isLeader && <span>👑 Tu es en tête</span>}
              {auction.myMaxBid !== null && <span>Ton plafond {currencyFormatter.format(auction.myMaxBid)}</span>}
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
            {conditionEmoji(property.condition)} État {property.condition.toFixed(0)}/100
          </span>
          <span>💰 Valeur {currencyFormatter.format(property.marketValue)}</span>
          {property.lease && <span>💵 Loyer perçu {currencyFormatter.format(property.lease.rentAmount)}/cycle</span>}
          {property.mortgage && (
            <span>
              🏦 Prêt {currencyFormatter.format(property.mortgage.remainingBalance)} restant à{" "}
              {(property.mortgage.rate * 100).toFixed(1)}% ({mortgageTermLabel(property.mortgage.termCycles)})
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

export function PropertyMarketList({ listings }: { listings: PropertyListingView[] }) {
  if (listings.length === 0) {
    return <p className={styles.jobMeta}>Aucun bien en vente pour l'instant.</p>;
  }

  return (
    <div className={styles.jobList}>
      {listings.map((listing) => (
        <MarketCard key={listing.listingId} listing={listing} />
      ))}
    </div>
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
