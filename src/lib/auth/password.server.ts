import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Same scrypt parameters as Better Auth (`N=16384, r=16, p=1, dkLen=64`,
 * format `saltHex:keyHex`). Pinned here so sign-up and sign-in always use
 * node:crypto — Nitro must not resolve one route to the noble fallback and
 * the other to node, which makes a just-created password fail verification.
 */
const SCRYPT = { N: 16384, r: 16, p: 1, dkLen: 64 } as const;

function derive(password: string, salt: string): Promise<Buffer> {
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

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const split = hash.indexOf(":");
  if (split <= 0) return false;
  const salt = hash.slice(0, split);
  const stored = hash.slice(split + 1);
  const key = await derive(password, salt);
  const given = Buffer.from(stored, "hex");
  if (given.length !== key.length) return false;
  return timingSafeEqual(given, key);
}
