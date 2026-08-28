import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  castVoteInputSchema,
  buyShareListingInputSchema,
  contributeToCapitalRaiseInputSchema,
  createCapitalRaiseInputSchema,
  createCompanyInputSchema,
  createInsuranceOfferInputSchema,
  createLoanOfferInputSchema,
  createProposalInputSchema,
  createSaleListingInputSchema,
  DEPARTMENTS,
  depositInputSchema,
  hireEmployeeInputSchema,
  investCompanyInputSchema,
  investInCapacityExpansionInputSchema,
  launchMassMarketingCampaignInputSchema,
  launchProductInputSchema,
  launchTenderOfferInputSchema,
  listShareInputSchema,
  requestLoanInputSchema,
  setAutoReinvestRuleInputSchema,
  setDepositRateInputSchema,
  setDistributionPolicyInputSchema,
  setPriceInputSchema,
  setProductAllocationInputSchema,
  submitSaleBidInputSchema,
  tenderSharesInputSchema,
  withdrawDepositInputSchema,
  withdrawLiquidationReserveInputSchema,
  type Department,
} from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CompaniesService } from "./companies.service.js";

@Controller()
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get("sectors")
  listSectors() {
    return this.companiesService.listFoundableSectors();
  }

  @Get("municipalities")
  listMunicipalities() {
    return this.companiesService.listMunicipalities();
  }

  @Get("companies/me")
  listMyCompanies(@CurrentPlayer() playerId: string) {
    return this.companiesService.listMyCompanies(playerId);
  }

  @Get("companies/group-overview")
  getGroupOverview(@CurrentPlayer() playerId: string) {
    return this.companiesService.getGroupOverview(playerId);
  }

  @Get("companies/:id")
  getCompany(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.companiesService.getCompany(playerId, companyId);
  }

  @Get("companies/:id/supply-contracts")
  getSupplyContracts(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.companiesService.getSupplyContracts(playerId, companyId);
  }

  @Post("companies")
  found(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = createCompanyInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.found(playerId, parsed.data);
  }

  @Post("companies/:id/manager")
  hireManager(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.companiesService.hireManager(playerId, companyId);
  }

  @Delete("companies/:id/manager")
  fireManager(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.companiesService.fireManager(playerId, companyId);
  }

  @Post("companies/:id/invest")
  invest(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = investCompanyInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.invest(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/capacity-expansion")
  investInCapacityExpansion(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = investInCapacityExpansionInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.investInCapacityExpansion(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/marketing-campaign")
  launchMassMarketingCampaign(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = launchMassMarketingCampaignInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.launchMassMarketingCampaign(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/auto-reinvest-rule")
  setAutoReinvestRule(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = setAutoReinvestRuleInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.setAutoReinvestRule(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/products")
  launchProduct(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = launchProductInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.launchProduct(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/products/:productId/price")
  setProductPrice(
    @CurrentPlayer() playerId: string,
    @Param("id") companyId: string,
    @Param("productId") productId: string,
    @Body() body: unknown,
  ) {
    const parsed = setPriceInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.setProductPrice(playerId, companyId, productId, parsed.data);
  }

  @Post("companies/:id/products/:productId/allocation")
  setProductAllocation(
    @CurrentPlayer() playerId: string,
    @Param("id") companyId: string,
    @Param("productId") productId: string,
    @Body() body: unknown,
  ) {
    const parsed = setProductAllocationInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.setProductAllocation(playerId, companyId, productId, parsed.data);
  }

  @Post("companies/:id/loans")
  requestLoan(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = requestLoanInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.requestLoan(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/distribution-policy")
  setDistributionPolicy(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = setDistributionPolicyInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.setDistributionPolicy(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/liquidation-reserve/withdraw")
  withdrawLiquidationReserve(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = withdrawLiquidationReserveInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.withdrawLiquidationReserve(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/departments/:department/manager")
  hireDepartmentManager(
    @CurrentPlayer() playerId: string,
    @Param("id") companyId: string,
    @Param("department") department: string,
  ) {
    if (!DEPARTMENTS.includes(department as Department)) {
      throw new BadRequestException("Département inconnu");
    }
    return this.companiesService.hireDepartmentManager(playerId, companyId, department as Department);
  }

  @Delete("companies/:id/departments/:department/manager")
  fireDepartmentManager(
    @CurrentPlayer() playerId: string,
    @Param("id") companyId: string,
    @Param("department") department: string,
  ) {
    if (!DEPARTMENTS.includes(department as Department)) {
      throw new BadRequestException("Département inconnu");
    }
    return this.companiesService.fireDepartmentManager(playerId, companyId, department as Department);
  }

  @Post("companies/:id/employees")
  hireEmployee(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = hireEmployeeInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.hireEmployee(playerId, companyId, parsed.data);
  }

  @Delete("companies/:id/employees")
  fireEmployee(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = hireEmployeeInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.fireEmployee(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/shares")
  listShareForSale(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = listShareInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.listShareForSale(playerId, companyId, parsed.data);
  }

  @Get("market")
  listMarketplace() {
    return this.companiesService.listMarketplace();
  }

  @Delete("market/:listingId")
  cancelListing(@CurrentPlayer() playerId: string, @Param("listingId") listingId: string) {
    return this.companiesService.cancelListing(playerId, listingId);
  }

  @Post("market/:listingId/buy")
  buyShareListing(@CurrentPlayer() playerId: string, @Param("listingId") listingId: string, @Body() body: unknown) {
    const parsed = buyShareListingInputSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.buyShareListing(playerId, listingId, parsed.data);
  }

  @Post("companies/:id/loan-offers")
  createLoanOffer(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = createLoanOfferInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.companiesService.createLoanOffer(playerId, companyId, parsed.data);
  }

  @Get("loan-offers")
  listLoanOffers() {
    return this.companiesService.listLoanOffers();
  }

  @Delete("loan-offers/:offerId")
  cancelLoanOffer(@CurrentPlayer() playerId: string, @Param("offerId") offerId: string) {
    return this.companiesService.cancelLoanOffer(playerId, offerId);
  }

  @Post("loan-offers/:offerId/take")
  takeLoanOffer(@CurrentPlayer() playerId: string, @Param("offerId") offerId: string) {
    return this.companiesService.takeLoanOffer(playerId, offerId);
  }

  @Get("deposits/me")
  listMyDeposits(@CurrentPlayer() playerId: string) {
    return this.companiesService.listMyDeposits(playerId);
  }

  @Post("companies/:id/deposits")
  deposit(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = depositInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.deposit(playerId, companyId, parsed.data);
  }

  @Post("deposits/:depositId/withdraw")
  withdrawDeposit(@CurrentPlayer() playerId: string, @Param("depositId") depositId: string, @Body() body: unknown) {
    const parsed = withdrawDepositInputSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.withdrawDeposit(playerId, depositId, parsed.data);
  }

  @Post("companies/:id/deposit-rate")
  setDepositRate(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = setDepositRateInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.setDepositRate(playerId, companyId, parsed.data);
  }

  @Post("companies/:id/tender-offers")
  launchTenderOffer(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = launchTenderOfferInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.launchTenderOffer(playerId, companyId, parsed.data);
  }

  @Get("tender-offers")
  listTenderOffers() {
    return this.companiesService.listTenderOffers();
  }

  @Get("companies/:id/tender-offers")
  listTenderOffersForCompany(@Param("id") companyId: string) {
    return this.companiesService.listTenderOffers(companyId);
  }

  @Delete("tender-offers/:offerId")
  cancelTenderOffer(@CurrentPlayer() playerId: string, @Param("offerId") offerId: string) {
    return this.companiesService.cancelTenderOffer(playerId, offerId);
  }

  @Post("tender-offers/:offerId/tender")
  tenderShares(@CurrentPlayer() playerId: string, @Param("offerId") offerId: string, @Body() body: unknown) {
    const parsed = tenderSharesInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.tenderShares(playerId, offerId, parsed.data);
  }

  @Post("companies/:id/insurance-offers")
  createInsuranceOffer(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = createInsuranceOfferInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.createInsuranceOffer(playerId, companyId, parsed.data);
  }

  @Get("insurance-offers")
  listInsuranceOffers() {
    return this.companiesService.listInsuranceOffers();
  }

  @Delete("insurance-offers/:offerId")
  cancelInsuranceOffer(@CurrentPlayer() playerId: string, @Param("offerId") offerId: string) {
    return this.companiesService.cancelInsuranceOffer(playerId, offerId);
  }

  @Post("companies/:id/insurance-offers/:offerId/subscribe")
  subscribeToInsuranceOffer(
    @CurrentPlayer() playerId: string,
    @Param("id") companyId: string,
    @Param("offerId") offerId: string,
  ) {
    return this.companiesService.subscribeToInsuranceOffer(playerId, companyId, offerId);
  }

  @Post("companies/:id/insurance/system")
  subscribeToSystemInsurance(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.companiesService.subscribeToSystemInsurance(playerId, companyId);
  }

  @Delete("companies/:id/insurance")
  cancelInsurancePolicy(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.companiesService.cancelInsurancePolicy(playerId, companyId);
  }

  @Get("companies/:id/insurance")
  getCompanyInsurance(@Param("id") companyId: string) {
    return this.companiesService.getCompanyInsurance(companyId);
  }

  @Get("companies/:id/bank-reliability")
  getBankReliability(@Param("id") companyId: string) {
    return this.companiesService.getBankReliability(companyId);
  }

  @Post("companies/:id/sale-listings")
  createSaleListing(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = createSaleListingInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.createSaleListing(playerId, companyId, parsed.data);
  }

  @Get("sale-listings")
  listSaleListings() {
    return this.companiesService.listSaleListings();
  }

  @Delete("sale-listings/:listingId")
  cancelSaleListing(@CurrentPlayer() playerId: string, @Param("listingId") listingId: string) {
    return this.companiesService.cancelSaleListing(playerId, listingId);
  }

  @Get("sale-listings/:listingId/bids")
  listSaleBids(@CurrentPlayer() playerId: string, @Param("listingId") listingId: string) {
    return this.companiesService.listSaleBids(playerId, listingId);
  }

  @Post("sale-listings/:listingId/bids")
  submitSaleBid(@CurrentPlayer() playerId: string, @Param("listingId") listingId: string, @Body() body: unknown) {
    const parsed = submitSaleBidInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.submitSaleBid(playerId, listingId, parsed.data);
  }

  @Delete("sale-bids/:bidId")
  cancelSaleBid(@CurrentPlayer() playerId: string, @Param("bidId") bidId: string) {
    return this.companiesService.cancelSaleBid(playerId, bidId);
  }

  @Post("sale-bids/:bidId/accept")
  acceptSaleBid(@CurrentPlayer() playerId: string, @Param("bidId") bidId: string) {
    return this.companiesService.acceptSaleBid(playerId, bidId);
  }

  @Post("companies/:id/capital-raises")
  createCapitalRaise(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = createCapitalRaiseInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.createCapitalRaise(playerId, companyId, parsed.data);
  }

  @Get("capital-raises")
  listCapitalRaises() {
    return this.companiesService.listCapitalRaises();
  }

  @Get("capital-raises/:raiseId/contributions")
  getCapitalRaiseContributions(@Param("raiseId") raiseId: string) {
    return this.companiesService.getCapitalRaiseContributions(raiseId);
  }

  @Delete("capital-raises/:raiseId")
  cancelCapitalRaise(@CurrentPlayer() playerId: string, @Param("raiseId") raiseId: string) {
    return this.companiesService.cancelCapitalRaise(playerId, raiseId);
  }

  @Post("capital-raises/:raiseId/fund")
  contributeToCapitalRaise(@CurrentPlayer() playerId: string, @Param("raiseId") raiseId: string, @Body() body: unknown) {
    const parsed = contributeToCapitalRaiseInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.contributeToCapitalRaise(playerId, raiseId, parsed.data);
  }

  @Post("companies/:id/proposals")
  createProposal(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = createProposalInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.createProposal(playerId, companyId, parsed.data);
  }

  @Get("companies/:id/proposals")
  listProposals(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.companiesService.listProposals(playerId, companyId);
  }

  @Post("proposals/:proposalId/vote")
  castVote(@CurrentPlayer() playerId: string, @Param("proposalId") proposalId: string, @Body() body: unknown) {
    const parsed = castVoteInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.companiesService.castVote(playerId, proposalId, parsed.data);
  }
}
