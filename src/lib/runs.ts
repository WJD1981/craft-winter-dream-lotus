import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { ASK_WAIVER_VERSION } from "@/lib/ask-waiver";
import { ITEM_KEYS, type ItemKey, type Kind } from "@/lib/run-catalog";
import { assertAllowedCargo } from "@/lib/prohibited";
import { requireCompleteProfile, requireRunnerFace } from "@/lib/profiles";
import { newShareToken, notify } from "@/lib/ops";
import { splitSale, formatCents, PLUS_DAYS, PLUS_PRICE_CENTS, PLUS_TAKE_RATE, takeRateForPlus } from "@/lib/fees";
import {
  capturePayPalOrder,
  createPayPalOrder,
  loadPayPalCredentials,
  payoutToEmail,
  refundPayPalCapture,
  savePayPalCredentials,
  type PayPalMode,
} from "@/lib/paypal";

export type RunStatus = "open" | "pending_approval" | "pending_pay" | "locked" | "picked_up" | "delivered" | "cancelled";
export type CounterStatus = "pending" | "accepted" | "declined" | "withdrawn";

export type Counter = {
  id: number;
  runId: number;
  runnerId: string;
  runnerName: string;
  amountCents: number;
  takeCents: number;
  runnerCents: number;
  chargeCents: number;
  message: string;
  status: CounterStatus;
  createdAt: string;
  isMine: boolean;
};

export type Run = {
  id: number;
  customerId: string;
  customerName: string;
  isBusiness: boolean;
  businessName: string;
  kind: Kind;
  store: string;
  orderRef: string;
  pickupAddress: string;
  dropoffAddress: string;
  neighborhood: string;
  notes: string;
  itemKey: ItemKey;
  pickupWindow: string;
  photoUrl: string;
  offerCents: number;
  lockedCents: number | null;
  takeCents: number;
  runnerCents: number;
  chargeCents: number;
  takeRate: number;
  declaredCents: number;
  protectOn: boolean;
  protectFeeCents: number;
  protectCoverCents: number;
  pickupPhotoUrl: string;
  dropPhotoUrl: string;
  claimStatus: string;
  status: RunStatus;
  funded: boolean;
  runnerId: string | null;
  runnerName: string | null;
  counterCount: number;
  createdAt: string;
  isCustomer: boolean;
  isRunner: boolean;
  counters: Counter[];
  dispute: Dispute | null;
  progress: string;
  shareToken: string;
  tipCents: number;
  tipStatus: string;
};

export const DISPUTE_KINDS = {
  damaged: "Damaged in transit",
  missing: "Missing items",
  wrong_order: "Wrong order",
  runner_no_show: "Runner did not show",
  store_refused: "Pickup would not release the item",
  customer_no_show: "Customer not at drop-off",
  unsafe: "Unsafe to carry or deliver",
  other: "Other",
} as const;

export type DisputeKind = keyof typeof DISPUTE_KINDS;

export type Dispute = {
  id: number;
  runId: number;
  openedById: string;
  openedByRole: "customer" | "runner";
  kind: DisputeKind;
  note: string;
  photoUrl: string;
  responseNote: string;
  responsePhotoUrl: string;
  status: string;
  decisionNote: string;
  createdAt: string;
};

