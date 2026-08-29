import { cookies } from "next/headers";
import { API_BASE_URL } from "./config";

export interface PlayerStats {
  wealthLiquid: number;
  wealthDisplayed: number;
  reputation: number;
  experience: number;
  wellbeing: number;
}

export interface CareerTierView {
  id: string;
  label: string;
  salaryMultiplier: number;
  nextTierLabel: string | null;
  cyclesToNextTier: number | null;
}

export interface EmploymentView {
  role: string;
  sector: string | null;
  pressure: number | null;
  reputationPerCycle: number | null;
  employerCompanyId: string | null;
  employerCompanyName: string | null;
  salaryPerCycle: number;
  estimatedNetPerCycle: number;
  estimatedWellbeingDrainPerCycle: number;
  sectorExperienceCycles: number;
  startedCycle: number;
  careerTier: CareerTierView;
}

export interface IndependentActivityView {
  id: string;
  grossRevenuePerCycle: number;
  startedCycle: number;
}

export async function getIndependentActivity(): Promise<IndependentActivityView | null> {
  const res = await fetchWithSessionCookie("/independent-activity");
  if (!res.ok) return null;
  // Nest renvoie un corps vide (Content-Length: 0) pour un contrôleur qui
  // retourne `null` directement — res.json() planterait sur un corps vide.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export interface AchievementView {
  id: string;
  label: string;
  description: string;
  reward: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export async function getAchievements(): Promise<AchievementView[]> {
  const res = await fetchWithSessionCookie("/engagement/achievements");
  if (!res.ok) return [];
  return res.json();
}

export interface DailyBonusStatus {
  streak: number;
  claimedToday: boolean;
  nextReward: number;
}

export async function getDailyBonusStatus(): Promise<DailyBonusStatus | null> {
  const res = await fetchWithSessionCookie("/engagement/daily-bonus");
  if (!res.ok) return null;
  return res.json();
}

export interface QuizStatus {
  available: boolean;
  secondsRemaining: number;
  cooldownSeconds: number;
  reward: number;
  question: { id: string; topic: string; prompt: string } | null;
}

export async function getQuizStatus(): Promise<QuizStatus | null> {
  const res = await fetchWithSessionCookie("/quiz");
  if (!res.ok) return null;
  return res.json();
}

export interface Player {
  id: string;
  email: string;
  pseudo: string;
  createdAt: string;
  stats: PlayerStats | null;
  employment: EmploymentView | null;
}

export interface WealthBreakdownView {
  wealthLiquid: number;
  propertyEquity: number;
  companyEquity: number;
  commodityValue: number;
  savingsValue: number;
  personalGoodsValue: number;
  financialAssetsValue: number;
  total: number;
}

export async function getWealthBreakdown(): Promise<WealthBreakdownView | null> {
  const res = await fetchWithSessionCookie("/players/me/wealth-breakdown");
  if (!res.ok) return null;
  return res.json();
}

export interface WealthHistoryPoint {
  cycleNumber: number;
  netWorth: number;
  reputation: number;
  wellbeing: number;
}

export async function getWealthHistory(): Promise<WealthHistoryPoint[]> {
  const res = await fetchWithSessionCookie("/players/me/wealth-history");
  if (!res.ok) return [];
  return res.json();
}

export interface CycleReportLineView {
  label: string;
  grossAmount: number | null;
  taxAmount: number | null;
  netAmount: number;
}

export interface CycleReportView {
  cycleNumber: number;
  salaryIncome: number;
  independentActivityIncome: number;
  dividendIncome: number;
  rentIncome: number;
  mortgagePayment: number;
  lifeEventDelta: number;
  assetDividendCashIncome: number;
  assetDividendReinvestedValue: number;
  savingsInterestAccrued: number;
  achievementReward: number;
  bankFailurePayout: number;
  lines: Record<string, CycleReportLineView[]>;
  totalLiquidChange: number;
}

export async function getLatestCycleReport(): Promise<CycleReportView | null> {
  const res = await fetchWithSessionCookie("/players/me/cycle-report");
  if (!res.ok) return null;
  // Nest renvoie un corps vide (Content-Length: 0) pour un contrôleur qui
  // retourne `null` directement — res.json() planterait sur un corps vide.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export interface JobOffer {
  id: string;
  title: string;
  sector: string;
  annualGrossSalary: number;
  pressure: number;
  reputationPerCycle: number;
  minReputation?: number;
  locked: boolean;
  estimatedNetPerCycle: number;
  estimatedWellbeingDrainPerCycle: number;
  sectorExperienceCycles: number;
  reconversionPenalty: number;
  careerTier: CareerTierView;
}

export interface CurrentCycle {
  number: number;
  status: string;
  startedAt: string;
  closesAt: string;
  durationMs: number;
}

export interface Sector {
  id: string;
  name: string;
  level: number;
  parentSectorId: string | null;
}

export interface Municipality {
  id: string;
  name: string;
  region: { name: string };
}

export interface CompanyCycleReport {
  revenue: number;
  costs: number;
  profit: number;
  taxPaid: number;
  netProfit: number;
  eventLabel: string | null;
  unitsProduced: number;
  unitsSold: number;
  unitsLost: number;
  stockUnits: number;
  tip: string | null;
}

export interface CompanyCycleReportLine {
  category: string;
  sourceId: string;
  label: string;
  netAmount: number;
}

export interface ProductCycleReport {
  unitsProduced: number;
  unitsSold: number;
  unitsLost: number;
  unitCost: number;
  revenue: number;
  marketSharePercent: number;
  margin: number;
  marginPercent: number;
  conversionPercent: number;
}

export interface SectorCompetitor {
  name: string;
  competitiveness: number;
}

export interface ProductPricing {
  acceptedReferencePrice: number;
  priceElasticity: number;
  priceMultiplierCap: number;
  currentPriceMultiplier: number;
}

export interface Product {
  id: string;
  type: string;
  label: string;
  isCore: boolean;
  unitPrice: number;
  capacityAllocation: number;
  stockUnits: number;
  launchedCycle: number;
  pricing: ProductPricing;
  latestCycleReport: ProductCycleReport | null;
}

export interface ProductCatalogEntry {
  type: string;
  label: string;
  description: string;
  unlockInnovationLevel: number;
  isUnlocked: boolean;
  launchCost: number;
}

export interface CompanyLevels {
  marketing: number;
  quality: number;
  equipment: number;
  workConditions: number;
  automation: number;
  branding: number;
  innovation: number;
  training: number;
  safety: number;
  insurance: number;
}

export interface EmployeeCounts {
  unskilled: number;
  qualified: number;
  specialist: number;
}

export interface CompanyDepartmentView {
  department: string;
  label: string;
  hasManager: boolean;
  morale: number;
  employeeCounts: EmployeeCounts;
  totalEmployeeCount: number;
  experienceCycles: number;
  experienceBonus: number;
}

export interface AttractivenessBreakdown {
  base: number;
  managerBonus: number;
  infrastructureBonus: number;
  provinceAffinityBonus: number;
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  municipality: string;
  attractivenessScore: number;
  effectiveAttractiveness: number;
  attractivenessBreakdown: AttractivenessBreakdown;
  status: string;
  createdAt: string;
  hasManager: boolean;
  departments: CompanyDepartmentView[];
  totalEmployeeCount: number;
  foundedCycle: number;
  cyclesActive: number;
  valorizationMultiplier: number;
  cumulativeNetProfit: number;
  sharePercentage: number;
  levels: CompanyLevels;
  capacityExpansionInvestment: number;
  capacityExpansionMultiplier: number;
  massMarketingCampaign: { magnitude: number; cyclesRemaining: number } | null;
  exportUnlocked: boolean;
  exportUnlockedCycle: number | null;
  cashReserve: number;
  treasuryInvestment: number;
  treasuryYieldPerCycle: number;
  distributionPolicy: string;
  autoReinvestAxis: string | null;
  autoReinvestCapPerCycle: number | null;
  depositRate: number;
  totalDeposits: number;
  liquidationReserve: number;
  liquidationReserveSinceCycle: number | null;
  liquidationReserveIsMature: boolean;
  liquidationReserveMatureAtCycle: number | null;
  latestCycleReport: CompanyCycleReport | null;
  products: Product[];
}

export interface Shareholder {
  pseudo: string;
  sharePercentage: number;
}

export interface CompanyShareOffer {
  id: string;
  sellerPseudo: string;
  isMine: boolean;
  sharePercentage: number;
  price: number;
}

export interface BalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  debtToEquityRatio: number;
}

