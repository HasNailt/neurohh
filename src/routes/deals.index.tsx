import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PreviewImg } from "@/components/preview-img";
import { Frame, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listDeals } from "@/lib/market/server";
import { formatPrice, formatDealNo, payLabel, type DealSummary } from "@/lib/market/shared";

export const Route = createFileRoute("/deals/")({
  head: () => ({ meta: [{ title: "Сделки — AdoptAI" }] }),
  component: DealsPage,
});

function DealsPage() {
  const { user, isPending } = useCurrentUserState();
  const [deals, setDeals] = useState<DealSummary[] | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  useEffect(() => {
    if (!user) return;
    void listDeals()
      .then(setDeals)
      .catch(() => setDeals([]));
  }, [user]);
  const visible = (deals ?? []).filter((deal) => {
    if (filter === "open") return deal.status !== "completed";
    if (filter === "closed") return deal.status === "completed";
    return true;
  });
  if (isPending) return <div className="h-40 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;
  return (
    <div className="space-y-6">
      <div>
        <Kicker>trades</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">сделки</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Все"],
            ["open", "Открытые"],
            ["closed", "Закрытые"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              filter === id
                ? "min-h-11 border border-wine bg-wine px-3 text-foam"
                : "min-h-11 border border-ink/25 px-3"
            }
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {deals == null ? (
        <div className="h-40 animate-pulse bg-soft" />
      ) : visible.length === 0 ? (
        <p className="text-muted">
          {deals.length === 0
            ? "Пока пусто. Сделка появляется после покупки или победы на аукционе."
            : "В этом фильтре сделок нет."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((deal) => (
            <li key={deal.id}>
              <Link to="/deals/$id" params={{ id: deal.id }}>
                <Frame>
                  <div className="flex items-center gap-3 bg-card p-3">
                    {deal.previewId ? (
                      <PreviewImg id={deal.previewId} alt="" className="h-16 w-12 object-cover" />
                    ) : (
                      <span className="grid h-16 w-12 place-items-center bg-wine-deep font-display text-foam">{deal.title.slice(0, 1)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-xl">{deal.title}</p>
                      <p className="font-mono text-xs text-muted">
                        {formatDealNo(deal.publicNo)} ·{" "}
                        {deal.youAre === "seller" ? (
                          <>
                            покупатель {deal.buyerPremium ? "★ " : ""}
                            <span className={deal.buyerPremium ? "text-[#e6c36a]" : undefined}>@{deal.buyerHandle}</span>
                          </>
                        ) : (
                          <>
                            продавец {deal.sellerPremium ? "★ " : ""}
                            <span className={deal.sellerPremium ? "text-[#e6c36a]" : undefined}>@{deal.sellerHandle}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={
                          deal.status === "completed"
                            ? "border border-ink/30 px-2 py-1 font-mono text-xs"
                            : "border border-wine bg-wine px-2 py-1 font-mono text-xs text-foam"
                        }
                      >
                        {deal.status === "completed" ? "Закрыта" : "Открыта"}
                      </span>
                      <p className="mt-1 font-mono text-sm tabular-nums">{formatPrice(deal.amount, deal.currency)}</p>
                      <p className="font-mono text-[11px] text-muted">{payLabel(deal.currency)}</p>
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