export type RunnerProfile = {
  displayName: string;
  paypalEmail: string;
  vehicle: string;
  insuranceCarrier: string;
  insurancePolicy: string;
  insuranceExpires: string;
  insurancePhotoUrl: string;
  insuranceAck: boolean;
  insuranceCoverCents: number;
  insuranceValid: boolean;
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
  protectCents: number;
  plusCents: number;
  plusCount: number;
  crewCents: number;
  keepCents: number;
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

type RunRow = {
  id: number;
  customer_id: string;
  customer_name: string;
  is_business: boolean;
  business_name: string;
  kind: Kind;
  store: string;
  order_ref: string;
  pickup_address: string;
  dropoff_address: string;
  neighborhood: string;
  notes: string;
  item_key: ItemKey;
  pickup_window: string;
  photo_url: string;
  offer_cents: number;
  locked_cents: number | null;
  take_cents: number;
  runner_cents: number;
  charge_cents: number | null;
  take_rate: number | string;
  declared_cents: number;
  protect_on: boolean;
  protect_fee_cents: number;
  protect_cover_cents: number;
  pickup_photo_url: string;
  drop_photo_url: string;
  claim_status: string;
  status: RunStatus;
  funded: boolean;
  runner_id: string | null;
  runner_name: string | null;
  runner_paypal_email: string;
  progress?: string;
  share_token?: string | null;
  tip_cents?: number;
  tip_status?: string;
  created_at: string | Date;
};

type CounterRow = {
  id: number;
  run_id: number;
  runner_id: string;
  runner_name: string;
  amount_cents: number;
  message: string;
  status: CounterStatus;
  created_at: string | Date;
};

function asIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function insuranceIsValid(expires: string | Date | null | undefined, ack: boolean, carrier: string, policy: string, photo: string) {
  if (!ack || !carrier.trim() || !policy.trim() || !photo) return false;
  if (!expires) return false;
  const day = typeof expires === "string" ? expires.slice(0, 10) : expires.toISOString().slice(0, 10);
  return day >= new Date().toISOString().slice(0, 10);
}

function parseTakeRate(value: number | string | null | undefined) {
  const n = Number(value);
  return n <= PLUS_TAKE_RATE + 0.001 ? PLUS_TAKE_RATE : 0.2;
}

function mapCounter(row: CounterRow, userId: string, takeRate = 0.2): Counter {
  const split = splitSale(Number(row.amount_cents), takeRate);
  return {
    id: Number(row.id),
    runId: Number(row.run_id),
    runnerId: row.runner_id,
    runnerName: row.runner_name,
    amountCents: split.priceCents,
    takeCents: split.takeCents,
    runnerCents: split.cookCents,
    chargeCents: split.chargeCents,
    message: row.message,
    status: row.status,
    createdAt: asIso(row.created_at),
    isMine: row.runner_id === userId,
  };
}

function mapRun(row: RunRow, userId: string, counters: Counter[] = []): Run {
  const takeRate = parseTakeRate(row.take_rate);
  const display = Number(row.locked_cents ?? row.offer_cents);
  const split = splitSale(display, takeRate);
  const pricedCounters = counters.map((counter) => {
    const next = splitSale(counter.amountCents, takeRate);
    return { ...counter, takeCents: next.takeCents, runnerCents: next.cookCents, chargeCents: next.chargeCents };
  });
  return {
    id: Number(row.id),
    customerId: row.customer_id,
    customerName: row.customer_name,
    isBusiness: Boolean(row.is_business),
    businessName: row.business_name || "",
    kind: row.kind,
    store: row.store,
    orderRef: row.order_ref || "",
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    neighborhood: row.neighborhood,
    notes: row.notes,
    itemKey: row.item_key,
    pickupWindow: row.pickup_window,
    photoUrl: row.photo_url || "",
    offerCents: Number(row.offer_cents),
    lockedCents: row.locked_cents == null ? null : Number(row.locked_cents),
    takeCents: Number(row.take_cents) || split.takeCents,
    runnerCents: Number(row.runner_cents) || split.cookCents,
    chargeCents: Number(row.charge_cents) || split.chargeCents,
    takeRate,
    declaredCents: Number(row.declared_cents) || 0,
    protectOn: Boolean(row.protect_on),
    protectFeeCents: Number(row.protect_fee_cents) || 0,
    protectCoverCents: Number(row.protect_cover_cents) || 0,
    pickupPhotoUrl: row.pickup_photo_url || "",
    dropPhotoUrl: row.drop_photo_url || "",
    claimStatus: row.claim_status || "none",
    status: row.status,
    funded: Boolean(row.funded),
    runnerId: row.runner_id,
    runnerName: row.runner_name,
    counterCount: counters.filter((c) => c.status === "pending").length,
    createdAt: asIso(row.created_at),
    isCustomer: row.customer_id === userId,
    isRunner: row.runner_id === userId,
    counters: pricedCounters,
    dispute: null,
    progress: row.progress || "idle",
    shareToken: row.share_token || "",
    tipCents: Number(row.tip_cents) || 0,
    tipStatus: row.tip_status || "none",
  };
}

class WaiverRequiredError extends Error {
  constructor() {
    super("WAIVER_REQUIRED");
    this.name = "WaiverRequiredError";
  }
}

async function isPlus(userId: string) {
  if (!userId || userId === "community") return false;
  const sql = await getSql();
  const rows = await sql<{ plus_until: string | Date }>`
    select plus_until from plus_members
    where user_id = ${userId} and plus_until > now()
    limit 1
  `;
  return Boolean(rows[0]);
}

async function requireWaiver(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from ask_waivers
    where user_id = ${userId} and version = ${ASK_WAIVER_VERSION}
    limit 1
  `;
  if (!rows.length) throw new WaiverRequiredError();
}

async function savePhoto(dataUrl: string, runId: number, kind = "run") {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) return "";
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${kind}-${runId}.jpg`;
  await writeFile(join(dir, name), Buffer.from(match[2], "base64"));
  return `/uploads/${name}`;
}

async function countersFor(runIds: number[], userId: string) {
  const map = new Map<number, Counter[]>();
  if (!runIds.length) return map;
  const sql = await getSql();
  for (const id of runIds) {
    const rows = await sql<CounterRow>`
      select * from run_counters where run_id = ${id} order by created_at desc
    `;
    map.set(id, rows.map((row) => mapCounter(row, userId)));
  }
  return map;
}

const postSchema = z.object({
  customerName: z.string().trim().min(2).max(60),
  isBusiness: z.boolean(),
  businessName: z.string().trim().max(80),
  kind: z.enum(["retail", "restaurant", "grocery", "pharmacy", "hardware", "shop", "home", "other"]),
  store: z.string().trim().min(2).max(60),
  orderRef: z.string().trim().max(80),
  pickupAddress: z.string().trim().min(8).max(160),
  dropoffAddress: z.string().trim().min(8).max(160),
  neighborhood: z.string().trim().max(40).optional(),
  notes: z.string().trim().min(8).max(400),
  itemKey: z.enum(ITEM_KEYS),
  pickupWindow: z.string().trim().min(4).max(80),
  offerCents: z.number().int().min(800).max(200000),
  declaredCents: z.number().int().min(1000).max(200000),
  noProhibited: z.literal(true),
  photoDataUrl: z.string().optional(),
});

export const getWaiverStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ legal_name: string; accepted_at: string | Date }>`
      select legal_name, accepted_at from ask_waivers
      where user_id = ${context.userId} and version = ${ASK_WAIVER_VERSION}
      limit 1
    `;
    const row = rows[0];
    return {
      signed: Boolean(row),
      legalName: row?.legal_name ?? null,
      acceptedAt: row ? asIso(row.accepted_at) : null,
      version: ASK_WAIVER_VERSION,
    };
  });

export const signAskWaiver = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ legalName: z.string().trim().min(3).max(80), acks: z.array(z.literal(true)).length(9) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into ask_waivers (user_id, legal_name, version, accepted_at)
      values (${context.userId}, ${data.legalName}, ${ASK_WAIVER_VERSION}, now())
      on conflict (user_id) do update set
        legal_name = excluded.legal_name,
        version = excluded.version,
        accepted_at = now()
    `;
    return { ok: true };
  });

export const getRunnerProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RunnerProfile> => {
    const sql = await getSql();
    const rows = await sql<{
      display_name: string;
      paypal_email: string;
      vehicle: string;
      insurance_carrier: string;
      insurance_policy: string;
      insurance_expires: string | Date | null;
      insurance_photo_url: string;
      insurance_ack: boolean;
      insurance_cover_cents: number;
    }>`
      select display_name, paypal_email, vehicle, insurance_carrier, insurance_policy,
             insurance_expires, insurance_photo_url, insurance_ack, insurance_cover_cents
      from runner_profiles
      where user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    const expires = row?.insurance_expires
      ? (row.insurance_expires instanceof Date
          ? row.insurance_expires.toISOString().slice(0, 10)
          : String(row.insurance_expires).slice(0, 10))
      : "";
    return {
      displayName: row?.display_name ?? "",
      paypalEmail: row?.paypal_email ?? "",
      vehicle: row?.vehicle ?? "car",
      insuranceCarrier: row?.insurance_carrier ?? "",
      insurancePolicy: row?.insurance_policy ?? "",
      insuranceExpires: expires,
      insurancePhotoUrl: row?.insurance_photo_url ?? "",
      insuranceAck: Boolean(row?.insurance_ack),
      insuranceCoverCents: Number(row?.insurance_cover_cents) || 0,
      insuranceValid: insuranceIsValid(
        expires,
        Boolean(row?.insurance_ack),
        row?.insurance_carrier ?? "",
        row?.insurance_policy ?? "",
        row?.insurance_photo_url ?? "",
      ) && Number(row?.insurance_cover_cents) > 0,
    };
  });

