import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { capturePayPalOrder, createPayPalOrder, loadPayPalCredentials, payoutToEmail } from "@/lib/paypal";

export const PROGRESS = [
  { id: "idle", label: "Assigned" },
  { id: "to_store", label: "Heading to pickup" },
  { id: "at_store", label: "At pickup" },
  { id: "to_door", label: "On the way to you" },
  { id: "at_door", label: "Arrived at drop-off" },
] as const;

export type ProgressId = (typeof PROGRESS)[number]["id"];

export function progressLabel(id: string) {
  return PROGRESS.find((p) => p.id === id)?.label ?? "Assigned";
}

export const REPORT_REASONS = [
  { id: "no_show", label: "No-show" },
  { id: "unsafe", label: "Unsafe or threatening" },
  { id: "harassment", label: "Harassment" },
  { id: "fake_profile", label: "Fake profile or ID" },
  { id: "banned_cargo", label: "Asked to carry banned items" },
  { id: "other", label: "Other" },
] as const;

export async function notify(userId: string, kind: string, title: string, body: string, href: string) {
  if (!userId || userId === "community") return;
  const sql = await getSql();
  await sql`
    insert into notifications (user_id, kind, title, body, href)
    values (${userId}, ${kind}, ${title}, ${body}, ${href})
  `;
}

export function newShareToken() {
  return randomBytes(9).toString("hex");
}

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ runId: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const runs = await sql<{ customer_id: string; runner_id: string | null }>`
      select customer_id, runner_id from runs where id = ${data.runId} limit 1
    `;
    const run = runs[0];
    if (!run || (run.customer_id !== context.userId && run.runner_id !== context.userId)) {
      throw new Error("Chat opens after someone is on the run.");
    }
    const rows = await sql<{ id: number; from_user_id: string; body: string; created_at: string | Date }>`
      select id, from_user_id, body, created_at from run_messages
      where run_id = ${data.runId} order by created_at asc
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      fromUserId: row.from_user_id,
      mine: row.from_user_id === context.userId,
      body: row.body,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ runId: z.number().int().positive(), body: z.string().trim().min(1).max(500) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const runs = await sql<{
      customer_id: string;
      runner_id: string | null;
      store: string;
      status: string;
    }>`
      select customer_id, runner_id, store, status from runs where id = ${data.runId} limit 1
    `;
    const run = runs[0];
    if (!run || run.status === "open" || run.status === "cancelled") throw new Error("Chat opens once a runner is on the job.");
    if (run.customer_id !== context.userId && run.runner_id !== context.userId) throw new Error("Not your run.");
    const other = run.customer_id === context.userId ? run.runner_id : run.customer_id;
    const blocked = other
      ? await sql<{ user_id: string }>`
          select user_id from user_blocks
          where (user_id = ${context.userId} and blocked_id = ${other})
             or (user_id = ${other} and blocked_id = ${context.userId})
          limit 1
        `
      : [];
    if (blocked[0]) throw new Error("Messaging is blocked.");
    await sql`
      insert into run_messages (run_id, from_user_id, body)
      values (${data.runId}, ${context.userId}, ${data.body})
    `;
    if (other) await notify(other, "message", `Message · ${run.store}`, data.body.slice(0, 80), `/job/${data.runId}`);
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      kind: string;
      title: string;
      body: string;
      href: string;
      read: boolean;
      created_at: string | Date;
    }>`
      select id, kind, title, body, href, read, created_at
      from notifications where user_id = ${context.userId}
      order by created_at desc limit 40
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href,
      read: Boolean(row.read),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update notifications set read = true where user_id = ${context.userId} and read = false`;
    return { ok: true };
  });

export const setProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ runId: z.number().int().positive(), progress: z.enum(["to_store", "at_store", "to_door", "at_door"]) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const runs = await sql<{ customer_id: string; store: string }>`
      select customer_id, store from runs
      where id = ${data.runId} and runner_id = ${context.userId}
        and status in ('locked', 'picked_up')
      limit 1
    `;
    if (!runs[0]) throw new Error("Only the runner can update this while the job is live.");
    await sql`update runs set progress = ${data.progress} where id = ${data.runId}`;
    await notify(
      runs[0].customer_id,
      "progress",
      progressLabel(data.progress),
      `${runs[0].store} · tap the run for maps and chat.`,
      `/job/${data.runId}`,
    );
    return { ok: true };
  });

export const reportUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      aboutUserId: z.string().min(1).max(80),
      runId: z.number().int().positive().optional(),
      reason: z.enum(["no_show", "unsafe", "harassment", "fake_profile", "banned_cargo", "other"]),
      note: z.string().trim().min(8).max(400),
    }),
  )
  .handler(async ({ context, data }) => {
    if (data.aboutUserId === context.userId) throw new Error("You cannot report yourself.");
    const sql = await getSql();
    await sql`
      insert into user_reports (from_user_id, about_user_id, run_id, reason, note)
      values (${context.userId}, ${data.aboutUserId}, ${data.runId ?? null}, ${data.reason}, ${data.note})
    `;
    return { ok: true };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ blockedId: z.string().min(1).max(80) }))
  .handler(async ({ context, data }) => {
    if (data.blockedId === context.userId) throw new Error("You cannot block yourself.");
    const sql = await getSql();
    await sql`
      insert into user_blocks (user_id, blocked_id) values (${context.userId}, ${data.blockedId})
      on conflict do nothing
    `;
    return { ok: true };
  });

export const listSavedAddresses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number; label: string; address: string }>`
      select id, label, address from saved_addresses where user_id = ${context.userId} order by id desc limit 8
    `;
    return rows.map((row) => ({ id: Number(row.id), label: row.label, address: row.address }));
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ label: z.string().trim().min(2).max(40), address: z.string().trim().min(8).max(160) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into saved_addresses (user_id, label, address)
      values (${context.userId}, ${data.label}, ${data.address})
    `;
    return { ok: true };
  });

