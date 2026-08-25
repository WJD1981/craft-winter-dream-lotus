import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { US_STATES } from "@/lib/us-states";

export type PublicProfile = {
  userId: string;
  displayName: string;
  photoUrl: string;
  age: number;
  city: string;
  region: string;
  about: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePhotoUrl: string;
  plateLast4: string;
  canRun: boolean;
  complete: boolean;
  ratingAvg: number | null;
  reviewCount: number;
  verified: boolean;
  phone?: string;
};

export type MyProfile = PublicProfile & {
  phone: string;
  photoAck: boolean;
  licenseAck: boolean;
};

export type Review = {
  id: number;
  runId: number;
  fromUserId: string;
  fromName: string;
  rating: number;
  communication: number;
  punctual: number;
  care: number;
  note: string;
  createdAt: string;
};

export type DueReview = {
  runId: number;
  store: string;
  otherName: string;
  otherId: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  photo_url: string;
  photo_ack: boolean;
  age: number;
  city: string;
  region: string;
  phone: string;
  about: string;
  license_ack: boolean;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_photo_url: string;
  plate_last4: string;
};

function isComplete(row: ProfileRow | undefined) {
  if (!row) return false;
  return Boolean(
    row.display_name.trim().length >= 2 &&
      row.photo_url &&
      row.photo_ack &&
      Number(row.age) >= 18 &&
      row.city.trim().length >= 2 &&
      row.region &&
      row.phone.trim().length >= 7,
  );
}

function canRun(row: ProfileRow | undefined) {
  if (!isComplete(row) || !row) return false;
  return Boolean(
    row.license_ack &&
      row.vehicle_photo_url &&
      Number(row.vehicle_year) >= 1990 &&
      row.vehicle_make.trim() &&
      row.vehicle_model.trim() &&
      row.vehicle_color.trim(),
  );
}

async function saveUserPhoto(dataUrl: string, kind: string, userId: string) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) return "";
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "user";
  const name = `${kind}-${safe}.jpg`;
  await writeFile(join(dir, name), Buffer.from(match[2], "base64"));
  return `/uploads/${name}?v=${Date.now()}`;
}

async function statsFor(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ avg: number | string | null; n: number | string }>`
    select avg(rating) as avg, count(*) as n from run_reviews where to_user_id = ${userId}
  `;
  const n = Number(rows[0]?.n) || 0;
  const avg = rows[0]?.avg == null ? null : Math.round(Number(rows[0].avg) * 10) / 10;
  return { ratingAvg: n ? avg : null, reviewCount: n };
}

async function verifiedFor(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ status: string }>`
    select status from identity_verifications where user_id = ${userId} limit 1
  `;
  return rows[0]?.status === "verified";
}

function mapPublic(row: ProfileRow, stats: { ratingAvg: number | null; reviewCount: number }, extras: { phone?: string; verified: boolean }): PublicProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    age: Number(row.age) || 0,
    city: row.city,
    region: row.region,
    about: row.about,
    vehicleYear: Number(row.vehicle_year) || 0,
    vehicleMake: row.vehicle_make,
    vehicleModel: row.vehicle_model,
    vehicleColor: row.vehicle_color,
    vehiclePhotoUrl: row.vehicle_photo_url,
    plateLast4: row.plate_last4,
    canRun: canRun(row),
    complete: isComplete(row),
    ratingAvg: stats.ratingAvg,
    reviewCount: stats.reviewCount,
    verified: extras.verified,
    phone: extras.phone,
  };
}

async function loadRow(userId: string) {
  const sql = await getSql();
  const rows = await sql<ProfileRow>`select * from user_profiles where user_id = ${userId} limit 1`;
  return rows[0];
}

export async function requireCompleteProfile(userId: string) {
  const row = await loadRow(userId);
  if (!isComplete(row)) throw new Error("Finish your profile (face photo, age, city) before you post or take a run.");
  if (!(await verifiedFor(userId))) {
    throw new Error("Verify your identity with a government ID and selfie before you post or take a run.");
  }
  return row;
}