export const saveRunnerProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().trim().min(2).max(60),
      paypalEmail: z.string().trim().email().max(120),
      vehicle: z.enum(["car", "suv", "pickup", "van", "bike"]),
      insuranceCarrier: z.string().trim().min(2).max(80),
      insurancePolicy: z.string().trim().min(4).max(80),
      insuranceExpires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      insuranceCoverCents: z.number().int().min(1000).max(5_000_000),
      insuranceAck: z.literal(true),
      insurancePhotoDataUrl: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireWaiver(context.userId);
    if (data.insuranceExpires < new Date().toISOString().slice(0, 10)) {
      throw new Error("Courier insurance must not be expired.");
    }
    const sql = await getSql();
    const existing = await sql<{ insurance_photo_url: string }>`
      select insurance_photo_url from runner_profiles where user_id = ${context.userId} limit 1
    `;
    let photoUrl = existing[0]?.insurance_photo_url || "";
    if (data.insurancePhotoDataUrl) {
      photoUrl = await savePhoto(data.insurancePhotoDataUrl, Date.now(), `ins-${context.userId.slice(0, 12)}`);
    }
    if (!photoUrl) throw new Error("Upload a photo of your courier insurance declarations page.");
    await sql`
      insert into runner_profiles (
        user_id, display_name, paypal_email, vehicle, updated_at,
        insurance_carrier, insurance_policy, insurance_expires, insurance_photo_url, insurance_ack, insurance_cover_cents
      )
      values (
        ${context.userId}, ${data.displayName}, ${data.paypalEmail}, ${data.vehicle}, now(),
        ${data.insuranceCarrier}, ${data.insurancePolicy}, ${data.insuranceExpires}::date, ${photoUrl}, true, ${data.insuranceCoverCents}
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        paypal_email = excluded.paypal_email,
        vehicle = excluded.vehicle,
        insurance_carrier = excluded.insurance_carrier,
        insurance_policy = excluded.insurance_policy,
        insurance_expires = excluded.insurance_expires,
        insurance_photo_url = excluded.insurance_photo_url,
        insurance_ack = true,
        insurance_cover_cents = excluded.insurance_cover_cents,
        updated_at = now()
    `;
    return { ok: true };
  });

export const listOpenRuns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Run[]> => {
    const sql = await getSql();
    const rows = await sql<RunRow>`
      select * from runs r
      where r.status = 'open'
        and not exists (
          select 1 from user_blocks b
          where (b.user_id = ${context.userId} and b.blocked_id = r.customer_id)
             or (b.user_id = r.customer_id and b.blocked_id = ${context.userId})
        )
      order by created_at desc
    `;
    const cmap = await countersFor(rows.map((r) => Number(r.id)), context.userId);
    return rows.map((row) => mapRun(row, context.userId, cmap.get(Number(row.id)) ?? []));
  });

export const listMyRuns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Run[]> => {
    const sql = await getSql();
    const rows = await sql<RunRow>`
      select * from runs
      where customer_id = ${context.userId} or runner_id = ${context.userId}
         or id in (select run_id from run_counters where runner_id = ${context.userId})
      order by created_at desc
    `;
    const cmap = await countersFor(rows.map((r) => Number(r.id)), context.userId);
    return rows.map((row) => mapRun(row, context.userId, cmap.get(Number(row.id)) ?? []));
  });

export const getRun = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<Run> => {
    const sql = await getSql();
    const rows = await sql<RunRow>`select * from runs where id = ${data.id} limit 1`;
    if (!rows[0]) throw new Error("That run is gone.");
    const cmap = await countersFor([data.id], context.userId);
    const mapped = mapRun(rows[0], context.userId, cmap.get(data.id) ?? []);
    mapped.dispute = await loadDispute(data.id);
    return mapped;
  });

export const postRun = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(postSchema)
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    await requireCompleteProfile(context.userId);
    if (data.isBusiness && !data.businessName.trim()) throw new Error("Add the business name.");
    if ((data.kind === "home" || data.kind === "shop") && !data.photoDataUrl) {
      throw new Error("Add a photo of the item you want moved.");
    }
    assertAllowedCargo(data.store, data.notes, data.orderRef, data.pickupAddress, data.kind);
    const takeRate = takeRateForPlus(await isPlus(context.userId));
    const split = splitSale(data.offerCents, takeRate);
    const quoteDeclared = data.declaredCents;
    if (quoteDeclared < 1000) throw new Error("Declare what the items are worth so a runner’s cargo cover can match.");
    const sql = await getSql();
    const rows = await sql<RunRow>`
      insert into runs (
        customer_id, customer_name, is_business, business_name, kind, store, order_ref,
        pickup_address, dropoff_address, neighborhood, notes, item_key, pickup_window,
        photo_url, offer_cents, take_cents, runner_cents, take_rate, charge_cents, status, funded,
        declared_cents, protect_on, protect_fee_cents, protect_cover_cents
      ) values (
        ${context.userId}, ${data.customerName}, ${data.isBusiness}, ${data.isBusiness ? data.businessName : ""},
        ${data.kind}, ${data.store}, ${data.orderRef}, ${data.pickupAddress}, ${data.dropoffAddress},
        ${data.neighborhood || ""}, ${data.notes}, ${data.itemKey}, ${data.pickupWindow}, '',
        ${split.priceCents}, ${split.takeCents}, ${split.cookCents}, ${takeRate}, ${split.chargeCents}, 'open', false,
        ${quoteDeclared}, false, 0, 0
      )
      returning *
    `;
    const row = rows[0];
    if (data.photoDataUrl) {
      const photoUrl = await savePhoto(data.photoDataUrl, Number(row.id));
      if (photoUrl) {
        const updated = await sql<RunRow>`
          update runs set photo_url = ${photoUrl} where id = ${Number(row.id)} returning *
        `;
        return mapRun(updated[0] ?? row, context.userId, []);
      }
    }
    return mapRun(row, context.userId, []);
  });

