import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { QUIZ_COOLDOWN_SECONDS, QUIZ_CORRECT_REWARD, QUIZ_QUESTIONS } from "@patrimoine-jeu/domain";
import { pickRandomQuizQuestion } from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const ACTION_TYPE = "quiz";
const COOLDOWN_MESSAGE = "Reviens un peu plus tard pour la prochaine question";

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async status(playerId: string) {
    const cooldown = await this.prisma.client.playerActionCooldown.findUnique({
      where: { playerId_actionType: { playerId, actionType: ACTION_TYPE } },
    });
    const secondsRemaining = this.computeSecondsRemaining(cooldown?.lastPlayedAt ?? null);
    const available = secondsRemaining === 0;
    const question = available ? pickRandomQuizQuestion(QUIZ_QUESTIONS) : null;

    return {
      available,
      secondsRemaining,
      cooldownSeconds: QUIZ_COOLDOWN_SECONDS,
      reward: QUIZ_CORRECT_REWARD,
      question: question ? { id: question.id, topic: question.topic, prompt: question.prompt } : null,
    };
  }

  async answer(playerId: string, questionId: string, answer: boolean) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
    if (!question) {
      throw new NotFoundException("Question inconnue");
    }

    const cooldown = await this.prisma.client.playerActionCooldown.findUnique({
      where: { playerId_actionType: { playerId, actionType: ACTION_TYPE } },
    });
    if (this.computeSecondsRemaining(cooldown?.lastPlayedAt ?? null) > 0) {
      throw new BadRequestException(COOLDOWN_MESSAGE);
    }

    const correct = answer === question.correctAnswer;
    const reward = correct ? QUIZ_CORRECT_REWARD : 0;
    const now = new Date();
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerActionCooldown.upsert({
        where: { playerId_actionType: { playerId, actionType: ACTION_TYPE } },
        create: { playerId, actionType: ACTION_TYPE, lastCycle: currentCycle.number, lastPlayedAt: now },
        update: { lastCycle: currentCycle.number, lastPlayedAt: now },
      });
      if (reward > 0) {
        await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: reward } } });
      }
    });

    if (correct) {
      await this.achievementsService.tryUnlock(playerId, "first-quiz");
    }

    return { correct, correctAnswer: question.correctAnswer, explanation: question.explanation, reward };
  }

  private computeSecondsRemaining(lastPlayedAt: Date | null): number {
    if (!lastPlayedAt) return 0;
    return Math.max(0, QUIZ_COOLDOWN_SECONDS - Math.floor((Date.now() - lastPlayedAt.getTime()) / 1000));
  }
}
