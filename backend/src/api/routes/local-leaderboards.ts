import { initServer } from "@ts-rest/express";
import * as LocalLeaderboardController from "../controllers/local-leaderboard";
import { localLeaderboardsContract } from "@monkeytype/contracts";
import { callController } from "../ts-rest-adapter";

const s = initServer();
export default s.router(localLeaderboardsContract, {
  get: {
    handler: async (r) =>
      callController(LocalLeaderboardController.getLocalLeaderboard)(r),
  },
  add: {
    handler: async (r) =>
      callController(LocalLeaderboardController.addLocalLeaderboardEntry)(r),
  },
});
