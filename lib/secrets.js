// Session and push-notification keys. On hosts without a persistent disk these must be
// environment variables; a local file is generated only for development and tests.
import webpush from "web-push";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export function loadSecrets(env = process.env, dataDir = "data") {
  const { SESSION_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = env;
  if (SESSION_SECRET && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
    return {
      session: SESSION_SECRET,
      vapid: { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY },
    };
  if (env.NODE_ENV === "production")
    throw Error(
      "Set SESSION_SECRET, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in the host's environment settings.",
    );
  mkdirSync(dataDir, { recursive: true });
  const file = `${dataDir}/secrets.json`;
  if (!existsSync(file))
    writeFileSync(
      file,
      JSON.stringify({
        session: randomBytes(48).toString("hex"),
        vapid: webpush.generateVAPIDKeys(),
      }),
      { mode: 0o600 },
    );
  return JSON.parse(readFileSync(file, "utf8"));
}
