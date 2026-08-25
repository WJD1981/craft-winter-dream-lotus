/** Cargo Askfare will not move. Enforced at post, accept, and pickup. */

export const PROHIBITED_TITLE = "Not allowed on Askfare";

export const PROHIBITED_COPY =
  "Askfare does not move tobacco products, alcoholic beverages, or controlled substances — from a store, a shop, or a home. That includes cigarettes, cigars, vapes, nicotine pouches, beer, wine, liquor, cannabis, and scheduled drugs. Ordinary pharmacy bags that are not controlled substances are fine. If anyone hands you a banned item, cancel the run as prohibited — do not take it.";

const TERMS = [
  "tobacco",
  "cigarette",
  "cigar",
  "vape",
  "vaping",
  "nicotine",
  "chewing tobacco",
  "hookah",
  "alcohol",
  "alcoholic",
  "beer",
  "wine",
  "liquor",
  "spirits",
  "whiskey",
  "whisky",
  "vodka",
  "tequila",
  "bourbon",
  "champagne",
  "hard seltzer",
  "booze",
  "controlled substance",
  "narcotic",
  "opioid",
  "oxycodone",
  "percocet",
  "adderall",
  "xanax",
  "fentanyl",
  "cannabis",
  "marijuana",
  "thc",
] as const;

export function findProhibited(text: string): string | null {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9+]+/g, " ")} `;
  for (const term of TERMS) {
    if (hay.includes(` ${term} `)) return term;
  }
  return null;
}

export function assertAllowedCargo(...parts: string[]) {
  const hit = findProhibited(parts.filter(Boolean).join(" "));
  if (hit) {
    throw new Error(
      `Askfare does not move tobacco, alcohol, or controlled substances (matched “${hit}”). Cancel or post a different pickup.`,
    );
  }
}
