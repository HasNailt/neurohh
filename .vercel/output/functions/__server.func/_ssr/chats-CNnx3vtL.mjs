import { o as __toESM } from "../_runtime.mjs";
import { m as errText, v as formatWhen } from "./shared-CQ2SO6Dv.mjs";
import { Q as require_react, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as listThreads, E as getThread, F as sendDirect, M as openThread, c as useCurrentUserState, o as Route$15 } from "./router-D1fCyzyg.mjs";
import { a as fieldClass, n as Frame, r as Kicker, t as Button } from "./ui-bits-KhP-aorX.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chats-CNnx3vtL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ChatsPage() {
	const { user, isPending } = useCurrentUserState();
	const { with: withHandle } = Route$15.useSearch();
	const [threads, setThreads] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(null);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	function reloadList() {
		listThreads().then(setThreads).catch((err) => toast.error(errText(err)));
	}
	(0, import_react.useEffect)(() => {
		if (!user) return;
		reloadList();
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (!user || !withHandle) {
			if (!withHandle) setOpen(null);
			return;
		}
		let stop = false;
		openThread({ data: withHandle }).then((thread) => {
			if (!stop) setOpen(thread);
		}).catch((err) => toast.error(errText(err)));
		return () => {
			stop = true;
		};
	}, [user, withHandle]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-48 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "inbox" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 font-display text-4xl leading-none",
					children: "чаты."
				})] }),
				threads == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 animate-pulse bg-soft" }) : threads.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Пока тихо. Кнопка «Чат» есть в чужом профиле — сделка для этого не нужна."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-ink/10 border-y border-ink/15",
					children: threads.map((thread) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/chats",
						search: { with: thread.otherHandle },
						className: "block py-3 hover:bg-soft/60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-medium",
							children: ["@", thread.otherHandle]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm text-muted",
							children: thread.lastBody || "без сообщений"
						})]
					}) }, thread.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [
						"Переписка по покупке остаётся в ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/deals",
							className: "underline",
							children: "сделках"
						}),
						"."
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { children: !withHandle || !open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "border border-dashed border-ink/30 px-4 py-10 text-center text-muted",
			children: "Выберите диалог."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3 bg-card p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-muted",
						children: "личный чат"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-3xl leading-none",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/u/$handle",
							params: { handle: open.otherHandle },
							className: "hover:underline",
							children: ["@", open.otherHandle]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: open.otherName
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "h-80 space-y-3 overflow-y-auto border border-ink/15 p-3",
					children: [open.messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Напишите первое сообщение."
					}) : null, open.messages.map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: message.mine ? "ml-8" : "mr-8",
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
							className: message.mine ? "bg-wine px-3 py-2 text-foam" : "border border-ink/25 px-3 py-2",
							children: message.body
						})]
					}, message.id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "flex gap-2",
					onSubmit: (e) => {
						e.preventDefault();
						const body = draft.trim();
						if (!body) return;
						setBusy(true);
						sendDirect({ data: {
							threadId: open.id,
							body
						} }).then(() => getThread({ data: open.id })).then((next) => {
							if (next) setOpen(next);
							setDraft("");
							reloadList();
						}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						maxLength: 2e3,
						className: fieldClass,
						placeholder: "Сообщение"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "wine",
						disabled: busy,
						children: "Ок"
					})]
				})
			]
		}) }) })]
	});
}
//#endregion
export { ChatsPage as component };
