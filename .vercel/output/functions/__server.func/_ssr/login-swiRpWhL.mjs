import { o as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as signIn, t as authClient } from "./client-Hb_FAdbz.mjs";
import { t as GROK_PROVIDERS } from "./server-BKPVAAcp.mjs";
import { k as useCurrentUserState } from "./router-C6OEj4kx.mjs";
import { a as fieldClass, r as Kicker, t as Button } from "./ui-bits-C-7Hshvo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-swiRpWhL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function mapAuth(message) {
	if (/already|exist/i.test(message)) return "Такой email уже зарегистрирован";
	if (/invalid email or password/i.test(message)) return "Неверный email или пароль";
	if (/password/i.test(message) && /8|short|least|characters/i.test(message)) return "Пароль — минимум 8 символов";
	if (/invalid email/i.test(message)) return "Проверьте email";
	return message;
}
function LoginPage() {
	const { user, isPending } = useCurrentUserState();
	const [mode, setMode] = (0, import_react.useState)("up");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function onSubmit(e) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		try {
			if (mode === "up") {
				const res = await authClient.signUp.email({
					email: email.trim(),
					password,
					name: name.trim() || email.split("@")[0] || "Художник"
				});
				if (res.error) throw new Error(res.error.message || "Не получилось");
			} else {
				const res = await authClient.signIn.email({
					email: email.trim(),
					password
				});
				if (res.error) throw new Error(res.error.message || "Не получилось");
			}
			window.location.href = "/";
		} catch (err) {
			setError(mapAuth(err instanceof Error ? err.message : "Не получилось"));
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-md gap-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "insert coin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-2 font-display text-5xl leading-none",
			children: "вход."
		})] }), isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" }) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Вы уже вошли. ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/",
			search: {
				q: "",
				tag: "",
				kind: "all",
				sort: "new",
				page: 1
			},
			className: "underline",
			children: "На ленту"
		})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: mode === "up" ? "min-h-11 bg-ink px-4 text-paper" : "min-h-11 border border-ink/20 px-4",
					onClick: () => setMode("up"),
					children: "Регистрация"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: mode === "in" ? "min-h-11 bg-ink px-4 text-paper" : "min-h-11 border border-ink/20 px-4",
					onClick: () => setMode("in"),
					children: "Вход"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => void onSubmit(e),
				className: "space-y-3",
				children: [
					mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Имя", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: name,
							onChange: (e) => setName(e.target.value),
							className: `${fieldClass} mt-1`,
							maxLength: 40
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Email", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							required: true,
							autoComplete: "email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							className: `${fieldClass} mt-1`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Пароль", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "password",
							required: true,
							minLength: 8,
							autoComplete: mode === "up" ? "new-password" : "current-password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							className: `${fieldClass} mt-1`
						})]
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "acid",
						disabled: busy,
						className: "w-full",
						children: busy ? "Секунду…" : mode === "up" ? "Создать аккаунт" : "Войти"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-muted",
					children: "ИЛИ"
				}), GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "line",
					className: "w-full",
					onClick: () => void signIn(p.providerId, { callbackURL: "/" }),
					children: ["Продолжить с ", p.label]
				}, p.providerId))]
			})
		] })]
	});
}
//#endregion
export { LoginPage as component };
