import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { DISH_KEYS } from "@/lib/catalog";
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
import { COURSE_VERSION, courseAnswersAreComplete, scoreCourseAnswers } from "@/lib/course";
import { ingredientsAreComplete } from "@/lib/policy";
import { WAIVER_VERSION } from "@/lib/waiver";

export type OfferType = "sale" | "trade" | "donate";
export type ListingStatus = "open" | "claimed" | "gone" | "picked_up" | "cancelled_pickup";
export type ClaimStatus = "pending" | "accepted" | "declined" | "picked_up" | "cancelled_pickup";
export type Category = "meal" | "snack" | "dessert" | "drink";
export type CancelReason = "unsafe" | "undeclared_allergen";

export type Listing = {
  id: number;
  userId: string;
  posterName: string;
  title: string;
  description: string;
  offerType: OfferType;
  priceCents: number | null;
  tradeWant: string | null;
  servings: number;
  allergens: string;
  ingredients: string;
  madeAt: string;
  pickupWindow: string;
  neighborhood: string;
  pickupNotes: string;
  dishKey: string;
  status: ListingStatus;
  glovesUsed: boolean;
  hairnetUsed: boolean;
  thermometerUsed: boolean;
  forNeed: boolean;
  category: Category;
  photoUrl: string;
  homeCookAck: boolean;
  paypalEmail: string;
  createdAt: string;
  isOwner: boolean;
};

export type PaymentSummary = {
  id: number;
  amountCents: number;
  takeCents: number;
  cookCents: number;
  status: "captured" | "refunded";
  brand: string;
  last4: string;
  cardholder: string;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  payoutStatus: string;
  payoutBatchId: string | null;
  cookPaypalEmail: string;
};

export type Claim = {
  id: number;
  listingId: number;
  userId: string;
  claimantName: string;
  message: string;
  status: ClaimStatus;
  createdAt: string;
  isMine: boolean;
  payment: PaymentSummary | null;
  cancelReason: CancelReason | null;
  pickedUpAt: string | null;
};

export type Feedback = {
  id: number;
  listingId: number;
  claimId: number;
  authorUserId: string;
  role: "buyer" | "cook";
  quality: number;
  taste: number;
  freshness: number;
  price: number;
  packaging: number;
  comment: string;
  createdAt: string;
};

export type PendingFeedback = {
  claimId: number;
  listingId: number;
  listingTitle: string;
  role: "buyer" | "cook";
  status: ClaimStatus;
};

export type CookRating = {
  count: number;
  quality: number;
  taste: number;
  freshness: number;
  price: number;
  packaging: number;
  average: number;
};

export type TableTake = {
  id: number;
  listingId: number;
  claimId: number | null;
  priceCents: number;
  takeCents: number;
  cookCents: number;
  listingTitle: string;
  cookName: string;
  claimantName: string;
  createdAt: string;
};

export type TableLedger = {
  saleCount: number;
  grossCents: number;
  takeCents: number;
  cookCents: number;
  rows: TableTake[];
};

export type WaiverStatus = {
  signed: boolean;
  legalName: string | null;
  acceptedAt: string | null;
  version: string;
};

export type CourseStatus = {
  completed: boolean;
  completedAt: string | null;
  version: string;
  score: number | null;
};

type ListingRow = {
  id: number;
  user_id: string;
  poster_name: string;
  title: string;
  description: string;
  offer_type: OfferType;
  price_cents: number | null;
  trade_want: string | null;
  servings: number;
  allergens: string;
  ingredients: string;
  made_at: string;
  pickup_window: string;
  neighborhood: string;
  pickup_notes: string;
  dish_key: string;
  status: ListingStatus;
  gloves_used: boolean;
  hairnet_used: boolean;
  thermometer_used: boolean;
  for_need: boolean;
  category: Category;
  photo_url: string;
  home_cook_ack: boolean;
  paypal_email: string;
  created_at: string | Date;
};

type ClaimRow = {
  id: number;
  listing_id: number;
  user_id: string;
  claimant_name: string;
  message: string;
  status: ClaimStatus;
  created_at: string | Date;
  cancel_reason: string | null;
  picked_up_at: string | Date | null;
};

type PaymentRow = {
  id: number;
  listing_id: number;
  claim_id: number | null;
  payer_user_id: string;
  amount_cents: number;
  take_cents: number;
  cook_cents: number;
  status: "captured" | "refunded";
  brand: string;
  last4: string;
  cardholder: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  payout_status: string;
  payout_batch_id: string | null;
  cook_paypal_email: string;
};

type FeedbackRow = {
  id: number;
  listing_id: number;
  claim_id: number;
  author_user_id: string;
  role: "buyer" | "cook";
  quality: number;
  taste: number;
  freshness: number;
  price: number;
  packaging: number;
  comment: string;
  created_at: string | Date;
};

function asIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapListing(row: ListingRow, userId: string): Listing {
  return {
    id: Number(row.id),
    userId: row.user_id,
    posterName: row.poster_name,
    title: row.title,
    description: row.description,
    offerType: row.offer_type,
    priceCents: row.price_cents == null ? null : Number(row.price_cents),
    tradeWant: row.trade_want,
    servings: Number(row.servings),
    allergens: row.allergens,
    ingredients: row.ingredients,
    madeAt: row.made_at,
    pickupWindow: row.pickup_window,
    neighborhood: row.neighborhood,
    pickupNotes: row.pickup_notes,
    dishKey: row.dish_key,
    status: row.status,
    glovesUsed: Boolean(row.gloves_used),
    hairnetUsed: Boolean(row.hairnet_used),
    thermometerUsed: Boolean(row.thermometer_used),
    forNeed: Boolean(row.for_need),
    category: row.category || "meal",
    photoUrl: row.photo_url || "",
    homeCookAck: Boolean(row.home_cook_ack),
    paypalEmail: row.paypal_email || "",
    createdAt: asIso(row.created_at),
    isOwner: row.user_id === userId,
  };
}

function mapClaim(row: ClaimRow, userId: string, payment: PaymentSummary | null = null): Claim {
  const reason = row.cancel_reason;
  return {
    id: Number(row.id),
    listingId: Number(row.listing_id),
    userId: row.user_id,
    claimantName: row.claimant_name,
    message: row.message,
    status: row.status,
    createdAt: asIso(row.created_at),
    isMine: row.user_id === userId,
    payment,
    cancelReason: reason === "unsafe" || reason === "undeclared_allergen" ? reason : null,
    pickedUpAt: row.picked_up_at ? asIso(row.picked_up_at) : null,
  };
}

function mapPayment(row: PaymentRow): PaymentSummary {
  return {
    id: Number(row.id),
    amountCents: Number(row.amount_cents),
    takeCents: Number(row.take_cents),
    cookCents: Number(row.cook_cents),
    status: row.status,
    brand: row.brand,
    last4: row.last4,
    cardholder: row.cardholder,
    paypalOrderId: row.paypal_order_id,
    paypalCaptureId: row.paypal_capture_id,
    payoutStatus: row.payout_status || "none",
    payoutBatchId: row.payout_batch_id,
    cookPaypalEmail: row.cook_paypal_email || "",
  };
}

function mapFeedback(row: FeedbackRow): Feedback {
  return {
    id: Number(row.id),
    listingId: Number(row.listing_id),
    claimId: Number(row.claim_id),
    authorUserId: row.author_user_id,
    role: row.role,
    quality: Number(row.quality),
    taste: Number(row.taste),
    freshness: Number(row.freshness),
    price: Number(row.price),
    packaging: Number(row.packaging),
    comment: row.comment,
    createdAt: asIso(row.created_at),
  };
}

async function recordSaleTake(
  listing: ListingRow,
  claim: { id: number; claimant_name: string },
) {
  if (listing.offer_type !== "sale" || listing.price_cents == null) return;
  const priceCents = Number(listing.price_cents);
  if (!Number.isFinite(priceCents) || priceCents <= 0) return;
  const { takeCents, cookCents } = splitSale(priceCents);
  const sql = await getSql();
  await sql`
    insert into transactions (
      listing_id, claim_id, offer_type, price_cents, take_cents, cook_cents,
      listing_title, cook_name, claimant_name
    ) values (
      ${Number(listing.id)}, ${Number(claim.id)}, 'sale', ${priceCents},
      ${takeCents}, ${cookCents}, ${listing.title}, ${listing.poster_name},
      ${claim.claimant_name}
    )
    on conflict (listing_id) do nothing
  `;
}

async function paymentsForClaims(claimIds: number[]) {
  const map = new Map<number, PaymentSummary>();
  if (!claimIds.length) return map;
  const sql = await getSql();
  for (const id of claimIds) {
    const rows = await sql<PaymentRow>`
      select * from payments where claim_id = ${id} limit 1
    `;
    if (rows[0]) map.set(id, mapPayment(rows[0]));
  }
  return map;
}

async function refundPaymentsForClaims(claimIds: number[]) {
  if (!claimIds.length) return;
  const sql = await getSql();
  for (const id of claimIds) {
    const rows = await sql<PaymentRow>`
      select * from payments where claim_id = ${id} and status = 'captured' limit 1
    `;
    const payment = rows[0];
    if (payment?.paypal_capture_id) {
      try {
        await refundPayPalCapture(payment.paypal_capture_id, Number(payment.amount_cents));
      } catch (err) {
        throw new Error(
          err instanceof Error
            ? `PayPal refund failed: ${err.message}`
            : "PayPal refund failed.",
        );
      }
    }
    await sql`
      update payments
      set status = 'refunded', payout_status = case
        when payout_status = 'sent' then payout_status
        else 'none'
      end
      where claim_id = ${id} and status = 'captured'
    `;
  }
}

