import type { Response } from "express";
import type { GameEvent } from "@monkeytype/schemas/games";

const HEARTBEAT_MS = 25_000;

const subscribers = new Map<string, Set<Response>>();

export function subscribe(code: string, res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    // nginx buffers responses by default, which would hold events back
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  const game = subscribers.get(code) ?? new Set();
  subscribers.set(code, game);
  game.add(res);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);
  res.on("close", () => {
    clearInterval(heartbeat);
    game.delete(res);
    if (game.size === 0) subscribers.delete(code);
  });
}

export function publish(code: string, event: GameEvent): void {
  for (const res of subscribers.get(code) ?? []) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}
