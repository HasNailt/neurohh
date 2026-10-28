import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Kicker } from "./ui-bits-C-7Hshvo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/terms-D0Nbiq59.js
var import_jsx_runtime = require_jsx_runtime();
function TermsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-2xl space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "terms" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-5xl leading-none",
					children: "условия."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: "Коротко и по делу. Это не замена совету юриста, но правила пользования площадкой."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Площадка",
				children: "GLYPH даёт место для лотов, ставок и чата сделки. Мы не сторона договора купли-продажи и не платёжный агент."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Аккаунт",
				children: "Вы отвечаете за доступ к аккаунту. Один человек — один основной профиль. Ник не должен притворяться чужим именем."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Контент",
				children: "Вы загружаете только то, чем вправе распоряжаться. Превью мы показываем на ленте. Полные файлы и закрытое описание отдаём покупателю после того, как обе стороны подтвердили оплату. Размещая лот, вы даёте площадке право показать превью и публичный текст."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Деньги",
				children: "Перевод происходит вне GLYPH. Кнопка «Оплата прошла» — ваше общее подтверждение, не банковская гарантия. Споры о переводе вы решаете между собой; модерация смотрит только на нарушения правил площадки."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Снятие лотов",
				children: "Мы можем скрыть лот или ограничить аккаунт, если есть жалоба, очевидное воровство работы или попытка обойти закрытость файлов."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Ответственность",
				children: "Сервис даётся как есть. Мы не обещаем, что вторая сторона оплатит или что файл окажется тем, чего вы ждали. Смотрите превью и переписку до подтверждения."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm",
				children: [
					"Домашние правила — на странице ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/rules",
						className: "underline",
						children: "«Правила»"
					}),
					"."
				]
			})
		]
	});
}
function Section({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "border-t border-ink/15 pt-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-2xl",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-muted",
			children
		})]
	});
}
//#endregion
export { TermsPage as component };
