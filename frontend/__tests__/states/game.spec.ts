import type { GameSettings } from "@monkeytype/schemas/games";
import { afterEach, describe, expect, it } from "vitest";

import {
  getGameLabel,
  getLockedConfig,
  isConfigLocked,
  setGame,
} from "../../src/ts/states/game";

const settings: GameSettings = {
  locked: true,
  mode: "time",
  time: 60,
  words: 25,
  quoteLength: [0],
  punctuation: true,
  numbers: false,
  language: "english",
};

describe("game config lock", () => {
  afterEach(() => setGame(null));

  it("locks nothing outside a game", () => {
    expect(isConfigLocked("time", 15)).toBe(false);
  });

  it("locks nothing in an unlocked game", () => {
    setGame({ code: "ABCDE", settings: { ...settings, locked: false } });
    expect(isConfigLocked("time", 15)).toBe(false);
  });

  it("only lets the game's values through", () => {
    setGame({ code: "ABCDE", settings });
    expect(isConfigLocked("time", 60)).toBe(false);
    expect(isConfigLocked("time", 15)).toBe(true);
    expect(isConfigLocked("punctuation", true)).toBe(false);
    expect(isConfigLocked("punctuation", false)).toBe(true);
    expect(isConfigLocked("funbox", [])).toBe(false);
    expect(isConfigLocked("funbox", ["58008"])).toBe(true);
  });

  it("blocks the settings that would switch the mode", () => {
    setGame({ code: "ABCDE", settings });
    expect(isConfigLocked("words", 25)).toBe(true);
    expect(isConfigLocked("quoteLength", [0])).toBe(true);
  });

  it("leaves other settings alone", () => {
    setGame({ code: "ABCDE", settings });
    expect(isConfigLocked("theme", "dark")).toBe(false);
  });

  it("applies only the active mode's value", () => {
    const config = getLockedConfig({ ...settings, mode: "words" });
    expect(config.words).toBe(25);
    expect(config.time).toBeUndefined();
  });

  it("describes the game", () => {
    expect(getGameLabel(settings)).toBe("60s · punctuation · english");
    expect(getGameLabel({ ...settings, locked: false })).toBe(
      "players pick their own settings",
    );
  });
});
