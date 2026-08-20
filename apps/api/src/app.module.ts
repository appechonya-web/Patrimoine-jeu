import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { PlayersModule } from "./players/players.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CyclesModule } from "./cycles/cycles.module.js";
import { EmploymentModule } from "./employment/employment.module.js";
import { CompaniesModule } from "./companies/companies.module.js";
import { CommoditiesModule } from "./commodities/commodities.module.js";
import { PropertiesModule } from "./properties/properties.module.js";
import { GigsModule } from "./gigs/gigs.module.js";
import { PersonalModule } from "./personal/personal.module.js";
import { LeaderboardModule } from "./leaderboard/leaderboard.module.js";
import { SavingsModule } from "./savings/savings.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { PersonalGoodsModule } from "./personal-goods/personal-goods.module.js";
import { IndependentActivityModule } from "./independent-activity/independent-activity.module.js";
import { EngagementModule } from "./engagement/engagement.module.js";
import { QuizModule } from "./quiz/quiz.module.js";
import { FinancialAssetsModule } from "./financial-assets/financial-assets.module.js";
import { GuildsModule } from "./guilds/guilds.module.js";
import { DonationsModule } from "./donations/donations.module.js";
import { PressModule } from "./press/press.module.js";
import { MunicipalitiesModule } from "./municipalities/municipalities.module.js";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CyclesModule,
    EmploymentModule,
    CompaniesModule,
    CommoditiesModule,
    PropertiesModule,
    GigsModule,
    PersonalModule,
    LeaderboardModule,
    SavingsModule,
    NotificationsModule,
    PersonalGoodsModule,
    IndependentActivityModule,
    EngagementModule,
    QuizModule,
    FinancialAssetsModule,
    GuildsModule,
    DonationsModule,
    PressModule,
    MunicipalitiesModule,
    PlayersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
