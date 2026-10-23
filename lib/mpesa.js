// M-Pesa Express (Daraja STK Push). Server-side only: credentials come from environment
// variables and are never sent to the browser. Sandbox is the default until the club's
// production credentials are set (MPESA_ENV=production).
import { Buffer } from "node:buffer";

const HOSTS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

// Kenyan mobile numbers in the 2547… or 2541… form that Daraja expects.
export function normalizePhone(raw = "") {
  const digits = String(raw).replace(/[\s()+-]/g, "");
  let m = digits.match(/^(?:0|254)?([17]\d{8})$/);
  if (!m) return null;
  return "254" + m[1];
}

// Nairobi local time as YYYYMMDDHHMMSS, the format Daraja uses in the password and timestamp.
export function darajaTimestamp(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

export function stkPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

// Reads configuration from the environment. Returns null if payments are not configured.
export function mpesaConfig(env = process.env) {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL } = env;
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY || !MPESA_CALLBACK_URL)
    return null;
  const callback = new URL(MPESA_CALLBACK_URL);
  if (callback.protocol !== "https:") throw Error("MPESA_CALLBACK_URL must be an https address.");
  const env_ = env.MPESA_ENV === "production" ? "production" : "sandbox";
  return {
    host: HOSTS[env_],
    env: env_,
    consumerKey: MPESA_CONSUMER_KEY.trim(),
    consumerSecret: MPESA_CONSUMER_SECRET.trim(),
    shortcode: MPESA_SHORTCODE.trim(),
    passkey: MPESA_PASSKEY.trim(),
    callbackUrl: callback.toString(),
    // Paybill by default; set MPESA_TRANSACTION_TYPE=till for a Buy Goods till.
    transactionType:
      env.MPESA_TRANSACTION_TYPE === "till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
  };
}

// Payment items come from MPESA_ITEMS. Each item is {"amount": KES, "label": "text"} or just a
// number. Example: {"academy-fee":{"amount":500,"label":"Academy fee"}}.
// Nothing is charged unless the club has set an amount.
export function paymentItems(env = process.env) {
  if (!env.MPESA_ITEMS) return {};
  let items;
  try {
    items = JSON.parse(env.MPESA_ITEMS);
  } catch {
    throw Error('MPESA_ITEMS must be JSON such as {"academy-fee":{"amount":500,"label":"Academy fee"}}.');
  }
  const out = {};
  for (const [id, value] of Object.entries(items)) {
    const amount = typeof value === "number" ? value : value?.amount;
    const label = typeof value === "object" && value?.label ? String(value.label) : id;
    if (/^[a-z0-9-]{1,40}$/.test(id) && Number.isInteger(amount) && amount > 0 && amount <= 150000)
      out[id] = { amount, label: label.slice(0, 80) };
  }
  return out;
}

export async function accessToken(config, fetchImpl = fetch) {
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const r = await fetchImpl(`${config.host}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!r.ok) throw Error(`M-Pesa authentication failed (${r.status}).`);
  return (await r.json()).access_token;
}

// Sends the STK prompt to the customer's phone. Returns Daraja's IDs for matching the callback.
export async function stkPush(config, { phone, amount, reference, description }, fetchImpl = fetch, now = new Date()) {
  const token = await accessToken(config, fetchImpl);
  const timestamp = darajaTimestamp(now);
  const r = await fetchImpl(`${config.host}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: stkPassword(config.shortcode, config.passkey, timestamp),
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: amount,
      PartyA: phone,
      PartyB: config.shortcode,
      PhoneNumber: phone,
      CallBackURL: config.callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.ResponseCode !== "0")
    throw Error(body.errorMessage || body.ResponseDescription || `M-Pesa request failed (${r.status}).`);
  return {
    merchantRequestId: body.MerchantRequestID,
    checkoutRequestId: body.CheckoutRequestID,
    customerMessage: body.CustomerMessage,
  };
}

// Reads Daraja's callback. Returns the fields we store, or null if the payload is malformed.
export function parseCallback(payload) {
  const cb = payload?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return null;
  const meta = Object.fromEntries(
    (cb.CallbackMetadata?.Item ?? []).map((i) => [i.Name, i.Value]),
  );
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: Number(cb.ResultCode),
    resultDesc: String(cb.ResultDesc ?? ""),
    receipt: meta.MpesaReceiptNumber ?? null,
    amount: meta.Amount ?? null,
  };
}
