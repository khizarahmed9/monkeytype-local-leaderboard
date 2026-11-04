// Search params: the url format (plain strings, "t"/"f" booleans)

import { z } from "zod";

// search params are plain strings (the default JSON parser would turn
// ?mode2=15 into a number) - route validateSearch schemas take strings in

/** The router's search parser: every param as a string. */
export function parseSearch(searchStr: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(searchStr));
}

/** The router's search serializer, see searchValueToString. */
export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const str = searchValueToString(value);
    if (str !== undefined) params.set(key, str);
  }
  const str = params.toString();
  return str === "" ? "" : `?${str}`;
}

// booleans keep the "t"/"f" format of existing links, undefined is left out
function searchValueToString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value ? "t" : "f";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return JSON.stringify(value);
}

/** A boolean search param: written as "t", read as "t" or "true". */
export const SearchFlagSchema = z
  .union([z.boolean(), z.enum(["t", "true", "f", "false"])])
  .transform((value) => value === true || value === "t" || value === "true")
  .optional()
  .catch(undefined);
