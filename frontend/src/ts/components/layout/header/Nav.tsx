import { JSXElement } from "solid-js";

import { showModal } from "../../../states/modals";
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
