import { o as __toESM } from "../_runtime.mjs";
import { C as useRouter, Z as require_react, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as errText } from "./shared-DmOvjmfI.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { D as updateProfile, k as useCurrentUserState, o as RedirectToSignIn, v as getMe } from "./router-C6OEj4kx.mjs";
import { a as fieldClass, r as Kicker, t as Button } from "./ui-bits-C-7Hshvo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/me-9f6sSh7g.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MePage() {
	const { user, isPending } = useCurrentUserState();
	const [me, setMe] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		getMe().then(setMe).catch(() => void 0);
	}, [user]);
	if (isPending || user && !me) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-48 animate-pulse bg-soft" });
	if (!user || !me) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Editor, { me });
}
function Editor({ me }) {
	const router = useRouter();
	const [handle, setHandle] = (0, import_react.useState)(me.handle);
	const [displayName, setDisplayName] = (0, import_react.useState)(me.displayName);
	const [bio, setBio] = (0, import_react.useState)(me.bio);
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "mx-auto grid max-w-lg gap-4",
		onSubmit: (e) => {
			e.preventDefault();
			setBusy(true);
			updateProfile({ data: {
				handle,
				displayName,
				bio
			} }).then(async () => {
				toast.success("Профиль сохранён");
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
				me.isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-xs",
					children: "модератор площадки"
				}) : null
			] }),
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
				children: ["О себе", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: bio,
					onChange: (e) => setBio(e.target.value),
					rows: 4,
					maxLength: 400,
					className: `${fieldClass} mt-1 py-2`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				variant: "acid",
				disabled: busy,
				children: "Сохранить"
			})
		]
	});
}
//#endregion
export { MePage as component };
