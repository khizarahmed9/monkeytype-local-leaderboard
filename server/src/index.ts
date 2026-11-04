import path from "node:path";
import { createApp } from "./app";
import { Database } from "./db";

const HOUR_MS = 60 * 60 * 1000;

const port = Number(process.env["PORT"] ?? 5005);
const dataDir = process.env["DATA_DIR"] ?? "./data";
const frontendDir =
  process.env["FRONTEND_DIR"] ?? path.join(process.cwd(), "frontend", "dist");
const gameTtlDays = Number(process.env["GAME_TTL_DAYS"] ?? 30);
// how many reverse proxies sit in front, the rate limits need the real client ip
const trustProxy = Number(process.env["TRUST_PROXY"] ?? 0);

const db = new Database(path.join(dataDir, "games.db"));

const app = createApp({ db, frontendDir, trustProxy });

function pruneGames(): void {
  db.deleteGamesInactiveSince(Date.now() - gameTtlDays * 24 * HOUR_MS);
}
pruneGames();
setInterval(pruneGames, HOUR_MS).unref();

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

function shutdown(): void {
  // open event streams would keep close() waiting forever
  server.closeAllConnections();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