async function requireRunner(userId: string, declaredCents = 0) {
  const sql = await getSql();
  const rows = await sql<{
    display_name: string;
    paypal_email: string;
    insurance_carrier: string;
    insurance_policy: string;
    insurance_expires: string | Date | null;
    insurance_photo_url: string;
    insurance_ack: boolean;
    insurance_cover_cents: number;
  }>`
    select display_name, paypal_email, insurance_carrier, insurance_policy,
           insurance_expires, insurance_photo_url, insurance_ack, insurance_cover_cents
    from runner_profiles where user_id = ${userId} limit 1
  `;
  const row = rows[0];
  if (!row?.paypal_email) throw new Error("Add your PayPal email on My runs before you take a job.");
  const face = await requireRunnerFace(userId);
  if (
    !insuranceIsValid(
      row.insurance_expires,
      Boolean(row.insurance_ack),
      row.insurance_carrier || "",
      row.insurance_policy || "",
      row.insurance_photo_url || "",
    )
  ) {
    throw new Error("Add active courier insurance on My runs before you accept or counter.");
  }
  const cover = Number(row.insurance_cover_cents) || 0;
  if (cover <= 0) throw new Error("Add your cargo coverage limit on My runs.");
  const need = Math.max(0, Math.round(declaredCents));
  if (need > 0 && cover < need) {
    throw new Error(
      `Your cargo cover is ${formatCents(cover)}. This run’s items are declared at ${formatCents(need)}. Coverage must meet or exceed that amount.`,
    );
  }
  return { ...row, display_name: face.display_name || row.display_name };
}

async function assignRunner(runId: number, runner: { id: string; name: string; email: string }, amountCents: number, pendingPay: boolean, customerId: string) {
  const takeRate = takeRateForPlus(await isPlus(customerId));
  const split = splitSale(amountCents, takeRate);
  const community = customerId === "community";
  const status = community ? (pendingPay ? "pending_pay" : "locked") : "pending_approval";
  const sql = await getSql();
  await sql`
    update runs
    set status = ${status},
        locked_cents = ${split.priceCents},
        take_cents = ${split.takeCents},
        runner_cents = ${split.cookCents},
        take_rate = ${takeRate},
        charge_cents = ${split.chargeCents},
        runner_id = ${runner.id},
        runner_name = ${runner.name},
        runner_paypal_email = ${runner.email},
        funded = ${community && !pendingPay},
        share_token = ${newShareToken()},
        progress = 'idle'
    where id = ${runId} and status = 'open'
  `;
}

export const acceptOffer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`select * from runs where id = ${data.id} limit 1`;
    const run = rows[0];
    if (!run || run.status !== "open") throw new Error("That run is no longer open.");
    if (run.customer_id === context.userId) throw new Error("You cannot take your own run.");
    assertAllowedCargo(run.store, run.notes, run.order_ref, run.kind);
    const profile = await requireRunner(context.userId, Number(run.declared_cents));
    const creds = await loadPayPalCredentials();
    const pendingPay = Boolean(creds) && run.customer_id !== "community";
    await assignRunner(
      data.id,
      { id: context.userId, name: profile.display_name, email: profile.paypal_email },
      Number(run.offer_cents),
      pendingPay,
      run.customer_id,
    );
    await sql`
      update run_counters set status = 'declined'
      where run_id = ${data.id} and status = 'pending'
    `;
    await notify(
      run.customer_id,
      "accept",
      `${profile.display_name} accepted your fare`,
      `${run.store} · review their profile, then approve.`,
      `/job/${data.id}`,
    );
    return getRun({ data: { id: data.id } });
  });

export const approveRunner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    await requireCompleteProfile(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`
      select * from runs where id = ${data.id} and customer_id = ${context.userId} and status = 'pending_approval' limit 1
    `;
    const run = rows[0];
    if (!run || !run.runner_id) throw new Error("No runner is waiting on your approval.");
    await requireRunnerFace(run.runner_id);
    const creds = await loadPayPalCredentials();
    const pendingPay = Boolean(creds);
    await sql`
      update runs
      set status = ${pendingPay ? "pending_pay" : "locked"},
          funded = ${!pendingPay}
      where id = ${data.id} and status = 'pending_approval'
    `;
    await notify(run.runner_id, "approved", "You're approved", `${run.store} · they pay next, then you fetch.`, `/job/${data.id}`);
    return getRun({ data: { id: data.id } });
  });

export const declineRunner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`
      select * from runs where id = ${data.id} and customer_id = ${context.userId} and status = 'pending_approval' limit 1
    `;
    if (!rows[0]) throw new Error("No runner to pass on.");
    const passed = rows[0].runner_id;
    await sql`
      update runs
      set status = 'open',
          runner_id = null,
          runner_name = null,
          runner_paypal_email = '',
          locked_cents = null,
          funded = false
      where id = ${data.id} and status = 'pending_approval'
    `;
    if (passed) await notify(passed, "passed", "The poster passed", `${rows[0].store} is back on the board.`, "/");
    return getRun({ data: { id: data.id } });
  });

export const placeCounter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive(),
      amountCents: z.number().int().min(800).max(200000),
      message: z.string().trim().min(4).max(240),
    }),
  )
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`select * from runs where id = ${data.id} limit 1`;
    const run = rows[0];
    if (!run || run.status !== "open") throw new Error("That run is no longer open.");
    if (run.customer_id === context.userId) throw new Error("You cannot counter your own run.");
    assertAllowedCargo(run.store, run.notes, run.order_ref, run.kind);
    const profile = await requireRunner(context.userId, Number(run.declared_cents));
    if (data.amountCents === Number(run.offer_cents)) {
      throw new Error("That is the listed offer — accept it instead of countering.");
    }
    await sql`
      insert into run_counters (run_id, runner_id, runner_name, amount_cents, message, status)
      values (${data.id}, ${context.userId}, ${profile.display_name}, ${data.amountCents}, ${data.message}, 'pending')
      on conflict (run_id, runner_id) do update set
        amount_cents = excluded.amount_cents,
        message = excluded.message,
        runner_name = excluded.runner_name,
        status = 'pending',
        created_at = now()
    `;
    await notify(
      run.customer_id,
      "counter",
      `${profile.display_name} sent a counter`,
      `${run.store} · ${formatCents(data.amountCents)}`,
      `/job/${data.id}`,
    );
    return getRun({ data: { id: data.id } });
  });

