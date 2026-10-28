import { o as __toESM } from "../_runtime.mjs";
import { E as roleLabel, T as providerLabel, d as badgeLabel, m as errText, v as formatWhen, x as listingStatusLabel } from "./shared-BOwre9E3.mjs";
import { C as useNavigate, Q as require_react, T as require_jsx_runtime, _ as Outlet, m as useRouterState, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as useCurrentUserState, d as adminModerate, f as adminOverview } from "./router-C0f7r3aH.mjs";
import { a as fieldClass, r as Kicker, t as Button } from "./ui-bits-Bj54c0jH.mjs";
import { t as RedirectToSignIn } from "./gates-CUxTjxua.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-DiJmNxYY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DealSearch() {
	const navigate = useNavigate();
	const [no, setNo] = (0, import_react.useState)("");
	function onSubmit(e) {
		e.preventDefault();
		const value = Number(no.trim().replace(/^#/, ""));
		if (!Number.isInteger(value) || value < 1) {
			toast.error("Введите номер сделки, например 1042");
			return;
		}
		navigate({
			to: "/admin/deal/$no",
			params: { no: String(value) }
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "flex flex-wrap items-end gap-2",
		onSubmit,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "block min-w-52 flex-1 text-sm",
			children: ["Номер сделки", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: no,
				onChange: (e) => setNo(e.target.value),
				inputMode: "numeric",
				placeholder: "1042",
				className: `${fieldClass} mt-1 tabular-nums`
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "submit",
			variant: "wine",
			children: "Открыть переписку"
		})]
	});
}
var ROLES = [
	"user",
	"moderator",
	"admin"
];
function InvitePanel({ data, act }) {
	const [note, setNote] = (0, import_react.useState)("");
	const [maxUses, setMaxUses] = (0, import_react.useState)("1");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-3 border border-ink/20 bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Инвайт-коды"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-prose text-sm text-muted",
					children: data.requireInvite ? "Сейчас новый аккаунт создаётся только с кодом. Уже существующие входы код не спрашивают." : "Сейчас регистрироваться можно без кода. Переключатель включает обязательность в любой момент."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: data.requireInvite ? "wine" : "line",
					onClick: () => void act({
						action: "set-require-invite",
						enabled: !data.requireInvite
					}),
					children: data.requireInvite ? "Выключить обязательность" : "Сделать код обязательным"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-wrap items-end gap-2",
				onSubmit: (e) => {
					e.preventDefault();
					act({
						action: "create-invite",
						maxUses: Number(maxUses),
						note: note.trim()
					});
					setNote("");
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block min-w-40 flex-1 text-sm",
						children: ["Заметка", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: note,
							onChange: (e) => setNote(e.target.value),
							maxLength: 80,
							className: `${fieldClass} mt-1`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block w-28 text-sm",
						children: ["Использований", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: maxUses,
							onChange: (e) => setMaxUses(e.target.value),
							inputMode: "numeric",
							className: `${fieldClass} mt-1 tabular-nums`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "ink",
						children: "Сгенерировать"
					})
				]
			}),
			data.invites.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Кодов пока нет."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-ink/10 border-y border-ink/15",
				children: data.invites.map((invite) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center gap-3 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "font-mono text-sm hover:underline",
							onClick: () => {
								navigator.clipboard.writeText(invite.code).then(() => toast.success("Код скопирован"), () => toast.error("Не удалось скопировать"));
							},
							children: invite.code
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-xs tabular-nums text-muted",
							children: [
								invite.uses,
								"/",
								invite.maxUses
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate text-sm text-muted",
							children: invite.note
						}),
						invite.revoked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs",
							children: "отозван"
						}) : null,
						!invite.revoked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => void act({
								action: "revoke-invite",
								inviteId: invite.id
							}),
							children: "Отозвать"
						}) : null
					]
				}, invite.id))
			})
		]
	});
}
function AdminPage() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { user, isPending } = useCurrentUserState();
	const [data, setData] = (0, import_react.useState)(null);
	const child = pathname.startsWith("/admin/");
	const load = () => {
		adminOverview().then(setData).catch((err) => {
			if (err instanceof Error && /модерац/i.test(err.message)) setData("deny");
			else toast.error(errText(err));
		});
	};
	(0, import_react.useEffect)(() => {
		if (user && !child) load();
	}, [user, child]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	if (child) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
	if (data === "deny") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Это не ваша панель"
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse bg-soft" });
	async function act(input) {
		try {
			await adminModerate({ data: input });
			toast.success("code" in input && input.action === "create-invite" ? "Код создан — он в списке ниже" : "Готово");
			load();
		} catch (err) {
			toast.error(errText(err));
		}
	}
	const admin = data.viewerRole === "admin";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: data.viewerRole }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-5xl leading-none",
					children: "модерация."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-prose text-sm text-muted",
					children: admin ? "Вы администратор: жалобы, снятие лотов, ограничения, роли и инвайт-коды. Переписку сделки можно открыть по номеру." : "Вы модератор: жалобы, снятие лотов, ограничение участников и чтение переписки по номеру сделки. Роли и инвайты меняет только администратор."
				})
			] }),
			admin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvitePanel, {
				data,
				act
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DealSearch, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					["Лоты", data.counts.listings],
					["Сделки", data.counts.deals],
					["Жалобы", data.counts.openReports],
					["Люди", data.counts.users]
				].map(([label, n]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border border-ink/20 bg-card p-3",
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
						children: "Сделки"
					}),
					data.deals.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: "Сделок пока нет."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-ink/10 border-y border-ink/15",
						children: data.deals.map((deal) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex flex-wrap items-center gap-3 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/admin/deal/$no",
									params: { no: String(deal.publicNo) },
									className: "font-mono text-sm hover:underline",
									children: ["#", deal.publicNo]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 flex-1 truncate",
									children: deal.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-xs text-muted",
									children: [
										"@",
										deal.sellerHandle,
										" → @",
										deal.buyerHandle
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs",
									children: deal.status
								})
							]
						}, deal.id))
					})
				]
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
							className: "border border-ink/20 bg-card p-3",
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
											variant: "wine",
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
					className: "divide-y divide-ink/10 border-y border-ink/15",
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
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Люди"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Последние 80 профилей. Смена роли доступна только администратору и не для самого себя."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-ink/10 border-y border-ink/15",
						children: data.users.map((person) => {
							const self = person.userId === user.id;
							const canBan = !self && (admin || person.role === "user");
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex flex-wrap items-center gap-3 py-3",
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
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-xs text-muted",
										children: person.providers.length ? person.providers.map((id) => providerLabel(id)).join(", ") : "вход не записан"
									}),
									admin && !self ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "sr-only",
											children: ["Роль @", person.handle]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											className: `${fieldClass} w-auto min-w-36`,
											value: person.role,
											onChange: (e) => {
												const role = e.target.value;
												if (role === person.role) return;
												act({
													action: "set-role",
													userId: person.userId,
													role
												});
											},
											children: ROLES.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
												value: role,
												children: [
													role,
													" — ",
													roleLabel(role)
												]
											}, role))
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "border border-ink/25 px-2 py-1 font-mono text-xs",
										children: person.role
									}),
									admin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex flex-wrap gap-1",
										children: ["verified", "top"].map((badge) => {
											const on = person.badges.includes(badge);
											const next = on ? person.badges.filter((b) => b !== badge) : [...person.badges, badge];
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: on ? "min-h-9 border border-wine bg-wine px-2 font-mono text-xs text-foam" : "min-h-9 border border-ink/25 px-2 font-mono text-xs",
												onClick: () => void act({
													action: "set-badges",
													userId: person.userId,
													badges: next
												}),
												children: badgeLabel(badge)
											}, badge);
										})
									}) : null,
									person.banned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "border border-wine px-2 py-1 font-mono text-xs text-foam",
										children: "ban"
									}) : null,
									canBan ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
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
							}, person.userId);
						})
					})
				]
			})
		]
	});
}
//#endregion
export { AdminPage as component };
