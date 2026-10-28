import { o as __toESM } from "../_runtime.mjs";
import { E as roleLabel, O as statusLabel, d as badgeLabel, m as errText, v as formatWhen, w as profileImageUrl, y as isStaff } from "./shared-BOwre9E3.mjs";
import { Q as require_react, T as require_jsx_runtime, w as useRouter, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as getMe, b as deleteProfileComment, c as useCurrentUserState, r as Route$4, u as addProfileComment } from "./router-C0f7r3aH.mjs";
import { a as fieldClass, n as Frame, r as Kicker, t as Button } from "./ui-bits-Bj54c0jH.mjs";
import { t as ListingCardView } from "./listing-card-6zCqGLom.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/u._handle-eLm5b-Bk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const profile = Route$4.useLoaderData();
	if (!profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Такого профиля нет"
	});
	const letter = (profile.displayName.trim()[0] || profile.handle[0] || "A").toLocaleUpperCase("ru");
	const bg = profile.hasBackground ? profileImageUrl(profile.handle, "background") : "";
	const banner = profile.hasBanner ? profileImageUrl(profile.handle, "banner") : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "relative z-0 overflow-hidden border border-ink/20",
				style: bg ? {
					backgroundImage: `url(${bg})`,
					backgroundSize: "cover",
					backgroundPosition: "center"
				} : void 0,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: bg ? "bg-paper/80" : "bg-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-36 border-b border-ink/15 sm:h-48",
						style: banner ? {
							backgroundImage: `linear-gradient(to top, rgba(19,18,17,0.55), transparent 45%), url(${banner})`,
							backgroundSize: "cover",
							backgroundPosition: "center"
						} : void 0,
						children: [
							banner ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-[linear-gradient(135deg,#6B1E3A_0%,#131211_55%,#1a1917_100%)]" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute top-3 left-3 h-3 w-3 border-t border-l border-foam/70" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute top-3 right-3 h-3 w-3 border-t border-r border-foam/70" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.22em] text-foam/80 uppercase",
								children: ["artist file // ", profile.handle]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative px-4 pt-0 pb-5 sm:px-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "-mt-10 flex flex-wrap items-end justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-end gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative grid size-24 place-items-center overflow-hidden border border-wine bg-wine-deep sm:size-28",
										children: [
											profile.hasAvatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: profileImageUrl(profile.handle, "avatar"),
												alt: "",
												className: "h-full w-full object-cover"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-display text-5xl leading-none text-foam",
												children: letter
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-foam" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pointer-events-none absolute -right-px -bottom-px h-2.5 w-2.5 border-r border-b border-foam" })
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "pb-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
											className: "font-display text-4xl leading-none sm:text-5xl",
											children: profile.displayName
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 font-mono text-sm text-muted",
											children: ["@", profile.handle]
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileActions, { handle: profile.handle })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex flex-wrap items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "border border-wine/80 bg-wine px-2 py-1 font-mono text-xs text-foam",
										children: statusLabel(profile.status)
									}),
									profile.badges.map((badge) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "border border-ink/30 px-2 py-1 font-mono text-xs",
										children: badgeLabel(badge)
									}, badge)),
									profile.role !== "user" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "border border-ink/30 px-2 py-1 font-mono text-xs",
										children: roleLabel(profile.role)
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono text-xs text-muted",
										suppressHydrationWarning: true,
										children: ["на площадке с ", formatWhen(profile.createdAt)]
									})
								]
							}),
							profile.bio ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 max-w-prose whitespace-pre-wrap",
								children: profile.bio
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-sm text-muted",
								children: "Описание пока пустое."
							}),
							profile.links.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-4 flex flex-wrap gap-2",
								children: profile.links.map((link) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: link.url,
									target: "_blank",
									rel: "noreferrer",
									className: "inline-flex min-h-9 items-center border border-ink/25 px-3 text-sm hover:border-wine",
									children: link.label
								}) }, `${link.label}-${link.url}`))
							}) : null
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LotShelf, {
				kicker: "pinned",
				title: "закреплено.",
				items: profile.pinned,
				empty: null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LotShelf, {
				kicker: "live",
				title: "в продаже.",
				items: profile.active,
				empty: "Активных лотов нет."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LotShelf, {
				kicker: "archive",
				title: "завершённые.",
				items: profile.done,
				empty: "Завершённых лотов нет."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Comments, { profile })
		]
	});
}
function LotShelf({ kicker, title, items, empty }) {
	if (items.length === 0 && !empty) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: kicker }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-1 font-display text-3xl leading-none",
			children: title
		})] }), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: empty
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-8 sm:grid-cols-2 lg:grid-cols-3",
			children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListingCardView, {
				item,
				showPrice: false
			}, item.id))
		})]
	});
}
function ProfileActions({ handle }) {
	const { user } = useCurrentUserState();
	const [me, setMe] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!user) {
			setMe(null);
			return;
		}
		getMe().then(setMe).catch(() => void 0);
	}, [user]);
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/login",
		className: "inline-flex min-h-11 items-center border border-wine bg-wine px-4 text-foam",
		children: "Чат"
	});
	if (me?.handle === handle) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/me",
		className: "inline-flex min-h-11 items-center border border-ink/30 px-4",
		children: "Править профиль"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/chats",
		search: { with: handle },
		className: "inline-flex min-h-11 items-center border border-wine bg-wine px-4 text-foam",
		children: "Чат"
	});
}
function Comments({ profile }) {
	const { user, isPending } = useCurrentUserState();
	const router = useRouter();
	const [me, setMe] = (0, import_react.useState)(null);
	const [body, setBody] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!user) {
			setMe(null);
			return;
		}
		getMe().then(setMe).catch(() => void 0);
	}, [user]);
	const own = me?.handle === profile.handle;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-2 font-display text-3xl leading-none",
			children: "стена."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4 bg-card p-4",
			children: [profile.comments.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Пока тихо. Зарегистрированные участники могут оставить заметку."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-ink/10",
				children: profile.comments.map((comment) => {
					const canDelete = me && (comment.authorHandle === me.handle || isStaff(me.role));
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "py-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/u/$handle",
										params: { handle: comment.authorHandle },
										className: "hover:text-ink",
										children: ["@", comment.authorHandle]
									}),
									" · ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										suppressHydrationWarning: true,
										children: formatWhen(comment.createdAt)
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 whitespace-pre-wrap",
								children: comment.body
							}),
							canDelete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "mt-1 font-mono text-xs text-muted hover:text-ink",
								disabled: busy,
								onClick: () => {
									setBusy(true);
									deleteProfileComment({ data: comment.id }).then(() => router.invalidate()).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
								},
								children: "Удалить"
							}) : null
						]
					}, comment.id);
				})
			}), isPending ? null : !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/login",
				className: "inline-flex min-h-11 items-center border border-wine px-4 text-sm",
				children: "Войти, чтобы комментировать"
			}) : own ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Свой профиль комментировать нельзя — это стена для других участников."
			}) : me?.banned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Аккаунт ограничен, комментарии недоступны."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "space-y-2 border-t border-ink/15 pt-4",
				onSubmit: (e) => {
					e.preventDefault();
					const text = body.trim();
					if (!text) return;
					setBusy(true);
					addProfileComment({ data: {
						handle: profile.handle,
						body: text
					} }).then(async () => {
						setBody("");
						toast.success("Комментарий оставлен");
						await router.invalidate();
					}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: [
						"Заметка для @",
						profile.handle,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: body,
							onChange: (e) => setBody(e.target.value),
							rows: 3,
							maxLength: 500,
							className: `${fieldClass} mt-1 py-2`,
							placeholder: "Коротко и по делу"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					variant: "wine",
					disabled: busy || body.trim().length === 0,
					children: "Оставить комментарий"
				})]
			})]
		}) })]
	});
}
//#endregion
export { ProfilePage as component };
