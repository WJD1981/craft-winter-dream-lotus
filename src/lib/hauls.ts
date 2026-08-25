import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { ITEM_KEYS } from "@/lib/haul-catalog";
import { HAUL_WAIVER_VERSION } from "@/lib/haul-waiver";
import { quoteHaul, type SizeClass, type Truck } from "@/lib/quote";
import { splitSale } from "@/lib/fees";
import {
  capturePayPalOrder,
  createPayPalOrder,
  loadPayPalCredentials,
  payoutToEmail,
  refundPayPalCapture,
  savePayPalCredentials,
  type PayPalMode,
} from "@/lib/paypal";

export type HaulStatus = "open" | "claimed" | "picked_up" | "delivered" | "cancelled";

export type Haul = {
  id: number;
  customerId: string;
  customerName: string;
  retailer: string;
  storeAddress: string;
  dropoffAddress: string;
  neighborhood: string;
  itemTitle: string;
  itemNotes: string;
  itemKey: string;
  sizeClass: SizeClass;
  stairs: number;
  miles: number;
  helpers: number;
  truck: Truck;
  pickupWindow: string;
  photoUrl: string;
  priceCents: number;
  takeCents: number;
  crewCents: number;
  status: HaulStatus;
  funded: boolean;
  crewId: string | null;
  crewName: string | null;
  createdAt: string;
  isCustomer: boolean;
  isCrew: boolean;
};

export type CrewProfile = {
  displayName: string;
  paypalEmail: string;
  vehicle: Truck;
  crewSize: number;
};

export type PayPalPublicConfig = {
  configured: boolean;
  clientId: string;
  mode: PayPalMode;
};

export type TableLedger = {
  saleCount: number;
  grossCents: number;
  takeCents: number;
  crewCents: number;
  rows: {
    id: number;
    haulId: number;
    title: string;
    customerName: string;
    crewName: string;
    priceCents: number;
    takeCents: number;
    crewCents: number;
    createdAt: string;
  }[];
};

export type DuePayout = {
  haulId: number;
  title: string;
  crewEmail: string;
  crewCents: number;
  takeCents: number;
  payoutStatus: string;
};

type HaulRow = {
  id: number;
  customer_id: string;
  customer_name: string;
  retailer: string;
  store_address: string;
  dropoff_address: string;
  neighborhood: string;
  item_title: string;
  item_notes: string;
  item_key: string;
  size_class: SizeClass;
  stairs: number;
  miles: number;
  helpers: number;
  truck: Truck;
  pickup_window: string;
  photo_url: string;
  price_cents: number;
  take_cents: number;
  crew_cents: number;
  status: HaulStatus;
  funded: boolean;
  crew_id: string | null;
  crew_name: string | null;
  crew_paypal_email: string;
  created_at: string | Date;
};

function asIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapHaul(row: HaulRow, userId: string): Haul {
  return {
    id: Number(row.id),
    customerId: row.customer_id,
    customerName: row.customer_name,
    retailer: row.retailer,
    storeAddress: row.store_address,
    dropoffAddress: row.dropoff_address,
    neighborhood: row.neighborhood,
    itemTitle: row.item_title,
    itemNotes: row.item_notes,
    itemKey: row.item_key,
    sizeClass: row.size_class,
    stairs: Number(row.stairs),
    miles: Number(row.miles),
    helpers: Number(row.helpers),
    truck: row.truck,
    pickupWindow: row.pickup_window,
    photoUrl: row.photo_url || "",
    priceCents: Number(row.price_cents),
    takeCents: Number(row.take_cents),
    crewCents: Number(row.crew_cents),
    status: row.status,
    funded: Boolean(row.funded),
    crewId: row.crew_id,
    crewName: row.crew_name,
    createdAt: asIso(row.created_at),
    isCustomer: row.customer_id === userId,
    isCrew: row.crew_id === userId,
  };
}

class WaiverRequiredError extends Error {
  constructor() {
    super("WAIVER_REQUIRED");
    this.name = "WaiverRequiredError";
  }
}

