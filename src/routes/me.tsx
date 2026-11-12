import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { EmojiBar } from "@/components/emoji-bar";
import { FormatBar } from "@/components/rich-text";
import { MentionSuggest } from "@/components/mentions";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { clearProfileImage, getMe, updateProfile, updateProfileLook, uploadProfileImage } from "@/lib/market/server";
import { ACCENTS, ACCENT_IDS, FRAME_IDS, FRAME_LABELS, OVERLAY_IDS, OVERLAY_LABELS, SIDE_SHAPES, SIDE_SHAPE_LABELS, type SideShape } from "@/lib/market/themes";
import {
  AVATAR_DIM,
  AVATAR_MAX,
  PROFILE_DECOR_DIM,
  PROFILE_DECOR_MAX,
  badgeLabel,
  errText,
  profileImageUrl,
  roleLabel,
  statusLabel,
  type ArtistStatus,
  type Me,
  type ProfileImageKind,
  type Showcase,
  type SocialLink,
} from "@/lib/market/shared";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "Профиль — AdoptAI" }] }),
  component: MePage,
});

const STATUSES: ArtistStatus[] = ["open", "busy", "closed", "away"];

function MePage() {
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    if (!user) return;
    void getMe().then(setMe).catch(() => undefined);
  }, [user]);
  if (isPending || (user && !me)) return <div className="h-48 animate-pulse bg-soft" />;
  if (!user || !me) return <RedirectToSignIn />;
  return <Editor me={me} onSaved={setMe} />;
}

