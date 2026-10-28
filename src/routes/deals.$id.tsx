import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Frame, Kicker, StatusChip, fieldClass } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { completeDeal, getDeal, sendMessage } from "@/lib/market/server";
import { errText, formatDealNo, formatPrice, formatWhen, type DealDetail } from "@/lib/market/shared";

export const Route = createFileRoute("/deals/$id")({
  head: () => ({ meta: [{ title: "Сделка — AdoptAI" }] }),
  component: DealPage,
});

function DealPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [deal, setDeal] = useState<DealDetail | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    if (!user) return;
    let stop = false;
    const load = () => {
      void getDeal({ data: id })
        .then((next) => {
          if (!stop) setDeal(next);
        })
        .catch((err) => {
          if (!stop) {
            setDeal(null);
            toast.error(errText(err));
          }
        });
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [user, id]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [deal?.messages.length]);

  if (isPending || (user && deal === undefined)) return <div className="h-64 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;
  if (!deal) return <h1 className="font-display text-4xl">Сделка не найдена</h1>;

  const other = deal.youAre === "seller" ? deal.buyer : deal.seller;

  async function act(fn: () => Promise<DealDetail>, ok: string) {
    setBusy(true);
    try {
      const next = await fn();
      setDeal(next);
      toast.success(ok);
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <div>
          <Kicker>сделка {formatDealNo(deal.publicNo)}</Kicker>
          <h1 className="mt-2 font-display text-4xl leading-none">
            <Link to="/lot/$id" params={{ id: deal.listingId }} className="hover:underline">
              {deal.title}
            </Link>
          </h1>
          <p className="mt-2 text-muted">
            {deal.youAre === "seller" ? "Покупатель" : "Продавец"}{" "}
            <Link to="/u/$handle" params={{ handle: other.handle }} className="text-ink underline">
              @{other.handle}
            </Link>
            . Номер {formatDealNo(deal.publicNo)} виден вам и модерации — по нему разбирают спор.
          </p>
        </div>
        <Frame>
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className="h-96 space-y-3 overflow-y-auto bg-card p-4"
          >
            {deal.messages.map((message) =>
              message.system ? (
                <p key={message.id} className="text-center font-mono text-xs text-muted">
                  {message.body}
                </p>
              ) : (
                <div key={message.id} className={message.senderId === user.id ? "ml-8" : "mr-8"}>
                  <p className="font-mono text-xs text-muted">
                    @{message.handle} · <span suppressHydrationWarning>{formatWhen(message.createdAt)}</span>
                  </p>
                  <p className={message.senderId === user.id ? "bg-wine px-3 py-2 text-foam" : "border border-ink/25 px-3 py-2"}>
                    {message.body}
                  </p>
                </div>
              ),
            )}
          </div>
        </Frame>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const body = draft.trim();
            if (!body) return;
            setBusy(true);
            void sendMessage({ data: { dealId: deal.id, body } })
              .then(() => getDeal({ data: deal.id }))
              .then((next) => {
                if (next) setDeal(next);
                setDraft("");
                stick.current = true;
              })
              .catch((err) => toast.error(errText(err)))
              .finally(() => setBusy(false));
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Сообщение"
            className={fieldClass}
            maxLength={2000}
          />
          <Button type="submit" disabled={busy}>
            Ок
          </Button>
        </form>
      </div>
      <aside className="space-y-4">
        <Frame>
          <div className="space-y-3 bg-card p-4">
            <StatusChip kind="deal" status={deal.status} />
            <p className="font-display text-3xl tabular-nums">{formatPrice(deal.amount)}</p>
            <p className="text-sm text-muted">
              Оплата проходит вне площадки. Здесь только переписка по сделке {formatDealNo(deal.publicNo)}.
            </p>
            {deal.status !== "completed" ? (
              <Button
                type="button"
                variant="line"
                className="w-full"
                disabled={busy}
                onClick={() => void act(() => completeDeal({ data: deal.id }), "Сделка закрыта")}
              >
                Завершить сделку
              </Button>
            ) : (
              <p className="text-sm text-muted">Сделка закрыта.</p>
            )}
          </div>
        </Frame>
      </aside>
    </div>
  );
}
