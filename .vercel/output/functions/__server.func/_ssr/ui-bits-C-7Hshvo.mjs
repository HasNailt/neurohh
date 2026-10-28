import { w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { l as dealStatusLabel, y as listingStatusLabel } from "./shared-DmOvjmfI.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ui-bits-C-7Hshvo.js
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var fieldClass = "min-h-11 w-full border border-ink/20 bg-card px-3 text-ink outline-none placeholder:text-muted focus:border-ink";
function Frame({ children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative border border-ink/15", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -top-px -left-px h-3 w-3 border-t border-l border-ink" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -top-px -right-px h-3 w-3 border-t border-r border-ink" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-ink" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -right-px -bottom-px h-3 w-3 border-r border-b border-ink" }),
			children
		]
	});
}
function Kicker({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "font-mono text-xs tracking-widest text-muted uppercase",
		children
	});
}
var variants = {
	acid: "bg-acid text-ink hover:opacity-90",
	ink: "bg-ink text-paper hover:opacity-90",
	line: "border border-ink/25 bg-card text-ink hover:border-ink",
	ghost: "text-ink hover:bg-ink/5"
};
function Button({ variant = "ink", className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 font-medium transition disabled:cursor-not-allowed disabled:opacity-45", variants[variant], className),
		...props
	});
}
function StatusChip({ kind, status }) {
	const label = kind === "deal" ? dealStatusLabel(status) : listingStatusLabel(status);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center px-2 py-1 font-mono text-xs uppercase", status === "awaiting_payment" || status === "active" ? "bg-acid text-ink" : "bg-ink text-paper"),
		children: label
	});
}
//#endregion
export { fieldClass as a, StatusChip as i, Frame as n, Kicker as r, Button as t };
