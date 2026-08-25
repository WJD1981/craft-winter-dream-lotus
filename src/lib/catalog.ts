export const CATEGORIES = [
  { id: "meal", label: "Meals", hint: "Dinner leftovers, soups, mains" },
  { id: "snack", label: "Snacks", hint: "Homemade bites" },
  { id: "dessert", label: "Desserts", hint: "Sweets from a home oven" },
  { id: "drink", label: "Drinks", hint: "Non-alcoholic only" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export const DISHES = [
  { key: "roast-chicken", label: "Roast plate", src: "/dishes/roast-chicken.jpg", category: "meal" },
  { key: "lasagna", label: "Casserole", src: "/dishes/lasagna.jpg", category: "meal" },
  { key: "coconut-curry", label: "Curry bowl", src: "/dishes/coconut-curry.jpg", category: "meal" },
  { key: "minestrone", label: "Soup pot", src: "/dishes/minestrone.jpg", category: "meal" },
  { key: "fried-rice", label: "Rice bowl", src: "/dishes/fried-rice.jpg", category: "meal" },
  { key: "grain-salad", label: "Salad bowl", src: "/dishes/grain-salad.jpg", category: "meal" },
  { key: "pretzels", label: "Pretzels", src: "/dishes/pretzels.jpg", category: "snack" },
  { key: "granola", label: "Granola", src: "/dishes/granola.jpg", category: "snack" },
  { key: "banana-bread", label: "Baked loaf", src: "/dishes/banana-bread.jpg", category: "dessert" },
  { key: "baklava", label: "Pastry", src: "/dishes/baklava.jpg", category: "dessert" },
  { key: "cookies", label: "Cookies", src: "/dishes/cookies.jpg", category: "dessert" },
  { key: "crumble", label: "Crumble", src: "/dishes/crumble.jpg", category: "dessert" },
  { key: "lemonade", label: "Lemonade", src: "/dishes/lemonade.jpg", category: "drink" },
  { key: "iced-tea", label: "Iced tea", src: "/dishes/iced-tea.jpg", category: "drink" },
] as const;

export type DishKey = (typeof DISHES)[number]["key"];

export const DISH_KEYS = DISHES.map((d) => d.key) as [DishKey, ...DishKey[]];

export function dishByKey(key: string) {
  return DISHES.find((d) => d.key === key) ?? DISHES[0];
}

export function dishesForCategory(category: Category) {
  return DISHES.filter((d) => d.category === category);
}

export function listingImage(listing: { photoUrl?: string | null; dishKey: string }) {
  if (listing.photoUrl) return listing.photoUrl;
  return dishByKey(listing.dishKey).src;
}

export const ALLERGENS = [
  { id: "milk", label: "Milk" },
  { id: "eggs", label: "Eggs" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "tree-nuts", label: "Tree nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "wheat", label: "Wheat" },
  { id: "soy", label: "Soy" },
  { id: "sesame", label: "Sesame" },
  { id: "gluten", label: "Gluten" },
  { id: "mustard", label: "Mustard" },
  { id: "sulfites", label: "Sulfites" },
  { id: "alcohol", label: "Alcohol (not allowed in drinks here)" },
  { id: "shared-kitchen", label: "Shared kitchen (cross-contact likely)" },
] as const;

export const NEIGHBORHOODS = [
  "Downtown",
  "Eastside",
  "West End",
  "Riverside",
  "Midtown",
  "North Hill",
  "The Flats",
] as const;

export type Neighborhood = (typeof NEIGHBORHOODS)[number];

export const OFFER_TYPES = [
  { id: "sale", label: "Sale", hint: "20% pre-tax" },
  { id: "trade", label: "Trade", hint: "Always free" },
  { id: "donate", label: "Donate", hint: "Feed someone" },
] as const;

export type OfferType = (typeof OFFER_TYPES)[number]["id"];