export interface CompanyLoan {
  id: string;
  principal: number;
  rate: number;
  termCycles: number;
  remainingBalance: number;
  status: "ACTIVE" | "PAID" | "DEFAULTED";
  originatedCycle: number;
}

export interface CompanyLoanOffer {
  id: string;
  principal: number;
  rate: number;
  termCycles: number;
}

export interface CompanyLoanReceivable {
  id: string;
  principal: number;
  rate: number;
  termCycles: number;
  remainingBalance: number;
}

export interface HoldingLink {
  id: string;
  name: string;
  sharePercentage: number;
}

export interface CompanyDetail extends Company {
  isPrimaryOwner: boolean;
  shareholders: Shareholder[];
  openListings: CompanyShareOffer[];
  productCatalog: ProductCatalogEntry[];
  sectorCompetitors: SectorCompetitor[];
  activePlayerCompetitorsCount: number;
  balanceSheet: BalanceSheet;
  loans: CompanyLoan[];
  hasDefaultedLoan: boolean;
  loanOffers: CompanyLoanOffer[];
  loansAsLender: CompanyLoanReceivable[];
  /** Groupe/holding (cf. CompanyShare.holderCompany) — filiales détenues par cette entreprise. */
  subsidiaries: HoldingLink[];
  /** Société-mère qui détient des parts de celle-ci, le cas échéant. */
  parentHolding: HoldingLink | null;
}

