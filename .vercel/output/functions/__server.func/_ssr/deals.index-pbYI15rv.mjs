import { o as __toESM } from "../_runtime.mjs";
import { _ as formatPrice, h as formatDealNo } from "./shared-CQ2SO6Dv.mjs";
import { Q as require_react, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as listDeals, c as useCurrentUserState } from "./router-DXl6og3F.mjs";
import { i as StatusChip, n as Frame, r as Kicker } from "./ui-bits-KhP-aorX.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/deals.index-pbYI15rv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DealsPage() {
	const { user, isPending } = useCurrentUserState();
	const [deals, setDeals] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		listDeals().then(setDeals).catch(() => setDeals([]));
	}, [user]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "trades" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-2 font-display text-5xl leading-none",
			children: "сделки."
		})] }), deals == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" }) : deals.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "Пока пусто. Сделка появляется после покупки или победы на аукционе."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid gap-3",
			children: deals.map((deal) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/deals/$id",
				params: { id: deal.id },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 bg-card p-3",
					children: [
						deal.previewId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: `/api/media/${deal.previewId}`,
							alt: "",
							className: "h-16 w-12 object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid h-16 w-12 place-items-center bg-wine-deep font-display text-foam",
							children: deal.title.slice(0, 1)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-display text-xl",
								children: deal.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs text-muted",
								children: [
									formatDealNo(deal.publicNo),
									" · ",
									deal.youAre === "seller" ? `покупатель @${deal.buyerHandle}` : `продавец @${deal.sellerHandle}`
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusChip, {
								kind: "deal",
								status: deal.status
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-mono text-sm tabular-nums",
								children: formatPrice(deal.amount)
							})]
						})
					]
				}) })
			}) }, deal.id))
		})]
	});
}
//#endregion
export { DealsPage as component };
