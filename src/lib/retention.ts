import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const RETENTION_TITLE = "Data Retention Policy";
export const RETENTION_VERSION = "1.0";
export const RETENTION_EFFECTIVE = "August 24, 2026";

export const RETENTION_INTRO =
  "Askfare keeps only what it needs to run the board, pay people, settle disputes, verify identity, and meet tax and bookkeeping rules. We do not sell personal data. This policy is part of the Askfare release you sign.";

export const RETENTION_SECTIONS = [
  {
    heading: "What we collect",
    body: "Account email; profile (name, face photo, age, city, state, phone, about, vehicle photo and description); identity file (government ID image, live selfie, legal name, date of birth, ID type, issuer, last four of the document, expiration); waiver signature; runs and counters; pickup and dispute photos; reviews; courier insurance image and policy details; PayPal capture and payout identifiers; Askfare Plus charges. We do not store a full ID number or a Social Security number.",
  },
  {
    heading: "While your account is open",
    body: "Profile, vehicle, insurance, and a verified identity file stay on file so posters can approve runners and so we can pay you. Reviews stay on the profile they were written about. Run history stays available to you and the other party on that run.",
  },
  {
    heading: "Identity files",
    body: "ID images and selfies are private. Only you and Askfare’s operator can open them. We keep a verified identity file while the account is open, and for 12 months after the account is closed or the badge is revoked — then we delete the images. Last four of the document and date of birth may be kept with payment records if a tax or fraud question is open. We never put ID photos on a public profile.",
  },
  {
    heading: "Runs, photos, and disputes",
    body: "Pickup photos, drop-off notes, and dispute files are kept for 3 years after the run ends. If a dispute, chargeback, or insurance claim is still open, we keep them until 12 months after that matter closes.",
  },
  {
    heading: "Payments and the take",
    body: "PayPal checkout, payouts, Plus charges, and the ledger of the 20% (or 5%) take are kept for 7 years. That is ordinary tax and bookkeeping retention. PayPal also keeps its own records under PayPal’s policy. Askfare cannot delete a completed PayPal capture from PayPal’s systems.",
  },
  {
    heading: "Waiver and legal name",
    body: "The signed release, including the legal name you typed, is kept for 7 years after your last use of Askfare. That is the contract record.",
  },
  {
    heading: "Reviews",
    body: "Reviews stay on the other person’s profile while both accounts are open. After you close your account we keep the rating and the text for 3 years, with your name reduced to first name and last initial.",
  },
  {
    heading: "Insurance",
    body: "Courier insurance images and policy numbers are kept while you take jobs, and for 12 months after your last delivered run.",
  },
  {
    heading: "Logs",
    body: "Technical logs (sign-in, errors, security) are kept 90 days unless we need them longer for a security incident or an open dispute.",
  },
  {
    heading: "After you leave",
    body: "Close the account, or stay inactive for 24 months, and we delete or anonymize profile and vehicle photos within 90 days, except the categories above that have a longer legal or safety period. Identity images follow the 12-month identity rule. You can ask us to start that clock sooner.",
  },
  {
    heading: "How to ask",
    body: "To request deletion or a copy of what we hold, use the request on your Profile. We will act within 30 days on what the law allows us to delete. We may keep payment, waiver, and dispute records for the periods in this policy even after a deletion request.",
  },
] as const;

export const requestRetention = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ kind: z.enum(["copy", "delete"]), note: z.string().trim().max(400).optional() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into retention_requests (user_id, kind, note, status)
      values (${context.userId}, ${data.kind}, ${data.note || ""}, 'open')
    `;
    return { ok: true };
  });

export const listRetentionRequests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      user_id: string;
      kind: string;
      note: string;
      status: string;
      created_at: string | Date;
    }>`
      select id, user_id, kind, note, status, created_at
      from retention_requests
      where status = 'open'
      order by created_at desc
      limit 40
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      userId: row.user_id,
      kind: row.kind,
      note: row.note,
      status: row.status,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  });
