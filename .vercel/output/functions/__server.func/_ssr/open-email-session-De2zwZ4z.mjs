import { r as createServerFn, s as setCookie$1 } from "./ssr.mjs";
import { Mt as serializeSignedCookie } from "../_libs/@better-auth/core+[...].mjs";
import { i as getSql } from "./db-BGazDrk_.mjs";
import { i as persistentDatabaseMissing, n as alignCredentialPassword, t as DB_UNAVAILABLE } from "./credential-store.server-BAOt1Ju8.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { randomBytes } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/open-email-session-De2zwZ4z.js
var SESSION_COOKIE = "__Host-grok-auth.session_token";
var SESSION_SECONDS = 2592e3;
var SOCIAL = "Для этого адреса пароль не задан. Войдите по email, для которого задавали пароль на сайте.";
var INVALID = "Неверный email или пароль";
/**
* Sign in from the credential row itself. Better Auth reports
* "invalid email or password" when the first credential row has no hash, or
* when its query hides the password. If this scrypt matches, open a session
* and return the raw token so the browser can keep it.
*/
var openEmailSession_createServerFn_handler = createServerRpc({
	id: "1c9aa30a78353a532be4ca0a4ab074ca7aa18106651437b19bfb5613595e9ccf",
	name: "openEmailSession",
	filename: "src/lib/auth/open-email-session.ts"
}, (opts) => openEmailSession.__executeServer(opts));
var openEmailSession = createServerFn({ method: "POST" }).validator((input) => {
	const email = input && typeof input === "object" && "email" in input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
	const password = input && typeof input === "object" && "password" in input && typeof input.password === "string" ? input.password : "";
	if (!email.includes("@") || email.length > 200) throw new Error("Проверьте email");
	if (password.length < 8 || password.length > 128) throw new Error("Пароль — минимум 8 символов");
	return {
		email,
		password
	};
}).handler(openEmailSession_createServerFn_handler, async ({ data }) => {
	if (persistentDatabaseMissing()) return {
		ok: false,
		message: DB_UNAVAILABLE
	};
	try {
		const aligned = await alignCredentialPassword(data.email, data.password);
		if (aligned.status !== "match" || !aligned.userId) return {
			ok: false,
			message: aligned.status === "social" ? SOCIAL : INVALID
		};
		const token = randomBytes(24).toString("hex");
		const id = randomBytes(16).toString("hex");
		await (await getSql())`
        insert into "session" (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
        values (${id}, now() + interval '30 days', ${token}, now(), now(), ${aligned.userId})
      `;
		const { auth } = await import("./server-DoPJ9cDT.mjs").then((n) => n.r);
		const ctx = await auth.$context;
		const pair = (await serializeSignedCookie(SESSION_COOKIE, token, ctx.secret)).split(";")[0] ?? "";
		const encoded = pair.startsWith(`${SESSION_COOKIE}=`) ? pair.slice(31) : "";
		let value = encoded;
		try {
			value = decodeURIComponent(encoded);
		} catch {
			value = encoded;
		}
		if (value) setCookie$1(SESSION_COOKIE, value, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "none",
			maxAge: SESSION_SECONDS,
			partitioned: true
		});
		return {
			ok: true,
			token
		};
	} catch (err) {
		console.error("[credential] open session failed", err);
		return {
			ok: false,
			message: INVALID
		};
	}
});
//#endregion
export { openEmailSession_createServerFn_handler };
