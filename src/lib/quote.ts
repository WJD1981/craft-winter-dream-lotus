import { splitSale } from "@/lib/fees";

export const SIZE_CLASSES = [
  { id: "compact", label: "Compact", hint: "Chair, microwave, TV under 50″", cents: 4900 },
  { id: "medium", label: "Medium", hint: "Washer, dresser, 55–65″ TV, grill", cents: 8900 },
  { id: "large", label: "Large", hint: "Sofa, fridge, treadmill, king mattress", cents: 14900 },
  { id: "extra", label: "Extra-large", hint: "Sectional, piano, stacked appliances", cents: 22900 },
] as const;

export const TRUCKS = [
  { id: "pickup", label: "Pickup", hint: "Open bed, most boxed furniture", extra: 0 },
  { id: "van", label: "Cargo van", hint: "Covered, mattresses and TVs", extra: 1800 },
  { id: "box", label: "Box truck", hint: "Sectionals, appliances stacked", extra: 4500 },
] as const;

export type SizeClass = (typeof SIZE_CLASSES)[number]["id"];
export type Truck = (typeof TRUCKS)[number]["id"];

export type QuoteInput = {
  sizeClass: SizeClass;
  stairs: number;
  miles: number;
  helpers: number;
  truck: Truck;
};

export function quoteHaul(input: QuoteInput) {
  const size = SIZE_CLASSES.find((s) => s.id === input.sizeClass) ?? SIZE_CLASSES[1];
  const truck = TRUCKS.find((t) => t.id === input.truck) ?? TRUCKS[0];
  const stairs = Math.max(0, Math.min(8, Math.round(input.stairs)));
  const miles = Math.max(1, Math.min(80, Math.round(input.miles)));
  const helpers = Math.max(1, Math.min(3, Math.round(input.helpers)));
  const stairCents = stairs * 2500;
  const mileCents = Math.max(0, miles - 8) * 300;
  const helperCents = helpers === 1 ? -1500 : helpers === 3 ? 4000 : 0;
  const priceCents = Math.max(3500, size.cents + stairCents + mileCents + helperCents + truck.extra);
  const split = splitSale(priceCents);
  return {
    priceCents: split.priceCents,
    takeCents: split.takeCents,
    crewCents: split.cookCents,
    stairCents,
    mileCents,
    helperCents,
    truckCents: truck.extra,
    sizeCents: size.cents,
  };
}
