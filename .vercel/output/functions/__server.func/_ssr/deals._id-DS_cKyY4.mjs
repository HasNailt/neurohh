import { o as __toESM } from "../_runtime.mjs";
import { Q as require_react, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { g as formatDealNo, h as errText, v as formatPrice, y as formatWhen } from "./shared-ChezZ8eT.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { F as sendMessage, W as useCurrentUserState, _ as completeDeal, a as Route$6, c as RedirectToSignIn, x as getDeal } from "./router-C8EjHOuq.mjs";
import { a as fieldClass, i as StatusChip, n as Frame, r as Kicker, t as Button } from "./ui-bits-CmDk6NHP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/deals._id-DS_cKyY4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DealPage() {
	const { id } = Route$6.useParams();
	const { user, isPending } = useCurrentUserState();
	const [deal, setDeal] = (0, import_react.useState)(void 0);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	const stick = (0, import_react.useRef)(true);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		let stop = false;
		const load = () => {
			getDeal({ data: id }).then((next) => {
				if (!stop) setDeal(next);
			}).catch((err) => {
				if (!stop) {
					setDeal(null);
					toast.error(errText(err));
				}
			});
		};
		load();
		const timer = window.setInterval(load, 4e3);
		return () => {
			stop = true;
			window.clearInterval(timer);
		};
	}, [user, id]);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (!el || !stick.current) return;
		el.scrollTop = el.scrollHeight;
	}, [deal?.messages.length]);
	if (isPending || user && deal === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-64 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	if (!deal) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Сделка не найдена"
	});
	const other = deal.youAre === "seller" ? deal.buyer : deal.seller;
	async function act(fn, ok) {
		setBusy(true);
		try {
			const next = await fn();
			setDeal(next);
			toast.success(ok);
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Kicker, { children: ["сделка ", formatDealNo(deal.publicNo)] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-4xl leading-none",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/lot/$id",
							params: { id: deal.listingId },
							className: "hover:underline",
							children: deal.title
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-muted",
						children: [
							deal.youAre === "seller" ? "Покупатель" : "Продавец",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/u/$handle",
								params: { handle: other.handle },
								className: "text-ink underline",
								children: ["@", other.handle]
							}),
							". Номер ",
							formatDealNo(deal.publicNo),
							" виден вам и модерации — по нему разбирают спор."
						]
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scroller,
					onScroll: (e) => {
						const el = e.currentTarget;
						stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
					},
					className: "h-96 space-y-3 overflow-y-auto bg-card p-4",
					children: deal.messages.map((message) => message.system ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center font-mono text-xs text-muted",
						children: message.body
					}, message.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: message.senderId === user.id ? "ml-8" : "mr-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs text-muted",
							children: [
								"@",
								message.handle,
								" · ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									suppressHydrationWarning: true,
									children: formatWhen(message.createdAt)
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: message.senderId === user.id ? "bg-wine px-3 py-2 text-foam" : "border border-ink/25 px-3 py-2",
							children: message.body
						})]
					}, message.id))
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "flex gap-2",
					onSubmit: (e) => {
						e.preventDefault();
						const body = draft.trim();
						if (!body) return;
						setBusy(true);
						sendMessage({ data: {
							dealId: deal.id,
							body
						} }).then(() => getDeal({ data: deal.id })).then((next) => {
							if (next) setDeal(next);
							setDraft("");
							stick.current = true;
						}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						placeholder: "Сообщение",
						className: fieldClass,
						maxLength: 2e3
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						children: "Ок"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
			className: "space-y-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 bg-card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusChip, {
						kind: "deal",
						status: deal.status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-3xl tabular-nums",
						children: formatPrice(deal.amount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"Оплата проходит вне площадки. Здесь только переписка по сделке ",
							formatDealNo(deal.publicNo),
							"."
						]
					}),
					deal.status !== "completed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "line",
						className: "w-full",
						disabled: busy,
						onClick: () => void act(() => completeDeal({ data: deal.id }), "Сделка закрыта"),
						children: "Завершить сделку"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Сделка закрыта."
					})
				]
			}) })
		})]
	});
}
//#endregion
export { DealPage as component };
