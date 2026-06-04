import { z } from "zod";
import { PREDICTIONS, MATCH_STATUS, REACH_PHASES, TOURNAMENT_QUESTIONS } from "./constants";
import { isValidAvatarValue } from "./avatars";

const questionKeys = TOURNAMENT_QUESTIONS.map((q) => q.key) as [string, ...string[]];

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  displayName: z
    .string()
    .trim()
    .min(2, "Anzeigename muss mindestens 2 Zeichen haben.")
    .max(30, "Anzeigename darf höchstens 30 Zeichen haben."),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben.").max(100),
  inviteCode: z.string().optional(),
});

export const loginSchema = z.object({
  // E-Mail ODER Anzeigename
  identifier: z.string().trim().min(1, "Bitte E-Mail oder Anzeigename angeben."),
  password: z.string().min(1, "Bitte Passwort eingeben."),
});

export const predictionSchema = z.object({
  matchId: z.string().min(1),
  prediction: z.enum(PREDICTIONS),
});

export const resultSchema = z.object({
  matchId: z.string().min(1),
  homeGoals: z.coerce.number().int().min(0).max(99),
  awayGoals: z.coerce.number().int().min(0).max(99),
  status: z.enum(MATCH_STATUS).default("finished"),
});

export const tournamentBetSchema = z
  .object({
    questionKey: z.enum(questionKeys),
    teamId: z.string().optional().or(z.literal("")),
    playerId: z.string().optional().or(z.literal("")),
  })
  .refine((d) => !!d.teamId || !!d.playerId, "Bitte ein Team oder einen Spieler wählen.");

export const teamProgressSchema = z.object({
  teamId: z.string().min(1),
  // leerer String = zurücksetzen (noch offen)
  reachedPhase: z.enum(REACH_PHASES).optional().or(z.literal("")),
  isChampion: z.coerce.boolean().optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Neues Passwort muss mindestens 8 Zeichen haben.").max(100),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(30),
  // leer, Standard-Avatar ("preset:<id>") oder eigene http(s)-URL
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine(isValidAvatarValue, "Ungültiger Avatar – bitte Standard-Avatar wählen oder gültige URL angeben.")
    .optional()
    .or(z.literal("")),
});
