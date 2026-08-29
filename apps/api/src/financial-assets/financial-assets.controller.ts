import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  buyAssetInputSchema,
  createAssetOrderInputSchema,
  sellAssetInputSchema,
  setDividendPolicyInputSchema,
} from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { FinancialAssetsService } from "./financial-assets.service.js";

@Controller("financial-assets")
@UseGuards(JwtAuthGuard)
export class FinancialAssetsController {
  constructor(private readonly financialAssetsService: FinancialAssetsService) {}

  @Get()
  list(@CurrentPlayer() playerId: string) {
    return this.financialAssetsService.list(playerId);
  }

  @Get("price-history")
  priceHistory() {
    return this.financialAssetsService.priceHistory();
  }

  @Post(":key/buy")
  buy(@CurrentPlayer() playerId: string, @Param("key") key: string, @Body() body: unknown) {
    const parsed = buyAssetInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.financialAssetsService.buy(playerId, key, parsed.data.amount);
  }

  @Post(":key/sell")
  sell(@CurrentPlayer() playerId: string, @Param("key") key: string, @Body() body: unknown) {
    const parsed = sellAssetInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.financialAssetsService.sell(playerId, key, parsed.data.quantity);
  }

  @Post(":key/dividend-policy")
  setDividendPolicy(@CurrentPlayer() playerId: string, @Param("key") key: string, @Body() body: unknown) {
    const parsed = setDividendPolicyInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.financialAssetsService.setDividendPolicy(playerId, key, parsed.data.policy);
  }

  @Get("transactions")
  listTransactions(@CurrentPlayer() playerId: string) {
    return this.financialAssetsService.listTransactions(playerId);
  }

  @Get("orders")
  listOrders(@CurrentPlayer() playerId: string) {
    return this.financialAssetsService.listOrders(playerId);
  }

  @Post(":key/orders")
  createOrder(@CurrentPlayer() playerId: string, @Param("key") key: string, @Body() body: unknown) {
    const parsed = createAssetOrderInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.financialAssetsService.createOrder(playerId, key, parsed.data);
  }

  @Delete("orders/:orderId")
  cancelOrder(@CurrentPlayer() playerId: string, @Param("orderId") orderId: string) {
    return this.financialAssetsService.cancelOrder(playerId, orderId);
  }
}
