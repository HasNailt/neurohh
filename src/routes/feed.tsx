import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ListingCardView } from "@/components/listing-card";
import { PostCard } from "@/components/post-card";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createPost, getMe, listFeed } from "@/lib/market/server";
import { errText, type FeedEntry, type Me } from "@/lib/market/shared";

export const Route = createFileRoute("/feed")({
  loader: () => listFeed().catch(() => [] as FeedEntry[]),
  head: () => ({ meta: [{ title: "Лента — AdoptAI" }] }),
  component: FeedPage,
});

function FeedPage() {
  const { user, isPending } = useCurrentUserState();
  const initial = Route.useLoaderData();
  const router = useRouter();
  const [items, setItems] = useState<FeedEntry[]>(initial);
  const [me, setMe] = useState<Me | null>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  function reload() {
    void listFeed()
      .then(setItems)
      .catch((err) => toast.error(errText(err)));
  }

  useEffect(() => {
    if (!user) return;
    reload();
    void getMe().then(setMe).catch(() => undefined);
  }, [user]);

  if (isPending) return <div className="h-48 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const images: string[] = [];
      for (const file of files.slice(0, 4)) images.push(await jpegCard(file));
      await createPost({ data: { body, images } });
      setBody("");
      setFiles([]);
      toast.success("Пост в ленте");
      reload();
      await router.invalidate();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Kicker>following</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">лента.</h1>
        <p className="mt-2 text-sm text-muted">Новые лоты и посты людей, на которых вы подписаны, и ваши собственные.</p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3 border border-ink/20 bg-card p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Новость или заметка, не лот"
          className={`${fieldClass} py-2`}
        />
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="block w-full text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-wine file:px-3 file:text-foam"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}
        />
        <Button type="submit" variant="wine" disabled={busy}>
          {busy ? "Публикуем…" : "Опубликовать пост"}
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="border border-dashed border-ink/30 px-4 py-10 text-center text-muted">
          Пока пусто. Подпишитесь на автора в его профиле.
        </p>
      ) : (
        <div className="space-y-6">
          {items.map((entry) =>
            entry.kind === "post" ? (
              <PostCard
                key={entry.post.id}
                post={entry.post}
                mine={me?.handle === entry.post.authorHandle}
                onChange={reload}
              />
            ) : (
              <div key={entry.lot.id} className="max-w-sm">
                {entry.authorIsNew ? (
                  <p className="mb-2 font-mono text-xs">
                    <Link to="/u/$handle" params={{ handle: entry.lot.sellerHandle }} className="hover:underline">
                      @{entry.lot.sellerHandle}
                    </Link>{" "}
                    <span className="border border-ink/30 px-2 py-0.5">Новый пользователь</span>
                  </p>
                ) : null}
                <ListingCardView item={entry.lot} />
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function jpegCard(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 720 / Math.max(img.width, img.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Не удалось прочитать картинку"));
        return;
      }
      ctx.fillStyle = "#131211";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const data = canvas.toDataURL("image/jpeg", 0.72);
      const raw = data.slice(data.indexOf(",") + 1);
      if (raw.length > 280_000) reject(new Error("Картинка слишком большая для поста"));
      else resolve(raw);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать картинку"));
    };
    img.src = url;
  });
}
