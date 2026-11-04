import { JSXElement, Show } from "solid-js";

import { getConfig } from "../../../config/store";
import { isResultShown } from "../../../states/result";
import { getRoutePage } from "../../../states/router";
import { isFocusMode } from "../../../states/test";
import { cn } from "../../../utils/cn";
import { Kbd } from "../../common/Kbd";
import { CommandlineHotkey } from "../../hotkeys/CommandlineHotkey";
import { QuickRestartHotkey } from "../../hotkeys/QuickRestartHotkey";

export function Keytips(): JSXElement {
  return (
    <Show when={getConfig.showKeyTips}>
      <div
        class={cn("mb-8 flex flex-col items-center gap-2 transition-opacity", {
          "opacity-0": isFocusMode(),
        })}
      >
        <Show
          when={getRoutePage() !== "play" && getRoutePage() !== "leaderboards"}
        >
          <div class="flex items-center gap-2">
            <QuickRestartHotkey />
            <span>- restart test</span>
          </div>
        </Show>

        <Show when={isResultShown()}>
          <div class="flex items-center gap-2">
            <Kbd text="ctrl + enter" />
            <span>- same player again</span>
          </div>
        </Show>

        <div class="flex items-center gap-2">
          <CommandlineHotkey />
          <span>- command line</span>
        </div>
      </div>
    </Show>
  );
}
