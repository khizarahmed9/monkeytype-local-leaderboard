import { getFunbox } from "@monkeytype/funbox";
import { roundTo2 } from "@monkeytype/util/numbers";
import { createMemo, For, JSXElement, Show } from "solid-js";

import { getConfig } from "../../../../config/store";
import { Quote } from "../../../../controllers/quotes-controller";
import { getFormatting } from "../../../../states/core";
import { ResultDetails, resultState } from "../../../../states/result";
import { CompletedResult } from "../../../../states/test";
import { cn } from "../../../../utils/cn";
import { secondsToString } from "../../../../utils/date-and-time";
import { getLanguageDisplayString } from "../../../../utils/strings";
import { Balloon } from "../../../common/Balloon";
import { speedBalloon } from "./speed-balloon";

type Props = {
  result: CompletedResult;
};

export function ResultSecondaryStats(props: Props): JSXElement {
  const format = () => getFormatting();
  const decimals = () => getConfig.alwaysShowDecimalPlaces;

  const consistencyBalloon = (): string =>
    decimals()
      ? format().percentage(props.result.keyConsistency, {
          showDecimalPlaces: true,
          suffix: " key",
        })
      : `${props.result.consistency}% (${props.result.keyConsistency}% key)`;

  const afkPercent = (): number =>
    roundTo2((props.result.afkDuration / props.result.testDuration) * 100 || 0);

  const timeText = (): string => {
    const duration = props.result.testDuration;
    const rounded = decimals() ? roundTo2(duration) : Math.round(duration);
    if (duration > 61) return secondsToString(rounded);
    return decimals() ? `${rounded.toFixed(2)}s` : `${rounded}s`;
  };

  const timeBalloon = (): string => {
    const afk = `${props.result.afkDuration}s afk ${afkPercent()}%`;
    if (decimals()) return afk;
    return `${roundTo2(props.result.testDuration)}s (${afk})`;
  };

  const testType = createMemo(() =>
    getTestType(props.result, resultState.details),
  );
  const other = createMemo(() => getOther(props.result, resultState.details));

  return (
    <div
      class={cn(
        "mb-4 grid grid-flow-col items-start justify-between gap-2 gap-x-8 md:col-span-2",
        "max-lg:grid-cols-[repeat(3,max-content)] max-lg:grid-rows-[1fr_1fr]",
        "max-md:grid-cols-2 max-md:grid-rows-[1fr_1fr_1fr] max-md:justify-items-start max-md:gap-4",
        "max-xs:grid-flow-row max-xs:grid-cols-1 max-xs:grid-rows-none",
      )}
    >
      <div data-ui-element="resultStat">
        <div class="text-sub">test type</div>
        <div class="text-main" data-ui-element="resultStatValue">
          <Lines lines={testType()} />
        </div>
      </div>
      <Show when={other().length > 0}>
        <div data-ui-element="resultStat">
          <div class="text-sub">other</div>
          <div class="text-main" data-ui-element="resultStatValue">
            <Lines lines={other()} />
          </div>
        </div>
      </Show>

      <div data-ui-element="resultStat">
        <div class="text-sub">raw</div>
        <Balloon
          data-ui-element="resultStatValue"
          class={cn("text-[2em] leading-[1em] text-main", mobileBalloonClass)}
          text={speedBalloon(props.result.rawWpm)}
        >
          {format().typingSpeed(props.result.rawWpm)}
        </Balloon>
      </div>
      <div data-ui-element="resultStat">
        <div class="text-sub">characters</div>
        <Balloon
          data-ui-element="resultStatValue"
          class={cn("text-[2em] leading-[1em] text-main", mobileBalloonClass)}
          text={"correct\nincorrect\nextra\nmissed"}
          break
        >
          {props.result.charStats.join("/")}
        </Balloon>
      </div>

      <div data-ui-element="resultStat">
        <div class="text-sub">consistency</div>
        <Balloon
          data-ui-element="resultStatValue"
          class={cn("text-[2em] leading-[1em] text-main", mobileBalloonClass)}
          text={consistencyBalloon()}
        >
          {format().percentage(props.result.consistency)}
        </Balloon>
      </div>
      <div data-ui-element="resultStat">
        <div class="text-sub">time</div>
        <Balloon
          data-ui-element="resultStatValue"
          class={cn("text-[2em] leading-[1em] text-main", mobileBalloonClass)}
          text={timeBalloon()}
        >
          <div>{timeText()}</div>
          <div class={timeNoteClass} data-ui-element="resultStatSubValue">
            {afkPercent() > 0 ? `${afkPercent()}% afk` : ""}
          </div>
          <div class={timeNoteClass} data-ui-element="resultStatSubValue">
            {resultState.timeToday}
          </div>
        </Balloon>
      </div>

      <Show when={resultState.details?.quote}>
        {(quote) => <QuoteSource quote={quote()} />}
      </Show>
    </div>
  );
}

