import { getSql } from "@/lib/db";
import { formatCents } from "@/lib/fees";

export type PayPalMode = "sandbox" | "live";

type Credentials = {
  clientId: string;
  secret: string;
  mode: PayPalMode;
};

let tokenCache: { token: string; expiresAt: number; key: string } | null = null;

function apiBase(mode: PayPalMode) {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function paypalAmount(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

export async function loadPayPalCredentials(): Promise<Credentials | null> {
  const envId = process.env.PAYPAL_CLIENT_ID?.trim();
  const envSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const envMode = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
  if (envId && envSecret) {
    return { clientId: envId, secret: envSecret, mode: envMode };
  }
  const sql = await getSql();
  const rows = await sql<{
    paypal_client_id: string;
    paypal_secret: string;
    paypal_mode: string;
  }>`
    select paypal_client_id, paypal_secret, paypal_mode from platform_settings where id = 1 limit 1
  `;
  const row = rows[0];
  if (!row?.paypal_client_id || !row?.paypal_secret) return null;
  return {
    clientId: row.paypal_client_id,
    secret: row.paypal_secret,
    mode: row.paypal_mode === "live" ? "live" : "sandbox",
  };
}

export async function savePayPalCredentials(input: Credentials) {
  const sql = await getSql();
  await sql`
    insert into platform_settings (id, paypal_client_id, paypal_secret, paypal_mode, updated_at)
    values (1, ${input.clientId}, ${input.secret}, ${input.mode}, now())
    on conflict (id) do update set
      paypal_client_id = excluded.paypal_client_id,
      paypal_secret = excluded.paypal_secret,
      paypal_mode = excluded.paypal_mode,
      updated_at = now()
  `;
  tokenCache = null;
}

async function accessToken(creds: Credentials) {
  const key = `${creds.mode}:${creds.clientId}`;
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }
  const auth = Buffer.from(`${creds.clientId}:${creds.secret}`).toString("base64");
  const res = await fetch(`${apiBase(creds.mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description || "PayPal would not issue an access token. Check the Client ID and Secret.");
  }
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + Math.max(60, body.expires_in ?? 300) * 1000,
    key,
  };
  return body.access_token;
}

async function paypalFetch(path: string, init: RequestInit) {
  const creds = await loadPayPalCredentials();
  if (!creds) throw new Error("PayPal is not connected. Add a Client ID and Secret on The take.");
  const token = await accessToken(creds);
  const res = await fetch(`${apiBase(creds.mode)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const details = Array.isArray(json.details)
      ? (json.details as { description?: string }[]).map((d) => d.description).filter(Boolean).join(" ")
      : "";
    const message =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error_description === "string" && json.error_description) ||
      details ||
      `PayPal request failed (${res.status}).`;
    throw new Error(message);
  }
  return json;
}

export async function createPayPalOrder(input: {
  listingId: number;
  title: string;
  priceCents: number;
  items?: { name: string; amountCents: number }[];
}) {
  const total = Math.max(0, Math.round(input.priceCents));
  const lines = (input.items ?? [{ name: input.title, amountCents: total }]).filter((item) => item.amountCents > 0);
  const lineSum = lines.reduce((sum, item) => sum + item.amountCents, 0);
  const useLines = lineSum === total && lines.length > 0;
  const json = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: String(input.listingId),
          description: `Askfare · ${input.title}`.slice(0, 127),
          amount: {
            currency_code: "USD",
            value: paypalAmount(total),
            ...(useLines
              ? {
                  breakdown: {
                    item_total: { currency_code: "USD", value: paypalAmount(total) },
                  },
                }
              : {}),
          },
          ...(useLines
            ? {
                items: lines.map((item) => ({
                  name: item.name.slice(0, 127),
                  quantity: "1",
                  unit_amount: { currency_code: "USD", value: paypalAmount(item.amountCents) },
                })),
              }
            : {}),
        },
      ],
      application_context: {
        brand_name: "Askfare",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    }),
  });
  const id = typeof json.id === "string" ? json.id : "";
  if (!id) throw new Error("PayPal did not return an order.");
  return id;
}

export async function capturePayPalOrder(orderId: string) {
  const json = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    body: "{}",
  });
  const status = typeof json.status === "string" ? json.status : "";
  const purchase = Array.isArray(json.purchase_units) ? json.purchase_units[0] : null;
  const payments = purchase && typeof purchase === "object" ? (purchase as { payments?: { captures?: { id?: string; status?: string }[] } }).payments : undefined;
  const capture = payments?.captures?.[0];
  const captureId = capture?.id ?? "";
  if (status !== "COMPLETED" && capture?.status !== "COMPLETED") {
    throw new Error("PayPal did not complete the capture.");
  }
  if (!captureId) throw new Error("PayPal captured without a capture id.");
  return { orderId, captureId, status: "COMPLETED" as const };
}

export async function refundPayPalCapture(captureId: string, amountCents: number) {
  await paypalFetch(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: "POST",
    body: JSON.stringify({
      amount: {
        currency_code: "USD",
        value: paypalAmount(amountCents),
      },
    }),
  });
}

export async function payoutToEmail(input: {
  email: string;
  amountCents: number;
  claimId: number;
  note: string;
}) {
  const json = await paypalFetch("/v1/payments/payouts", {
    method: "POST",
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `st-claim-${input.claimId}-${Date.now()}`,
        email_subject: "Your Askfare payout",
        email_message: `Askfare sent ${formatCents(input.amountCents)} — your 80% of the locked fare.`,
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: input.email,
          amount: { currency: "USD", value: paypalAmount(input.amountCents) },
          note: input.note,
          sender_item_id: `claim-${input.claimId}`,
        },
      ],
    }),
  });
  const batch = json.batch_header as { payout_batch_id?: string } | undefined;
  const batchId = batch?.payout_batch_id ?? "";
  if (!batchId) throw new Error("PayPal did not accept the cook payout.");
  return batchId;
}
