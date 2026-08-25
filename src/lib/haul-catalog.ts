export const RETAILERS = [
  "Home Depot",
  "Lowe’s",
  "IKEA",
  "Best Buy",
  "Costco",
  "Target",
  "Ashley",
  "Mattress Firm",
  "Wayfair warehouse",
  "Harbor Freight",
] as const;

export const NEIGHBORHOODS = [
  "Eastside",
  "Riverside",
  "Midtown",
  "West End",
  "Hills",
  "Old Town",
  "Lakeside",
  "Harbor",
] as const;

export const ITEM_KEYS = ["sofa", "washer", "tv", "treadmill", "grill", "dresser", "mattress"] as const;
export type ItemKey = (typeof ITEM_KEYS)[number];

export const ITEMS: {
  key: ItemKey;
  title: string;
  sizeClass: "compact" | "medium" | "large" | "extra";
  src: string;
}[] = [
  { key: "sofa", title: "Sofa", sizeClass: "large", src: "/hauls/sofa.jpg" },
  { key: "washer", title: "Washer or dryer", sizeClass: "medium", src: "/hauls/washer.jpg" },
  { key: "tv", title: "Large TV", sizeClass: "medium", src: "/hauls/tv.jpg" },
  { key: "treadmill", title: "Treadmill", sizeClass: "large", src: "/hauls/treadmill.jpg" },
  { key: "grill", title: "Grill", sizeClass: "medium", src: "/hauls/grill.jpg" },
  { key: "dresser", title: "Dresser", sizeClass: "medium", src: "/hauls/dresser.jpg" },
  { key: "mattress", title: "Mattress", sizeClass: "large", src: "/hauls/mattress.jpg" },
];

export function itemImage(key: string, photoUrl?: string) {
  if (photoUrl) return photoUrl;
  return ITEMS.find((item) => item.key === key)?.src ?? "/hauls/hero.jpg";
}
