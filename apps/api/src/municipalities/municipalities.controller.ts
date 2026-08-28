import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  castCouncilVoteInputSchema,
  contributeToInfrastructureInputSchema,
  createCouncilProposalInputSchema,
  moveResidenceInputSchema,
} from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { MunicipalitiesService } from "./municipalities.service.js";

@Controller("municipalities")
@UseGuards(JwtAuthGuard)
export class MunicipalitiesController {
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  @Get("ranking")
  getRanking() {
    return this.municipalitiesService.getRanking();
  }

  @Get("residence")
  getResidence(@CurrentPlayer() playerId: string) {
    return this.municipalitiesService.getResidence(playerId);
  }

  @Post("residence")
  moveResidence(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = moveResidenceInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.municipalitiesService.moveResidence(playerId, parsed.data);
  }

  @Get(":id/summary")
  getSummary(@Param("id") municipalityId: string) {
    return this.municipalitiesService.getSummary(municipalityId);
  }

  @Post(":id/contribute")
  contribute(@CurrentPlayer() playerId: string, @Param("id") municipalityId: string, @Body() body: unknown) {
    const parsed = contributeToInfrastructureInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.municipalitiesService.contribute(playerId, municipalityId, parsed.data);
  }

  @Get(":id/contributors")
  listContributors(@Param("id") municipalityId: string) {
    return this.municipalitiesService.listContributors(municipalityId);
  }

  @Post(":id/proposals")
  createProposal(@CurrentPlayer() playerId: string, @Param("id") municipalityId: string, @Body() body: unknown) {
    const parsed = createCouncilProposalInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.municipalitiesService.createProposal(playerId, municipalityId, parsed.data);
  }

  @Get(":id/proposals")
  listProposals(@Param("id") municipalityId: string) {
    return this.municipalitiesService.listProposals(municipalityId);
  }

  @Post("proposals/:proposalId/vote")
  castVote(@CurrentPlayer() playerId: string, @Param("proposalId") proposalId: string, @Body() body: unknown) {
    const parsed = castCouncilVoteInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.municipalitiesService.castVote(playerId, proposalId, parsed.data);
  }
}
