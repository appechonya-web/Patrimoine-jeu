/**
 * Bonus de connexion quotidien — récompense croissante avec la régularité
 * (streak de jours calendaires consécutifs), remise à 1 si le joueur
 * manque un jour. Basé sur la date calendaire (UTC), pas sur "24h depuis
 * la dernière fois" : le joueur peut réclamer à n'importe quelle heure de
 * sa journée sans perdre son streak pour avoir joué un peu plus tôt ou
 * plus tard que la veille.
 */

export const DAILY_BONUS_BASE = 10;
export const DAILY_BONUS_INCREMENT_PER_STREAK_DAY = 5;
export const DAILY_BONUS_MAX_STREAK_DAYS = 7;
