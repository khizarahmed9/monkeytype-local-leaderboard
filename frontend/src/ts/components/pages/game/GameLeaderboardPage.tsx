import { useQuery } from "@tanstack/solid-query";
import { For, JSXElement, Show } from "solid-js";

import { getLeaderboardQueryOptions } from "../../../controllers/game-controller";
import {
  getGame,
  getGameLabel,
  getModeLabel,
  getPlayer,
} from "../../../states/game";
import { cn } from "../../../utils/cn";
import { H2 } from "../../common/Headers";
import { LoadingCircle } from "../../common/LoadingCircle";

const headerClass = "p-2 text-left font-normal text-sub";
const cellClass = "p-2";

export function GameLeaderboardPage(): JSXElement {
  const leaderboard = useQuery(() =>
    getLeaderboardQueryOptions(getGame()?.code ?? ""),
  );

  return (
    <div class="content-grid grid content-start gap-4 py-8">
      <div>
        <H2 text={`leaderboard ${getGame()?.code ?? ""}`} fa={{ icon: "fa-crown" }} />
        <Show when={getGame()}>
          {(game) => (
            <div class="text-sub">{getGameLabel(game().settings)}</div>
          )}
        </Show>
      </div>

      <Show
        when={leaderboard.data}
        fallback={
          <Show
            when={leaderboard.isError}
            fallback={<LoadingCircle class="mx-auto" />}
          >
            <div class="text-error">Could not load the leaderboard</div>
          </Show>
        }
      >
        {(entries) => (
          <div class="overflow-x-auto">
            <table class="w-full border-collapse whitespace-nowrap">
              <thead>
                <tr>
                  <th class={headerClass}>#</th>
                  <th class={headerClass}>name</th>
                  <th class={headerClass}>wpm</th>
                  <th class={headerClass}>accuracy</th>
                  <th class={headerClass}>raw</th>
                  <th class={headerClass}>consistency</th>
                  <th class={headerClass}>test</th>
                  <th class={headerClass}>attempts</th>
                </tr>
              </thead>
              <tbody>
                <For each={entries()}>
                  {(entry, index) => (
                    <tr
                      class={cn("odd:bg-sub-alt", {
                        "text-main": entry.id === getPlayer()?.playerId,
                      })}
                    >
                      <td class={cellClass}>
                        {entry.best !== null ? index() + 1 : "-"}
                      </td>
                      <td class={cellClass}>{entry.name}</td>
                      <Show
                        when={entry.best}
                        fallback={
                          <td class={cn(cellClass, "text-sub")} colSpan={6}>
                            still playing
                          </td>
                        }
                      >
                        {(best) => (
                          <>
                            <td class={cellClass}>{best().wpm.toFixed(2)}</td>
                            <td class={cellClass}>{best().acc.toFixed(2)}%</td>
                            <td class={cellClass}>{best().raw.toFixed(2)}</td>
                            <td class={cellClass}>
                              {best().consistency.toFixed(2)}%
                            </td>
                            <td class={cellClass}>
                              {getModeLabel(best().mode, best().mode2)}
                            </td>
                            <td class={cellClass}>{entry.attempts}</td>
                          </>
                        )}
                      </Show>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        )}
      </Show>
    </div>
  );
}