export async function requireRunnerFace(userId: string) {
  const row = await requireCompleteProfile(userId);
  if (!canRun(row)) {
    throw new Error("Add your vehicle photo, year, make, model, and a valid driver’s license attestation on your profile before you take a job.");
  }
  return row;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MyProfile> => {
    const row = await loadRow(context.userId);
    const stats = await statsFor(context.userId);
    if (!row) {
      return {
        userId: context.userId,
        displayName: "",
        photoUrl: "",
        age: 0,
        city: "",
        region: "",
        about: "",
        vehicleYear: 0,
        vehicleMake: "",
        vehicleModel: "",
        vehicleColor: "",
        vehiclePhotoUrl: "",
        plateLast4: "",
        canRun: false,
        complete: false,
        ratingAvg: stats.ratingAvg,
        reviewCount: stats.reviewCount,
        phone: "",
        photoAck: false,
        licenseAck: false,
        verified: false,
      };
    }
    return {
      ...mapPublic(row, stats, { phone: row.phone, verified: await verifiedFor(context.userId) }),
      phone: row.phone,
      photoAck: Boolean(row.photo_ack),
      licenseAck: Boolean(row.license_ack),
    };
  });

export const getProfileStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const row = await loadRow(context.userId);
    return { complete: isComplete(row), canRun: canRun(row), verified: await verifiedFor(context.userId) };
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1).max(80), revealPhone: z.boolean().optional() }))
  .handler(async ({ context, data }): Promise<PublicProfile> => {
    const row = await loadRow(data.userId);
    if (!row || !isComplete(row)) throw new Error("That profile is not set up yet.");
    const stats = await statsFor(data.userId);
    let phone: string | undefined;
    if (data.revealPhone && data.userId !== context.userId) {
      const sql = await getSql();
      const shared = await sql<{ id: number }>`
        select id from runs
        where ((customer_id = ${context.userId} and runner_id = ${data.userId})
            or (customer_id = ${data.userId} and runner_id = ${context.userId}))
          and status in ('pending_approval', 'pending_pay', 'locked', 'picked_up', 'delivered')
        limit 1
      `;
      if (shared[0]) phone = row.phone;
    }
    return mapPublic(row, stats, { phone, verified: await verifiedFor(data.userId) });
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().trim().min(2).max(60),
      age: z.number().int().min(18).max(99),
      city: z.string().trim().min(2).max(40),
      region: z.enum(US_STATES),
      phone: z.string().trim().min(7).max(24),
      about: z.string().trim().max(400).optional(),
      photoAck: z.literal(true),
      licenseAck: z.boolean().optional(),
      vehicleYear: z.number().int().min(0).max(2030).optional(),
      vehicleMake: z.string().trim().max(40).optional(),
      vehicleModel: z.string().trim().max(40).optional(),
      vehicleColor: z.string().trim().max(24).optional(),
      plateLast4: z.string().trim().max(8).optional(),
      photoDataUrl: z.string().optional(),
      vehiclePhotoDataUrl: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const existing = await loadRow(context.userId);
    let photoUrl = existing?.photo_url || "";
    if (data.photoDataUrl) photoUrl = await saveUserPhoto(data.photoDataUrl, "face", context.userId);
    if (!photoUrl) throw new Error("Add a clear photo of you, shoulders up, no hat or sunglasses.");
    let vehiclePhotoUrl = existing?.vehicle_photo_url || "";
    if (data.vehiclePhotoDataUrl) {
      vehiclePhotoUrl = await saveUserPhoto(data.vehiclePhotoDataUrl, "car", context.userId);
    }
    const sql = await getSql();
    await sql`
      insert into user_profiles (
        user_id, display_name, photo_url, photo_ack, age, city, region, phone, about,
        license_ack, vehicle_year, vehicle_make, vehicle_model, vehicle_color, vehicle_photo_url, plate_last4, updated_at
      ) values (
        ${context.userId}, ${data.displayName}, ${photoUrl}, true, ${data.age}, ${data.city}, ${data.region},
        ${data.phone}, ${data.about || ""}, ${Boolean(data.licenseAck)}, ${data.vehicleYear || 0},
        ${data.vehicleMake || ""}, ${data.vehicleModel || ""}, ${data.vehicleColor || ""}, ${vehiclePhotoUrl},
        ${data.plateLast4 || ""}, now()
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        photo_url = excluded.photo_url,
        photo_ack = true,
        age = excluded.age,
        city = excluded.city,
        region = excluded.region,
        phone = excluded.phone,
        about = excluded.about,
        license_ack = excluded.license_ack,
        vehicle_year = excluded.vehicle_year,
        vehicle_make = excluded.vehicle_make,
        vehicle_model = excluded.vehicle_model,
        vehicle_color = excluded.vehicle_color,
        vehicle_photo_url = excluded.vehicle_photo_url,
        plate_last4 = excluded.plate_last4,
        updated_at = now()
    `;
    return { ok: true };
  });