async function payoutCookForClaim(claimId: number) {
  const sql = await getSql();
  const rows = await sql<PaymentRow & { paypal_email: string; title: string }>`
    select p.*, l.paypal_email, l.title
    from payments p
    join listings l on l.id = p.listing_id
    where p.claim_id = ${claimId} and p.status = 'captured'
    limit 1
  `;
  const payment = rows[0];
  if (!payment) return;
  if (payment.payout_status === "sent") return;
  const email = (payment.cook_paypal_email || payment.paypal_email || "").trim();
  if (!email) {
    await sql`
      update payments set payout_status = 'due' where id = ${Number(payment.id)}
    `;
    return;
  }
  const cookCents = Number(payment.cook_cents);
  if (cookCents <= 0) return;
  const batchId = await payoutToEmail({
    email,
    amountCents: cookCents,
    claimId,
    note: `Second Table cook share for "${payment.title}"`,
  });
  await sql`
    update payments
    set payout_status = 'sent',
        payout_batch_id = ${batchId},
        cook_paypal_email = ${email}
    where id = ${Number(payment.id)}
  `;
}

async function saveListingPhoto(dataUrl: string, listingId: number) {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) throw new Error("Upload a photograph of this batch.");
  const buf = Buffer.from(match[2], "base64");
  if (buf.length < 4000) throw new Error("That photo is too small. Take another.");
  if (buf.length > 1_800_000) throw new Error("That photo is too large. Try another shot.");
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `plate-${listingId}.jpg`;
  await writeFile(join(dir, name), buf);
  return `/uploads/${name}`;
}

class WaiverRequiredError extends Error {
  constructor() {
    super("WAIVER_REQUIRED");
    this.name = "WaiverRequiredError";
  }
}

class CourseRequiredError extends Error {
  constructor() {
    super("COURSE_REQUIRED");
    this.name = "CourseRequiredError";
  }
}

class FeedbackRequiredError extends Error {
  constructor() {
    super("Leave required feedback for your last pickup before you offer or claim again.");
    this.name = "FeedbackRequiredError";
  }
}

async function requireCourse(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from course_completions
    where user_id = ${userId} and version = ${COURSE_VERSION}
    limit 1
  `;
  if (!rows.length) throw new CourseRequiredError();
}

async function requireWaiver(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from waivers
    where user_id = ${userId} and version = ${WAIVER_VERSION}
    limit 1
  `;
  if (!rows.length) throw new WaiverRequiredError();
}

async function pendingFeedbackFor(userId: string): Promise<PendingFeedback[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    listing_id: number;
    title: string;
    cook_id: string;
    buyer_id: string;
    status: ClaimStatus;
  }>`
    select c.id, c.listing_id, l.title, l.user_id as cook_id, c.user_id as buyer_id, c.status
    from claims c
    join listings l on l.id = c.listing_id
    where c.status in ('picked_up', 'cancelled_pickup')
      and (l.user_id = ${userId} or c.user_id = ${userId})
  `;
  const pending: PendingFeedback[] = [];
  for (const row of rows) {
    const existing = await sql<{ id: number }>`
      select id from feedback
      where claim_id = ${Number(row.id)} and author_user_id = ${userId}
      limit 1
    `;
    if (existing.length) continue;
    pending.push({
      claimId: Number(row.id),
      listingId: Number(row.listing_id),
      listingTitle: row.title,
      role: row.cook_id === userId ? "cook" : "buyer",
      status: row.status,
    });
  }
  return pending;
}

async function requireReady(userId: string) {
  await requireCourse(userId);
  await requireWaiver(userId);
}

async function requireClearFeedback(userId: string) {
  const pending = await pendingFeedbackFor(userId);
  if (pending.length) throw new FeedbackRequiredError();
}

async function cookRatingFor(userId: string): Promise<CookRating> {
  const sql = await getSql();
  const rows = await sql<{
    quality: number;
    taste: number;
    freshness: number;
    price: number;
    packaging: number;
  }>`
    select f.quality, f.taste, f.freshness, f.price, f.packaging
    from feedback f
    join listings l on l.id = f.listing_id
    where l.user_id = ${userId} and f.role = 'buyer'
  `;
  const count = rows.length;
  const avg = (key: "quality" | "taste" | "freshness" | "price" | "packaging") =>
    count ? rows.reduce((sum, row) => sum + Number(row[key]), 0) / count : 0;
  const quality = avg("quality");
  const taste = avg("taste");
  const freshness = avg("freshness");
  const price = avg("price");
  const packaging = avg("packaging");
  return {
    count,
    quality,
    taste,
    freshness,
    price,
    packaging,
    average: count ? (quality + taste + freshness + price + packaging) / 5 : 0,
  };
}

