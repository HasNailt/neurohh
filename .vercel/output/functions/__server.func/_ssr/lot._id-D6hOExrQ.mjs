import { o as __toESM } from "../_runtime.mjs";
import { C as useRouter, S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as errText, f as formatBytes, h as formatWhen, m as formatPrice } from "./shared-DmOvjmfI.mjs";
import { i as Lock } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as reportListing, E as updateListingCopy, S as placeBid, _ as getListing, d as cancelListing, h as deleteMedia, k as useCurrentUserState, l as buyFixed, r as Route$3, u as buyNow } from "./router-C6OEj4kx.mjs";
import { a as fieldClass, i as StatusChip, n as Frame, r as Kicker, t as Button } from "./ui-bits-C-7Hshvo.mjs";
import { n as pushFile } from "./client-upload-BgO9H1Jv.mjs";
import { t as TagField } from "./tag-field-IX1izUG7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/lot._id-D6hOExrQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LotPage() {
	const initial = Route$3.useLoaderData();
	const { id } = Route$3.useParams();
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
						className: "border border-ink/20 px-2 py-1 font-mono text-xs hover:bg-acid",
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
				mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerTools, {
					lot,
					onChange: (next) => setLot(next)
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockedNote, {})
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
						variant: "acid",
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
					lot.status === "active" && !mine && user && lot.kind === "auction" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
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
							variant: "acid",
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
						className: "inline-flex min-h-11 items-center rounded-full bg-acid px-4 font-medium",
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
				className: "space-y-2",
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
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: ["Пожаловаться", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: reason,
						onChange: (e) => setReason(e.target.value),
						rows: 3,
						className: `${fieldClass} mt-1 py-2`
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					variant: "ghost",
					disabled: busy,
					children: "Отправить"
				})]
			}) : null]
		})]
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
		const letter = (lot.title.trim()[0] || "G").toLocaleUpperCase("ru");
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "poster grid place-items-center bg-acid",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-display text-8xl leading-none",
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
function LockedNote() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-3 bg-card p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "mt-1 size-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-2xl leading-none",
			children: "полное описание закрыто"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Файлы и текст откроются в чате сделки, когда и покупатель, и продавец нажмут «Оплата прошла»."
		})] })]
	}) });
}
function OwnerTools({ lot, onChange }) {
	const [title, setTitle] = (0, import_react.useState)(lot.title);
	const [blurb, setBlurb] = (0, import_react.useState)(lot.blurb);
	const [priv, setPriv] = (0, import_react.useState)(lot.privateDescription ?? "");
	const [tags, setTags] = (0, import_react.useState)(lot.tags.map((t) => t.label));
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setTitle(lot.title);
		setBlurb(lot.blurb);
		setPriv(lot.privateDescription ?? "");
		setTags(lot.tags.map((t) => t.label));
	}, [lot]);
	if (lot.status !== "active") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bg-card p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "ваши закрытые материалы" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 whitespace-pre-wrap",
			children: lot.privateDescription
		})]
	}) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "space-y-3 bg-acid/40 p-4",
			onSubmit: (e) => {
				e.preventDefault();
				setBusy(true);
				updateListingCopy({ data: {
					id: lot.id,
					title,
					blurb,
					privateDescription: priv,
					tags
				} }).then(() => getListing({ data: lot.id })).then((next) => {
					if (next) onChange(next);
					toast.success("Текст обновлён");
				}).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "видно только вам, пока нет двойного подтверждения" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: ["Название", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: title,
						onChange: (e) => setTitle(e.target.value),
						className: `${fieldClass} mt-1`
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: ["Коротко", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: blurb,
						onChange: (e) => setBlurb(e.target.value),
						rows: 3,
						className: `${fieldClass} mt-1 py-2`
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: ["Полное описание", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: priv,
						onChange: (e) => setPriv(e.target.value),
						rows: 5,
						className: `${fieldClass} mt-1 py-2`
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagField, {
					tags,
					onChange: setTags
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: busy,
					children: "Сохранить текст"
				})
			]
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileManager, {
			lot,
			onChange
		})]
	});
}
function FileManager({ lot, onChange }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function refresh() {
		const next = await getListing({ data: lot.id });
		if (next) onChange(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Frame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3 bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kicker, { children: "файлы для покупателя" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "space-y-2",
				children: [(lot.files ?? []).map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 truncate",
						children: [
							file.filename,
							" · ",
							formatBytes(file.sizeBytes)
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "shrink-0 underline",
						disabled: busy,
						onClick: () => {
							setBusy(true);
							deleteMedia({ data: file.id }).then(refresh).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
						},
						children: "убрать"
					})]
				}, file.id)), (lot.files ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-sm text-muted",
					children: "Полных файлов пока нет."
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Добавить превью", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					accept: "image/png,image/jpeg,image/webp,image/gif",
					className: "mt-1 block w-full text-sm",
					onChange: (e) => {
						const file = e.target.files?.[0];
						e.target.value = "";
						if (!file) return;
						setBusy(true);
						pushFile(lot.id, file, "preview").then(refresh).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
					}
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-sm",
				children: ["Добавить полный файл", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					accept: "image/png,image/jpeg,image/webp,image/gif,.psd,.zip,application/zip",
					className: "mt-1 block w-full text-sm",
					onChange: (e) => {
						const file = e.target.files?.[0];
						e.target.value = "";
						if (!file) return;
						setBusy(true);
						pushFile(lot.id, file, "file").then(refresh).catch((err) => toast.error(errText(err))).finally(() => setBusy(false));
					}
				})]
			})
		]
	}) });
}
//#endregion
export { LotPage as component };
