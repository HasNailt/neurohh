import { o as __toESM } from "../_runtime.mjs";
import { a as SNIPE_OPTIONS, i as PREVIEW_MAX, m as errText, n as FILE_MAX, r as MAX_DIM, t as DURATIONS } from "./shared-BOwre9E3.mjs";
import { C as useNavigate, Q as require_react, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { V as uploadMedia, c as useCurrentUserState, v as createListing } from "./router-C0f7r3aH.mjs";
import { a as fieldClass, r as Kicker, t as Button } from "./ui-bits-Bj54c0jH.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
import { t as TagField } from "./tag-field-OLeITu5v.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sell-jiwozKzj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function readB64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const raw = String(reader.result ?? "");
			const cut = raw.indexOf(",");
			resolve(cut >= 0 ? raw.slice(cut + 1) : raw);
		};
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Не удалось прочитать файл"));
		reader.readAsDataURL(file);
	});
}
async function pushFile(listingId, file, kind) {
	const max = kind === "preview" ? PREVIEW_MAX : FILE_MAX;
	if (file.size > max) throw new Error(kind === "preview" ? `«${file.name}» больше 2 МБ` : `«${file.name}» больше 4 МБ`);
	if (file.size < 32) throw new Error("Файл пустой");
	if (file.type.startsWith("image/")) {
		const bmp = await createImageBitmap(file);
		const { width, height } = bmp;
		bmp.close();
		if (width > 4e3 || height > 4e3) throw new Error(`«${file.name}» больше ${MAX_DIM}×${MAX_DIM}`);
	} else if (kind === "preview") throw new Error("Превью — только PNG, JPG, WEBP или GIF");
	const b64 = await readB64(file);
	await uploadMedia({ data: {
		listingId,
		kind,
		filename: file.name,
		b64
	} });
}
function SellPage() {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-64 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SellForm, {});
}
function SellForm() {
	const navigate = useNavigate();
	const [title, setTitle] = (0, import_react.useState)("");
	const [blurb, setBlurb] = (0, import_react.useState)("");
	const [kind, setKind] = (0, import_react.useState)("auction");
	const [price, setPrice] = (0, import_react.useState)("1500");
	const [buyNow, setBuyNow] = (0, import_react.useState)("");
	const [durationHours, setDurationHours] = (0, import_react.useState)(24);
	const [antiSnipeMinutes, setAntiSnipeMinutes] = (0, import_react.useState)(3);
	const [tags, setTags] = (0, import_react.useState)([]);
	const [previews, setPreviews] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [note, setNote] = (0, import_react.useState)("");
	async function onSubmit(e) {
		e.preventDefault();
		setBusy(true);
		setNote("");
		try {
			const created = await createListing({ data: {
				title,
				blurb,
				privateDescription: "",
				kind,
				price: Number(price),
				buyNow: kind === "auction" && buyNow.trim() ? Number(buyNow) : null,
				durationHours,
				antiSnipeMinutes,
				tags
			} });
			const queue = previews.map((file) => ({
				file,
				kind: "preview"
			}));
			for (let i = 0; i < queue.length; i += 1) {
				setNote(`Файл ${i + 1} из ${queue.length}`);
				await pushFile(created.id, queue[i].file, queue[i].kind);
			}
			toast.success("Лот на ленте");
			await navigate({
				to: "/lot/$id",
				params: { id: created.id }
			});
		} catch (err) {
			toast.error(errText(err));
			setBusy(false);
			setNote("");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => void onSubmit(e),
		className: "mx-auto grid max-w-2xl gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "new lot" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-5xl leading-none",
				children: "выставить."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Название", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: title,
					onChange: (e) => setTitle(e.target.value),
					required: true,
					minLength: 3,
					maxLength: 80,
					className: `${fieldClass} mt-1`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Коротко на карточке", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: blurb,
					onChange: (e) => setBlurb(e.target.value),
					maxLength: 400,
					rows: 3,
					className: `${fieldClass} mt-1 py-2`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setKind("auction"),
					className: kind === "auction" ? "min-h-11 border border-wine bg-wine px-4 text-foam" : "min-h-11 border border-ink/25 px-4",
					children: "Аукцион"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setKind("fixed"),
					className: kind === "fixed" ? "min-h-11 border border-wine bg-wine px-4 text-foam" : "min-h-11 border border-ink/25 px-4",
					children: "Фикс"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: [kind === "auction" ? "Стартовая цена, ₽" : "Цена, ₽", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: price,
					onChange: (e) => setPrice(e.target.value),
					inputMode: "numeric",
					required: true,
					className: `${fieldClass} mt-1 tabular-nums`
				})]
			}),
			kind === "auction" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: ["Купить сейчас, ₽ — необязательно, выше старта", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: buyNow,
						onChange: (e) => setBuyNow(e.target.value),
						inputMode: "numeric",
						className: `${fieldClass} mt-1 tabular-nums`
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
					className: "text-sm",
					children: "Длительность"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-2",
					children: DURATIONS.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setDurationHours(d.hours),
						className: durationHours === d.hours ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3",
						children: d.label
					}, d.hours))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
					className: "text-sm",
					children: "Антиснайп: ставка в последние минуты продлевает аукцион на столько же"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-2",
					children: SNIPE_OPTIONS.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setAntiSnipeMinutes(n),
						className: antiSnipeMinutes === n ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3",
						children: [n, " мин"]
					}, n))
				})] })
			] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-sm",
				children: "Теги"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagField, {
				tags,
				onChange: setTags
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Превью, до 4 штук, до 2 МБ, до 4000×4000", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					accept: "image/png,image/jpeg,image/webp,image/gif",
					multiple: true,
					className: "mt-2 block w-full text-sm",
					onChange: (e) => setPreviews(Array.from(e.target.files ?? []).slice(0, 4))
				})]
			}),
			previews.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-muted",
				children: previews.map((f) => f.name).join(", ")
			}) : null,
			note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs",
				children: note
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				variant: "wine",
				disabled: busy,
				children: busy ? "Публикуем…" : "Опубликовать"
			})
		]
	});
}
//#endregion
export { SellPage as component };
