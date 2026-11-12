import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { adminModerate, adminOverview, listStaffNews, publishNews, setNewsPublished } from "@/lib/market/server";
import {
  errText,
  formatWhen,
  listingStatusLabel,
  providerLabel,
  roleLabel,
  badgeLabel,
  type AdminAction,
  type AdminData,
  type BadgeId,
  type ListingStatus,
  type NewsPost,
  type Role,
} from "@/lib/market/shared";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Модерация — AdoptAI" }] }),
  component: AdminPage,
});

function DealSearch() {
  const navigate = useNavigate();
  const [no, setNo] = useState("");
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(no.trim().replace(/^#/, ""));
    if (!Number.isInteger(value) || value < 1) {
      toast.error("Введите номер сделки, например 1042");
      return;
    }
    void navigate({ to: "/admin/deal/$no", params: { no: String(value) } });
  }
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={onSubmit}>
      <label className="block min-w-52 flex-1 text-sm">
        Номер сделки
        <input
          value={no}
          onChange={(e) => setNo(e.target.value)}
          inputMode="numeric"
          placeholder="1042"
          className={`${fieldClass} mt-1 tabular-nums`}
        />
      </label>
      <Button type="submit" variant="wine">
        Открыть переписку
      </Button>
    </form>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border border-ink/20 bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="font-mono text-xs text-muted">{open ? "свернуть" : "развернуть"}</span>
      </button>
      {open ? <div className="space-y-3 border-t border-ink/15 px-4 py-4">{children}</div> : null}
    </section>
  );
}

const ROLES: Role[] = ["user", "moderator", "admin"];

function jpegNews(file: File): Promise<string> {
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
      if (raw.length > 280_000) reject(new Error("Картинка слишком большая"));
      else resolve(raw);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать картинку"));
    };
    img.src = url;
  });
}

