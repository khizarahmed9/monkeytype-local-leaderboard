import { JSXElement, Show } from "solid-js";

import { leaveGame } from "../../../controllers/game-controller";
import { getGame } from "../../../states/game";
import { showModal } from "../../../states/modals";
import { showNoticeNotification } from "../../../states/notifications";
import { getRoutePage } from "../../../states/router";
import { isFocusMode } from "../../../states/test";
import { restartTest } from "../../../test/test-logic";
import { cn } from "../../../utils/cn";
import { Button } from "../../common/Button";

export function Nav(): JSXElement {
  const buttonClass = () =>
    cn("aspect-square", {
      "opacity-(--nav-focus-opacity)": isFocusMode(),
    });

  return (
    <nav class={cn("z-5 flex w-full items-center gap-1 md:gap-2")}>
      <Button
        variant="text"
        fa={{
          icon: "fa-keyboard",
          fixedWidth: true,
        }}
        to="/"
        class={buttonClass()}
        dataset={{
          "data-nav-item": "test",
        }}
        onClick={() => {
          if (getRoutePage() === "test") void restartTest();
        }}
      />
      <Button
        variant="text"
        fa={{
          icon: "fa-crown",
          fixedWidth: true,
        }}
        dataset={{
          "data-nav-item": "leaderboards",
        }}
        class={buttonClass()}
        to="/leaderboard"
      />
      <Button
        variant="text"
        fa={{
          icon: "fa-info",
          fixedWidth: true,
        }}
        class={buttonClass()}
        dataset={{
          "data-nav-item": "about",
        }}
        to="/about"
      />
      <Button
        variant="text"
        fa={{
          icon: "fa-cog",
          fixedWidth: true,
        }}
        class={buttonClass()}
        to="/settings"
        dataset={{
          "data-nav-item": "settings",
        }}
      />
      <div class="grow"></div>
      <Show when={getGame()}>
        {(game) => (
          <>
            <Button
              variant="text"
              text={game().code}
              fa={{ icon: "fa-copy", fixedWidth: true }}
              balloon={{ text: "copy game code", position: "down" }}
              class={cn({ "opacity-(--nav-focus-opacity)": isFocusMode() })}
              onClick={() => {
                void navigator.clipboard
                  .writeText(game().code)
                  .then(() => showNoticeNotification("Game code copied"));
              }}
            />
            <Button
              variant="text"
              fa={{ icon: "fa-sign-out-alt", fixedWidth: true }}
              balloon={{ text: "leave game", position: "down" }}
              class={buttonClass()}
              onClick={leaveGame}
            />
          </>
        )}
      </Show>
      <Button
        variant="text"
        fa={{
          icon: "fa-bell",
          fixedWidth: true,
        }}
        dataset={{
          "data-nav-item": "alerts",
        }}
        onClick={() => {
          showModal("Alerts");
        }}
        class={cn(buttonClass(), "relative")}
      />
    </nav>
  );
}
