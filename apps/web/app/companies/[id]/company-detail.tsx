"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACTION_COOLDOWN_CYCLES,
  DEPARTMENT_MANAGER_SALARY_PER_CYCLE,
  EMPLOYEE_TIER_CATALOG,
  EMPLOYEE_TIERS,
  EXPORT_UNLOCK_COST,
  INVESTMENT_AXIS_LABELS,
  LOAN_TERM_OPTIONS_CYCLES,
  MAX_INVESTMENT_PER_CYCLE,
  MAX_LOAN_PRINCIPAL_EQUITY_RATIO,
  MAX_UNIT_PRICE_RATIO,
  MANAGER_SALARY_PER_CYCLE,
  MASS_MARKETING_CAMPAIGN_DURATION_CYCLES,
  MIN_CAPACITY_EXPANSION_AMOUNT,
  MIN_INVESTMENT_AMOUNT,
  MIN_LOAN_PRINCIPAL,
  MIN_MASS_MARKETING_CAMPAIGN_AMOUNT,
  MIN_UNIT_PRICE,
  PROVINCE_SECTOR_AFFINITIES,
  PROVINCE_SECTOR_AFFINITY_BONUS,
  REFERENCE_UNIT_PRICE,
  type Department,
  type LoanTermCycles,
  type ProductType,
} from "@patrimoine-jeu/domain";
import type {
  BankReliabilityView,
  CapitalRaiseView,
  Company,
  CompanyDetail as CompanyDetailData,
  CompanyInsuranceView,
  CompanyStaffView,
  InsuranceOfferView,
  Product,
  ProductPricing,
  ExpansionRequirement,
  ProposalView,
  SaleBidView,
  SaleListingView,
  SupplyContractView,
  TenderOfferView,
} from "../../../lib/session";
import {
  GameError,
  buyShareListing,
  cancelListing,
  fireDepartmentManager,
  fireEmployee,
  fireManager,
  hireDepartmentManager,
  hireEmployee,
  hireManager,
  investInCapacityExpansion,
  investInCompany,
  launchMassMarketingCampaign,
  launchProduct,
  unlockExport,
  listShareForSale,
  requestLoan,
  setProductAllocation,
  setProductPrice,
  type EmployeeTier,
  type InvestmentAxis,
} from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import { StatHint } from "../../stat-hint";
import { LoanOffersSection } from "./loan-offers-section";
import { DistributionSection } from "./distribution-section";
import { BankingSection } from "./banking-section";
import { SupplyChainSection } from "./supply-chain-section";
import { TenderOfferSection } from "./tender-offer-section";
import { StaffSection } from "./staff-section";
import { InsuranceSection } from "./insurance-section";
import { SaleSection } from "./sale-section";
import { CapitalRaiseSection } from "./capital-raise-section";
import { GovernanceSection } from "./governance-section";
import { GroupSection } from "./group-section";
import styles from "../../page.module.css";

const INVESTMENT_AXIS_ICONS: Record<InvestmentAxis, string> = {
  marketing: "📣",
  quality: "✨",
  equipment: "🛠️",
  workConditions: "😊",
  reserve: "🏦",
  automation: "🤖",
  branding: "🎨",
  innovation: "💡",
  training: "🎓",
  safety: "🦺",
  insurance: "🛡️",
};

type CompanyTabId = "overview" | "production" | "team" | "finance" | "ownership";

const COMPANY_TABS: { id: CompanyTabId; icon: string; label: string }[] = [
  { id: "overview", icon: "📊", label: "Vue d'ensemble" },
  { id: "production", icon: "📦", label: "Production" },
  { id: "team", icon: "👥", label: "Équipe" },
  { id: "finance", icon: "💰", label: "Finance" },
  { id: "ownership", icon: "🤝", label: "Actionnariat" },
];

function ManagerButton({ company, onDone }: { company: Company; onDone: () => void }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      if (company.hasManager) {
        await fireManager(company.id);
      } else {
        await hireManager(company.id);
      }
      onDone();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className={styles.logout} type="button" disabled={pending} onClick={handleClick}>
      {pending
        ? "…"
        : company.hasManager
          ? "🚫 Renvoyer le manager"
          : `🧑‍💼 Engager un manager (${currencyFormatter.format(MANAGER_SALARY_PER_CYCLE)}/cycle)`}
    </button>
  );
}

const DEPARTMENT_ICONS: Record<string, string> = {
  sales: "📣",
  rd: "🔬",
  production: "🏭",
  hr: "🤝",
};

function moraleEmoji(morale: number): string {
  if (morale >= 70) return "😄";
  if (morale < 35) return "😞";
  return "😐";
}

function DepartmentManagerButton({
  companyId,
  department,
  hasManager,
  onDone,
}: {
  companyId: string;
  department: string;
  hasManager: boolean;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      if (hasManager) {
        await fireDepartmentManager(companyId, department as Department);
      } else {
        await hireDepartmentManager(companyId, department as Department);
      }
      onDone();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className={styles.logout} type="button" disabled={pending} onClick={handleClick}>
      {pending
        ? "…"
        : hasManager
          ? "🚫 Renvoyer le responsable"
          : `🧑‍💼 Nommer un responsable (${currencyFormatter.format(DEPARTMENT_MANAGER_SALARY_PER_CYCLE)}/cycle)`}
    </button>
  );
}