export const decideCounter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ counterId: z.number().int().positive(), accept: z.boolean() }))
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<CounterRow & { customer_id: string; status_run: RunStatus; offer_cents: number; declared_cents: number }>`
      select c.*, r.customer_id, r.status as status_run, r.offer_cents, r.declared_cents
      from run_counters c
      join runs r on r.id = c.run_id
      where c.id = ${data.counterId} and c.status = 'pending'
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("That counter is gone.");
    if (row.customer_id !== context.userId) throw new Error("Only the customer can take a counter.");
    if (row.status_run !== "open") throw new Error("This run is no longer open.");
    if (!data.accept) {
      await sql`update run_counters set status = 'declined' where id = ${data.counterId}`;
      return getRun({ data: { id: Number(row.run_id) } });
    }
    await requireRunner(row.runner_id, Number(row.declared_cents));
    const profiles = await sql<{ paypal_email: string }>`
      select paypal_email from runner_profiles where user_id = ${row.runner_id} limit 1
    `;
    const creds = await loadPayPalCredentials();
    const pendingPay = Boolean(creds) && row.customer_id !== "community";
    await assignRunner(
      Number(row.run_id),
      { id: row.runner_id, name: row.runner_name, email: profiles[0]?.paypal_email || "" },
      Number(row.amount_cents),
      pendingPay,
      row.customer_id,
    );
    await sql`update run_counters set status = 'accepted' where id = ${data.counterId}`;
    await sql`
      update run_counters set status = 'declined'
      where run_id = ${Number(row.run_id)} and id <> ${data.counterId} and status = 'pending'
    `;
    return getRun({ data: { id: Number(row.run_id) } });
  });

export const startLockCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<{ orderId: string; amountCents: number }> => {
    await requireWaiver(context.userId);
    const creds = await loadPayPalCredentials();
    if (!creds) throw new Error("PayPal is not connected. Install the SDK on The take.");
    const sql = await getSql();
    const rows = await sql<RunRow>`
      select * from runs where id = ${data.id} and customer_id = ${context.userId} and status = 'pending_pay'
      limit 1
    `;
    const run = rows[0];
    if (!run || run.locked_cents == null) throw new Error("Nothing to pay on this run.");
    const takeRate = parseTakeRate(run.take_rate);
    const split = splitSale(Number(run.locked_cents), takeRate);
    const fare = Number(run.charge_cents) || split.chargeCents;
    const charge = fare;
    const orderId = await createPayPalOrder({
      listingId: Number(run.id),
      title: `${run.store} pickup`,
      priceCents: charge,
      items: [
        { name: "Runner share (80%)", amountCents: split.cookCents },
        { name: `Askfare take (${Math.round(takeRate * 100)}%)`, amountCents: split.takeCents },
      ],
    });
    await sql`
      insert into run_checkouts (order_id, run_id, user_id, amount_cents, status)
      values (${orderId}, ${Number(run.id)}, ${context.userId}, ${charge}, 'created')
    `;
    return { orderId, amountCents: charge };
  });

export const captureLockCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(8).max(80) }))
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const checkouts = await sql<{ run_id: number; amount_cents: number; status: string }>`
      select run_id, amount_cents, status from run_checkouts
      where order_id = ${data.orderId} and user_id = ${context.userId}
      limit 1
    `;
    const checkout = checkouts[0];
    if (!checkout) throw new Error("That PayPal order was not found.");
    if (checkout.status === "captured") throw new Error("Already captured.");
    const captured = await capturePayPalOrder(data.orderId);
    const runs = await sql<RunRow>`select * from runs where id = ${Number(checkout.run_id)} limit 1`;
    const run = runs[0];
    const takeRate = parseTakeRate(run?.take_rate);
    const named = Number(run?.locked_cents ?? checkout.amount_cents);
    const split = splitSale(named, takeRate);
    await sql`
      insert into run_payments (
        run_id, payer_user_id, amount_cents, take_cents, runner_cents,
        status, paypal_order_id, paypal_capture_id, payout_status
      ) values (
        ${Number(checkout.run_id)}, ${context.userId}, ${Number(checkout.amount_cents)}, ${split.takeCents}, ${split.cookCents},
        'captured', ${captured.orderId}, ${captured.captureId}, 'held'
      )
    `;
    await sql`
      update runs set status = 'locked', funded = true where id = ${Number(checkout.run_id)} and customer_id = ${context.userId}
    `;
    await sql`update run_checkouts set status = 'captured' where order_id = ${data.orderId}`;
    if (run?.runner_id) {
      await notify(run.runner_id, "paid", "Fare is locked", `${run.store} · head to pickup.`, `/job/${Number(checkout.run_id)}`);
    }
    return getRun({ data: { id: Number(checkout.run_id) } });
  });

export const markPickedUp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive(), photoDataUrl: z.string().min(40) }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`
      select * from runs where id = ${data.id} and status = 'locked' and runner_id = ${context.userId} limit 1
    `;
    if (!rows[0]) throw new Error("This run is not waiting on a pickup photo from you.");
    const pickupPhotoUrl = await savePhoto(data.photoDataUrl, data.id, "pickup");
    if (!pickupPhotoUrl) throw new Error("Upload a photograph of the items at pickup.");
    await sql`
      update runs set status = 'picked_up', pickup_photo_url = ${pickupPhotoUrl}, progress = 'to_door'
      where id = ${data.id} and status = 'locked' and runner_id = ${context.userId}
    `;
    await notify(rows[0].customer_id, "progress", "On the way to you", `${rows[0].store} is picked up.`, `/job/${data.id}`);
  });

export const confirmDelivery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`
      select * from runs
      where id = ${data.id}
        and status in ('locked', 'picked_up')
        and (customer_id = ${context.userId} or runner_id = ${context.userId})
      limit 1
    `;
    if (!rows[0]) throw new Error("That delivery is not waiting on you.");
    if (rows[0].claim_status === "open" || rows[0].claim_status === "answered") {
      throw new Error("A dispute is open. Askfare decides it on The take before anyone is paid.");
    }
    await sql`update runs set status = 'delivered' where id = ${data.id}`;
    try {
      await payoutRunner(Number(rows[0].id));
    } catch (err) {
      await sql`
        update run_payments set payout_status = 'due'
        where run_id = ${Number(rows[0].id)} and status = 'captured'
      `;
      throw new Error(
        err instanceof Error
          ? `Delivered, but the runner payout needs a retry: ${err.message}`
          : "Delivered, but the runner payout needs a retry on The take.",
      );
    }
  });

export const cancelRun = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive(),
      reason: z.enum(["not_ready", "unsafe", "customer_cancel", "prohibited"]),
    }),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`select * from runs where id = ${data.id} limit 1`;
    const run = rows[0];
    if (!run) throw new Error("That run is gone.");
    const isCustomer = run.customer_id === context.userId;
    const isRunner = run.runner_id === context.userId;
    if (!isCustomer && !isRunner) throw new Error("Only the customer or runner can cancel.");
    if (run.status === "delivered") throw new Error("Already delivered — no refund.");
    if (run.status === "open" && !isCustomer) throw new Error("Only the customer can pull an open run.");
    if (run.status !== "open" && data.reason === "customer_cancel") {
      throw new Error("After a runner is locked, cancel only if the order is missing, unsafe, or a banned item.");
    }
    const payments = await sql<{ id: number; amount_cents: number; paypal_capture_id: string | null }>`
      select id, amount_cents, paypal_capture_id from run_payments
      where run_id = ${Number(run.id)} and status = 'captured' limit 1
    `;
    const payment = payments[0];
    if (payment?.paypal_capture_id) {
      await refundPayPalCapture(payment.paypal_capture_id, Number(payment.amount_cents));
    }
    if (payment) {
      await sql`update run_payments set status = 'refunded' where id = ${Number(payment.id)}`;
    }
    await sql`update runs set status = 'cancelled' where id = ${data.id}`;
  });

export const fileClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive(),
      kind: z.enum([
        "damaged",
        "missing",
        "wrong_order",
        "runner_no_show",
        "store_refused",
        "customer_no_show",
        "unsafe",
        "other",
      ]),
      note: z.string().trim().min(8).max(400),
      photoDataUrl: z.string().min(40),
    }),
  )
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<RunRow>`select * from runs where id = ${data.id} limit 1`;
    const run = rows[0];
    if (!run) throw new Error("That run is gone.");
    const isCustomer = run.customer_id === context.userId;
    const isRunner = run.runner_id === context.userId;
    if (!isCustomer && !isRunner) throw new Error("Only the customer or runner can open a dispute.");
    if (run.status === "open" || run.status === "cancelled" || run.status === "delivered") {
      throw new Error("Open a dispute after the job is locked, and before delivery is confirmed.");
    }
    if (run.claim_status === "open" || run.claim_status === "answered") {
      throw new Error("A dispute is already open on this run.");
    }
    const customerKinds = ["damaged", "missing", "wrong_order", "runner_no_show", "other"];
    const runnerKinds = ["store_refused", "customer_no_show", "unsafe", "other"];
    if (isCustomer && !customerKinds.includes(data.kind)) {
      throw new Error("That reason is for the runner to file.");
    }
    if (isRunner && !runnerKinds.includes(data.kind)) {
      throw new Error("That reason is for the customer to file.");
    }
    const photoUrl = await savePhoto(data.photoDataUrl, data.id, "dispute");
    if (!photoUrl) throw new Error("Add a photo so both sides and Askfare can see what happened.");
    const role = isCustomer ? "customer" : "runner";
    await sql`
      insert into run_disputes (
        run_id, opened_by_id, opened_by_role, kind, note, photo_url, status
      ) values (
        ${data.id}, ${context.userId}, ${role}, ${data.kind}, ${data.note}, ${photoUrl}, 'open'
      )
    `;
    await sql`
      update runs set claim_status = 'open', drop_photo_url = ${photoUrl} where id = ${data.id}
    `;
    await sql`
      update run_payments set payout_status = 'held'
      where run_id = ${data.id} and status = 'captured' and payout_status <> 'sent'
    `;
    return getRun({ data: { id: data.id } });
  });

export const answerDispute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive(),
      note: z.string().trim().min(8).max(400),
      photoDataUrl: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<Run> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const runRows = await sql<RunRow>`select * from runs where id = ${data.id} limit 1`;
    const run = runRows[0];
    if (!run) throw new Error("That run is gone.");
    const dispute = await loadDispute(data.id);
    if (!dispute || dispute.status !== "open") throw new Error("There is nothing to answer.");
    const isCustomer = run.customer_id === context.userId;
    const isRunner = run.runner_id === context.userId;
    if (!isCustomer && !isRunner) throw new Error("Only the other party can answer.");
    if (dispute.openedById === context.userId) throw new Error("Wait for the other party to answer.");
    const photoUrl = data.photoDataUrl ? await savePhoto(data.photoDataUrl, data.id, "dispute-r") : "";
    await sql`
      update run_disputes
      set response_note = ${data.note},
          response_photo_url = ${photoUrl || dispute.responsePhotoUrl},
          responded_at = now(),
          status = 'answered'
      where id = ${dispute.id}
    `;
    await sql`update runs set claim_status = 'answered' where id = ${data.id}`;
    return getRun({ data: { id: data.id } });
  });

export type ClaimRow = {
  id: number;
  runId: number;
  store: string;
  kind: string;
  note: string;
  photoUrl: string;
  responseNote: string;
  responsePhotoUrl: string;
  openedByRole: string;
  pickupPhotoUrl: string;
  chargeCents: number;
  runnerCents: number;
  takeCents: number;
  declaredCents: number;
  status: string;
  createdAt: string;
};

export const listOpenClaims = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<ClaimRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      run_id: number;
      store: string;
      kind: string;
      note: string;
      photo_url: string;
      response_note: string;
      response_photo_url: string;
      opened_by_role: string;
      pickup_photo_url: string;
      charge_cents: number;
      runner_cents: number;
      take_cents: number;
      declared_cents: number;
      status: string;
      created_at: string | Date;
    }>`
      select d.id, d.run_id, r.store, d.kind, d.note, d.photo_url, d.response_note, d.response_photo_url,
             d.opened_by_role, r.pickup_photo_url, r.charge_cents, r.runner_cents, r.take_cents,
             r.declared_cents, d.status, d.created_at
      from run_disputes d
      join runs r on r.id = d.run_id
      where d.status in ('open', 'answered')
      order by d.created_at desc
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      runId: Number(row.run_id),
      store: row.store,
      kind: row.kind,
      note: row.note,
      photoUrl: row.photo_url,
      responseNote: row.response_note || "",
      responsePhotoUrl: row.response_photo_url || "",
      openedByRole: row.opened_by_role,
      pickupPhotoUrl: row.pickup_photo_url || "",
      chargeCents: Number(row.charge_cents) || 0,
      runnerCents: Number(row.runner_cents) || 0,
      takeCents: Number(row.take_cents) || 0,
      declaredCents: Number(row.declared_cents) || 0,
      status: row.status,
      createdAt: asIso(row.created_at),
    }));
  });

