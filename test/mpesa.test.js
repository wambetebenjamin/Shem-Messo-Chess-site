import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  darajaTimestamp,
  stkPassword,
  mpesaConfig,
  paymentItems,
  parseCallback,
} from "../lib/mpesa.js";

test("Kenyan phone numbers are normalised to 2547… / 2541…", () => {
  assert.equal(normalizePhone("0712345678"), "254712345678");
  assert.equal(normalizePhone("+254 712 345 678"), "254712345678");
  assert.equal(normalizePhone("254110000000"), "254110000000");
  assert.equal(normalizePhone("712345678"), "254712345678");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("0812345678"), null);
  assert.equal(normalizePhone(undefined), null);
});

test("Daraja timestamp uses Nairobi time (UTC+3)", () => {
  // 10:00 UTC is 13:00 in Nairobi.
  assert.equal(darajaTimestamp(new Date("2026-10-22T10:00:00Z")), "20261022130000");
});

test("STK password is base64 of shortcode + passkey + timestamp", () => {
  const expected = Buffer.from("174379bfs-passkey20261022130000").toString("base64");
  assert.equal(stkPassword("174379", "bfs-passkey", "20261022130000"), expected);
});

test("payments stay closed without credentials or prices", () => {
  assert.equal(mpesaConfig({}), null);
  assert.deepEqual(paymentItems({}), {});
});

test("production config requires an https callback and uses the production host", () => {
  const env = {
    MPESA_CONSUMER_KEY: "k",
    MPESA_CONSUMER_SECRET: "s",
    MPESA_SHORTCODE: "174379",
    MPESA_PASSKEY: "p",
    MPESA_CALLBACK_URL: "http://example.com/cb",
  };
  assert.throws(() => mpesaConfig(env), /https/);
  const ok = mpesaConfig({ ...env, MPESA_CALLBACK_URL: "https://example.com/api/mpesa/callback" });
  assert.equal(ok.env, "sandbox");
  assert.equal(ok.host, "https://sandbox.safaricom.co.ke");
  const live = mpesaConfig({ ...env, MPESA_CALLBACK_URL: "https://example.com/cb", MPESA_ENV: "production" });
  assert.equal(live.host, "https://api.safaricom.co.ke");
});

test("only positive integer prices from MPESA_ITEMS are accepted, with labels", () => {
  assert.deepEqual(
    paymentItems({
      MPESA_ITEMS:
        '{"tournament-500":{"amount":500,"label":"Tournament"},"bad":-5,"text":"x","corporate-2500":2500}',
    }),
    {
      "tournament-500": { amount: 500, label: "Tournament" },
      "corporate-2500": { amount: 2500, label: "corporate-2500" },
    },
  );
  assert.throws(() => paymentItems({ MPESA_ITEMS: "not json" }));
});

test("callback parsing extracts the result and receipt", () => {
  const parsed = parseCallback({
    Body: {
      stkCallback: {
        MerchantRequestID: "m1",
        CheckoutRequestID: "ws_CO_1",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 1000 },
            { Name: "MpesaReceiptNumber", Value: "QWE123" },
          ],
        },
      },
    },
  });
  assert.equal(parsed.checkoutRequestId, "ws_CO_1");
  assert.equal(parsed.resultCode, 0);
  assert.equal(parsed.receipt, "QWE123");
  assert.equal(parsed.amount, 1000);
  assert.equal(parseCallback({ nothing: true }), null);
});
