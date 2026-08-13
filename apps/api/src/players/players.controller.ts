import { BadRequestException, Controller, Get, Headers } from "@nestjs/common";
import { PlayersService } from "./players.service.js";

@Controller("players")
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  // Pas d'auth/session encore : l'identité du joueur transite temporairement
  // par ce header. À remplacer par un vrai mécanisme (JWT/session) plus tard.
  @Get("me")
  async me(@Headers("x-player-id") playerId?: string) {
    if (!playerId) {
      throw new BadRequestException("Missing x-player-id header");
    }
    return this.playersService.findMe(playerId);
  }
}
