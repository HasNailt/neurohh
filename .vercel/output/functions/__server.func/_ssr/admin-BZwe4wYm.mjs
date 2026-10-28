import { o as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as errText, h as formatWhen, y as listingStatusLabel } from "./shared-DmOvjmfI.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as adminOverview, k as useCurrentUserState, o as RedirectToSignIn, s as adminModerate } from "./router-C6OEj4kx.mjs";
import { r as Kicker, t as Button } from "./ui-bits-C-7Hshvo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BZwe4wYm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminPage() {
	const { user, isPending } = useCurrentUserState();
	const [data, setData] = (0, import_react.useState)(null);
	const load = () => {
		adminOverview().then(setData).catch((err) => {
			if (err instanceof Error && /модерац/i.test(err.message)) setData("deny");
			else toast.error(errText(err));
		});
	};
	(0, import_react.useEffect)(() => {
		if (user) load();
	}, [user]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	if (data === "deny") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Это не ваша панель"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" });
	async function act(input) {
		try {
			await adminModerate({ data: input });
			toast.success("Готово");
			load();
		} catch (err) {
			toast.error(errText(err));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "mod" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-5xl leading-none",
				children: "модерация."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					["Лоты", data.counts.listings],
					["Сделки", data.counts.deals],
					["Жалобы", data.counts.openReports],
					["Люди", data.counts.users]
				].map(([label, n]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border border-ink/15 bg-card p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-mono text-xs text-muted",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "font-display text-3xl tabular-nums",
						children: n
					})]
				}, String(label)))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Жалобы"
					}),
					data.reports.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: "Открытых нет."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-3",
						children: data.reports.map((report) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "border border-ink/15 bg-card p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: report.reason }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 font-mono text-xs text-muted",
									children: [
										"@",
										report.reporterHandle,
										report.listingTitle ? ` · ${report.listingTitle}` : "",
										" ·",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											suppressHydrationWarning: true,
											children: formatWhen(report.createdAt)
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex flex-wrap gap-2",
									children: [
										report.listingId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: "/lot/$id",
											params: { id: report.listingId },
											className: "inline-flex min-h-11 items-center underline",
											children: "Лот"
										}) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "line",
											onClick: () => void act({
												action: "dismiss-report",
												reportId: report.id
											}),
											children: "Отклонить"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "ink",
											onClick: () => void act({
												action: "action-report",
												reportId: report.id
											}),
											children: "Снять лот"
										})
									]
								})
							]
						}, report.id))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Свежие лоты"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-ink/10 border-y border-ink/10",
					children: data.listings.map((lot) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex flex-wrap items-center gap-3 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/lot/$id",
								params: { id: lot.id },
								className: "min-w-0 flex-1 truncate hover:underline",
								children: lot.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-xs",
								children: ["@", lot.handle]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs",
								children: listingStatusLabel(lot.status)
							}),
							lot.status !== "sold" && lot.status !== "removed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "ghost",
								onClick: () => void act({
									action: "remove-listing",
									listingId: lot.id
								}),
								children: "Снять"
							}) : null
						]
					}, lot.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Люди"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-ink/10 border-y border-ink/10",
					children: data.users.map((person) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex flex-wrap items-center gap-3 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/u/$handle",
								params: { handle: person.handle },
								className: "hover:underline",
								children: ["@", person.handle]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm text-muted",
								children: person.displayName
							}),
							person.isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs",
								children: "admin"
							}) : null,
							person.banned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "bg-ink px-2 py-1 font-mono text-xs text-paper",
								children: "ban"
							}) : null,
							!person.isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "line",
								onClick: () => void act({
									action: "ban",
									userId: person.userId,
									banned: !person.banned
								}),
								children: person.banned ? "Разбанить" : "Ограничить"
							}) : null
						]
					}, person.userId))
				})]
			})
		]
	});
}
//#endregion
export { AdminPage as component };
