import Link from "next/link";
import type {
  Company,
  CommodityMarketView,
  FinancialAssetView,
  PersonalGoodView,
  PropertyView,
  SavingsAccountView,
} from "../../lib/session";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function EmptySection({ href, label }: { href: string; label: string }) {
  return (
    <p className={styles.jobMeta}>
      Aucune position pour l'instant. <Link href={href}>{label} →</Link>
    </p>
  );
}

function PlacementsPositions({ assets }: { assets: FinancialAssetView[] }) {
  if (assets.length === 0) return <EmptySection href="/placements" label="Voir les placements" />;
  return (
    <div className={styles.jobList}>
      {assets.map((asset) => (
        <div key={asset.id} className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{asset.name}</div>
            <div className={styles.jobMeta}>
              {asset.quantity.toFixed(4)} unités à {currencyFormatter.format(asset.price)}
              {asset.sectorName && ` — ${asset.sectorName}`}
            </div>
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>{currencyFormatter.format(asset.marketValue)}</div>
            <span className={styles.jobMeta}>
              {asset.unrealizedGain >= 0 ? "🟢" : "🔴"} {currencyFormatter.format(asset.unrealizedGain)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SavingsPositions({ accounts }: { accounts: SavingsAccountView[] }) {
  if (accounts.length === 0) return <EmptySection href="/epargne" label="Voir l'épargne" />;
  return (
    <div className={styles.jobList}>
      {accounts.map((account) => (
        <div key={account.id} className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{account.productType}</div>
            <div className={styles.jobMeta}>Taux {(account.rate * 100).toFixed(1)}%/an</div>
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>{currencyFormatter.format(account.balance)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyPositions({ companies }: { companies: Company[] }) {
  if (companies.length === 0) return <EmptySection href="/" label="Fonder ou rejoindre une entreprise" />;
  return (
    <div className={styles.jobList}>
      {companies.map((company) => (
        <Link key={company.id} href={`/companies/${company.id}`} className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{company.name}</div>
            <div className={styles.jobMeta}>
              {company.sector} — {company.municipality}
            </div>
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>{company.sharePercentage.toFixed(1)}%</div>
            <span className={styles.jobMeta}>part détenue</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PropertyPositions({ properties }: { properties: PropertyView[] }) {
  if (properties.length === 0) return <EmptySection href="/immobilier" label="Voir l'immobilier" />;
  return (
    <div className={styles.jobList}>
      {properties.map((property) => (
        <div key={property.id} className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{property.customName ?? property.type}</div>
            <div className={styles.jobMeta}>
              {property.municipality} — {property.lease ? "loué" : "vacant"} — état {property.condition.toFixed(0)}%
            </div>
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>{currencyFormatter.format(property.marketValue)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommodityPositions({ commodities }: { commodities: CommodityMarketView[] }) {
  if (commodities.length === 0) return <EmptySection href="/bourse" label="Voir la bourse de matières premières" />;
  return (
    <div className={styles.jobList}>
      {commodities.map((commodity) => (
        <div key={commodity.sectorId} className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{commodity.sector}</div>
            <div className={styles.jobMeta}>
              {commodity.myHolding.toFixed(2)} unités à {currencyFormatter.format(commodity.price)}
            </div>
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>{currencyFormatter.format(commodity.myHolding * commodity.price)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonalGoodPositions({ goods }: { goods: PersonalGoodView[] }) {
  if (goods.length === 0) return <EmptySection href="/bien-etre" label="Voir les biens personnels" />;
  return (
    <div className={styles.jobList}>
      {goods.map((good) => (
        <div key={good.id} className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{good.label}</div>
            <div className={styles.jobMeta}>Acheté {currencyFormatter.format(good.purchasePrice)}</div>
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>{currencyFormatter.format(good.currentValue)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PortfolioSections({
  assets,
  savings,
  companies,
  properties,
  commodities,
  personalGoods,
}: {
  assets: FinancialAssetView[];
  savings: SavingsAccountView[];
  companies: Company[];
  properties: PropertyView[];
  commodities: CommodityMarketView[];
  personalGoods: PersonalGoodView[];
}) {
  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📈 Placements</h2>
        <PlacementsPositions assets={assets} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🐷 Épargne</h2>
        <SavingsPositions accounts={savings} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🏢 Entreprises</h2>
        <CompanyPositions companies={companies} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🏠 Immobilier</h2>
        <PropertyPositions properties={properties} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🌾 Matières premières</h2>
        <CommodityPositions commodities={commodities} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🛍️ Biens personnels</h2>
        <PersonalGoodPositions goods={personalGoods} />
      </section>
    </>
  );
}