export interface MarketListing {
  id: string;
  sellerPseudo: string;
  sharePercentage: number;
  price: number;
  company: {
    id: string;
    name: string;
    sector: string;
    municipality: string;
    attractivenessScore: number;
    latestNetProfitPerCycle: number | null;
  };
}

export interface ExpansionRequirement {
  minCyclesActive: number;
  minCumulativeNetProfit: number;
}

export interface MyCompanies {
  companies: Company[];
  nextFoundingCost: number;
  canFoundAnother: boolean;
  expansionRequirement: ExpansionRequirement | null;
}

export class ApiUnreachableError extends Error {}

async function fetchWithSessionCookie(path: string): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Cookie: `token=${token}` } : undefined,
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiUnreachableError(`Impossible de contacter l'API sur ${API_BASE_URL}`, { cause });
  }
}

export async function getCurrentPlayer(): Promise<Player | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get("token")?.value) return null;

  const res = await fetchWithSessionCookie("/players/me");
  if (!res.ok) return null;
  return res.json();
}

export async function getJobs(): Promise<JobOffer[]> {
  const res = await fetchWithSessionCookie("/jobs");
  if (!res.ok) return [];
  return res.json();
}

export interface JobPostingView {
  id: string;
  role: string;
  salaryPerCycle: number;
  pressure: number;
  company: {
    id: string;
    name: string;
    sector: string;
    municipality: string;
  };
}

export async function getJobPostings(): Promise<JobPostingView[]> {
  const res = await fetchWithSessionCookie("/job-postings");
  if (!res.ok) return [];
  return res.json();
}

export interface CompanyStaffView {
  openPostings: { id: string; role: string; salaryPerCycle: number; pressure: number }[];
  employees: {
    employmentId: string;
    playerPseudo: string;
    role: string;
    salaryPerCycle: number;
    pressure: number | null;
    startedCycle: number;
  }[];
}

export async function getCompanyStaff(companyId: string): Promise<CompanyStaffView | null> {
  const res = await fetchWithSessionCookie(`/companies/${companyId}/staff`);
  if (!res.ok) return null;
  return res.json();
}

export interface InsuranceOfferView {
  id: string;
  premiumPerCycle: number;
  coverageCap: number;
  insurerCompany: { id: string; name: string; sector: string; municipality: string };
}

export async function getInsuranceOffers(): Promise<InsuranceOfferView[]> {
  const res = await fetchWithSessionCookie("/insurance-offers");
  if (!res.ok) return [];
  return res.json();
}

