import { o as __toESM } from "../_runtime.mjs";
import { _ as formatPrice, m as errText, v as formatWhen, y as isStaff } from "./shared-CQ2SO6Dv.mjs";
import { C as useNavigate, Q as require_react, T as require_jsx_runtime, w as useRouter, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as getListing, N as placeBid, P as reportListing, c as useCurrentUserState, h as cancelListing, i as Route$5, l as addListingComment, m as buyNow, p as buyFixed, w as getMe, y as deleteListingComment, z as toggleLike } from "./router-DXl6og3F.mjs";
import { a as fieldClass, i as StatusChip, n as Frame, r as Kicker, t as Button } from "./ui-bits-KhP-aorX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/lot._id-BDGqXHRJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LotPage() {
	const initial = Route$5.useLoaderData();
	const { id } = Route$5.useParams();
	const router = useRouter();
	const navigate = useNavigate();
	const { user } = useCurrentUserState();
	const [lot, setLot] = (0, import_react.useState)(initial);
	const [missing, setMissing] = (0, import_react.useState)(initial == null);
	const [amount, setAmount] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [armed, setArmed] = (0, import_react.useState)(null);
	const [reason, setReason] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setLot(initial);
		setMissing(initial == null);
	}, [initial]);
	(0, import_react.useEffect)(() => {
		if (!lot || lot.kind !== "auction" || lot.status !== "active") return;
		const timer = window.setInterval(() => {
			getListing({ data: id }).then((next) => {
				if (next) setLot(next);
			});
		}, 6e3);
		return () => window.clearInterval(timer);
	}, [
		id,
		lot?.kind,
		lot?.status
	]);
	if (missing || !lot) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Лот не найден"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/",
		search: {
			q: "",
			tag: "",
			kind: "all",
			sort: "new",
			page: 1
		},
		className: "mt-4 inline-flex underline",
		children: "На ленту"
	})] });
	const mine = user?.id === lot.sellerId;
	const minBid = lot.currentBid != null ? lot.currentBid + 1 : lot.price;
	const showPrice = lot.kind === "auction" ? lot.currentBid ?? lot.price : lot.price;
	async function run(action, ok) {
		setBusy(true);
		try {
			await action();
			toast.success(ok);
			await router.invalidate();
			const next = await getListing({ data: id });
			if (next) setLot(next);
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
			setArmed(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gallery, { lot }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: lot.kind === "auction" ? "auction lot" : "fixed lot" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-4xl leading-none sm:text-5xl",
						children: lot.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/u/$handle",
								params: { handle: lot.sellerHandle },
								className: "text-ink underline",
								children: ["@", lot.sellerHandle]
							}),
							" · ",
							lot.sellerName
						]
					})
				] }),
				lot.blurb ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "max-w-prose text-lg",
					children: lot.blurb
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LikeRow, {
					lot,
					onChange: setLot
				}),
				mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/studio",
					className: "inline-flex text-sm underline",
					children: "Править в моих лотах"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: lot.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						search: {
							q: "",
							tag: tag.slug,
							kind: "all",
							sort: "new",
							page: 1
						},
						className: "border border-ink/25 px-2 py-1 font-mono text-xs hover:border-wine hover:bg-wine/20",
						children: tag.label
					}, tag.slug))
				}),
				lot.kind === "auction" && lot.bids.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "ставки" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 divide-y divide-ink/10",
						children: lot.bids.map((bid) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between gap-3 py-2 font-mono text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["@", bid.handle] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums",
									children: formatPrice(bid.amount)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									suppressHydrationWarning: true,
									children: formatWhen(bid.createdAt)
								})
							]
						}, bid.id))
					})]
				}) }) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LotComments, {
					lot,
					onChange: setLot
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "space-y-4 lg:sticky lg:top-4 lg:self-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 bg-card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusChip, {
							kind: "listing",
							status: lot.status
						}), lot.kind === "auction" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-xs",
							children: [
								"anti-snipe ",
								lot.antiSnipeMinutes,
								"м"
							]
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-4xl tabular-nums",
						children: formatPrice(showPrice)
					}),
					lot.kind === "auction" && lot.currentBid != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: ["Старт был ", formatPrice(lot.price)]
					}) : null,
					lot.kind === "auction" && lot.endsAt && lot.status === "active" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-sm",
						children: ["До конца: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Live, { endsAt: lot.endsAt })]
					}) : null,
					lot.dealId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/deals/$id",
						params: { id: lot.dealId },
						className: "inline-flex min-h-11 items-center underline",
						children: "Открыть сделку"
					}) : null,
					lot.status === "active" && !mine && user && lot.kind === "fixed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "wine",
						disabled: busy,
						className: "w-full",
						onClick: () => {
							if (armed !== "buy") {
								setArmed("buy");
								return;
							}
							run(async () => {
								const res = await buyFixed({ data: lot.id });
								await navigate({
									to: "/deals/$id",
									params: { id: res.dealId }
								});
							}, "Сделка открыта");
						},
						children: armed === "buy" ? "Подтвердить покупку" : `Купить за ${formatPrice(lot.price)}`
					}) : null,
					lot.status === "active" && user && lot.kind === "auction" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Это ваш аукцион — ставку от своего имени поставить можно."
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "space-y-2",
							onSubmit: (e) => {
								e.preventDefault();
								run(() => placeBid({ data: {
									listingId: lot.id,
									amount: Number(amount)
								} }), "Ставка принята");
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-sm",
								children: [
									"Ставка от ",
									formatPrice(minBid),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: amount,
										onChange: (e) => setAmount(e.target.value),
										inputMode: "numeric",
										className: `${fieldClass} mt-1 tabular-nums`
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: busy,
								className: "w-full",
								children: "Поставить"
							})]
						}),
						lot.buyNow != null && (lot.currentBid == null || lot.currentBid < lot.buyNow) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "wine",
							disabled: busy,
							className: "w-full",
							onClick: () => {
								if (armed !== "now") {
									setArmed("now");
									return;
								}
								run(async () => {
									const res = await buyNow({ data: lot.id });
									await navigate({
										to: "/deals/$id",
										params: { id: res.dealId }
									});
								}, "Выкупили сразу");
							},
							children: armed === "now" ? "Подтвердить" : `Купить сейчас ${formatPrice(lot.buyNow)}`
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								"Ставка в последние ",
								lot.antiSnipeMinutes,
								" мин продлевает аукцион на ",
								lot.antiSnipeMinutes,
								" мин."
							]
						})
					] }) : null,
					lot.status === "active" && !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						className: "inline-flex min-h-11 items-center border border-wine bg-wine px-4 font-medium text-foam",
						children: "Войти, чтобы купить"
					}) : null,
					mine && lot.status === "active" && lot.bidCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "line",
						disabled: busy,
						onClick: () => {
							if (armed !== "cancel") {
								setArmed("cancel");
								return;
							}
							run(async () => {
								await cancelListing({ data: lot.id });
								await navigate({
									to: "/",
									search: {
										q: "",
										tag: "",
										kind: "all",
										sort: "new",
										page: 1
									}
								});
							}, "Лот снят");
						},
						children: armed === "cancel" ? "Точно снять" : "Снять лот"
					}) : null
				]
			}) }), !mine && user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "space-y-2 border border-ink/20 p-3",
				onSubmit: (e) => {
					e.preventDefault();
					run(async () => {
						await reportListing({ data: {
							listingId: lot.id,
							reason
						} });
						setReason("");
					}, "Жалоба ушла модерации");
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "жалоба на лот" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Причина", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: reason,
							onChange: (e) => setReason(e.target.value),
							rows: 3,
							maxLength: 500,
							className: `${fieldClass} mt-1 py-2`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "ghost",
						disabled: busy || reason.trim().length < 4,
						children: "Отправить жалобу"
					})
				]
			}) : null]
		})]
	});
}
function LikeRow({ lot, onChange }) {
	const { user } = useCurrentUserState();
	const [busy, setBusy] = (0, import_react.useState)(false);
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/login",
		className: "inline-flex min-h-11 items-center border border-ink/25 px-3 font-mono text-xs",
		children: ["лайк ", lot.likeCount]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		disabled: busy,
		className: lot.liked ? "inline-flex min-h-11 items-center border border-wine bg-wine px-3 font-mono text-xs text-foam" : "inline-flex min-h-11 items-center border border-ink/25 px-3 font-mono text-xs",
		onClick: () => {
			setBusy(true);
			toggleLike({ data: lot.id }).then(async (res) => {
				const next = await getListing({ data: lot.id });
				if (next) onChange(next);
				else onChange({
					...lot,
					liked: res.liked,
					likeCount: lot.likeCount + (res.liked ? 1 : -1)
				});
			}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
		},
		children: [
			lot.liked ? "лайк есть" : "лайк",
			" ",
			lot.likeCount
		]
	});
}
function LotComments({ lot, onChange }) {
	const { user, isPending } = useCurrentUserState();
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
	async function refresh() {
		const next = await getListing({ data: lot.id });
		if (next) onChange(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "комментарии лота" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3 bg-card p-4",
			children: [lot.comments.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Пока без комментариев."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-ink/10",
				children: lot.comments.map((comment) => {
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
									deleteListingComment({ data: comment.id }).then(refresh).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
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
			}) : me?.banned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Аккаунт ограничен, комментарии недоступны."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "space-y-2 border-t border-ink/15 pt-3",
				onSubmit: (e) => {
					e.preventDefault();
					const text = body.trim();
					if (!text) return;
					setBusy(true);
					addListingComment({ data: {
						listingId: lot.id,
						body: text
					} }).then(async () => {
						setBody("");
						await refresh();
					}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: body,
					onChange: (e) => setBody(e.target.value),
					rows: 3,
					maxLength: 500,
					placeholder: "Комментарий к лоту",
					className: `${fieldClass} py-2`
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					variant: "wine",
					disabled: busy || body.trim().length === 0,
					children: "Комментировать"
				})]
			})]
		}) })]
	});
}
function Live({ endsAt }) {
	const [text, setText] = (0, import_react.useState)("···");
	(0, import_react.useEffect)(() => {
		const tick = () => {
			const ms = new Date(endsAt).getTime() - Date.now();
			if (ms <= 0) {
				setText("00:00:00");
				return;
			}
			const s = Math.floor(ms / 1e3);
			const d = Math.floor(s / 86400);
			const h = Math.floor(s % 86400 / 3600);
			const m = Math.floor(s % 3600 / 60);
			const sec = s % 60;
			const pad = (n) => String(n).padStart(2, "0");
			setText(d > 0 ? `${d}д ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`);
		};
		tick();
		const id = window.setInterval(tick, 1e3);
		return () => window.clearInterval(id);
	}, [endsAt]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "tabular-nums",
		children: text
	});
}
function Gallery({ lot }) {
	const [active, setActive] = (0, import_react.useState)(lot.previews[0]?.id ?? "");
	(0, import_react.useEffect)(() => {
		setActive(lot.previews[0]?.id ?? "");
	}, [lot.id, lot.previews]);
	if (!active) {
		const letter = (lot.title.trim()[0] || "A").toLocaleUpperCase("ru");
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "poster grid place-items-center bg-wine-deep",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-display text-8xl leading-none text-foam",
				children: letter
			})
		}) });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: `/api/media/${active}`,
			alt: lot.title,
			className: "max-h-[70vh] w-full bg-soft object-contain"
		}) }), lot.previews.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-2 overflow-x-auto",
			children: lot.previews.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setActive(p.id),
				className: p.id === active ? "border-2 border-ink" : "border border-ink/20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: `/api/media/${p.id}`,
					alt: "",
					className: "h-16 w-14 object-cover"
				})
			}, p.id))
		}) : null]
	});
}
//#endregion
export { LotPage as component };
