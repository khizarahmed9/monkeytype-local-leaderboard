import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/solid-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import navigationCommands from "../../src/ts/commandline/lists/navigation";
import type { Command } from "../../src/ts/commandline/types";
import { getRouter, setRouter } from "../../src/ts/router/instance";

// stands in for the app's route tree
function createTestRouter(): ReturnType<typeof createRouter> {
  const root = createRootRoute();
  const paths = ["/", "/leaderboard", "/about"];
  return createRouter({
    routeTree: root.addChildren(
      paths.map((path) => createRoute({ getParentRoute: () => root, path })),
    ),
    history: createMemoryHistory({ initialEntries: ["/about"] }),
  });
}

let router: ReturnType<typeof createTestRouter>;

function command(id: string): Command {
  const found = navigationCommands.find((it) => it.id === id);
  if (found === undefined) throw new Error(`no command ${id}`);
  return found;
}

async function execAndGetHref(id: string, input?: string): Promise<string> {
  const before = router.state.location.href;
  command(id).exec?.({ input });
  // commands start the navigation without awaiting it
  await vi.waitFor(() => {
    expect(router.state.location.href).not.toBe(before);
  });
  return router.state.location.href;
}

describe("commandline navigation", () => {
  beforeEach(async () => {
    router = createTestRouter();
    await router.load();
    setRouter(router as never);
  });

  it.each([
    ["viewTypingPage", "/"],
    ["viewLeaderboards", "/leaderboard"],
  ])("%s opens %s", async (id, href) => {
    expect(await execAndGetHref(id)).toBe(href);
  });

  it("viewAbout opens /about", async () => {
    await router.navigate({ to: "/" });
    expect(await execAndGetHref("viewAbout")).toBe("/about");
  });
});

// type checked only - a broken internal link fails the type check
export function brokenLinksDoNotTypeCheck(): void {
  const appRouter = getRouter();
  // @ts-expect-error -- not a route
  void appRouter?.navigate({ to: "/not-a-route" });
}