export interface CompanyInsuranceView {
  activePolicy: {
    id: string;
    premiumPerCycle: number;
    coverageCap: number;
    insurerName: string;
    isSystem: boolean;
    startedCycle: number | null;
  } | null;
  offersAsInsurer: {
    id: string;
    premiumPerCycle: number;
    coverageCap: number;
    status: "OPEN" | "ACTIVE" | "CANCELLED" | "LAPSED";
    insuredCompanyName: string | null;
  }[];
}

export async function getCompanyInsurance(companyId: string): Promise<CompanyInsuranceView | null> {
  const res = await fetchWithSessionCookie(`/companies/${companyId}/insurance`);
  if (!res.ok) return null;
  return res.json();
}

export interface SaleListingView {
  id: string;
  companyId: string;
  companyName: string;
  sector: string;
  municipality: string;
  sharePercentage: number;
  askingPricePerPercent: number | null;
  bidCount: number;
  createdCycle: number;
  expiresCycle: number;
  cyclesRemaining: number;
}

export async function getSaleListings(): Promise<SaleListingView[]> {
  const res = await fetchWithSessionCookie("/sale-listings");
  if (!res.ok) return [];
  return res.json();
}

export interface SaleBidView {
  id: string;
  buyerPseudo: string;
  pricePerPercent: number;
  totalPrice: number;
  createdCycle: number;
}

export async function getSaleBids(listingId: string): Promise<SaleBidView[]> {
  const res = await fetchWithSessionCookie(`/sale-listings/${listingId}/bids`);
  if (!res.ok) return [];
  return res.json();
}

export interface CapitalRaiseView {
  id: string;
  companyId: string;
  companyName: string;
  sector: string;
  municipality: string;
  targetAmount: number;
  newSharePercentage: number;
  createdCycle: number;
  expiresCycle: number;
  cyclesRemaining: number;
  companyAgeCycles: number;
  cumulativeNetProfit: number;
  cashReserve: number;
  attractivenessScore: number;
  amountRaised: number;
  remainingAmount: number;
}

export interface CapitalRaiseContributionView {
  investorPseudo: string;
  amount: number;
  sharePercentage: number;
  cycle: number;
}

export async function getCapitalRaises(): Promise<CapitalRaiseView[]> {
  const res = await fetchWithSessionCookie("/capital-raises");
  if (!res.ok) return [];
  return res.json();
}

export interface ProposalView {
  id: string;
  proposerPseudo: string;
  type: "SET_DISTRIBUTION_POLICY" | "INVEST";
  payload: { distributionPolicy: "dividend" | "reserve" } | { axis: string; amount: number };
  status: "OPEN" | "APPROVED" | "REJECTED";
  forWeight: number;
  againstWeight: number;
  myVote: boolean | null;
  createdCycle: number;
  expiresCycle: number;
}

export async function getProposals(companyId: string): Promise<ProposalView[]> {
  const res = await fetchWithSessionCookie(`/companies/${companyId}/proposals`);
  if (!res.ok) return [];
  return res.json();
}

export async function getCurrentCycle(): Promise<CurrentCycle | null> {
  const res = await fetchWithSessionCookie("/cycles/current");
  if (!res.ok) return null;
  return res.json();
}

export async function getFoundableSectors(): Promise<Sector[]> {
  const res = await fetchWithSessionCookie("/sectors");
  if (!res.ok) return [];
  return res.json();
}

export async function getMunicipalities(): Promise<Municipality[]> {
  const res = await fetchWithSessionCookie("/municipalities");
  if (!res.ok) return [];
  return res.json();
}

export interface MunicipalitySummaryView {
  id: string;
  infrastructureFund: number;
  attractivenessBonus: number;
  localDemandBonus: number;
  registrationDutyRate: number;
  additionalTaxRate: number;
  annualPropertyTaxRate: number;
}

export async function getMunicipalitySummary(municipalityId: string): Promise<MunicipalitySummaryView | null> {
  const res = await fetchWithSessionCookie(`/municipalities/${municipalityId}/summary`);
  if (!res.ok) return null;
  return res.json();
}

