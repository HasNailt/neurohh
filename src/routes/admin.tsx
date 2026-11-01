import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { adminModerate, adminOverview } from "@/lib/market/server";
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
  const [open, setOpen] = useState(true);
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

function InvitePanel({
  data,
  act,
}: {
  data: AdminData;
  act: (input: AdminAction) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");
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
      <ul className="divide-y divide-ink/10 border-y border-ink/15">
        {data.invites.map((invite) => (
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

  return (
    <div className="space-y-8">
      <div>
        <Kicker>{data.viewerRole}</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">модерация.</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          {admin
            ? "Вы администратор: жалобы, снятие лотов, ограничения, роли и инвайт-коды. Переписку сделки можно открыть по номеру."
            : "Вы модератор: жалобы, снятие лотов, ограничение участников и чтение переписки по номеру сделки. Роли и инвайты меняет только администратор."}
        </p>
      </div>
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
        {data.deals.length === 0 ? <p className="text-muted">Сделок пока нет.</p> : null}
        <ul className="divide-y divide-ink/10 border-y border-ink/15">
          {data.deals.map((deal) => (
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
        <ul className="divide-y divide-ink/10 border-y border-ink/15">
          {data.listings.map((lot) => (
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
        <p className="text-sm text-muted">Последние 80 профилей. Смена роли доступна только администратору и не для самого себя.</p>
        <ul className="divide-y divide-ink/10 border-y border-ink/15">
          {data.users.map((person) => {
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
                {person.banned ? <span className="border border-wine px-2 py-1 font-mono text-xs text-foam">ban</span> : null}
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
