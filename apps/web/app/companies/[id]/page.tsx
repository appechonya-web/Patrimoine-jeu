import { redirect } from "next/navigation";
import {
  getBankReliability,
  getCapitalRaises,
  getCompany,
  getCompanyCycleReportLines,
  getCompanyInsurance,
  getCompanyStaff,
  getCompanyTenderOffers,
  getCurrentPlayer,
  getInsuranceOffers,
  getMyCompanies,
  getProposals,
  getSaleBids,
  getSaleListings,
  getSupplyContracts,
} from "../../../lib/session";
import { CompanyDetail } from "./company-detail";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [
    company,
    myCompanies,
    supplyContracts,
    tenderOffers,
    player,
    staff,
    insurance,
    insuranceOffers,
    saleListings,
    capitalRaises,
    proposals,
    bankReliability,
    cycleReportLines,
  ] = await Promise.all([
    getCompany(id),
    getMyCompanies(),
    getSupplyContracts(id),
    getCompanyTenderOffers(id),
    getCurrentPlayer(),
    getCompanyStaff(id),
    getCompanyInsurance(id),
    getInsuranceOffers(),
    getSaleListings(),
    getCapitalRaises(),
    getProposals(id),
    getBankReliability(id),
    getCompanyCycleReportLines(id),
  ]);

  if (!company || !player) {
    redirect("/");
  }

  const myListing = saleListings.find((listing) => listing.companyId === id) ?? null;
  const saleBids = company.isPrimaryOwner && myListing ? await getSaleBids(myListing.id) : [];
  const myCapitalRaise = capitalRaises.find((raise) => raise.companyId === id) ?? null;
  // Groupe/holding : entreprises que je contrôle (>50% des parts, hors
  // celle-ci) — utilisables comme acquéreuse à la place de mon patrimoine
  // personnel sur les mécanismes de rachat (OPA, capital-risque...).
  const myControlledCompanies = myCompanies.companies
    .filter((c) => c.id !== id && c.sharePercentage > 50)
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <CompanyDetail
      company={company}
      myControlledCompanies={myControlledCompanies}
      expansionRequirement={myCompanies.canFoundAnother ? null : myCompanies.expansionRequirement}
      supplyContracts={supplyContracts}
      tenderOffers={tenderOffers}
      myPseudo={player.pseudo}
      staff={staff}
      insurance={insurance}
      insuranceOffers={insuranceOffers.filter((offer) => offer.insurerCompany.id !== id)}
      saleListing={myListing}
      saleBids={saleBids}
      capitalRaise={myCapitalRaise}
      proposals={proposals}
      bankReliability={bankReliability}
      cycleReportLines={cycleReportLines}
    />
  );
}
