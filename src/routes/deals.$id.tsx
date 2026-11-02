import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatPictures } from "@/components/chat-picture";
import { Button, fieldClass } from "@/components/ui-bits";
import { EmojiBar } from "@/components/emoji-bar";
import { FormatBar, RichText } from "@/components/rich-text";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { checkChatImage, pushChatImage } from "@/lib/market/client-upload";
import { discardBlankMessage, getDeal, sendMessage, setDealOpen } from "@/lib/market/server";
import { CHAT_IMAGE_COUNT, errText, formatDealNo, formatPrice, formatWhen, payLabel, type DealDetail } from "@/lib/market/shared";

export const Route = createFileRoute("/deals/$id")({
  head: () => ({ meta: [{ title: "Сделка — AdoptAI" }] }),
  component: DealPage,
});

function DealPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [deal, setDeal] = useState<DealDetail | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const draftRef = useRef<HTMLInputElement>(null);
  const [pics, setPics] = useState<File[]>([]);
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
  }, [deal?.messages.length, deal?.messages.reduce((sum, message) => sum + message.images.length, 0)]);

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
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-3">
        <h1 className="font-display text-4xl leading-none">
          {deal.listingId ? (
            <Link to="/lot/$id" params={{ id: deal.listingId }} className="hover:underline">
              {deal.title}
            </Link>
          ) : (
            deal.title
          )}
        </h1>
        {deal.listingGone ? <p className="font-mono text-xs text-muted">Лот удалён. Переписка сохранена.</p> : null}
        <div className="flex h-[70vh] min-h-96 flex-col border border-ink/20 bg-card">
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {deal.messages.map((message) =>
              message.system ? (
                <p key={message.id} className="text-center font-mono text-xs text-muted">
                  {message.body}
                </p>
              ) : (
                <div key={message.id} className={message.senderId === user.id ? "ml-auto max-w-[80%]" : "max-w-[80%]"}>
                  <p className="mb-1 font-mono text-[10px] tracking-wide text-muted uppercase">
                    {message.premium ? <span className="star">★ </span> : null}
                    <span className={message.premium ? "text-[#e6c36a]" : undefined}>@{message.handle}</span>
                    {" · "}
                    <span suppressHydrationWarning>{formatWhen(message.createdAt)}</span>
                  </p>
                  <div className={message.senderId === user.id ? "bg-wine px-3 py-2 text-foam" : "border border-ink/20 bg-paper px-3 py-2"}>
                    {message.body ? (
                      <p className="whitespace-pre-wrap">
                        <RichText text={message.body} />
                      </p>
                    ) : null}
                    <ChatPictures images={message.images} />
                  </div>
                </div>
              ),
            )}
          </div>
          <form
            className="space-y-2 border-t border-ink/15 p-3"
            onSubmit={(e) => {
            e.preventDefault();
            const body = draft.trim();
            const files = pics.slice(0, CHAT_IMAGE_COUNT);
            if (!body && files.length === 0) return;
            if (pics.length > CHAT_IMAGE_COUNT) {
              toast.error("Не больше 10 картинок в одном сообщении");
              return;
            }
            setBusy(true);
            void (async () => {
              let messageId: string | null = null;
              try {
                for (const file of files) await checkChatImage(file);
                const created = await sendMessage({ data: { dealId: deal.id, body, withImages: files.length > 0 } });
                messageId = created.id;
                for (const file of files) await pushChatImage(created.id, file);
                const next = await getDeal({ data: deal.id });
                if (next) setDeal(next);
                setDraft("");
                setPics([]);
                stick.current = true;
              } catch (err) {
                if (messageId && !body) await discardBlankMessage({ data: messageId }).catch(() => undefined);
                toast.error(errText(err));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <label className="block text-sm">
            Картинки
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="mt-1 block w-full cursor-pointer text-sm file:mr-3 file:inline-flex file:min-h-11 file:cursor-pointer file:border-0 file:bg-wine file:px-3 file:py-2 file:text-foam"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.currentTarget.value = "";
                if (picked.length > CHAT_IMAGE_COUNT) {
                  toast.error("Не больше 10 картинок в одном сообщении");
                  setPics([]);
                  return;
                }
                void (async () => {
                  try {
                    for (const file of picked) await checkChatImage(file);
                    setPics(picked);
                  } catch (err) {
                    setPics([]);
                    toast.error(errText(err));
                  }
                })();
              }}
            />
            <span className="mt-1 block font-mono text-xs text-muted">
              До 10, каждая до 3 МБ и 3000×3000. Без сжатия — скачивается как загрузили.
              {pics.length > 0 ? ` Выбрано: ${pics.map((f) => f.name).join(", ")}` : ""}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <EmojiBar up onPick={(emoji) => setDraft((value) => value + emoji)} />
            <FormatBar inputRef={draftRef} value={draft} onChange={setDraft} />
            <input
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Сообщение"
              className={`${fieldClass} min-w-0 flex-1`}
              maxLength={2000}
            />
            <Button type="submit" disabled={busy}>
              Ок
            </Button>
          </div>
        </form>
        </div>
      </div>
      <aside className="lg:sticky lg:top-4">
        <div className="space-y-4 border border-ink/20 bg-card p-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
              {deal.youAre === "seller" ? "покупатель" : "продавец"}
            </p>
            <Link to="/u/$handle" params={{ handle: other.handle }} className="mt-1 block font-display text-3xl leading-none hover:underline">
              {other.premium ? <span className="star">★ </span> : null}
              <span className={other.premium ? "text-[#e6c36a]" : undefined}>@{other.handle}</span>
            </Link>
            <p className="text-sm text-muted">{other.name}</p>
          </div>
          <p className="font-display text-3xl tabular-nums">{formatPrice(deal.amount, deal.currency)}</p>
          <p className="font-mono text-xs text-muted">{payLabel(deal.currency)}</p>
          <p className="font-mono text-xs text-muted">{formatDealNo(deal.publicNo)}</p>
          <div className="grid grid-cols-2 border border-ink/25">
              <button
                type="button"
                disabled={busy || deal.status !== "completed"}
                className={
                  deal.status !== "completed"
                    ? "min-h-11 bg-wine text-foam"
                    : "min-h-11 text-ink"
                }
                onClick={() => void act(() => setDealOpen({ data: { id: deal.id, open: true } }), "Сделка открыта")}
              >
                Открыто
              </button>
              <button
                type="button"
                disabled={busy || deal.status === "completed"}
                className={
                  deal.status === "completed"
                    ? "min-h-11 bg-wine text-foam"
                    : "min-h-11 border-l border-ink/25 text-ink"
                }
                onClick={() => void act(() => setDealOpen({ data: { id: deal.id, open: false } }), "Сделка закрыта")}
              >
                Закрыто
              </button>
            </div>
          </div>
      </aside>
    </div>
  );
}
