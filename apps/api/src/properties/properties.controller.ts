import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  createAuctionInputSchema,
  listPropertyForSaleInputSchema,
  placeBidInputSchema,
  requestMortgageInputSchema,
  setPropertyCustomNameInputSchema,
} from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PropertiesService } from "./properties.service.js";

@Controller("properties")
@UseGuards(JwtAuthGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  listMarket(@CurrentPlayer() playerId: string) {
    return this.propertiesService.listMarket(playerId);
  }

  @Get("me")
  listMine(@CurrentPlayer() playerId: string) {
    return this.propertiesService.listMine(playerId);
  }

  @Get("prestige")
  listPrestigeProperties() {
    return this.propertiesService.listPrestigeProperties();
  }

  @Post(":id/buy")
  buy(@CurrentPlayer() playerId: string, @Param("id") propertyId: string) {
    return this.propertiesService.buy(playerId, propertyId);
  }

  @Post(":id/list")
  listForSale(@CurrentPlayer() playerId: string, @Param("id") propertyId: string, @Body() body: unknown) {
    const parsed = listPropertyForSaleInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.propertiesService.listForSale(playerId, propertyId, parsed.data);
  }

  @Delete(":id/list")
  cancelListing(@CurrentPlayer() playerId: string, @Param("id") propertyId: string) {
    return this.propertiesService.cancelListing(playerId, propertyId);
  }

  @Post(":id/rent")
  rent(@CurrentPlayer() playerId: string, @Param("id") propertyId: string) {
    return this.propertiesService.rent(playerId, propertyId);
  }

  @Delete(":id/rent")
  endRent(@CurrentPlayer() playerId: string, @Param("id") propertyId: string) {
    return this.propertiesService.endRent(playerId, propertyId);
  }

  @Post(":id/renovate")
  renovate(@CurrentPlayer() playerId: string, @Param("id") propertyId: string) {
    return this.propertiesService.renovate(playerId, propertyId);
  }

  @Post(":id/mortgage")
  requestMortgage(@CurrentPlayer() playerId: string, @Param("id") propertyId: string, @Body() body: unknown) {
    const parsed = requestMortgageInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.propertiesService.requestMortgage(playerId, propertyId, parsed.data);
  }

  @Post(":id/mortgage/payoff")
  payoffMortgage(@CurrentPlayer() playerId: string, @Param("id") propertyId: string) {
    return this.propertiesService.payoffMortgage(playerId, propertyId);
  }

  @Post(":id/auction")
  listForAuction(@CurrentPlayer() playerId: string, @Param("id") propertyId: string, @Body() body: unknown) {
    const parsed = createAuctionInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.propertiesService.listForAuction(playerId, propertyId, parsed.data);
  }

  @Post(":id/bid")
  placeBid(@CurrentPlayer() playerId: string, @Param("id") propertyId: string, @Body() body: unknown) {
    const parsed = placeBidInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.propertiesService.placeBid(playerId, propertyId, parsed.data);
  }

  @Post(":id/custom-name")
  setCustomName(@CurrentPlayer() playerId: string, @Param("id") propertyId: string, @Body() body: unknown) {
    const parsed = setPropertyCustomNameInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.propertiesService.setCustomName(playerId, propertyId, parsed.data);
  }
}
