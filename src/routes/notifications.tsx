import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Kicker } from "@/components/ui-bits";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listNotifications, markNotificationsRead } from "@/lib/market/server";
import { errText, formatWhen, type Notice } from "@/lib/market/shared";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Уведомления — AdoptAI" }] }),
  component: NotesPage,
});

function NotesPage() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<Notice[] | null>(null);
  useEffect(() => {
    if (!user) return;
    void listNotifications()
      .then(setItems)
      .catch((err) => toast.error(errText(err)));
  }, [user]);
  if (isPending) return <div className="h-40 animate-pulse bg-soft" />;
  if (!user) return <RedirectToSignIn />;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>signals</Kicker>
          <h1 className="mt-2 font-display text-5xl leading-none">сигналы.</h1>
        </div>
        <Button
          type="button"
          variant="line"
          onClick={() => {
            void markNotificationsRead()
              .then(() => listNotifications())
              .then(setItems)
              .catch((err) => toast.error(errText(err)));
          }}
        >
          Прочитать все
        </Button>
      </div>
      {items == null ? (
        <div className="h-40 animate-pulse bg-soft" />
      ) : items.length === 0 ? (
        <p className="text-muted">Тихо. Ставки, конец аукциона, сообщения и комментарии появятся здесь.</p>
      ) : (
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {items.map((item) => (
            <li key={item.id} className={item.read ? "py-3" : "border-l-2 border-l-wine bg-wine/15 py-3"}>
              <a href={item.href} className="block px-2">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted">{item.body}</p>
                <p className="mt-1 font-mono text-xs text-muted" suppressHydrationWarning>
                  {formatWhen(item.createdAt)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
