import { z } from "zod";

export const playerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  pseudo: z.string().min(3).max(32),
  createdAt: z.coerce.date(),
});

export type Player = z.infer<typeof playerSchema>;

export const playerStatsSchema = z.object({
  playerId: z.string().uuid(),
  wealthLiquid: z.number(),
  wealthDisplayed: z.number(),
  reputation: z.number().min(0).max(100),
  experience: z.number().min(0),
  wellbeing: z.number().min(0).max(100),
});

export type PlayerStats = z.infer<typeof playerStatsSchema>;
