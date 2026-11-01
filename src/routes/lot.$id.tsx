import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PreviewImg } from "@/components/preview-img";
import { Button, fieldClass, Frame, Kicker, StatusChip } from "@/components/ui-bits";
import { EmojiBar } from "@/components/emoji-bar";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addListingComment,
  buyFixed,
  buyNow,
  getListing,
  placeBid,
  reportListing,
  toggleLike,
} from "@/lib/market/server";
import { errText, formatPrice, formatWhen, type ListingDetail } from "@/lib/market/shared";

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
        <Link to="/" search={{ q: "", tag: "", kind: "all", sort: "new", page: 1 }} className="font-mono text-sm text-muted hover:text-ink">
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
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const floor = (lot.currentBid ?? lot.price - 1) + 1;
  const showBuyNow =
    live && !mine && lot.kind === "auction" && lot.buyNow != null && (lot.currentBid == null || lot.currentBid < lot.buyNow);

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
        <div>
          <Kicker>{lot.kind === "auction" ? "auction" : "fixed"}</Kicker>
          <h1 className="mt-2 font-display text-5xl leading-none">{lot.title}</h1>
          <p className="mt-3 text-ink/90">{lot.blurb || "Без короткого описания."}</p>
          <p className="mt-3 font-mono text-xs text-muted">
            <Link to="/u/$handle" params={{ handle: lot.sellerHandle }} className="hover:text-ink">
              @{lot.sellerHandle}
            </Link>
            {" · "}
            {formatWhen(lot.createdAt)}
            {lot.kind === "auction" ? ` · антиснайп ${lot.antiSnipeMinutes} мин` : ""}
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
                  search={{ q: "", tag: tag.slug, kind: "all", sort: "new", page: 1 }}
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
                  <Link to="/u/$handle" params={{ handle: item.authorHandle }} className="hover:text-ink">
                    @{item.authorHandle}
                  </Link>
                  {" · "}
                  {formatWhen(item.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
              </li>
            ))}
          </ul>
          {user ? (
            <form
              className="space-y-2"
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
              <EmojiBar onPick={(emoji) => setComment((value) => value + emoji)} />
              <div className="flex gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий" className={fieldClass} />
              <Button type="submit" variant="line" disabled={busy}>
                ок
              </Button>
              </div>
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
                className="font-mono text-sm text-ink"
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
              {formatPrice(lot.kind === "auction" ? (lot.currentBid ?? lot.price) : lot.price)}
            </p>
            {lot.kind === "auction" ? (
              <p className="font-mono text-xs text-muted">
                старт {formatPrice(lot.price)}
                {lot.bidCount > 0 ? ` · ${lot.bidCount} став.` : ""}
                {lot.buyNow != null ? ` · сразу ${formatPrice(lot.buyNow)}` : ""}
              </p>
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
                  placeholder={`от ${floor} ₽`}
                  className={`${fieldClass} tabular-nums`}
                />
                <Button type="submit" disabled={busy} className="w-full">
                  {user && lot.currentBidderId === user.id ? "Перебить свою" : mine ? "Своя ставка" : "Поставить"}
                </Button>
                <p className="font-mono text-xs text-muted">Можно перебить свою ставку — сумма должна быть выше текущей.</p>
              </form>
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
                Купить сейчас · {formatPrice(lot.buyNow ?? 0)}
              </Button>
            ) : null}
            {live && lot.kind === "fixed" && user && !mine ? (
              <Button
                className="w-full"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const res = await buyFixed({ data: lot.id });
                    toast.success("Лот ваш");
                    await navigate({ to: "/deals/$id", params: { id: res.dealId } });
                  })
                }
              >
                Забрать за {formatPrice(lot.price)}
              </Button>
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
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {lot.bids.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2">
                    <Link to="/u/$handle" params={{ handle: row.handle }} className="hover:text-ink">
                      @{row.handle}
                    </Link>
                    <span className="tabular-nums">{formatPrice(row.amount)}</span>
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
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={fieldClass} placeholder="Что не так с лотом" />
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
  return (
    <div className="space-y-2">
      <Frame>
        <PreviewImg
          id={current.id}
          src={current.src || current.card}
          variant="view"
          alt={lot.title}
          className="max-h-[70vh] w-full bg-soft object-contain"
          fallback={fallback}
        />
      </Frame>
      {lot.previews.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {lot.previews.map((p) => (
            <button key={p.id} type="button" onClick={() => setActive(p.id)} className={p.id === active ? "border-2 border-ink" : "border border-ink/20"}>
              <PreviewImg id={p.id} src={p.card || p.src} alt="" className="h-16 w-14 object-cover" />
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
