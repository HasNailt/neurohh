import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { resetPassword } from "@/lib/auth/password-reset.server";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Новый пароль — AdoptAI" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== again) {
      setError("Пароли не совпадают");
      return;
    }
    setBusy(true);
    try {
      const res = await resetPassword({ data: { token, password } });
      if (!res.ok) {
        setError(res.message);
        setBusy(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div>
        <Kicker>new key</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">новый пароль</h1>
      </div>
      {!token ? (
        <div className="space-y-3">
          <p>В ссылке нет кода. Запросите сброс ещё раз.</p>
          <Link to="/forgot" className="inline-flex text-sm underline">
            Запросить ссылку
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-3 border border-ink/20 bg-card p-4">
          <p>Пароль обновлён. Войдите с новым паролем.</p>
          <Link to="/login" className="inline-flex text-sm underline">
            Ко входу
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <label className="block text-sm">
            Новый пароль
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-sm">
            Ещё раз
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              autoComplete="new-password"
              className={`${fieldClass} mt-1`}
            />
          </label>
          <p className="text-xs text-muted">Минимум 8 символов. Ссылка сгорит после сохранения.</p>
          {error ? <p className="text-sm">{error}</p> : null}
          <Button type="submit" variant="wine" disabled={busy} className="w-full">
            {busy ? "Сохраняем…" : "Сохранить пароль"}
          </Button>
        </form>
      )}
    </div>
  );
}
