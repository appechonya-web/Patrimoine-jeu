import type {
  CompteTermeCycles,
  Department,
  InvestmentAxis,
  LeaderboardGrowthWindowCycles,
  LeaderboardMetric,
  PersonalAxis,
  ProductType,
  SavingsProductType,
} from "@patrimoine-jeu/domain";
import { deleteJson, getJson, postJson } from "./api-client";
import type {
  CapitalRaiseContributionView,
  Company,
  CompanyLoanOffer,
  EmploymentView,
  FinancialAssetView,
  GuildMessageView,
  GuildView,
  IndependentActivityView,
  LeaderboardEntry,
  LoanOfferView,
  PersonalGoodView,
  PersonalOverview,
  PropertyView,
  SavingsAccountView,
  TenderOfferView,
} from "./session";

export type { InvestmentAxis, PersonalAxis };

export { ApiClientError as GameError } from "./api-client";

export function takeJob(jobId: string): Promise<EmploymentView & { reconversionPenalty: number }> {
  return postJson("/employment", { jobId });
}

export function quitJob(): Promise<{ quit: boolean }> {
  return deleteJson("/employment");
}

export function createJobPosting(
  companyId: string,
  role: string,
  salary: number,
  pressure: number,
): Promise<{ id: string }> {
  return postJson(`/companies/${companyId}/job-postings`, { role, salary, pressure });
}

export function cancelJobPosting(postingId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/job-postings/${postingId}`);
}

export function applyToJobPosting(postingId: string): Promise<EmploymentView & { reconversionPenalty: number }> {
  return postJson(`/job-postings/${postingId}/apply`);
}

export function fireCompanyEmployee(employmentId: string): Promise<{ fired: boolean }> {
  return postJson(`/employment/${employmentId}/fire`);
}

export function createInsuranceOffer(companyId: string, premiumPerCycle: number, coverageCap: number): Promise<{ id: string }> {
  return postJson(`/companies/${companyId}/insurance-offers`, { premiumPerCycle, coverageCap });
}

export function cancelInsuranceOffer(offerId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/insurance-offers/${offerId}`);
}

export function subscribeToInsuranceOffer(companyId: string, offerId: string): Promise<{ subscribed: boolean }> {
  return postJson(`/companies/${companyId}/insurance-offers/${offerId}/subscribe`);
}

export function subscribeToSystemInsurance(companyId: string): Promise<{ id: string }> {
  return postJson(`/companies/${companyId}/insurance/system`);
}

export function cancelInsurancePolicy(companyId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/companies/${companyId}/insurance`);
}

export function createSaleListing(
  companyId: string,
  sharePercentage: number,
  askingPricePerPercent?: number,
): Promise<{ id: string }> {
  return postJson(`/companies/${companyId}/sale-listings`, { sharePercentage, askingPricePerPercent });
}

export function cancelSaleListing(listingId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/sale-listings/${listingId}`);
}

export function submitSaleBid(
  listingId: string,
  pricePerPercent: number,
  buyerCompanyId?: string,
): Promise<{ submitted: boolean }> {
  return postJson(`/sale-listings/${listingId}/bids`, { pricePerPercent, buyerCompanyId });
}

export function cancelSaleBid(bidId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/sale-bids/${bidId}`);
}

export function acceptSaleBid(bidId: string): Promise<{ accepted: boolean }> {
  return postJson(`/sale-bids/${bidId}/accept`);
}

export function createCapitalRaise(
  companyId: string,
  targetAmount: number,
  newSharePercentage: number,
): Promise<{ id: string }> {
  return postJson(`/companies/${companyId}/capital-raises`, { targetAmount, newSharePercentage });
}

export function cancelCapitalRaise(raiseId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/capital-raises/${raiseId}`);
}

export function fundCapitalRaise(
  raiseId: string,
  amount: number,
  investorCompanyId?: string,
): Promise<{ contributed: number; fullyFunded: boolean }> {
  return postJson(`/capital-raises/${raiseId}/fund`, { amount, investorCompanyId });
}

export function getCapitalRaiseContributions(raiseId: string): Promise<CapitalRaiseContributionView[]> {
  return getJson(`/capital-raises/${raiseId}/contributions`);
}

export function createDistributionPolicyProposal(
  companyId: string,
  distributionPolicy: "dividend" | "reserve",
): Promise<{ id: string }> {
  return postJson(`/companies/${companyId}/proposals`, { type: "SET_DISTRIBUTION_POLICY", distributionPolicy });
}