export const getWaiverStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WaiverStatus> => {
    const sql = await getSql();
    const rows = await sql<{
      legal_name: string;
      accepted_at: string | Date;
      version: string;
    }>`
      select legal_name, accepted_at, version
      from waivers
      where user_id = ${context.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row || row.version !== WAIVER_VERSION) {
      return { signed: false, legalName: null, acceptedAt: null, version: WAIVER_VERSION };
    }
    return {
      signed: true,
      legalName: row.legal_name,
      acceptedAt: asIso(row.accepted_at),
      version: row.version,
    };
  });

const signWaiverSchema = z.object({
  legalName: z.string().trim().min(2).max(80),
  allergyAck: z.literal(true),
  poisoningAck: z.literal(true),
  homemadeAck: z.literal(true),
  glovesAck: z.literal(true),
  hairnetAck: z.literal(true),
  thermometerAck: z.literal(true),
  sueAck: z.literal(true),
  ageAck: z.literal(true),
});

export const signWaiver = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(signWaiverSchema)
  .handler(async ({ context, data }): Promise<WaiverStatus> => {
    await requireCourse(context.userId);
    const sql = await getSql();
    await sql`
      insert into waivers (
        user_id, legal_name, version, allergy_ack, poisoning_ack,
        homemade_ack, gloves_ack, hairnet_ack, thermometer_ack, sue_ack, age_ack
      ) values (
        ${context.userId}, ${data.legalName}, ${WAIVER_VERSION},
        ${true}, ${true}, ${true}, ${true}, ${true}, ${true}, ${true}, ${true}
      )
      on conflict (user_id) do update set
        legal_name = excluded.legal_name,
        version = excluded.version,
        allergy_ack = excluded.allergy_ack,
        poisoning_ack = excluded.poisoning_ack,
        homemade_ack = excluded.homemade_ack,
        gloves_ack = excluded.gloves_ack,
        hairnet_ack = excluded.hairnet_ack,
        thermometer_ack = excluded.thermometer_ack,
        sue_ack = excluded.sue_ack,
        age_ack = excluded.age_ack,
        accepted_at = now()
    `;
    return {
      signed: true,
      legalName: data.legalName,
      acceptedAt: new Date().toISOString(),
      version: WAIVER_VERSION,
    };
  });

export const getCourseStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CourseStatus> => {
    const sql = await getSql();
    const rows = await sql<{
      completed_at: string | Date;
      version: string;
      score: number;
    }>`
      select completed_at, version, score
      from course_completions
      where user_id = ${context.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row || row.version !== COURSE_VERSION) {
      return { completed: false, completedAt: null, version: COURSE_VERSION, score: null };
    }
    return {
      completed: true,
      completedAt: asIso(row.completed_at),
      version: row.version,
      score: Number(row.score),
    };
  });

export const completeCourse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ answers: z.record(z.string(), z.string()) }))
  .handler(async ({ context, data }): Promise<CourseStatus> => {
    if (!courseAnswersAreComplete(data.answers)) {
      throw new Error("Every question must be answered correctly.");
    }
    const score = scoreCourseAnswers(data.answers);
    const sql = await getSql();
    await sql`
      insert into course_completions (user_id, version, score)
      values (${context.userId}, ${COURSE_VERSION}, ${score})
      on conflict (user_id) do update set
        version = excluded.version,
        score = excluded.score,
        completed_at = now()
    `;
    return {
      completed: true,
      completedAt: new Date().toISOString(),
      version: COURSE_VERSION,
      score,
    };
  });

const listSchema = z.object({
  offerType: z.enum(["all", "sale", "trade", "donate"]).optional(),
  neighborhood: z.string().optional(),
  category: z.enum(["all", "meal", "snack", "dessert", "drink"]).optional(),
});

export const listListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(listSchema)
  .handler(async ({ context, data }): Promise<Listing[]> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const offerType = data.offerType && data.offerType !== "all" ? data.offerType : null;
    const neighborhood = data.neighborhood && data.neighborhood !== "all" ? data.neighborhood : null;
    const category = data.category && data.category !== "all" ? data.category : null;
    const rows = await sql<ListingRow>`
      select * from listings
      where status = 'open'
        and (${offerType}::text is null or offer_type = ${offerType})
        and (${neighborhood}::text is null or neighborhood = ${neighborhood})
        and (${category}::text is null or category = ${category})
      order by for_need desc, created_at desc
    `;
    return rows.map((row) => mapListing(row, context.userId));
  });

