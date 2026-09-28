import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const iterations = 310_000;
const keyLength = 32;

export function newCaptainToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCaptainToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isCaptainTokenValid(teamHash: string | undefined, token: string | null) {
  if (!teamHash || !token) return false;
  const expected = Buffer.from(teamHash, "hex");
  const actual = Buffer.from(hashCaptainToken(token), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashTeamPin(pin: string) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(pin, salt, iterations, keyLength, "sha256");
  return `pbkdf2:sha256:${iterations}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyTeamPin(pin: string | null, encoded: string | undefined) {
  if (!encoded) return true;
  if (!pin || !/^\d{6}$/.test(pin)) return false;
  const parts = encoded.split(encoded.startsWith("pbkdf2:") ? ":" : "$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256")
    throw new Error("Team access PIN hash is invalid");
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
    throw new Error("Team access PIN hash is invalid");
  const actual = pbkdf2Sync(pin, salt, rounds, keyLength, "sha256");
  return timingSafeEqual(actual, expected);
}
