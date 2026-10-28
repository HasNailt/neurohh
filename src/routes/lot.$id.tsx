import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Frame, Kicker, StatusChip, fieldClass } from "@/components/ui-bits";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addListingComment,
  buyFixed,
  buyNow,
  cancelListing,
  deleteListingComment,
  getListing,
  getMe,
  placeBid,
  reportListing,
  toggleLike,
} from "@/lib/market/server";
import {
  UUID_RE,
  errText,
  formatPrice,
  formatWhen,
  isStaff,
  type ListingDetail,
  type Me,
} from "@/lib/market/shared";

export const Route = createFileRoute("/lot/$id")({
  loader: async ({ params }) => {
    if (!UUID_RE.test(params.id)) return null;
    return getListing({ data: params.id });
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title ? `${loaderData.title} — AdoptAI` : "Лот — AdoptAI" }],
  }),
  component: LotPage,
});

function LotPage() {
  const initial = Route.useLoaderData();
  const { id } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const { user } = useCurrentUserState();
  const [lot, setLot] = useState<ListingDetail | null>(initial);
  const [missing, setMissing] = useState(initial == null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<"buy" | "now" | "cancel" | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setLot(initial);
    setMissing(initial == null);
  }, [initial]);

  useEffect(() => {
    if (!lot || lot.kind !== "auction" || lot.status !== "active") return;
    const timer = window.setInterval(() => {
      void getListing({ data: id }).then((next) => {
        if (next) setLot(next);
      });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [id, lot?.kind, lot?.status]);

  if (missing || !lot) {
    return (
      <div>
        <h1 className="font-display text-4xl">Лот не найден</h1>
        <Link to="/" search={{ q: "", tag: "", kind: "all", sort: "new", page: 1 }} className="mt-4 inline-flex underline">
          На ленту
        </Link>
      </div>
    );
  }

  const mine = user?.id === lot.sellerId;
  const minBid = lot.currentBid != null ? lot.currentBid + 1 : lot.price;
  const showPrice = lot.kind === "auction" ? (lot.currentBid ?? lot.price) : lot.price;

  async function run(action: () => Promise<unknown>, ok: string) {
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <div className="space-y-4">
        <Gallery lot={lot} />
        <div>
          <Kicker>{lot.kind === "auction" ? "auction lot" : "fixed lot"}</Kicker>
          <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">{lot.title}</h1>
          <p className="mt-2 text-muted">
            <Link to="/u/$handle" params={{ handle: lot.sellerHandle }} className="text-ink underline">
              @{lot.sellerHandle}
            </Link>
            {" · "}
            {lot.sellerName}
          </p>
        </div>
        {lot.blurb ? <p className="max-w-prose text-lg">{lot.blurb}</p> : null}
        <LikeRow lot={lot} onChange={setLot} />
        {mine ? (
          <Link to="/studio" className="inline-flex text-sm underline">
            Править в моих лотах
          </Link>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {lot.tags.map((tag) => (
            <Link
              key={tag.slug}
              to="/"
              search={{ q: "", tag: tag.slug, kind: "all", sort: "new", page: 1 }}
              className="border border-ink/25 px-2 py-1 font-mono text-xs hover:border-wine hover:bg-wine/20"
            >
              {tag.label}
            </Link>
          ))}
        </div>
        {lot.kind === "auction" && lot.bids.length > 0 ? (
          <Frame>
            <div className="p-4">
              <Kicker>ставки</Kicker>
              <ul className="mt-3 divide-y divide-ink/10">
                {lot.bids.map((bid) => (
                  <li key={bid.id} className="flex items-center justify-between gap-3 py-2 font-mono text-sm">
                    <span>@{bid.handle}</span>
                    <span className="tabular-nums">{formatPrice(bid.amount)}</span>
                    <span className="text-muted" suppressHydrationWarning>
                      {formatWhen(bid.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Frame>
        ) : null}
        <LotComments lot={lot} onChange={setLot} />
      </div>
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Frame>
          <div className="space-y-4 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <StatusChip kind="listing" status={lot.status} />
              {lot.kind === "auction" ? <span className="font-mono text-xs">anti-snipe {lot.antiSnipeMinutes}м</span> : null}
            </div>
            <p className="font-display text-4xl tabular-nums">{formatPrice(showPrice)}</p>
            {lot.kind === "auction" && lot.currentBid != null ? (
              <p className="text-sm text-muted">Старт был {formatPrice(lot.price)}</p>
            ) : null}
            {lot.kind === "auction" && lot.endsAt && lot.status === "active" ? (
              <p className="font-mono text-sm">
                До конца: <Live endsAt={lot.endsAt} />
              </p>
            ) : null}
            {lot.dealId ? (
              <Link to="/deals/$id" params={{ id: lot.dealId }} className="inline-flex min-h-11 items-center underline">
                Открыть сделку
              </Link>
            ) : null}
            {lot.status === "active" && !mine && user && lot.kind === "fixed" ? (
              <Button
                type="button"
                variant="wine"
                disabled={busy}
                className="w-full"
                onClick={() => {
                  if (armed !== "buy") {
                    setArmed("buy");
                    return;
                  }
                  void run(async () => {
                    const res = await buyFixed({ data: lot.id });
                    await navigate({ to: "/deals/$id", params: { id: res.dealId } });
                  }, "Сделка открыта");
                }}
              >
                {armed === "buy" ? "Подтвердить покупку" : `Купить за ${formatPrice(lot.price)}`}
              </Button>
            ) : null}
            {lot.status === "active" && user && lot.kind === "auction" ? (
              <>
                {mine ? (
                  <p className="text-sm text-muted">Это ваш аукцион — ставку от своего имени поставить можно.</p>
                ) : null}
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      () => placeBid({ data: { listingId: lot.id, amount: Number(amount) } }),
                      "Ставка принята",
                    );
                  }}
                >
                  <label className="block text-sm">
                    Ставка от {formatPrice(minBid)}
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="numeric"
                      className={`${fieldClass} mt-1 tabular-nums`}
                    />
                  </label>
                  <Button type="submit" disabled={busy} className="w-full">
                    Поставить
                  </Button>
                </form>
                {lot.buyNow != null && (lot.currentBid == null || lot.currentBid < lot.buyNow) ? (
                  <Button
                    type="button"
                    variant="wine"
                    disabled={busy}
                    className="w-full"
                    onClick={() => {
                      if (armed !== "now") {
                        setArmed("now");
                        return;
                      }
                      void run(async () => {
                        const res = await buyNow({ data: lot.id });
                        await navigate({ to: "/deals/$id", params: { id: res.dealId } });
                      }, "Выкупили сразу");
                    }}
                  >
                    {armed === "now" ? "Подтвердить" : `Купить сейчас ${formatPrice(lot.buyNow)}`}
                  </Button>
                ) : null}
                <p className="text-sm text-muted">
                  Ставка в последние {lot.antiSnipeMinutes} мин продлевает аукцион на {lot.antiSnipeMinutes} мин.
                </p>
              </>
            ) : null}
            {lot.status === "active" && !user ? (
              <Link to="/login" className="inline-flex min-h-11 items-center border border-wine bg-wine px-4 font-medium text-foam">
                Войти, чтобы купить
              </Link>
            ) : null}
            {mine && lot.status === "active" && lot.bidCount === 0 ? (
              <Button
                type="button"
                variant="line"
                disabled={busy}
                onClick={() => {
                  if (armed !== "cancel") {
                    setArmed("cancel");
                    return;
                  }
                  void run(async () => {
                    await cancelListing({ data: lot.id });
                    await navigate({ to: "/" , search: { q: "", tag: "", kind: "all", sort: "new", page: 1 } });
                  }, "Лот снят");
                }}
              >
                {armed === "cancel" ? "Точно снять" : "Снять лот"}
              </Button>
            ) : null}
          </div>
        </Frame>
        {!mine && user ? (
          <form
            className="space-y-2 border border-ink/20 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await reportListing({ data: { listingId: lot.id, reason } });
                setReason("");
              }, "Жалоба ушла модерации");
            }}
          >
            <Kicker>жалоба на лот</Kicker>
            <label className="block text-sm">
              Причина
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className={`${fieldClass} mt-1 py-2`} />
            </label>
            <Button type="submit" variant="ghost" disabled={busy || reason.trim().length < 4}>
              Отправить жалобу
            </Button>
          </form>
        ) : null}
      </aside>
    </div>
  );
}

function LikeRow({ lot, onChange }: { lot: ListingDetail; onChange: (lot: ListingDetail) => void }) {
  const { user } = useCurrentUserState();
  const [busy, setBusy] = useState(false);
  if (!user) {
    return (
      <Link to="/login" className="inline-flex min-h-11 items-center border border-ink/25 px-3 font-mono text-xs">
        лайк {lot.likeCount}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      className={
        lot.liked
          ? "inline-flex min-h-11 items-center border border-wine bg-wine px-3 font-mono text-xs text-foam"
          : "inline-flex min-h-11 items-center border border-ink/25 px-3 font-mono text-xs"
      }
      onClick={() => {
        setBusy(true);
        void toggleLike({ data: lot.id })
          .then(async (res) => {
            const next = await getListing({ data: lot.id });
            if (next) onChange(next);
            else onChange({ ...lot, liked: res.liked, likeCount: lot.likeCount + (res.liked ? 1 : -1) });
          })
          .catch((err) => toast.error(errText(err)))
          .finally(() => setBusy(false));
      }}
    >
      {lot.liked ? "лайк есть" : "лайк"} {lot.likeCount}
    </button>
  );
}

function LotComments({ lot, onChange }: { lot: ListingDetail; onChange: (lot: ListingDetail) => void }) {
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    void getMe().then(setMe).catch(() => undefined);
  }, [user]);

  async function refresh() {
    const next = await getListing({ data: lot.id });
    if (next) onChange(next);
  }

  return (
    <section className="space-y-3">
      <Kicker>комментарии лота</Kicker>
      <Frame>
        <div className="space-y-3 bg-card p-4">
          {lot.comments.length === 0 ? (
            <p className="text-sm text-muted">Пока без комментариев.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {lot.comments.map((comment) => {
                const canDelete = me && (comment.authorHandle === me.handle || isStaff(me.role));
                return (
                  <li key={comment.id} className="py-3">
                    <p className="font-mono text-xs text-muted">
                      <Link to="/u/$handle" params={{ handle: comment.authorHandle }} className="hover:text-ink">
                        @{comment.authorHandle}
                      </Link>
                      {" · "}
                      <span suppressHydrationWarning>{formatWhen(comment.createdAt)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                    {canDelete ? (
                      <button
                        type="button"
                        className="mt-1 font-mono text-xs text-muted hover:text-ink"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void deleteListingComment({ data: comment.id })
                            .then(refresh)
                            .catch((err) => toast.error(errText(err)))
                            .finally(() => setBusy(false));
                        }}
                      >
                        Удалить
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {isPending ? null : !user ? (
            <Link to="/login" className="inline-flex min-h-11 items-center border border-wine px-4 text-sm">
              Войти, чтобы комментировать
            </Link>
          ) : me?.banned ? (
            <p className="text-sm text-muted">Аккаунт ограничен, комментарии недоступны.</p>
          ) : (
            <form
              className="space-y-2 border-t border-ink/15 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                const text = body.trim();
                if (!text) return;
                setBusy(true);
                void addListingComment({ data: { listingId: lot.id, body: text } })
                  .then(async () => {
                    setBody("");
                    await refresh();
                  })
                  .catch((err) => toast.error(errText(err)))
                  .finally(() => setBusy(false));
              }}
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Комментарий к лоту"
                className={`${fieldClass} py-2`}
              />
              <Button type="submit" variant="wine" disabled={busy || body.trim().length === 0}>
                Комментировать
              </Button>
            </form>
          )}
        </div>
      </Frame>
    </section>
  );
}

function Live({ endsAt }: { endsAt: string }) {
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
  return <span className="tabular-nums">{text}</span>;
}

function Gallery({ lot }: { lot: ListingDetail }) {
  const [active, setActive] = useState(lot.previews[0]?.id ?? "");
  useEffect(() => {
    setActive(lot.previews[0]?.id ?? "");
  }, [lot.id, lot.previews]);
  if (!active) {
    const letter = (lot.title.trim()[0] || "A").toLocaleUpperCase("ru");
    return (
      <Frame>
        <div className="poster grid place-items-center bg-wine-deep">
          <span className="font-display text-8xl leading-none text-foam">{letter}</span>
        </div>
      </Frame>
    );
  }
  return (
    <div className="space-y-2">
      <Frame>
        <img src={`/api/media/${active}`} alt={lot.title} className="max-h-[70vh] w-full bg-soft object-contain" />
      </Frame>
      {lot.previews.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {lot.previews.map((p) => (
            <button key={p.id} type="button" onClick={() => setActive(p.id)} className={p.id === active ? "border-2 border-ink" : "border border-ink/20"}>
              <img src={`/api/media/${p.id}`} alt="" className="h-16 w-14 object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
