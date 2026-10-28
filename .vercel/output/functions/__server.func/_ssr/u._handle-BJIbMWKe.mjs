import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { h as formatWhen } from "./shared-DmOvjmfI.mjs";
import { n as Route$2 } from "./router-C6OEj4kx.mjs";
import { r as Kicker } from "./ui-bits-C-7Hshvo.mjs";
import { t as ListingCardView } from "./listing-card-DPTA8Txz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/u._handle-BJIbMWKe.js
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const profile = Route$2.useLoaderData();
	if (!profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Такого профиля нет"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "artist" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-2 font-display text-5xl leading-none",
				children: ["@", profile.handle]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-lg",
				children: profile.displayName
			}),
			profile.bio ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-prose text-muted",
				children: profile.bio
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 font-mono text-xs text-muted",
				suppressHydrationWarning: true,
				children: ["на площадке с ", formatWhen(profile.createdAt)]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/me",
				className: "mt-3 inline-flex text-sm underline",
				children: "Это вы? Править профиль"
			})
		] }), profile.listings.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "Лотов пока нет."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-8 sm:grid-cols-2 lg:grid-cols-3",
			children: profile.listings.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingCardView, { item }, item.id))
		})]
	});
}
//#endregion
export { ProfilePage as component };