export const getListing = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({
    context,
    data,
  }): Promise<{ listing: Listing; claims: Claim[]; feedback: Feedback[]; cookRating: CookRating } | null> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<ListingRow>`
      select * from listings where id = ${data.id} limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    const listing = mapListing(row, context.userId);
    const claimRows = listing.isOwner
      ? await sql<ClaimRow>`
          select * from claims where listing_id = ${data.id} order by created_at desc
        `
      : await sql<ClaimRow>`
          select * from claims
          where listing_id = ${data.id} and user_id = ${context.userId}
          order by created_at desc
        `;
    const payMap = await paymentsForClaims(claimRows.map((c) => Number(c.id)));
    const feedbackRows = await sql<FeedbackRow>`
      select * from feedback where listing_id = ${data.id} order by created_at desc
    `;
    return {
      listing,
      claims: claimRows.map((c) => mapClaim(c, context.userId, payMap.get(Number(c.id)) ?? null)),
      feedback: feedbackRows.map(mapFeedback),
      cookRating: await cookRatingFor(listing.userId),
    };
  });

const createListingSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(800),
  offerType: z.enum(["sale", "trade", "donate"]),
  priceCents: z.number().int().min(100).max(50000).nullable(),
  tradeWant: z.string().trim().max(120).nullable(),
  servings: z.number().int().min(1).max(24),
  allergens: z.string().trim().min(3).max(240),
  ingredients: z.string().trim().min(10).max(600),
  madeAt: z.string().trim().min(2).max(80),
  pickupWindow: z.string().trim().min(2).max(80),
  neighborhood: z.enum([
    "Downtown",
    "Eastside",
    "West End",
    "Riverside",
    "Midtown",
    "North Hill",
    "The Flats",
  ]),
  pickupNotes: z.string().trim().max(240),
  dishKey: z.enum(DISH_KEYS),
  posterName: z.string().trim().min(2).max(60),
  glovesUsed: z.literal(true),
  hairnetUsed: z.literal(true),
  thermometerUsed: z.literal(true),
  forNeed: z.boolean(),
  category: z.enum(["meal", "snack", "dessert", "drink"]),
  photoDataUrl: z.string().min(40),
  homeCookAck: z.literal(true),
  paypalEmail: z.string().trim().email().max(120).or(z.literal("")),
});

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createListingSchema)
  .handler(async ({ context, data }): Promise<Listing> => {
    await requireReady(context.userId);
    await requireClearFeedback(context.userId);
    if (data.offerType === "sale" && data.priceCents == null) {
      throw new Error("Set a price for a sale.");
    }
    if (data.offerType === "sale" && !data.paypalEmail) {
      throw new Error("Add the PayPal email where you want your 80% sent.");
    }
    if (data.offerType === "trade" && !data.tradeWant) {
      throw new Error("Say what you would like in trade.");
    }
    if (!ingredientsAreComplete(data.ingredients)) {
      throw new Error("List every ingredient, separated by commas — at least three.");
    }
    if (data.category === "drink" && /alcohol|wine|beer|vodka|whiskey|cocktail|liqueur/i.test(`${data.title} ${data.ingredients} ${data.description}`)) {
      throw new Error("Drinks on Second Table must be non-alcoholic.");
    }
    const forNeed = data.offerType === "donate" && data.forNeed;
    const sql = await getSql();
    if (data.paypalEmail) {
      await sql`
        insert into user_profiles (user_id, paypal_email, updated_at)
        values (${context.userId}, ${data.paypalEmail}, now())
        on conflict (user_id) do update set
          paypal_email = excluded.paypal_email,
          updated_at = now()
      `;
    }
    const rows = await sql<ListingRow>`
      insert into listings (
        user_id, poster_name, title, description, offer_type, price_cents,
        trade_want, servings, allergens, ingredients, made_at, pickup_window,
        neighborhood, pickup_notes, dish_key, status,
        gloves_used, hairnet_used, thermometer_used, for_need,
        category, photo_url, home_cook_ack, paypal_email
      ) values (
        ${context.userId}, ${data.posterName}, ${data.title}, ${data.description},
        ${data.offerType}, ${data.offerType === "sale" ? data.priceCents : null},
        ${data.offerType === "trade" ? data.tradeWant : null}, ${data.servings},
        ${data.allergens}, ${data.ingredients}, ${data.madeAt}, ${data.pickupWindow},
        ${data.neighborhood}, ${data.pickupNotes}, ${data.dishKey}, 'open',
        ${true}, ${true}, ${true}, ${forNeed},
        ${data.category}, '', ${true}, ${data.offerType === "sale" ? data.paypalEmail : ""}
      )
      returning *
    `;
    const photoUrl = await saveListingPhoto(data.photoDataUrl, Number(rows[0].id));
    const updated = await sql<ListingRow>`
      update listings set photo_url = ${photoUrl} where id = ${Number(rows[0].id)}
      returning *
    `;
    return mapListing(updated[0] ?? rows[0], context.userId);
  });

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Listing[]> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<ListingRow>`
      select * from listings
      where user_id = ${context.userId}
      order by created_at desc
    `;
    return rows.map((row) => mapListing(row, context.userId));
  });

export const listMyClaims = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<(Claim & { listingTitle: string; listingStatus: ListingStatus })[]> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<ClaimRow & { listing_title: string; listing_status: ListingStatus }>`
      select c.*, l.title as listing_title, l.status as listing_status
      from claims c
      join listings l on l.id = c.listing_id
      where c.user_id = ${context.userId}
      order by c.created_at desc
    `;
    const payMap = await paymentsForClaims(rows.map((row) => Number(row.id)));
    return rows.map((row) => ({
      ...mapClaim(row, context.userId, payMap.get(Number(row.id)) ?? null),
      listingTitle: row.listing_title,
      listingStatus: row.listing_status,
    }));
  });

export const markListingGone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireReady(context.userId);
    const sql = await getSql();
    await sql`
      update listings
      set status = 'gone'
      where id = ${data.id} and user_id = ${context.userId} and status = 'open'
    `;
  });

const claimSchema = z.object({
  listingId: z.number().int().positive(),
  message: z.string().trim().min(4).max(400),
  claimantName: z.string().trim().min(2).max(60),
  glovesAck: z.literal(true),
  hairnetAck: z.literal(true),
  thermometerAck: z.literal(true),
  inspectAck: z.literal(true),
});

export const createClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(claimSchema)
  .handler(async ({ context, data }): Promise<Claim> => {
    await requireReady(context.userId);
    await requireClearFeedback(context.userId);
    const sql = await getSql();
    const listings = await sql<ListingRow>`
      select * from listings where id = ${data.listingId} limit 1
    `;
    const listing = listings[0];
    if (!listing) throw new Error("That plate is gone.");
    if (listing.user_id === context.userId) {
      throw new Error("You cannot claim your own plate.");
    }
    if (listing.status !== "open") {
      throw new Error("Someone already claimed this plate.");
    }
    const existing = await sql<{ id: number }>`
      select id from claims
      where listing_id = ${data.listingId} and user_id = ${context.userId}
      limit 1
    `;
    if (existing.length) throw new Error("You already asked for this plate.");

    if (listing.offer_type === "sale") {
      throw new Error("Priced plates are paid with PayPal. Use Pay with PayPal on this plate.");
    }

    const autoAccept = listing.user_id === "community";
    const status: ClaimStatus = autoAccept ? "accepted" : "pending";
    const rows = await sql<ClaimRow>`
      insert into claims (
        listing_id, user_id, claimant_name, message, status,
        gloves_ack, hairnet_ack, thermometer_ack
      )
      values (
        ${data.listingId}, ${context.userId}, ${data.claimantName}, ${data.message}, ${status},
        ${true}, ${true}, ${true}
      )
      returning *
    `;
    const claim = rows[0];
    if (autoAccept) {
      await sql`
        update listings set status = 'claimed' where id = ${data.listingId} and status = 'open'
      `;
      await recordSaleTake(listing, claim);
    }
    const payMap = await paymentsForClaims([Number(claim.id)]);
    return mapClaim(claim, context.userId, payMap.get(Number(claim.id)) ?? null);
  });

export const respondToClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      claimId: z.number().int().positive(),
      decision: z.enum(["accepted", "declined"]),
    }),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      listing_id: number;
      claimant_name: string;
    }>`
      select c.id, c.listing_id, c.claimant_name
      from claims c
      join listings l on l.id = c.listing_id
      where c.id = ${data.claimId}
        and l.user_id = ${context.userId}
        and c.status = 'pending'
      limit 1
    `;
    const claim = rows[0];
    if (!claim) throw new Error("That request is no longer open.");
    await sql`
      update claims set status = ${data.decision} where id = ${claim.id}
    `;
    if (data.decision === "accepted") {
      await sql`
        update listings set status = 'claimed' where id = ${claim.listing_id} and user_id = ${context.userId}
      `;
      const declined = await sql<{ id: number }>`
        update claims set status = 'declined'
        where listing_id = ${claim.listing_id} and id <> ${claim.id} and status = 'pending'
        returning id
      `;
      await refundPaymentsForClaims(declined.map((row) => Number(row.id)));
      const listings = await sql<ListingRow>`
        select * from listings where id = ${claim.listing_id} limit 1
      `;
      if (listings[0]) await recordSaleTake(listings[0], claim);
    } else {
      await refundPaymentsForClaims([claim.id]);
    }
  });

export const confirmPickup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ claimId: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      listing_id: number;
      buyer_id: string;
      cook_id: string;
    }>`
      select c.id, c.listing_id, c.user_id as buyer_id, l.user_id as cook_id
      from claims c
      join listings l on l.id = c.listing_id
      where c.id = ${data.claimId}
        and c.status = 'accepted'
        and (c.user_id = ${context.userId} or l.user_id = ${context.userId})
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("That pickup is not waiting on you.");
    await sql`
      update claims
      set status = 'picked_up', picked_up_at = now(), cancel_reason = null
      where id = ${row.id}
    `;
    await sql`
      update listings set status = 'picked_up' where id = ${row.listing_id}
    `;
    try {
      await payoutCookForClaim(row.id);
    } catch (err) {
      const sql2 = await getSql();
      await sql2`
        update payments set payout_status = 'due' where claim_id = ${row.id} and status = 'captured'
      `;
      throw new Error(
        err instanceof Error
          ? `Pickup is confirmed, but the cook payout needs a retry: ${err.message}`
          : "Pickup is confirmed, but the cook payout needs a retry on The take.",
      );
    }
  });

