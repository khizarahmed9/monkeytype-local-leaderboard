import { z } from "zod";
import { initContract } from "@ts-rest/core";
import {
  CommonResponses,
  meta,
  responseWithData,
} from "./util/api";

export const LocalLeaderboardEntrySchema = z.object({
  name: z.string(),
  wpm: z.number(),
  acc: z.number(),
  timestamp: z.number(),
});
export type LocalLeaderboardEntry = z.infer<typeof LocalLeaderboardEntrySchema>;

export const GetLocalLeaderboardResponseSchema = responseWithData(
  z.array(LocalLeaderboardEntrySchema)
);

export const PostLocalLeaderboardBodySchema = LocalLeaderboardEntrySchema;

const c = initContract();

export const localLeaderboardsContract = c.router(
  {
    get: {
      method: "GET",
      path: "",
      responses: {
        200: GetLocalLeaderboardResponseSchema,
      },
      metadata: meta({
        authenticationOptions: { isPublic: true },
      }),
    },
    add: {
      method: "POST",
      path: "",
      body: PostLocalLeaderboardBodySchema,
      responses: {
        200: z.object({ message: z.string() }),
      },
      metadata: meta({
        authenticationOptions: { isPublic: true },
      }),
    },
  },
  {
    pathPrefix: "/local-leaderboards",
    strictStatusCodes: true,
    metadata: meta({
      openApiTags: "local-leaderboards",
    }),
    commonResponses: CommonResponses,
  }
);
