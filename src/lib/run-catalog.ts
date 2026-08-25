export const JOB_TYPES = [
  {
    id: "fetch",
    label: "Pick up an order",
    body: "Retail, restaurant, pharmacy, will-call — you already paid the store.",
  },
  {
    id: "shop",
    label: "Business sending an item",
    body: "Your shop, kitchen, florist, or workshop to a customer’s door.",
  },
  {
    id: "home",
    label: "Home to home",
    body: "Private residence to private residence. Keys, parcels, leftover furniture, a bag of clothes.",
  },
] as const;

export type JobType = (typeof JOB_TYPES)[number]["id"];

export const KINDS = [
  { id: "retail", label: "Retail order", job: "fetch" },
  { id: "restaurant", label: "Restaurant / takeout", job: "fetch" },
  { id: "grocery", label: "Grocery hold", job: "fetch" },
  { id: "pharmacy", label: "Pharmacy", job: "fetch" },
  { id: "hardware", label: "Hardware / will-call", job: "fetch" },
  { id: "shop", label: "Local business item", job: "shop" },
  { id: "home", label: "Home to home", job: "home" },
  { id: "other", label: "Other pickup", job: "fetch" },
] as const;

export type Kind = (typeof KINDS)[number]["id"];

export const ITEM_KEYS = ["boxes", "takeout", "pharmacy", "electronics", "hardware", "shop", "parcel"] as const;
export type ItemKey = (typeof ITEM_KEYS)[number];

export const ITEMS: { key: ItemKey; title: string; kind: Kind; src: string; job: JobType }[] = [
  { key: "boxes", title: "Store pickup / boxes", kind: "retail", src: "/runs/boxes.jpg", job: "fetch" },
  { key: "takeout", title: "Restaurant takeout", kind: "restaurant", src: "/runs/takeout.jpg", job: "fetch" },
  { key: "pharmacy", title: "Pharmacy (no controlled substances)", kind: "pharmacy", src: "/runs/pharmacy.jpg", job: "fetch" },
  { key: "electronics", title: "Electronics will-call", kind: "retail", src: "/runs/electronics.jpg", job: "fetch" },
  { key: "hardware", title: "Hardware will-call", kind: "hardware", src: "/runs/hardware.jpg", job: "fetch" },
  { key: "shop", title: "Shop, bakery, florist, workshop", kind: "shop", src: "/runs/shop.jpg", job: "shop" },
  { key: "parcel", title: "Home to home parcel", kind: "home", src: "/runs/parcel.jpg", job: "home" },
];

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

export const VEHICLES = [
  { id: "car", label: "Car" },
  { id: "suv", label: "SUV / hatch" },
  { id: "pickup", label: "Pickup" },
  { id: "van", label: "Van" },
  { id: "bike", label: "Bike" },
] as const;

export function itemImage(key: string, photoUrl?: string) {
  if (photoUrl) return photoUrl;
  return ITEMS.find((item) => item.key === key)?.src ?? "/runs/hero.jpg";
}

export function kindLabel(id: string) {
  return KINDS.find((k) => k.id === id)?.label ?? id;
}

export function jobTypeForKind(kind: string): JobType {
  return KINDS.find((k) => k.id === kind)?.job ?? "fetch";
}