function NewsDesk() {
  const [items, setItems] = useState<NewsPost[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function reload() {
    void listStaffNews()
      .then(setItems)
      .catch((err) => toast.error(errText(err)));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <section className="space-y-3 border border-ink/20 bg-card p-4">
      <h2 className="font-display text-2xl">Новости сайта</h2>
      <p className="max-w-prose text-sm text-muted">
        Это объявления площадки, не лоты и не посты профиля. Пока нет ни одной опубликованной новости, блока на главной нет. На ленте виден только заголовок — текст и картинки открываются по нажатию.
      </p>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void publishNews({ data: { title, body, images } })
            .then(() => {
              setTitle("");
              setBody("");
              setImages([]);
              toast.success("Новость опубликована");
              reload();
            })
            .catch((err) => toast.error(errText(err)))
            .finally(() => setBusy(false));
        }}
      >
        <label className="block text-sm">
          Заголовок
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} className={`${fieldClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Текст
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} className={`${fieldClass} mt-1 py-2`} />
        </label>
        <label className="block text-sm">
          Картинки, до 4
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="mt-1 block w-full text-sm"
            onChange={(e) => {
              const input = e.currentTarget;
              const files = Array.from(input.files ?? []).slice(0, 4);
              input.value = "";
              setBusy(true);
              void Promise.all(files.map((file) => jpegNews(file)))
                .then((next) => setImages(next))
                .catch((err) => toast.error(errText(err)))
                .finally(() => setBusy(false));
            }}
          />
        </label>
        {images.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {images.map((src, index) => (
              <div key={`${index}-${src.slice(0, 24)}`} className="border border-ink/15">
                <img src={`data:image/jpeg;base64,${src}`} alt="" className="aspect-[4/3] w-full object-cover" />
                <button
                  type="button"
                  className="w-full px-1 py-1 text-left font-mono text-[10px] text-muted"
                  onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                >
                  убрать
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <Button type="submit" variant="wine" disabled={busy}>
          Опубликовать
        </Button>
      </form>
      {items == null ? <div className="h-16 animate-pulse bg-soft" /> : null}
      {items && items.length === 0 ? <p className="text-sm text-muted">Новостей ещё нет.</p> : null}
      {items && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="border border-ink/15 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl leading-none">{item.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {formatWhen(item.createdAt)} · {item.published ? "на главной" : "скрыта"}
                    {item.images.length > 0 ? ` · ${item.images.length} фото` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="line"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void setNewsPublished({ data: { id: item.id, published: !item.published } })
                      .then(() => reload())
                      .catch((err) => toast.error(errText(err)))
                      .finally(() => setBusy(false));
                  }}
                >
                  {item.published ? "Снять" : "Вернуть"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function InvitePanel({
  data,
  act,
}: {
  data: AdminData;
  act: (input: AdminAction) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [q, setQ] = useState("");
  const needle = q.trim().toLocaleLowerCase("ru");
  const invites = needle
    ? data.invites.filter((invite) => `${invite.code} ${invite.note}`.toLocaleLowerCase("ru").includes(needle))
    : data.invites;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted">
            {data.requireInvite
              ? "Сейчас новый аккаунт создаётся только с кодом. Уже существующие входы код не спрашивают."
              : "Сейчас регистрироваться можно без кода. Переключатель включает обязательность в любой момент."}
        </p>
        <Button
          type="button"
          variant={data.requireInvite ? "wine" : "line"}
          onClick={() => void act({ action: "set-require-invite", enabled: !data.requireInvite })}
        >
          {data.requireInvite ? "Выключить обязательность" : "Сделать код обязательным"}
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const uses = Number(maxUses);
          void act({ action: "create-invite", maxUses: uses, note: note.trim() });
          setNote("");
        }}
      >
        <label className="block min-w-40 flex-1 text-sm">
          Заметка
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} className={`${fieldClass} mt-1`} />
        </label>
        <label className="block w-28 text-sm">
          Использований
          <input
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            inputMode="numeric"
            className={`${fieldClass} mt-1 tabular-nums`}
          />
        </label>
        <Button type="submit" variant="ink">
          Сгенерировать
        </Button>
      </form>
      {data.invites.length === 0 ? <p className="text-sm text-muted">Кодов пока нет.</p> : null}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск кода или заметки" className={fieldClass} />
      <ul className="divide-y divide-ink/10 border-y border-ink/15">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-3 py-2">
            <button
              type="button"
              className="font-mono text-sm hover:underline"
              onClick={() => {
                void navigator.clipboard.writeText(invite.code).then(
                  () => toast.success("Код скопирован"),
                  () => toast.error("Не удалось скопировать"),
                );
              }}
            >
              {invite.code}
            </button>
            <span className="font-mono text-xs tabular-nums text-muted">
              {invite.uses}/{invite.maxUses}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-muted">{invite.note}</span>
            {invite.revoked ? <span className="font-mono text-xs">отозван</span> : null}
            {!invite.revoked ? (
              <Button type="button" variant="ghost" onClick={() => void act({ action: "revoke-invite", inviteId: invite.id })}>
                Отозвать
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<AdminData | null | "deny">(null);
  const [dealQ, setDealQ] = useState("");
  const [lotQ, setLotQ] = useState("");
  const [peopleQ, setPeopleQ] = useState("");
  const child = pathname.startsWith("/admin/");
  const load = () => {
    void adminOverview()
      .then(setData)
      .catch((err) => {
        if (err instanceof Error && /модерац/i.test(err.message)) setData("deny");
        else toast.error(errText(err));
      });
  };
  useEffect(() => {
    if (user && !child) load();
  }, [user, child]);
  if (isPending) return <div className="h-40 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;
  if (child) return <Outlet />;
  if (data === "deny") return <h1 className="font-display text-4xl">Это не ваша панель</h1>;
  if (!data) return <div className="h-40 animate-pulse bg-soft" />;

  async function act(input: AdminAction) {
    try {
      await adminModerate({ data: input });
      toast.success("code" in input && input.action === "create-invite" ? "Код создан — он в списке ниже" : "Готово");
      load();
    } catch (err) {
      toast.error(errText(err));
    }
  }

  const admin = data.viewerRole === "admin";
  const dealNeedle = dealQ.trim().toLocaleLowerCase("ru");
  const lotNeedle = lotQ.trim().toLocaleLowerCase("ru");
  const peopleNeedle = peopleQ.trim().toLocaleLowerCase("ru");
  const deals = data.deals.filter((deal) =>
    !dealNeedle || `${deal.publicNo} ${deal.title} ${deal.sellerHandle} ${deal.buyerHandle}`.toLocaleLowerCase("ru").includes(dealNeedle),
  );
  const lots = data.listings.filter((lot) => !lotNeedle || `${lot.title} ${lot.handle}`.toLocaleLowerCase("ru").includes(lotNeedle));
  const people = data.users.filter((person) =>
    !peopleNeedle || `${person.handle} ${person.displayName} ${person.role}`.toLocaleLowerCase("ru").includes(peopleNeedle),
  );

  return (
    <div className="space-y-8">
      <div>
        <Kicker>{data.viewerRole}</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">модерация</h1>
        {admin ? null : (
          <p className="mt-2 max-w-prose text-sm text-muted">
            Вы модератор: жалобы, снятие лотов, ограничение участников и чтение переписки по номеру сделки. Роли и инвайты меняет только администратор.
          </p>
        )}
      </div>
      {admin ? <NewsDesk /> : null}
      {admin ? (
        <Fold title="Инвайт-коды">
          <InvitePanel data={data} act={act} />
        </Fold>
      ) : null}
      <DealSearch />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Лоты", data.counts.listings],
          ["Сделки", data.counts.deals],
          ["Жалобы", data.counts.openReports],
          ["Люди", data.counts.users],
        ].map(([label, n]) => (
          <div key={String(label)} className="border border-ink/20 bg-card p-3">
            <dt className="font-mono text-xs text-muted">{label}</dt>
            <dd className="font-display text-3xl tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      <Fold title="Сделки">
        <input value={dealQ} onChange={(e) => setDealQ(e.target.value)} placeholder="Номер, название или ник" className={fieldClass} />
        {deals.length === 0 ? <p className="text-muted">Сделок пока нет.</p> : null}
        <ul className="divide-y divide-ink/10 border-y border-ink/15">
          {deals.map((deal) => (
            <li key={deal.id} className="flex flex-wrap items-center gap-3 py-2">
              <Link to="/admin/deal/$no" params={{ no: String(deal.publicNo) }} className="font-mono text-sm hover:underline">
                #{deal.publicNo}
              </Link>
              <span className="min-w-0 flex-1 truncate">{deal.title}</span>
              <span className="font-mono text-xs text-muted">
                @{deal.sellerHandle} → @{deal.buyerHandle}
              </span>
              <span className="font-mono text-xs">{deal.status}</span>
            </li>
          ))}
        </ul>
      </Fold>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">Жалобы</h2>
        {data.reports.length === 0 ? <p className="text-muted">Открытых нет.</p> : null}
        <ul className="space-y-3">
          {data.reports.map((report) => (
            <li key={report.id} className="border border-ink/20 bg-card p-3">
              <p>{report.reason}</p>
              <p className="mt-1 font-mono text-xs text-muted">
                @{report.reporterHandle}
                {report.listingTitle ? ` · ${report.listingTitle}` : ""} ·{" "}
                <span suppressHydrationWarning>{formatWhen(report.createdAt)}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {report.listingId ? (
                  <Link to="/lot/$id" params={{ id: report.listingId }} className="inline-flex min-h-11 items-center underline">
                    Лот
                  </Link>
                ) : null}
                <Button type="button" variant="line" onClick={() => void act({ action: "dismiss-report", reportId: report.id })}>
                  Отклонить
                </Button>
                <Button type="button" variant="wine" onClick={() => void act({ action: "action-report", reportId: report.id })}>
                  Снять лот
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <Fold title="Свежие лоты">
        <input value={lotQ} onChange={(e) => setLotQ(e.target.value)} placeholder="Название или ник" className={fieldClass} />
        <ul className="divide-y divide-ink/10 border-y border-ink/15">
          {lots.map((lot) => (
            <li key={lot.id} className="flex flex-wrap items-center gap-3 py-2">
              <Link to="/lot/$id" params={{ id: lot.id }} className="min-w-0 flex-1 truncate hover:underline">
                {lot.title}
              </Link>
              <span className="font-mono text-xs">@{lot.handle}</span>
              <span className="font-mono text-xs">{listingStatusLabel(lot.status as ListingStatus)}</span>
              <Button type="button" variant="line" onClick={() => void act({ action: "remove-listing", listingId: lot.id })}>
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      </Fold>
      <Fold title="Люди">
        <p className="text-sm text-muted">Последние 200 профилей. Смена роли и Premium — только у администратора.</p>
        <input value={peopleQ} onChange={(e) => setPeopleQ(e.target.value)} placeholder="Ник, имя или роль" className={fieldClass} />
        <ul className="divide-y divide-ink/10 border-y border-ink/15">
          {people.map((person) => {
            const self = person.userId === user.id;
            const canBan = !self && (admin || person.role === "user");
            return (
              <li key={person.userId} className="flex flex-wrap items-center gap-3 py-3">
                <Link to="/u/$handle" params={{ handle: person.handle }} className="hover:underline">
                  @{person.handle}
                </Link>
                <span className="text-sm text-muted">{person.displayName}</span>
                <span className="font-mono text-xs text-muted">
                  {person.providers.length
                    ? person.providers.map((id) => providerLabel(id)).join(", ")
                    : "вход не записан"}
                </span>
                {admin && !self ? (
                  <label className="text-sm">
                    <span className="sr-only">Роль @{person.handle}</span>
                    <select
                      className={`${fieldClass} w-auto min-w-36`}
                      value={person.role}
                      onChange={(e) => {
                        const role = e.target.value as Role;
                        if (role === person.role) return;
                        void act({ action: "set-role", userId: person.userId, role });
                      }}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role} — {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="border border-ink/25 px-2 py-1 font-mono text-xs">{person.role}</span>
                )}
                {admin ? (
                  <span className="flex flex-wrap gap-1">
                    {(["verified", "top"] as BadgeId[]).map((badge) => {
                      const on = person.badges.includes(badge);
                      const next = on ? person.badges.filter((b) => b !== badge) : [...person.badges, badge];
                      return (
                        <button
                          key={badge}
                          type="button"
                          className={
                            on
                              ? "min-h-9 border border-wine bg-wine px-2 font-mono text-xs text-foam"
                              : "min-h-9 border border-ink/25 px-2 font-mono text-xs"
                          }
                          onClick={() => void act({ action: "set-badges", userId: person.userId, badges: next })}
                        >
                          {badgeLabel(badge)}
                        </button>
                      );
                    })}
                  </span>
                ) : null}
                {person.premium ? (
                  <span className="border border-[#e6c36a] px-2 py-1 font-mono text-xs text-[#e6c36a]">
                    {person.premiumForever ? "Premium без срока" : "Premium"}
                  </span>
                ) : null}
                {admin ? (
                  <span className="flex flex-wrap gap-1">
                    <Button type="button" variant="line" onClick={() => void act({ action: "grant-premium-month", userId: person.userId })}>
                      На месяц
                    </Button>
                    <Button type="button" variant="line" onClick={() => void act({ action: "grant-premium-forever", userId: person.userId })}>
                      Без срока
                    </Button>
                    {person.premium ? (
                      <Button type="button" variant="ghost" onClick={() => void act({ action: "revoke-premium", userId: person.userId })}>
                        Снять Premium
                      </Button>
                    ) : null}
                  </span>
                ) : null}
                {canBan ? (
                  <Button
                    type="button"
                    variant="line"
                    onClick={() => void act({ action: "ban", userId: person.userId, banned: !person.banned })}
                  >
                    {person.banned ? "Разбанить" : "Ограничить"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Fold>
    </div>
  );
}