export function createInvestProposal(companyId: string, axis: string, amount: number): Promise<{ id: string }> {
  return postJson(`/companies/${companyId}/proposals`, { type: "INVEST", axis, amount });
}

export function castVote(proposalId: string, inFavor: boolean): Promise<{ voted: boolean }> {
  return postJson(`/proposals/${proposalId}/vote`, { inFavor });
}

export function claimDailyBonus(): Promise<{ reward: number; streak: number }> {
  return postJson("/engagement/daily-bonus/claim");
}

export interface QuizAnswerResult {
  correct: boolean;
  correctAnswer: boolean;
  explanation: string;
  reward: number;
}

export function answerQuiz(questionId: string, answer: boolean): Promise<QuizAnswerResult> {
  return postJson(`/quiz/${questionId}/answer`, { answer });
}

export interface IndependentActivityEstimate {
  netPerCycle: number;
  socialContributionsPerCycle: number;
  marginalTaxRateOnSide: number;
  wellbeingDrainPerCycle: number;
}

export function estimateIndependentActivity(grossRevenuePerCycle: number): Promise<IndependentActivityEstimate> {
  return getJson(`/independent-activity/estimate?grossRevenuePerCycle=${grossRevenuePerCycle}`);
}

export function startIndependentActivity(grossRevenuePerCycle: number): Promise<IndependentActivityView> {
  return postJson("/independent-activity", { grossRevenuePerCycle });
}

export function stopIndependentActivity(): Promise<{ stopped: boolean }> {
  return deleteJson("/independent-activity");
}

export function foundCompany(name: string, sectorId: string, municipalityId: string): Promise<Company> {
  return postJson("/companies", { name, sectorId, municipalityId });
}

export function hireManager(companyId: string): Promise<Company> {
  return postJson(`/companies/${companyId}/manager`);
}

export function fireManager(companyId: string): Promise<Company> {
  return deleteJson(`/companies/${companyId}/manager`);
}

export function investInCompany(companyId: string, axis: InvestmentAxis, amount: number): Promise<Company> {
  return postJson(`/companies/${companyId}/invest`, { axis, amount });
}

export function investInCapacityExpansion(companyId: string, amount: number): Promise<Company> {
  return postJson(`/companies/${companyId}/capacity-expansion`, { amount });
}

export function launchMassMarketingCampaign(companyId: string, amount: number): Promise<Company> {
  return postJson(`/companies/${companyId}/marketing-campaign`, { amount });
}

export function unlockExport(companyId: string): Promise<Company> {
  return postJson(`/companies/${companyId}/export/unlock`);
}

export function setAutoReinvestRule(
  companyId: string,
  axis: InvestmentAxis | null,
  capPerCycle: number,
): Promise<{ axis: InvestmentAxis | null; capPerCycle: number | null }> {
  return postJson(`/companies/${companyId}/auto-reinvest-rule`, { axis, capPerCycle });
}

export function launchProduct(companyId: string, type: ProductType): Promise<Company> {
  return postJson(`/companies/${companyId}/products`, { type });
}

export function setProductPrice(companyId: string, productId: string, unitPrice: number): Promise<Company> {
  return postJson(`/companies/${companyId}/products/${productId}/price`, { unitPrice });
}

export function setProductAllocation(companyId: string, productId: string, capacityAllocation: number): Promise<Company> {
  return postJson(`/companies/${companyId}/products/${productId}/allocation`, { capacityAllocation });
}

export function requestLoan(companyId: string, principal: number, termCycles: 180 | 365 | 730): Promise<Company> {
  return postJson(`/companies/${companyId}/loans`, { principal, termCycles });
}

export function setDistributionPolicy(companyId: string, policy: "dividend" | "reserve"): Promise<Company> {
  return postJson(`/companies/${companyId}/distribution-policy`, { policy });
}

export function withdrawLiquidationReserve(companyId: string, amount: number): Promise<Company> {
  return postJson(`/companies/${companyId}/liquidation-reserve/withdraw`, { amount });
}

export type EmployeeTier = "unskilled" | "qualified" | "specialist";

export function hireEmployee(companyId: string, tier: EmployeeTier, department: Department): Promise<Company> {
  return postJson(`/companies/${companyId}/employees`, { tier, department });
}

export function fireEmployee(companyId: string, tier: EmployeeTier, department: Department): Promise<Company> {
  return deleteJson(`/companies/${companyId}/employees`, { tier, department });
}