// on narrow screens the stats sit at the left edge, so left align their balloons
const mobileBalloonClass = "max-sm:after:left-0 max-sm:after:[transform:none]";
const timeNoteClass = "ml-[0.2rem] text-[0.75rem] leading-[0.75rem] text-sub";

function Lines(props: { lines: string[] }): JSXElement {
  return (
    <For each={props.lines}>
      {(line, i) => (
        <>
          <Show when={i() > 0}>
            <br />
          </Show>
          {line}
        </>
      )}
    </For>
  );
}

function QuoteSource(props: { quote: Quote }): JSXElement {
  return (
    <div class="max-w-120" data-ui-element="resultStat">
      <div class="text-sub">source</div>
      <div class="text-main" data-ui-element="resultStatValue">
        {props.quote.source}
      </div>
    </div>
  );
}

function getTestType(
  result: CompletedResult,
  details: ResultDetails | null,
): string[] {
  let first: string = result.mode;
  if (result.mode === "time" || result.mode === "words") {
    first += ` ${result.mode2}`;
  } else if (result.mode === "quote") {
    const group = details?.quote?.group;
    if (group !== undefined) {
      first += ` ${["short", "medium", "long", "thicc"][group]}`;
    }
  }
  const lines = [first];

  const ignoresLanguage = getFunbox(result.funbox).some((fb) =>
    fb.properties?.includes("ignoresLanguage"),
  );
  if (result.mode !== "custom" && !ignoresLanguage) {
    lines.push(getLanguageDisplayString(result.language));
  }
  if (result.punctuation) lines.push("punctuation");
  if (result.numbers) lines.push("numbers");
  if (result.blindMode) lines.push("blind");
  if (result.lazyMode) lines.push("lazy");
  if (result.funbox.length > 0) {
    lines.push(result.funbox.map((it) => it.replace(/_/g, " ")).join(", "));
  }
  if (result.difficulty === "expert" || result.difficulty === "master") {
    lines.push(result.difficulty);
  }
  if (details !== null && details.stopOnError !== "off") {
    lines.push(`stop on ${details.stopOnError}`);
  }
  if (details !== null && details.deleteOnError !== "off") {
    lines.push(`delete on ${details.deleteOnError.replace(/_/g, " ")}`);
  }
  return lines;
}

function getOther(
  result: CompletedResult,
  details: ResultDetails | null,
): string[] {
  if (details === null) return [];
  const lines: string[] = [];
  if (details.difficultyFailed) {
    lines.push(`failed (${details.failReason})`);
  }
  if (details.afkDetected) {
    lines.push("afk detected");
  }
  if (details.invalid) {
    const isWords10 = result.mode === "words" && result.mode2 === "10";
    const isOutOfRange = (wpm: number): boolean =>
      wpm < 0 ||
      (wpm > 350 && result.mode !== "words" && result.mode2 !== "10") ||
      (wpm > 420 && isWords10);
    const extra: string[] = [];
    if (isOutOfRange(result.wpm)) extra.push("wpm");
    if (isOutOfRange(result.rawWpm)) extra.push("raw");
    if (result.acc < 75 || result.acc > 100) extra.push("accuracy");
    lines.push(extra.length > 0 ? `invalid (${extra.join(",")})` : "invalid");
  }
  if (details.isRepeated) {
    lines.push("repeated");
  }
  if (result.bailedOut) {
    lines.push("bailed out");
  }
  if (details.tooShort) {
    lines.push("too short");
  }
  return lines;
}
