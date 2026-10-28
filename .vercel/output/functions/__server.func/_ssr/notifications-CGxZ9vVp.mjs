import { o as __toESM } from "../_runtime.mjs";
import { m as errText, v as formatWhen } from "./shared-CQ2SO6Dv.mjs";
import { Q as require_react, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as useCurrentUserState, j as markNotificationsRead, k as listNotifications } from "./router-v_n_Ojj0.mjs";
import { r as Kicker, t as Button } from "./ui-bits-KhP-aorX.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-CGxZ9vVp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function NotesPage() {
	const { user, isPending } = useCurrentUserState();
	const [items, setItems] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		listNotifications().then(setItems).catch((err) => toast.error(errText(err)));
	}, [user]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-end justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "signals" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-5xl leading-none",
				children: "сигналы."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "line",
				onClick: () => {
					markNotificationsRead().then(() => listNotifications()).then(setItems).catch((err) => toast.error(errText(err)));
				},
				children: "Прочитать все"
			})]
		}), items == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" }) : items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "Тихо. Ставки, конец аукциона, сообщения и комментарии появятся здесь."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "divide-y divide-ink/10 border-y border-ink/10",
			children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: item.read ? "py-3" : "border-l-2 border-l-wine bg-wine/15 py-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: item.href,
					className: "block px-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: item.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: item.body
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-mono text-xs text-muted",
							suppressHydrationWarning: true,
							children: formatWhen(item.createdAt)
						})
					]
				})
			}, item.id))
		})]
	});
}
//#endregion
export { NotesPage as component };
