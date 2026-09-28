import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

const iterations = 310_000;
const keyLength = 32;

export function isDeletePinConfigured() {
  return Boolean(process.env.TEAM_DELETE_PIN_HASH);
}

export function verifyDeletePin(pin: unknown) {
  const encoded = process.env.TEAM_DELETE_PIN_HASH;
  if (!encoded) throw new Error("Team deletion PIN is not configured");
  if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) return false;

  // Colons survive Next.js .env parsing without being mistaken for variable references.
  // Dollar-separated hashes remain supported for Vercel env values and escaped .env values.
  const parts = encoded.split(encoded.startsWith("pbkdf2:") ? ":" : "$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256")
    throw new Error("Team deletion PIN hash is invalid");
  const rounds = Number(parts[2]);
  const salt = Buffer.from(parts[3], "hex");
  const expected = Buffer.from(parts[4], "hex");
  if (
    !Number.isInteger(rounds) ||
    rounds < iterations ||
    rounds > 1_000_000 ||
    salt.length < 16 ||
    expected.length !== keyLength ||
    !/^[a-f0-9]+$/i.test(parts[3]) ||
    !/^[a-f0-9]+$/i.test(parts[4])
  )
    throw new Error("Team deletion PIN hash is invalid");

  const actual = pbkdf2Sync(pin, salt, rounds, keyLength, "sha256");
  return timingSafeEqual(actual, expected);
}
