import { T as providerLabel } from "./shared-CQ2SO6Dv.mjs";
import { r as createServerFn } from "./ssr.mjs";
import { i as getSql } from "./db-Bd-E4sfv.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/credential-hint-CSFfjHLG.js
/** Why an email/password sign-in was rejected. Does not say whether the password itself matched. */
var credentialHint_createServerFn_handler = createServerRpc({
	id: "80133309cd4d7186e3f2df9fbb3ce0e6320406d8a93b1dbb28a8c6bbedcf517c",
	name: "credentialHint",
	filename: "src/lib/auth/credential-hint.ts"
}, (opts) => credentialHint.__executeServer(opts));
var credentialHint = createServerFn({ method: "POST" }).validator((input) => {
	const email = input && typeof input === "object" && "email" in input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
	if (!email.includes("@") || email.length > 200) throw new Error("Проверьте email");
	return { email };
}).handler(credentialHint_createServerFn_handler, async ({ data }) => {
	try {
		const sql = await getSql();
		const user = (await sql`
        select id from "user" where lower(email) = ${data.email} limit 1
      `)[0];
		if (!user) return {
			kind: "unknown",
			via: ""
		};
		const accounts = await sql`
        select "providerId" as provider_id,
          ("password" is not null and length("password") > 0) as has_password
        from account
        where "userId" = ${user.id}
      `;
		if (accounts.some((row) => row.provider_id === "credential" && row.has_password)) return {
			kind: "password",
			via: ""
		};
		return {
			kind: "social",
			via: [...new Set(accounts.map((row) => row.provider_id).filter((id) => id !== "credential" && id !== "grok-gate").map((id) => providerLabel(id)))].join(", ") || "соцсеть"
		};
	} catch {
		return {
			kind: "unknown",
			via: ""
		};
	}
});
//#endregion
export { credentialHint_createServerFn_handler };
