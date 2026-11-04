import type { Game, GameMode, GameSettings } from "@monkeytype/schemas/games";
import { createSignal } from "solid-js";

import type { Config, QuoteLengthConfig } from "@monkeytype/schemas/configs";

export type GamePlayer = { playerId: string; token: string; name: string };

export const [getGame, setGame] = createSignal<Game | null>(null);
export const [getPlayer, setPlayer] = createSignal<GamePlayer | null>(null);

/** A finished test hands the device to the next player. */
export const [needsPlayerName, setNeedsPlayerName] = createSignal(false);

export const isGameLocked = (): boolean => getGame()?.settings.locked === true;

/** The test config every player of a locked game has to use. */
export function getLockedConfig(settings: GameSettings): Partial<Config> {
  const { mode, language, punctuation, numbers } = settings;
  return {
    funbox: [],
    lazyMode: false,
    language,
    ...(mode === "time" && { time: settings.time }),
    ...(mode === "words" && { words: settings.words }),
    ...(mode === "quote" && {
      quoteLength: settings.quoteLength as QuoteLengthConfig,
    }),
    mode,
    punctuation,
    numbers,
  };
}

// time, words and quoteLength each switch the mode when set, so the ones the
// game doesn't use stay locked too
const LOCKED_KEYS = new Set<keyof Config>([
  "funbox",
  "lazyMode",
  "language",
  "time",
  "words",
  "quoteLength",
  "mode",
  "punctuation",
  "numbers",
]);

export function isConfigLocked<K extends keyof Config>(
  key: K,
  value: Config[K],
): boolean {
  const game = getGame();
  if (game === null || !game.settings.locked || !LOCKED_KEYS.has(key)) {
    return false;
  }
  const locked = getLockedConfig(game.settings)[key];
  return JSON.stringify(locked) !== JSON.stringify(value);
}

export function getModeLabel(mode: GameMode, mode2: string): string {
  if (mode === "time") return `${mode2}s`;
  if (mode === "words") return `${mode2} words`;
  return mode;
}

export function getGameLabel(settings: GameSettings): string {
  if (!settings.locked) return "players pick their own settings";

  const { mode, time, words, punctuation, numbers, language } = settings;
  const mode2 = mode === "time" ? String(time) : String(words);
  return [
    getModeLabel(mode, mode2),
    punctuation && "punctuation",
    numbers && "numbers",
    language.replaceAll("_", " "),
  ]
    .filter(Boolean)
    .join(" · ");
}
