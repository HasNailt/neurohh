import { r as createServerFn } from "./ssr.mjs";
import { i as getSql } from "./db-C8Whojsf.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-options-PLlvfXjK.js
/** Public login flags. Secrets stay on the server; the bot id is not a secret. */
var getLoginOptions_createServerFn_handler = createServerRpc({
	id: "b517f5ad972c1aa831bbe1260449848404a0c228a2467c2769c8187d68b55d68",
	name: "getLoginOptions",
	filename: "src/lib/auth/login-options.ts"
}, (opts) => getLoginOptions.__executeServer(opts));
var getLoginOptions = createServerFn({ method: "GET" }).handler(getLoginOptions_createServerFn_handler, async () => {
	const botId = (process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "").split(":")[0] ?? "";
	const vk = Boolean(process.env.VK_CLIENT_ID?.trim() && process.env.VK_CLIENT_SECRET?.trim());
	let requireInvite = false;
	try {
		requireInvite = (await (await getSql())`
      select value from site_settings where key = 'require_invite'
    `)[0]?.value === "true";
	} catch {
		requireInvite = false;
	}
	return {
		vk,
		telegramBotId: /^\d+$/.test(botId) ? botId : null,
		requireInvite
	};
});
//#endregion
export { getLoginOptions_createServerFn_handler };
