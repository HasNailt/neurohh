import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

const MAX_AGE_SEC = 60 * 60 * 24;

function botToken(): string | undefined {
  const value = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return value ? value : undefined;
}

function checkTelegram(fields: Record<string, string>, token: string): boolean {
  const hash = fields.hash;
  if (!hash || !/^[0-9a-f]+$/i.test(hash)) return false;
  const dataCheck = Object.keys(fields)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  const digest = createHmac("sha256", secret).update(dataCheck).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== digest.length) return false;
  return timingSafeEqual(given, digest);
}

function authFields(raw: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      fields[key] = String(value);
    }
  }
  return fields;
}

/**
 * Telegram Login Widget. The bot token never leaves the server.
 * Client posts the widget payload to `/api/auth/sign-in/telegram`.
 */
export function telegramPlugin(): BetterAuthPlugin {
  return {
    id: "telegram",
    endpoints: {
      signInTelegram: createAuthEndpoint(
        "/sign-in/telegram",
        { method: "POST" },
        async (ctx) => {
          const token = botToken();
          if (!token) {
            throw new APIError("SERVICE_UNAVAILABLE", {
              message: "Вход через Telegram не настроен",
            });
          }
          const raw = (ctx.body ?? {}) as Record<string, unknown>;
          const fields = authFields(raw);
          if (!fields.id || !fields.hash || !fields.auth_date) {
            throw new APIError("BAD_REQUEST", { message: "Неполные данные Telegram" });
          }
          if (!checkTelegram(fields, token)) {
            throw new APIError("UNAUTHORIZED", { message: "Подпись Telegram не сходится" });
          }
          const authDate = Number(fields.auth_date);
          if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > MAX_AGE_SEC) {
            throw new APIError("UNAUTHORIZED", { message: "Сессия Telegram устарела" });
          }

          const accountId = fields.id;
          const existing = await ctx.context.internalAdapter.findAccountByProviderId(accountId, "telegram");
          let userId = existing?.userId as string | undefined;
          if (!userId) {
            const name =
              [fields.first_name, fields.last_name].filter(Boolean).join(" ").trim() ||
              (fields.username ? `@${fields.username}` : "Telegram");
            const email = `tg${accountId}@users.telegram.invalid`;
            const created = await ctx.context.internalAdapter.createUser({
              email,
              emailVerified: false,
              name,
              ...(fields.photo_url ? { image: fields.photo_url } : {}),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            if (!created) {
              throw new APIError("INTERNAL_SERVER_ERROR", { message: "Не удалось создать аккаунт" });
            }
            userId = created.id;
            const linked = await ctx.context.internalAdapter.createAccount({
              userId,
              providerId: "telegram",
              accountId,
            });
            if (!linked) {
              throw new APIError("INTERNAL_SERVER_ERROR", { message: "Не удалось привязать Telegram" });
            }
          }

          const user = await ctx.context.internalAdapter.findUserById(userId);
          if (!user) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Пользователь не найден" });
          const session = await ctx.context.internalAdapter.createSession(userId);
          if (!session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Не удалось открыть сессию" });
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ token: session.token, user });
        },
      ),
    },
  } as BetterAuthPlugin;
}
