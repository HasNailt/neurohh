import { o as __toESM } from "../_runtime.mjs";
import { _ as formatPrice, h as formatDealNo, m as errText, v as formatWhen } from "./shared-BOwre9E3.mjs";
import { C as useNavigate, Q as require_react, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as useCurrentUserState, n as Route$3, w as getStaffDeal } from "./router-C0f7r3aH.mjs";
import { i as StatusChip, n as Frame, r as Kicker } from "./ui-bits-Bj54c0jH.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.deal._no-BA7tP9yg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function StaffDealPage() {
	const { no } = Route$3.useParams();
	const navigate = useNavigate();
	const { user, isPending } = useCurrentUserState();
	const [deal, setDeal] = (0, import_react.useState)(void 0);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		let stop = false;
		const load = () => {
			getStaffDeal({ data: no }).then((next) => {
				if (!stop) setDeal(next);
			}).catch((err) => {
				if (stop) return;
				if (err instanceof Error && /модерац/i.test(err.message)) setDeal("deny");
				else {
					setDeal(null);
					toast.error(errText(err));
				}
			});
		};
		load();
		const timer = window.setInterval(load, 5e3);
		return () => {
			stop = true;
			window.clearInterval(timer);
		};
	}, [user, no]);
	if (isPending || user && deal === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-64 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	if (deal === "deny") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Это не ваша панель"
	});
	if (!deal) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
			className: "font-display text-4xl",
			children: [
				"Сделки ",
				formatDealNo(Number(no) || 0),
				" нет"
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/admin",
			className: "underline",
			children: "Назад в модерацию"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "staff read-only" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-2 font-display text-4xl leading-none",
					children: [
						formatDealNo(deal.publicNo),
						" ",
						deal.title
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm text-muted",
					children: [
						"Продавец @",
						deal.seller.handle,
						" · покупатель @",
						deal.buyer.handle,
						" · ",
						formatPrice(deal.amount)
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Только чтение. Писать в чужой чат отсюда нельзя."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-2 text-sm underline",
					onClick: () => void navigate({ to: "/admin" }),
					children: "К панели"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusChip, {
				kind: "deal",
				status: deal.status
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-96 space-y-3 overflow-y-auto bg-card p-4",
				children: deal.messages.map((message) => message.system ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center font-mono text-xs text-muted",
					children: message.body
				}, message.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xs text-muted",
					children: [
						"@",
						message.handle ?? "?",
						" · ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							suppressHydrationWarning: true,
							children: formatWhen(message.createdAt)
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "border border-ink/25 px-3 py-2",
					children: message.body
				})] }, message.id))
			}) })
		]
	});
}
//#endregion
export { StaffDealPage as component };
