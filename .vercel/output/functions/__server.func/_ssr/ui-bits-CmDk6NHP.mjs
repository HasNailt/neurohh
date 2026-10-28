import { T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { S as listingStatusLabel, m as dealStatusLabel } from "./shared-ChezZ8eT.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ui-bits-CmDk6NHP.js
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var fieldClass = "min-h-11 w-full border border-ink/25 bg-card px-3 text-ink outline-none placeholder:text-muted focus:border-wine";
function Frame({ children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative border border-ink/20", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-wine" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -top-px -right-px h-2.5 w-2.5 border-t border-r border-wine" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b border-l border-wine" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -right-px -bottom-px h-2.5 w-2.5 border-r border-b border-wine" }),
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
	wine: "border border-wine bg-wine text-foam hover:bg-wine-deep",
	ink: "border border-ink bg-ink text-paper hover:opacity-90",
	line: "border border-ink/30 bg-card text-ink hover:border-wine",
	ghost: "text-ink hover:bg-ink/10"
};
function Button({ variant = "ink", className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn("inline-flex min-h-11 items-center justify-center gap-2 px-4 font-medium tracking-wide transition disabled:cursor-not-allowed disabled:opacity-45", variants[variant], className),
		...props
	});
}
function StatusChip({ kind, status }) {
	const label = kind === "deal" ? dealStatusLabel(status) : listingStatusLabel(status);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center border px-2 py-1 font-mono text-xs uppercase", status === "awaiting_payment" || status === "active" ? "border-wine bg-wine text-foam" : "border-ink/30 text-ink"),
		children: label
	});
}
//#endregion
export { fieldClass as a, StatusChip as i, Frame as n, Kicker as r, Button as t };
