import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { PlayersModule } from "./players/players.module.js";

@Module({
  imports: [PrismaModule, PlayersModule],
  controllers: [AppController],
})
export class AppModule {}
