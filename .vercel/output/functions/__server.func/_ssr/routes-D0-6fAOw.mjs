import { T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as Route$17 } from "./router-D1fCyzyg.mjs";
import { r as Kicker } from "./ui-bits-KhP-aorX.mjs";
import { t as ListingCardView } from "./listing-card-BHtPyuLV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D0-6fAOw.js
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const search = Route$17.useSearch();
	const [feed, tags, recommended] = Route$17.useLoaderData();
	const pristine = !search.q && !search.tag && search.kind === "all" && search.page === 1;
	const showReco = search.page === 1 && !search.q && !search.tag && search.kind !== "fixed" && recommended.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBar, {
				search,
				tags
			}),
			showReco ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "weighted" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-3xl leading-none",
						children: "рекомендации."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Только живые аукционы. Чем больше лайков и ставок, тем выше шанс попасть сюда."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-8 sm:grid-cols-2 lg:grid-cols-3",
					children: recommended.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingCardView, { item }, item.id))
				})]
			}) : null,
			feed.items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border border-dashed border-ink/30 px-4 py-10 text-center text-muted",
				children: pristine ? "Лотов пока нет." : "По этому запросу лотов нет."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-8 sm:grid-cols-2 lg:grid-cols-3",
				children: feed.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingCardView, { item }, item.id))
			}),
			feed.total > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 font-mono text-sm",
				children: [
					search.page > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						search: {
							...search,
							page: search.page - 1
						},
						className: "min-h-11 underline",
						children: "Назад"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted tabular-nums",
						children: [
							search.page,
							" / ",
							Math.max(1, Math.ceil(feed.total / 12))
						]
					}),
					feed.hasMore ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						search: {
							...search,
							page: search.page + 1
						},
						className: "min-h-11 underline",
						children: "Дальше"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
				]
			}) : null
		]
	});
}
function FilterBar({ search, tags }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [
				[
					["all", "Все"],
					["auction", "Аукцион"],
					["fixed", "Фикс"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					search: {
						...search,
						kind: id,
						page: 1
					},
					className: search.kind === id ? "inline-flex min-h-11 items-center border border-wine bg-wine px-3 text-sm text-foam" : "inline-flex min-h-11 items-center border border-ink/25 px-3 text-sm",
					children: label
				}, id)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mx-1 hidden w-px bg-ink/15 sm:block" }),
				[["new", "Новые"], ["ending", "Скоро конец"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					search: {
						...search,
						sort: id,
						page: 1
					},
					className: search.sort === id ? "inline-flex min-h-11 items-center border border-wine bg-wine px-3 text-sm text-foam" : "inline-flex min-h-11 items-center border border-ink/25 px-3 text-sm",
					children: label
				}, id))
			]
		}), tags.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-2 overflow-x-auto pb-1",
			children: tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				search: {
					...search,
					tag: search.tag === tag.slug ? "" : tag.slug,
					page: 1
				},
				className: search.tag === tag.slug ? "shrink-0 border border-wine bg-wine px-2 py-1 font-mono text-xs text-foam" : "shrink-0 border border-ink/25 px-2 py-1 font-mono text-xs",
				children: tag.label
			}, tag.slug))
		}) : null]
	});
}
//#endregion
export { Home as component };
