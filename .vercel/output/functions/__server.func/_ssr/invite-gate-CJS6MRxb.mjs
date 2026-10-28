import { r as createServerFn, s as setCookie$1 } from "./ssr.mjs";
import { i as getSql } from "./db-C8Whojsf.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/invite-gate-CJS6MRxb.js
var INVITE_COOKIE = "glyph-invite";
var CODE_RE = /^[A-Z0-9-]{6,32}$/;
function normalizeInviteCode(raw) {
	return raw.trim().toUpperCase().replace(/\s+/g, "");
}
/** Remember a code in an httpOnly cookie so the sign-up hook can consume it. */
var stageInvite_createServerFn_handler = createServerRpc({
	id: "c32f4f331fe2aace766d43554d57798533a4ee57bc15ee1bfe7f068982c3df91",
	name: "stageInvite",
	filename: "src/lib/auth/invite-gate.ts"
}, (opts) => stageInvite.__executeServer(opts));
var stageInvite = createServerFn({ method: "POST" }).validator((input) => {
	const code = normalizeInviteCode(input && typeof input === "object" && "code" in input ? String(input.code ?? "") : "");
	if (!CODE_RE.test(code)) throw new Error("Некорректный инвайт-код");
	return { code };
}).handler(stageInvite_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	if (!((await sql`
      select value from site_settings where key = 'require_invite'
    `)[0]?.value === "true")) {
		setCookie$1(INVITE_COOKIE, "", {
			path: "/",
			maxAge: 0,
			httpOnly: true,
			sameSite: "lax",
			secure: true
		});
		return {
			ok: true,
			required: false
		};
	}
	if (!(await sql`
      select id from invite_codes
      where code = ${data.code} and revoked = false and uses < max_uses
    `)[0]) throw new Error("Инвайт-код не подходит или уже использован");
	setCookie$1(INVITE_COOKIE, data.code, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: true,
		maxAge: 1800
	});
	return {
		ok: true,
		required: true
	};
});
//#endregion
export { stageInvite_createServerFn_handler };
