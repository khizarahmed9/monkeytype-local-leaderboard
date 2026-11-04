import { checkCompatibility, getFunbox } from "@monkeytype/funbox";
import type { GameSettings } from "@monkeytype/schemas/games";
import { getCustomTextWords } from "@monkeytype/schemas/games";
import type { CompletedEvent } from "@monkeytype/schemas/results";
import objectHash from "object-hash";

export type Rejection = { status: number; message: string };

// same codes as upstream, the client stops offering a retry on these
const TEST_TOO_SHORT = 460;
const RESULT_HASH_INVALID = 461;
const RESULT_SPACING_INVALID = 462;
const RESULT_DATA_INVALID = 463;
const MISSING_KEY_DATA = 464;
const BOT_DETECTED = 465;

const MAX_WPM = 350;
const MAX_WPM_WORDS_10 = 420;
const MIN_ACCURACY = 75;
// the client drops key data from anything longer than this
const MAX_KEY_DATA_SECONDS = 122;
// below this many keys the timing stats are noise
const MIN_KEYS_FOR_TIMING = 20;
// spacing sd / mean. people land around 0.3 and above, even at 200 wpm+
const MIN_SPACING_VARIATION = 0.08;

type Context = {
  settings: GameSettings;
  /** The player's previous result, or when they joined if there is none. */
  lastActivityAt: number;
  hasPreviousResult: boolean;
  now: number;
};

function reject(status: number, message: string): Rejection {
  return { status, message };
}

function isTestTooShort(result: CompletedEvent): boolean {
  const { mode, mode2, customText, testDuration, bailedOut } = result;
  const bailedOutTooShort = bailedOut && testDuration < 15;

  if (mode === "time") {
    const seconds = parseInt(mode2);
    return (
      (seconds > 0 && seconds < 15) ||
      (seconds === 0 && testDuration < 15) ||
      bailedOutTooShort
    );
  }
  if (mode === "words") {
    const words = parseInt(mode2);
    return (
      (words > 0 && words < 10) ||
      (words === 0 && testDuration < 15) ||
      bailedOutTooShort
    );
  }
  if (mode === "custom") {
    if (!customText) return true;
    const { limit } = customText;
    return (
      ((limit.mode === "word" || limit.mode === "section") &&
        limit.value < 10) ||
      (limit.mode === "time" && limit.value < 15) ||
      bailedOutTooShort
    );
  }
  if (mode === "zen") return testDuration < 15;
  return false;
}

