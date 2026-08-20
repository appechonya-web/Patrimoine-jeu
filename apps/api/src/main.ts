import "dotenv/config";
import "reflect-metadata";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set (check apps/api/.env)");
  }

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
