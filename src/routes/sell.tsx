import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TagField } from "@/components/tag-field";
import { EmojiBar } from "@/components/emoji-bar";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { checkPreviewFile, pushFile } from "@/lib/market/client-upload";
import { createListing, discardListing, getMe, publishListing } from "@/lib/market/server";
import { DURATIONS, MAX_PREVIEWS, PREMIUM_BLURB_MAX, PREMIUM_PREVIEWS, errText } from "@/lib/market/shared";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Новый лот — AdoptAI" }] }),
  component: SellPage,
});

function SellPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-64 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;
  return <SellForm />;
}

function SellForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [kind, setKind] = useState<"fixed" | "auction">("auction");
  const [price, setPrice] = useState("");
  const [buyNow, setBuyNow] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [antiSnipeMinutes, setAntiSnipeMinutes] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [previews, setPreviews] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [premium, setPremium] = useState(false);
  const previewCap = premium ? PREMIUM_PREVIEWS : MAX_PREVIEWS;
  const blurbCap = premium ? PREMIUM_BLURB_MAX : 400;

  useEffect(() => {
    void getMe().then((me) => setPremium(me.premium)).catch(() => undefined);
  }, []);

  async function onPickFiles(list: FileList | null, input: HTMLInputElement) {
    const files = Array.from(list ?? []).slice(0, previewCap);
    if (files.length === 0) {
      setPreviews([]);
      setFileError(null);
      return;
    }
    try {
      for (const file of files) await checkPreviewFile(file);
      setPreviews(files);
      setFileError(null);
    } catch (err) {
      input.value = "";
      setPreviews([]);
      const message = errText(err);
      setFileError(message);
      toast.error(message);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    if (previews.length === 0) {
      setBusy(false);
      toast.error("Нужна обложка");
      return;
    }
    let createdId: string | null = null;
    try {
      for (const file of previews) await checkPreviewFile(file);
      const created = await createListing({
        data: {
          title,
          blurb,
          privateDescription: "",
          kind,
          price: Number(price),
          buyNow: kind === "auction" && buyNow.trim() ? Number(buyNow) : null,
          durationHours,
          antiSnipeMinutes,
          tags,
        },
      });
      createdId = created.id;
      for (let i = 0; i < previews.length; i += 1) {
        setNote(`Файл ${i + 1} из ${previews.length}`);
        await pushFile(created.id, previews[i], "preview");
      }
      await publishListing({ data: created.id });
    } catch (err) {
      if (createdId) await discardListing({ data: createdId }).catch(() => undefined);
      toast.error(createdId ? `${errText(err)} Лот не опубликован.` : errText(err));
      setBusy(false);
      setNote("");
      return;
    }
    toast.success("Лот на ленте");
    if (!createdId) return;
    await navigate({ to: "/lot/$id", params: { id: createdId } });
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto grid max-w-2xl gap-5">
      <div>
        <Kicker>new lot</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">выставить</h1>
      </div>
      <div className="border border-ink/30 bg-card p-4">
        <p className="font-display text-2xl leading-none">Картинки</p>
        <p className="mt-2 text-sm text-muted">До {previewCap} файлов, каждый до 4 МБ, до 4000×4000. PNG, JPG, WEBP или GIF.{premium ? "" : " С Premium — до 8."}</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="mt-3 block w-full cursor-pointer text-sm text-ink file:mr-4 file:inline-flex file:min-h-11 file:cursor-pointer file:border-0 file:bg-wine file:px-4 file:py-2 file:font-medium file:text-foam"
          onChange={(e) => void onPickFiles(e.target.files, e.currentTarget)}
        />
        {previews.length > 0 ? <p className="mt-2 font-mono text-xs text-muted">{previews.map((f) => f.name).join(", ")}</p> : null}
        {fileError ? <p className="mt-2 text-sm">{fileError}</p> : null}
      </div>
      <label className="block text-sm">
        Название
        <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={80} className={`${fieldClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Коротко на карточке
        <div className="mt-1 flex items-end gap-2">
          <EmojiBar up onPick={(emoji) => setBlurb((value) => value + emoji)} />
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} maxLength={blurbCap} rows={3} className={`${fieldClass} min-w-0 flex-1 py-2`} />
        </div>
        <span className="mt-1 block font-mono text-xs text-muted">{blurb.length}/{blurbCap}</span>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setKind("auction")} className={kind === "auction" ? "min-h-11 border border-wine bg-wine px-4 text-foam" : "min-h-11 border border-ink/25 px-4"}>
          Аукцион
        </button>
        <button type="button" onClick={() => setKind("fixed")} className={kind === "fixed" ? "min-h-11 border border-wine bg-wine px-4 text-foam" : "min-h-11 border border-ink/25 px-4"}>
          Фикс
        </button>
      </div>
      <label className="block text-sm">
        {kind === "auction" ? "Стартовая цена, ₽" : "Цена, ₽"}
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" required placeholder="Введите цену" className={`${fieldClass} mt-1 tabular-nums`} />
      </label>
      {kind === "auction" ? (
        <>
          <label className="block text-sm">
            Купить сейчас, ₽ — необязательно, выше старта
            <input value={buyNow} onChange={(e) => setBuyNow(e.target.value)} inputMode="numeric" className={`${fieldClass} mt-1 tabular-nums`} />
          </label>
          <fieldset>
            <legend className="text-sm">Длительность</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.hours}
                  type="button"
                  onClick={() => setDurationHours(d.hours)}
                  className={durationHours === d.hours ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3"}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm">Антиснайп — по желанию. Ставка в последние минуты продлевает аукцион на столько же</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                [0, "Выключить"],
                [10, "10 мин"],
                [30, "30 мин"],
                [60, "1 час"],
              ].map(([n, label]) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAntiSnipeMinutes(Number(n))}
                  className={antiSnipeMinutes === n ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3"}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}
      <div>
        <p className="mb-2 text-sm">Теги</p>
        <TagField tags={tags} onChange={setTags} />
      </div>
      {note ? <p className="font-mono text-xs">{note}</p> : null}
      <Button type="submit" variant="wine" disabled={busy}>
        {busy ? "Публикуем…" : "Опубликовать"}
      </Button>
    </form>
  );
}