export const listReviewsFor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1).max(80) }))
  .handler(async ({ data }): Promise<Review[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      run_id: number;
      from_user_id: string;
      display_name: string;
      rating: number;
      communication: number;
      punctual: number;
      care: number;
      note: string;
      created_at: string | Date;
    }>`
      select r.id, r.run_id, r.from_user_id, coalesce(p.display_name, 'Neighbor') as display_name,
             r.rating, r.communication, r.punctual, r.care, r.note, r.created_at
      from run_reviews r
      left join user_profiles p on p.user_id = r.from_user_id
      where r.to_user_id = ${data.userId}
      order by r.created_at desc
      limit 40
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      runId: Number(row.run_id),
      fromUserId: row.from_user_id,
      fromName: row.display_name,
      rating: Number(row.rating),
      communication: Number(row.communication) || 0,
      punctual: Number(row.punctual) || 0,
      care: Number(row.care) || 0,
      note: row.note,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  });

export const listDueReviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DueReview[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      store: string;
      customer_id: string;
      runner_id: string | null;
      customer_name: string;
      runner_name: string | null;
    }>`
      select r.id, r.store, r.customer_id, r.runner_id, r.customer_name, r.runner_name
      from runs r
      where r.status = 'delivered'
        and (r.customer_id = ${context.userId} or r.runner_id = ${context.userId})
        and not exists (
          select 1 from run_reviews v where v.run_id = r.id and v.from_user_id = ${context.userId}
        )
      order by r.id desc
      limit 20
    `;
    return rows.map((row) => {
      const iAmCustomer = row.customer_id === context.userId;
      return {
        runId: Number(row.id),
        store: row.store,
        otherName: iAmCustomer ? row.runner_name || "Runner" : row.customer_name,
        otherId: (iAmCustomer ? row.runner_id : row.customer_id) || "",
      };
    });
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      runId: z.number().int().positive(),
      rating: z.number().int().min(1).max(5),
      communication: z.number().int().min(1).max(5),
      punctual: z.number().int().min(1).max(5),
      care: z.number().int().min(1).max(5),
      note: z.string().trim().min(8).max(400),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const runs = await sql<{
      customer_id: string;
      runner_id: string | null;
      status: string;
    }>`
      select customer_id, runner_id, status from runs where id = ${data.runId} limit 1
    `;
    const run = runs[0];
    if (!run || run.status !== "delivered") throw new Error("Review after the run is delivered.");
    const iAmCustomer = run.customer_id === context.userId;
    const iAmRunner = run.runner_id === context.userId;
    if (!iAmCustomer && !iAmRunner) throw new Error("Only the poster and runner review this run.");
    const toUser = iAmCustomer ? run.runner_id : run.customer_id;
    if (!toUser) throw new Error("No one to review.");
    await sql`
      insert into run_reviews (
        run_id, from_user_id, to_user_id, rating, communication, punctual, care, note
      ) values (
        ${data.runId}, ${context.userId}, ${toUser}, ${data.rating},
        ${data.communication}, ${data.punctual}, ${data.care}, ${data.note}
      )
      on conflict (run_id, from_user_id) do update set
        rating = excluded.rating,
        communication = excluded.communication,
        punctual = excluded.punctual,
        care = excluded.care,
        note = excluded.note
    `;
    return { ok: true };
  });