export function hireDepartmentManager(companyId: string, department: Department): Promise<Company> {
  return postJson(`/companies/${companyId}/departments/${department}/manager`);
}

export function fireDepartmentManager(companyId: string, department: Department): Promise<Company> {
  return deleteJson(`/companies/${companyId}/departments/${department}/manager`);
}

export function listShareForSale(companyId: string, sharePercentage: number, price: number): Promise<unknown> {
  return postJson(`/companies/${companyId}/shares`, { sharePercentage, price });
}

export function cancelListing(listingId: string): Promise<unknown> {
  return deleteJson(`/market/${listingId}`);
}

export function buyShareListing(listingId: string, acquirerCompanyId?: string): Promise<{ bought: boolean }> {
  return postJson(`/market/${listingId}/buy`, { acquirerCompanyId });
}

export function buyCommodity(sectorId: string, cashAmount: number): Promise<{ unitsReceived: number; cashSpent: number }> {
  return postJson(`/commodities/${sectorId}/buy`, { cashAmount });
}

export function sellCommodity(sectorId: string, units: number): Promise<{ unitsSold: number; cashReceived: number }> {
  return postJson(`/commodities/${sectorId}/sell`, { units });
}

export function buyProperty(propertyId: string): Promise<{ bought: boolean }> {
  return postJson(`/properties/${propertyId}/buy`);
}

export function listPropertyForSale(propertyId: string, price: number): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/list`, { price });
}

export function cancelPropertyListing(propertyId: string): Promise<PropertyView> {
  return deleteJson(`/properties/${propertyId}/list`);
}

export function rentProperty(propertyId: string): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/rent`);
}

export function endPropertyRent(propertyId: string): Promise<PropertyView> {
  return deleteJson(`/properties/${propertyId}/rent`);
}

export function renovateProperty(propertyId: string): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/renovate`);
}

export function setPropertyCustomName(propertyId: string, customName: string | null): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/custom-name`, { customName });
}

export function requestMortgage(propertyId: string, principal: number, termCycles: 365 | 730 | 1460): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/mortgage`, { principal, termCycles });
}

export function payoffMortgage(propertyId: string): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/mortgage/payoff`);
}

export function listPropertyForAuction(propertyId: string, startingPrice: number): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/auction`, { startingPrice });
}

export function placeBid(propertyId: string, maxAmount: number): Promise<PropertyView> {
  return postJson(`/properties/${propertyId}/bid`, { maxAmount });
}

export function performGig(gigId: string): Promise<{ gigId: string; reward: number; wellbeingCost: number }> {
  return postJson(`/gigs/${gigId}/perform`);
}

export function buyFinancialAsset(key: string, amount: number): Promise<FinancialAssetView> {
  return postJson(`/financial-assets/${key}/buy`, { amount });
}

export interface SellAssetResult {
  sold: number;
  saleProceeds: number;
  gain: number;
  tax: number;
  net: number;
}

export function sellFinancialAsset(key: string, quantity: number): Promise<SellAssetResult> {
  return postJson(`/financial-assets/${key}/sell`, { quantity });
}

export function setDividendPolicy(key: string, policy: "CASH" | "REINVEST"): Promise<FinancialAssetView> {
  return postJson(`/financial-assets/${key}/dividend-policy`, { policy });
}

export function foundGuild(name: string, companyId: string, priceFloor: number): Promise<GuildView> {
  return postJson("/guilds", { name, companyId, priceFloor });
}

export function joinGuild(guildId: string, companyId: string): Promise<GuildView> {
  return postJson(`/guilds/${guildId}/join`, { companyId });
}

export function leaveGuild(guildId: string, companyId: string): Promise<{ left: boolean }> {
  return deleteJson(`/guilds/${guildId}/members/${companyId}`);
}

export function setGuildPriceFloor(guildId: string, priceFloor: number): Promise<GuildView> {
  return postJson(`/guilds/${guildId}/price-floor`, { priceFloor });
}

export function postGuildMessage(guildId: string, body: string): Promise<GuildMessageView[]> {
  return postJson(`/guilds/${guildId}/messages`, { body });
}

export interface DonateToPlayerResult {
  sent: number;
  tax: number;
  net: number;
}

export function donateToPlayer(recipientPseudo: string, amount: number): Promise<DonateToPlayerResult> {
  return postJson("/donations/to-player", { recipientPseudo, amount });
}

export interface DonateToCauseResult {
  donated: number;
  taxReduction: number;
  netCost: number;
  causeName: string;
}

export function donateToCause(causeId: string, amount: number): Promise<DonateToCauseResult> {
  return postJson("/donations/to-cause", { causeId, amount });
}

export function launchTenderOffer(
  companyId: string,
  pricePerPercent: number,
  acquirerCompanyId?: string,
): Promise<TenderOfferView> {
  return postJson(`/companies/${companyId}/tender-offers`, { pricePerPercent, acquirerCompanyId });
}

export function cancelTenderOffer(offerId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/tender-offers/${offerId}`);
}

