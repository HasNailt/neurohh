import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { requestPasswordReset } from "@/lib/auth/password-reset.server";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Сброс пароля — AdoptAI" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await requestPasswordReset({ data: { email } });
      if (!res.ok) {
        setError(res.message);
        setBusy(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div>
        <Kicker>reset</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">пароль</h1>
      </div>
      {sent ? (
        <div className="space-y-3 border border-ink/20 bg-card p-4">
          <p>Если аккаунт с этим email есть, мы отправили ссылку для нового пароля.</p>
          <p className="text-sm text-muted">Ссылка действует 1 час и открывается один раз. Проверьте папку «Спам».</p>
          <Link to="/login" className="inline-flex text-sm underline">
            Вернуться ко входу
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <p className="text-xs text-muted">На почту придёт ссылка, чтобы задать новый пароль. Старые сессии после смены закроются.</p>
          {error ? <p className="text-sm">{error}</p> : null}
          <Button type="submit" variant="wine" disabled={busy} className="w-full">
            {busy ? "Отправляем…" : "Отправить ссылку"}
          </Button>
          <Link to="/login" className="inline-flex text-sm text-muted underline">
            Ко входу
          </Link>
        </form>
      )}
    </div>
  );
}
