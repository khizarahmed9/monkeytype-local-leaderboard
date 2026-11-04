import type { Game } from "@monkeytype/schemas/games";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { joinGame } from "../../src/ts/controllers/game-controller";
import { getPlayer, setGame, setPlayer } from "../../src/ts/states/game";

function buildGame(code: string): Game {
  return {
    code,
    settings: {
      locked: false,
      mode: "time",
      time: 30,
      words: 25,
      quoteLength: [0],
      punctuation: false,
      numbers: false,
      language: "english",
    },
  };
}

describe("joining a game", () => {
  let joins = 0;

  beforeEach(() => {
    joins = 0;
    setGame(null);
    setPlayer(null);
    vi.stubGlobal(
      "EventSource",
      class {
        onmessage = null;
      },
    );
    vi.stubGlobal("fetch", async () => {
      joins++;
      return new Response(
        JSON.stringify({ playerId: `p${joins}`, token: `t${joins}` }),
        { status: 201 },
      );
    });
  });

  it("brings back a name this browser already played under", async () => {
    const game = buildGame("ABCDE");
    await joinGame(game, "Ada");
    await joinGame(game, "Bob");
    await joinGame(game, " ada ");

    expect(joins).toBe(2);
    expect(getPlayer()).toEqual({ playerId: "p1", token: "t1", name: "Ada" });
  });

  it("treats the same name in another game as a new player", async () => {
    await joinGame(buildGame("FGHJK"), "Ada");
    await joinGame(buildGame("LMNPQ"), "Ada");
    expect(joins).toBe(2);
  });
});
