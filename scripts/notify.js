import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import webpush from "web-push";
const [title, body, url = "/events"] = process.argv.slice(2);
if (!title || !body) {
  console.error('Usage: npm run notify -- "Title" "Message" "/events"');
  process.exit(1);
}
if (!url.startsWith("/") || url.startsWith("//"))
  throw Error("Use a local URL such as /events.");
const secrets = JSON.parse(readFileSync("data/secrets.json"));
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:kerichochessacademy@gmail.com",
  secrets.vapid.publicKey,
  secrets.vapid.privateKey,
);
const db = new DatabaseSync("data/academy.sqlite");
let sent = 0,
  failed = 0;
for (const row of db.prepare("SELECT * FROM subscriptions").all()) {
  try {
    await webpush.sendNotification(
      JSON.parse(row.subscription),
      JSON.stringify({ title, body, url }),
    );
    sent++;
  } catch (e) {
    if ([404, 410].includes(e.statusCode))
      db.prepare("DELETE FROM subscriptions WHERE endpoint=?").run(
        row.endpoint,
      );
    else failed++;
  }
}
console.log(
  `Delivered: ${sent}; failed: ${failed}. Expired subscriptions removed.`,
);
if (failed) process.exitCode = 1;
