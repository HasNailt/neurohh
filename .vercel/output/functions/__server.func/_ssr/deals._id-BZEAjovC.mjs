import { o as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as errText, f as formatBytes, h as formatWhen, m as formatPrice } from "./shared-DmOvjmfI.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { f as completeDeal, g as getDeal, i as Route$4, k as useCurrentUserState, o as RedirectToSignIn, p as confirmPayment, w as sendMessage } from "./router-C6OEj4kx.mjs";
import { a as fieldClass, i as StatusChip, n as Frame, r as Kicker, t as Button } from "./ui-bits-C-7Hshvo.mjs";
import { t as downloadMedia } from "./client-upload-BgO9H1Jv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/deals._id-BZEAjovC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STEPS = [
	"Ожидание оплаты",
	"Обе стороны",
	"Файлы выданы",
	"Завершено"
];
function filled(status) {
	if (status === "awaiting_payment") return 0;
	if (status === "confirmed") return 2;
	if (status === "files_released") return 3;
	return 4;
}
function DealPage() {
	const { id } = Route$4.useParams();
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
	const youConfirmed = deal.youAre === "seller" ? deal.sellerConfirmed : deal.buyerConfirmed;
	const otherConfirmed = deal.youAre === "seller" ? deal.buyerConfirmed : deal.sellerConfirmed;
	const other = deal.youAre === "seller" ? deal.buyer : deal.seller;
	const released = deal.status === "files_released" || deal.status === "completed" || deal.status === "confirmed";
	const done = filled(deal.status);
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "deal room" }),
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
							})
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
							className: message.senderId === user.id ? "bg-acid px-3 py-2" : "border border-ink/15 px-3 py-2",
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
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "grid grid-cols-4 gap-1",
						children: STEPS.map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: i < done ? "block h-2 bg-ink" : i === done ? "block h-2 bg-acid" : "block h-2 bg-soft" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block font-mono text-xs leading-tight",
								children: label
							})]
						}, label))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "acid",
						className: "w-full",
						disabled: busy || youConfirmed || deal.status === "completed",
						onClick: () => void act(() => confirmPayment({ data: deal.id }), "Отметили оплату"),
						children: youConfirmed ? "Вы подтвердили оплату" : "Оплата прошла"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: otherConfirmed ? `@${other.handle} тоже подтвердил(а)` : `@${other.handle} ещё не нажал(а)`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Площадка деньги не принимает. Кнопка только фиксирует, что перевод между вами состоялся."
					}),
					deal.status === "files_released" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "line",
						className: "w-full",
						disabled: busy,
						onClick: () => void act(() => completeDeal({ data: deal.id }), "Сделка закрыта"),
						children: "Завершить сделку"
					}) : null
				]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 bg-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: released || deal.youAre === "seller" ? "материалы" : "закрыто" }), deal.privateDescription == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm",
					children: "Файлы и описание откроются, когда обе стороны нажмут «Оплата прошла»."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					deal.youAre === "seller" && !released ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Покупатель увидит это после второго подтверждения."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "whitespace-pre-wrap text-sm",
						children: deal.privateDescription
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "space-y-2",
						children: [(deal.files ?? []).map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "min-h-11 w-full border border-ink/20 px-3 text-left text-sm hover:bg-acid",
							onClick: () => void downloadMedia(file.id, file.filename).catch((err) => toast.error(errText(err))),
							children: [file.filename, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 block font-mono text-xs text-muted",
								children: formatBytes(file.sizeBytes)
							})]
						}) }, file.id)), (deal.files ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "text-sm text-muted",
							children: "Файлов нет, только текст."
						}) : null]
					})
				] })]
			}) })]
		})]
	});
}
//#endregion
export { DealPage as component };
