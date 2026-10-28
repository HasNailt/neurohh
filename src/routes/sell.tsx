import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TagField } from "@/components/tag-field";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pushFile } from "@/lib/market/client-upload";
import { createListing } from "@/lib/market/server";
import { DURATIONS, SNIPE_OPTIONS, errText } from "@/lib/market/shared";

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
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    try {
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
      const queue = previews.map((file) => ({ file, kind: "preview" as const }));
      for (let i = 0; i < queue.length; i += 1) {
        setNote(`Файл ${i + 1} из ${queue.length}`);
        await pushFile(created.id, queue[i].file, queue[i].kind);
      }
      toast.success("Лот на ленте");
      await navigate({ to: "/lot/$id", params: { id: created.id } });
    } catch (err) {
      toast.error(errText(err));
      setBusy(false);
      setNote("");
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto grid max-w-2xl gap-5">
      <div>
        <Kicker>new lot</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">выставить.</h1>
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
      <label className="block text-sm">
        Превью, до 4 штук, до 2 МБ, до 4000×4000
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="mt-2 block w-full text-sm"
          onChange={(e) => setPreviews(Array.from(e.target.files ?? []).slice(0, 4))}
        />
      </label>
      {previews.length > 0 ? <p className="font-mono text-xs text-muted">{previews.map((f) => f.name).join(", ")}</p> : null}
      {note ? <p className="font-mono text-xs">{note}</p> : null}
      <Button type="submit" variant="wine" disabled={busy}>
        {busy ? "Публикуем…" : "Опубликовать"}
      </Button>
    </form>
  );
}
