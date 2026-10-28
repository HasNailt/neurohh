import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, fieldClass, Kicker } from "@/components/ui-bits";
import { GROK_PROVIDERS, authClient, signIn, signInTelegram } from "@/lib/auth/client";
import { stageInvite } from "@/lib/auth/invite-gate";
import { getLoginOptions } from "@/lib/auth/login-options";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { siteCallbackURL } from "@/lib/site";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Вход — AdoptAI" }] }),
  component: LoginPage,
});

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type LoginOptions = { vk: boolean; telegramBotId: string | null; requireInvite: boolean };

function mapAuth(message: string): string {
  if (/invite|инвайт/i.test(message)) return message;
  if (/already|exist/i.test(message)) return "Такой email уже зарегистрирован";
  if (/invalid email or password/i.test(message)) return "Неверный email или пароль";
  if (/password/i.test(message) && /8|short|least|characters/i.test(message)) return "Пароль — минимум 8 символов";
  if (/invalid email/i.test(message)) return "Проверьте email";
  if (/Telegram не настроен/i.test(message)) return "Вход через Telegram ещё не настроен на сервере";
  return message;
}

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<LoginOptions | null>(null);

  useEffect(() => {
    void getLoginOptions()
      .then(setOptions)
      .catch(() => setOptions({ vk: false, telegramBotId: null, requireInvite: false }));
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        await stageIfNeeded(true);
        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0] || "Художник",
        });
        if (res.error) throw new Error(res.error.message || "Не получилось");
      } else {
        const res = await authClient.signIn.email({ email: email.trim(), password });
        if (res.error) throw new Error(res.error.message || "Не получилось");
      }
      window.location.href = "/";
    } catch (err) {
      setError(mapAuth(err instanceof Error ? err.message : "Не получилось"));
      setBusy(false);
    }
  }

  async function onTelegram() {
    if (!options?.telegramBotId) {
      toast.error("Нужен TELEGRAM_BOT_TOKEN. В BotFather укажите домен neurohh.ru.");
      return;
    }
    setBusy(true);
    try {
      await stageIfNeeded(false);
      await loadTelegramWidget();
      const login = window.Telegram?.Login;
      if (!login) throw new Error("Виджет Telegram не загрузился");
      login.auth({ bot_id: options.telegramBotId }, (data) => {
        if (!data) {
          setBusy(false);
          return;
        }
        void signInTelegram(data)
          .catch((err) => {
            toast.error(mapAuth(err instanceof Error ? err.message : "Не получилось"));
            setBusy(false);
          });
      });
    } catch (err) {
      toast.error(mapAuth(err instanceof Error ? err.message : "Не получилось"));
      setBusy(false);
    }
  }

  async function onVk() {
    if (!options?.vk) {
      toast.error("Нужны VK_CLIENT_ID и VK_CLIENT_SECRET. Редирект: https://neurohh.ru/api/auth/oauth2/callback/vk");
      return;
    }
    setBusy(true);
    try {
      await stageIfNeeded(false);
      await signIn("vk", {
        callbackURL: siteCallbackURL("/"),
        errorCallbackURL: siteCallbackURL("/login"),
      });
    } catch (err) {
      toast.error(mapAuth(err instanceof Error ? err.message : "Не получилось"));
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
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            {mode === "up" ? (
              <label className="block text-sm">
                Имя
                <input value={name} onChange={(e) => setName(e.target.value)} className={`${fieldClass} mt-1`} maxLength={40} />
              </label>
            ) : null}
            <label className="block text-sm">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-sm">
              Пароль
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${fieldClass} mt-1`}
              />
            </label>
            {error ? <p className="text-sm">{error}</p> : null}
            <Button type="submit" variant="wine" disabled={busy} className="w-full">
              {busy ? "Секунду…" : mode === "up" ? "Создать аккаунт" : "Войти по email"}
            </Button>
          </form>
          <details className="border border-ink/20 bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
              Другие способы входа
            </summary>
            <div className="grid gap-2 border-t border-ink/15 p-3">
              <Button type="button" variant="line" className="w-full" disabled={busy} onClick={() => void onTelegram()}>
                Telegram
              </Button>
              <Button type="button" variant="line" className="w-full" disabled={busy} onClick={() => void onVk()}>
                ВКонтакте
              </Button>
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="line"
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void stageIfNeeded(false)
                      .then(() =>
                        signIn(p.providerId, {
                          callbackURL: siteCallbackURL("/"),
                          errorCallbackURL: siteCallbackURL("/login"),
                        }),
                      )
                      .catch((err) => {
                        toast.error(mapAuth(err instanceof Error ? err.message : "Не получилось"));
                        setBusy(false);
                      });
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function loadTelegramWidget(): Promise<void> {
  if (window.Telegram?.Login) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить виджет Telegram"));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          options: { bot_id: string; request_access?: string },
          callback: (data: TgUser | false) => void,
        ) => void;
      };
    };
  }
}