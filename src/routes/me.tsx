import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { clearProfileImage, getMe, updateProfile, uploadProfileImage } from "@/lib/market/server";
import {
  badgeLabel,
  errText,
  profileImageUrl,
  roleLabel,
  statusLabel,
  type ArtistStatus,
  type Me,
  type ProfileImageKind,
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
  const [status, setStatus] = useState<ArtistStatus>(me.status);
  const [links, setLinks] = useState<SocialLink[]>(me.links.length ? me.links : [{ label: "", url: "" }]);
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(Date.now());

  async function saveImage(kind: ProfileImageKind, file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const b64 = await fileToB64(file);
      await uploadProfileImage({ data: { kind, b64 } });
      const next = await getMe();
      onSaved(next);
      setStamp(Date.now());
      toast.success("Кадр обновлён");
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mx-auto grid max-w-xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void updateProfile({
          data: {
            handle,
            displayName,
            bio,
            status,
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
          .finally(() => setBusy(false));
      }}
    >
      <div>
        <Kicker>you</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">профиль.</h1>
        <p className="mt-2 font-mono text-xs text-muted">роль: {roleLabel(me.role)}</p>
        {me.badges.length > 0 ? (
          <p className="mt-2 font-mono text-xs text-muted">{me.badges.map(badgeLabel).join(" · ")}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">Значки «Проверенный» и «Топ-продавец» выдаёт администратор.</p>
        )}
        <Link to="/u/$handle" params={{ handle: me.handle }} className="mt-2 inline-flex text-sm underline">
          Открыть публичную страницу
        </Link>
      </div>
      <ImageSlot
        label="Аватар, до 500 КБ"
        kind="avatar"
        has={me.hasAvatar}
        handle={me.handle}
        stamp={stamp}
        busy={busy}
        onFile={(file) => void saveImage("avatar", file)}
        onClear={() => {
          setBusy(true);
          void clearProfileImage({ data: "avatar" })
            .then(() => getMe())
            .then((next) => {
              onSaved(next);
              setStamp(Date.now());
            })
            .catch((err) => toast.error(errText(err)))
            .finally(() => setBusy(false));
        }}
      />
      <ImageSlot
        label="Баннер шапки, до 1.2 МБ"
        kind="banner"
        has={me.hasBanner}
        handle={me.handle}
        stamp={stamp}
        busy={busy}
        onFile={(file) => void saveImage("banner", file)}
        onClear={() => {
          setBusy(true);
          void clearProfileImage({ data: "banner" })
            .then(() => getMe())
            .then(onSaved)
            .catch((err) => toast.error(errText(err)))
            .finally(() => setBusy(false));
        }}
      />
      <ImageSlot
        label="Фон профиля, отдельно от баннера, до 1.2 МБ"
        kind="background"
        has={me.hasBackground}
        handle={me.handle}
        stamp={stamp}
        busy={busy}
        onFile={(file) => void saveImage("background", file)}
        onClear={() => {
          setBusy(true);
          void clearProfileImage({ data: "background" })
            .then(() => getMe())
            .then(onSaved)
            .catch((err) => toast.error(errText(err)))
            .finally(() => setBusy(false));
        }}
      />
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
        О себе
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={400} className={`${fieldClass} mt-1 py-2`} />
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
      <Button type="submit" variant="wine" disabled={busy}>
        Сохранить
      </Button>
    </form>
  );
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
