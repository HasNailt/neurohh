import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/market/server";
import { isStaff, type Me } from "@/lib/market/shared";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

function SearchForm({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      className={className}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        void navigate({
          to: "/",
          search: { q: q.trim(), tag: "", kind: "all", sort: "new", page: 1 },
        });
      }}
    >
      <label className="flex min-h-11 items-center gap-2 border border-ink/25 bg-card px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Название или @ник"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          suppressHydrationWarning
        />
      </label>
    </form>
  );
}

function Mark() {
  return (
    <span className="relative grid size-10 place-items-center border border-wine/80">
      <span className="pointer-events-none absolute -top-px -left-px h-2 w-2 border-t border-l border-wine" />
      <span className="pointer-events-none absolute -top-px -right-px h-2 w-2 border-t border-r border-wine" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-2 w-2 border-b border-l border-wine" />
      <span className="pointer-events-none absolute -right-px -bottom-px h-2 w-2 border-r border-b border-wine" />
      <span className="font-display text-lg leading-none text-foam">A</span>
    </span>
  );
}

function AccountMenu({ me }: { me: Me | null }) {
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.href });
  const gateSession = useSyncExternalStore(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Профиль";
  const initial = label.charAt(0).toLocaleUpperCase("ru");
  const itemClass = "flex min-h-11 items-center px-3 font-mono text-xs tracking-wide uppercase hover:bg-wine/25";

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню профиля"
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center border border-ink/25"
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="size-7 object-cover" />
        ) : (
          <span className="grid size-7 place-items-center border border-wine/70 bg-wine-deep text-sm text-foam">{initial}</span>
        )}
      </button>
      {open ? (
        <div role="menu" className="absolute top-full right-0 z-50 mt-2 w-52 border border-ink/30 bg-paper shadow-lg">
          {me?.handle ? (
            <Link to="/u/$handle" params={{ handle: me.handle }} role="menuitem" className={itemClass}>
              @{me.handle}
            </Link>
          ) : (
            <p className="truncate border-b border-ink/15 px-3 py-2 font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
          )}
          <Link to="/studio" role="menuitem" className={itemClass}>
            Мои лоты
          </Link>
          <Link to="/deals" role="menuitem" className={itemClass}>
            Сделки
          </Link>
          <Link to="/chats" search={{ with: "" }} role="menuitem" className={itemClass}>
            Чаты
          </Link>
          {me && isStaff(me.role) ? (
            <Link to="/admin" role="menuitem" className={itemClass}>
              Модерация
            </Link>
          ) : null}
          {authEnabled && !gateSession ? (
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut().catch(() => setSigningOut(false));
              }}
              className={`${itemClass} w-full border-t border-ink/15 text-left disabled:cursor-wait`}
            >
              {signingOut ? "Выход…" : "Выйти"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<Me | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setMe(null);
      return;
    }
    let stop = false;
    const load = () => {
      void getMe()
        .then((next) => {
          if (!stop) setMe(next);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 20000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [userId]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-wine focus:px-3 focus:py-2 focus:text-foam">
        К содержанию
      </a>
      <header className="relative z-50 border-b border-ink/20 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between px-4 pt-2 font-mono text-[10px] tracking-[0.2em] text-muted uppercase">
          <span>SYS // 01</span>
          <span className="hidden sm:inline">+ live booth</span>
          <span>pay off-site</span>
        </div>
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" search={{ q: "", tag: "", kind: "all", sort: "new", page: 1 }} className="flex items-center gap-2">
            <Mark />
            <span className="leading-none">
              <span className="block font-display text-xl tracking-tight">AdoptAI</span>
              <span className="font-mono text-[10px] tracking-widest text-muted">ADOPT BOOTH</span>
            </span>
          </Link>
          <SearchForm className="hidden min-w-0 flex-1 md:block" />
          <nav className="ml-auto flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label={me?.unread ? `Уведомления, ${me.unread}` : "Уведомления"}
              className="relative grid size-11 place-items-center border border-ink/25"
            >
              <Bell className="size-4" />
              {me && me.unread > 0 ? (
                <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center bg-wine px-1 font-mono text-xs text-foam">
                  {me.unread > 9 ? "9+" : me.unread}
                </span>
              ) : null}
            </Link>
            <Link to="/feed" className="inline-flex min-h-11 items-center border border-ink/25 px-3 font-medium">
              Лента
            </Link>
            <Link to="/sell" className="inline-flex min-h-11 items-center gap-1 border border-wine bg-wine px-4 font-medium text-foam">
              <Plus className="size-4" />
              Лот
            </Link>
            {isPending ? (
              <span className="size-11 animate-pulse bg-soft" />
            ) : user ? (
              <AccountMenu me={me} />
            ) : (
              <Link to="/login" className="inline-flex min-h-11 items-center border border-ink/25 px-3 font-medium">
                Войти
              </Link>
            )}
          </nav>
          <SearchForm className="w-full md:hidden" />
        </div>
      </header>
      {me?.banned ? (
        <p className="border-b border-wine bg-wine-deep px-4 py-2 text-center text-sm text-foam">Аккаунт ограничен модерацией. Новые лоты и ставки недоступны.</p>
      ) : null}
      <div id="content" className="mx-auto flex w-full max-w-[100rem] min-h-0 flex-1 flex-col px-4 py-4 sm:py-6">
        {children}
      </div>
      <footer className="border-t border-ink/20">
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 font-mono text-xs text-muted">
          <span>ADOPTAI // OFF-SITE PAY</span>
          {me && isStaff(me.role) ? (
            <Link to="/admin" className="hover:text-ink">Модерация</Link>
          ) : null}
          <Link to="/rules" className="hover:text-ink">Правила</Link>
          <Link to="/terms" className="hover:text-ink">Условия</Link>
        </div>
      </footer>
    </div>
  );
}
