import { format } from "date-fns/format";
import { createMemo, JSXElement, onCleanup, onMount, Show } from "solid-js";

import { useRefWithUtils } from "../../../../hooks/useRefWithUtils";
import { getIsScreenshotting } from "../../../../states/core";
import { getGlarsesMode } from "../../../../states/glarses-mode";
import { getLastEventLog, getLastResult } from "../../../../states/test";
import { restartTest } from "../../../../test/test-logic";
import { setResultElement } from "../../../../test/test-ui";
import { cn } from "../../../../utils/cn";
import {
  applyReducedMotion,
  scrollToCenterOrTop,
} from "../../../../utils/misc";
import { Button } from "../../../common/Button";
import { Fa } from "../../../common/Fa";
import { ResultButtons } from "./ResultButtons";
import { ResultChart } from "./ResultChart";
import { ResultMainStats } from "./ResultMainStats";
import { ResultReplay } from "./ResultReplay";
import { ResultSecondaryStats } from "./ResultSecondaryStats";
import { ResultWordsHistory } from "./ResultWordsHistory";

export function TestResult(): JSXElement {
  const lastTest = createMemo(() => {
    const result = getLastResult();
    const eventLog = getLastEventLog();
    return result !== null && eventLog !== null ? { result, eventLog } : null;
  });

  const [resultRef, resultEl] = useRefWithUtils<HTMLDivElement>();
  onMount(() => {
    const el = resultEl();
    if (el === undefined) return;
    // test-ui fades it out on restartTest
    setResultElement(el);
    onCleanup(() => setResultElement(undefined));

    void el.promiseAnimate({
      opacity: [0, 1],
      duration: applyReducedMotion(125),
    });
    scrollToCenterOrTop(el.native);
  });

  return (
    <div id="result" ref={resultRef} class={cn("content-grid full-width")}>
      <Show when={getGlarsesMode()}>
        <div class="col-span-full pb-8 text-center text-[2rem]">
          <Fa icon="fa-check" />
        </div>
      </Show>
      <Show
        when={lastTest()}
        fallback={
          <>
            <div class="mx-auto">Missing last test result data.</div>
            <Button
              class="mx-auto mt-4 w-max px-4 py-2"
              text="Restart"
              fa={{ icon: "fa-chevron-right" }}
              onClick={() => void restartTest()}
            />
          </>
        }
      >
        {(test) => (
          <div id="resultScreenshotTarget">
            <Show when={!getGlarsesMode()}>
              <div class={cn("mb-4 grid gap-4 md:grid-cols-[auto_1fr]")}>
                <ResultMainStats
                  result={test().result}
                  eventLog={test().eventLog}
                />
                <ResultChart
                  result={test().result}
                  eventLog={test().eventLog}
                />
              </div>
              <ResultSecondaryStats result={test().result} />
              <ResultWordsHistory eventLog={test().eventLog} />
              <ResultReplay />
            </Show>
            <ResultButtons glarses={getGlarsesMode()} />

            <Watermark />
          </div>
        )}
      </Show>
    </div>
  );
}

function Watermark(): JSXElement {
  return (
    <Show when={getIsScreenshotting()}>
      {(_) => {
        // created per screenshot so the date is current
        const date = format(new Date(), "dd MMM yyyy HH:mm");
        return (
          <div class="col-span-full flex flex-wrap justify-end gap-x-[1em] text-[1.25rem] text-sub [&_.fas]:ml-[0.33em]">
            <span>{date}</span>
          </div>
        );
      }}
    </Show>
  );
}