export interface MunicipalityContributorView {
  playerPseudo: string;
  amount: number;
}

export async function getMunicipalityContributors(municipalityId: string): Promise<MunicipalityContributorView[]> {
  const res = await fetchWithSessionCookie(`/municipalities/${municipalityId}/contributors`);
  if (!res.ok) return [];
  return res.json();
}

export interface CouncilProposalView {
  id: string;
  proposerPseudo: string;
  newRegistrationDutyRate: number;
  status: "OPEN" | "APPROVED" | "REJECTED";
  forWeight: number;
  againstWeight: number;
  createdCycle: number;
  expiresCycle: number;
}

export async function getCouncilProposals(municipalityId: string): Promise<CouncilProposalView[]> {
  const res = await fetchWithSessionCookie(`/municipalities/${municipalityId}/proposals`);
  if (!res.ok) return [];
  return res.json();
}

export interface ResidenceView {
  municipalityId: string | null;
  municipalityName: string | null;
  cyclesRemaining: number;
  available: boolean;
  cost: number;
}

const EMPTY_RESIDENCE: ResidenceView = { municipalityId: null, municipalityName: null, cyclesRemaining: 0, available: true, cost: 0 };

export async function getResidence(): Promise<ResidenceView> {
  const res = await fetchWithSessionCookie("/municipalities/residence");
  if (!res.ok) return EMPTY_RESIDENCE;
  return res.json();
}

export interface ProvinceRankingEntry {
  id: string;
  name: string;
  regionName: string;
  infrastructureFund: number;
  activeCompanyCount: number;
  residentCount: number;
  residentWealth: number;
}

export async function getProvinceRanking(): Promise<ProvinceRankingEntry[]> {
  const res = await fetchWithSessionCookie("/municipalities/ranking");
  if (!res.ok) return [];
  return res.json();
}

const EMPTY_COMPANIES: MyCompanies = {
  companies: [],
  nextFoundingCost: 0,
  canFoundAnother: false,
  expansionRequirement: null,
};

export async function getMyCompanies(): Promise<MyCompanies> {
  const res = await fetchWithSessionCookie("/companies/me");
  if (!res.ok) return EMPTY_COMPANIES;
  return res.json();
}

