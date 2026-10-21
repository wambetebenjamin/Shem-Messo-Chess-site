// Session and push-notification keys. On hosts without a persistent disk these must be
// environment variables; a local file is generated only for development and tests.
import webpush from "web-push";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

// A VAPID public key is an uncompressed P-256 point: 65 bytes, starting with 0x04.
// The private key is 32 bytes. Both are base64url without padding.
function checkVapid(publicKey, privateKey) {
  const pub = Buffer.from(publicKey, "base64url");
  if (pub.length !== 65 || pub[0] !== 0x04 || publicKey.length !== 87)
    throw Error(
      "VAPID_PUBLIC_KEY is not a valid key. Paste the whole value from `npx web-push generate-vapid-keys` with no spaces or line breaks.",
    );
  const priv = Buffer.from(privateKey, "base64url");
  if (priv.length !== 32 || privateKey.length !== 43)
    throw Error(
      "VAPID_PRIVATE_KEY is not a valid key. Paste the private key from the same `npx web-push generate-vapid-keys` run, with no spaces.",
    );
}

export function loadSecrets(env = process.env, dataDir = "data") {
  const SESSION_SECRET = env.SESSION_SECRET?.trim();
  const VAPID_PUBLIC_KEY = env.VAPID_PUBLIC_KEY?.trim();
  const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY?.trim();
  if (SESSION_SECRET && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    checkVapid(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    return {
      session: SESSION_SECRET,
      vapid: { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY },
    };
  }
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
