import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListingCardView } from "@/components/listing-card";
import { Button, fieldClass, Frame, Kicker } from "@/components/ui-bits";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addProfileComment, deleteProfileComment, getMe, getPublicProfile } from "@/lib/market/server";
import {
  badgeLabel,
  errText,
  formatWhen,
  isStaff,
  profileImageUrl,
  roleLabel,
  statusLabel,
  type ListingCard,
  type Me,
  type PublicProfile,
} from "@/lib/market/shared";

export const Route = createFileRoute("/u/$handle")({
  loader: ({ params }) => getPublicProfile({ data: params.handle }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `@${loaderData.handle} — AdoptAI` : "Профиль — AdoptAI" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const profile = Route.useLoaderData();
  if (!profile) {
    return <h1 className="font-display text-4xl">Такого профиля нет</h1>;
  }
  const letter = (profile.displayName.trim()[0] || profile.handle[0] || "A").toLocaleUpperCase("ru");
  const bg = profile.hasBackground ? profileImageUrl(profile.handle, "background") : "";
  const banner = profile.hasBanner ? profileImageUrl(profile.handle, "banner") : "";
  return (
    <div className="space-y-8">
      <section
        className="relative z-0 overflow-hidden border border-ink/20"
        style={
          bg
            ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className={bg ? "bg-paper/80" : "bg-card"}>
          <div
            className="relative h-36 border-b border-ink/15 sm:h-48"
            style={
              banner
                ? { backgroundImage: `linear-gradient(to top, rgba(19,18,17,0.55), transparent 45%), url(${banner})`, backgroundSize: "cover", backgroundPosition: "center" }
                : undefined
            }
          >
            {banner ? null : <div className="absolute inset-0 bg-[linear-gradient(135deg,#6B1E3A_0%,#131211_55%,#1a1917_100%)]" />}
            <span className="pointer-events-none absolute top-3 left-3 h-3 w-3 border-t border-l border-foam/70" />
            <span className="pointer-events-none absolute top-3 right-3 h-3 w-3 border-t border-r border-foam/70" />
            <p className="absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.22em] text-foam/80 uppercase">
              artist file // {profile.handle}
            </p>
          </div>
          <div className="relative px-4 pt-0 pb-5 sm:px-6">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="relative grid size-24 place-items-center overflow-hidden border border-wine bg-wine-deep sm:size-28">
                  {profile.hasAvatar ? (
                    <img src={profileImageUrl(profile.handle, "avatar")} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-5xl leading-none text-foam">{letter}</span>
                  )}
                  <span className="pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-foam" />
                  <span className="pointer-events-none absolute -right-px -bottom-px h-2.5 w-2.5 border-r border-b border-foam" />
                </div>
                <div className="pb-1">
                  <h1 className="font-display text-4xl leading-none sm:text-5xl">{profile.displayName}</h1>
                  <p className="mt-1 font-mono text-sm text-muted">@{profile.handle}</p>
                </div>
              </div>
              <ProfileActions handle={profile.handle} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="border border-wine/80 bg-wine px-2 py-1 font-mono text-xs text-foam">{statusLabel(profile.status)}</span>
              {profile.badges.map((badge) => (
                <span key={badge} className="border border-ink/30 px-2 py-1 font-mono text-xs">
                  {badgeLabel(badge)}
                </span>
              ))}
              {profile.role !== "user" ? (
                <span className="border border-ink/30 px-2 py-1 font-mono text-xs">{roleLabel(profile.role)}</span>
              ) : null}
              <span className="font-mono text-xs text-muted" suppressHydrationWarning>
                на площадке с {formatWhen(profile.createdAt)}
              </span>
            </div>
            {profile.bio ? <p className="mt-4 max-w-prose whitespace-pre-wrap">{profile.bio}</p> : (
              <p className="mt-4 text-sm text-muted">Описание пока пустое.</p>
            )}
            {profile.links.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {profile.links.map((link) => (
                  <li key={`${link.label}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 items-center border border-ink/25 px-3 text-sm hover:border-wine"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>
      <LotShelf kicker="pinned" title="закреплено." items={profile.pinned} empty={null} />
      <LotShelf
        kicker="live"
        title="в продаже."
        items={profile.active}
        empty="Активных лотов нет."
      />
      <LotShelf kicker="archive" title="завершённые." items={profile.done} empty="Завершённых лотов нет." />
      <Comments profile={profile} />
    </div>
  );
}

function LotShelf({
  kicker,
  title,
  items,
  empty,
}: {
  kicker: string;
  title: string;
  items: ListingCard[];
  empty: string | null;
}) {
  if (items.length === 0 && !empty) return null;
  return (
    <section className="space-y-4">
      <div>
        <Kicker>{kicker}</Kicker>
        <h2 className="mt-1 font-display text-3xl leading-none">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ListingCardView key={item.id} item={item} showPrice={false} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProfileActions({ handle }: { handle: string }) {
  const { user } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    void getMe().then(setMe).catch(() => undefined);
  }, [user]);
  if (!user) {
    return (
      <Link to="/login" className="inline-flex min-h-11 items-center border border-wine bg-wine px-4 text-foam">
        Чат
      </Link>
    );
  }
  if (me?.handle === handle) {
    return (
      <Link to="/me" className="inline-flex min-h-11 items-center border border-ink/30 px-4">
        Править профиль
      </Link>
    );
  }
  return (
    <Link to="/chats" search={{ with: handle }} className="inline-flex min-h-11 items-center border border-wine bg-wine px-4 text-foam">
      Чат
    </Link>
  );
}

function Comments({ profile }: { profile: PublicProfile }) {
  const { user, isPending } = useCurrentUserState();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    void getMe().then(setMe).catch(() => undefined);
  }, [user]);

  const own = me?.handle === profile.handle;

  return (
    <section className="space-y-4">
      <div>
        <Kicker>notes</Kicker>
        <h2 className="mt-2 font-display text-3xl leading-none">стена.</h2>
      </div>
      <Frame>
        <div className="space-y-4 bg-card p-4">
          {profile.comments.length === 0 ? (
            <p className="text-sm text-muted">Пока тихо. Зарегистрированные участники могут оставить заметку.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {profile.comments.map((comment) => {
                const canDelete = me && (comment.authorHandle === me.handle || isStaff(me.role));
                return (
                  <li key={comment.id} className="py-3">
                    <p className="font-mono text-xs text-muted">
                      <Link to="/u/$handle" params={{ handle: comment.authorHandle }} className="hover:text-ink">
                        @{comment.authorHandle}
                      </Link>
                      {" · "}
                      <span suppressHydrationWarning>{formatWhen(comment.createdAt)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                    {canDelete ? (
                      <button
                        type="button"
                        className="mt-1 font-mono text-xs text-muted hover:text-ink"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void deleteProfileComment({ data: comment.id })
                            .then(() => router.invalidate())
                            .catch((err) => toast.error(errText(err)))
                            .finally(() => setBusy(false));
                        }}
                      >
                        Удалить
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {isPending ? null : !user ? (
            <Link to="/login" className="inline-flex min-h-11 items-center border border-wine px-4 text-sm">
              Войти, чтобы комментировать
            </Link>
          ) : own ? (
            <p className="text-sm text-muted">Свой профиль комментировать нельзя — это стена для других участников.</p>
          ) : me?.banned ? (
            <p className="text-sm text-muted">Аккаунт ограничен, комментарии недоступны.</p>
          ) : (
            <form
              className="space-y-2 border-t border-ink/15 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const text = body.trim();
                if (!text) return;
                setBusy(true);
                void addProfileComment({ data: { handle: profile.handle, body: text } })
                  .then(async () => {
                    setBody("");
                    toast.success("Комментарий оставлен");
                    await router.invalidate();
                  })
                  .catch((err) => toast.error(errText(err)))
                  .finally(() => setBusy(false));
              }}
            >
              <label className="block text-sm">
                Заметка для @{profile.handle}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={`${fieldClass} mt-1 py-2`}
                  placeholder="Коротко и по делу"
                />
              </label>
              <Button type="submit" variant="wine" disabled={busy || body.trim().length === 0}>
                Оставить комментарий
              </Button>
            </form>
          )}
        </div>
      </Frame>
    </section>
  );
}
