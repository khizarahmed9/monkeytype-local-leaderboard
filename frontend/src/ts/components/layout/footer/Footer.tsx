import { JSXElement } from "solid-js";

import { getIsScreenshotting } from "../../../states/core";
import { isFocusMode } from "../../../states/test";
import { cn } from "../../../utils/cn";
import { Button } from "../../common/Button";
import { isLoadingShown } from "../../core/PageSwitcher";
import { Keytips } from "./Keytips";
import { ThemeIndicator } from "./ThemeIndicator";
import { VersionButton } from "./VersionButton";

export function Footer(): JSXElement {
  return (
    <footer
      class={cn("relative text-xs text-sub", {
        "opacity-0": getIsScreenshotting(),
      })}
      data-focused={isFocusMode() ? "" : undefined}
      inert={isLoadingShown()}
    >
      <Keytips />

      <div
        class={cn("-m-2 flex justify-between gap-8 transition-opacity", {
          "opacity-0": isFocusMode(),
        })}
      >
        <div class="grid grid-cols-1 justify-items-start xs:grid-cols-2 sm:grid-cols-4 lg:flex">
          <Button
            variant="text"
            text="github"
            fa={{ icon: "fa-code", fixedWidth: true }}
            href="https://github.com/khizarahmed9/monkeytype-local-leaderboard"
          />
          <Button
            variant="text"
            text="made by Khizar Ahmed"
            fa={{ icon: "fa-user", fixedWidth: true }}
            href="https://github.com/khizarahmed9"
          />
          <Button
            variant="text"
            text="portfolio"
            fa={{ icon: "fa-globe", fixedWidth: true }}
            href="https://khiz3r.me/"
          />
          <Button
            variant="text"
            text="based on monkeytype"
            fa={{ icon: "fa-keyboard", fixedWidth: true }}
            href="https://github.com/monkeytypegame/monkeytype"
          />
        </div>
        <div class="flex flex-col items-end text-right lg:flex-row">
          <ThemeIndicator />
          <VersionButton />
        </div>
      </div>
    </footer>
  );
}