function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const cut = raw.indexOf(",");
      resolve(cut >= 0 ? raw.slice(cut + 1) : raw);
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function Editor({ me, onSaved }: { me: Me; onSaved: (me: Me) => void }) {
  const router = useRouter();
  const [handle, setHandle] = useState(me.handle);
  const [displayName, setDisplayName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<ArtistStatus>(me.status);
  const [showcase, setShowcase] = useState<Showcase>(me.showcase);
  const [links, setLinks] = useState<SocialLink[]>(me.links.length ? me.links : [{ label: "", url: "" }]);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [stamp, setStamp] = useState(Date.now());

  async function saveImage(kind: ProfileImageKind, file: File | undefined) {
    if (!file) return;
    setImageBusy(true);
    try {
      if (kind === "avatar") await assertAvatar(file);
      if (kind === "background" || kind === "side_left" || kind === "side_right" || kind === "middle") await assertDecor(file);
      const b64 = await fileToB64(file);
      await uploadProfileImage({ data: { kind, b64 } });
      const next = await getMe();
      onSaved(next);
      setStamp(Date.now());
      toast.success("Кадр обновлён");
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-xl gap-4 pb-24">
      <div>
        <Kicker>you</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">профиль</h1>
        <p className="mt-2 font-mono text-xs text-muted">роль: {roleLabel(me.role)}</p>
        {me.premium ? <p className="mt-2 font-mono text-xs text-[#e6c36a]">★ Premium{me.premiumForever ? " · без срока" : me.premiumUntil ? ` · до ${me.premiumUntil.slice(0, 10)}` : ""}</p> : null}
        {me.badges.length > 0 ? <p className="mt-2 font-mono text-xs text-muted">{me.badges.map(badgeLabel).join(" · ")}</p> : null}
        <Link to="/u/$handle" params={{ handle: me.handle }} className="mt-2 inline-flex text-sm underline">
          Открыть публичную страницу
        </Link>
      </div>
      <ImageSlot
        label="Аватар, до 2 МБ и 1000×1000"
        kind="avatar"
        has={me.hasAvatar}
        handle={me.handle}
        stamp={stamp}
        busy={imageBusy}
        onFile={(file) => void saveImage("avatar", file)}
        onClear={() => {
          setImageBusy(true);
          void clearProfileImage({ data: "avatar" })
            .then(() => getMe())
            .then((next) => {
              onSaved(next);
              setStamp(Date.now());
            })
            .catch((err) => toast.error(errText(err)))
            .finally(() => setImageBusy(false));
        }}
      />
      <ImageSlot
        label={me.premium ? "Баннер, GIF до 3 МБ" : "Баннер шапки, до 1.2 МБ"}
        kind="banner"
        has={me.hasBanner}
        handle={me.handle}
        stamp={stamp}
        busy={imageBusy}
        onFile={(file) => void saveImage("banner", file)}
        onClear={() => {
          setImageBusy(true);
          void clearProfileImage({ data: "banner" })
            .then(() => getMe())
            .then(onSaved)
            .catch((err) => toast.error(errText(err)))
            .finally(() => setImageBusy(false));
        }}
      />
      <ImageSlot
        label="Фон блока профиля — шапка, ник и описание. До 3 МБ"
        kind="background"
        has={me.hasBackground}
        handle={me.handle}
        stamp={stamp}
        busy={imageBusy}
        onFile={(file) => void saveImage("background", file)}
        onClear={() => {
          setImageBusy(true);
          void clearProfileImage({ data: "background" })
            .then(() => getMe())
            .then((next) => {
              onSaved(next);
              setStamp(Date.now());
            })
            .catch((err) => toast.error(errText(err)))
            .finally(() => setImageBusy(false));
        }}
      />
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          void updateProfile({
            data: {
              handle,
              displayName,
              bio,
              status,
              showcase,
              links: links.filter((l) => l.label.trim() || l.url.trim()),
            },
          })
            .then(async () => {
              toast.success("Профиль сохранён");
              const next = await getMe();
              onSaved(next);
              await router.invalidate();
            })
            .catch((err) => toast.error(errText(err)))
            .finally(() => setSaving(false));
        }}
      >
      <label className="block text-sm">
        Ник
        <input value={handle} onChange={(e) => setHandle(e.target.value)} className={`${fieldClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Имя
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={`${fieldClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Статус
        <select value={status} onChange={(e) => setStatus(e.target.value as ArtistStatus)} className={`${fieldClass} mt-1`}>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {statusLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Что показывать первым на странице
        <select value={showcase} onChange={(e) => setShowcase(e.target.value as Showcase)} className={`${fieldClass} mt-1`}>
          <option value="lots">Лоты — аукционы и фиксы</option>
          <option value="lotteries">Лотереи</option>
          <option value="posts">Посты</option>
        </select>
      </label>
      <label className="block text-sm">
        О себе
        <div className="mt-1 flex items-end gap-2">
          <EmojiBar up onPick={(emoji) => setBio((value) => value + emoji)} />
          <FormatBar inputRef={bioRef} value={bio} onChange={setBio} />
          <MentionSuggest inputRef={bioRef} value={bio} onChange={setBio} />
          <textarea ref={bioRef} value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={400} className={`${fieldClass} min-w-0 flex-1 py-2`} />
        </div>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm">Ссылки</legend>
        {links.map((link, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <input
              value={link.label}
              placeholder="Подпись"
              maxLength={24}
              onChange={(e) => {
                const next = links.slice();
                next[index] = { ...link, label: e.target.value };
                setLinks(next);
              }}
              className={fieldClass}
            />
            <input
              value={link.url}
              placeholder="https://"
              maxLength={200}
              onChange={(e) => {
                const next = links.slice();
                next[index] = { ...link, url: e.target.value };
                setLinks(next);
              }}
              className={fieldClass}
            />
          </div>
        ))}
        {links.length < 5 ? (
          <button type="button" className="font-mono text-xs underline" onClick={() => setLinks([...links, { label: "", url: "" }])}>
            Ещё ссылка
          </button>
        ) : null}
      </fieldset>
      <div className="sticky bottom-3 z-[45]">
        <Button type="submit" variant="wine" disabled={saving} className="w-full touch-manipulation shadow-none">
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </form>
    {me.premium ? (
      <LookForm
        me={me}
        stamp={stamp}
        busy={imageBusy}
        onFile={(kind, file) => void saveImage(kind, file)}
        onClear={(kind) => {
          setImageBusy(true);
          void clearProfileImage({ data: kind })
            .then(() => getMe())
            .then((next) => {
              onSaved(next);
              setStamp(Date.now());
            })
            .catch((err) => toast.error(errText(err)))
            .finally(() => setImageBusy(false));
        }}
        onSaved={onSaved}
      />
    ) : (
      <p className="text-sm text-muted">Цвет акцента, рамка аватарки, оверлей баннера, бока и фон середины — только с Premium.</p>
    )}
    </div>
  );
}

function LookForm({
  me,
  stamp,
  busy: imageBusy,
  onFile,
  onClear,
  onSaved,
}: {
  me: Me;
  stamp: number;
  busy: boolean;
  onFile: (kind: ProfileImageKind, file: File | undefined) => void;
  onClear: (kind: ProfileImageKind) => void;
  onSaved: (next: Me) => void;
}) {
  const [accent, setAccent] = useState(me.accent);
  const [avatarFrame, setAvatarFrame] = useState(me.avatarFrame);
  const [bannerOverlay, setBannerOverlay] = useState(me.bannerOverlay);
  const [sideLeftShape, setSideLeftShape] = useState<SideShape>(me.sideLeftShape);
  const [sideRightShape, setSideRightShape] = useState<SideShape>(me.sideRightShape);
  const [sideLeftFramed, setSideLeftFramed] = useState(me.sideLeftFramed);
  const [sideRightFramed, setSideRightFramed] = useState(me.sideRightFramed);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-4 border border-[#e6c36a]/50 bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void updateProfileLook({
          data: { accent, avatarFrame, bannerOverlay, sideLeftShape, sideRightShape, sideLeftFramed, sideRightFramed },
        })
          .then(() => getMe())
          .then((next) => {
            onSaved(next);
            toast.success("Оформление сохранено");
          })
          .catch((err) => toast.error(errText(err)))
          .finally(() => setBusy(false));
      }}
    >
      <p className="font-display text-2xl">Оформление профиля</p>
      <ImageSlot
        label="Середина страницы, до 3 МБ. Под профилем, на всю ширину, по краям растворяется"
        kind="middle"
        has={me.hasMiddle}
        handle={me.handle}
        stamp={stamp}
        busy={imageBusy}
        onFile={(file) => onFile("middle", file)}
        onClear={() => onClear("middle")}
      />
      <ImageSlot
        label="Левая рамка, PNG с прозрачностью или GIF, до 3 МБ. На телефоне скрыта"
        kind="side_left"
        has={me.hasSideLeft}
        handle={me.handle}
        stamp={stamp}
        busy={imageBusy}
        onFile={(file) => onFile("side_left", file)}
        onClear={() => onClear("side_left")}
      />
      <ImageSlot
        label="Правая рамка, PNG с прозрачностью или GIF, до 3 МБ. На телефоне скрыта"
        kind="side_right"
        has={me.hasSideRight}
        handle={me.handle}
        stamp={stamp}
        busy={imageBusy}
        onFile={(file) => onFile("side_right", file)}
        onClear={() => onClear("side_right")}
      />
      <div>
        <p className="text-sm">Акцент</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={ACCENTS[id].label}
              onClick={() => setAccent(id)}
              className={accent === id ? "size-9 border-2 border-foam" : "size-9 border border-ink/30"}
              style={{ background: ACCENTS[id].color }}
            />
          ))}
        </div>
      </div>
      <label className="block text-sm">
        Рамка аватарки
        <select value={avatarFrame} onChange={(e) => setAvatarFrame(e.target.value as typeof avatarFrame)} className={`${fieldClass} mt-1`}>
          {FRAME_IDS.map((id) => (
            <option key={id} value={id}>
              {FRAME_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Оверлей баннера
        <select value={bannerOverlay} onChange={(e) => setBannerOverlay(e.target.value as typeof bannerOverlay)} className={`${fieldClass} mt-1`}>
          {OVERLAY_IDS.map((id) => (
            <option key={id} value={id}>
              {OVERLAY_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Левая картинка
        <select value={sideLeftShape} onChange={(e) => setSideLeftShape(e.target.value as SideShape)} className={`${fieldClass} mt-1`}>
          {SIDE_SHAPES.map((id) => (
            <option key={id} value={id}>
              {SIDE_SHAPE_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sideLeftFramed} onChange={(e) => setSideLeftFramed(e.target.checked)} />
        Тонкая рамка слева
      </label>
      <label className="block text-sm">
        Правая картинка
        <select value={sideRightShape} onChange={(e) => setSideRightShape(e.target.value as SideShape)} className={`${fieldClass} mt-1`}>
          {SIDE_SHAPES.map((id) => (
            <option key={id} value={id}>
              {SIDE_SHAPE_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sideRightFramed} onChange={(e) => setSideRightFramed(e.target.checked)} />
        Тонкая рамка справа
      </label>
      <Button type="submit" variant="line" disabled={busy} className="relative z-20 w-full touch-manipulation">
        {busy ? "Сохраняем…" : "Сохранить оформление"}
      </Button>
    </form>
  );
}

async function assertDecor(file: File): Promise<void> {
  const problems: string[] = [];
  if (file.size > PROFILE_DECOR_MAX) problems.push(`вес ${(file.size / (1024 * 1024)).toFixed(1)} МБ, максимум 3 МБ`);
  if (file.type && !file.type.startsWith("image/")) throw new Error("Нужны PNG, JPG, WEBP или GIF");
  let width = 0;
  let height = 0;
  try {
    const bmp = await createImageBitmap(file);
    width = bmp.width;
    height = bmp.height;
    bmp.close();
  } catch {
    throw new Error(problems.length ? `Картинка не подошла: ${problems.join(". ")}` : "Не удалось прочитать изображение");
  }
  if (width > PROFILE_DECOR_DIM || height > PROFILE_DECOR_DIM) {
    problems.push(`размер ${width}×${height} px, максимум ${PROFILE_DECOR_DIM}×${PROFILE_DECOR_DIM}`);
  }
  if (problems.length) throw new Error(`Картинка не подошла: ${problems.join(". ")}`);
}

async function assertAvatar(file: File): Promise<void> {
  const problems: string[] = [];
  if (file.size > AVATAR_MAX) {
    problems.push(`вес ${(file.size / (1024 * 1024)).toFixed(1)} МБ, максимум 2 МБ`);
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Аватар — только PNG, JPG, WEBP или GIF");
  }
  let width = 0;
  let height = 0;
  try {
    const bmp = await createImageBitmap(file);
    width = bmp.width;
    height = bmp.height;
    bmp.close();
  } catch {
    throw new Error(problems.length ? `Аватар не подошёл: ${problems.join(". ")}` : "Не удалось прочитать изображение");
  }
  if (width > AVATAR_DIM || height > AVATAR_DIM) {
    problems.push(`размер ${width}×${height} px, максимум ${AVATAR_DIM}×${AVATAR_DIM}`);
  }
  if (problems.length) throw new Error(`Аватар не подошёл: ${problems.join(". ")}`);
}

function ImageSlot({
  label,
  kind,
  has,
  handle,
  stamp,
  busy,
  onFile,
  onClear,
}: {
  label: string;
  kind: ProfileImageKind;
  has: boolean;
  handle: string;
  stamp: number;
  busy: boolean;
  onFile: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2 border border-ink/15 p-3">
      <p className="text-sm">{label}</p>
      {has ? (
        <img src={`${profileImageUrl(handle, kind)}&v=${stamp}`} alt="" className="max-h-28 w-full object-cover" />
      ) : (
        <p className="font-mono text-xs text-muted">пусто</p>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={busy}
        className="block w-full text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onFile(file);
        }}
      />
      {has ? (
        <button type="button" className="font-mono text-xs underline" disabled={busy} onClick={onClear}>
          Убрать
        </button>
      ) : null}
    </div>
  );
}
