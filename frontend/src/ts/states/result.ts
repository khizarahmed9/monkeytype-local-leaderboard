import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { z } from "zod";

import type { Quote } from "../controllers/quotes-controller";
import { LocalStorageWithSchema } from "../utils/local-storage-with-schema";
import { showSuccessNotification } from "./notifications";

/**
 * State of the result screen that can't be derived from getLastResult() / getLastEventLog().
 * The test engine (test/test-logic) is still vanilla and writes here.
 */

export type CrownType =
  | "normal"
  | "ineligible"
  | "pending"
  | "error"
  | "warning";

// facts about the finished test that are not part of the result object
export type ResultDetails = {
  difficultyFailed: boolean;
  failReason: string;
  afkDetected: boolean;
  isRepeated: boolean;
  tooShort: boolean;
  invalid: boolean;
  stopOnError: string;
  deleteOnError: string;
  quote: Quote | null;
};

type ResultState = {
  details: ResultDetails | null;
  timeToday: string;
  crown: {
    visible: boolean;
    type: CrownType;
    text: string;
    wide: boolean;
  };
};

export const [resultState, setResultState] = createStore<ResultState>({
  details: null,
  timeToday: "",
  crown: {
    visible: false,
    type: "normal",
    text: "",
    wide: false,
  },
});

// visibility of the #result element, set once the result is built. Fade in/out
// is still animated imperatively. Whether the test has ended: isTestFinished()
export const [isResultShown, setResultShown] = createSignal(false);

export function showCrown(type: CrownType, text = "", wide = false): void {
  setResultState("crown", { visible: true, type, text, wide });
}

// keeps the current balloon text
export function setCrownType(type: CrownType): void {
  setResultState("crown", { visible: true, type });
}

export function hideCrown(): void {
  setResultState("crown", { visible: false, text: "", wide: false });
}

// smoothed burst (chart)

// not part of the config schema on purpose - this is a local only preference
const smoothedBurstLS = new LocalStorageWithSchema({
  key: "smoothedBurst",
  schema: z.boolean(),
  fallback: true,
});

const [smoothedBurst, setSignal] = createSignal(smoothedBurstLS.get());

export function getSmoothedBurst(): boolean {
  return smoothedBurst();
}

export function setSmoothedBurst(value: boolean): void {
  if (smoothedBurstLS.set(value)) {
    setSignal(value);
  }
}

export function resetSmoothedBurst(): void {
  smoothedBurstLS.remove();
  setSignal(smoothedBurstLS.get());
}

// dev helper, exposed on window
export function toggleSmoothedBurst(): void {
  setSmoothedBurst(!getSmoothedBurst());
  showSuccessNotification(getSmoothedBurst() ? "on" : "off");
}
