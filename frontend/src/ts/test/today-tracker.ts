import * as DateTime from "../utils/date-and-time";

let seconds = 0;

export function addSeconds(s: number): void {
  seconds += s;
}

export function getString(): string {
  const secString = DateTime.secondsToString(Math.round(seconds), true, true);
  return `${secString} session`;
}