function matchesLockedSettings(
  result: CompletedEvent,
  settings: GameSettings,
): boolean {
  if (
    result.mode !== settings.mode ||
    result.punctuation !== settings.punctuation ||
    result.numbers !== settings.numbers ||
    result.language !== settings.language ||
    result.lazyMode ||
    result.funbox.length > 0
  ) {
    return false;
  }

  if (settings.mode === "time") return result.mode2 === String(settings.time);
  if (settings.mode === "words") return result.mode2 === String(settings.words);
  if (settings.mode === "quote") {
    return (
      result.quoteLength !== undefined &&
      settings.quoteLength.includes(result.quoteLength)
    );
  }
  if (settings.mode === "custom") {
    return (
      result.customText?.limit.mode === "word" &&
      result.customText.limit.value ===
        getCustomTextWords(settings.customText).length
    );
  }
  return true;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

/**
 * Do the numbers agree with each other? Upstream's real validateResult is a
 * closed module, so this is an open replacement. It only rejects what a
 * genuine test cannot produce.
 */
function hasConsistentNumbers(result: CompletedEvent): boolean {
  const { wpm, rawWpm, acc, testDuration, mode, mode2, charStats } = result;

  const limit = mode === "words" && mode2 === "10" ? MAX_WPM_WORDS_10 : MAX_WPM;
  if (wpm > limit || rawWpm > limit || wpm > rawWpm + 1 || acc > 100) {
    return false;
  }

  if (mode === "time" && !result.bailedOut) {
    if (Math.abs(testDuration - parseInt(mode2)) > 1.5) return false;
  }

  // correct word chars exclude spaces, typed chars include them, and wpm sits
  // between the two
  const wpmPerChar = 12 / testDuration;
  const fastestPossible = result.charTotal * wpmPerChar;
  const slowestPossible = charStats[0] * wpmPerChar;
  return wpm <= fastestPossible * 1.05 + 1 && wpm >= slowestPossible * 0.95 - 1;
}

function checkKeyData(result: CompletedEvent): Rejection | undefined {
  const { keySpacing, keyDuration, testDuration, rawWpm } = result;

  if (testDuration > MAX_KEY_DATA_SECONDS) return undefined;

  if (
    keySpacing === "toolong" ||
    keyDuration === "toolong" ||
    keySpacing.length === 0 ||
    keyDuration.length === 0
  ) {
    return reject(MISSING_KEY_DATA, "Missing key data");
  }

  // the claimed speed has to be backed by key presses
  const keysPerSecond = (keySpacing.length + 1) / testDuration;
  if (rawWpm > keysPerSecond * 12 * 1.25 + 5) {
    return reject(RESULT_DATA_INVALID, "Key data doesn't match the result");
  }

  if (keySpacing.length < MIN_KEYS_FOR_TIMING) return undefined;

  const typingMs = keySpacing.reduce((sum, value) => sum + value, 0);
  if (typingMs > (testDuration + 2) * 1000) {
    return reject(RESULT_DATA_INVALID, "Key data doesn't match the result");
  }

  const spacingMean = mean(keySpacing);
  const isRobotic =
    spacingMean === 0 ||
    standardDeviation(keySpacing) / spacingMean < MIN_SPACING_VARIATION ||
    standardDeviation(keyDuration) === 0;
  if (isRobotic) return reject(BOT_DETECTED, "Possible bot detected");

  return undefined;
}

/** Returns why a result can't go on the leaderboard, if it can't. */
export function checkResult(
  result: CompletedEvent,
  { settings, lastActivityAt, hasPreviousResult, now }: Context,
): Rejection | undefined {
  if (isTestTooShort(result)) return reject(TEST_TOO_SHORT, "Test too short");

  if (result.acc < MIN_ACCURACY) return reject(400, "Accuracy too low");

  const { hash, ...hashed } = result;
  if (objectHash(hashed) !== hash) {
    return reject(RESULT_HASH_INVALID, "Incorrect result hash");
  }

  if (result.funbox.length !== new Set(result.funbox).size) {
    return reject(400, "Duplicate funboxes");
  }
  if (!checkCompatibility(result.funbox)) {
    return reject(400, "Impossible funbox combination");
  }
  if (!getFunbox(result.funbox).every((funbox) => funbox.canGetPb)) {
    return reject(400, "This funbox doesn't count");
  }

  if (result.bailedOut) return reject(400, "Abandoned tests don't count");
  if (result.stopOnLetter && result.acc < 100) {
    return reject(400, "Stop on letter tests need 100% accuracy");
  }

  if (settings.locked && !matchesLockedSettings(result, settings)) {
    return reject(RESULT_DATA_INVALID, "Result doesn't match the game settings");
  }

  if (!hasConsistentNumbers(result)) {
    return reject(RESULT_DATA_INVALID, "Result data doesn't make sense");
  }

  const keyDataRejection = checkKeyData(result);
  if (keyDataRejection) return keyDataRejection;

  // abandoned test time is client supplied, it only has something to be
  // bounded against once a previous result exists
  const incompleteSeconds = hasPreviousResult
    ? result.incompleteTestSeconds
    : 0;
  const earliestPossible =
    lastActivityAt + (result.testDuration + incompleteSeconds) * 1000;
  if (now < earliestPossible - 1000) {
    return reject(RESULT_SPACING_INVALID, "Result spacing invalid");
  }

  return undefined;
}
