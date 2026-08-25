/** Named fare is what you and the runner agree. Runner always gets 80% of that.
 *  Askfare’s take is a separate fee: 20% standard, 5% with Plus.
 *  Plus members pay 85% of the named fare (80% + 5%) and keep the 15 points. */
export const TABLE_TAKE_RATE = 0.2;
export const TABLE_TAKE_PERCENT = 20;
export const PLUS_TAKE_RATE = 0.05;
export const PLUS_TAKE_PERCENT = 5;
export const RUNNER_RATE = 0.8;
export const RUNNER_PERCENT = 80;
export const PLUS_PRICE_CENTS = 999;
export const PLUS_DAYS = 30;
export const TABLE_TAKE_BASIS = "pre-tax";

export const TABLE_TAKE_NOTE =
  "The runner is always paid 80% of the named fare. Askfare’s take is extra on that same number: 20% standard, or 5% with Plus ($9.99/month). Plus saves the poster 15 percentage points. The runner’s pay does not change.";

export function takeRateForPlus(plus: boolean) {
  return plus ? PLUS_TAKE_RATE : TABLE_TAKE_RATE;
}

export function splitSale(priceCents: number, takeRate = TABLE_TAKE_RATE) {
  const rate = takeRate <= PLUS_TAKE_RATE + 0.001 ? PLUS_TAKE_RATE : TABLE_TAKE_RATE;
  const safe = Math.max(0, Math.round(priceCents));
  const cookCents = Math.round(safe * RUNNER_RATE);
  const takeCents = Math.round(safe * rate);
  const chargeCents = cookCents + takeCents;
  return { priceCents: safe, takeCents, cookCents, chargeCents, takeRate: rate };
}

export function formatCents(cents: number) {
  const value = cents / 100;
  return `$${value.toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
