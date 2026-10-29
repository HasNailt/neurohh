import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Frame, Kicker, StatusChip } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listDeals } from "@/lib/market/server";
import { formatPrice, formatDealNo, type DealSummary } from "@/lib/market/shared";

export const Route = createFileRoute("/deals/")({
  head: () => ({ meta: [{ title: "Сделки — AdoptAI" }] }),
  component: DealsPage,
});

function DealsPage() {
  const { user, isPending } = useCurrentUserState();
  const [deals, setDeals] = useState<DealSummary[] | null>(null);
  useEffect(() => {
    if (!user) return;
    void listDeals()
      .then(setDeals)
      .catch(() => setDeals([]));
  }, [user]);
  if (isPending) return <div className="h-40 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;
  return (
    <div className="space-y-6">
      <div>
        <Kicker>trades</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">сделки.</h1>
      </div>
      {deals == null ? (
        <div className="h-40 animate-pulse bg-soft" />
      ) : deals.length === 0 ? (
        <p className="text-muted">Пока пусто. Сделка появляется после покупки или победы на аукционе.</p>
      ) : (
        <ul className="grid gap-3">
          {deals.map((deal) => (
            <li key={deal.id}>
              <Link to="/deals/$id" params={{ id: deal.id }}>
                <Frame>
                  <div className="flex items-center gap-3 bg-card p-3">
                    {deal.previewId ? (
                      <img src={`/api/media/${deal.previewId}?s=card`} alt="" className="h-16 w-12 object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span className="grid h-16 w-12 place-items-center bg-wine-deep font-display text-foam">{deal.title.slice(0, 1)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-xl">{deal.title}</p>
                      <p className="font-mono text-xs text-muted">
                        {formatDealNo(deal.publicNo)} · {deal.youAre === "seller" ? `покупатель @${deal.buyerHandle}` : `продавец @${deal.sellerHandle}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusChip kind="deal" status={deal.status} />
                      <p className="mt-1 font-mono text-sm tabular-nums">{formatPrice(deal.amount)}</p>
                    </div>
                  </div>
                </Frame>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
