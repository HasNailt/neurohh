import { T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Kicker } from "./ui-bits-CmDk6NHP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rules-CNCnd5bX.js
var import_jsx_runtime = require_jsx_runtime();
var RULES = [
	["Что продаём", "Готовых персонажей и адопты: дизайн, который автор вправе передать. Не чужие работы, не трейсы без прав, не контент с реальными людьми без их согласия."],
	["Лот", "Аукцион или фиксированная цена. Короткий текст и превью видны всем. Полные файлы через площадку не передаются."],
	["Теги", "Их ставите вы. «Человек» и «человек» — один тег. Не спамьте тегами не по делу."],
	["Аукцион", "Ставка в последние выбранные минуты продлевает конец на столько же. «Купить сейчас», если продавец его указал, закрывает торги сразу."],
	["Оплата", "AdoptAI деньги не принимает и не хранит. Вы договариваетесь вне площадки, в чате сделки."],
	["Лайки", "Лайк можно поставить на аукцион и на фикс. В рекомендациях участвуют только активные аукционы: больше лайков и ставок — выше шанс."],
	["Сделка", "Чат сделки нумеруется. Закрыть её может любая сторона. Деньги площадка не проводит."],
	["Модерация", "Жалоба на лот уходит в панель. Модератор и администратор смотрят жалобы, снимают лоты, ограничивают участников и читают переписку сделки по её номеру. Роли и инвайт-коды назначает только администратор. Первый зарегистрированный аккаунт становится администратором. Если инвайт включён, новый аккаунт без кода не создаётся."]
];
function RulesPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-2xl space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "house rules" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-2 font-display text-5xl leading-none",
			children: "правила."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "space-y-4",
			children: RULES.map(([title, body], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "border-t border-ink/15 pt-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-muted",
						children: String(i + 1).padStart(2, "0")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-muted",
						children: body
					})
				]
			}, title))
		})]
	});
}
//#endregion
export { RulesPage as component };
