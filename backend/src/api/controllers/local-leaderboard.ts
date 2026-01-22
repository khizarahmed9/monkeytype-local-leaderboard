import {
  GetLocalLeaderboardResponse,
  LocalLeaderboardEntry,
} from "@monkeytype/contracts";
import fs from "fs";
import path from "path";
import { MonkeyResponse } from "../../utils/monkey-response";
import { MonkeyRequest } from "../types";

const CSV_FILE = path.join(process.cwd(), "local_leaderboard.csv");

export async function getLocalLeaderboard(
  _req: MonkeyRequest,
): Promise<GetLocalLeaderboardResponse> {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      return new MonkeyResponse("ok", []);
    }
    const content = await fs.promises.readFile(CSV_FILE, "utf-8");
    const lines = content.trim().split("\n");
    const entries: LocalLeaderboardEntry[] = lines
      .map((line) => {
        const [name, wpm, acc, timestamp] = line.split(",");
        if (!name || !wpm || !acc || !timestamp) return null;
        return {
          name,
          wpm: parseFloat(wpm),
          acc: parseFloat(acc),
          timestamp: parseInt(timestamp),
        };
      })
      .filter((e): e is LocalLeaderboardEntry => e !== null)
      .sort((a, b) => b.wpm - a.wpm);

    return new MonkeyResponse("ok", entries);
  } catch (e) {
    console.error("Error reading local leaderboard", e);
    return new MonkeyResponse("ok", []);
  }
}

export async function addLocalLeaderboardEntry(
  req: MonkeyRequest<undefined, LocalLeaderboardEntry>,
): Promise<MonkeyResponse<{ message: string }>> {
  const entry = req.body;
  const line = `${entry.name},${entry.wpm},${entry.acc},${entry.timestamp}\n`;
  await fs.promises.appendFile(CSV_FILE, line);
  return new MonkeyResponse("Result saved", { message: "Result saved" });
}