export const cancelAtPickup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      claimId: z.number().int().positive(),
      reason: z.enum(["unsafe", "undeclared_allergen"]),
    }),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: number; listing_id: number }>`
      select c.id, c.listing_id
      from claims c
      join listings l on l.id = c.listing_id
      where c.id = ${data.claimId}
        and c.status = 'accepted'
        and c.user_id = ${context.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Only the buyer can cancel at the door, and only before they take the food.");
    await sql`
      update claims
      set status = 'cancelled_pickup', cancel_reason = ${data.reason}, picked_up_at = now()
      where id = ${row.id}
    `;
    await sql`
      update listings set status = 'cancelled_pickup' where id = ${row.listing_id}
    `;
    await refundPaymentsForClaims([row.id]);
  });

const rating = z.number().int().min(1).max(5);

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      claimId: z.number().int().positive(),
      quality: rating,
      taste: rating,
      freshness: rating,
      price: rating,
      packaging: rating,
      comment: z.string().trim().max(400),
    }),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      listing_id: number;
      buyer_id: string;
      cook_id: string;
      status: ClaimStatus;
    }>`
      select c.id, c.listing_id, c.user_id as buyer_id, l.user_id as cook_id, c.status
      from claims c
      join listings l on l.id = c.listing_id
      where c.id = ${data.claimId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("That handoff was not found.");
    if (row.status !== "picked_up" && row.status !== "cancelled_pickup") {
      throw new Error("Feedback opens after pickup is confirmed or cancelled at the door.");
    }
    const isCook = row.cook_id === context.userId;
    const isBuyer = row.buyer_id === context.userId;
    if (!isCook && !isBuyer) throw new Error("Only the cook and the buyer leave feedback.");
    await sql`
      insert into feedback (
        listing_id, claim_id, author_user_id, role,
        quality, taste, freshness, price, packaging, comment
      ) values (
        ${Number(row.listing_id)}, ${Number(row.id)}, ${context.userId},
        ${isCook ? "cook" : "buyer"},
        ${data.quality}, ${data.taste}, ${data.freshness}, ${data.price}, ${data.packaging},
        ${data.comment}
      )
      on conflict (claim_id, author_user_id) do update set
        quality = excluded.quality,
        taste = excluded.taste,
        freshness = excluded.freshness,
        price = excluded.price,
        packaging = excluded.packaging,
        comment = excluded.comment
    `;
  });

