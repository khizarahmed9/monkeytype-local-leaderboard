import {
  type Game,
  GameCodeSchema,
  type GameEvent,
  type GameSettings,
  getCustomTextWords,
  type LeaderboardEntry,
} from "@monkeytype/schemas/games";
import type { CompletedEvent } from "@monkeytype/schemas/results";
import { queryOptions } from "@tanstack/solid-query";
import objectHash from "object-hash";
import { createEffect, createRoot } from "solid-js";
import { z } from "zod";

import { configLoadPromise } from "../config/lifecycle";
import { setConfig } from "../config/setters";
import { queryClient } from "../queries";
import {
  type GamePlayer,
  getGame,
  getLockedConfig,
  getModeLabel,
  getPlayer,
  setGame,
  setPlayer,
} from "../states/game";
import {
  showErrorNotification,
  showNoticeNotification,
} from "../states/notifications";
import { getRoutePage } from "../states/router";
import { isTestActive } from "../states/test";
import * as CustomText from "../test/custom-text";
import { typedKeys } from "@monkeytype/util/objects";
import { LocalStorageWithSchema } from "../utils/local-storage-with-schema";

// players of a game can't pick their name again, so leaving keeps the session
// for coming back
const sessions = new LocalStorageWithSchema({
  key: "gameSessions",
  schema: z.object({
    active: GameCodeSchema.nullable(),
    players: z.record(
      z.object({ playerId: z.string(), token: z.string(), name: z.string() }),
    ),
  }),
  fallback: { active: null, players: {} },
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Request failed");
  return body;
}

export async function findGame(code: string): Promise<Game> {
  return request(`/games/${code}`);
}

export async function createGame(settings: GameSettings): Promise<Game> {
  return request("/games", {
    method: "POST",
    body: JSON.stringify({ settings }),
  });
}

export async function joinGame(game: Game, name: string): Promise<void> {
  const player = await request<Omit<GamePlayer, "name">>(
    `/games/${game.code}/players`,
    { method: "POST", body: JSON.stringify({ name }) },
  );
  const { players } = sessions.get();
  sessions.set({
    active: game.code,
    players: { ...players, [game.code]: { ...player, name } },
  });
  enterGame(game, { ...player, name });
}

/** Back into a game this browser already joined, if it did. */
export function resumeGame(game: Game): boolean {
  const { players } = sessions.get();
  const player = players[game.code];
  if (player === undefined) return false;
  sessions.set({ active: game.code, players });
  enterGame(game, player);
  return true;
}

export function leaveGame(): void {
  sessions.set({ ...sessions.get(), active: null });
  // a reload is what drops the locked config and the event stream
  window.location.href = "/play";
}

/** Restores the active game after a reload. False if there is none. */
export async function restoreGame(): Promise<boolean> {
  if (getGame() !== null) return true;

  const { active, players } = sessions.get();
  if (active === null) return false;

  await configLoadPromise;
  try {
    const game = await findGame(active);
    return resumeGame(game);
  } catch (error) {
    showErrorNotification("Could not rejoin your game", { error });
    const { [active]: _gone, ...rest } = players;
    sessions.set({ active: null, players: rest });
    return false;
  }
}

function enterGame(game: Game, player: GamePlayer): void {
  setGame(game);
  setPlayer(player);

  if (game.settings.locked) applyLockedSettings(game.settings);
  listenForEvents(game.code);
}

function applyLockedSettings(settings: GameSettings): void {
  if (settings.mode === "custom") {
    CustomText.setMode("repeat");
    CustomText.setLimitMode("word");
    CustomText.setPipeDelimiter(false);
    CustomText.setText(getCustomTextWords(settings.customText));
  }

  const config = getLockedConfig(settings);
  for (const key of typedKeys(config)) {
    setConfig(key, config[key] as never, { nosave: true });
  }
}

const leaderboardKey = (code: string): string[] => ["gameLeaderboard", code];

// oxlint-disable-next-line typescript/explicit-function-return-type
export const getLeaderboardQueryOptions = (code: string) =>
  queryOptions({
    queryKey: leaderboardKey(code),
    queryFn: async () =>
      request<LeaderboardEntry[]>(`/games/${code}/leaderboard`),
  });

let heldNotifications: string[] = [];

function showResultNotification(message: string): void {
  // finishing someone's test for them with a popup would be rude
  if (isTestActive()) {
    heldNotifications.push(message);
  } else {
    showNoticeNotification(message, { customTitle: "Game", durationMs: 5000 });
  }
}

function listenForEvents(code: string): void {
  const source = new EventSource(`/api/games/${code}/events`);
  source.onmessage = (message) => {
    const event = JSON.parse(message.data as string) as GameEvent;
    void queryClient.invalidateQueries({ queryKey: leaderboardKey(code) });

    if (event.type !== "result") return;
    if (event.playerId === getPlayer()?.playerId) return;
    if (getRoutePage() !== "test") return;

    const test = getModeLabel(event.mode, event.mode2);
    showResultNotification(
      `${event.name} finished ${test}: ${Math.round(event.wpm)} wpm, ${Math.round(event.acc)}% acc`,
    );
  };

  createRoot(() => {
    createEffect(() => {
      if (isTestActive()) return;
      const held = heldNotifications;
      heldNotifications = [];
      held.forEach(showResultNotification);
    });
  });
}

export async function submitResult(completedEvent: CompletedEvent): Promise<void> {
  const game = getGame();
  const player = getPlayer();
  if (game === null || player === null) return;

  // the client drops key data from long tests, the server expects that. the
  // json round trip drops undefined keys, which would change the hash
  const result = JSON.parse(JSON.stringify(completedEvent)) as CompletedEvent;
  result.uid = player.playerId;
  if (result.testDuration > 122) {
    result.chartData = "toolong";
    result.keySpacing = "toolong";
    result.keyDuration = "toolong";
  }
  //@ts-expect-error just in case this is repeated and already has a hash
  delete result.hash;
  result.hash = objectHash(result);

  try {
    await request(`/games/${game.code}/results`, {
      method: "POST",
      headers: { Authorization: `Bearer ${player.token}` },
      body: JSON.stringify({ result }),
    });
  } catch (error) {
    showErrorNotification("Result not saved", { error });
  }
}
