import cors from "cors";
import express, { json, Request, Response } from "express";
import fs from "fs";
import path from "path";

const CSV_FILE = path.join(process.cwd(), "local_leaderboard.csv");
const FRONTEND_DIST = path.join(process.cwd(), "../frontend/dist");

const app = express();
app.use(json());
app.use(cors());

app.get("/local-leaderboards", (_req: Request, res: Response): void => {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      res.json({ message: "ok", data: [] });
      return;
    }
    const content = fs.readFileSync(CSV_FILE, "utf-8").trim();
    if (!content) {
      res.json({ message: "ok", data: [] });
      return;
    }
    const entries = content
      .split("\n")
      .map((line) => {
        const [name, wpm, acc, timestamp, ...rest] = line.split(",");
        if (
          name === undefined ||
          name === "" ||
          wpm === undefined ||
          wpm === "" ||
          acc === undefined ||
          acc === "" ||
          timestamp === undefined ||
          timestamp === ""
        ) {
          return null;
        }
        return {
          name,
          wpm: parseFloat(wpm),
          acc: parseFloat(acc),
          timestamp: parseInt(timestamp),
          testType: rest.join(",") || "unknown",
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b as { wpm: number }).wpm - (a as { wpm: number }).wpm);
    res.json({ message: "ok", data: entries });
  } catch (e) {
    console.error("Error reading leaderboard", e);
    res.status(500).json({ message: "Error reading leaderboard", data: null });
  }
});

app.post("/local-leaderboards", (req: Request, res: Response): void => {
  const { name, wpm, acc, timestamp, testType } = req.body as {
    name?: string;
    wpm?: number;
    acc?: number;
    timestamp?: number;
    testType?: string;
  };
  if (
    name === undefined ||
    name === "" ||
    wpm === undefined ||
    acc === undefined ||
    timestamp === undefined
  ) {
    res.status(400).json({ message: "Missing required fields", data: null });
    return;
  }
  const line = `${name},${wpm},${acc},${timestamp},${testType ?? "unknown"}\n`;
  fs.appendFileSync(CSV_FILE, line);
  res.json({ message: "Result saved", data: { message: "Result saved" } });
});

// Serve built frontend in production
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback — serve index.html for any unmatched route so the frontend router handles it
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

const PORT = parseInt(process.env["PORT"] ?? "5005", 10);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CSV file: ${CSV_FILE}`);
  if (fs.existsSync(FRONTEND_DIST)) {
    console.log(`Serving frontend from: ${FRONTEND_DIST}`);
  } else {
    console.log(
      `Frontend not built — run 'npm run build-fe' from the project root first`,
    );
  }
});
