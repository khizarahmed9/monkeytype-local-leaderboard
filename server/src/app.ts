import { existsSync } from "node:fs";
import path from "node:path";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";
import {
  CreateGameRequestSchema,
  GameCodeSchema,
  JoinGameRequestSchema,
  normalizeGameSettings,
} from "@monkeytype/schemas/games";
import { CompletedEventSchema } from "@monkeytype/schemas/results";
import { z } from "zod";
import { checkResult } from "./anticheat";
import type { Database } from "./db";
import { publish, subscribe } from "./events";

const DUPLICATE_RESULT = 466;

const AddResultRequestSchema = z.object({ result: CompletedEventSchema });

type AppOptions = {
  db: Database;
  frontendDir?: string;
  trustProxy?: boolean | number;
  now?: () => number;
};

function limit(windowMs: number, max: number): express.RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, slow down" },
  });
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue === undefined) return "Invalid request";
  return issue.path.length > 0
    ? `${issue.path.join(".")}: ${issue.message}`
    : issue.message;
}

export function createApp({
  db,
  frontendDir,
  trustProxy = false,
  now = Date.now,
}: AppOptions): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);

  const api = express.Router();
  // key data of the longest test that still carries it
  api.use(express.json({ limit: "256kb" }));

  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  api.post("/games", limit(60 * 60 * 1000, 30), (req, res) => {
    const parsed = CreateGameRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: firstIssue(parsed.error) });
      return;
    }
    const settings = normalizeGameSettings(parsed.data.settings);
    res.status(201).json(db.createGame(settings, now()));
  });

  // everything below acts on one game. the limit is what stops someone
  // walking the code space
  const game = express.Router({ mergeParams: true });
  game.use((req: Request<{ code: string }>, res, next) => {
    const code = GameCodeSchema.safeParse(req.params.code.toUpperCase());
    const found = code.success ? db.getGame(code.data) : undefined;
    if (found === undefined) {
      res.status(404).json({ message: "Game not found" });
      return;
    }
    res.locals["game"] = found;
    next();
  });

  game.get("/", limit(60 * 1000, 60), (_req, res) => {
    res.json(res.locals["game"]);
  });

  game.post("/players", limit(60 * 1000, 20), (req, res) => {
    const parsed = JoinGameRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: firstIssue(parsed.error) });
      return;
    }
    const { code } = res.locals["game"] as { code: string };
    const { name } = parsed.data;
    const player = db.addPlayer(code, name, now());
    if (player === undefined) {
      res.status(409).json({ message: "That name is taken in this game" });
      return;
    }
    publish(code, { type: "join", playerId: player.playerId, name });
    res.status(201).json(player);
  });

  game.get("/leaderboard", limit(60 * 1000, 120), (_req, res) => {
    const { code } = res.locals["game"] as { code: string };
    res.json(db.getLeaderboard(code));
  });

  game.get("/events", limit(60 * 1000, 30), (_req, res) => {
    const { code } = res.locals["game"] as { code: string };
    subscribe(code, res);
  });

  game.post("/results", limit(60 * 1000, 30), (req, res) => {
    const { code, settings } = res.locals["game"] as {
      code: string;
      settings: Parameters<typeof checkResult>[1]["settings"];
    };

    const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const player = db.getPlayerByToken(code, token);
    if (player === undefined) {
      res.status(401).json({ message: "Join the game first" });
      return;
    }

    const parsed = AddResultRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: firstIssue(parsed.error) });
      return;
    }
    const { result } = parsed.data;

    const time = now();
    const lastResultAt = db.getLastResultAt(player.id);
    const rejection = checkResult(result, {
      settings,
      lastActivityAt: lastResultAt ?? player.joined_at,
      hasPreviousResult: lastResultAt !== undefined,
      now: time,
    });
    if (rejection) {
      res.status(rejection.status).json({ message: rejection.message });
      return;
    }

    if (!db.addResult(code, player.id, result, time)) {
      res.status(DUPLICATE_RESULT).json({ message: "Duplicate result" });
      return;
    }

    publish(code, {
      type: "result",
      playerId: player.id,
      name: player.name,
      wpm: result.wpm,
      acc: result.acc,
      mode: result.mode,
      mode2: result.mode2,
    });
    res.status(201).json({ message: "Result saved" });
  });

  api.use("/games/:code", game);
  api.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });
  app.use("/api", api);

  if (frontendDir !== undefined && existsSync(frontendDir)) {
    const index = path.join(frontendDir, "index.html");
    app.use(express.static(frontendDir, { index: false }));
    app.get(/.*/, (_req, res) => {
      res.sendFile(index);
    });
  }

  app.use(
    (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
      const status = (error as Error & { status?: number }).status ?? 500;
      if (status >= 500) console.error(error);
      res
        .status(status)
        .json({ message: status >= 500 ? "Server error" : error.message });
    },
  );

  return app;
}
