import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import objectHash from "object-hash";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Database } from "../src/db";

const settings = {
  locked: true,
  mode: "time",
  time: 30,
  words: 25,
  quoteLength: [0],
  punctuation: false,
  numbers: false,
  language: "english",
};

/** A 30s result at any speed, the typed characters follow from it. */
function buildResultAt(wpm: number): object {
  const chars = wpm * 2.5;
  return buildResult({
    wpm,
    rawWpm: wpm + 2,
    charStats: [chars - 5, 1, 0, 0],
    charTotal: chars + 5,
  });
}

/** 30s at 60 wpm with human looking timing. */
function buildResult(overrides: Record<string, unknown> = {}): object {
  const keys = 150;
  const result = {
    wpm: 60,
    rawWpm: 62,
    charStats: [140, 1, 0, 0],
    acc: 98,
    mode: "time",
    mode2: "30",
    timestamp: 1,
    testDuration: 30,
    consistency: 80,
    keyConsistency: 70,
    chartData: { wpm: [60], burst: [60], err: [0] },
    uid: "player",
    restartCount: 0,
    incompleteTestSeconds: 0,
    afkDuration: 0,
    tags: [],
    bailedOut: false,
    blindMode: false,
    lazyMode: false,
    funbox: [],
    language: "english",
    difficulty: "normal",
    numbers: false,
    punctuation: false,
    charTotal: 155,
    keyDuration: Array.from({ length: keys }, (_, i) => 60 + (i % 7) * 9),
    keySpacing: Array.from({ length: keys }, (_, i) => 120 + (i % 11) * 16),
    keyOverlap: 1,
    lastKeyToEnd: 1,
    startToFirstKey: 1,
    wpmConsistency: 80,
    stopOnLetter: false,
    incompleteTests: [],
    ...overrides,
  };
  return { ...result, hash: objectHash(result) };
}

