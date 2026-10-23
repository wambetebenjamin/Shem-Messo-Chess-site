import { readFileSync, existsSync } from "node:fs";
import webpush from "web-push";
import { createStore } from "../lib/store.js";
import { loadSecrets } from "../lib/secrets.js";
if (existsSync(".env")) process.loadEnvFile(".env");
const [title, body, url = "/events"] = process.argv.slice(2);
if (!title || !body) {
  console.error('Usage: npm run notify -- "Title" "Message" "/events"');
  process.exit(1);
}
if (!url.startsWith("/") || url.startsWith("//"))
  throw Error("Use a local URL such as /events.");
const secrets = loadSecrets(process.env, "data");
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:kerichochessacademy@gmail.com",
  secrets.vapid.publicKey,
  secrets.vapid.privateKey,
);
const store = createStore(process.env);
let sent = 0,
  failed = 0;
for (const row of await store.push.list()) {
  try {
    await webpush.sendNotification(
      row.subscription,
      JSON.stringify({ title, body, url }),
    );
    sent++;
  } catch (e) {
    if ([404, 410].includes(e.statusCode)) await store.push.remove(row.endpoint);
    else failed++;
  }
}
console.log(
  `Delivered: ${sent}; failed: ${failed}. Expired subscriptions removed.`,
);
if (failed) process.exitCode = 1;