export const listPendingFeedback = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PendingFeedback[]> => {
    await requireReady(context.userId);
    return pendingFeedbackFor(context.userId);
  });

export type PayPalPublicConfig = {
  configured: boolean;
  clientId: string;
  mode: PayPalMode;
};

export const getPayPalPublicConfig = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PayPalPublicConfig> => {
    await requireReady(context.userId);
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
  .handler(async ({ context, data }): Promise<PayPalPublicConfig> => {
    await requireReady(context.userId);
    await savePayPalCredentials({
      clientId: data.clientId,
      secret: data.secret,
      mode: data.mode,
    });
    return { configured: true, clientId: data.clientId, mode: data.mode };
  });

export const getMyPaypalEmail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<string> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<{ paypal_email: string }>`
      select paypal_email from user_profiles where user_id = ${context.userId} limit 1
    `;
    return rows[0]?.paypal_email ?? "";
  });

const checkoutSchema = z.object({
  listingId: z.number().int().positive(),
  message: z.string().trim().min(4).max(400),
  claimantName: z.string().trim().min(2).max(60),
  glovesAck: z.literal(true),
  hairnetAck: z.literal(true),
  thermometerAck: z.literal(true),
  inspectAck: z.literal(true),
});

export const startPayPalCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(checkoutSchema)
  .handler(async ({ context, data }): Promise<{ orderId: string }> => {
    await requireReady(context.userId);
    await requireClearFeedback(context.userId);
    const creds = await loadPayPalCredentials();
    if (!creds) throw new Error("PayPal is not connected. The table owner must add credentials on The take.");
    const sql = await getSql();
    const listings = await sql<ListingRow>`
      select * from listings where id = ${data.listingId} limit 1
    `;
    const listing = listings[0];
    if (!listing) throw new Error("That plate is gone.");
    if (listing.user_id === context.userId) throw new Error("You cannot claim your own plate.");
    if (listing.status !== "open") throw new Error("Someone already claimed this plate.");
    if (listing.offer_type !== "sale" || listing.price_cents == null) {
      throw new Error("This plate is not a PayPal sale.");
    }
    const existing = await sql<{ id: number }>`
      select id from claims
      where listing_id = ${data.listingId} and user_id = ${context.userId}
      limit 1
    `;
    if (existing.length) throw new Error("You already asked for this plate.");
    const orderId = await createPayPalOrder({
      listingId: Number(listing.id),
      title: listing.title,
      priceCents: Number(listing.price_cents),
    });
    await sql`
      insert into paypal_checkouts (order_id, listing_id, user_id, claimant_name, message, status)
      values (${orderId}, ${Number(listing.id)}, ${context.userId}, ${data.claimantName}, ${data.message}, 'created')
    `;
    return { orderId };
  });

