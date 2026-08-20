import { BadRequestException, Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { loginInputSchema, registerInputSchema } from "@patrimoine-jeu/domain";
import { AuthService } from "./auth.service.js";

const COOKIE_NAME = "token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = registerInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { playerId, token } = await this.authService.register(parsed.data);
    this.setSessionCookie(res, token);
    return { playerId };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = loginInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { playerId, token } = await this.authService.login(parsed.data);
    this.setSessionCookie(res, token);
    return { playerId };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE_MS,
      path: "/",
    });
  }
}
