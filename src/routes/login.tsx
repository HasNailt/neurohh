import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { authClient, rememberSessionToken } from "@/lib/auth/client";
import { credentialHint } from "@/lib/auth/credential-hint";
import { stageInvite } from "@/lib/auth/invite-gate";
import { getLoginOptions } from "@/lib/auth/login-options";
import { openEmailSession } from "@/lib/auth/open-email-session";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Вход — AdoptAI" }] }),
  component: LoginPage,
});

type LoginOptions = { requireInvite: boolean };

function mapAuth(message: string): string {
  if (/invite|инвайт/i.test(message)) return message;
  if (/already|exist/i.test(message)) return "Такой email уже зарегистрирован";
  if (/invalid email or password/i.test(message)) return "Неверный email или пароль";
  if (/password/i.test(message) && /8|short|least|characters/i.test(message)) return "Пароль — минимум 8 символов";
  if (/invalid email/i.test(message)) return "Проверьте email";
  return message;
}

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<LoginOptions | null>(null);

  useEffect(() => {
    void getLoginOptions()
      .then(setOptions)
      .catch(() => setOptions({ requireInvite: false }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error") ?? "";
    const detail = params.get("error_description") ?? "";
    if (/invite|инвайт|forbidden/i.test(`${code} ${detail}`)) {
      setError("Для нового аккаунта нужен действующий инвайт-код");
    }
  }, []);

  async function stageIfNeeded(mustHaveCode: boolean) {
    if (!options?.requireInvite) return;
    const code = invite.trim();
    if (!code) {
      if (mustHaveCode) throw new Error("Для регистрации нужен инвайт-код");
      return;
    }
    await stageInvite({ data: { code } });
  }

  async function finishSignIn(emailValue: string, passwordValue: string) {
    const res = await authClient.signIn.email({ email: emailValue, password: passwordValue });
    if (!res.error) return;
    const opened = await openEmailSession({ data: { email: emailValue, password: passwordValue } });
    if (opened.ok) {
      rememberSessionToken(opened.token);
      return;
    }
    throw new Error(opened.message || res.error.message || "Не получилось");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailValue = String(form.get("email") ?? "").trim().toLowerCase();
    const passwordValue = String(form.get("password") ?? "");
    const nameValue = String(form.get("name") ?? "").trim();
    setError(null);
    setBusy(true);
    try {
      if (!emailValue.includes("@")) throw new Error("Проверьте email");
      if (passwordValue.length < 8) throw new Error("Пароль — минимум 8 символов");
      if (mode === "up") {
        await stageIfNeeded(true);
        const res = await authClient.signUp.email({
          email: emailValue,
          password: passwordValue,
          name: nameValue || emailValue.split("@")[0] || "Художник",
        });
        if (res.error) throw new Error(res.error.message || "Не получилось");
        // autoSignIn already opened a session. A second sign-in must not turn
        // a successful registration into «Неверный email или пароль».
        if (!res.data?.token) await finishSignIn(emailValue, passwordValue);
      } else {
        await finishSignIn(emailValue, passwordValue);
      }
      window.location.href = "/";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не получилось";
      if (/invalid email or password/i.test(message)) {
        const hint = await credentialHint({ data: { email: emailValue } }).catch(() => null);
        if (hint?.kind === "social") {
          setError("Для этого адреса пароль не задан. Войдите по email, для которого задавали пароль на сайте.");
          setBusy(false);
          return;
        }
      }
      setError(mapAuth(message));
      setBusy(false);
    }
  }

  const selected = "min-h-11 border border-wine bg-wine px-4 text-foam";
  const idle = "min-h-11 border border-ink/25 px-4";

  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div>
        <Kicker>insert coin</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">вход.</h1>
      </div>
      {isPending ? (
        <div className="h-40 animate-pulse bg-soft" />
      ) : user ? (
        <p>
          Вы уже вошли. <Link to="/" search={{ q: "", tag: "", kind: "all", sort: "new", page: 1 }} className="underline">На ленту</Link>
        </p>
      ) : (
        <>
          {options?.requireInvite ? (
            <label className="block text-sm">
              Инвайт-код
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="GLYPH-XXXX-XXXX"
                className={`${fieldClass} mt-1 font-mono uppercase`}
              />
              <span className="mt-1 block text-xs text-muted">
                Новым аккаунтам нужен код от администратора. Если вы уже регистрировались — оставьте поле пустым.
              </span>
            </label>
          ) : null}
          <div className="flex gap-2">
            <button type="button" className={mode === "up" ? selected : idle} onClick={() => setMode("up")}>
              Регистрация
            </button>
            <button type="button" className={mode === "in" ? selected : idle} onClick={() => setMode("in")}>
              Вход
            </button>
          </div>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3" autoComplete="on">
            {mode === "up" ? (
              <label className="block text-sm">
                Имя
                <input name="name" autoComplete="name" className={`${fieldClass} mt-1`} maxLength={40} />
              </label>
            ) : null}
            <label className="block text-sm">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-sm">
              Пароль
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`${fieldClass} mt-1`}
              />
            </label>
            {mode === "in" ? (
              <div className="text-right">
                <Link to="/forgot" className="font-mono text-xs text-muted hover:text-ink">
                  Забыли пароль?
                </Link>
              </div>
            ) : null}
            {error ? <p className="text-sm">{error}</p> : null}
            <Button type="submit" variant="wine" disabled={busy} className="w-full">
              {busy ? "Секунду…" : mode === "up" ? "Создать аккаунт" : "Войти по email"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}