export async function getCompany(id: string): Promise<CompanyDetail | null> {
  const res = await fetchWithSessionCookie(`/companies/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getCompanyCycleReportLines(id: string): Promise<CompanyCycleReportLine[]> {
  const res = await fetchWithSessionCookie(`/companies/${id}/cycle-report-lines`);
  if (!res.ok) return [];
  return res.json();
}

export interface GroupCompanySummary {
  id: string;
  name: string;
  sector: string;
  municipality: string;
  isSubsidiary: boolean;
  cashReserve: number;
  cumulativeNetProfit: number;
  latestRevenue: number;
  latestNetProfit: number;
  valorizationMultiplier: number;
}

export interface GroupOverview {
  companies: GroupCompanySummary[];
  totalCashReserve: number;
  totalCumulativeNetProfit: number;
  totalLatestRevenue: number;
  totalLatestNetProfit: number;
  worstPerformerId: string | null;
}

const EMPTY_GROUP_OVERVIEW: GroupOverview = {
  companies: [],
  totalCashReserve: 0,
  totalCumulativeNetProfit: 0,
  totalLatestRevenue: 0,
  totalLatestNetProfit: 0,
  worstPerformerId: null,
};

export async function getGroupOverview(): Promise<GroupOverview> {
  const res = await fetchWithSessionCookie("/companies/group-overview");
  if (!res.ok) return EMPTY_GROUP_OVERVIEW;
  return res.json();
}

export interface SupplyContractView {
  id: string;
  role: "buyer" | "seller";
  counterpartyName: string;
  sectorName: string;
  quantity: number;
  price: number;
  total: number;
  cycleNumber: number;
}

export async function getSupplyContracts(companyId: string): Promise<SupplyContractView[]> {
  const res = await fetchWithSessionCookie(`/companies/${companyId}/supply-contracts`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMarketplace(): Promise<MarketListing[]> {
  const res = await fetchWithSessionCookie("/market");
  if (!res.ok) return [];
  return res.json();
}

export interface CommodityMarketView {
  sectorId: string;
  sector: string;
  price: number;
  previousPrice: number | null;
  commodityReserve: number;
  cashReserve: number;
  myHolding: number;
}

export async function getCommodityMarkets(): Promise<CommodityMarketView[]> {
  const res = await fetchWithSessionCookie("/commodities");
  if (!res.ok) return [];
  return res.json();
}

export interface PropertyLease {
  rentAmount: number;
  startedCycle: number;
}

export interface PropertyMortgage {
  principal: number;
  rate: number;
  termCycles: number;
  remainingBalance: number;
}

export interface PropertyAuctionSummary {
  startingPrice: number;
  currentPrice: number;
  minNextBid: number;
  bidCount: number;
  expiresAt: string;
  isLeader: boolean;
  myMaxBid: number | null;
}

export interface PropertyView {
  id: string;
  type: string;
  status: string;
  customName: string | null;
  baseRent: number;
  marketValue: number;
  condition: number;
  renovationCost: number;
  municipality: string;
  region: string;
  hasOwner: boolean;
  lease: PropertyLease | null;
  mortgage: PropertyMortgage | null;
  maxMortgagePrincipal: number;
  listingPrice: number | null;
  auction: PropertyAuctionSummary | null;
}

export interface RegistrationDuty {
  rate: number;
  amount: number;
  isReducedRate: boolean;
}

export interface PropertyListingView {
  listingId: string;
  price: number;
  isAuction: boolean;
  auction: PropertyAuctionSummary | null;
  registrationDuty: RegistrationDuty;
  property: PropertyView;
}

export async function getPropertyMarket(): Promise<PropertyListingView[]> {
  const res = await fetchWithSessionCookie("/properties");
  if (!res.ok) return [];
  return res.json();
}

export async function getMyProperties(): Promise<PropertyView[]> {
  const res = await fetchWithSessionCookie("/properties/me");
  if (!res.ok) return [];
  return res.json();
}

export interface PrestigePropertyView {
  id: string;
  customName: string;
  ownerPseudo: string;
  municipality: string;
  region: string;
  condition: number;
}

export async function getPrestigeProperties(): Promise<PrestigePropertyView[]> {
  const res = await fetchWithSessionCookie("/properties/prestige");
  if (!res.ok) return [];
  return res.json();
}

export interface GigView {
  id: string;
  label: string;
  description: string;
  minReward: number;
  maxReward: number;
  wellbeingCost: number;
  cooldownSeconds: number;
  minReputation: number;
  unlocked: boolean;
  secondsRemaining: number;
  available: boolean;
}

export async function getGigs(): Promise<GigView[]> {
  const res = await fetchWithSessionCookie("/gigs");
  if (!res.ok) return [];
  return res.json();
}

export interface FinancialAssetView {
  id: string;
  key: string;
  name: string;
  type: string;
  sectorName: string | null;
  dividendRate: number;
  price: number;
  previousPrice: number;
  quantity: number;
  costBasis: number;
  marketValue: number;
  unrealizedGain: number;
  dividendPolicy: "CASH" | "REINVEST";
}

export async function getFinancialAssets(): Promise<FinancialAssetView[]> {
  const res = await fetchWithSessionCookie("/financial-assets");
  if (!res.ok) return [];
  return res.json();
}

export interface AssetPricePoint {
  cycleNumber: number;
  price: number;
}

export async function getFinancialAssetPriceHistory(): Promise<Record<string, AssetPricePoint[]>> {
  const res = await fetchWithSessionCookie("/financial-assets/price-history");
  if (!res.ok) return {};
  return res.json();
}

export interface GuildMemberView {
  companyId: string;
  companyName: string;
  playerId: string;
}

export interface GuildDetectionRiskView {
  probability: number;
  baseRate: number;
  priceExcessContribution: number;
  memberCountContribution: number;
  cappedAtMax: boolean;
}

export interface GuildView {
  id: string;
  name: string;
  sectorId: string;
  sectorName: string;
  priceFloor: number;
  founderPlayerId: string;
  createdCycle: number;
  members: GuildMemberView[];
  detectionRisk: GuildDetectionRiskView;
}

export async function getGuilds(): Promise<GuildView[]> {
  const res = await fetchWithSessionCookie("/guilds");
  if (!res.ok) return [];
  return res.json();
}

export interface GuildMessageView {
  id: string;
  authorPseudo: string;
  body: string;
  cycle: number;
  createdAt: string;
}

export async function getGuildMessages(guildId: string): Promise<GuildMessageView[]> {
  const res = await fetchWithSessionCookie(`/guilds/${guildId}/messages`);
  if (!res.ok) return [];
  return res.json();
}

export interface CauseView {
  id: string;
  name: string;
  description: string;
}

export async function getCauses(): Promise<CauseView[]> {
  const res = await fetchWithSessionCookie("/donations/causes");
  if (!res.ok) return [];
  return res.json();
}

export interface CauseDonationStatus {
  taxReductionRate: number;
  annualCap: number;
  donatedThisYear: number;
  remainingCap: number;
}

export async function getCauseDonationStatus(): Promise<CauseDonationStatus | null> {
  const res = await fetchWithSessionCookie("/donations/causes/status");
  if (!res.ok) return null;
  return res.json();
}

export interface TenderOfferView {
  id: string;
  companyId: string;
  companyName: string;
  sector: string;
  municipality: string;
  acquirerPseudo: string;
  pricePerPercent: number;
  createdCycle: number;
  expiresCycle: number;
  cyclesRemaining: number;
}

export async function getTenderOffers(): Promise<TenderOfferView[]> {
  const res = await fetchWithSessionCookie("/tender-offers");
  if (!res.ok) return [];
  return res.json();
}

export async function getCompanyTenderOffers(companyId: string): Promise<TenderOfferView[]> {
  const res = await fetchWithSessionCookie(`/companies/${companyId}/tender-offers`);
  if (!res.ok) return [];
  return res.json();
}

export interface PressArticleView {
  id: string;
  category: "BANKRUPTCY" | "CARTEL_BUST" | "HOSTILE_TAKEOVER" | "AUCTION_WON";
  headline: string;
  cycle: number;
  createdAt: string;
}

export async function getPressArticles(): Promise<PressArticleView[]> {
  const res = await fetchWithSessionCookie("/press");
  if (!res.ok) return [];
  return res.json();
}

export interface PersonalAxisView {
  axis: string;
  label: string;
  description: string;
  investment: number;
  level: number;
  cyclesRemaining: number;
  available: boolean;
}

export interface PersonalActionView {
  id: string;
  label: string;
  description: string;
  cost: number;
  wellbeingBoost: number;
  cooldownCycles: number;
  cyclesRemaining: number;
  available: boolean;
}

export interface PersonalOverview {
  wellbeing: number;
  axes: PersonalAxisView[];
  actions: PersonalActionView[];
}

const EMPTY_PERSONAL_OVERVIEW: PersonalOverview = { wellbeing: 50, axes: [], actions: [] };

export async function getPersonalOverview(): Promise<PersonalOverview> {
  const res = await fetchWithSessionCookie("/personal");
  if (!res.ok) return EMPTY_PERSONAL_OVERVIEW;
  return res.json();
}

export interface WellbeingCycleLine {
  category: string;
  sourceId: string;
  label: string;
  delta: number;
}

export async function getWellbeingCycleLines(): Promise<WellbeingCycleLine[]> {
  const res = await fetchWithSessionCookie("/personal/wellbeing-cycle-lines");
  if (!res.ok) return [];
  return res.json();
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  pseudo: string;
  value: number;
  isMe: boolean;
}

export async function getLeaderboard(metric: string, window: number): Promise<LeaderboardEntry[]> {
  const res = await fetchWithSessionCookie(`/leaderboard?metric=${metric}&window=${window}`);
  if (!res.ok) return [];
  return res.json();
}

export interface SavingsAccountView {
  id: string;
  productType: string;
  principal: number;
  balance: number;
  rate: number;
  termCycles: number;
  openedCycle: number;
  maturityCycle: number | null;
  isMature: boolean;
}

export async function getSavingsAccounts(): Promise<SavingsAccountView[]> {
  const res = await fetchWithSessionCookie("/savings");
  if (!res.ok) return [];
  return res.json();
}

export interface PensionSavingsStatus {
  taxReductionRate: number;
  annualCap: number;
  contributedThisYear: number;
  remainingCap: number;
}

export async function getPensionSavingsStatus(): Promise<PensionSavingsStatus | null> {
  const res = await fetchWithSessionCookie("/savings/pension-status");
  if (!res.ok) return null;
  return res.json();
}

export interface LoanOfferView {
  id: string;
  principal: number;
  rate: number;
  termCycles: number;
  lenderCompany: {
    id: string;
    name: string;
    sector: string;
    municipality: string;
    reliability: number;
  };
}

export interface BankReliabilityView {
  reliability: number;
  equity: number;
  outstandingLoans: number;
  solvencyCap: number;
}

export async function getBankReliability(companyId: string): Promise<BankReliabilityView | null> {
  const res = await fetchWithSessionCookie(`/companies/${companyId}/bank-reliability`);
  if (!res.ok) return null;
  return res.json();
}

export async function getLoanOffers(): Promise<LoanOfferView[]> {
  const res = await fetchWithSessionCookie("/loan-offers");
  if (!res.ok) return [];
  return res.json();
}

export interface DepositView {
  id: string;
  companyId: string;
  companyName: string;
  companyActive: boolean;
  principal: number;
  balance: number;
  rate: number;
  depositedCycle: number;
}

export async function getMyDeposits(): Promise<DepositView[]> {
  const res = await fetchWithSessionCookie("/deposits/me");
  if (!res.ok) return [];
  return res.json();
}

export interface NotificationView {
  id: string;
  type: string;
  message: string;
  cycle: number;
  createdAt: string;
  read: boolean;
}

export interface NotificationsSummary {
  notifications: NotificationView[];
  unreadCount: number;
}

const EMPTY_NOTIFICATIONS: NotificationsSummary = { notifications: [], unreadCount: 0 };

export async function getNotifications(limit?: number): Promise<NotificationsSummary> {
  const res = await fetchWithSessionCookie(`/notifications${limit ? `?limit=${limit}` : ""}`);
  if (!res.ok) return EMPTY_NOTIFICATIONS;
  return res.json();
}

export async function getEmailAlertsPreference(): Promise<{ enabled: boolean }> {
  const res = await fetchWithSessionCookie("/notifications/email-alerts");
  if (!res.ok) return { enabled: false };
  return res.json();
}

export interface EmailOutboxEntry {
  id: string;
  subject: string;
  body: string;
  cycle: number;
  sentAt: string;
}

export async function getEmailOutbox(): Promise<EmailOutboxEntry[]> {
  const res = await fetchWithSessionCookie("/notifications/email-outbox");
  if (!res.ok) return [];
  return res.json();
}

export interface DigestPeriod {
  periodStartCycle: number;
  periodEndCycle: number;
  items: { id: string; type: string; message: string; cycle: number }[];
}

export async function getDigest(): Promise<DigestPeriod[]> {
  const res = await fetchWithSessionCookie("/notifications/digest");
  if (!res.ok) return [];
  return res.json();
}

export interface PersonalGoodCatalogEntry {
  id: string;
  category: string;
  label: string;
  description: string;
  price: number;
  wellbeingBonusPerCycle: number;
  depreciationRatePerCycle: number;
}

export interface PersonalGoodView {
  id: string;
  goodId: string;
  label: string;
  category: string;
  purchasePrice: number;
  purchasedCycle: number;
  currentValue: number;
  wellbeingBonusPerCycle: number;
}

export interface PersonalGoodsOverview {
  catalog: PersonalGoodCatalogEntry[];
  owned: PersonalGoodView[];
}

const EMPTY_PERSONAL_GOODS: PersonalGoodsOverview = { catalog: [], owned: [] };

export async function getPersonalGoods(): Promise<PersonalGoodsOverview> {
  const res = await fetchWithSessionCookie("/personal-goods");
  if (!res.ok) return EMPTY_PERSONAL_GOODS;
  return res.json();
}
