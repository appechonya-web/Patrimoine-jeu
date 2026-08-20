import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { answerQuizInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { QuizService } from "./quiz.service.js";

@Controller("quiz")
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  status(@CurrentPlayer() playerId: string) {
    return this.quizService.status(playerId);
  }

  @Post(":id/answer")
  answer(@CurrentPlayer() playerId: string, @Param("id") questionId: string, @Body() body: unknown) {
    const parsed = answerQuizInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.quizService.answer(playerId, questionId, parsed.data.answer);
  }
}