describe("game api", () => {
  let db: Database;
  let server: Server;
  let base: string;
  let time: number;

  beforeEach(async () => {
    time = 1_000_000;
    db = new Database(":memory:");
    const app = createApp({ db, now: () => time });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  afterEach(() => {
    server.closeAllConnections();
    server.close();
    db.close();
  });

  async function post(
    path: string,
    body: unknown,
    token?: string,
  ): Promise<{ status: number; body: Record<string, string> }> {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token !== undefined ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as never };
  }

  async function createGame(custom: object = {}): Promise<string> {
    const res = await post("/games", { settings: { ...settings, ...custom } });
    expect(res.status).toBe(201);
    return res.body["code"] as string;
  }

  async function join(code: string, name: string): Promise<string> {
    const res = await post(`/games/${code}/players`, { name });
    expect(res.status).toBe(201);
    return res.body["token"] as string;
  }

  it("creates a 5 character code and looks it up case insensitively", async () => {
    const code = await createGame();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
    const res = await fetch(`${base}/games/${code.toLowerCase()}`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { code: string }).code).toBe(code);
  });

  it("404s an unknown game", async () => {
    expect((await fetch(`${base}/games/AAAAA`)).status).toBe(404);
  });

  it("drops punctuation and numbers from modes that ignore them", async () => {
    const code = await createGame({
      mode: "zen",
      punctuation: true,
      numbers: true,
    });
    const res = await fetch(`${base}/games/${code}`);
    const game = (await res.json()) as { settings: typeof settings };
    expect(game.settings.punctuation).toBe(false);
    expect(game.settings.numbers).toBe(false);
  });

  it("needs 10 words of custom text", async () => {
    const res = await post("/games", {
      settings: { ...settings, mode: "custom", customText: "too short" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects taken names regardless of case", async () => {
    const code = await createGame();
    await join(code, "Ada");
    const res = await post(`/games/${code}/players`, { name: "ada" });
    expect(res.status).toBe(409);
  });

  it("rejects markup in names", async () => {
    const code = await createGame();
    const res = await post(`/games/${code}/players`, { name: "<b>x</b>" });
    expect(res.status).toBe(400);
  });

  it("ranks everyone, with players yet to finish last", async () => {
    const code = await createGame();
    const slow = await join(code, "slow");
    await join(code, "waiting");
    const fast = await join(code, "fast");

    time += 31_000;
    const add = async (token: string, wpm: number): Promise<void> => {
      const result = buildResultAt(wpm);
      const res = await post(`/games/${code}/results`, { result }, token);
      expect(res.body).toEqual({ message: "Result saved" });
    };
    await add(slow, 50);
    await add(fast, 70);

    const res = await fetch(`${base}/games/${code}/leaderboard`);
    const board = (await res.json()) as {
      name: string;
      attempts: number;
      best: { wpm: number } | null;
    }[];
    expect(board.map((entry) => entry.name)).toEqual([
      "fast",
      "slow",
      "waiting",
    ]);
    expect(board[0]?.best?.wpm).toBe(70);
    expect(board[2]?.best).toBeNull();
  });

  it("keeps the best result and counts attempts", async () => {
    const code = await createGame();
    const token = await join(code, "ada");
    for (const wpm of [60, 70, 65]) {
      time += 31_000;
      const result = buildResultAt(wpm);
      await post(`/games/${code}/results`, { result }, token);
    }
    const res = await fetch(`${base}/games/${code}/leaderboard`);
    const [entry] = (await res.json()) as {
      attempts: number;
      best: { wpm: number };
    }[];
    expect(entry?.attempts).toBe(3);
    expect(entry?.best.wpm).toBe(70);
  });

  it("streams a result to everyone in the game", async () => {
    const code = await createGame();
    const token = await join(code, "ada");
    const events = await fetch(`${base}/games/${code}/events`);
    const reader = events.body?.getReader();
    await reader?.read();

    time += 31_000;
    await post(`/games/${code}/results`, { result: buildResult() }, token);

    const chunk = await reader?.read();
    const text = new TextDecoder().decode(chunk?.value);
    expect(text).toContain('"type":"result"');
    expect(text).toContain('"name":"ada"');
    await reader?.cancel();
  });

  describe("anticheat", () => {
    let code: string;
    let token: string;

    beforeEach(async () => {
      code = await createGame();
      token = await join(code, "ada");
      time += 31_000;
    });

    const submit = async (result: object, auth = token): Promise<number> =>
      (await post(`/games/${code}/results`, { result }, auth)).status;

    function withBadHash(): object {
      return { ...buildResult(), wpm: 200, hash: "0".repeat(40) };
    }

    it("accepts a clean result", async () => {
      expect(await submit(buildResult())).toBe(201);
    });

    it("needs a valid player token", async () => {
      expect(await submit(buildResult(), "nope")).toBe(401);
    });

    it("rejects a tampered result", async () => {
      expect(await submit(withBadHash())).toBe(461);
    });

    it("rejects low accuracy", async () => {
      expect(await submit(buildResult({ acc: 70 }))).toBe(400);
    });

    it("rejects an abandoned test", async () => {
      expect(await submit(buildResult({ bailedOut: true }))).toBe(400);
    });

    it("rejects a result that finished sooner than the test takes", async () => {
      time -= 10_000;
      expect(await submit(buildResult())).toBe(462);
    });

    it("rejects the same result twice", async () => {
      const result = buildResult();
      expect(await submit(result)).toBe(201);
      time += 31_000;
      expect(await submit(result)).toBe(466);
    });

    it("enforces locked settings", async () => {
      expect(await submit(buildResult({ mode2: "15" }))).toBe(463);
      expect(await submit(buildResult({ punctuation: true }))).toBe(463);
      expect(await submit(buildResult({ numbers: true }))).toBe(463);
      expect(await submit(buildResult({ language: "french" }))).toBe(463);
      expect(await submit(buildResult({ lazyMode: true }))).toBe(463);
    });

    it("lets unlocked games pick their own settings", async () => {
      code = await createGame({ locked: false });
      token = await join(code, "bob");
      time += 31_000;
      expect(await submit(buildResult({ punctuation: true }))).toBe(201);
    });

    it("rejects impossible speed", async () => {
      expect(await submit(buildResult({ wpm: 400, rawWpm: 402 }))).toBe(463);
    });

    it("rejects wpm the typed characters don't add up to", async () => {
      expect(await submit(buildResult({ wpm: 200, rawWpm: 202 }))).toBe(463);
    });

    it("rejects a wrong test duration", async () => {
      expect(await submit(buildResult({ testDuration: 20 }))).toBe(463);
    });

    it("rejects missing key data", async () => {
      expect(await submit(buildResult({ keySpacing: "toolong" }))).toBe(464);
      expect(await submit(buildResult({ keySpacing: [] }))).toBe(464);
    });

    it("rejects speed the key presses can't back", async () => {
      const keySpacing = Array.from({ length: 30 }, (_, i) => 100 + i * 9);
      expect(await submit(buildResult({ keySpacing }))).toBe(463);
    });

    it("rejects metronome timing as a bot", async () => {
      const keySpacing = Array.from({ length: 150 }, () => 200);
      expect(await submit(buildResult({ keySpacing }))).toBe(465);
    });

    it("rejects uniform key durations as a bot", async () => {
      const keyDuration = Array.from({ length: 150 }, () => 50);
      expect(await submit(buildResult({ keyDuration }))).toBe(465);
    });
  });

  it("prunes inactive games", async () => {
    const code = await createGame();
    db.deleteGamesInactiveSince(time + 1);
    expect((await fetch(`${base}/games/${code}`)).status).toBe(404);
  });
});
