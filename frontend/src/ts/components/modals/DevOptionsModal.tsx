import { createSignal, For, JSXElement } from "solid-js";

import { toggleCaretDebug } from "../../elements/caret";
import { useBodyClasses } from "../../hooks/useBodyClasses";
import { hideModal, showModal } from "../../states/modals";
import {
  showErrorNotification,
  showNoticeNotification,
  showSuccessNotification,
} from "../../states/notifications";
import {
  isRealWordsInputShown,
  setRealWordsInputShown,
} from "../../states/test";
import { disableSlowTimerFail } from "../../test/test-timer";
import { FaSolidIcon } from "../../types/font-awesome";
import { isProfilerMode, setProfilerMode } from "../../utils/profiler-mode";
import { AnimatedModal } from "../common/AnimatedModal";
import { Button } from "../common/Button";
import { toggleFakeChartData } from "../pages/test/result/ResultChart";

const [mediaQueryDebugLevel, setMediaQueryDebugLevel] = createSignal(0);

type DevButton = {
  icon: FaSolidIcon;
  label: () => string;
  onClick: () => void;
};

export function DevOptionsModal(): JSXElement {
  useBodyClasses(() => ({
    mediaQueryDebugLevel1: mediaQueryDebugLevel() === 1,
    mediaQueryDebugLevel2: mediaQueryDebugLevel() === 2,
  }));

  const buttons: DevButton[] = [
    {
      icon: "fa-bell",
      label: () => "Test Notifications",
      onClick: () => {
        showSuccessNotification("This is a test", { durationMs: 0 });
        showNoticeNotification("This is a test", { durationMs: 0 });
        showErrorNotification("This is a test", {
          durationMs: 0,
          details: { test: true, error: "Example error message" },
        });
        showNoticeNotification("useInnerHtml<br>test", {
          durationMs: 0,
          useInnerHtml: true,
        });
        hideModal("DevOptions");
      },
    },
    {
      icon: "fa-ruler",
      label: () => `Media Query Debug (${mediaQueryDebugLevel()})`,
      onClick: () => {
        const next =
          mediaQueryDebugLevel() >= 2 ? 0 : mediaQueryDebugLevel() + 1;
        setMediaQueryDebugLevel(next);
        showNoticeNotification(`Setting media query debug level to ${next}`);
      },
    },
    {
      icon: "fa-eye",
      label: () =>
        `${isRealWordsInputShown() ? "Hide" : "Show"} Real Words Input`,
      onClick: () => {
        setRealWordsInputShown((shown) => !shown);
        hideModal("DevOptions");
      },
    },
    {
      icon: "fa-chart-bar",
      label: () => "Toggle Fake Chart Data",
      onClick: toggleFakeChartData,
    },
    {
      icon: "fa-i-cursor",
      label: () => "Toggle Caret Debug",
      onClick: toggleCaretDebug,
    },
    {
      icon: "fa-clock",
      label: () => "Disable Slow Timer Fail",
      onClick: disableSlowTimerFail,
    },
    {
      icon: "fa-vials",
      label: () => "Event Log Viewer",
      onClick: () => showModal("EventLogViewer"),
    },
    {
      icon: "fa-stopwatch",
      label: () => `Profiler Mode (${isProfilerMode() ? "ON" : "OFF"})`,
      onClick: () => {
        setProfilerMode(!isProfilerMode());
        showNoticeNotification("Profiler mode toggled, reloading...");
        setTimeout(() => location.reload(), 500);
      },
    },
  ];

  return (
    <AnimatedModal id="DevOptions" title="Dev Options">
      <div class="flex flex-col gap-4">
        <For each={buttons}>
          {(btn) => (
            <Button
              variant="button"
              onClick={btn.onClick}
              fa={{ icon: btn.icon, fixedWidth: true }}
              text={btn.label()}
            />
          )}
        </For>
      </div>
    </AnimatedModal>
  );
}
