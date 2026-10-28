import { o as __toESM } from "../_runtime.mjs";
import { Q as require_react, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { t as authClient } from "./client-DR-0POrg.mjs";
import { W as createSsrRpc, c as useCurrentUserState } from "./router-v_n_Ojj0.mjs";
import { a as fieldClass, r as Kicker, t as Button } from "./ui-bits-KhP-aorX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-Tiy2KUhK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Why an email/password sign-in was rejected. Does not say whether the password itself matched. */
var credentialHint = createServerFn({ method: "POST" }).validator((input) => {
	const email = input && typeof input === "object" && "email" in input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
	if (!email.includes("@") || email.length > 200) throw new Error("Проверьте email");
	return { email };
}).handler(createSsrRpc("80133309cd4d7186e3f2df9fbb3ce0e6320406d8a93b1dbb28a8c6bbedcf517c"));
var CODE_RE = /^[A-Z0-9-]{6,32}$/;
function normalizeInviteCode(raw) {
	return raw.trim().toUpperCase().replace(/\s+/g, "");
}
/** Remember a code in an httpOnly cookie so the sign-up hook can consume it. */
var stageInvite = createServerFn({ method: "POST" }).validator((input) => {
	const code = normalizeInviteCode(input && typeof input === "object" && "code" in input ? String(input.code ?? "") : "");
	if (!CODE_RE.test(code)) throw new Error("Некорректный инвайт-код");
	return { code };
}).handler(createSsrRpc("c32f4f331fe2aace766d43554d57798533a4ee57bc15ee1bfe7f068982c3df91"));
/** Public login flags. Secrets stay on the server; the bot id is not a secret. */
var getLoginOptions = createServerFn({ method: "GET" }).handler(createSsrRpc("b517f5ad972c1aa831bbe1260449848404a0c228a2467c2769c8187d68b55d68"));
function mapAuth(message) {
	if (/invite|инвайт/i.test(message)) return message;
	if (/already|exist/i.test(message)) return "Такой email уже зарегистрирован";
	if (/invalid email or password/i.test(message)) return "Неверный email или пароль";
	if (/password/i.test(message) && /8|short|least|characters/i.test(message)) return "Пароль — минимум 8 символов";
	if (/invalid email/i.test(message)) return "Проверьте email";
	return message;
}
function LoginPage() {
	const { user, isPending } = useCurrentUserState();
	const [mode, setMode] = (0, import_react.useState)("up");
	const [invite, setInvite] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [options, setOptions] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		getLoginOptions().then(setOptions).catch(() => setOptions({ requireInvite: false }));
	}, []);
	(0, import_react.useEffect)(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("error") ?? "";
		const detail = params.get("error_description") ?? "";
		if (/invite|инвайт|forbidden/i.test(`${code} ${detail}`)) setError("Для нового аккаунта нужен действующий инвайт-код");
	}, []);
	async function stageIfNeeded(mustHaveCode) {
		if (!options?.requireInvite) return;
		const code = invite.trim();
		if (!code) {
			if (mustHaveCode) throw new Error("Для регистрации нужен инвайт-код");
			return;
		}
		await stageInvite({ data: { code } });
	}
	async function onSubmit(e) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const emailValue = String(form.get("email") ?? "").trim().toLowerCase();
		const passwordValue = String(form.get("password") ?? "");
		const nameValue = String(form.get("name") ?? "").trim();
		setError(null);
		setBusy(true);
		try {
			if (!emailValue.includes("@")) throw new Error("Проверьте email");
			if (passwordValue.length < 8) throw new Error("Пароль — минимум 8 символов");
			if (mode === "up") {
				await stageIfNeeded(true);
				const res = await authClient.signUp.email({
					email: emailValue,
					password: passwordValue,
					name: nameValue || emailValue.split("@")[0] || "Художник"
				});
				if (res.error) throw new Error(res.error.message || "Не получилось");
				const again = await authClient.signIn.email({
					email: emailValue,
					password: passwordValue
				});
				if (again.error) throw new Error(again.error.message || "Не получилось");
			} else {
				const res = await authClient.signIn.email({
					email: emailValue,
					password: passwordValue
				});
				if (res.error) throw new Error(res.error.message || "Не получилось");
			}
			window.location.href = "/";
		} catch (err) {
			const message = err instanceof Error ? err.message : "Не получилось";
			if (/invalid email or password/i.test(message)) {
				if ((await credentialHint({ data: { email: emailValue } }).catch(() => null))?.kind === "social") {
					setError("Для этого адреса пароль не задан. Войдите по email, для которого задавали пароль на сайте.");
					setBusy(false);
					return;
				}
			}
			setError(mapAuth(message));
			setBusy(false);
		}
	}
	const selected = "min-h-11 border border-wine bg-wine px-4 text-foam";
	const idle = "min-h-11 border border-ink/25 px-4";
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
			options?.requireInvite ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: [
					"Инвайт-код",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: invite,
						onChange: (e) => setInvite(e.target.value),
						autoComplete: "off",
						spellCheck: false,
						placeholder: "GLYPH-XXXX-XXXX",
						className: `${fieldClass} mt-1 font-mono uppercase`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 block text-xs text-muted",
						children: "Новым аккаунтам нужен код от администратора. Если вы уже регистрировались — оставьте поле пустым."
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: mode === "up" ? selected : idle,
					onClick: () => setMode("up"),
					children: "Регистрация"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: mode === "in" ? selected : idle,
					onClick: () => setMode("in"),
					children: "Вход"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => void onSubmit(e),
				className: "space-y-3",
				autoComplete: "on",
				children: [
					mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Имя", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "name",
							autoComplete: "name",
							className: `${fieldClass} mt-1`,
							maxLength: 40
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Email", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "email",
							type: "email",
							required: true,
							autoComplete: "email",
							autoCapitalize: "none",
							autoCorrect: "off",
							spellCheck: false,
							inputMode: "email",
							className: `${fieldClass} mt-1`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Пароль", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "password",
							type: "password",
							required: true,
							minLength: 8,
							maxLength: 128,
							autoComplete: mode === "up" ? "new-password" : "current-password",
							autoCapitalize: "none",
							autoCorrect: "off",
							spellCheck: false,
							className: `${fieldClass} mt-1`
						})]
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "wine",
						disabled: busy,
						className: "w-full",
						children: busy ? "Секунду…" : mode === "up" ? "Создать аккаунт" : "Войти по email"
					})
				]
			})
		] })]
	});
}
//#endregion
export { LoginPage as component };
