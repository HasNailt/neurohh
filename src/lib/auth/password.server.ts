import { randomBytes, scrypt, timingSafeEqual, type BinaryLike } from "node:crypto";

/**
 * Same scrypt parameters as Better Auth (`N=16384, r=16, p=1, dkLen=64`,
 * format `saltHex:keyHex`). Pinned here so sign-up and sign-in always use
 * node:crypto — Nitro must not resolve one route to the noble fallback and
 * the other to node, which makes a just-created password fail verification.
 *
 * The salt is the hex *string* (UTF-8), matching Better Auth. Older rows that
 * were derived from the decoded salt bytes are still accepted.
 */
const SCRYPT = { N: 16384, r: 16, p: 1, dkLen: 64 } as const;

function derive(password: string, salt: BinaryLike): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      SCRYPT.dkLen,
      {
        N: SCRYPT.N,
        r: SCRYPT.r,
        p: SCRYPT.p,
        maxmem: 128 * SCRYPT.N * SCRYPT.r * 2,
      },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

async function keyMatches(password: string, salt: BinaryLike, storedHex: string): Promise<boolean> {
  if (!/^[0-9a-f]+$/i.test(storedHex) || storedHex.length % 2 !== 0) return false;
  const given = Buffer.from(storedHex, "hex");
  if (given.length === 0) return false;
  const key = await derive(password, salt);
  if (given.length !== key.length) return false;
  return timingSafeEqual(given, key);
}

/** Accepts `{ hash, password }` (Better Auth) or `(hash, password)`. Never throws. */
export async function verifyPassword(
  input: { hash: string; password: string } | string,
  maybePassword?: string,
): Promise<boolean> {
  try {
    const hash = (typeof input === "string" ? input : input?.hash ?? "").trim();
    const password = typeof input === "string" ? (maybePassword ?? "") : (input?.password ?? "");
    const split = hash.indexOf(":");
    if (split <= 0 || !password) return false;
    const salt = hash.slice(0, split);
    const stored = hash.slice(split + 1).trim();
    if (await keyMatches(password, salt, stored)) return true;
    // Legacy: salt stored as hex but passed to scrypt as raw bytes.
    if (/^[0-9a-f]+$/i.test(salt) && salt.length % 2 === 0 && salt.length >= 16) {
      return await keyMatches(password, Buffer.from(salt, "hex"), stored);
    }
    return false;
  } catch {
    return false;
  }
}
