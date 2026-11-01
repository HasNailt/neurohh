import { createServerFn } from "@tanstack/react-start";

export type PasswordResetResult = { ok: true } | { ok: false; message: string };

function emailOf(input: unknown): string {
  const email =
    input && typeof input === "object" && "email" in input && typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";
  if (!email.includes("@") || email.length > 200) throw new Error("Проверьте email");
  return email;
}

function resetOf(input: unknown): { token: string; password: string } {
  const token =
    input && typeof input === "object" && "token" in input && typeof input.token === "string" ? input.token.trim() : "";
  const password =
    input && typeof input === "object" && "password" in input && typeof input.password === "string" ? input.password : "";
  if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error("Ссылка недействительна");
  if (password.length < 8 || password.length > 128) throw new Error("Пароль — минимум 8 символов");
  return { token, password };
}

/** Client-safe RPC. Node, SMTP and the database stay in password-reset.server.ts. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ email: emailOf(input) }))
  .handler(async ({ data }): Promise<PasswordResetResult> => {
    const { requestPasswordResetEmail } = await import("./password-reset.server");
    return requestPasswordResetEmail(data.email);
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => resetOf(input))
  .handler(async ({ data }): Promise<PasswordResetResult> => {
    const { applyPasswordReset } = await import("./password-reset.server");
    return applyPasswordReset(data.token, data.password);
  });