export const getPublicTrack = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(8).max(40) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      store: string;
      pickup_window: string;
      dropoff_address: string;
      status: string;
      progress: string;
      runner_name: string | null;
    }>`
      select id, store, pickup_window, dropoff_address, status, progress, runner_name
      from runs where share_token = ${data.token} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("That trip link is not active.");
    const first = (row.runner_name || "Runner").split(" ")[0];
    return {
      store: row.store,
      pickupWindow: row.pickup_window,
      dropoffAddress: row.dropoff_address,
      status: row.status,
      progress: row.progress || "idle",
      runnerFirst: first,
    };
  });

export const startTipCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ runId: z.number().int().positive(), amountCents: z.number().int().min(100).max(20000) }))
  .handler(async ({ context, data }) => {
    const creds = await loadPayPalCredentials();
    if (!creds) throw new Error("PayPal is not connected.");
    const sql = await getSql();
    const runs = await sql<{ status: string; store: string; runner_id: string | null; tip_status: string }>`
      select status, store, runner_id, tip_status from runs
      where id = ${data.runId} and customer_id = ${context.userId} limit 1
    `;
    const run = runs[0];
    if (!run || run.status !== "delivered") throw new Error("Tip after the run is delivered.");
    if (run.tip_status === "paid") throw new Error("A tip is already on this run.");
    if (!run.runner_id) throw new Error("No runner to tip.");
    const orderId = await createPayPalOrder({
      listingId: data.runId,
      title: `Tip · ${run.store}`,
      priceCents: data.amountCents,
      items: [{ name: "Tip to runner (100%)", amountCents: data.amountCents }],
    });
    await sql`
      insert into run_checkouts (order_id, run_id, user_id, amount_cents, status, kind)
      values (${orderId}, ${data.runId}, ${context.userId}, ${data.amountCents}, 'created', 'tip')
    `;
    return { orderId, amountCents: data.amountCents };
  });

export const captureTipCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(8).max(80) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const checkouts = await sql<{ run_id: number; amount_cents: number; status: string; kind: string }>`
      select run_id, amount_cents, status, kind from run_checkouts
      where order_id = ${data.orderId} and user_id = ${context.userId} limit 1
    `;
    const checkout = checkouts[0];
    if (!checkout || checkout.kind !== "tip") throw new Error("That tip order was not found.");
    if (checkout.status === "captured") throw new Error("Already captured.");
    const captured = await capturePayPalOrder(data.orderId);
    const runs = await sql<{ runner_paypal_email: string; store: string }>`
      select runner_paypal_email, store from runs where id = ${Number(checkout.run_id)} limit 1
    `;
    await sql`
      update runs set tip_cents = ${Number(checkout.amount_cents)}, tip_status = 'paid'
      where id = ${Number(checkout.run_id)}
    `;
    await sql`update run_checkouts set status = 'captured' where order_id = ${data.orderId}`;
    const email = runs[0]?.runner_paypal_email;
    if (email) {
      try {
        await payoutToEmail({
          email,
          amountCents: Number(checkout.amount_cents),
          claimId: Number(checkout.run_id),
          note: `Askfare tip · ${runs[0].store}`,
        });
      } catch {
        /* payout can retry from The take later — tip is captured */
      }
    }
    void captured;
    return { ok: true };
  });

export const listOpenReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      from_user_id: string;
      about_user_id: string;
      run_id: number | null;
      reason: string;
      note: string;
      created_at: string | Date;
    }>`
      select id, from_user_id, about_user_id, run_id, reason, note, created_at
      from user_reports order by created_at desc limit 30
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      fromUserId: row.from_user_id,
      aboutUserId: row.about_user_id,
      runId: row.run_id ? Number(row.run_id) : null,
      reason: row.reason,
      note: row.note,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  });
