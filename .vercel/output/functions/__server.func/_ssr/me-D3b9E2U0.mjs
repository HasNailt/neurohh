import { o as __toESM } from "../_runtime.mjs";
import { Q as require_react, T as require_jsx_runtime, w as useRouter, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as statusLabel, E as profileImageUrl, O as roleLabel, f as badgeLabel, h as errText } from "./shared-ChezZ8eT.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { B as updateProfile, C as getMe, H as uploadProfileImage, W as useCurrentUserState, c as RedirectToSignIn, g as clearProfileImage } from "./router-C8EjHOuq.mjs";
import { a as fieldClass, r as Kicker, t as Button } from "./ui-bits-CmDk6NHP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/me-D3b9E2U0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STATUSES = [
	"open",
	"busy",
	"closed",
	"away"
];
function MePage() {
	const { user, isPending } = useCurrentUserState();
	const [me, setMe] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		getMe().then(setMe).catch(() => void 0);
	}, [user]);
	if (isPending || user && !me) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-48 animate-pulse bg-soft" });
	if (!user || !me) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Editor, {
		me,
		onSaved: setMe
	});
}
function fileToB64(file) {
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
function Editor({ me, onSaved }) {
	const router = useRouter();
	const [handle, setHandle] = (0, import_react.useState)(me.handle);
	const [displayName, setDisplayName] = (0, import_react.useState)(me.displayName);
	const [bio, setBio] = (0, import_react.useState)(me.bio);
	const [status, setStatus] = (0, import_react.useState)(me.status);
	const [links, setLinks] = (0, import_react.useState)(me.links.length ? me.links : [{
		label: "",
		url: ""
	}]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [stamp, setStamp] = (0, import_react.useState)(Date.now());
	async function saveImage(kind, file) {
		if (!file) return;
		setBusy(true);
		try {
			const b64 = await fileToB64(file);
			await uploadProfileImage({ data: {
				kind,
				b64
			} });
			onSaved(await getMe());
			setStamp(Date.now());
			toast.success("Кадр обновлён");
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "mx-auto grid max-w-xl gap-4",
		onSubmit: (e) => {
			e.preventDefault();
			setBusy(true);
			updateProfile({ data: {
				handle,
				displayName,
				bio,
				status,
				links: links.filter((l) => l.label.trim() || l.url.trim())
			} }).then(async () => {
				toast.success("Профиль сохранён");
				onSaved(await getMe());
				await router.invalidate();
			}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "you" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-5xl leading-none",
					children: "профиль."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 font-mono text-xs text-muted",
					children: ["роль: ", roleLabel(me.role)]
				}),
				me.badges.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-xs text-muted",
					children: me.badges.map(badgeLabel).join(" · ")
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs text-muted",
					children: "Значки «Проверенный» и «Топ-продавец» выдаёт администратор."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/u/$handle",
					params: { handle: me.handle },
					className: "mt-2 inline-flex text-sm underline",
					children: "Открыть публичную страницу"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageSlot, {
				label: "Аватар, до 500 КБ",
				kind: "avatar",
				has: me.hasAvatar,
				handle: me.handle,
				stamp,
				busy,
				onFile: (file) => void saveImage("avatar", file),
				onClear: () => {
					setBusy(true);
					clearProfileImage({ data: "avatar" }).then(() => getMe()).then((next) => {
						onSaved(next);
						setStamp(Date.now());
					}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageSlot, {
				label: "Баннер шапки, до 1.2 МБ",
				kind: "banner",
				has: me.hasBanner,
				handle: me.handle,
				stamp,
				busy,
				onFile: (file) => void saveImage("banner", file),
				onClear: () => {
					setBusy(true);
					clearProfileImage({ data: "banner" }).then(() => getMe()).then(onSaved).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageSlot, {
				label: "Фон профиля, отдельно от баннера, до 1.2 МБ",
				kind: "background",
				has: me.hasBackground,
				handle: me.handle,
				stamp,
				busy,
				onFile: (file) => void saveImage("background", file),
				onClear: () => {
					setBusy(true);
					clearProfileImage({ data: "background" }).then(() => getMe()).then(onSaved).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Ник", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: handle,
					onChange: (e) => setHandle(e.target.value),
					className: `${fieldClass} mt-1`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Имя", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: displayName,
					onChange: (e) => setDisplayName(e.target.value),
					className: `${fieldClass} mt-1`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Статус", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: status,
					onChange: (e) => setStatus(e.target.value),
					className: `${fieldClass} mt-1`,
					children: STATUSES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: item,
						children: statusLabel(item)
					}, item))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["О себе", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: bio,
					onChange: (e) => setBio(e.target.value),
					rows: 4,
					maxLength: 400,
					className: `${fieldClass} mt-1 py-2`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
						className: "text-sm",
						children: "Ссылки"
					}),
					links.map((link, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 sm:grid-cols-[8rem_1fr]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: link.label,
							placeholder: "Подпись",
							maxLength: 24,
							onChange: (e) => {
								const next = links.slice();
								next[index] = {
									...link,
									label: e.target.value
								};
								setLinks(next);
							},
							className: fieldClass
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: link.url,
							placeholder: "https://",
							maxLength: 200,
							onChange: (e) => {
								const next = links.slice();
								next[index] = {
									...link,
									url: e.target.value
								};
								setLinks(next);
							},
							className: fieldClass
						})]
					}, index)),
					links.length < 5 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "font-mono text-xs underline",
						onClick: () => setLinks([...links, {
							label: "",
							url: ""
						}]),
						children: "Ещё ссылка"
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				variant: "wine",
				disabled: busy,
				children: "Сохранить"
			})
		]
	});
}
function ImageSlot({ label, kind, has, handle, stamp, busy, onFile, onClear }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2 border border-ink/15 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm",
				children: label
			}),
			has ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: `${profileImageUrl(handle, kind)}&v=${stamp}`,
				alt: "",
				className: "max-h-28 w-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-muted",
				children: "пусто"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "file",
				accept: "image/png,image/jpeg,image/webp,image/gif",
				disabled: busy,
				className: "block w-full text-sm",
				onChange: (e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					onFile(file);
				}
			}),
			has ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "font-mono text-xs underline",
				disabled: busy,
				onClick: onClear,
				children: "Убрать"
			}) : null
		]
	});
}
//#endregion
export { MePage as component };
