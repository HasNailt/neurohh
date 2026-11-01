import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, fieldClass } from "@/components/ui-bits";
import { EmojiBar } from "@/components/emoji-bar";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getThread, listDeals, listThreads, openThread, sendDirect } from "@/lib/market/server";
import { errText, formatDealNo, formatPrice, formatWhen, type DealSummary, type ThreadDetail, type ThreadPreview } from "@/lib/market/shared";

type ChatSearch = { with: string };

export const Route = createFileRoute("/chats")({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    with: typeof search.with === "string" ? search.with.trim().slice(0, 24) : "",
  }),
  head: () => ({ meta: [{ title: "Чаты — AdoptAI" }] }),
  component: ChatsPage,
});

function ChatsPage() {
  const { user, isPending } = useCurrentUserState();
  const { with: withHandle } = Route.useSearch();
  const [threads, setThreads] = useState<ThreadPreview[] | null>(null);
  const [deals, setDeals] = useState<DealSummary[] | null>(null);
  const [box, setBox] = useState<"direct" | "deals">("direct");
  const [open, setOpen] = useState<ThreadDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  function reloadList() {
    void listThreads()
      .then(setThreads)
      .catch((err) => toast.error(errText(err)));
    void listDeals()
      .then(setDeals)
      .catch((err) => toast.error(errText(err)));
  }

  useEffect(() => {
    if (!user) return;
    reloadList();
  }, [user]);

  useEffect(() => {
    if (!user || !withHandle) {
      if (!withHandle) setOpen(null);
      return;
    }
    let stop = false;
    void openThread({ data: withHandle })
      .then((thread) => {
        if (!stop) setOpen(thread);
      })
      .catch((err) => toast.error(errText(err)));
    return () => {
      stop = true;
    };
  }, [user, withHandle]);

  if (isPending) return <div className="h-48 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="grid h-[calc(100dvh-10.5rem)] min-h-[32rem] overflow-hidden border border-ink/20 bg-card lg:grid-cols-[20rem_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col overflow-y-auto border-b border-ink/20 lg:border-r lg:border-b-0">
        <div className="sticky top-0 z-10 space-y-3 border-b border-ink/15 bg-card p-3">
          <h1 className="font-display text-3xl leading-none">чаты</h1>
          <div className="flex gap-2">
            <button
              type="button"
              className={box === "direct" ? "min-h-11 flex-1 border border-wine bg-wine px-3 text-foam" : "min-h-11 flex-1 border border-ink/25 px-3"}
              onClick={() => setBox("direct")}
            >
              Личные
            </button>
            <button
              type="button"
              className={box === "deals" ? "min-h-11 flex-1 border border-wine bg-wine px-3 text-foam" : "min-h-11 flex-1 border border-ink/25 px-3"}
              onClick={() => setBox("deals")}
            >
              Сделки
            </button>
          </div>
        </div>
        {box === "deals" ? (
          deals == null ? (
            <div className="m-3 h-24 animate-pulse bg-soft" />
          ) : deals.length === 0 ? (
            <p className="p-3 text-sm text-muted">Сделок пока нет.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {deals.map((deal) => (
                <li key={deal.id}>
                  <Link to="/deals/$id" params={{ id: deal.id }} className="flex items-center gap-2 px-3 py-3 hover:bg-soft/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {formatDealNo(deal.publicNo)} {deal.title}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        @{deal.youAre === "seller" ? deal.buyerHandle : deal.sellerHandle} · {formatPrice(deal.amount)}
                        {(deal.youAre === "seller" ? deal.buyerPremium : deal.sellerPremium) ? " · ★" : ""}
                      </span>
                    </span>
                    <span
                      className={
                        deal.status === "completed"
                          ? "shrink-0 border border-ink/30 px-2 py-1 font-mono text-[10px]"
                          : "shrink-0 border border-wine bg-wine px-2 py-1 font-mono text-[10px] text-foam"
                      }
                    >
                      {deal.status === "completed" ? "Закрыто" : "Открыто"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : threads == null ? (
          <div className="m-3 h-24 animate-pulse bg-soft" />
        ) : threads.length === 0 ? (
          <p className="p-3 text-sm text-muted">Пока тихо. Кнопка «Чат» есть в чужом профиле — сделка для этого не нужна.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Link
                  to="/chats"
                  search={{ with: thread.otherHandle }}
                  className="block px-3 py-3 hover:bg-soft/60"
                >
                  <p className="font-medium">
                    {thread.otherPremium ? <span className="text-foam">★ </span> : null}
                    <span className={thread.otherPremium ? "text-[#e6c36a]" : undefined}>@{thread.otherHandle}</span>
                  </p>
                  <p className="truncate text-sm text-muted">{thread.lastBody || "без сообщений"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex min-h-0 flex-col bg-paper">
        {!withHandle || !open ? (
          <p className="grid flex-1 place-items-center px-4 text-center text-muted">Выберите диалог.</p>
        ) : (
          <>
            <div className="border-b border-ink/15 px-4 py-3">
              <p className="font-mono text-[10px] tracking-widest text-muted uppercase">личный чат</p>
              <h2 className="font-display text-3xl leading-none">
                <Link to="/u/$handle" params={{ handle: open.otherHandle }} className="hover:underline">
                  {open.otherPremium ? <span className="text-foam">★ </span> : null}
                  <span className={open.otherPremium ? "text-[#e6c36a]" : undefined}>@{open.otherHandle}</span>
                </Link>
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {open.messages.length === 0 ? <p className="text-sm text-muted">Напишите первое сообщение.</p> : null}
              {open.messages.map((message) => (
                <div key={message.id} className={message.mine ? "ml-auto max-w-[80%]" : "max-w-[80%]"}>
                  <p className="mb-1 font-mono text-[10px] text-muted">
                    {message.premium ? <span className="text-foam">★ </span> : null}
                    <span className={message.premium ? "text-[#e6c36a]" : undefined}>@{message.handle}</span> · <span suppressHydrationWarning>{formatWhen(message.createdAt)}</span>
                  </p>
                  <p className={message.mine ? "whitespace-pre-wrap bg-wine px-3 py-2 text-foam" : "whitespace-pre-wrap border border-ink/25 px-3 py-2"}>
                    {message.body}
                  </p>
                </div>
              ))}
            </div>
            <form
              className="space-y-2 border-t border-ink/15 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const body = draft.trim();
                if (!body) return;
                setBusy(true);
                void sendDirect({ data: { threadId: open.id, handle: open.otherHandle, body } })
                  .then((sent) => getThread({ data: sent.threadId }))
                  .then((next) => {
                    if (next) setOpen(next);
                    setDraft("");
                    reloadList();
                  })
                  .catch((err) => toast.error(errText(err)))
                  .finally(() => setBusy(false));
              }}
            >
              <div className="flex items-center gap-2">
                <EmojiBar up onPick={(emoji) => setDraft((value) => value + emoji)} />
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} className={fieldClass} placeholder="Сообщение" />
                <Button type="submit" variant="wine" disabled={busy}>
                  Ок
                </Button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
