import { i as getSql, o as resolveDatabaseUrl } from "./db-BGazDrk_.mjs";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/credential-store.server-BAOt1Ju8.js
/**
* Same scrypt parameters as Better Auth (`N=16384, r=16, p=1, dkLen=64`,
* format `saltHex:keyHex`). Pinned here so sign-up and sign-in always use
* node:crypto — Nitro must not resolve one route to the noble fallback and
* the other to node, which makes a just-created password fail verification.
*
* The salt is the hex *string* (UTF-8), matching Better Auth. Older rows that
* were derived from the decoded salt bytes are still accepted.
*/
var SCRYPT = {
	N: 16384,
	r: 16,
	p: 1,
	dkLen: 64
};
function derive(password, salt) {
	return new Promise((resolve, reject) => {
		scrypt(password.normalize("NFKC"), salt, SCRYPT.dkLen, {
			N: SCRYPT.N,
			r: SCRYPT.r,
			p: SCRYPT.p,
			maxmem: 128 * SCRYPT.N * SCRYPT.r * 2
		}, (err, key) => err ? reject(err) : resolve(key));
	});
}
async function hashPassword(password) {
	const salt = randomBytes(16).toString("hex");
	return `${salt}:${(await derive(password, salt)).toString("hex")}`;
}
async function keyMatches(password, salt, storedHex) {
	if (!/^[0-9a-f]+$/i.test(storedHex) || storedHex.length % 2 !== 0) return false;
	const given = Buffer.from(storedHex, "hex");
	if (given.length === 0) return false;
	const key = await derive(password, salt);
	if (given.length !== key.length) return false;
	return timingSafeEqual(given, key);
}
/** Accepts `{ hash, password }` (Better Auth) or `(hash, password)`. Never throws. */
async function verifyPassword(input, maybePassword) {
	try {
		const hash = (typeof input === "string" ? input : input?.hash ?? "").trim();
		const password = typeof input === "string" ? maybePassword ?? "" : input?.password ?? "";
		const split = hash.indexOf(":");
		if (split <= 0 || !password) return false;
		const salt = hash.slice(0, split);
		const stored = hash.slice(split + 1).trim();
		if (await keyMatches(password, salt, stored)) return true;
		if (/^[0-9a-f]+$/i.test(salt) && salt.length % 2 === 0 && salt.length >= 16) return await keyMatches(password, Buffer.from(salt, "hex"), stored);
		return false;
	} catch {
		return false;
	}
}
var DB_UNAVAILABLE = "База данных не подключена, поэтому пароль негде сохранить. Подключите Supabase Postgres и опубликуйте сайт ещё раз.";
/** Deployed without a Postgres URI would use empty per-process PGLite and reject every later sign-in. */
function persistentDatabaseMissing() {
	return process.env.VERCEL === "1" && !resolveDatabaseUrl();
}
async function userByEmail(email) {
	const users = await (await getSql())`
    select id, email
    from "user"
    where lower(email) = ${email}
  `;
	return users.find((row) => row.email === email) ?? users[0] ?? null;
}
async function credentialAccounts(userId) {
	return (await getSql())`
    select id, password
    from account
    where "userId" = ${userId} and "providerId" = 'credential'
  `;
}
function hasHash(row) {
	return typeof row.password === "string" && row.password.includes(":");
}
/**
* Sign-in reads the first credential row. An empty password there hides a
* later row that has the real hash. When the submitted password matches any
* stored hash, copy that hash onto every credential row and drop the blanks.
* Never writes a password that did not already verify.
*/
async function alignCredentialPassword(email, password) {
	const user = await userByEmail(email);
	if (!user) return {
		status: "none",
		userId: null
	};
	const sql = await getSql();
	if (user.email !== email) await sql`
      update "user"
      set email = ${email}
      where id = ${user.id}
        and not exists (
          select 1 from "user" other where other.email = ${email} and other.id <> ${user.id}
        )
    `;
	const accounts = await credentialAccounts(user.id);
	const hashed = accounts.filter(hasHash);
	if (hashed.length === 0) return {
		status: accounts.length > 0 ? "social" : "none",
		userId: user.id
	};
	let matching = null;
	for (const row of hashed) if (await verifyPassword({
		hash: row.password,
		password
	})) {
		matching = row.password.trim();
		break;
	}
	if (!matching) return {
		status: "miss",
		userId: user.id
	};
	if (hashed.some((row) => row.password.trim() !== matching)) await sql`
      update account
      set password = ${matching}, "updatedAt" = now()
      where "userId" = ${user.id} and "providerId" = 'credential'
    `;
	if (accounts.length !== hashed.length) await sql`
      delete from account
      where "userId" = ${user.id}
        and "providerId" = 'credential'
        and (password is null or length(password) = 0)
    `;
	return {
		status: "match",
		userId: user.id
	};
}
/**
* Right after sign-up, make sure `account.providerId = 'credential'` holds
* this same scrypt hash. Only touches a user created in the last two minutes,
* so a failed "email already exists" cannot overwrite someone else's password.
*/
async function sealSignupPassword(userId, password) {
	if (!userId || password.length < 8) return;
	const sql = await getSql();
	const created = (await sql`
    select "createdAt" as created_at from "user" where id = ${userId} limit 1
  `)[0]?.created_at;
	if (!created) return;
	const age = Date.now() - new Date(created).getTime();
	if (!Number.isFinite(age) || age > 12e4) return;
	const hash = await hashPassword(password);
	if (!(await sql`
    select id from account
    where "userId" = ${userId} and "providerId" = 'credential'
    limit 1
  `)[0]) {
		await sql`
      insert into account (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      ) values (
        ${randomBytes(16).toString("hex")}, ${userId}, 'credential', ${userId}, ${hash}, now(), now()
      )
    `;
		return;
	}
	await sql`
    update account
    set password = ${hash}, "updatedAt" = now()
    where "userId" = ${userId} and "providerId" = 'credential'
  `;
}
//#endregion
export { sealSignupPassword as a, persistentDatabaseMissing as i, alignCredentialPassword as n, verifyPassword as o, hashPassword as r, DB_UNAVAILABLE as t };