export const decideClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      claimId: z.number().int().positive(),
      decision: z.enum(["customer_win", "runner_win", "split", "dismissed"]),
      note: z.string().trim().max(400).optional(),
    }),
  )
  .handler(async ({ data }): Promise<void> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      run_id: number;
      status: string;
    }>`
      select id, run_id, status from run_disputes
      where id = ${data.claimId} and status in ('open', 'answered')
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("That dispute is gone.");
    const runs = await sql<RunRow>`select * from runs where id = ${Number(row.run_id)} limit 1`;
    const run = runs[0];
    if (!run) throw new Error("That run is gone.");
    const payments = await sql<{
      id: number;
      amount_cents: number;
      take_cents: number;
      runner_cents: number;
      paypal_capture_id: string | null;
      payout_status: string;
    }>`
      select id, amount_cents, take_cents, runner_cents, paypal_capture_id, payout_status
      from run_payments where run_id = ${Number(run.id)} and status = 'captured' limit 1
    `;
    const payment = payments[0];
    const decisionNote = data.note?.trim() || "";

    if (data.decision === "customer_win") {
      if (payment?.paypal_capture_id) {
        await refundPayPalCapture(payment.paypal_capture_id, Number(payment.amount_cents));
      }
      if (payment) {
        await sql`
          update run_payments
          set status = 'refunded', payout_status = 'skipped'
          where id = ${Number(payment.id)}
        `;
      }
      await sql`update runs set status = 'cancelled', claim_status = 'customer_win' where id = ${Number(run.id)}`;
    } else if (data.decision === "split") {
      if (payment?.paypal_capture_id && Number(payment.take_cents) > 0) {
        await refundPayPalCapture(payment.paypal_capture_id, Number(payment.take_cents));
      }
      await sql`update runs set status = 'delivered', claim_status = 'split' where id = ${Number(run.id)}`;
      if (payment && payment.payout_status !== "sent") {
        await sql`update run_payments set payout_status = 'due' where id = ${Number(payment.id)}`;
        await payoutRunner(Number(run.id));
      }
    } else if (data.decision === "runner_win") {
      await sql`update runs set status = 'delivered', claim_status = 'runner_win' where id = ${Number(run.id)}`;
      if (payment && payment.payout_status !== "sent") {
        await sql`update run_payments set payout_status = 'due' where id = ${Number(payment.id)}`;
        await payoutRunner(Number(run.id));
      }
    } else {
      await sql`update runs set claim_status = 'dismissed' where id = ${Number(run.id)}`;
      if (payment && payment.payout_status === "held") {
        await sql`update run_payments set payout_status = 'due' where id = ${Number(payment.id)}`;
      }
    }

    await sql`
      update run_disputes
      set status = ${data.decision}, decision_note = ${decisionNote}, decided_at = now()
      where id = ${Number(row.id)}
    `;
  });

async function loadDispute(runId: number): Promise<Dispute | null> {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    run_id: number;
    opened_by_id: string;
    opened_by_role: string;
    kind: string;
    note: string;
    photo_url: string;
    response_note: string;
    response_photo_url: string;
    status: string;
    decision_note: string;
    created_at: string | Date;
  }>`
    select id, run_id, opened_by_id, opened_by_role, kind, note, photo_url,
           response_note, response_photo_url, status, decision_note, created_at
    from run_disputes where run_id = ${runId} order by created_at desc limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    runId: Number(row.run_id),
    openedById: row.opened_by_id,
    openedByRole: row.opened_by_role === "runner" ? "runner" : "customer",
    kind: (row.kind as DisputeKind) || "other",
    note: row.note,
    photoUrl: row.photo_url || "",
    responseNote: row.response_note || "",
    responsePhotoUrl: row.response_photo_url || "",
    status: row.status,
    decisionNote: row.decision_note || "",
    createdAt: asIso(row.created_at),
  };
}