export const capturePayPalCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(8).max(80) }))
  .handler(async ({ context, data }): Promise<Claim> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const checkouts = await sql<{
      order_id: string;
      listing_id: number;
      user_id: string;
      claimant_name: string;
      message: string;
      status: string;
    }>`
      select * from paypal_checkouts
      where order_id = ${data.orderId} and user_id = ${context.userId}
      limit 1
    `;
    const checkout = checkouts[0];
    if (!checkout) throw new Error("That PayPal order was not found.");
    if (checkout.status === "captured") {
      throw new Error("That PayPal payment was already captured.");
    }
    const listings = await sql<ListingRow>`
      select * from listings where id = ${Number(checkout.listing_id)} limit 1
    `;
    const listing = listings[0];
    if (!listing || listing.status !== "open") {
      throw new Error("That plate is no longer open. PayPal will need a refund from The take if you were charged.");
    }
    const captured = await capturePayPalOrder(data.orderId);
    const autoAccept = listing.user_id === "community";
    const status: ClaimStatus = autoAccept ? "accepted" : "pending";
    const rows = await sql<ClaimRow>`
      insert into claims (
        listing_id, user_id, claimant_name, message, status,
        gloves_ack, hairnet_ack, thermometer_ack
      )
      values (
        ${Number(listing.id)}, ${context.userId}, ${checkout.claimant_name}, ${checkout.message}, ${status},
        ${true}, ${true}, ${true}
      )
      returning *
    `;
    const claim = rows[0];
    const split = splitSale(Number(listing.price_cents ?? 0));
    await sql`
      insert into payments (
        listing_id, claim_id, payer_user_id, amount_cents, take_cents, cook_cents,
        status, brand, last4, cardholder,
        paypal_order_id, paypal_capture_id, payout_status, cook_paypal_email
      ) values (
        ${Number(listing.id)}, ${Number(claim.id)}, ${context.userId},
        ${split.priceCents}, ${split.takeCents}, ${split.cookCents},
        'captured', 'paypal', 'pp', 'PayPal',
        ${captured.orderId}, ${captured.captureId}, 'held', ${listing.paypal_email || ""}
      )
    `;
    await sql`
      update paypal_checkouts set status = 'captured' where order_id = ${data.orderId}
    `;
    if (autoAccept) {
      await sql`
        update listings set status = 'claimed' where id = ${Number(listing.id)} and status = 'open'
      `;
      await recordSaleTake(listing, claim);
    }
    const payMap = await paymentsForClaims([Number(claim.id)]);
    return mapClaim(claim, context.userId, payMap.get(Number(claim.id)) ?? null);
  });

export const retryCookPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ claimId: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<void> => {
    await requireReady(context.userId);
    await payoutCookForClaim(data.claimId);
  });

export type DuePayout = {
  claimId: number;
  listingId: number;
  listingTitle: string;
  cookEmail: string;
  cookCents: number;
  takeCents: number;
  payoutStatus: string;
};

export const listDuePayouts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DuePayout[]> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      claim_id: number;
      listing_id: number;
      title: string;
      cook_paypal_email: string;
      paypal_email: string;
      cook_cents: number;
      take_cents: number;
      payout_status: string;
    }>`
      select p.claim_id, p.listing_id, l.title, p.cook_paypal_email, l.paypal_email,
             p.cook_cents, p.take_cents, p.payout_status
      from payments p
      join listings l on l.id = p.listing_id
      join claims c on c.id = p.claim_id
      where p.status = 'captured'
        and c.status = 'picked_up'
        and p.payout_status in ('due', 'held', 'none')
      order by p.created_at desc
    `;
    return rows.map((row) => ({
      claimId: Number(row.claim_id),
      listingId: Number(row.listing_id),
      listingTitle: row.title,
      cookEmail: row.cook_paypal_email || row.paypal_email || "",
      cookCents: Number(row.cook_cents),
      takeCents: Number(row.take_cents),
      payoutStatus: row.payout_status,
    }));
  });

export const getTableLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TableLedger> => {
    await requireReady(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      listing_id: number;
      claim_id: number | null;
      price_cents: number;
      take_cents: number;
      cook_cents: number;
      listing_title: string;
      cook_name: string;
      claimant_name: string;
      created_at: string | Date;
    }>`
      select * from transactions
      order by created_at desc
    `;
    const mapped: TableTake[] = rows.map((row) => ({
      id: Number(row.id),
      listingId: Number(row.listing_id),
      claimId: row.claim_id == null ? null : Number(row.claim_id),
      priceCents: Number(row.price_cents),
      takeCents: Number(row.take_cents),
      cookCents: Number(row.cook_cents),
      listingTitle: row.listing_title,
      cookName: row.cook_name,
      claimantName: row.claimant_name,
      createdAt: asIso(row.created_at),
    }));
    return {
      saleCount: mapped.length,
      grossCents: mapped.reduce((sum, row) => sum + row.priceCents, 0),
      takeCents: mapped.reduce((sum, row) => sum + row.takeCents, 0),
      cookCents: mapped.reduce((sum, row) => sum + row.cookCents, 0),
      rows: mapped,
    };
  });
