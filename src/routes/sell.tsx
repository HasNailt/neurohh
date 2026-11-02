import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TagField } from "@/components/tag-field";
import { EmojiBar } from "@/components/emoji-bar";
import { FormatBar } from "@/components/rich-text";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { checkPreviewFile, pushFile } from "@/lib/market/client-upload";
import { createListing, discardListing, getMe, publishListing } from "@/lib/market/server";
import { DURATIONS, ENGINES, MAX_PREVIEWS, PREMIUM_BLURB_MAX, PREMIUM_PREVIEWS, errText, payLabel, type EngineId, type PayKind } from "@/lib/market/shared";

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
  const [currency, setCurrency] = useState<PayKind>("rub");
  const [price, setPrice] = useState("");
  const [bidStep, setBidStep] = useState("");
  const [buyNow, setBuyNow] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [antiSnipeMinutes, setAntiSnipeMinutes] = useState(0);
  const [price2, setPrice2] = useState("");
  const [price2Label, setPrice2Label] = useState("");
  const [engine, setEngine] = useState<EngineId>("niji");
  const [mixed, setMixed] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<{ key: string; file: File; url: string }[]>([]);
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [premium, setPremium] = useState(false);
  const previewCap = premium ? PREMIUM_PREVIEWS : MAX_PREVIEWS;
  const blurbCap = premium ? PREMIUM_BLURB_MAX : 400;

  useEffect(() => {
    void getMe().then((me) => setPremium(me.premium)).catch(() => undefined);
  }, []);

  const titleRef = useRef<HTMLInputElement>(null);
  const blurbRef = useRef<HTMLTextAreaElement>(null);
  const price2Ref = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => {
    return () => {
      for (const item of imagesRef.current) URL.revokeObjectURL(item.url);
    };
  }, []);

  async function onPickFiles(list: FileList | null, input: HTMLInputElement) {
    const incoming = Array.from(list ?? []);
    input.value = "";
    if (incoming.length === 0) return;
    const room = previewCap - images.length;
    if (room <= 0) {
      const message = `Уже ${previewCap} картинок`;
      setFileError(message);
      toast.error(message);
      return;
    }
    const files = incoming.slice(0, room);
    try {
      for (const file of files) await checkPreviewFile(file);
      const added = files.map((file) => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
      setImages((prev) => [...prev, ...added]);
      setCoverKey((current) => current ?? added[0]?.key ?? null);
      setFileError(incoming.length > room ? `Можно не больше ${previewCap} картинок` : null);
    } catch (err) {
      const message = errText(err);
      setFileError(message);
      toast.error(message);
    }
  }

  function removeImage(key: string) {
    const hit = images.find((item) => item.key === key);
    if (hit) URL.revokeObjectURL(hit.url);
    const next = images.filter((item) => item.key !== key);
    setImages(next);
    setCoverKey((current) => (current === key ? (next[0]?.key ?? null) : current));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    if (!coverKey || images.length === 0) {
      setBusy(false);
      toast.error("Нужна обложка");
      return;
    }
    if (kind === "auction" && (!Number.isInteger(Number(bidStep)) || Number(bidStep) < 1)) {
      setBusy(false);
      toast.error("Шаг ставки — целое число больше 0");
      return;
    }
    let createdId: string | null = null;
    try {
      const ordered = [
        ...images.filter((item) => item.key === coverKey),
        ...images.filter((item) => item.key !== coverKey),
      ];
      for (const file of ordered) await checkPreviewFile(file.file);
      const created = await createListing({
        data: {
          title,
          blurb,
          privateDescription: "",
          kind,
          currency,
          price: Number(price),
          bidStep: kind === "auction" ? Number(bidStep) : 1,
          buyNow: kind === "auction" && buyNow.trim() ? Number(buyNow) : null,
          durationHours,
          antiSnipeMinutes,
          tags,
          engine,
          mixed: kind === "auction" && currency === "sw" && mixed,
          price2: kind === "fixed" && price2.trim() ? Number(price2) : null,
          price2Label,
        },
      });
      createdId = created.id;
      for (let i = 0; i < ordered.length; i += 1) {
        setNote(i === 0 ? "Обложка" : `Дополнительная ${i} из ${ordered.length - 1}`);
        await pushFile(created.id, ordered[i].file, "preview", i === 0);
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
        <p className="mt-2 text-sm text-muted">
          Сначала загрузите файлы, потом нажмите на ту, что будет обложкой. Обложку видно в ленте и в карточках. Остальные открываются только на странице лота.
          До {previewCap} файлов, каждый до 4 МБ, до 4000×4000.{premium ? "" : " С Premium — до 8."}
        </p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="mt-3 block w-full cursor-pointer text-sm text-ink file:mr-4 file:inline-flex file:min-h-11 file:cursor-pointer file:border-0 file:bg-wine file:px-4 file:py-2 file:font-medium file:text-foam"
          onChange={(e) => void onPickFiles(e.target.files, e.currentTarget)}
        />
        {images.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((item) => {
              const cover = item.key === coverKey;
              return (
                <div key={item.key} className={cover ? "border-2 border-wine bg-card" : "border border-ink/25 bg-card"}>
                  <button type="button" onClick={() => setCoverKey(item.key)} className="block w-full text-left">
                    <img src={item.url} alt="" className="aspect-[3/4] w-full object-cover" />
                    <span className="block px-1.5 py-1 font-mono text-[10px] tracking-wide uppercase">{cover ? "Обложка" : "Дополнительная"}</span>
                  </button>
                  <button type="button" onClick={() => removeImage(item.key)} className="w-full border-t border-ink/15 px-1.5 py-1 text-left font-mono text-[10px] text-muted">
                    убрать
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Без обложки лот не публикуется.</p>
        )}
        {fileError ? <p className="mt-2 text-sm">{fileError}</p> : null}
      </div>
      <label className="block text-sm">
        Название
        <div className="mt-1 flex items-end gap-2">
          <FormatBar inputRef={titleRef} value={title} onChange={setTitle} />
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={80} className={`${fieldClass} min-w-0 flex-1`} />
        </div>
      </label>
      <label className="block text-sm">
        Коротко на карточке
        <div className="mt-1 flex items-end gap-2">
          <EmojiBar up onPick={(emoji) => setBlurb((value) => value + emoji)} />
          <FormatBar inputRef={blurbRef} value={blurb} onChange={setBlurb} />
          <textarea ref={blurbRef} value={blurb} onChange={(e) => setBlurb(e.target.value)} maxLength={blurbCap} rows={3} className={`${fieldClass} min-w-0 flex-1 py-2`} />
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
      <div className="flex flex-wrap gap-2">
        {(["rub", "sw"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCurrency(id)}
            className={currency === id ? "min-h-11 border border-wine bg-wine px-4 text-foam" : "min-h-11 border border-ink/25 px-4"}
          >
            {payLabel(id)}
          </button>
        ))}
      </div>
      <label className="block text-sm">
        {kind === "auction" ? `Стартовая цена, ${currency === "sw" ? "SW" : "₽"}` : `Цена, ${currency === "sw" ? "SW" : "₽"}`}
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" required placeholder="Введите цену" className={`${fieldClass} mt-1 tabular-nums`} />
      </label>
      {kind === "auction" ? (
        <>
          <label className="block text-sm">
            Минимальный шаг ставки, {currency === "sw" ? "SW" : "₽"}
            <input
              value={bidStep}
              onChange={(e) => setBidStep(e.target.value)}
              inputMode="numeric"
              required
              min={1}
              placeholder="Больше 0"
              className={`${fieldClass} mt-1 tabular-nums`}
            />
          </label>
          <label className="block text-sm">
            {mixed ? "Автовыкуп, ₽ — любая сумма, даже меньше старта в SW" : `Купить сейчас, ${currency === "sw" ? "SW" : "₽"} — необязательно, выше старта`}
            <input value={buyNow} onChange={(e) => setBuyNow(e.target.value)} inputMode="numeric" className={`${fieldClass} mt-1 tabular-nums`} />
          </label>
          {currency === "sw" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mixed} onChange={(e) => setMixed(e.target.checked)} />
              Смешанные ставки: обычные в SW, автовыкуп в рублях
            </label>
          ) : null}
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
            <legend className="text-sm">Антиснайп — по желанию. Ставка в конце продлевает аукцион на выбранный срок</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                [0, "Выключить"],
                [10, "10 мин"],
                [30, "30 мин"],
                [60, "1 час"],
                [1440, "24 часа"],
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
      ) : (
        <div className="grid gap-3 border border-ink/20 p-3">
          <p className="text-sm">Второй фикс — необязательно</p>
          <label className="block text-sm">
            Вторая цена, {currency === "sw" ? "SW" : "₽"}
            <input value={price2} onChange={(e) => setPrice2(e.target.value)} inputMode="numeric" placeholder="Пусто, если одна цена" className={`${fieldClass} mt-1 tabular-nums`} />
          </label>
          <label className="block text-sm">
            За что эта цена
            <div className="mt-1 flex items-end gap-2">
              <FormatBar inputRef={price2Ref} value={price2Label} onChange={setPrice2Label} />
              <input ref={price2Ref} value={price2Label} onChange={(e) => setPrice2Label(e.target.value)} maxLength={80} placeholder="Например, с фоном" className={`${fieldClass} min-w-0 flex-1`} />
            </div>
          </label>
        </div>
      )}
      <fieldset>
        <legend className="text-sm">Нейросеть</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ENGINES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setEngine(item.id)}
              className={engine === item.id ? "min-h-11 border border-wine bg-wine px-3 text-foam" : "min-h-11 border border-ink/25 px-3"}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>
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
