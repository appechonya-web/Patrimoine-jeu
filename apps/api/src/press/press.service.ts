import { Injectable } from "@nestjs/common";
import { PRESS_FEED_DEFAULT_LIMIT } from "@patrimoine-jeu/domain";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PressService {
  constructor(private readonly prisma: PrismaService) {}

  async list(limit = PRESS_FEED_DEFAULT_LIMIT) {
    const articles = await this.prisma.client.pressArticle.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return articles.map((article) => ({
      id: article.id,
      category: article.category,
      headline: article.headline,
      cycle: article.cycle,
      createdAt: article.createdAt,
    }));
  }
}
