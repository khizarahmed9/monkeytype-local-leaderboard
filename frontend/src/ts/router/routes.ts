// The route tree: every page with its guards and loaders

import { type QueryClient } from "@tanstack/solid-query";
import {
  createRootRouteWithContext,
  createRoute,
  redirect,
} from "@tanstack/solid-router";

import { PageSwitcher } from "../components/core/PageSwitcher";
import { AboutPage } from "../components/pages/AboutPage";
import { createRouterPage } from "../components/core/Page";
import { GameLeaderboardPage } from "../components/pages/game/GameLeaderboardPage";
import { GamePage } from "../components/pages/game/GamePage";
import { restoreGame } from "../controllers/game-controller";
import { SettingsPage } from "../components/pages/settings/SettingsPage";
import { TestPage } from "../components/pages/test/TestPage";
import { SettingsSearchSchema } from "../states/settings-highlight";
import { applyUrlActions } from "../url-actions/apply";

/** A page of the site, rendered by its route (see `staticData.page`). */
export type PageName =
  | "loading"
  | "test"
  | "about"
  | "settings"
  | "404"
  | "leaderboards"
  | "play";

declare module "@tanstack/solid-router" {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- module augmentation needs an interface
  interface StaticDataRouteOption {
    /** The page the route renders (its component is a `createRouterPage`). */
    page?: PageName;
  }
}

/** Router context: guards and loaders read these instead of module globals. */
export type RouterContext = {
  queryClient: QueryClient;
};

async function requireGame(preload: boolean): Promise<void> {
  if (preload) return;
  if (!(await restoreGame())) redirect({ to: "/play", throw: true });
}

// each route renders its page, the page switcher fades between them
const root = createRootRouteWithContext<RouterContext>()({
  component: PageSwitcher,
});

// pathless layout, the parent of every page
const userDataRoute = createRoute({
  getParentRoute: () => root,
  id: "userData",
  // pending at once: the router only presents a pending route after
  // pendingMs, so on first load nothing would render (not even the page
  // switcher's loading page) until then
  pendingMs: 0,
  pendingMinMs: 0,
});

const test = createRoute({
  getParentRoute: () => userDataRoute,
  path: "/",
  staticData: { page: "test" },
  component: createRouterPage(TestPage),
  // shared links (test settings, custom theme, challenge): applied, then
  // dropped from the url so a reload doesn't apply them again
  beforeLoad: async ({ location, preload }) => {
    await requireGame(preload);
    if (preload) return;
    const rest = applyUrlActions(location);
    if (rest === undefined) return;
    redirect({
      to: "/",
      search: rest.search,
      hash: rest.hash,
      replace: true,
      throw: true,
    });
  },
});

const play = createRoute({
  getParentRoute: () => userDataRoute,
  path: "/play",
  staticData: { page: "play" },
  component: createRouterPage(GamePage),
});

const leaderboard = createRoute({
  getParentRoute: () => userDataRoute,
  path: "/leaderboard",
  staticData: { page: "leaderboards" },
  component: createRouterPage(GameLeaderboardPage),
  beforeLoad: async ({ preload }) => requireGame(preload),
});

const about = createRoute({
  getParentRoute: () => userDataRoute,
  path: "/about",
  staticData: { page: "about" },
  component: createRouterPage(AboutPage),
});

const settings = createRoute({
  getParentRoute: () => userDataRoute,
  path: "/settings",
  staticData: { page: "settings" },
  component: createRouterPage(SettingsPage),
  validateSearch: SettingsSearchSchema,
});

export const routeTree = root.addChildren([
  userDataRoute.addChildren([test, play, leaderboard, about, settings]),
]);
