export const PICKUP_POLICY_TITLE = "No returns after pickup";

export const PICKUP_POLICY = [
  "Inspect the food at the door before you take it. Look at it, smell it, and read the ingredient list again.",
  "Once you leave with the food, there are no returns, no refunds, and no replacements — for taste, portion, packaging, or a change of mind.",
  "You may cancel at pickup, before you take the food, only if it does not look safe to eat, or if you find an allergen that was not listed on the listing.",
  "A cancel at the door refunds a paid sale. After you confirm pickup, the charge stays.",
] as const;

export const HOME_COOK_RULE =
  "Second Table is only for home cooks in a private kitchen. Restaurants, cafés, caterers, food trucks, ghost kitchens, grocery counters, and any licensed commercial food business may not sell, trade, or donate here.";

export const INGREDIENT_RULE =
  "List every ingredient you put in the dish, including oils, spices, garnishes, and what was already in a leftover base. Do not write “spices” if you can name them.";

export function ingredientsAreComplete(text: string) {
  const parts = text
    .split(/,|;|\n/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return parts.length >= 3;
}

export const FEEDBACK_AXES = [
  { id: "quality", label: "Meal quality" },
  { id: "taste", label: "Taste" },
  { id: "freshness", label: "Freshness" },
  { id: "price", label: "Price / value" },
  { id: "packaging", label: "Packaging" },
] as const;

export type FeedbackAxis = (typeof FEEDBACK_AXES)[number]["id"];
