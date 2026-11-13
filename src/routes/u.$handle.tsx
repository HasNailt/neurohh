import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { toast } from "sonner";
import { ListingCardView } from "@/components/listing-card";
import { Nick, PremiumBadge } from "@/components/nick";
import { PostCard } from "@/components/post-card";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RichText } from "@/components/rich-text";
import { ACCENTS, THEMES, type AvatarFrame, type BannerOverlay, type SideShape } from "@/lib/market/themes";
import { getMe, getPublicProfile, listProfileLots, toggleFollow } from "@/lib/market/server";
import { siteThemeSnapshot, subscribeSiteTheme } from "@/lib/site-theme";
import {
  badgeLabel,
  errText,
  formatWhen,
  PROFILE_LOT_PAGE,
  profileImageUrl,
  roleLabel,
  statusLabel,
  type ListingCard,
  type Me,
  type PublicProfile,
} from "@/lib/market/shared";

export const Route = createFileRoute("/u/$handle")({
  loader: ({ params }) => getPublicProfile({ data: { handle: params.handle, page: 1 } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `@${loaderData.handle} — AdoptAI` : "Профиль — AdoptAI" }],
  }),
  component: ProfilePage,
});

function followerWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "подписчик";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "подписчика";
  return "подписчиков";
}

function lightSurface(bg: string) {
  const hex = bg.replace("#", "");
  if (hex.length < 6) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function ProfilePage() {
  const loaded = Route.useLoaderData();
  const router = useRouter();
  const { user } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"lots" | "lotteries" | "posts">(
    loaded?.showcase === "posts" ? "posts" : loaded?.showcase === "lotteries" ? "lotteries" : "lots",
  );
  const [lotState, setLotState] = useState<"open" | "closed">("open");
  const [page, setPage] = useState(1);
  const [shelf, setShelf] = useState<"lots" | "lotteries">(loaded?.showcase === "lotteries" ? "lotteries" : "lots");
  const [lots, setLots] = useState<ListingCard[]>(loaded?.lots ?? []);
  const [total, setTotal] = useState(loaded?.lotTotal ?? 0);
  const site = useSyncExternalStore(subscribeSiteTheme, siteThemeSnapshot, () => "dark" as const);

  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    void getMe().then(setMe).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!loaded) return;
    setLots(loaded.lots);
    setTotal(loaded.lotTotal);
    setPage(1);
    setLotState("open");
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const openPost = hash.startsWith("#post-") || hash.startsWith("#comment-");
    setTab(openPost ? "posts" : loaded.showcase === "posts" ? "posts" : loaded.showcase === "lotteries" ? "lotteries" : "lots");
    setShelf(loaded.showcase === "lotteries" ? "lotteries" : "lots");
  }, [loaded]);

  useEffect(() => {
    if (!loaded || tab !== "posts") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#post-") && !hash.startsWith("#comment-")) return;
    const id = decodeURIComponent(hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab, loaded]);

  if (!loaded) {
    return <h1 className="font-display text-4xl">Такого профиля нет</h1>;
  }
  const profile = loaded;
  const preset = THEMES.classic;
  const theme =
    site === "light"
      ? { ...preset, bg: "#eceae6", ink: "#1c1b19", muted: "#5f5b55", card: "#f7f6f3", line: "rgba(28,27,25,0.16)", foam: "#f7f4ef" }
      : preset;
  const hud = lightSurface(theme.bg) ? theme.ink : theme.foam;
  const rev = profile.imageRev;
  const blockBg = profile.hasBackground ? profileImageUrl(profile.handle, "background", rev.background) : "";
  const middle = profile.premium && profile.hasMiddle ? profileImageUrl(profile.handle, "middle", rev.middle) : "";
  const sideLeft = profile.premium && profile.hasSideLeft ? profileImageUrl(profile.handle, "side_left", rev.side_left) : "";
  const sideRight = profile.premium && profile.hasSideRight ? profileImageUrl(profile.handle, "side_right", rev.side_right) : "";
  const banner = profile.hasBanner ? profileImageUrl(profile.handle, "banner", rev.banner) : "";
  const pages = Math.max(1, Math.ceil(total / PROFILE_LOT_PAGE));

  function openPage(next: number, state: "open" | "closed" = lotState, nextShelf: "lots" | "lotteries" = shelf) {
    setPage(next);
    setLotState(state);
    setShelf(nextShelf);
    void listProfileLots({ data: { handle: profile.handle, page: next, state, shelf: nextShelf } })
      .then((res) => {
        setLots(res.items);
        setTotal(res.total);
      })
      .catch((err) => toast.error(errText(err)));
  }

  const accent = ACCENTS[profile.accent].color;
  const scope: CSSProperties = {
    color: theme.ink,
    ["--p-bg" as string]: theme.bg,
    ["--p-ink" as string]: theme.ink,
    ["--p-muted" as string]: theme.muted,
    ["--p-card" as string]: theme.card,
    ["--p-accent" as string]: accent,
    ["--p-line" as string]: theme.line,
    ["--p-foam" as string]: theme.foam,
  };
  const bannerStyle = bannerLayer(profile.bannerOverlay, banner, theme.bg);

  return (
    <div className="relative -mx-4 py-6">
      {middle ? (
        <div className="pointer-events-none absolute inset-x-3 top-4 z-0 h-72 max-md:overflow-hidden md:inset-y-0 md:inset-x-auto md:left-1/2 md:h-auto md:w-screen md:-translate-x-1/2">
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${middle})`,
              maskImage: "linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%)",
            }}
          />
        </div>
      ) : null}
      {sideLeft ? (
        <SideFrame url={sideLeft} accent={accent} edge="left" shape={profile.sideLeftShape} framed={profile.sideLeftFramed} />
      ) : null}
      {sideRight ? (
        <SideFrame url={sideRight} accent={accent} edge="right" shape={profile.sideRightShape} framed={profile.sideRightFramed} />
      ) : null}
      <div className="profile-scope relative z-10 mx-auto w-full max-w-6xl space-y-8 px-4" style={scope}>
      <section
        className="theme-card relative z-0 overflow-hidden border"
        style={
          blockBg
            ? {
                background: `linear-gradient(180deg, color-mix(in srgb, ${theme.bg} 28%, transparent), color-mix(in srgb, ${theme.bg} 58%, transparent)), url(${blockBg}) center / cover no-repeat`,
                color: theme.ink,
              }
            : { background: theme.card, color: theme.ink }
        }
      >
        <div>
          <div className="relative h-36 overflow-hidden border-b sm:h-48" style={{ borderColor: theme.line, ...(banner ? bannerStyle : {}) }}>
            {!banner && !blockBg ? (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${theme.bg} 55%, ${theme.card} 100%)` }} />
            ) : null}
            <span className="pointer-events-none absolute top-3 left-3 h-3 w-3 border-t border-l" style={{ borderColor: hud }} />
            <span className="pointer-events-none absolute top-3 right-3 h-3 w-3 border-t border-r" style={{ borderColor: hud }} />
            <p className="absolute bottom-3 left-36 font-mono text-[10px] tracking-[0.22em] uppercase sm:left-44" style={{ color: hud }}>
              // {profile.handle}
            </p>
          </div>
          <div className="relative px-4 pt-0 pb-5 sm:px-6">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div
                  className={`relative grid size-24 place-items-center overflow-hidden sm:size-28 ${avatarFrameClass(profile.avatarFrame)}`}
                  style={{ borderColor: profile.avatarFrame === "gold" ? "#e6c36a" : accent, background: theme.card }}
                >
                  {profile.hasAvatar ? (
                    <img src={profileImageUrl(profile.handle, "avatar", rev.avatar)} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="pb-1">
                  <h1 className="font-display text-4xl leading-none sm:text-5xl">{profile.displayName}</h1>
                  <p className="mt-1 font-mono text-sm">
                    <Nick handle={profile.handle} premium={profile.premium} />
                  </p>
                </div>
              </div>
              <ProfileActions profile={profile} onFollow={() => void router.invalidate()} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="theme-chip border px-2 py-1 font-mono text-xs">{statusLabel(profile.status)}</span>
              <span className="theme-chip border px-2 py-1 font-mono text-xs">
                {profile.followers} {followerWord(profile.followers)}
              </span>
              {profile.premium ? <PremiumBadge /> : null}
              {profile.isNew ? <span className="border px-2 py-1 font-mono text-xs" style={{ borderColor: theme.line }}>Новый пользователь</span> : null}
              {profile.badges.map((badge) => (
                <span key={badge} className="border px-2 py-1 font-mono text-xs" style={{ borderColor: theme.line }}>
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
            {profile.bio ? (
              <p className="mt-4 max-w-prose whitespace-pre-wrap">
                <RichText text={profile.bio} />
              </p>
            ) : (
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
      {(profile.pins.some((item) => item.pinned) || profile.posts.some((post) => post.pinned)) && page === 1 ? (
        <section className="space-y-3">
          <p className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--p-muted)" }}>
            закреплено
          </p>
          {profile.pins.some((item) => item.pinned) ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {profile.pins
                .filter((item) => item.pinned)
                .slice(0, 3)
                .map((item) => (
                  <ListingCardView key={item.id} item={item} showPrice={false} showSold dense />
                ))}
            </div>
          ) : null}
          {profile.posts.some((post) => post.pinned) ? (
            <div className="mx-auto space-y-3">
              {profile.posts
                .filter((post) => post.pinned)
                .slice(0, 3)
                .map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    mine={me?.handle === profile.handle}
                    onChange={() => void router.invalidate()}
                  />
                ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          className={tab === "lots" ? "theme-chip min-h-11 border px-4" : "min-h-11 border px-4"}
          style={tab === "lots" ? undefined : { borderColor: "var(--p-line)", color: "var(--p-ink)" }}
          onClick={() => {
            setTab("lots");
            if (shelf !== "lots") openPage(1, "open", "lots");
          }}
        >
          Лоты
        </button>
        <button
          type="button"
          className={tab === "lotteries" ? "theme-chip min-h-11 border px-4" : "min-h-11 border px-4"}
          style={tab === "lotteries" ? undefined : { borderColor: "var(--p-line)", color: "var(--p-ink)" }}
          onClick={() => {
            setTab("lotteries");
            if (shelf !== "lotteries") openPage(1, "open", "lotteries");
          }}
        >
          Лотереи
        </button>
        <button
          type="button"
          className={tab === "posts" ? "theme-chip min-h-11 border px-4" : "min-h-11 border px-4"}
          style={tab === "posts" ? undefined : { borderColor: "var(--p-line)", color: "var(--p-ink)" }}
          onClick={() => setTab("posts")}
        >
          Посты
        </button>
      </div>
      {tab === "lots" || tab === "lotteries" ? (
        <section className="space-y-4">
          <div className="flex gap-2">
            {(
              [
                ["open", "Открыт"],
                ["closed", "Закрыт"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={lotState === id ? "theme-chip inline-flex min-h-8 items-center border px-2.5 font-mono text-xs" : "inline-flex min-h-8 items-center border px-2.5 font-mono text-xs"}
                style={lotState === id ? undefined : { borderColor: "var(--p-line)", color: "var(--p-ink)" }}
                onClick={() => openPage(1, id)}
              >
                {label}
              </button>
            ))}
          </div>
          {lots.length === 0 ? (
            <p className="text-muted">
              {lotState === "open"
                ? tab === "lotteries"
                  ? "Открытых лотерей нет."
                  : "Открытых лотов нет."
                : tab === "lotteries"
                  ? "Закрытых лотерей нет."
                  : "Закрытых лотов нет."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {lots.map((item) => (
                <ListingCardView key={item.id} item={item} showPrice={false} showSold dense />
              ))}
            </div>
          )}
          {pages > 1 ? (
            <div className="flex items-center justify-between font-mono text-sm">
              <button type="button" className="min-h-11 underline disabled:opacity-40" disabled={page <= 1} onClick={() => openPage(page - 1)}>
                Назад
              </button>
              <span className="text-muted tabular-nums">
                {page} / {pages}
              </span>
              <button type="button" className="min-h-11 underline disabled:opacity-40" disabled={page >= pages} onClick={() => openPage(page + 1)}>
                Дальше
              </button>
            </div>
          ) : null}
        </section>
      ) : profile.posts.length === 0 ? (
        <p className="text-muted">Постов пока нет.</p>
      ) : (
        <div className="space-y-4">
          {profile.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              mine={me?.handle === profile.handle || me?.role === "admin" || me?.role === "moderator"}
              onChange={() => void router.invalidate()}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

function SideFrame({
  url,
  accent,
  edge,
  shape,
  framed,
}: {
  url: string;
  accent: string;
  edge: "left" | "right";
  shape: SideShape;
  framed: boolean;
}) {
  const square = shape === "square-top" || shape === "square-bottom";
  const gutter = "max(5.5rem, calc((100vw - min(72rem, 100vw)) / 2 - 1.25rem))";
  const style: CSSProperties = framed
    ? { borderColor: accent, borderWidth: 1, borderStyle: "solid" }
    : { border: "none" };
  if (square) {
    style.width = gutter;
    style.height = gutter;
    style.top = shape === "square-top" ? "6.25rem" : "auto";
    style.bottom = shape === "square-bottom" ? "0.75rem" : "auto";
  } else {
    style.top = "6.25rem";
    style.bottom = "0.75rem";
    style.width = shape === "wide" ? "min(18rem, calc((100vw - 72rem) / 2 - 1.25rem))" : "7.5rem";
  }
  return (
    <div
      key={`${edge}-${shape}-${framed}-${url}`}
      aria-hidden
      className={`pointer-events-none fixed z-20 overflow-hidden bg-transparent max-xl:hidden ${edge === "left" ? "left-3" : "right-3"}`}
      style={style}
    >
      <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />
      {framed ? (
        <>
          <span className="pointer-events-none absolute top-1 left-1 h-2 w-2 border-t border-l" style={{ borderColor: accent }} />
          <span className="pointer-events-none absolute top-1 right-1 h-2 w-2 border-t border-r" style={{ borderColor: accent }} />
          <span className="pointer-events-none absolute bottom-1 left-1 h-2 w-2 border-b border-l" style={{ borderColor: accent }} />
          <span className="pointer-events-none absolute right-1 bottom-1 h-2 w-2 border-r border-b" style={{ borderColor: accent }} />
        </>
      ) : null}
    </div>
  );
}

function ProfileActions({ profile, onFollow }: { profile: PublicProfile; onFollow: () => void }) {
  const { user } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  const [following, setFollowing] = useState(profile.following);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFollowing(profile.following);
  }, [profile.following]);

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
  if (me?.handle === profile.handle) {
    return (
      <Link to="/me" className="inline-flex min-h-11 items-center border border-ink/30 px-4">
        Править профиль
      </Link>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        className={following ? "min-h-11 border border-ink/30 px-4" : "min-h-11 border border-wine bg-wine px-4 text-foam"}
        onClick={() => {
          setBusy(true);
          void toggleFollow({ data: profile.handle })
            .then((res) => {
              setFollowing(res.following);
              onFollow();
            })
            .catch((err) => toast.error(errText(err)))
            .finally(() => setBusy(false));
        }}
      >
        {following ? "Отписаться" : "Подписаться"}
      </button>
      <Link to="/chats" search={{ with: profile.handle }} className="inline-flex min-h-11 items-center border border-ink/30 px-4">
        Чат
      </Link>
    </div>
  );
}

function avatarFrameClass(frame: AvatarFrame): string {
  if (frame === "circle" || frame === "gold") return "rounded-full border-2";
  if (frame === "rounded") return "rounded-2xl border";
  if (frame === "none") return "";
  return "border";
}

function bannerLayer(overlay: BannerOverlay, banner: string, bg: string): CSSProperties {
  if (!banner) return {};
  const image = `url(${banner})`;
  const cover = { backgroundSize: "cover", backgroundPosition: "center" } as const;
  if (overlay === "none") return { backgroundImage: image, ...cover };
  if (overlay === "darken") return { backgroundImage: `linear-gradient(rgba(0,0,0,.5), rgba(0,0,0,.5)), ${image}`, ...cover };
  if (overlay === "vignette") {
    return { backgroundImage: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,.62)), ${image}`, ...cover };
  }
  return { backgroundImage: `linear-gradient(to top, ${bg}, transparent 55%), ${image}`, ...cover };
}
