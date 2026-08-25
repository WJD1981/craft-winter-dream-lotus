import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const ID_TYPES = [
  { id: "drivers_license", label: "Driver’s license" },
  { id: "state_id", label: "State ID" },
  { id: "passport", label: "Passport" },
] as const;

export type IdentityStatus = "unverified" | "pending" | "verified" | "rejected";

export type IdentityRecord = {
  userId: string;
  legalName: string;
  dob: string;
  idType: string;
  idIssuer: string;
  idLast4: string;
  idExpires: string;
  idFrontUrl: string;
  selfieUrl: string;
  status: IdentityStatus;
  rejectReason: string;
  submittedAt: string | null;
};

type IdentityRow = {
  user_id: string;
  legal_name: string;
  dob: string | Date | null;
  id_type: string;
  id_issuer: string;
  id_last4: string;
  id_expires: string | Date | null;
  id_front_url: string;
  selfie_url: string;
  status: string;
  reject_reason: string;
  submitted_at: string | Date | null;
};

function asDate(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function ageFromDob(dob: string) {
  const born = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(born.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

async function saveIdPhoto(dataUrl: string, kind: string, userId: string) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) throw new Error("Upload a photograph — not a PDF or screenshot dump.");
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "user";
  const name = `${kind}-${safe}.jpg`;
  await writeFile(join(dir, name), Buffer.from(match[2], "base64"));
  return `/uploads/${name}?v=${Date.now()}`;
}

function mapIdentity(row: IdentityRow): IdentityRecord {
  return {
    userId: row.user_id,
    legalName: row.legal_name,
    dob: asDate(row.dob),
    idType: row.id_type,
    idIssuer: row.id_issuer,
    idLast4: row.id_last4,
    idExpires: asDate(row.id_expires),
    idFrontUrl: row.id_front_url,
    selfieUrl: row.selfie_url,
    status: (row.status as IdentityStatus) || "unverified",
    rejectReason: row.reject_reason || "",
    submittedAt: row.submitted_at
      ? row.submitted_at instanceof Date
        ? row.submitted_at.toISOString()
        : String(row.submitted_at)
      : null,
  };
}

async function loadIdentity(userId: string) {
  const sql = await getSql();
  const rows = await sql<IdentityRow>`select * from identity_verifications where user_id = ${userId} limit 1`;
  return rows[0] ? mapIdentity(rows[0]) : null;
}

export async function isVerified(userId: string) {
  const row = await loadIdentity(userId);
  return row?.status === "verified";
}

export async function requireVerified(userId: string) {
  if (!(await isVerified(userId))) {
    throw new Error("Verify your identity with a government ID and selfie before you post or take a run.");
  }
}

export const getMyIdentity = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<IdentityRecord> => {
    const row = await loadIdentity(context.userId);
    return (
      row ?? {
        userId: context.userId,
        legalName: "",
        dob: "",
        idType: "",
        idIssuer: "",
        idLast4: "",
        idExpires: "",
        idFrontUrl: "",
        selfieUrl: "",
        status: "unverified",
        rejectReason: "",
        submittedAt: null,
      }
    );
  });

export const submitIdentity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      legalName: z.string().trim().min(4).max(80),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      idType: z.enum(["drivers_license", "state_id", "passport"]),
      idIssuer: z.string().trim().min(2).max(40),
      idLast4: z.string().trim().min(4).max(4),
      idExpires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      idFrontDataUrl: z.string().min(40),
      selfieDataUrl: z.string().min(40),
      idAck: z.literal(true),
      selfieAck: z.literal(true),
    }),
  )
  .handler(async ({ context, data }) => {
    const existing = await loadIdentity(context.userId);
    if (existing?.status === "verified") throw new Error("Your identity is already verified.");
    if (!data.legalName.includes(" ")) throw new Error("Use your full legal name as it appears on the ID.");
    const age = ageFromDob(data.dob);
    if (age < 18) throw new Error("You must be 18 or older.");
    if (data.idExpires < new Date().toISOString().slice(0, 10)) throw new Error("That ID is expired.");
    const sql = await getSql();
    const profiles = await sql<{ age: number; display_name: string }>`
      select age, display_name from user_profiles where user_id = ${context.userId} limit 1
    `;
    const profile = profiles[0];
    if (!profile) throw new Error("Finish your profile first.");
    const idFrontUrl = await saveIdPhoto(data.idFrontDataUrl, "id", context.userId);
    const selfieUrl = await saveIdPhoto(data.selfieDataUrl, "selfie", context.userId);
    const ageMatches = Math.abs(Number(profile.age) - age) <= 1;
    const status: IdentityStatus = ageMatches ? "verified" : "pending";
    const reason = ageMatches
      ? ""
      : `Date of birth is age ${age}; profile age is ${profile.age}. Held for review.`;
    await sql`
      insert into identity_verifications (
        user_id, legal_name, dob, id_type, id_issuer, id_last4, id_expires,
        id_front_url, selfie_url, status, reject_reason, submitted_at, decided_at
      ) values (
        ${context.userId}, ${data.legalName}, ${data.dob}::date, ${data.idType}, ${data.idIssuer},
        ${data.idLast4.toUpperCase()}, ${data.idExpires}::date, ${idFrontUrl}, ${selfieUrl},
        ${status}, ${reason}, now(), ${status === "verified" ? new Date().toISOString() : null}
      )
      on conflict (user_id) do update set
        legal_name = excluded.legal_name,
        dob = excluded.dob,
        id_type = excluded.id_type,
        id_issuer = excluded.id_issuer,
        id_last4 = excluded.id_last4,
        id_expires = excluded.id_expires,
        id_front_url = excluded.id_front_url,
        selfie_url = excluded.selfie_url,
        status = excluded.status,
        reject_reason = excluded.reject_reason,
        submitted_at = now(),
        decided_at = excluded.decided_at
    `;
    return { status, reason };
  });

export const listIdentityQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<(IdentityRecord & { displayName: string; photoUrl: string; age: number })[]> => {
    const sql = await getSql();
    const rows = await sql<IdentityRow & { display_name: string; photo_url: string; age: number }>`
      select i.*, coalesce(p.display_name, '') as display_name, coalesce(p.photo_url, '') as photo_url, coalesce(p.age, 0) as age
      from identity_verifications i
      left join user_profiles p on p.user_id = i.user_id
      where i.status in ('pending', 'verified', 'rejected')
      order by case i.status when 'pending' then 0 when 'rejected' then 1 else 2 end, i.submitted_at desc
      limit 40
    `;
    return rows.map((row) => ({
      ...mapIdentity(row),
      displayName: row.display_name,
      photoUrl: row.photo_url,
      age: Number(row.age) || 0,
    }));
  });

export const decideIdentity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      userId: z.string().min(1).max(80),
      accept: z.boolean(),
      reason: z.string().trim().max(240).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const status: IdentityStatus = data.accept ? "verified" : "rejected";
    const reason = data.accept ? "" : data.reason?.trim() || "ID or selfie did not match.";
    const updated = await sql<{ user_id: string }>`
      update identity_verifications
      set status = ${status}, reject_reason = ${reason}, decided_at = now()
      where user_id = ${data.userId} and status in ('pending', 'verified', 'rejected')
      returning user_id
    `;
    if (!updated[0]) throw new Error("No identity file for that person.");
    return { ok: true };
  });
