import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AUCTION_DURATION_HOURS,
  MAX_MORTGAGE_LTV_RATIO,
  RESIDENTIAL_PROPERTY_TYPES,
  type CreateAuctionInput,
  type ListPropertyForSaleInput,
  type PlaceBidInput,
  type RequestMortgageInput,
  type SetPropertyCustomNameInput,
} from "@patrimoine-jeu/domain";
import {
  computeAuctionState,
  computeBidIncrement,
  computeMortgageRate,
  computeRegistrationDuty,
  computeRenovationCost,
} from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const PROPERTY_VIEW_INCLUDE = {
  municipality: { include: { region: true } },
  leases: { where: { status: "ACTIVE" as const }, take: 1 },
  loans: { where: { status: "ACTIVE" as const }, take: 1 },
  listings: { take: 1, include: { bids: true } },
};

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async listMarket(playerId: string) {
    const [listings, ownsResidentialHome] = await Promise.all([
      this.prisma.client.listing.findMany({
        where: { property: { status: { in: ["VACANT", "LISTED"] } } },
        include: { property: { include: PROPERTY_VIEW_INCLUDE }, bids: true },
        orderBy: { openedAt: "desc" },
      }),
      this.ownsResidentialProperty(playerId),
    ]);

    return listings.map((listing) => this.toListingView(listing, playerId, ownsResidentialHome));
  }

  async listMine(playerId: string) {
    const properties = await this.prisma.client.property.findMany({
      where: { ownerId: playerId },
      include: PROPERTY_VIEW_INCLUDE,
      orderBy: { id: "asc" },
    });

    return properties.map((property) => this.toPropertyView(property, playerId));
  }

  async buy(playerId: string, propertyId: string) {
    const [property, listing, buyerStats, ownsResidentialHome] = await Promise.all([
      this.prisma.client.property.findUnique({ where: { id: propertyId }, include: { municipality: true } }),
      this.prisma.client.listing.findFirst({ where: { propertyId } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
      this.ownsResidentialProperty(playerId),
    ]);
    if (!property || !listing) {
      throw new NotFoundException("Ce bien n'est pas en vente");
    }
    if (property.ownerId === playerId) {
      throw new BadRequestException("Tu possèdes déjà ce bien");
    }

    const duty = computeRegistrationDuty(
      listing.price.toNumber(),
      property.type,
      property.municipality.registrationDutyRate.toNumber(),
      property.municipality.registrationDutyRateOwnHome.toNumber(),
      ownsResidentialHome,
    );
    const totalCost = listing.price.toNumber() + duty.amount;

    if (!buyerStats || buyerStats.wealthLiquid.toNumber() < totalCost) {
      throw new BadRequestException(
        `Fonds insuffisants — prix ${listing.price.toNumber().toFixed(0)} € + droits d'enregistrement ${duty.amount.toFixed(0)} € (${(duty.rate * 100).toFixed(1)}%) = ${totalCost.toFixed(0)} € au total`,
      );
    }

    await this.prisma.client.$transaction(async (tx) => {
      const claimed = await tx.property.updateMany({
        where: { id: propertyId, status: { in: ["VACANT", "LISTED"] } },
        data: { ownerId: playerId, status: "OWNED" },
      });
      if (claimed.count === 0) {
        throw new BadRequestException("Ce bien vient d'être acheté par quelqu'un d'autre");
      }

      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: totalCost } } });
      if (property.ownerId) {
        await tx.playerStats.update({
          where: { playerId: property.ownerId },
          data: { wealthLiquid: { increment: listing.price } },
        });
        const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
        await tx.playerNotification.create({
          data: {
            playerId: property.ownerId,
            type: "property-sold",
            message: `Ton bien (${property.type.toLowerCase()}) a été vendu pour ${listing.price.toNumber().toFixed(0)} €.`,
            cycle: currentCycle.number,
          },
        });
      }
      await tx.listing.delete({ where: { id: listing.id } });
    });

    await this.achievementsService.tryUnlock(playerId, "first-property");

    return { bought: true, registrationDuty: duty.amount };
  }

  async listForSale(playerId: string, propertyId: string, input: ListPropertyForSaleInput) {
    const property = await this.assertOwner(playerId, propertyId);
    if (property.status !== "OWNED") {
      throw new BadRequestException("Ce bien doit être libre (ni loué, ni déjà en vente) pour être mis en vente");
    }
    const activeMortgage = await this.prisma.client.loan.findFirst({
      where: { collateralPropertyId: propertyId, status: "ACTIVE" },
    });
    if (activeMortgage) {
      throw new BadRequestException("Ce bien est grevé d'un prêt hypothécaire actif — solde-le d'abord pour pouvoir le vendre");
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.property.update({ where: { id: propertyId }, data: { status: "LISTED" } });
      await tx.listing.create({
        data: { propertyId, price: input.price, isAuction: false, expiresAt: new Date("2099-01-01") },
      });
    });

    return this.getOne(playerId, propertyId);
  }

  /**
   * Enchère — cf. domain/property-auction.ts. Durée fixe en temps réel
   * (AUCTION_DURATION_HOURS), réglée à la clôture de cycle suivant
   * l'expiration (cf. packages/game-engine/cycles.ts, settleExpiredAuctions).
   */
  async listForAuction(playerId: string, propertyId: string, input: CreateAuctionInput) {
    const property = await this.assertOwner(playerId, propertyId);
    if (property.status !== "OWNED") {
      throw new BadRequestException("Ce bien doit être libre (ni loué, ni déjà en vente) pour être mis aux enchères");
    }
    const activeMortgage = await this.prisma.client.loan.findFirst({
      where: { collateralPropertyId: propertyId, status: "ACTIVE" },
    });
    if (activeMortgage) {
      throw new BadRequestException("Ce bien est grevé d'un prêt hypothécaire actif — solde-le d'abord pour pouvoir le vendre");
    }

    const expiresAt = new Date(Date.now() + AUCTION_DURATION_HOURS * 60 * 60 * 1000);
    await this.prisma.client.$transaction(async (tx) => {
      await tx.property.update({ where: { id: propertyId }, data: { status: "LISTED" } });
      await tx.listing.create({
        data: { propertyId, price: input.startingPrice, isAuction: true, expiresAt },
      });
    });

    return this.getOne(playerId, propertyId);
  }

  async placeBid(playerId: string, propertyId: string, input: PlaceBidInput) {
    const listing = await this.prisma.client.listing.findFirst({
      where: { propertyId, isAuction: true },
      include: { bids: true, property: true },
    });
    if (!listing) {
      throw new NotFoundException("Ce bien n'est pas aux enchères");
    }
    if (listing.property.ownerId === playerId) {
      throw new BadRequestException("Tu ne peux pas enchérir sur ton propre bien");
    }

    const summary = this.buildAuctionSummary(listing, playerId);
    if (input.maxAmount < summary.minNextBid) {
      throw new BadRequestException(`Ton offre doit être d'au moins ${summary.minNextBid.toFixed(0)} €`);
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.maxAmount) {
      throw new BadRequestException("Fonds insuffisants pour ce plafond d'enchère");
    }

    await this.prisma.client.bid.create({
      data: {
        listingId: listing.id,
        playerId,
        amount: summary.currentPrice,
        isProxy: true,
        maxProxyAmount: input.maxAmount,
      },
    });

    return this.getOne(playerId, propertyId);
  }

  async cancelListing(playerId: string, propertyId: string) {
    const property = await this.assertOwner(playerId, propertyId);
    if (property.status !== "LISTED") {
      throw new BadRequestException("Ce bien n'est pas en vente");
    }
    const listing = await this.prisma.client.listing.findFirst({ where: { propertyId }, include: { bids: true } });
    if (listing?.isAuction && listing.bids.length > 0) {
      throw new BadRequestException("Impossible d'annuler une enchère qui a déjà reçu des offres");
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.bid.deleteMany({ where: { listing: { propertyId } } });
      await tx.listing.deleteMany({ where: { propertyId } });
      await tx.property.update({ where: { id: propertyId }, data: { status: "OWNED" } });
    });

    return this.getOne(playerId, propertyId);
  }

  /** Locataire NPC uniquement pour cette première passe — un revenu passif, pas de marché locatif joueur-à-joueur. */
  async rent(playerId: string, propertyId: string) {
    const property = await this.assertOwner(playerId, propertyId);
    if (property.status !== "OWNED") {
      throw new BadRequestException("Ce bien doit être libre (ni en vente, ni déjà loué) pour être mis en location");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    await this.prisma.client.$transaction(async (tx) => {
      await tx.property.update({ where: { id: propertyId }, data: { status: "RENTED" } });
      await tx.lease.create({
        data: {
          propertyId,
          tenantType: "NPC",
          rentAmount: property.baseRent,
          startedCycle: currentCycle.number,
        },
      });
    });

    return this.getOne(playerId, propertyId);
  }

  async endRent(playerId: string, propertyId: string) {
    const property = await this.assertOwner(playerId, propertyId);
    if (property.status !== "RENTED") {
      throw new BadRequestException("Ce bien n'est pas actuellement loué");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    await this.prisma.client.$transaction(async (tx) => {
      await tx.lease.updateMany({
        where: { propertyId, status: "ACTIVE" },
        data: { status: "ENDED", endedCycle: currentCycle.number },
      });
      await tx.property.update({ where: { id: propertyId }, data: { status: "OWNED" } });
    });

    return this.getOne(playerId, propertyId);
  }

  async renovate(playerId: string, propertyId: string) {
    const property = await this.assertOwner(playerId, propertyId);
    const cost = computeRenovationCost(property.condition.toNumber(), property.marketValue.toNumber());
    if (cost <= 0) {
      throw new BadRequestException("Ce bien est déjà en parfait état");
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < cost) {
      throw new BadRequestException(`Fonds insuffisants — la rénovation complète coûte ${cost.toFixed(0)} €`);
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: cost } } });
      await tx.property.update({ where: { id: propertyId }, data: { condition: 100 } });
    });

    return this.getOne(playerId, propertyId);
  }

  /**
   * Immobilier de prestige (cf. domain/property.ts) — réservé au type
   * LUXURY, purement cosmétique.
   */
  async setCustomName(playerId: string, propertyId: string, input: SetPropertyCustomNameInput) {
    const property = await this.assertOwner(playerId, propertyId);
    if (property.type !== "LUXURY") {
      throw new BadRequestException("Seul un bien de luxe peut recevoir un nom personnalisé");
    }
    await this.prisma.client.property.update({ where: { id: propertyId }, data: { customName: input.customName } });
    return this.getOne(playerId, propertyId);
  }

  /** Statut social visible publiquement — cf. domain/property.ts. */
  async listPrestigeProperties() {
    const properties = await this.prisma.client.property.findMany({
      where: { type: "LUXURY", customName: { not: null }, ownerId: { not: null } },
      include: { municipality: { include: { region: true } }, owner: { select: { pseudo: true } } },
      orderBy: { customName: "asc" },
    });

    return properties.map((property) => ({
      id: property.id,
      customName: property.customName,
      ownerPseudo: property.owner!.pseudo,
      municipality: property.municipality.name,
      region: property.municipality.region.name,
      condition: property.condition.toNumber(),
    }));
  }

  /**
   * Prêt hypothécaire — deux cas selon que le bien est déjà possédé ou non
   * (cf. domain/mortgage.ts) :
   * - achat financé : le bien n'appartient pas (encore) au joueur, doit être
   *   en vente ; l'apport (prix - principal) est payé cash, le principal
   *   complète la transaction (créé par la banque, comme pour les prêts
   *   d'entreprise).
   * - rachat de crédit (cash-out) : le bien est déjà possédé, libre de tout
   *   prêt actif ; le principal est directement crédité au joueur.
   * Toujours prêteur SYSTEM, jamais un autre joueur.
   */
  async requestMortgage(playerId: string, propertyId: string, input: RequestMortgageInput) {
    const [property, listing, existingMortgage, buyerStats, ownsResidentialHome] = await Promise.all([
      this.prisma.client.property.findUnique({ where: { id: propertyId }, include: { municipality: true } }),
      this.prisma.client.listing.findFirst({ where: { propertyId } }),
      this.prisma.client.loan.findFirst({ where: { collateralPropertyId: propertyId, status: "ACTIVE" } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
      this.ownsResidentialProperty(playerId),
    ]);
    if (!property) {
      throw new NotFoundException("Bien introuvable");
    }
    if (existingMortgage) {
      throw new BadRequestException("Ce bien est déjà grevé d'un prêt hypothécaire actif");
    }

    const maxPrincipal = property.marketValue.toNumber() * MAX_MORTGAGE_LTV_RATIO;
    if (input.principal > maxPrincipal) {
      throw new BadRequestException(
        `Emprunt trop élevé pour ce bien — maximum ${maxPrincipal.toFixed(0)} € (${MAX_MORTGAGE_LTV_RATIO * 100}% de sa valeur)`,
      );
    }

    const ltv = input.principal / property.marketValue.toNumber();
    const rate = computeMortgageRate(ltv);
    const isPurchase = property.ownerId !== playerId;

    if (isPurchase) {
      if (!listing) {
        throw new NotFoundException("Ce bien n'est pas en vente");
      }
      if (input.principal > listing.price.toNumber()) {
        throw new BadRequestException("Le prêt ne peut pas dépasser le prix de vente du bien");
      }
      const duty = computeRegistrationDuty(
        listing.price.toNumber(),
        property.type,
        property.municipality.registrationDutyRate.toNumber(),
        property.municipality.registrationDutyRateOwnHome.toNumber(),
        ownsResidentialHome,
      );
      const downPayment = listing.price.toNumber() - input.principal + duty.amount;
      if (!buyerStats || buyerStats.wealthLiquid.toNumber() < downPayment) {
        throw new BadRequestException(
          `Fonds insuffisants pour l'apport + droits d'enregistrement (non financés par le prêt) — il faut ${downPayment.toFixed(0)} € cash`,
        );
      }

      await this.prisma.client.$transaction(async (tx) => {
        const claimed = await tx.property.updateMany({
          where: { id: propertyId, status: { in: ["VACANT", "LISTED"] } },
          data: { ownerId: playerId, status: "OWNED" },
        });
        if (claimed.count === 0) {
          throw new BadRequestException("Ce bien vient d'être acheté par quelqu'un d'autre");
        }

        await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: downPayment } } });
        if (property.ownerId) {
          await tx.playerStats.update({
            where: { playerId: property.ownerId },
            data: { wealthLiquid: { increment: listing.price } },
          });
        }
        await tx.listing.delete({ where: { id: listing.id } });
        await tx.loan.create({
          data: {
            borrowerPlayerId: playerId,
            lenderType: "SYSTEM",
            principal: input.principal,
            rate,
            termCycles: input.termCycles,
            remainingBalance: input.principal,
            collateralPropertyId: propertyId,
          },
        });
      });

      await this.achievementsService.tryUnlock(playerId, "first-property");
    } else {
      if (property.status === "LISTED") {
        throw new BadRequestException("Retire ce bien de la vente avant d'emprunter dessus");
      }

      await this.prisma.client.$transaction(async (tx) => {
        await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: input.principal } } });
        await tx.loan.create({
          data: {
            borrowerPlayerId: playerId,
            lenderType: "SYSTEM",
            principal: input.principal,
            rate,
            termCycles: input.termCycles,
            remainingBalance: input.principal,
            collateralPropertyId: propertyId,
          },
        });
      });
    }

    return this.getOne(playerId, propertyId);
  }

  async payoffMortgage(playerId: string, propertyId: string) {
    const loan = await this.prisma.client.loan.findFirst({
      where: { collateralPropertyId: propertyId, status: "ACTIVE" },
    });
    if (!loan || loan.borrowerPlayerId !== playerId) {
      throw new ForbiddenException("Aucun prêt actif à ton nom sur ce bien");
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    const balance = loan.remainingBalance.toNumber();
    if (!stats || stats.wealthLiquid.toNumber() < balance) {
      throw new BadRequestException(`Fonds insuffisants — le solde restant est de ${balance.toFixed(0)} €`);
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: balance } } });
      await tx.loan.update({ where: { id: loan.id }, data: { remainingBalance: 0, status: "PAID" } });
    });

    return this.getOne(playerId, propertyId);
  }

  // --- Internes ----------------------------------------------------------

  /** Éligibilité au taux réduit "abattement première habitation" — cf. domain/property.ts. */
  private async ownsResidentialProperty(playerId: string): Promise<boolean> {
    const count = await this.prisma.client.property.count({
      where: { ownerId: playerId, type: { in: [...RESIDENTIAL_PROPERTY_TYPES] } },
    });
    return count > 0;
  }

  private async assertOwner(playerId: string, propertyId: string) {
    const property = await this.prisma.client.property.findUnique({ where: { id: propertyId } });
    if (!property || property.ownerId !== playerId) {
      throw new ForbiddenException("Tu ne possèdes pas ce bien");
    }
    return property;
  }

  private async getOne(playerId: string, propertyId: string) {
    const property = await this.prisma.client.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: PROPERTY_VIEW_INCLUDE,
    });
    return this.toPropertyView(property, playerId);
  }

  private toPropertyView(property: {
    id: string;
    type: string;
    status: string;
    baseRent: { toNumber(): number };
    marketValue: { toNumber(): number };
    condition: { toNumber(): number };
    ownerId: string | null;
    customName?: string | null;
    municipality: {
      name: string;
      region: { name: string };
      registrationDutyRate: { toNumber(): number };
      registrationDutyRateOwnHome: { toNumber(): number };
    };
    leases: { rentAmount: { toNumber(): number }; startedCycle: number }[];
    loans: { principal: { toNumber(): number }; rate: { toNumber(): number }; termCycles: number; remainingBalance: { toNumber(): number } }[];
    listings: AuctionListingSource[];
  }, playerId?: string) {
    const activeLease = property.leases[0];
    const activeMortgage = property.loans[0];
    const activeListing = property.listings[0];
    return {
      id: property.id,
      type: property.type,
      status: property.status,
      customName: property.customName ?? null,
      baseRent: property.baseRent.toNumber(),
      marketValue: property.marketValue.toNumber(),
      condition: property.condition.toNumber(),
      renovationCost: computeRenovationCost(property.condition.toNumber(), property.marketValue.toNumber()),
      municipality: property.municipality.name,
      region: property.municipality.region.name,
      hasOwner: property.ownerId !== null,
      lease: activeLease ? { rentAmount: activeLease.rentAmount.toNumber(), startedCycle: activeLease.startedCycle } : null,
      mortgage: activeMortgage
        ? {
            principal: activeMortgage.principal.toNumber(),
            rate: activeMortgage.rate.toNumber(),
            termCycles: activeMortgage.termCycles,
            remainingBalance: activeMortgage.remainingBalance.toNumber(),
          }
        : null,
      maxMortgagePrincipal: property.marketValue.toNumber() * MAX_MORTGAGE_LTV_RATIO,
      listingPrice: activeListing && !activeListing.isAuction ? activeListing.price.toNumber() : null,
      auction: activeListing?.isAuction ? this.buildAuctionSummary(activeListing, playerId) : null,
    };
  }

  private toListingView(
    listing: {
      id: string;
      price: { toNumber(): number };
      isAuction: boolean;
      property: Parameters<PropertiesService["toPropertyView"]>[0];
    } & AuctionListingSource,
    playerId: string,
    ownsResidentialHome: boolean,
  ) {
    const duty = computeRegistrationDuty(
      listing.price.toNumber(),
      listing.property.type,
      listing.property.municipality.registrationDutyRate.toNumber(),
      listing.property.municipality.registrationDutyRateOwnHome.toNumber(),
      ownsResidentialHome,
    );
    return {
      listingId: listing.id,
      price: listing.price.toNumber(),
      isAuction: listing.isAuction,
      auction: listing.isAuction ? this.buildAuctionSummary(listing, playerId) : null,
      registrationDuty: duty,
      property: this.toPropertyView(listing.property, playerId),
    };
  }

  private buildAuctionSummary(listing: AuctionListingSource, playerId?: string) {
    const bidInputs = listing.bids.map((bid) => ({
      playerId: bid.playerId,
      maxAmount: (bid.maxProxyAmount ?? bid.amount).toNumber(),
    }));
    const state = computeAuctionState(listing.price.toNumber(), bidInputs);
    const myBids = playerId ? bidInputs.filter((bid) => bid.playerId === playerId) : [];
    return {
      startingPrice: listing.price.toNumber(),
      currentPrice: state.currentPrice,
      minNextBid: state.leaderId ? state.currentPrice + computeBidIncrement(state.currentPrice) : listing.price.toNumber(),
      bidCount: bidInputs.length,
      expiresAt: listing.expiresAt,
      isLeader: state.leaderId !== null && state.leaderId === playerId,
      myMaxBid: myBids.length > 0 ? Math.max(...myBids.map((bid) => bid.maxAmount)) : null,
    };
  }
}

interface AuctionListingSource {
  price: { toNumber(): number };
  isAuction: boolean;
  expiresAt: Date;
  bids: { playerId: string; amount: { toNumber(): number }; maxProxyAmount: { toNumber(): number } | null }[];
}
