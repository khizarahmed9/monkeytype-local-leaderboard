import { randomBytes, randomInt, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  GAME_CODE_ALPHABET,
  GAME_CODE_LENGTH,
  type Game,
  type GameSettings,
  type LeaderboardEntry,
  type LeaderboardResult,
} from "@monkeytype/schemas/games";
import type { CompletedEvent } from "@monkeytype/schemas/results";

type PlayerRow = {
  id: string;
  name: string;
  joined_at: number;
};

type ResultRow = {
  player_id: string;
  wpm: number;
  raw: number;
  acc: number;
  consistency: number;
  mode: LeaderboardResult["mode"];
  mode2: string;
  test_duration: number;
  created_at: number;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < GAME_CODE_LENGTH; i++) {
    code += GAME_CODE_ALPHABET[randomInt(GAME_CODE_ALPHABET.length)];
  }
  return code;
}

export class Database {
  private db: DatabaseSync;

  constructor(file: string) {
    if (file !== ":memory:") {
      mkdirSync(path.dirname(file), { recursive: true });
    }
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS games (
        code TEXT PRIMARY KEY,
        settings TEXT NOT NULL,
        last_activity_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        game_code TEXT NOT NULL REFERENCES games(code) ON DELETE CASCADE,
        name TEXT NOT NULL COLLATE NOCASE,
        token_hash TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        UNIQUE (game_code, name)
      );

      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        hash TEXT NOT NULL,
        wpm REAL NOT NULL,
        raw REAL NOT NULL,
        acc REAL NOT NULL,
        consistency REAL NOT NULL,
        mode TEXT NOT NULL,
        mode2 TEXT NOT NULL,
        test_duration REAL NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (player_id, hash)
      );
    `);
  }

  createGame(settings: GameSettings, now: number): Game {
    const insert = this.db.prepare(
      "INSERT OR IGNORE INTO games (code, settings, last_activity_at) VALUES (?, ?, ?)",
    );
    for (;;) {
      const code = generateCode();
      const { changes } = insert.run(code, JSON.stringify(settings), now);
      if (changes > 0) return { code, settings };
    }
  }

  getGame(code: string): Game | undefined {
    const row = this.db
      .prepare("SELECT settings FROM games WHERE code = ?")
      .get(code) as { settings: string } | undefined;
    if (!row) return undefined;
    return { code, settings: JSON.parse(row.settings) as GameSettings };
  }

  /** Undefined when the name is taken. */
  addPlayer(
    code: string,
    name: string,
    now: number,
  ): { playerId: string; token: string } | undefined {
    const playerId = randomBytes(12).toString("hex");
    const token = randomBytes(32).toString("hex");
    const { changes } = this.db
      .prepare(
        "INSERT OR IGNORE INTO players (id, game_code, name, token_hash, joined_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(playerId, code, name, hashToken(token), now);
    if (changes === 0) return undefined;
    this.touchGame(code, now);
    return { playerId, token };
  }

  getPlayerByToken(code: string, token: string): PlayerRow | undefined {
    return this.db
      .prepare(
        "SELECT id, name, joined_at FROM players WHERE game_code = ? AND token_hash = ?",
      )
      .get(code, hashToken(token)) as PlayerRow | undefined;
  }

  getLastResultAt(playerId: string): number | undefined {
    const row = this.db
      .prepare("SELECT MAX(created_at) AS at FROM results WHERE player_id = ?")
      .get(playerId) as { at: number | null };
    return row.at ?? undefined;
  }

  /** False when this exact result was already submitted. */
  addResult(
    code: string,
    playerId: string,
    result: CompletedEvent,
    now: number,
  ): boolean {
    const { changes } = this.db
      .prepare(
        `INSERT OR IGNORE INTO results
          (player_id, hash, wpm, raw, acc, consistency, mode, mode2, test_duration, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        playerId,
        result.hash,
        result.wpm,
        result.rawWpm,
        result.acc,
        result.consistency,
        result.mode,
        result.mode2,
        result.testDuration,
        now,
      );
    if (changes === 0) return false;
    this.touchGame(code, now);
    return true;
  }

  /** Everyone in the game, best result first, players yet to finish last. */
  getLeaderboard(code: string): LeaderboardEntry[] {
    const players = this.db
      .prepare(
        "SELECT id, name, joined_at FROM players WHERE game_code = ? ORDER BY joined_at, id",
      )
      .all(code) as PlayerRow[];

    const results = this.db
      .prepare(
        `SELECT r.player_id, r.wpm, r.raw, r.acc, r.consistency, r.mode, r.mode2,
            r.test_duration, r.created_at
          FROM results r JOIN players p ON p.id = r.player_id
          WHERE p.game_code = ?
          ORDER BY r.wpm DESC, r.acc DESC, r.created_at`,
      )
      .all(code) as ResultRow[];

    const entries = new Map<string, LeaderboardEntry>(
      players.map((player) => [
        player.id,
        { id: player.id, name: player.name, attempts: 0, best: null },
      ]),
    );

    for (const row of results) {
      const entry = entries.get(row.player_id);
      if (entry === undefined) continue;
      entry.attempts++;
      entry.best ??= {
        wpm: row.wpm,
        raw: row.raw,
        acc: row.acc,
        consistency: row.consistency,
        mode: row.mode,
        mode2: row.mode2,
        testDuration: row.test_duration,
        timestamp: row.created_at,
      };
    }

    const leaderboard = [...entries.values()];
    const wpmOf = (entry: LeaderboardEntry): number => entry.best?.wpm ?? -1;
    const accOf = (entry: LeaderboardEntry): number => entry.best?.acc ?? -1;
    // stable: equal entries keep their join order
    return leaderboard.sort(
      (a, b) => wpmOf(b) - wpmOf(a) || accOf(b) - accOf(a),
    );
  }

  deleteGamesInactiveSince(timestamp: number): void {
    this.db
      .prepare("DELETE FROM games WHERE last_activity_at < ?")
      .run(timestamp);
  }

  close(): void {
    this.db.close();
  }

  private touchGame(code: string, now: number): void {
    this.db
      .prepare("UPDATE games SET last_activity_at = ? WHERE code = ?")
      .run(now, code);
  }
}