function DepartmentCard({
  company,
  department,
  onDone,
}: {
  company: CompanyDetailData;
  department: CompanyDetailData["departments"][number];
  onDone: () => void;
}) {
  const [tier, setTier] = useState<EmployeeTier>("unskilled");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleHire() {
    setError(null);
    setPending(true);
    try {
      await hireEmployee(company.id, tier, department.department as Department);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  async function handleFire() {
    setError(null);
    setPending(true);
    try {
      await fireEmployee(company.id, tier, department.department as Department);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const tierDef = EMPLOYEE_TIER_CATALOG[tier];

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {DEPARTMENT_ICONS[department.department] ?? "🏢"} {department.label}
        </div>
        <div className={styles.jobStats}>
          <span>
            {moraleEmoji(department.morale)} Moral {department.morale.toFixed(0)}/100
          </span>
          {department.totalEmployeeCount > 0 && (
            <span>🎓 Ancienneté {department.experienceCycles} cycles (+{(department.experienceBonus * 100).toFixed(0)}%)</span>
          )}
          <span>{department.hasManager ? "🧑‍💼 Avec responsable" : "🚫 Sans responsable"}</span>
          {EMPLOYEE_TIERS.map((t) => (
            <span key={t}>
              {EMPLOYEE_TIER_CATALOG[t].label} : {department.employeeCounts[t]}
            </span>
          ))}
        </div>
        {company.isPrimaryOwner && (
          <>
            <div className={styles.jobActions}>
              <DepartmentManagerButton
                companyId={company.id}
                department={department.department}
                hasManager={department.hasManager}
                onDone={onDone}
              />
            </div>
            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              <select className={styles.formInput} value={tier} onChange={(e) => setTier(e.target.value as EmployeeTier)}>
                {EMPLOYEE_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYEE_TIER_CATALOG[t].label} — {currencyFormatter.format(EMPLOYEE_TIER_CATALOG[t].salaryPerCycle)}/cycle
                  </option>
                ))}
              </select>
              <button className={styles.apply} type="button" disabled={pending} onClick={handleHire}>
                {pending ? "…" : `👷 Embaucher (${currencyFormatter.format(tierDef.salaryPerCycle)}/cycle)`}
              </button>
              {department.employeeCounts[tier] > 0 && (
                <button className={styles.logout} type="button" disabled={pending} onClick={handleFire}>
                  🚫 Licencier
                </button>
              )}
            </form>
          </>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

function InvestmentPanel({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [axis, setAxis] = useState<InvestmentAxis>("marketing");
  const [amount, setAmount] = useState(MIN_INVESTMENT_AMOUNT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await investInCompany(companyId, axis, amount);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <p className={styles.jobMeta}>
        Un seul investissement par levier tous les {ACTION_COOLDOWN_CYCLES} cycles, plafonné à{" "}
        {currencyFormatter.format(MAX_INVESTMENT_PER_CYCLE)} — impossible d'accélérer avec plus d'argent, seul le
        temps fait progresser une entreprise.
      </p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <select className={styles.formInput} value={axis} onChange={(e) => setAxis(e.target.value as InvestmentAxis)}>
          {Object.entries(INVESTMENT_AXIS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {INVESTMENT_AXIS_ICONS[value as InvestmentAxis]} {label}
            </option>
          ))}
        </select>
        <input
          className={styles.formInput}
          type="number"
          min={MIN_INVESTMENT_AMOUNT}
          max={MAX_INVESTMENT_PER_CYCLE}
          step={50}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <button className={styles.apply} type="submit" disabled={pending}>
          {pending ? "…" : "💸 Investir"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </>
  );
}

function CapacityExpansionPanel({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [amount, setAmount] = useState(MIN_CAPACITY_EXPANSION_AMOUNT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await investInCapacityExpansion(companyId, amount);
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
        min={MIN_CAPACITY_EXPANSION_AMOUNT}
        step={500}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🏗️ Agrandir la capacité"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function MassMarketingCampaignPanel({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [amount, setAmount] = useState(MIN_MASS_MARKETING_CAMPAIGN_AMOUNT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await launchMassMarketingCampaign(companyId, amount);
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
        min={MIN_MASS_MARKETING_CAMPAIGN_AMOUNT}
        step={500}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "📢 Lancer la campagne"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function ExportUnlockPanel({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setError(null);
    setPending(true);
    try {
      await unlockExport(companyId);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button className={styles.apply} type="button" disabled={pending} onClick={handleUnlock}>
        {pending ? "…" : `🌍 Débloquer (${currencyFormatter.format(EXPORT_UNLOCK_COST)})`}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

/** Même formule que game-engine/companies.ts computeCompetitiveness — juste le facteur prix, en isolation, pour la prévisualisation live. */
function priceMultiplierAt(candidatePrice: number, pricing: ProductPricing): number {
  return Math.min(
    pricing.priceMultiplierCap,
    Math.pow(pricing.acceptedReferencePrice / Math.max(0.01, candidatePrice), pricing.priceElasticity),
  );
}

function priceMultiplierTone(multiplier: number): string {
  if (multiplier >= 1.5) return styles.priceMultiplierGood;
  if (multiplier >= 0.9) return styles.priceMultiplierNeutral;
  return styles.priceMultiplierBad;
}

function priceMultiplierLabel(multiplier: number): string {
  if (multiplier >= 1.5) return "🔥 Prix cassé — forte demande";
  if (multiplier >= 0.9) return "⚖️ Prix équilibré";
  if (multiplier >= 0.5) return "⚠️ Prix élevé — demande en recul";
  return "🥶 Prix très élevé — demande quasi nulle";
}

function ProductPriceForm({
  companyId,
  productId,
  unitPrice,
  pricing,
  onDone,
}: {
  companyId: string;
  productId: string;
  unitPrice: number;
  pricing: ProductPricing;
  onDone: () => void;
}) {
  const [price, setPrice] = useState(unitPrice);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await setProductPrice(companyId, productId, price);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const previewMultiplier = priceMultiplierAt(price, pricing);
  const currentMultiplier = pricing.currentPriceMultiplier;

  return (
    <>
      <div className={styles.jobStats}>
        <span>🎯 Prix de référence {currencyFormatter.format(pricing.acceptedReferencePrice)}/unité</span>
        <span>Aujourd'hui : ×{currentMultiplier.toFixed(2)} demande</span>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.formInput}
          type="number"
          min={MIN_UNIT_PRICE}
          max={REFERENCE_UNIT_PRICE * MAX_UNIT_PRICE_RATIO * 3}
          step={0.5}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
        <button className={styles.apply} type="submit" disabled={pending}>
          {pending ? "…" : "🏷️ Fixer le prix"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <div className={`${styles.priceMultiplierPreview} ${priceMultiplierTone(previewMultiplier)}`}>
        <span>{priceMultiplierLabel(previewMultiplier)}</span>
        <span>×{previewMultiplier.toFixed(2)} sur la demande à ce prix (plafond ×{pricing.priceMultiplierCap})</span>
      </div>
    </>
  );
}

function ProductAllocationForm({
  companyId,
  productId,
  capacityAllocation,
  onDone,
}: {
  companyId: string;
  productId: string;
  capacityAllocation: number;
  onDone: () => void;
}) {
  const [allocation, setAllocation] = useState(capacityAllocation);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await setProductAllocation(companyId, productId, allocation);
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
        min={0}
        max={100}
        step={1}
        value={allocation}
        onChange={(e) => setAllocation(Number(e.target.value))}
      />
      <span className={styles.jobMeta}>% de la capacité</span>
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "⚖️ Réallouer"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function ProductCard({
  company,
  product,
  onDone,
}: {
  company: CompanyDetailData;
  product: Product;
  onDone: () => void;
}) {
  const report = product.latestCycleReport;

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {product.label} {product.isCore && <span className={styles.jobMeta}>(gamme de fondation)</span>}
        </div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="Part de la capacité de production totale de l'entreprise réservée à cette gamme — le reste revient automatiquement à la gamme de fondation. Plus haut = plus d'unités produites pour cette gamme, moins pour les autres.">
              ⚖️ {product.capacityAllocation.toFixed(0)}% de la capacité
            </StatHint>
          </span>
          <span>
            <StatHint hint="Unités produites mais pas encore vendues, reportées au cycle suivant (jusqu'à 3 cycles de capacité, au-delà elles sont perdues). Coûte un léger frais de stockage par unité et par cycle — un stock qui grossit sans arrêt signale une production trop généreuse face à la demande.">
              🗃️ Stock {product.stockUnits.toFixed(1)} unités
            </StatHint>
          </span>
          {report && (
            <>
              <span>
                <StatHint hint="Ta part de la demande totale de ce (secteur, gamme), proportionnelle à ta compétitivité face aux autres entreprises qui la disputent — prix, qualité, marketing et branding y contribuent tous.">
                  🥊 Part de marché {report.marketSharePercent.toFixed(1)}%
                </StatHint>
              </span>
              <span>
                <StatHint hint="Unités produites ce cycle pour cette gamme — dépend de la capacité totale de l'entreprise (effectifs, équipement, formation) et du % qui lui est alloué ci-dessus.">
                  🏭 Produit {report.unitsProduced.toFixed(1)}
                </StatHint>
              </span>
              <span>
                <StatHint hint="Unités effectivement vendues ce cycle — plafonné par ce que tu as pu produire + ton stock disponible, jamais par la demande elle-même.">
                  🛒 Vendu {report.unitsSold.toFixed(1)}
                </StatHint>
              </span>
              {report.unitsLost > 0.05 && (
                <span>
                  <StatHint hint="Demande que tu n'as PAS pu satisfaire : le marché voulait acheter plus que ce que ta production + ton stock permettaient. Ce n'est pas du surplus invendu — c'est le signe que ton produit se vend mieux que tu ne peux en fournir. Pour réduire ce nombre : augmente la capacité (embauche, équipement, formation) ou l'allocation de cette gamme, pas le prix.">
                    😕 Perdu {report.unitsLost.toFixed(1)}
                  </StatHint>
                </span>
              )}
              <span>
                <StatHint hint="Coût de production par unité — réduit par l'automatisation, augmenté par les investissements qualité (meilleurs intrants, compensés par un prix de référence plus élevé accepté par le marché).">
                  ⚙️ Coût {currencyFormatter.format(report.unitCost)}/unité
                </StatHint>
              </span>
              <span>
                <StatHint hint="Chiffre d'affaires de cette gamme ce cycle = unités vendues × prix affiché. Avant coûts, salaires, charges et impôts — voir Profit net pour le résultat final de l'entreprise.">
                  💵 Revenu {currencyFormatter.format(report.revenue)}
                </StatHint>
              </span>
            </>
          )}
        </div>
        {company.isPrimaryOwner && (
          <>
            <p className={styles.jobMeta}>Prix ({currencyFormatter.format(product.unitPrice)}/unité) :</p>
            <ProductPriceForm
              companyId={company.id}
              productId={product.id}
              unitPrice={product.unitPrice}
              pricing={product.pricing}
              onDone={onDone}
            />
            {!product.isCore && (
              <>
                <p className={styles.jobMeta}>
                  Allocation de capacité — le reste revient automatiquement à la gamme de fondation :
                </p>
                <ProductAllocationForm
                  companyId={company.id}
                  productId={product.id}
                  capacityAllocation={product.capacityAllocation}
                  onDone={onDone}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LaunchProductPanel({ company, onDone }: { company: CompanyDetailData; onDone: () => void }) {
  const [pendingType, setPendingType] = useState<ProductType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLaunch(type: ProductType) {
    setError(null);
    setPendingType(type);
    try {
      await launchProduct(company.id, type);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPendingType(null);
    }
  }

  if (company.productCatalog.length === 0) return null;

  return (
    <div className={styles.jobList}>
      {company.productCatalog.map((entry) => (
        <div key={entry.type} className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{entry.isUnlocked ? "🔓" : "🔒"} {entry.label}</div>
            <div className={styles.jobMeta}>{entry.description}</div>
            <div className={styles.jobStats}>
              <span>💡 R&D requise : niveau {entry.unlockInnovationLevel}</span>
              <span>💰 Coût de lancement {currencyFormatter.format(entry.launchCost)}</span>
            </div>
          </div>
          {company.isPrimaryOwner && (
            <div className={styles.jobActions}>
              <button
                className={styles.apply}
                type="button"
                disabled={!entry.isUnlocked || pendingType !== null}
                onClick={() => handleLaunch(entry.type as ProductType)}
              >
                {pendingType === entry.type ? "…" : entry.isUnlocked ? "🚀 Lancer" : "Verrouillée"}
              </button>
            </div>
          )}
        </div>
      ))}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

function ShareListingForm({ companyId, maxPercentage, onDone }: { companyId: string; maxPercentage: number; onDone: () => void }) {
  const [sharePercentage, setSharePercentage] = useState(Math.min(10, maxPercentage));
  const [price, setPrice] = useState(1000);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await listShareForSale(companyId, sharePercentage, price);
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
        min={0.01}
        max={maxPercentage}
        step={0.01}
        value={sharePercentage}
        onChange={(e) => setSharePercentage(Number(e.target.value))}
      />
      <span className={styles.jobMeta}>% pour</span>
      <input
        className={styles.formInput}
        type="number"
        min={1}
        step={100}
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

function ListingRow({ listing, onDone }: { listing: CompanyDetailData["openListings"][number]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction() {
    setError(null);
    setPending(true);
    try {
      if (listing.isMine) {
        await cancelListing(listing.id);
      } else {
        await buyShareListing(listing.id);
      }
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
        <div className={styles.jobTitle}>{listing.sharePercentage}% des parts</div>
        <div className={styles.jobMeta}>Vendeur : {listing.sellerPseudo}</div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(listing.price)}</div>
        <button className={listing.isMine ? styles.logout : styles.apply} type="button" disabled={pending} onClick={handleAction}>
          {pending ? "…" : listing.isMine ? "🚫 Annuler" : "🛒 Acheter"}
        </button>
      </div>
    </div>
  );
}

function LoanRow({ loan }: { loan: CompanyDetailData["loans"][number] }) {
  const statusLabel =
    loan.status === "ACTIVE" ? "🟢 En cours" : loan.status === "PAID" ? "✅ Soldé" : "❌ En défaut";

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{currencyFormatter.format(loan.principal)} emprunté</div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="En défaut : l'entreprise n'a pas pu honorer une échéance — pénalise son attractivité et bloque tout nouvel emprunt tant que CE prêt n'est pas soldé.">
              {statusLabel}
            </StatHint>
          </span>
          <span>
            <StatHint hint="Fixé une fois pour toutes au moment de l'emprunt, selon le ratio dette/fonds propres de l'entreprise à cet instant précis — ne bouge plus ensuite, même si la situation financière change.">
              📈 Taux {(loan.rate * 100).toFixed(1)}%/an
            </StatHint>
          </span>
          <span>
            <StatHint hint="Nombre de cycles sur lesquels le principal est remboursé de façon linéaire, intérêts inclus à chaque échéance.">
              ⏳ Durée {loan.termCycles} cycles
            </StatHint>
          </span>
          <span>
            <StatHint hint="Capital restant dû — prélevé automatiquement à chaque cycle sur la trésorerie de l'entreprise, avant calcul du profit net.">
              💳 Reste à rembourser {currencyFormatter.format(loan.remainingBalance)}
            </StatHint>
          </span>
        </div>
      </div>
    </div>
  );
}

function LoanRequestForm({ companyId, maxPrincipal, onDone }: { companyId: string; maxPrincipal: number; onDone: () => void }) {
  const [principal, setPrincipal] = useState(Math.min(MIN_LOAN_PRINCIPAL, Math.max(0, maxPrincipal)));
  const [termCycles, setTermCycles] = useState<LoanTermCycles>(LOAN_TERM_OPTIONS_CYCLES[1]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await requestLoan(companyId, principal, termCycles);
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
        min={MIN_LOAN_PRINCIPAL}
        max={maxPrincipal}
        step={100}
        value={principal}
        onChange={(e) => setPrincipal(Number(e.target.value))}
      />
      <select className={styles.formInput} value={termCycles} onChange={(e) => setTermCycles(Number(e.target.value) as LoanTermCycles)}>
        {LOAN_TERM_OPTIONS_CYCLES.map((term) => (
          <option key={term} value={term}>
            {term} cycles
          </option>
        ))}
      </select>
      <button className={styles.apply} type="submit" disabled={pending || maxPrincipal < MIN_LOAN_PRINCIPAL}>
        {pending ? "…" : "🏦 Emprunter"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function CompanyDetail({
  company,
  myControlledCompanies,
  expansionRequirement,
  supplyContracts,
  tenderOffers,
  myPseudo,
  staff,
  insurance,
  insuranceOffers,
  saleListing,
  saleBids,
  capitalRaise,
  proposals,
  bankReliability,
}: {
  company: CompanyDetailData;
  myControlledCompanies: { id: string; name: string }[];
  expansionRequirement: ExpansionRequirement | null;
  supplyContracts: SupplyContractView[];
  tenderOffers: TenderOfferView[];
  myPseudo: string;
  staff: CompanyStaffView | null;
  insurance: CompanyInsuranceView | null;
  insuranceOffers: InsuranceOfferView[];
  saleListing: SaleListingView | null;
  saleBids: SaleBidView[];
  capitalRaise: CapitalRaiseView | null;
  proposals: ProposalView[];
  bankReliability: BankReliabilityView | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CompanyTabId>("overview");

  function handleDone() {
    router.refresh();
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>🏢 {company.name}</h1>
          <p className={styles.subtitle}>
            {company.sector} — {company.municipality} — {company.sharePercentage}% des parts
            {company.isPrimaryOwner ? " — 👑 actionnaire principal" : " — actionnaire minoritaire"}
          </p>
          {company.status === "BANKRUPT" && (
            <p className={styles.error}>
              💥 Cette entreprise a fait faillite — pertes cumulées trop lourdes, prêts effacés, elle a cessé toute
              activité.
            </p>
          )}
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <section className={styles.grid}>
        <div className={`${styles.card} ${styles.cardGold}`}>
          <span className={styles.label}>
            <InfoTip
              label="💰"
              title="Profit net"
              mechanic="Chiffre d'affaires de toutes les gammes actives ce cycle, moins coûts de production, salaires, charges (assurance, stockage...), intérêts d'emprunt et impôt des sociétés (ISOC) — recalculé entièrement à chaque clôture, ne se cumule pas d'un cycle à l'autre."
              realWorld="L'équivalent du résultat net après impôt d'une vraie entreprise sur sa dernière période comptable — ce qui reste réellement après avoir payé fournisseurs, employés, banque et fisc."
              tip="Négatif un cycle ponctuellement n'est pas grave — regarde plutôt la tendance sur plusieurs cycles et le Profit cumulé à côté, qui lui ne redescend jamais."
            />{" "}
            Profit net
          </span>
          <span className={styles.value}>
            {company.latestCycleReport ? currencyFormatter.format(company.latestCycleReport.netProfit) : "—"}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>
            <InfoTip
              label="⭐"
              title="Attractivité"
              mechanic={`Score de base amélioré par tes investissements, plus des bonus additifs (manager +10, infrastructures de la province jusqu'à +15, et +${PROVINCE_SECTOR_AFFINITY_BONUS} si ton secteur est historiquement ancré dans ta province), puis multiplié par les aléas sectoriels du moment.`}
              realWorld="Un vrai pôle économique donne un avantage structurel permanent (main-d'œuvre qualifiée, fournisseurs à proximité) — indépendant des aléas conjoncturels qui, eux, vont et viennent."
              tip={
                PROVINCE_SECTOR_AFFINITIES[company.municipality]?.includes(company.sector)
                  ? `✅ Cette entreprise profite du bonus provincial : ${company.sector} est un secteur historiquement ancré en ${company.municipality}.`
                  : undefined
              }
            />{" "}
            Attractivité
          </span>
          <span className={styles.value}>{company.effectiveAttractiveness.toFixed(0)}/100</span>
          <span className={styles.jobMeta}>
            Base {company.attractivenessBreakdown.base.toFixed(0)}
            {company.attractivenessBreakdown.managerBonus > 0 &&
              ` · Manager +${company.attractivenessBreakdown.managerBonus.toFixed(0)}`}
            {company.attractivenessBreakdown.infrastructureBonus > 0 &&
              ` · Infrastructures +${company.attractivenessBreakdown.infrastructureBonus.toFixed(1)}`}
            {company.attractivenessBreakdown.provinceAffinityBonus > 0 &&
              ` · Province +${company.attractivenessBreakdown.provinceAffinityBonus.toFixed(0)}`}
          </span>
        </div>
        <div className={`${styles.card} ${styles.cardGold}`}>
          <span className={styles.label}>
            <InfoTip
              label="📈"
              title="Profit cumulé"
              mechanic={`Somme de tous les profits nets réalisés depuis la fondation de l'entreprise — ne baisse jamais, même un cycle déficitaire, contrairement au Profit net à côté qui repart de zéro chaque cycle.${expansionRequirement ? ` Conditionne notamment l'expansion (il en faut ${currencyFormatter.format(expansionRequirement.minCumulativeNetProfit)} pour fonder une deuxième entreprise).` : ""}`}
              realWorld="Comme les bénéfices non distribués (retained earnings) au bilan d'une vraie entreprise — la trace de sa rentabilité totale dans la durée, pas juste sa performance du dernier trimestre."
            />{" "}
            Profit cumulé
          </span>
          <span className={styles.value}>{currencyFormatter.format(company.cumulativeNetProfit)}</span>
        </div>
        <div className={`${styles.card} ${styles.cardGold}`}>
          <span className={styles.label}>
            <InfoTip
              label="💎"
              title="Valorisation"
              mechanic="Ta rentabilité MOYENNE depuis la fondation (profit cumulé ÷ cycles actifs) détermine un multiplicateur appliqué à la valeur comptable de l'entreprise — mais UNIQUEMENT pour ton patrimoine net et le classement, jamais pour le bilan comptable (capacité d'emprunt, prix plancher d'OPA restent en valeur comptable pure). Une moyenne plutôt qu'un compteur de cycles sans perte : un coup dur ponctuel ne remet pas le multiplicateur à zéro."
              realWorld="Comme un multiple de résultat (P/E ratio) en bourse : une entreprise qui prouve une rentabilité solide et durable vaut structurellement plus que sa seule valeur comptable, parce que le marché anticipe qu'elle continuera à bien performer."
            />{" "}
            Valorisation
          </span>
          <span className={styles.value}>×{company.valorizationMultiplier.toFixed(2)}</span>
        </div>
      </section>

      <div className={styles.tabBar}>
        {COMPANY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          {company.latestCycleReport && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <InfoTip
                  label="📅"
                  title="Dernier cycle"
                  mechanic="Le résumé financier du cycle qui vient de se clôturer : revenu généré par la vente de tes produits, coûts totaux (production, salaires, intérêts), et l'ISOC (impôt des sociétés) prélevé sur le profit avant qu'il ne soit distribué ou réinvesti."
                  realWorld="L'ISOC est le vrai impôt belge sur les bénéfices des sociétés — calculé ici sur une base annualisée puis ramené au cycle, exactement comme un exercice comptable réel est ensuite décomposé en acomptes trimestriels."
                />
                <span>Dernier cycle</span>
              </h2>
              <div className={styles.jobStats}>
                <span>💵 Revenu {currencyFormatter.format(company.latestCycleReport.revenue)}</span>
                <span>💸 Coûts {currencyFormatter.format(company.latestCycleReport.costs)}</span>
                <span>🧾 ISOC {currencyFormatter.format(company.latestCycleReport.taxPaid)}</span>
              </div>
              {company.latestCycleReport.eventLabel && (
                <p className={styles.jobMeta}>🎲 Événement : {company.latestCycleReport.eventLabel}</p>
              )}
            </section>
          )}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="🥊"
                title="Concurrence sectorielle"
                mechanic="La demande pour la gamme de base de ton secteur est un gâteau partagé entre toutes les entreprises actives (joueurs et IA) — ta part dépend de ta compétitivité relative (prix, qualité, marketing) face aux autres, pas de ta valeur absolue. Le gâteau lui-même grossit avec le nombre de joueurs inscrits et l'investissement communal en infrastructure — ce n'est pas une taille figée."
                realWorld="C'est le principe de la part de marché en concurrence oligopolistique : dans un marché mature, une entreprise ne grandit pas dans l'absolu, elle grandit en prenant des parts à ses concurrents directs — mais un marché en expansion démographique offre aussi une vraie croissance organique à tout le monde, sans qu'il y ait de perdant."
              />
              <span>Concurrence sectorielle — {company.sector}</span>
            </h2>
            <p className={styles.jobMeta}>
              La demande "gamme de base" du secteur est un gâteau partagé, pas illimité —{" "}
              {company.activePlayerCompetitorsCount} autre{company.activePlayerCompetitorsCount > 1 ? "s" : ""} entreprise
              {company.activePlayerCompetitorsCount > 1 ? "s" : ""} joueur{company.activePlayerCompetitorsCount > 1 ? "s" : ""} et{" "}
              {company.sectorCompetitors.length} concurrent{company.sectorCompetitors.length > 1 ? "s" : ""} IA s'en disputent une
              part avec toi. Marketing et image de marque ne comptent que relativement à eux.
            </p>
            <div className={styles.jobStats}>
              {company.sectorCompetitors.map((c) => (
                <span key={c.name}>🤖 {c.name}</span>
              ))}
            </div>
          </section>

          {expansionRequirement && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <InfoTip
                  label="🎯"
                  title="Progression vers une entreprise supplémentaire"
                  mechanic={`Fonder une deuxième entreprise exige d'avoir dirigé au moins une entreprise pendant ${expansionRequirement.minCyclesActive} cycles ET d'avoir cumulé ${currencyFormatter.format(expansionRequirement.minCumulativeNetProfit)} de profit net — les deux conditions ensemble, sur la même entreprise.`}
                  realWorld="Comme un banquier qui exige un historique de rentabilité avant de financer une expansion, le jeu impose une preuve de succès réel avant de permettre de se diversifier — le temps, pas seulement l'argent, est la vraie contrainte."
                  tip="Chaque entreprise supplémentaire coûte deux fois plus cher à fonder que la précédente — mieux vaut consolider une entreprise très rentable que multiplier les petites structures fragiles."
                />
                <span>Progression vers une entreprise supplémentaire</span>
              </h2>
              <p className={styles.jobMeta}>
                {Math.max(0, company.cyclesActive)}/{expansionRequirement.minCyclesActive} cycles,{" "}
                {currencyFormatter.format(Math.max(0, company.cumulativeNetProfit))}/
                {currencyFormatter.format(expansionRequirement.minCumulativeNetProfit)} de profit cumulé
              </p>
            </section>
          )}
        </>
      )}

      {activeTab === "production" && (
        <>
          <p className={styles.jobMeta}>
            Chaque gamme capte une part du marché de son secteur selon ta compétitivité — les leviers
            d'investissement ci-dessous (marketing, qualité, automatisation...) et l'approvisionnement en matières
            premières la déterminent.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="📦"
                title="Gammes de produits"
                mechanic="Chaque gamme capte une part de la demande de son marché selon sa compétitivité (prix, qualité, marketing...) et produit selon la capacité de ton entreprise, répartie entre les gammes actives."
                realWorld="C'est la logique d'un portefeuille de produits : la gamme de base assure un revenu stable à faible marge, les gammes déverrouillées par la R&D visent des marchés de niche à plus forte marge ou de masse à plus faible marge — diversifier réduit le risque de dépendre d'un seul produit."
              />
              <span>Gammes de produits</span>
            </h2>
            {!company.latestCycleReport && <p className={styles.jobMeta}>Pas encore de cycle clôturé pour cette entreprise.</p>}
            <div className={styles.jobList}>
              {company.products.map((product) => (
                <ProductCard key={product.id} company={company} product={product} onDone={handleDone} />
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="💡"
                title="R&D — nouvelles gammes"
                mechanic="Le niveau d'innovation effectif (investissement en argent + bonus de l'équipe R&D, jusqu'à +20 points) débloque progressivement de nouvelles gammes de produits à lancer (aux paliers 15, 35 et 60) — chacune avec sa propre économie de prix et de coûts."
                realWorld="Investir en recherche & développement pour élargir son offre est un choix stratégique réel : une entreprise qui n'investit jamais en R&D reste dépendante d'un seul marché, avec un risque de disruption si un concurrent innove plus vite."
              />
              <span>R&D — nouvelles gammes</span>
            </h2>
            <p className={styles.jobMeta}>
              Le niveau de R&D (levier innovation) débloque de nouvelles gammes à lancer, chacune avec sa propre
              économie — un marché de niche à forte marge, un marché de masse à faible marge, un produit qui
              continue de profiter de chaque nouveau palier de R&D.
            </p>
            <LaunchProductPanel company={company} onDone={handleDone} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="📊"
                title="Niveaux d'investissement"
                mechanic={`10 leviers indépendants (marketing, qualité, automatisation...), chacun plafonné à ${currencyFormatter.format(MAX_INVESTMENT_PER_CYCLE)} investis par action et à une action tous les ${ACTION_COOLDOWN_CYCLES} cycles — impossible d'accélérer en y mettant plus d'argent d'un coup. Atteindre le niveau 100 d'un seul levier demande environ 100 actions, donc ~700 cycles minimum, quel que soit le capital disponible. Au-delà de 100, continuer d'investir rapporte un bonus de "palier mondial" en rendements décroissants (pas de mur) — un niveau affiché à plus de 100/100 en profite déjà.`}
                realWorld="Le plafonnement reproduit les rendements décroissants du capital : au-delà d'un certain seuil, injecter plus d'argent d'un coup dans une entreprise n'accélère pas sa croissance — l'organisation, la formation des équipes et l'adoption par le marché prennent du temps, pas seulement du capital."
                tip="Chaque levier résout un problème différent : marketing/qualité/branding augmentent ta part de marché, équipement/formation augmentent ta capacité de production, sécurité/assurance amortissent les coups durs. Investir un peu partout n'est pas un mauvais réflexe — identifie plutôt lequel de ces trois blocs te limite vraiment avant d'y mettre plus d'argent."
              />
              <span>Niveaux d'investissement</span>
            </h2>
            <div className={styles.jobStats}>
              <span>{INVESTMENT_AXIS_ICONS.marketing} {INVESTMENT_AXIS_LABELS.marketing} {company.levels.marketing.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.quality} {INVESTMENT_AXIS_LABELS.quality} {company.levels.quality.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.equipment} {INVESTMENT_AXIS_LABELS.equipment} {company.levels.equipment.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.workConditions} {INVESTMENT_AXIS_LABELS.workConditions} {company.levels.workConditions.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.automation} {INVESTMENT_AXIS_LABELS.automation} {company.levels.automation.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.branding} {INVESTMENT_AXIS_LABELS.branding} {company.levels.branding.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.innovation} {INVESTMENT_AXIS_LABELS.innovation} {company.levels.innovation.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.training} {INVESTMENT_AXIS_LABELS.training} {company.levels.training.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.safety} {INVESTMENT_AXIS_LABELS.safety} {company.levels.safety.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.insurance} {INVESTMENT_AXIS_LABELS.insurance} {company.levels.insurance.toFixed(0)}/100</span>
              <span>{INVESTMENT_AXIS_ICONS.reserve} {INVESTMENT_AXIS_LABELS.reserve} {currencyFormatter.format(company.cashReserve)}</span>
            </div>
            {company.isPrimaryOwner ? (
              <InvestmentPanel companyId={company.id} onDone={handleDone} />
            ) : (
              <p className={styles.jobMeta}>Seul l'actionnaire principal peut investir dans l'entreprise.</p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="🏗️"
                title="Expansion de capacité & campagne de masse"
                mechanic="Deux puits de dépense SANS plafond par action ni cooldown, contrairement aux 10 leviers ci-dessus — c'est ici que l'argent disponible compte vraiment, à rendements décroissants (racine carrée) mais sans mur. Financés par la TRÉSORERIE DE L'ENTREPRISE (pas ton patrimoine personnel, contrairement aux leviers classiques) — l'argent d'un emprunt, d'une levée de fonds ou d'un profit mis en réserve peut directement servir ici. L'expansion de capacité (permanente) augmente directement ta capacité de production totale. La campagne marketing de masse (temporaire) donne un vrai coup de fouet à la compétitivité de toutes tes gammes, mais s'éteint après quelques cycles — contrairement au levier marketing classique qui reste acquis pour toujours."
                realWorld="Comme construire une seconde usine ou lancer une campagne publicitaire nationale dans la vraie vie : des décisions ponctuelles et coûteuses, pas un abonnement mensuel, qui absorbent vraiment un gros capital d'un coup — contrairement aux budgets courants (leviers classiques) qui restent volontairement modestes et réguliers."
              />
              <span>Expansion de capacité & campagne de masse</span>
            </h2>
            <div className={styles.jobStats}>
              <span>
                🏗️ Capacité ×{company.capacityExpansionMultiplier.toFixed(2)} (
                {currencyFormatter.format(company.capacityExpansionInvestment)} investis au total)
              </span>
              {company.massMarketingCampaign ? (
                <span>
                  📢 Campagne active : +{(company.massMarketingCampaign.magnitude * 100).toFixed(0)}% de
                  compétitivité, encore {company.massMarketingCampaign.cyclesRemaining} cycles
                </span>
              ) : (
                <span>📢 Aucune campagne active</span>
              )}
            </div>
            {company.isPrimaryOwner ? (
              <div className={styles.jobList}>
                <div className={styles.jobCard}>
                  <div>
                    <div className={styles.jobTitle}>Expansion de capacité</div>
                    <div className={styles.jobMeta}>Permanent, cumulatif, sans plafond.</div>
                  </div>
                  <CapacityExpansionPanel companyId={company.id} onDone={handleDone} />
                </div>
                <div className={styles.jobCard}>
                  <div>
                    <div className={styles.jobTitle}>Campagne marketing de masse</div>
                    <div className={styles.jobMeta}>
                      Remplace toute campagne en cours — dure {MASS_MARKETING_CAMPAIGN_DURATION_CYCLES} cycles.
                    </div>
                  </div>
                  <MassMarketingCampaignPanel companyId={company.id} onDone={handleDone} />
                </div>
              </div>
            ) : (
              <p className={styles.jobMeta}>Seul l'actionnaire principal peut investir dans l'entreprise.</p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="🌍"
                title="Marchés internationaux"
                mechanic={`Déblocage unique et permanent (${currencyFormatter.format(EXPORT_UNLOCK_COST)}, payé par la trésorerie de l'entreprise) qui ouvre l'accès à un pool de demande EXPORT séparé du marché national — seules les entreprises ayant débloqué l'export s'y disputent la demande, pas les concurrents locaux (NPC compris). Cette demande vient s'AJOUTER à la demande nationale, sur la MÊME capacité déjà allouée : elle ne rapporte donc que si ta capacité a de la marge au-delà de ce que le national consomme déjà — combine-la avec l'expansion de capacité.`}
                realWorld="Comme une entreprise qui ouvre un bureau à l'export : un vrai investissement initial pour accéder à de nouveaux marchés, mais qui ne sert à rien si l'outil de production est déjà saturé par la demande locale — il faut d'abord avoir (ou construire) la capacité de suivre."
              />
              <span>Marchés internationaux</span>
            </h2>
            {company.exportUnlocked ? (
              <p className={styles.jobMeta}>
                ✅ Débloqués depuis le cycle n°{company.exportUnlockedCycle} — toutes tes gammes actives captent
                désormais aussi de la demande export.
              </p>
            ) : company.isPrimaryOwner ? (
              <>
                <p className={styles.jobMeta}>
                  Pas encore débloqués — {currencyFormatter.format(EXPORT_UNLOCK_COST)} depuis la trésorerie de
                  l'entreprise, une fois pour toutes.
                </p>
                <ExportUnlockPanel companyId={company.id} onDone={handleDone} />
              </>
            ) : (
              <p className={styles.jobMeta}>Pas encore débloqués. Seul l'actionnaire principal peut les activer.</p>
            )}
          </section>

          <SupplyChainSection contracts={supplyContracts} />
        </>
      )}

      {activeTab === "team" && (
        <>
          <p className={styles.jobMeta}>
            Managers et responsables de département réduisent le coût en bien-être de gérer l'entreprise ;
            employés NPC et employés-joueurs déterminent ensemble la capacité de production.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="👥"
                title="Direction & effectif"
                mechanic={`Un manager (${currencyFormatter.format(MANAGER_SALARY_PER_CYCLE)}/cycle) pilote l'entreprise à ta place et supprime le coût en bien-être de la gérer toi-même, en plus d'un bonus d'attractivité — utile si tu possèdes plusieurs entreprises et dois répartir ton attention.`}
                realWorld="C'est l'arbitrage classique du dirigeant fondateur : rester aux commandes soi-même use l'énergie personnelle, déléguer à un directeur général professionnel coûte un salaire mais libère du temps et de l'attention pour d'autres priorités."
              />
              <span>Direction & effectif</span>
            </h2>
            <p className={styles.jobMeta}>
              {company.totalEmployeeCount} employé{company.totalEmployeeCount > 1 ? "s" : ""} —{" "}
              {company.hasManager ? "avec" : "sans"} dirigeant général
            </p>
            <p className={styles.jobMeta}>
              Un manager pilote l'entreprise en ton absence : +attractivité, plus de pénalité d'attention divisée
              si tu possèdes plusieurs entreprises, et — surtout — plus de coût en bien-être à la gérer toi-même
              chaque cycle.
            </p>
            {company.isPrimaryOwner ? (
              <div className={styles.jobActions}>
                <ManagerButton company={company} onDone={handleDone} />
              </div>
            ) : (
              <p className={styles.jobMeta}>Seul l'actionnaire principal peut gérer le personnel.</p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="🏢"
                title="Départements"
                mechanic="Chaque département a son propre moral d'équipe (dérive vers une base fixée par 'conditions de travail', amortie par un responsable dédié) ET un effet distinct sur l'entreprise, propre à son rôle : Production alimente la capacité de production ; Ventes multiplie la compétitivité de tes gammes (jusqu'à +50%) — elle vend mieux ce que tu produis déjà, contrairement au marketing qui attire de la demande ; R&D ajoute des points au niveau d'innovation effectif (jusqu'à +20), en plus de l'argent investi — débloque les gammes plus vite ; RH relève la base de moral de TOUS les départements (jusqu'à +20 points), pas seulement le sien. En plus du moral, chaque département accumule de l'ANCIENNETÉ tant qu'il a au moins un employé (jamais remise à zéro, juste en pause si le département se vide) — elle amplifie son effet, sans plafond, en rendements décroissants : une équipe qui tourne depuis des mois vaut structurellement plus qu'une équipe fraîchement recrutée, à effectif et moral égaux."
                realWorld="Une vraie organisation n'a pas 4 équipes interchangeables : les ventes vendent, la R&D innove, la production fabrique, et les RH font tourner l'ensemble en maintenant l'engagement des équipes — chacune a un impact différent et complémentaire sur la performance globale, pas un simple total d'effectif."
              />
              <span>Départements</span>
            </h2>
            <p className={styles.jobMeta}>
              Chaque département a son propre moral d'équipe (un responsable dédié en amortit les baisses) ET un
              effet distinct : Production → capacité de production, Ventes → compétitivité, R&D → bonus de niveau
              d'innovation, RH → base de moral de toute l'entreprise.
            </p>
            <div className={styles.jobList}>
              {company.departments.map((department) => (
                <DepartmentCard key={department.department} company={company} department={department} onDone={handleDone} />
              ))}
            </div>
          </section>

          <StaffSection companyId={company.id} isPrimaryOwner={company.isPrimaryOwner} staff={staff} onDone={handleDone} />
        </>
      )}

      {activeTab === "finance" && (
        <>
          <p className={styles.jobMeta}>
            Le bilan de l'entreprise, comment elle emprunte, comment le profit est partagé (ou réinvesti), et ses
            activités bancaires.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="💰"
                title="Finance & bilan"
                mechanic={`Le bilan simplifié (actif = passif + capitaux propres) détermine ta capacité d'emprunt : un prêt est plafonné à ${MAX_LOAN_PRINCIPAL_EQUITY_RATIO}× tes fonds propres actuels, et son taux dépend du ratio dette/fonds propres au moment de l'emprunt.`}
                realWorld="C'est exactement la logique d'évaluation du risque de crédit d'une vraie banque : plus une entreprise est déjà endettée par rapport à ses fonds propres (effet de levier élevé), plus le prêteur exige un taux élevé pour compenser le risque de défaut."
                tip="Un ratio dette/fonds propres proche de 1 ou en dessous garde ton taux d'emprunt proche du taux de base — au-delà, chaque euro emprunté coûte plus cher."
              />
              <span>Finance & bilan</span>
            </h2>
            <div className={styles.jobStats}>
              <span>
                <StatHint hint="Trésorerie + équipement (déprécié dans le temps) + stock invendu + créances éventuelles (prêts accordés à d'autres entreprises) — tout ce que l'entreprise possède ou lui est dû.">
                  🏛️ Actif total {currencyFormatter.format(company.balanceSheet.totalAssets)}
                </StatHint>
              </span>
              <span>
                <StatHint hint="Capital restant dû sur tous les emprunts actifs de l'entreprise — ce qu'elle doit rembourser.">
                  📉 Dettes {currencyFormatter.format(company.balanceSheet.totalLiabilities)}
                </StatHint>
              </span>
              <span>
                <StatHint hint="Actif total moins dettes — ce qui reviendrait aux actionnaires si l'entreprise liquidait tout aujourd'hui. Détermine ta capacité d'emprunt maximale (voir l'astuce ci-dessus).">
                  💎 Capitaux propres {currencyFormatter.format(company.balanceSheet.equity)}
                </StatHint>
              </span>
              <span>
                <StatHint hint="Dettes ÷ capitaux propres — plus il est élevé, plus l'entreprise est endettée relativement à ce qu'elle possède réellement, et plus le taux d'un nouvel emprunt sera élevé.">
                  ⚖️ Ratio dette/fonds propres {company.balanceSheet.debtToEquityRatio.toFixed(2)}
                </StatHint>
              </span>
            </div>

            {company.loans.length > 0 && (
              <div className={styles.jobList}>
                {company.loans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} />
                ))}
              </div>
            )}

            {company.isPrimaryOwner ? (
              company.hasDefaultedLoan ? (
                <p className={styles.jobWarning}>
                  ⚠ Un prêt de cette entreprise est en défaut de paiement — impossible d'emprunter à nouveau tant
                  qu'il n'est pas soldé.
                </p>
              ) : (
                <>
                  <p className={styles.jobMeta}>
                    Emprunt bancaire — taux fixé selon le ratio dette/fonds propres au moment de l'emprunt,
                    plafonné à {MAX_LOAN_PRINCIPAL_EQUITY_RATIO}× les fonds propres actuels ({currencyFormatter.format(
                      Math.max(0, company.balanceSheet.equity * MAX_LOAN_PRINCIPAL_EQUITY_RATIO),
                    )}
                    ) :
                  </p>
                  <LoanRequestForm
                    companyId={company.id}
                    maxPrincipal={Math.max(0, company.balanceSheet.equity * MAX_LOAN_PRINCIPAL_EQUITY_RATIO)}
                    onDone={handleDone}
                  />
                </>
              )
            ) : (
              <p className={styles.jobMeta}>Seul l'actionnaire principal peut emprunter au nom de l'entreprise.</p>
            )}
          </section>

          <DistributionSection company={company} onDone={handleDone} />

          <BankingSection company={company} bankReliability={bankReliability} onDone={handleDone} />

          <LoanOffersSection company={company} onDone={handleDone} />

          <InsuranceSection
            companyId={company.id}
            isPrimaryOwner={company.isPrimaryOwner}
            insurance={insurance}
            offers={insuranceOffers}
            onDone={handleDone}
          />
        </>
      )}

      {activeTab === "ownership" && (
        <>
          <p className={styles.jobMeta}>
            Qui possède l'entreprise, comment lever du capital, voter une résolution, ou en céder tout ou partie du
            contrôle.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <InfoTip
                label="🤝"
                title="Actionnariat"
                mechanic="Chaque actionnaire détient un pourcentage de parts de l'entreprise ; tu peux en mettre une partie en vente librement sur le marché public, à un prix que tu fixes toi-même."
                realWorld="C'est un marché d'actions simplifié : contrairement à une bourse cotée où le prix est fixé en continu par l'offre et la demande, ici chaque vendeur fixe son propre prix — plus proche d'un marché de gré à gré (over-the-counter) pour une PME non cotée."
              />
              <span>Actionnariat</span>
            </h2>
            <div className={styles.jobStats}>
              {company.shareholders.map((s) => (
                <span key={s.pseudo}>
                  {s.pseudo} : {s.sharePercentage}%
                </span>
              ))}
            </div>

            {company.sharePercentage > 0 && (
              <>
                <p className={styles.jobMeta}>🏷️ Mettre une partie de tes parts en vente sur le marché :</p>
                <ShareListingForm companyId={company.id} maxPercentage={company.sharePercentage} onDone={handleDone} />
              </>
            )}

            {company.openListings.length > 0 && (
              <div className={styles.jobList}>
                {company.openListings.map((listing) => (
                  <ListingRow key={listing.id} listing={listing} onDone={handleDone} />
                ))}
              </div>
            )}
          </section>

          <GovernanceSection company={company} proposals={proposals} onDone={handleDone} />

          <CapitalRaiseSection company={company} raise={capitalRaise} onDone={handleDone} />

          <SaleSection company={company} listing={saleListing} bids={saleBids} onDone={handleDone} />

          <TenderOfferSection
            company={company}
            offers={tenderOffers}
            myPseudo={myPseudo}
            myControlledCompanies={myControlledCompanies}
            onDone={handleDone}
          />

          <GroupSection company={company} />
        </>
      )}
    </main>
  );
}
