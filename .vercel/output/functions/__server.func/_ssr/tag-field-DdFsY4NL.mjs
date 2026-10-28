import { o as __toESM } from "../_runtime.mjs";
import { Q as require_react, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { j as tagParts } from "./shared-ChezZ8eT.mjs";
import { L as suggestTags } from "./router-C8EjHOuq.mjs";
import { a as fieldClass } from "./ui-bits-CmDk6NHP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tag-field-DdFsY4NL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function TagField({ tags, onChange }) {
	const [draft, setDraft] = (0, import_react.useState)("");
	const [hints, setHints] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		const q = draft.trim();
		if (q.length < 1) {
			setHints([]);
			return;
		}
		const timer = window.setTimeout(() => {
			suggestTags({ data: q }).then(setHints).catch(() => setHints([]));
		}, 160);
		return () => window.clearTimeout(timer);
	}, [draft]);
	function add(raw) {
		const parts = tagParts(raw);
		if (!parts) return;
		if (tags.some((t) => tagParts(t)?.slug === parts.slug)) {
			setDraft("");
			setHints([]);
			return;
		}
		if (tags.length >= 8) return;
		onChange([...tags, parts.label]);
		setDraft("");
		setHints([]);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onChange(tags.filter((t) => t !== tag)),
					className: "bg-ink px-2 py-1 font-mono text-xs text-paper",
					children: [tag, " ×"]
				}, tagParts(tag)?.slug ?? tag))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: draft,
				onChange: (e) => setDraft(e.target.value),
				onKeyDown: (e) => {
					if (e.key === "Enter" || e.key === ",") {
						e.preventDefault();
						add(draft);
					}
					if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
				},
				placeholder: "Тег и Enter",
				className: fieldClass,
				"aria-label": "Тег"
			}),
			hints.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "border border-ink/20 bg-card",
				children: hints.map((hint) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 w-full px-3 text-left hover:bg-wine/20",
					onClick: () => add(hint.label),
					children: hint.label
				}) }, hint.slug))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Регистр не важен: «Человек» и «человек» — один тег. До 8."
			})
		]
	});
}
//#endregion
export { TagField as t };
