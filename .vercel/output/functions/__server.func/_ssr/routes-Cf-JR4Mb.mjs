import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Route$13 } from "./router-C6OEj4kx.mjs";
import { r as Kicker } from "./ui-bits-C-7Hshvo.mjs";
import { t as ListingCardView } from "./listing-card-DPTA8Txz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cf-JR4Mb.js
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const search = Route$13.useSearch();
	const [feed, tags] = Route$13.useLoaderData();
	const emptyMarket = !search.q && !search.tag && search.kind === "all" && search.page === 1 && feed.total === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			emptyMarket ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyBooth, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoardHead, {
				total: feed.total,
				search
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBar, {
				search,
				tags
			}),
			feed.items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border border-dashed border-ink/30 px-4 py-10 text-center text-muted",
				children: emptyMarket ? "Первый лот ещё не выставлен." : "По этому запросу лотов нет."
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
function BoardHead({ total, search }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-end justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "01 / open booth" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-2 font-display text-5xl leading-none tracking-tight sm:text-6xl",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "bg-acid px-2",
					children: "glyph"
				}), " адопты."]
			}),
			search.tag ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-muted",
				children: ["Тег: ", search.tag]
			}) : null,
			search.q ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-muted",
				children: ["Запрос: ", search.q]
			}) : null
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Score, {
			n: total,
			label: "OPEN"
		})]
	});
}
function EmptyBooth() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "01 / март не обязателен" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 font-display text-lg",
					children: "#ПерсонажиНаходятДом"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "off-site payment" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-mono text-xs text-muted",
						children: "346° 89′ 07″"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden grid-cols-6 gap-3 opacity-40 sm:grid",
				"aria-hidden": "true",
				children: [
					"01",
					"02",
					"03",
					"04",
					"05",
					"06"
				].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs",
						children: n
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-10 w-8 border border-ink" })]
				}, n))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid items-end gap-6 lg:grid-cols-[1.3fr_0.7fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "font-display text-6xl leading-none tracking-tight sm:text-8xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "bg-acid px-2",
							children: "glyph"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"адопты."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-display text-3xl leading-none",
						children: [
							"никогда не",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"останавливай",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"линию."
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-sm text-muted",
						children: "Аукцион или фикс. Оплата вне площадки. Файлы и полное описание открываются только когда обе стороны нажали «Оплата прошла»."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "grid gap-3 sm:grid-cols-4",
				children: [
					[
						"01",
						"Лот",
						"Аукцион или фиксированная цена, свои теги."
					],
					[
						"02",
						"Ставка",
						"Антиснайп продлевает последние минуты. Есть «купить сейчас»."
					],
					[
						"03",
						"Оплата",
						"Чат сделки. Обе стороны подтверждают перевод."
					],
					[
						"04",
						"Файлы",
						"До 4 МБ и 4000×4000. Покупатель скачивает после двойного «да»."
					]
				].map(([n, t, d]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "border border-ink/15 bg-card p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs text-muted",
							children: n
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-display text-xl",
							children: t
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: d
						})
					]
				}, n))
			})
		]
	});
}
function Score({ n, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "inline-flex border border-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "bg-ink px-2 py-1 font-mono text-xs text-paper",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "px-3 py-1 font-mono text-sm tabular-nums",
			children: n
		})]
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
					className: search.kind === id ? "inline-flex min-h-11 items-center bg-ink px-3 text-sm text-paper" : "inline-flex min-h-11 items-center border border-ink/20 px-3 text-sm",
					children: label
				}, id)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mx-1 hidden w-px bg-ink/15 sm:block" }),
				[
					["new", "Новые"],
					["ending", "Скоро конец"],
					["price", "Цена"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					search: {
						...search,
						sort: id,
						page: 1
					},
					className: search.sort === id ? "inline-flex min-h-11 items-center bg-acid px-3 text-sm text-ink" : "inline-flex min-h-11 items-center border border-ink/20 px-3 text-sm",
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
				className: search.tag === tag.slug ? "shrink-0 bg-ink px-2 py-1 font-mono text-xs text-paper" : "shrink-0 border border-ink/20 px-2 py-1 font-mono text-xs",
				children: tag.label
			}, tag.slug))
		}) : null]
	});
}
//#endregion
export { Home as component };
