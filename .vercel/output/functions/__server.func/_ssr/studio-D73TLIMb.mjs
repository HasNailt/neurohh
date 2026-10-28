import { o as __toESM } from "../_runtime.mjs";
import { _ as formatPrice, m as errText, x as listingStatusLabel } from "./shared-CQ2SO6Dv.mjs";
import { Q as require_react, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { B as updateListingCopy, C as getListing, L as setPinned, O as listMine, c as useCurrentUserState } from "./router-v_n_Ojj0.mjs";
import { a as fieldClass, n as Frame, r as Kicker, t as Button } from "./ui-bits-KhP-aorX.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
import { t as TagField } from "./tag-field-CZ7EBf_u.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/studio-D73TLIMb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function StudioPage() {
	const { user, isPending } = useCurrentUserState();
	const [items, setItems] = (0, import_react.useState)(null);
	const [editId, setEditId] = (0, import_react.useState)(null);
	function reload() {
		listMine().then(setItems).catch((err) => toast.error(errText(err)));
	}
	(0, import_react.useEffect)(() => {
		if (!user) return;
		reload();
	}, [user]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-48 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	const auctions = (items ?? []).filter((item) => item.kind === "auction");
	const fixed = (items ?? []).filter((item) => item.kind === "fixed");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "booth desk" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-5xl leading-none",
						children: "мои лоты."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-prose text-sm text-muted",
						children: "Все аукционы и фиксы в одном месте. Правка открывается отдельной плашкой, не формой продажи."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/sell",
					className: "inline-flex min-h-11 items-center border border-wine bg-wine px-4 text-foam",
					children: "Новый лот"
				})]
			}),
			items == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shelf, {
				title: "Аукционы",
				items: auctions,
				onEdit: setEditId,
				onPin: reload
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shelf, {
				title: "Фикс",
				items: fixed,
				onEdit: setEditId,
				onPin: reload
			}),
			editId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditSheet, {
				id: editId,
				onClose: () => setEditId(null),
				onSaved: () => {
					setEditId(null);
					reload();
				}
			}) : null
		]
	});
}
function Shelf({ title, items, onEdit, onPin }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-3xl leading-none",
			children: title
		}), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Пока пусто."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "divide-y divide-ink/10 border-y border-ink/15",
			children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-wrap items-center gap-3 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/lot/$id",
						params: { id: item.id },
						className: "min-w-0 flex-1 truncate hover:underline",
						children: item.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs text-muted",
						children: listingStatusLabel(item.status)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs tabular-nums",
						children: formatPrice(item.currentBid ?? item.price)
					}),
					item.status === "active" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-9 border border-ink/25 px-2 font-mono text-xs",
						onClick: () => {
							setPinned({ data: {
								id: item.id,
								pinned: !item.pinned
							} }).then(() => {
								toast.success(item.pinned ? "Открепили" : "Закрепили на профиле");
								onPin();
							}).catch((err) => toast.error(errText(err)));
						},
						children: item.pinned ? "Открепить" : "Закрепить"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "line",
						onClick: () => onEdit(item.id),
						children: "Править"
					})] }) : item.pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs",
						children: "на профиле"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-9 border border-ink/25 px-2 font-mono text-xs",
						onClick: () => {
							setPinned({ data: {
								id: item.id,
								pinned: true
							} }).then(() => {
								toast.success("Закрепили на профиле");
								onPin();
							}).catch((err) => toast.error(errText(err)));
						},
						children: "Закрепить"
					})
				]
			}, item.id))
		})]
	});
}
function EditSheet({ id, onClose, onSaved }) {
	const [title, setTitle] = (0, import_react.useState)("");
	const [blurb, setBlurb] = (0, import_react.useState)("");
	const [tags, setTags] = (0, import_react.useState)([]);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let stop = false;
		getListing({ data: id }).then((lot) => {
			if (stop || !lot) return;
			setTitle(lot.title);
			setBlurb(lot.blurb);
			setTags(lot.tags.map((t) => t.label));
			setReady(true);
		});
		return () => {
			stop = true;
		};
	}, [id]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-40 flex justify-end bg-paper/70",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 cursor-default",
			"aria-label": "Закрыть",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, {
			className: "relative z-10 h-full w-full max-w-md overflow-y-auto bg-paper shadow-none",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "space-y-3 bg-card p-4",
				onSubmit: (e) => {
					e.preventDefault();
					setBusy(true);
					updateListingCopy({ data: {
						id,
						title,
						blurb,
						tags
					} }).then(() => {
						toast.success("Лот обновлён");
						onSaved();
					}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "edit slate" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 font-display text-3xl leading-none",
							children: "правка."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 px-2 font-mono text-xs",
							onClick: onClose,
							children: "закрыть"
						})]
					}),
					ready ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 animate-pulse bg-soft" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Название", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: title,
							onChange: (e) => setTitle(e.target.value),
							className: `${fieldClass} mt-1`,
							maxLength: 80
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Коротко", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: blurb,
							onChange: (e) => setBlurb(e.target.value),
							rows: 4,
							maxLength: 400,
							className: `${fieldClass} mt-1 py-2`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-sm",
						children: "Теги"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagField, {
						tags,
						onChange: setTags
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "wine",
						disabled: busy || !ready,
						children: "Сохранить"
					})
				]
			})
		})]
	});
}
//#endregion
export { StudioPage as component };