export function tenderShares(offerId: string, percentage: number): Promise<{ tendered: boolean }> {
  return postJson(`/tender-offers/${offerId}/tender`, { percentage });
}

export function investPersonal(axis: PersonalAxis, amount: number): Promise<PersonalOverview> {
  return postJson("/personal/invest", { axis, amount });
}

export function performPersonalAction(actionId: string): Promise<PersonalOverview> {
  return postJson(`/personal/actions/${actionId}`);
}

export function fetchLeaderboard(
  metric: LeaderboardMetric,
  window: LeaderboardGrowthWindowCycles,
): Promise<LeaderboardEntry[]> {
  return getJson(`/leaderboard?metric=${metric}&window=${window}`);
}

export function openSavingsAccount(
  productType: SavingsProductType,
  amount: number,
  termCycles?: CompteTermeCycles,
): Promise<SavingsAccountView & { taxReduction: number }> {
  return postJson("/savings", { productType, amount, termCycles });
}

export function withdrawSavings(accountId: string, amount?: number): Promise<{ withdrawn: number; early: boolean }> {
  return postJson(`/savings/${accountId}/withdraw`, amount === undefined ? {} : { amount });
}

export function depositSavings(accountId: string, amount: number): Promise<SavingsAccountView> {
  return postJson(`/savings/${accountId}/deposit`, { amount });
}

export function createLoanOffer(
  companyId: string,
  principal: number,
  rate: number,
  termCycles: number,
): Promise<CompanyLoanOffer> {
  return postJson(`/companies/${companyId}/loan-offers`, { principal, rate, termCycles });
}

export function cancelLoanOffer(offerId: string): Promise<{ cancelled: boolean }> {
  return deleteJson(`/loan-offers/${offerId}`);
}

export function fetchLoanOffers(): Promise<LoanOfferView[]> {
  return getJson("/loan-offers");
}

export function takeLoanOffer(offerId: string): Promise<{ taken: boolean }> {
  return postJson(`/loan-offers/${offerId}/take`);
}

export function depositAtBank(companyId: string, amount: number): Promise<{ deposited: number; rate: number }> {
  return postJson(`/companies/${companyId}/deposits`, { amount });
}

export function withdrawDeposit(
  depositId: string,
  amount?: number,
): Promise<{ withdrawn: number; partial: boolean }> {
  return postJson(`/deposits/${depositId}/withdraw`, amount === undefined ? {} : { amount });
}

export function setDepositRate(companyId: string, rate: number): Promise<{ rate: number }> {
  return postJson(`/companies/${companyId}/deposit-rate`, { rate });
}

export function markNotificationsRead(): Promise<{ read: boolean }> {
  return postJson("/notifications/read");
}

export function setEmailAlertsPreference(enabled: boolean): Promise<{ enabled: boolean }> {
  return postJson("/notifications/email-alerts", { enabled });
}

export function buyPersonalGood(goodId: string): Promise<PersonalGoodView> {
  return postJson("/personal-goods", { goodId });
}

export function sellPersonalGood(goodInstanceId: string): Promise<{ sold: boolean; value: number }> {
  return postJson(`/personal-goods/${goodInstanceId}/sell`);
}

export function contributeToInfrastructure(municipalityId: string, amount: number): Promise<{ id: string }> {
  return postJson(`/municipalities/${municipalityId}/contribute`, { amount });
}

export function createCouncilProposal(
  municipalityId: string,
  newRegistrationDutyRate: number,
): Promise<{ id: string }> {
  return postJson(`/municipalities/${municipalityId}/proposals`, { newRegistrationDutyRate });
}

export function castCouncilVote(proposalId: string, inFavor: boolean): Promise<{ voted: boolean }> {
  return postJson(`/municipalities/proposals/${proposalId}/vote`, { inFavor });
}
