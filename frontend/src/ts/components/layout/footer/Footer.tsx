import { JSXElement } from "solid-js";

import { getFocus } from "../../../signals/core";

import { Keytips } from "./Keytips";
import { ThemeIndicator } from "./ThemeIndicator";

export function Footer(): JSXElement {
  return (
    <footer class="text-sub relative text-xs">
      <Keytips />

      <div
        class="-m-2 flex justify-between gap-8 transition-opacity"
        classList={{
          "opacity-0": getFocus(),
        }}
      >
        <div class="xs:grid-cols-2 grid grid-cols-1 justify-items-start sm:grid-cols-4 lg:flex">
          <span class="p-2 opacity-60">
            Based on{" "}
            <a
              href="https://github.com/monkeytypegame/monkeytype"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              MonkeyType
            </a>{" "}
            &copy; Miodec &amp; contributors &mdash; licensed under{" "}
            <a
              href="https://www.gnu.org/licenses/gpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              GPL-3.0
            </a>
            . Modified for HackHCC by{" "}
            <a
              href="https://www.linkedin.com/in/khizar-ahmed9/"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              Khizar Ahmed
            </a>{" "}
            &mdash;{" "}
            <a
              href="https://github.com/khizarahmed9/monkeytype-local-leaderboard"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              source
            </a>
            .
          </span>
        </div>
        <div class="flex flex-col items-end text-right lg:flex-row">
          <ThemeIndicator />
        </div>
      </div>
    </footer>
  );
}