async function requireWaiver(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from haul_waivers
    where user_id = ${userId} and version = ${HAUL_WAIVER_VERSION}
    limit 1
  `;
  if (!rows.length) throw new WaiverRequiredError();
}

async function savePhoto(dataUrl: string, haulId: number) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) return "";
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `haul-${haulId}.jpg`;
  await writeFile(join(dir, name), Buffer.from(match[2], "base64"));
  return `/uploads/${name}`;
}

const postSchema = z.object({
  customerName: z.string().trim().min(2).max(60),
  retailer: z.string().trim().min(2).max(40),
  storeAddress: z.string().trim().min(8).max(160),
  dropoffAddress: z.string().trim().min(8).max(160),
  neighborhood: z.string().trim().min(2).max(40),
  itemTitle: z.string().trim().min(3).max(80),
  itemNotes: z.string().trim().min(8).max(400),
  itemKey: z.enum(ITEM_KEYS),
  sizeClass: z.enum(["compact", "medium", "large", "extra"]),
  stairs: z.number().int().min(0).max(8),
  miles: z.number().int().min(1).max(80),
  helpers: z.number().int().min(1).max(3),
  truck: z.enum(["pickup", "van", "box"]),
  pickupWindow: z.string().trim().min(4).max(80),
  photoDataUrl: z.string().optional(),
});

async function insertHaul(userId: string, data: z.infer<typeof postSchema>, funded: boolean) {
  const quote = quoteHaul({
    sizeClass: data.sizeClass,
    stairs: data.stairs,
    miles: data.miles,
    helpers: data.helpers,
    truck: data.truck,
  });
  const sql = await getSql();
  const rows = await sql<HaulRow>`
    insert into hauls (
      customer_id, customer_name, retailer, store_address, dropoff_address, neighborhood,
      item_title, item_notes, item_key, size_class, stairs, miles, helpers, truck,
      pickup_window, photo_url, price_cents, take_cents, crew_cents, status, funded
    ) values (
      ${userId}, ${data.customerName}, ${data.retailer}, ${data.storeAddress}, ${data.dropoffAddress},
      ${data.neighborhood}, ${data.itemTitle}, ${data.itemNotes}, ${data.itemKey}, ${data.sizeClass},
      ${data.stairs}, ${data.miles}, ${data.helpers}, ${data.truck}, ${data.pickupWindow}, '',
      ${quote.priceCents}, ${quote.takeCents}, ${quote.crewCents}, 'open', ${funded}
    )
    returning *
  `;
  const haul = rows[0];
  if (data.photoDataUrl) {
    const photoUrl = await savePhoto(data.photoDataUrl, Number(haul.id));
    if (photoUrl) {
      const updated = await sql<HaulRow>`
        update hauls set photo_url = ${photoUrl} where id = ${Number(haul.id)} returning *
      `;
      return updated[0] ?? haul;
    }
  }
  return haul;
}

export const getWaiverStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ legal_name: string; accepted_at: string | Date }>`
      select legal_name, accepted_at from haul_waivers
      where user_id = ${context.userId} and version = ${HAUL_WAIVER_VERSION}
      limit 1
    `;
    const row = rows[0];
    return {
      signed: Boolean(row),
      legalName: row?.legal_name ?? null,
      acceptedAt: row ? asIso(row.accepted_at) : null,
      version: HAUL_WAIVER_VERSION,
    };
  });

export const signHaulWaiver = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      legalName: z.string().trim().min(3).max(80),
      acks: z.array(z.literal(true)).length(4),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into haul_waivers (user_id, legal_name, version, accepted_at)
      values (${context.userId}, ${data.legalName}, ${HAUL_WAIVER_VERSION}, now())
      on conflict (user_id) do update set
        legal_name = excluded.legal_name,
        version = excluded.version,
        accepted_at = now()
    `;
    return { ok: true };
  });