async function payoutRunner(runId: number) {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    runner_cents: number;
    payout_status: string;
    runner_paypal_email: string;
    store: string;
    claim_status: string;
  }>`
    select p.id, p.runner_cents, p.payout_status, r.runner_paypal_email, r.store, r.claim_status
    from run_payments p
    join runs r on r.id = p.run_id
    where p.run_id = ${runId} and p.status = 'captured'
    limit 1
  `;
  const payment = rows[0];
  if (!payment) return;
  if (payment.payout_status === "sent") return;
  if (payment.claim_status === "open" || payment.claim_status === "answered") {
    await sql`update run_payments set payout_status = 'held' where id = ${Number(payment.id)}`;
    return;
  }
  const email = (payment.runner_paypal_email || "").trim();
  if (!email) {
    await sql`update run_payments set payout_status = 'due' where id = ${Number(payment.id)}`;
    return;
  }
  const batchId = await payoutToEmail({
    email,
    amountCents: Number(payment.runner_cents),
    claimId: runId,
    note: `Askfare runner share for ${payment.store}`,
  });
  await sql`
    update run_payments set payout_status = 'sent', payout_batch_id = ${batchId}
    where id = ${Number(payment.id)}
  `;
}

export type PlusStatus = {
  active: boolean;
  until: string | null;
};

