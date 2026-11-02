import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Frame, Kicker, StatusChip } from "@/components/ui-bits";
import { ChatPictures } from "@/components/chat-picture";
import { RichText } from "@/components/rich-text";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getStaffDeal } from "@/lib/market/server";
import { errText, formatDealNo, formatPrice, formatWhen, payLabel, type StaffDeal } from "@/lib/market/shared";

export const Route = createFileRoute("/admin/deal/$no")({
  head: () => ({ meta: [{ title: "Переписка — AdoptAI" }] }),
  component: StaffDealPage,
});

function StaffDealPage() {
  const { no } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [deal, setDeal] = useState<StaffDeal | null | "deny" | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let stop = false;
    const load = () => {
      void getStaffDeal({ data: no })
        .then((next) => {
          if (!stop) setDeal(next);
        })
        .catch((err) => {
          if (stop) return;
          if (err instanceof Error && /модерац/i.test(err.message)) setDeal("deny");
          else {
            setDeal(null);
            toast.error(errText(err));
          }
        });
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [user, no]);

  if (isPending || (user && deal === undefined)) return <div className="h-64 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;
  if (deal === "deny") return <h1 className="font-display text-4xl">Это не ваша панель</h1>;
  if (!deal) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl">Сделки {formatDealNo(Number(no) || 0)} нет</h1>
        <Link to="/admin" className="underline">
          Назад в модерацию
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Kicker>staff read-only</Kicker>
        <h1 className="mt-2 font-display text-4xl leading-none">
          {formatDealNo(deal.publicNo)} {deal.title}
        </h1>
        {deal.listingGone ? <p className="mt-2 font-mono text-xs text-muted">Лот удалён. Переписка сохранена.</p> : null}
        <p className="mt-2 text-sm text-muted">
          Продавец @{deal.seller.handle} · покупатель @{deal.buyer.handle} · {formatPrice(deal.amount, deal.currency)} · {payLabel(deal.currency)}
        </p>
        <p className="mt-2 text-sm text-muted">Только чтение. Писать в чужой чат отсюда нельзя.</p>
        <button type="button" className="mt-2 text-sm underline" onClick={() => void navigate({ to: "/admin" })}>
          К панели
        </button>
      </div>
      <StatusChip kind="deal" status={deal.status} />
      <Frame>
        <div className="h-96 space-y-3 overflow-y-auto bg-card p-4">
          {deal.messages.map((message) =>
            message.system ? (
              <p key={message.id} className="text-center font-mono text-xs text-muted">
                {message.body}
              </p>
            ) : (
              <div key={message.id}>
                <p className="font-mono text-xs text-muted">
                  @{message.handle ?? "?"} · <span suppressHydrationWarning>{formatWhen(message.createdAt)}</span>
                </p>
                <p className="border border-ink/25 px-3 py-2">
                  {message.body ? (
                    <span className="whitespace-pre-wrap">
                      <RichText text={message.body} />
                    </span>
                  ) : null}
                  <ChatPictures images={message.images} />
                </p>
              </div>
            ),
          )}
        </div>
      </Frame>
    </div>
  );
}