export const getCrewProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CrewProfile> => {
    const sql = await getSql();
    const rows = await sql<CrewProfile & { paypal_email: string; display_name: string; crew_size: number; vehicle: Truck }>`
      select display_name, paypal_email, vehicle, crew_size from crew_profiles
      where user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    return {
      displayName: row?.display_name ?? "",
      paypalEmail: row?.paypal_email ?? "",
      vehicle: row?.vehicle ?? "pickup",
      crewSize: row?.crew_size ?? 2,
    };
  });

export const saveCrewProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().trim().min(2).max(60),
      paypalEmail: z.string().trim().email().max(120),
      vehicle: z.enum(["pickup", "van", "box"]),
      crewSize: z.number().int().min(1).max(3),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    await sql`
      insert into crew_profiles (user_id, display_name, paypal_email, vehicle, crew_size, updated_at)
      values (${context.userId}, ${data.displayName}, ${data.paypalEmail}, ${data.vehicle}, ${data.crewSize}, now())
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        paypal_email = excluded.paypal_email,
        vehicle = excluded.vehicle,
        crew_size = excluded.crew_size,
        updated_at = now()
    `;
    return { ok: true };
  });

export const listOpenHauls = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Haul[]> => {
    const sql = await getSql();
    const rows = await sql<HaulRow>`
      select * from hauls where status = 'open' order by created_at desc
    `;
    return rows.map((row) => mapHaul(row, context.userId));
  });

export const listMyHauls = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Haul[]> => {
    const sql = await getSql();
    const rows = await sql<HaulRow>`
      select * from hauls
      where customer_id = ${context.userId} or crew_id = ${context.userId}
      order by created_at desc
    `;
    return rows.map((row) => mapHaul(row, context.userId));
  });

export const getHaul = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<Haul> => {
    const sql = await getSql();
    const rows = await sql<HaulRow>`select * from hauls where id = ${data.id} limit 1`;
    if (!rows[0]) throw new Error("That haul is gone.");
    return mapHaul(rows[0], context.userId);
  });

export const postHaulUnpaid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(postSchema)
  .handler(async ({ context, data }): Promise<Haul> => {
    await requireWaiver(context.userId);
    const creds = await loadPayPalCredentials();
    if (creds) throw new Error("PayPal is connected. Pay with PayPal to post this haul.");
    const row = await insertHaul(context.userId, data, false);
    return mapHaul(row, context.userId);
  });

export const startHaulCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(postSchema)
  .handler(async ({ context, data }): Promise<{ orderId: string }> => {
    await requireWaiver(context.userId);
    const creds = await loadPayPalCredentials();
    if (!creds) throw new Error("PayPal is not connected. Install the SDK on The take.");
    const quote = quoteHaul(data);
    const orderId = await createPayPalOrder({
      listingId: Date.now(),
      title: `${data.itemTitle} from ${data.retailer}`,
      priceCents: quote.priceCents,
    });
    const sql = await getSql();
    await sql`
      insert into haul_checkouts (order_id, user_id, payload, status)
      values (${orderId}, ${context.userId}, ${JSON.stringify(data)}, 'created')
    `;
    return { orderId };
  });

export const captureHaulCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(8).max(80) }))
  .handler(async ({ context, data }): Promise<Haul> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const checkouts = await sql<{ payload: string; status: string }>`
      select payload, status from haul_checkouts
      where order_id = ${data.orderId} and user_id = ${context.userId}
      limit 1
    `;
    const checkout = checkouts[0];
    if (!checkout) throw new Error("That PayPal order was not found.");
    if (checkout.status === "captured") throw new Error("Already captured.");
    const payload = postSchema.parse(JSON.parse(checkout.payload));
    const captured = await capturePayPalOrder(data.orderId);
    const row = await insertHaul(context.userId, payload, true);
    const split = splitSale(Number(row.price_cents));
    await sql`
      insert into haul_payments (
        haul_id, payer_user_id, amount_cents, take_cents, crew_cents,
        status, paypal_order_id, paypal_capture_id, payout_status
      ) values (
        ${Number(row.id)}, ${context.userId}, ${split.priceCents}, ${split.takeCents}, ${split.cookCents},
        'captured', ${captured.orderId}, ${captured.captureId}, 'held'
      )
    `;
    await sql`update haul_checkouts set status = 'captured' where order_id = ${data.orderId}`;
    return mapHaul(row, context.userId);
  });

export const claimHaul = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const profiles = await sql<{ display_name: string; paypal_email: string; vehicle: Truck; crew_size: number }>`
      select display_name, paypal_email, vehicle, crew_size from crew_profiles
      where user_id = ${context.userId} limit 1
    `;
    const profile = profiles[0];
    if (!profile?.paypal_email) throw new Error("Add your PayPal email and truck on My hauls before you take a job.");
    const hauls = await sql<HaulRow>`select * from hauls where id = ${data.id} limit 1`;
    const haul = hauls[0];
    if (!haul || haul.status !== "open") throw new Error("That job is no longer open.");
    if (haul.customer_id === context.userId) throw new Error("You cannot haul your own item.");
    if (haul.helpers > Number(profile.crew_size)) {
      throw new Error(`This job needs ${haul.helpers} people. Your crew is listed as ${profile.crew_size}.`);
    }
    await sql`
      update hauls
      set status = 'claimed',
          crew_id = ${context.userId},
          crew_name = ${profile.display_name},
          crew_paypal_email = ${profile.paypal_email}
      where id = ${data.id} and status = 'open'
    `;
  });

export const markPickedUp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    await sql`
      update hauls set status = 'picked_up'
      where id = ${data.id} and status = 'claimed' and crew_id = ${context.userId}
    `;
  });

export const confirmDelivery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<HaulRow>`
      select * from hauls
      where id = ${data.id}
        and status in ('claimed', 'picked_up')
        and (customer_id = ${context.userId} or crew_id = ${context.userId})
      limit 1
    `;
    const haul = rows[0];
    if (!haul) throw new Error("That delivery is not waiting on you.");
    await sql`update hauls set status = 'delivered' where id = ${data.id}`;
    try {
      await payoutCrew(Number(haul.id));
    } catch (err) {
      await sql`
        update haul_payments set payout_status = 'due'
        where haul_id = ${Number(haul.id)} and status = 'captured'
      `;
      throw new Error(
        err instanceof Error
          ? `Delivered, but the crew payout needs a retry: ${err.message}`
          : "Delivered, but the crew payout needs a retry on The take.",
      );
    }
  });

export const cancelHaul = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive(),
      reason: z.enum(["not_at_lot", "unsafe", "customer_cancel"]),
    }),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<HaulRow>`select * from hauls where id = ${data.id} limit 1`;
    const haul = rows[0];
    if (!haul) throw new Error("That haul is gone.");
    const isCustomer = haul.customer_id === context.userId;
    const isCrew = haul.crew_id === context.userId;
    if (!isCustomer && !isCrew) throw new Error("Only the customer or crew can cancel.");
    if (haul.status === "delivered") throw new Error("Already delivered — no refund.");
    if (haul.status === "open" && !isCustomer) throw new Error("Only the customer can pull an unclaimed job.");
    if (haul.status !== "open" && data.reason === "customer_cancel") {
      throw new Error("After a crew is booked, cancel only if the item is missing or unsafe to move.");
    }
    const payments = await sql<{
      id: number;
      amount_cents: number;
      paypal_capture_id: string | null;
      status: string;
    }>`
      select id, amount_cents, paypal_capture_id, status from haul_payments
      where haul_id = ${Number(haul.id)} and status = 'captured' limit 1
    `;
    const payment = payments[0];
    if (payment?.paypal_capture_id) {
      await refundPayPalCapture(payment.paypal_capture_id, Number(payment.amount_cents));
    }
    if (payment) {
      await sql`update haul_payments set status = 'refunded' where id = ${Number(payment.id)}`;
    }
    await sql`update hauls set status = 'cancelled' where id = ${data.id}`;
  });

async function payoutCrew(haulId: number) {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    crew_cents: number;
    payout_status: string;
    crew_paypal_email: string;
    item_title: string;
  }>`
    select p.id, p.crew_cents, p.payout_status, h.crew_paypal_email, h.item_title
    from haul_payments p
    join hauls h on h.id = p.haul_id
    where p.haul_id = ${haulId} and p.status = 'captured'
    limit 1
  `;
  const payment = rows[0];
  if (!payment) return;
  if (payment.payout_status === "sent") return;
  const email = (payment.crew_paypal_email || "").trim();
  if (!email) {
    await sql`update haul_payments set payout_status = 'due' where id = ${Number(payment.id)}`;
    return;
  }
  const batchId = await payoutToEmail({
    email,
    amountCents: Number(payment.crew_cents),
    claimId: haulId,
    note: `LotLift crew share for "${payment.item_title}"`,
  });
  await sql`
    update haul_payments
    set payout_status = 'sent', payout_batch_id = ${batchId}
    where id = ${Number(payment.id)}
  `;
}

export const getPayPalPublicConfig = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<PayPalPublicConfig> => {
    const creds = await loadPayPalCredentials();
    if (!creds) return { configured: false, clientId: "", mode: "sandbox" };
    return { configured: true, clientId: creds.clientId, mode: creds.mode };
  });

export const savePlatformPayPal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      clientId: z.string().trim().min(8).max(200),
      secret: z.string().trim().min(8).max(200),
      mode: z.enum(["sandbox", "live"]),
    }),
  )
  .handler(async ({ data }): Promise<PayPalPublicConfig> => {
    await savePayPalCredentials({
      clientId: data.clientId,
      secret: data.secret,
      mode: data.mode,
    });
    return { configured: true, clientId: data.clientId, mode: data.mode };
  });

export const retryCrewPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ haulId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<void> => {
    await payoutCrew(data.haulId);
  });

export const listDuePayouts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<DuePayout[]> => {
    const sql = await getSql();
    const rows = await sql<{
      haul_id: number;
      item_title: string;
      crew_paypal_email: string;
      crew_cents: number;
      take_cents: number;
      payout_status: string;
    }>`
      select p.haul_id, h.item_title, h.crew_paypal_email, p.crew_cents, p.take_cents, p.payout_status
      from haul_payments p
      join hauls h on h.id = p.haul_id
      where p.status = 'captured'
        and h.status = 'delivered'
        and p.payout_status in ('due', 'held', 'none')
      order by p.created_at desc
    `;
    return rows.map((row) => ({
      haulId: Number(row.haul_id),
      title: row.item_title,
      crewEmail: row.crew_paypal_email || "",
      crewCents: Number(row.crew_cents),
      takeCents: Number(row.take_cents),
      payoutStatus: row.payout_status,
    }));
  });

export const getTableLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<TableLedger> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      haul_id: number;
      item_title: string;
      customer_name: string;
      crew_name: string | null;
      amount_cents: number;
      take_cents: number;
      crew_cents: number;
      created_at: string | Date;
    }>`
      select p.id, p.haul_id, h.item_title, h.customer_name, h.crew_name,
             p.amount_cents, p.take_cents, p.crew_cents, p.created_at
      from haul_payments p
      join hauls h on h.id = p.haul_id
      where p.status = 'captured'
      order by p.created_at desc
    `;
    const grossCents = rows.reduce((sum, row) => sum + Number(row.amount_cents), 0);
    const takeCents = rows.reduce((sum, row) => sum + Number(row.take_cents), 0);
    const crewCents = rows.reduce((sum, row) => sum + Number(row.crew_cents), 0);
    return {
      saleCount: rows.length,
      grossCents,
      takeCents,
      crewCents,
      rows: rows.map((row) => ({
        id: Number(row.id),
        haulId: Number(row.haul_id),
        title: row.item_title,
        customerName: row.customer_name,
        crewName: row.crew_name || "Unclaimed",
        priceCents: Number(row.amount_cents),
        takeCents: Number(row.take_cents),
        crewCents: Number(row.crew_cents),
        createdAt: asIso(row.created_at),
      })),
    };
  });
