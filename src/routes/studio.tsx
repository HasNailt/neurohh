import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TagField } from "@/components/tag-field";
import { PreviewImg } from "@/components/preview-img";
import { Button, fieldClass, Frame, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getListing, listMine, setPinned, updateListingCopy, deleteListing } from "@/lib/market/server";
import { errText, formatPrice, listingStatusLabel, type ListingCard } from "@/lib/market/shared";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "Мои лоты — AdoptAI" }] }),
  component: StudioPage,
});

function StudioPage() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<ListingCard[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  function reload() {
    void listMine()
      .then(setItems)
      .catch((err) => toast.error(errText(err)));
  }

  useEffect(() => {
    if (!user) return;
    reload();
  }, [user]);

  if (isPending) return <div className="h-48 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;

  const auctions = (items ?? []).filter((item) => item.kind === "auction");
  const fixed = (items ?? []).filter((item) => item.kind === "fixed");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>booth desk</Kicker>
          <h1 className="mt-2 font-display text-5xl leading-none">мои лоты</h1>
        </div>
        <Link to="/sell" className="inline-flex min-h-11 items-center border border-wine bg-wine px-4 text-foam">
          Новый лот
        </Link>
      </div>
      {items == null ? <div className="h-40 animate-pulse bg-soft" /> : null}
      <Shelf title="Аукционы" items={auctions} onEdit={setEditId} onPin={reload} />
      <Shelf title="Фикс" items={fixed} onEdit={setEditId} onPin={reload} />
      {editId ? (
        <EditSheet
          id={editId}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function Shelf({
  title,
  items,
  onEdit,
  onPin,
}: {
  title: string;
  items: ListingCard[];
  onEdit: (id: string) => void;
  onPin: () => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-3xl leading-none">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Пока пусто.</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Frame>
                <div className="flex flex-wrap items-center gap-3 bg-card p-3">
                  <Link to="/lot/$id" params={{ id: item.id }} className="shrink-0">
                    {item.previewId || item.previewSrc ? (
                      <PreviewImg id={item.previewId} src={item.previewSrc} alt="" className="h-16 w-12 object-cover" />
                    ) : (
                      <span className="grid h-16 w-12 place-items-center bg-wine-deep font-display text-foam">
                        {item.title.slice(0, 1)}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to="/lot/$id" params={{ id: item.id }} className="block truncate font-display text-xl hover:underline">
                      {item.title}
                    </Link>
                    <p className="font-mono text-xs text-muted">
                      {listingStatusLabel(item.status)} · {formatPrice(item.currentBid ?? item.price)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="min-h-9 border border-wine px-2 font-mono text-xs text-wine"
                      onClick={() => {
                        if (!window.confirm("Удалить пост? Он пропадёт из ленты и профиля.")) return;
                        void deleteListing({ data: item.id })
                          .then(() => {
                            toast.success("Пост удалён");
                            onPin();
                          })
                          .catch((err) => toast.error(errText(err)));
                      }}
                    >
                      Удалить пост
                    </button>
                    {item.status === "active" ? (
                      <>
                        <button
                          type="button"
                          className="min-h-9 border border-ink/25 px-2 font-mono text-xs"
                          onClick={() => {
                            void setPinned({ data: { id: item.id, pinned: !item.pinned } })
                              .then(() => {
                                toast.success(item.pinned ? "Открепили" : "Закрепили на профиле");
                                onPin();
                              })
                              .catch((err) => toast.error(errText(err)));
                          }}
                        >
                          {item.pinned ? "Открепить" : "Закрепить"}
                        </button>
                        <Button type="button" variant="line" onClick={() => onEdit(item.id)}>
                          Править
                        </Button>
                      </>
                    ) : item.pinned ? (
                      <span className="font-mono text-xs">на профиле</span>
                    ) : (
                      <button
                        type="button"
                        className="min-h-9 border border-ink/25 px-2 font-mono text-xs"
                        onClick={() => {
                          void setPinned({ data: { id: item.id, pinned: true } })
                            .then(() => {
                              toast.success("Закрепили на профиле");
                              onPin();
                            })
                            .catch((err) => toast.error(errText(err)));
                        }}
                      >
                        Закрепить
                      </button>
                    )}
                  </div>
                </div>
              </Frame>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EditSheet({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    void getListing({ data: id }).then((lot) => {
      if (stop || !lot) return;
      setTitle(lot.title);
      setBlurb(lot.blurb);
      setTags(lot.tags.map((t) => t.label));
      setReady(true);
    });
    return () => {
      stop = true;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-paper/70">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Закрыть" onClick={onClose} />
      <Frame className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-paper shadow-none">
        <form
          className="space-y-3 bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void updateListingCopy({ data: { id, title, blurb, tags } })
              .then(() => {
                toast.success("Лот обновлён");
                onSaved();
              })
              .catch((err) => toast.error(errText(err)))
              .finally(() => setBusy(false));
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Kicker>edit slate</Kicker>
              <h2 className="mt-1 font-display text-3xl leading-none">правка.</h2>
            </div>
            <button type="button" className="min-h-11 px-2 font-mono text-xs" onClick={onClose}>
              закрыть
            </button>
          </div>
          {ready ? null : <div className="h-24 animate-pulse bg-soft" />}
          <label className="block text-sm">
            Название
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${fieldClass} mt-1`} maxLength={80} />
          </label>
          <label className="block text-sm">
            Коротко
            <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={4} maxLength={400} className={`${fieldClass} mt-1 py-2`} />
            <span className="mt-1 block font-mono text-xs text-muted">{blurb.length}/400</span>
          </label>
          <div>
            <p className="mb-2 text-sm">Теги</p>
            <TagField tags={tags} onChange={setTags} />
          </div>
          <Button type="submit" variant="wine" disabled={busy || !ready}>
            Сохранить
          </Button>
        </form>
      </Frame>
    </div>
  );
}
