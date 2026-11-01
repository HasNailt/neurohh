import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

/** Public login flags. Secrets stay on the server; the bot id is not a secret. */
export const getLoginOptions = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const botId = token.split(":")[0] ?? "";
  const vk = Boolean(process.env.VK_CLIENT_ID?.trim() && process.env.VK_CLIENT_SECRET?.trim());
  let requireInvite = false;
  try {
    const sql = await getSql();
    const rows = await sql<{ value: string }>`
      select value from site_settings where key = 'require_invite'
    `;
    requireInvite = rows[0]?.value === "true";
  } catch {
    requireInvite = false;
  }
  return {
    vk,
    google: Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()),
    telegramBotId: /^\d+$/.test(botId) ? botId : null,
    requireInvite,
  };
});
