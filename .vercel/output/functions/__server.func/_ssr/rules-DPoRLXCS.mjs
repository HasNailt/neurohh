import { w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Kicker } from "./ui-bits-C-7Hshvo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rules-DPoRLXCS.js
var import_jsx_runtime = require_jsx_runtime();
var RULES = [
	["Что продаём", "Готовых персонажей и адопты: дизайн, который автор вправе передать. Не чужие работы, не трейсы без прав, не контент с реальными людьми без их согласия."],
	["Лот", "Аукцион или фиксированная цена. Короткий текст виден всем. Полное описание и файлы — нет."],
	["Теги", "Их ставите вы. «Человек» и «человек» — один тег. Не спамьте тегами не по делу."],
	["Аукцион", "Ставка в последние выбранные минуты продлевает конец на столько же. «Купить сейчас», если продавец его указал, закрывает торги сразу."],
	["Оплата", "GLYPH деньги не принимает и не хранит. Вы договариваетесь вне площадки. В чате сделки обе стороны нажимают «Оплата прошла»."],
	["Файлы", "Покупатель скачивает их только после двойного подтверждения. Лимит полного файла — 4 МБ и 4000×4000 для изображений и PSD. Превью — до 2 МБ."],
	["Сделка", "Статусы: ожидание оплаты, подтверждение обеих сторон, выдача файлов, завершение. Закрыть сделку можно после выдачи файлов."],
	["Модерация", "Жалоба на лот уходит в панель. Модерация может снять лот или ограничить аккаунт. Первый зарегистрированный аккаунт получает права модератора."]
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