export const getPlusStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlusStatus> => {
    const sql = await getSql();
    const rows = await sql<{ plus_until: string | Date }>`
      select plus_until from plus_members where user_id = ${context.userId} limit 1
    `;
    const until = rows[0]?.plus_until ? asIso(rows[0].plus_until) : null;
    const active = until ? new Date(until).getTime() > Date.now() : false;
    return { active, until: active ? until : until };
  });

async function extendPlus(userId: string, orderId: string | null) {
  const sql = await getSql();
  const rows = await sql<{ plus_until: string | Date }>`
    select plus_until from plus_members where user_id = ${userId} limit 1
  `;
  const current = rows[0]?.plus_until ? new Date(rows[0].plus_until) : new Date(0);
  const start = current.getTime() > Date.now() ? current : new Date();
  const next = new Date(start.getTime() + PLUS_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    insert into plus_members (user_id, plus_until, last_order_id, updated_at)
    values (${userId}, ${next.toISOString()}, ${orderId}, now())
    on conflict (user_id) do update set
      plus_until = excluded.plus_until,
      last_order_id = excluded.last_order_id,
      updated_at = now()
  `;
  return next.toISOString();
}

export const startPlusCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ orderId: string }> => {
    await requireWaiver(context.userId);
    const creds = await loadPayPalCredentials();
    if (!creds) throw new Error("PayPal is not connected. Install the SDK on The take.");
    const orderId = await createPayPalOrder({
      listingId: Date.now(),
      title: "Askfare Plus — 30 days",
      priceCents: PLUS_PRICE_CENTS,
      items: [{ name: "Askfare Plus (30 days)", amountCents: PLUS_PRICE_CENTS }],
    });
    const sql = await getSql();
    await sql`
      insert into plus_orders (order_id, user_id, status)
      values (${orderId}, ${context.userId}, 'created')
    `;
    return { orderId };
  });

export const capturePlusCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(8).max(80) }))
  .handler(async ({ context, data }): Promise<PlusStatus> => {
    await requireWaiver(context.userId);
    const sql = await getSql();
    const rows = await sql<{ status: string }>`
      select status from plus_orders
      where order_id = ${data.orderId} and user_id = ${context.userId}
      limit 1
    `;
    if (!rows[0]) throw new Error("That Plus payment was not found.");
    if (rows[0].status === "captured") {
      const existing = await sql<{ plus_until: string | Date }>`
        select plus_until from plus_members where user_id = ${context.userId} limit 1
      `;
      const until = existing[0] ? asIso(existing[0].plus_until) : null;
      return { active: until ? new Date(until).getTime() > Date.now() : false, until };
    }
    await capturePayPalOrder(data.orderId);
    await sql`update plus_orders set status = 'captured' where order_id = ${data.orderId}`;
    const until = await extendPlus(context.userId, data.orderId);
    return { active: true, until };
  });

export const previewActivatePlus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlusStatus> => {
    await requireWaiver(context.userId);
    const creds = await loadPayPalCredentials();
    if (creds) throw new Error("PayPal is connected. Pay $9.99 to start Plus.");
    const until = await extendPlus(context.userId, null);
    return { active: true, until };
  });

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
    await savePayPalCredentials({ clientId: data.clientId, secret: data.secret, mode: data.mode });
    return { configured: true, clientId: data.clientId, mode: data.mode };
  });

export const retryCrewPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ haulId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<void> => {
    await payoutRunner(data.haulId);
  });

export const listDuePayouts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<DuePayout[]> => {
    const sql = await getSql();
    const rows = await sql<{
      run_id: number;
      store: string;
      runner_paypal_email: string;
      runner_cents: number;
      take_cents: number;
      payout_status: string;
    }>`
      select p.run_id, r.store, r.runner_paypal_email, p.runner_cents, p.take_cents, p.payout_status
      from run_payments p
      join runs r on r.id = p.run_id
      where p.status = 'captured'
        and r.status = 'delivered'
        and p.payout_status in ('due', 'held', 'none')
      order by p.created_at desc
    `;
    return rows.map((row) => ({
      haulId: Number(row.run_id),
      title: row.store,
      crewEmail: row.runner_paypal_email || "",
      crewCents: Number(row.runner_cents),
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
      run_id: number;
      store: string;
      customer_name: string;
      runner_name: string | null;
      amount_cents: number;
      take_cents: number;
      runner_cents: number;
      protect_fee_cents: number;
      protect_on: boolean;
      created_at: string | Date;
    }>`
      select p.id, p.run_id, r.store, r.customer_name, r.runner_name,
             p.amount_cents, p.take_cents, p.runner_cents, p.created_at,
             r.protect_fee_cents, r.protect_on
      from run_payments p
      join runs r on r.id = p.run_id
      where p.status = 'captured'
      order by p.created_at desc
    `;
    const plusRows = await sql<{ n: number }>`
      select count(*) as n from plus_orders where status = 'captured'
    `;
    const plusCount = Number(plusRows[0]?.n) || 0;
    const plusCents = plusCount * PLUS_PRICE_CENTS;
    const takeCents = rows.reduce((sum, row) => sum + Number(row.take_cents), 0);
    const crewCents = rows.reduce((sum, row) => sum + Number(row.runner_cents), 0);
    return {
      saleCount: rows.length,
      grossCents: rows.reduce((sum, row) => sum + Number(row.amount_cents), 0) + plusCents,
      takeCents,
      protectCents: 0,
      plusCents,
      plusCount,
      crewCents,
      keepCents: takeCents + plusCents,
      rows: rows.map((row) => ({
        id: Number(row.id),
        haulId: Number(row.run_id),
        title: row.store,
        customerName: row.customer_name,
        crewName: row.runner_name || "Unclaimed",
        priceCents: Number(row.amount_cents),
        takeCents: Number(row.take_cents),
        crewCents: Number(row.runner_cents),
        createdAt: asIso(row.created_at),
      })),
    };
  });
