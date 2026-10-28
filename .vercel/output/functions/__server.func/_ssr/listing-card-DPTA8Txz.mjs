import { o as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { m as formatPrice, p as formatLeft } from "./shared-DmOvjmfI.mjs";
import { n as Frame } from "./ui-bits-C-7Hshvo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/listing-card-DPTA8Txz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LiveLeft({ endsAt }) {
	const [text, setText] = (0, import_react.useState)("···");
	(0, import_react.useEffect)(() => {
		const tick = () => setText(formatLeft(endsAt));
		tick();
		const id = window.setInterval(tick, 1e3);
		return () => window.clearInterval(id);
	}, [endsAt]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "tabular-nums",
		children: text
	});
}
function ListingCardView({ item }) {
	const price = item.kind === "auction" ? item.currentBid ?? item.price : item.price;
	const letter = (item.title.trim()[0] || "G").toLocaleUpperCase("ru");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "flex min-w-0 flex-col gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/lot/$id",
			params: { id: item.id },
			className: "block",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "poster relative overflow-hidden bg-soft",
				children: [
					item.previewId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: `/api/media/${item.previewId}`,
						alt: item.title,
						className: "h-full w-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid h-full place-items-center bg-acid",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-7xl leading-none text-ink",
							children: letter
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute top-3 left-3 bg-card/90 px-2 py-1 font-mono text-xs",
						children: item.kind === "auction" ? "AUC" : "FIX"
					}),
					item.kind === "auction" && item.endsAt && item.status === "active" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute top-3 right-3 bg-ink px-2 py-1 font-mono text-xs text-paper",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveLeft, { endsAt: item.endsAt })
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute inset-x-0 bottom-0 bg-ink/80 px-3 py-2 text-paper",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl tabular-nums",
							children: formatPrice(price)
						}), item.kind === "auction" && item.bidCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs opacity-80",
							children: [item.bidCount, " став."]
						}) : null]
					})
				]
			}) })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl leading-none",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/lot/$id",
						params: { id: item.id },
						className: "hover:underline",
						children: item.title
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 font-mono text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/u/$handle",
						params: { handle: item.sellerHandle },
						className: "hover:text-ink",
						children: ["@", item.sellerHandle]
					}), item.status !== "active" ? ` · ${item.status === "sold" ? "продан" : "закрыт"}` : ""]
				}),
				item.tags.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-1.5",
					children: item.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						search: {
							q: "",
							tag: tag.slug,
							kind: "all",
							sort: "new",
							page: 1
						},
						className: "border border-ink/20 px-2 py-1 font-mono text-xs hover:bg-acid",
						children: tag.label
					}, tag.slug))
				}) : null
			]
		})]
	});
}
//#endregion
export { ListingCardView as t };
