import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TagField } from "@/components/tag-field";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { checkPreviewFile, pushFile } from "@/lib/market/client-upload";
import { createListing, discardListing } from "@/lib/market/server";
import { DURATIONS, MAX_PREVIEWS, SNIPE_OPTIONS, errText } from "@/lib/market/shared";

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
  const [price, setPrice] = useState("1500");
  const [buyNow, setBuyNow] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [antiSnipeMinutes, setAntiSnipeMinutes] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [previews, setPreviews] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onPickFiles(list: FileList | null, input: HTMLInputElement) {
    const files = Array.from(list ?? []).slice(0, MAX_PREVIEWS);
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
        <h1 className="mt-2 font-display text-5xl leading-none">выставить.</h1>
      </div>
      <div className="border border-ink/30 bg-card p-4">
        <p className="font-display text-2xl leading-none">Картинки</p>
        <p className="mt-2 text-sm text-muted">До 4 файлов, каждый до 4 МБ, до 4000×4000. PNG, JPG, WEBP или GIF.</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="mt-3 block w-full cursor-pointer text-sm text-foam file:mr-4 file:inline-flex file:min-h-11 file:cursor-pointer file:border-0 file:bg-wine file:px-4 file:py-2 file:font-medium file:text-foam"
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
        <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} maxLength={400} rows={3} className={`${fieldClass} mt-1 py-2`} />
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
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" required className={`${fieldClass} mt-1 tabular-nums`} />
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
            <legend className="text-sm">Антиснайп: ставка в последние минуты продлевает аукцион на столько же</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SNIPE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAntiSnipeMinutes(n)}
                  className={antiSnipeMinutes === n ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3"}
                >
                  {n} мин
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
