import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, fieldClass, Frame, Kicker } from "@/components/ui-bits";
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
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <section className="space-y-3">
        <div>
          <Kicker>inbox</Kicker>
          <h1 className="mt-1 font-display text-4xl leading-none">чаты</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={box === "direct" ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3"}
            onClick={() => setBox("direct")}
          >
            Личные
          </button>
          <button
            type="button"
            className={box === "deals" ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3"}
            onClick={() => setBox("deals")}
          >
            Сделки
          </button>
        </div>
        {box === "deals" ? (
          deals == null ? (
            <div className="h-24 animate-pulse bg-soft" />
          ) : deals.length === 0 ? (
            <p className="text-sm text-muted">Сделок пока нет.</p>
          ) : (
            <ul className="divide-y divide-ink/10 border-y border-ink/15">
              {deals.map((deal) => (
                <li key={deal.id}>
                  <Link to="/deals/$id" params={{ id: deal.id }} className="block py-3 hover:bg-soft/60">
                    <p className="font-medium">
                      {formatDealNo(deal.publicNo)} {deal.title}
                    </p>
                    <p className="truncate text-sm text-muted">
                      @{deal.youAre === "seller" ? deal.buyerHandle : deal.sellerHandle} · {formatPrice(deal.amount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : threads == null ? (
          <div className="h-24 animate-pulse bg-soft" />
        ) : threads.length === 0 ? (
          <p className="text-sm text-muted">Пока тихо. Кнопка «Чат» есть в чужом профиле — сделка для этого не нужна.</p>
        ) : (
          <ul className="divide-y divide-ink/10 border-y border-ink/15">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Link
                  to="/chats"
                  search={{ with: thread.otherHandle }}
                  className="block py-3 hover:bg-soft/60"
                >
                  <p className="font-medium">@{thread.otherHandle}</p>
                  <p className="truncate text-sm text-muted">{thread.lastBody || "без сообщений"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        {!withHandle || !open ? (
          <p className="border border-dashed border-ink/30 px-4 py-10 text-center text-muted">Выберите диалог.</p>
        ) : (
          <Frame>
            <div className="space-y-3 bg-card p-4">
              <div>
                <p className="font-mono text-xs text-muted">личный чат</p>
                <h2 className="font-display text-3xl leading-none">
                  <Link to="/u/$handle" params={{ handle: open.otherHandle }} className="hover:underline">
                    @{open.otherHandle}
                  </Link>
                </h2>
                <p className="text-sm text-muted">{open.otherName}</p>
              </div>
              <div className="h-80 space-y-3 overflow-y-auto border border-ink/15 p-3">
                {open.messages.length === 0 ? <p className="text-sm text-muted">Напишите первое сообщение.</p> : null}
                {open.messages.map((message) => (
                  <div key={message.id} className={message.mine ? "ml-8" : "mr-8"}>
                    <p className="font-mono text-xs text-muted">
                      @{message.handle} · <span suppressHydrationWarning>{formatWhen(message.createdAt)}</span>
                    </p>
                    <p className={message.mine ? "bg-wine px-3 py-2 text-foam" : "border border-ink/25 px-3 py-2"}>{message.body}</p>
                  </div>
                ))}
              </div>
              <EmojiBar onPick={(emoji) => setDraft((value) => value + emoji)} />
              <form
                className="flex gap-2"
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
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} className={fieldClass} placeholder="Сообщение" />
                <Button type="submit" variant="wine" disabled={busy}>
                  Ок
                </Button>
              </form>
            </div>
          </Frame>
        )}
      </section>
    </div>
  );
}
