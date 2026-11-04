import { z } from "zod";
import { LanguageSchema } from "./languages";

// no 0/O or 1/I, codes get read out loud
export const GAME_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const GAME_CODE_LENGTH = 5;

export const GameCodeSchema = z
  .string()
  .length(GAME_CODE_LENGTH)
  .regex(/^[A-HJ-NP-Z2-9]+$/);
export type GameCode = z.infer<typeof GameCodeSchema>;

export const PlayerNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[\p{L}\p{N}_ .-]+$/u, "letters, numbers, spaces and _ . - only");

export const GameModeSchema = z.enum([
  "time",
  "words",
  "quote",
  "zen",
  "custom",
]);
export type GameMode = z.infer<typeof GameModeSchema>;

// upstream counts anything shorter as too short for a result
export const MIN_TIME_SECONDS = 15;
export const MAX_TIME_SECONDS = 3600;
export const MIN_WORDS = 10;
export const MAX_WORDS = 5000;
export const MAX_CUSTOM_TEXT_LENGTH = 20_000;

export const GameSettingsSchema = z
  .object({
    locked: z.boolean(),
    mode: GameModeSchema,
    time: z.number().int().min(MIN_TIME_SECONDS).max(MAX_TIME_SECONDS),
    words: z.number().int().min(MIN_WORDS).max(MAX_WORDS),
    quoteLength: z.array(z.number().int().min(0).max(3)).min(1).max(4),
    punctuation: z.boolean(),
    numbers: z.boolean(),
    language: LanguageSchema,
    customText: z.string().max(MAX_CUSTOM_TEXT_LENGTH).optional(),
  })
  .strict()
  .refine(
    (settings) =>
      settings.mode !== "custom" ||
      getCustomTextWords(settings.customText).length >= MIN_WORDS,
    {
      message: `custom text needs at least ${MIN_WORDS} words`,
      path: ["customText"],
    },
  );
export type GameSettings = z.infer<typeof GameSettingsSchema>;

export function getCustomTextWords(text: string | undefined): string[] {
  return (text ?? "").split(/\s+/).filter((word) => word !== "");
}

/** The test config a mode allows: quote and zen ignore punctuation and numbers. */
export function normalizeGameSettings(settings: GameSettings): GameSettings {
  const hasModifiers = settings.mode === "time" || settings.mode === "words";
  return {
    ...settings,
    punctuation: hasModifiers && settings.punctuation,
    numbers: hasModifiers && settings.numbers,
    customText: settings.mode === "custom" ? settings.customText : undefined,
  };
}

export const CreateGameRequestSchema = z.object({
  settings: GameSettingsSchema,
});

export const JoinGameRequestSchema = z.object({ name: PlayerNameSchema });

export const GameSchema = z.object({
  code: GameCodeSchema,
  settings: GameSettingsSchema,
});
export type Game = z.infer<typeof GameSchema>;

export const LeaderboardResultSchema = z.object({
  wpm: z.number(),
  raw: z.number(),
  acc: z.number(),
  consistency: z.number(),
  mode: GameModeSchema,
  mode2: z.string(),
  testDuration: z.number(),
  timestamp: z.number(),
});
export type LeaderboardResult = z.infer<typeof LeaderboardResultSchema>;

export const LeaderboardEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  attempts: z.number().int(),
  best: LeaderboardResultSchema.nullable(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export type GameEvent =
  | { type: "join"; playerId: string; name: string }
  | {
      type: "result";
      playerId: string;
      name: string;
      wpm: number;
      acc: number;
      mode: GameMode;
      mode2: string;
    };
