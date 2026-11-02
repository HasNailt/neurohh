import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageZoom } from "@/components/image-zoom";
import { PreviewImg } from "@/components/preview-img";
import { Button, fieldClass, Frame, Kicker, StatusChip } from "@/components/ui-bits";
import { EmojiBar } from "@/components/emoji-bar";
import { FormatBar, RichText } from "@/components/rich-text";
import { Nick } from "@/components/nick";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addListingComment,
  buyFixed,
  buyNow,
  closeAuctionEarly,
  getListing,
  placeBid,
  reportListing,
  toggleLike,
} from "@/lib/market/server";
import { engineLabel, errText, formatPrice, formatWhen, payLabel, type ListingDetail } from "@/lib/market/shared";

function snipeLabel(minutes: number): string {
  if (minutes <= 0) return "антиснайп выключен";
  if (minutes === 60) return "антиснайп 1 час";
  if (minutes === 1440) return "антиснайп 24 часа";
  return `антиснайп ${minutes} мин`;
}

export const Route = createFileRoute("/lot/$id")({
  loader: ({ params }) => getListing({ data: params.id }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} — AdoptAI` : "Лот — AdoptAI" }],
  }),
  component: LotPage,
});

function LotPage() {
  const lot = Route.useLoaderData();
  if (!lot) {
    return (
      <div className="space-y-3">
        <Kicker>404</Kicker>
        <h1 className="font-display text-5xl leading-none">лот не найден.</h1>
        <Link to="/" search={{ q: "", tag: "", kind: "all", pay: "", sort: "new", page: 1 }} className="font-mono text-sm text-muted hover:text-ink">
          в ленту
        </Link>
      </div>
    );
  }
  return <LotView lot={lot} />;
}

function LotView({ lot }: { lot: ListingDetail }) {
  const { user } = useCurrentUserState();
  const router = useRouter();
  const navigate = useNavigate();
  const mine = user?.id === lot.sellerId;
  const live = lot.status === "active";
  const [liked, setLiked] = useState(lot.liked);
  const [likes, setLikes] = useState(lot.likeCount);
  const [bid, setBid] = useState("");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const commentRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const step = Math.max(1, lot.bidStep || 1);
  const floor = lot.currentBid == null ? lot.price : lot.currentBid + step;
  const mixed = lot.currency === "sw" && lot.buyNowCurrency === "rub";
  const showBuyNow =
    live && !mine && lot.kind === "auction" && lot.buyNow != null && (mixed || lot.currentBid == null || lot.currentBid < lot.buyNow);

  async function run(job: () => Promise<void>) {
    setBusy(true);
    try {
      await job();
      await router.invalidate();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <div className="space-y-6">
        <Gallery lot={lot} />
        <div className="border border-ink/20 bg-card p-4">
          <Kicker>{lot.kind === "auction" ? "auction" : "fixed"}</Kicker>
          <h1 className="mt-2 font-display text-2xl leading-tight">
            <RichText text={lot.title} />
          </h1>
          {engineLabel(lot.engine) ? <p className="mt-2 font-mono text-xs tracking-widest text-muted uppercase">{engineLabel(lot.engine)}</p> : null}
          <p className="mt-3 whitespace-pre-wrap text-base text-ink/90">
            {lot.blurb ? <RichText text={lot.blurb} /> : "Без короткого описания."}
          </p>
          <p className="mt-3 text-base text-ink/90">
            <Nick handle={lot.sellerHandle} premium={lot.sellerPremium} />
            <span className="text-muted">
              {" · "}
              {formatWhen(lot.createdAt)}
              {lot.kind === "auction" ? ` · ${snipeLabel(lot.antiSnipeMinutes)}` : ""}
            </span>
          </p>
          {mine && lot.privateDescription ? (
            <p className="mt-3 border border-ink/15 bg-card px-3 py-2 text-sm text-muted">Для вас: {lot.privateDescription}</p>
          ) : null}
          {lot.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lot.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  to="/"
                  search={{ q: "", tag: tag.slug, kind: "all", pay: "", sort: "new", page: 1 }}
                  className="border border-ink/25 px-2 py-1 font-mono text-xs hover:border-wine"
                >
                  {tag.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <section className="space-y-3">
          <Kicker>notes</Kicker>
          <ul className="space-y-2">
            {lot.comments.length === 0 ? <li className="text-sm text-muted">Комментариев пока нет.</li> : null}
            {lot.comments.map((item) => (
              <li key={item.id} className="border border-ink/15 bg-card px-3 py-2">
                <p className="font-mono text-xs text-muted">
                  <Nick handle={item.authorHandle} premium={item.authorPremium} />
                  {" · "}
                  {formatWhen(item.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  <RichText text={item.body} />
                </p>
              </li>
            ))}
          </ul>
          {user ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const body = comment.trim();
                if (!body) return;
                void run(async () => {
                  await addListingComment({ data: { listingId: lot.id, body } });
                  setComment("");
                });
              }}
            >
              <EmojiBar up onPick={(emoji) => setComment((value) => value + emoji)} />
              <FormatBar inputRef={commentRef} value={comment} onChange={setComment} />
              <input ref={commentRef} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий" className={`${fieldClass} min-w-0 flex-1`} />
              <Button type="submit" variant="line" disabled={busy}>
                ок
              </Button>
            </form>
          ) : (
            <Link to="/login" className="font-mono text-xs text-muted hover:text-ink">
              войдите, чтобы комментировать
            </Link>
          )}
        </section>
      </div>
      <aside className="space-y-4">
        <Frame>
          <div className="space-y-3 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <StatusChip kind="listing" status={lot.status} />
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 border border-ink/25 px-3 font-mono text-lg leading-none"
                onClick={() => {
                  if (!user) {
                    toast.error("Войдите, чтобы отметить лот");
                    return;
                  }
                  void run(async () => {
                    const res = await toggleLike({ data: lot.id });
                    setLiked(res.liked);
                    setLikes((n) => n + (res.liked ? 1 : -1));
                  });
                }}
              >
                {liked ? "♥" : "♡"} {Math.max(0, likes)}
              </button>
            </div>
            <p className="font-display text-4xl tabular-nums leading-none">
              {lot.kind === "auction"
                ? formatPrice(lot.currentBid ?? lot.price, lot.currency)
                : formatPrice(
                    Math.min(
                      ...lot.slots.filter((slot) => slot.status === "open").map((slot) => slot.price),
                      lot.slots[0]?.price ?? lot.price,
                    ),
                    lot.currency,
                  )}
            </p>
            <p className="font-mono text-xs text-muted">{payLabel(lot.currency)}</p>
            {lot.status === "sold" && lot.buyerHandles ? (
              <p className="font-mono text-sm">
                {lot.buyerHandles.includes(", ") ? "выкупили " : "выкупил "}
                {lot.buyerHandles.split(", ").map((handle, index) => (
                  <span key={handle}>
                    {index > 0 ? ", " : null}
                    <Nick handle={handle} />
                  </span>
                ))}
              </p>
            ) : null}
            {lot.kind === "auction" ? (
              <>
                <p className="font-mono text-xs text-muted">
                  старт {formatPrice(lot.price, lot.currency)}
                  {" · "}шаг {formatPrice(step, lot.currency)}
                  {lot.bidCount > 0 ? ` · ${lot.bidCount} став.` : ""}
                  {lot.buyNow != null ? ` · автовыкуп ${formatPrice(lot.buyNow, lot.buyNowCurrency)}` : ""}
                </p>
                {mixed ? <p className="font-mono text-xs text-muted">Ставки в SW. Автовыкуп в ₽.</p> : null}
              </>
            ) : null}
            {lot.kind === "auction" && lot.endsAt && live ? <Countdown endsAt={lot.endsAt} /> : null}
            {lot.dealId && user ? (
              <Link to="/deals/$id" params={{ id: lot.dealId }} className="inline-flex font-mono text-sm text-wine hover:underline">
                открыть сделку
              </Link>
            ) : null}
            {live && lot.kind === "auction" && user ? (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const amount = Number(bid);
                  void run(async () => {
                    const res = await placeBid({ data: { listingId: lot.id, amount } });
                    toast.success(res.extended ? "Ставка принята, аукцион продлён" : "Ставка принята");
                    setBid("");
                  });
                }}
              >
                <input
                  value={bid}
                  onChange={(e) => setBid(e.target.value)}
                  inputMode="numeric"
                  placeholder={`от ${formatPrice(floor, lot.currency)}`}
                  className={`${fieldClass} tabular-nums`}
                />
                <Button type="submit" disabled={busy} className="w-full">
                  {user && lot.currentBidderId === user.id ? "Перебить свою" : mine ? "Своя ставка" : "Поставить"}
                </Button>
                <p className="font-mono text-xs text-muted">
                  {lot.currentBid == null
                    ? `Первая ставка не ниже ${formatPrice(floor, lot.currency)}.`
                    : `Новая ставка не ниже ${formatPrice(floor, lot.currency)} — текущая плюс шаг.`}
                </p>
              </form>
            ) : null}
            {live && mine && lot.kind === "auction" ? (
              <Button
                variant="line"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  const ask = lot.bidCount > 0
                    ? "Закрыть аукцион сейчас и открыть сделку по текущей ставке?"
                    : "Закрыть аукцион без ставок?";
                  if (!window.confirm(ask)) return;
                  void run(async () => {
                    const res = await closeAuctionEarly({ data: lot.id });
                    toast.success(res.dealId ? "Аукцион закрыт, сделка открыта" : "Аукцион закрыт");
                    if (res.dealId) await navigate({ to: "/deals/$id", params: { id: res.dealId } });
                  });
                }}
              >
                Закрыть досрочно
              </Button>
            ) : null}
            {showBuyNow ? (
              <Button
                variant="wine"
                className="w-full"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const res = await buyNow({ data: lot.id });
                    toast.success("Лот ваш");
                    await navigate({ to: "/deals/$id", params: { id: res.dealId } });
                  })
                }
              >
                Купить сейчас · {formatPrice(lot.buyNow ?? 0, lot.buyNowCurrency)}
              </Button>
            ) : null}
            {lot.kind === "fixed" ? (
              <ul className="space-y-2">
                {lot.slots.map((slot, index) => (
                  <li key={slot.id} className="border border-ink/15 p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p>
                        <span className="font-mono text-xs text-muted">{index + 1}. </span>
                        <RichText text={slot.title} />
                      </p>
                      <span className="font-mono tabular-nums">{formatPrice(slot.price, lot.currency)}</span>
                    </div>
                    {slot.status === "sold" ? (
                      <p className="mt-2 font-mono text-xs text-muted">
                        Продано
                        {slot.buyerHandle ? (
                          <>
                            {" · выкупил "}
                            <Nick handle={slot.buyerHandle} premium={slot.buyerPremium} />
                          </>
                        ) : null}
                      </p>
                    ) : live && user && !mine ? (
                      <Button
                        className="mt-2 w-full"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const res = await buyFixed({
                              data: slot.id === lot.id ? lot.id : { id: lot.id, itemId: slot.id },
                            });
                            toast.success("Позиция ваша");
                            await navigate({ to: "/deals/$id", params: { id: res.dealId } });
                          })
                        }
                      >
                        Выкупить
                      </Button>
                    ) : (
                      <p className="mt-2 font-mono text-xs text-muted">{live ? "Свободно" : "Недоступно"}</p>
                    )}
                    {slot.dealId ? (
                      <Link to="/deals/$id" params={{ id: slot.dealId }} className="mt-2 inline-flex font-mono text-xs text-wine hover:underline">
                        открыть сделку
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {!user && live ? (
              <Link to="/login" className="block text-center font-mono text-xs text-muted hover:text-ink">
                войдите, чтобы участвовать
              </Link>
            ) : null}
          </div>
        </Frame>
        {lot.kind === "auction" && lot.bids.length > 0 ? (
          <Frame>
            <div className="bg-card p-4">
              <Kicker>bids</Kicker>
              <ul className="mt-3 space-y-2 text-base">
                {lot.bids.map((row) => (
                  <li key={row.id} className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-2 last:border-0">
                    <Link to="/u/$handle" params={{ handle: row.handle }} className="hover:text-ink">
                      {row.premium ? <span className="star">★ </span> : null}
                      <span className={row.premium ? "text-[#e6c36a]" : undefined}>@{row.handle}</span>
                    </Link>
                    <span className="font-mono text-lg tabular-nums">{formatPrice(row.amount, lot.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Frame>
        ) : null}
        {user && !mine ? (
          <div>
            <button type="button" className="font-mono text-xs text-muted hover:text-ink" onClick={() => setReportOpen((v) => !v)}>
              пожаловаться
            </button>
            {reportOpen ? (
              <form
                className="mt-2 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await reportListing({ data: { listingId: lot.id, reason } });
                    setReason("");
                    setReportOpen(false);
                    toast.success("Жалоба отправлена");
                  });
                }}
              >
                <div className="flex items-end gap-2">
                  <EmojiBar up onPick={(emoji) => setReason((value) => value + emoji)} />
                  <FormatBar inputRef={reasonRef} value={reason} onChange={setReason} />
                  <textarea ref={reasonRef} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${fieldClass} min-w-0 flex-1 py-2`} placeholder="Что не так с лотом" />
                </div>
                <Button type="submit" variant="line" disabled={busy}>
                  отправить
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Gallery({ lot }: { lot: ListingDetail }) {
  const [active, setActive] = useState(lot.previews[0]?.id ?? "");
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    setActive(lot.previews[0]?.id ?? "");
  }, [lot.id, lot.previews]);
  const letter = (lot.title.trim()[0] || "A").toLocaleUpperCase("ru");
  const current = lot.previews.find((p) => p.id === active) ?? lot.previews[0];
  if (!current) {
    return (
      <Frame>
        <div className="poster grid place-items-center bg-wine-deep">
          <span className="font-display text-8xl leading-none text-foam">{letter}</span>
        </div>
      </Frame>
    );
  }
  const fallback = (
    <div className="poster grid place-items-center bg-wine-deep">
      <span className="font-display text-8xl leading-none text-foam">{letter}</span>
    </div>
  );
  const index = Math.max(0, lot.previews.findIndex((p) => p.id === current.id));
  const step = (dir: -1 | 1) => {
    const next = lot.previews[(index + dir + lot.previews.length) % lot.previews.length];
    if (next) setActive(next.id);
  };
  return (
    <div className="space-y-2">
      <Frame>
        <div className="relative">
          <button type="button" className="block w-full" onClick={() => setZoom(true)} aria-label="Открыть картинку">
            <PreviewImg
              id={current.id}
              src={current.src || current.card}
              variant="view"
              alt={lot.title}
              className="max-h-[70vh] w-full bg-soft object-contain"
              fallback={fallback}
            />
          </button>
          {lot.previews.length > 1 ? (
            <>
              <button type="button" onClick={() => step(-1)} className="absolute top-1/2 left-2 min-h-11 min-w-11 -translate-y-1/2 border border-ink/30 bg-paper/90 font-mono text-sm" aria-label="Предыдущая">
                ‹
              </button>
              <button type="button" onClick={() => step(1)} className="absolute top-1/2 right-2 min-h-11 min-w-11 -translate-y-1/2 border border-ink/30 bg-paper/90 font-mono text-sm" aria-label="Следующая">
                ›
              </button>
            </>
          ) : null}
        </div>
      </Frame>
      <ImageZoom open={zoom} onClose={() => setZoom(false)}>
        <PreviewImg
          id={current.id}
          src={current.src || current.card}
          variant="view"
          alt={lot.title}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </ImageZoom>
      {lot.previews.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {lot.previews.map((p) => (
            <button key={p.id} type="button" onClick={() => setActive(p.id)} className={p.id === active ? "border-2 border-ink" : "border border-ink/20"}>
              <PreviewImg id={p.id} src={p.card || p.src} alt="" className="h-16 w-14 object-cover" />
              <span className="block px-1 py-0.5 text-center font-mono text-[10px]">{p.cover ? "Обложка" : "Ещё"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [text, setText] = useState("···");
  useEffect(() => {
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) {
        setText("00:00:00");
        return;
      }
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setText(d > 0 ? `${d}д ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return <p className="font-mono text-sm tabular-nums">до конца {text}</p>;
}
