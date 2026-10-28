import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import {
  DB_UNAVAILABLE,
  alignCredentialPassword,
  persistentDatabaseMissing,
  sealSignupPassword,
} from "./credential-store.server";

type JsonUser = { user?: { id?: string }; token?: string | null; code?: string };

async function readSignup(returned: unknown): Promise<JsonUser | null> {
  if (!returned) return null;
  if (returned instanceof Response) {
    if (!returned.ok) return null;
    try {
      return (await returned.clone().json()) as JsonUser;
    } catch {
      return null;
    }
  }
  if (typeof returned !== "object") return null;
  const bag = returned as JsonUser;
  if (bag.code || !bag.user?.id) return null;
  return bag;
}

function credentials(ctx: { body?: unknown }): { email: string; password: string } | null {
  if (!ctx.body || typeof ctx.body !== "object") return null;
  const body = ctx.body as { email?: unknown; password?: unknown };
  if (typeof body.email !== "string" || typeof body.password !== "string") return null;
  const email = body.email.trim().toLowerCase();
  if (!email.includes("@") || body.password.length < 8 || body.password.length > 128) return null;
  (ctx.body as { email: string }).email = email;
  return { email, password: body.password };
}

/**
 * Email sign-up must leave a credential row whose password verifies with the
 * same scrypt as sign-in. Sign-in aligns that row before Better Auth reads it.
 * On Vercel, refuse to pretend PGLite is a database.
 */
export function credentialGuard() {
  return {
    id: "credential-guard",
    hooks: {
      before: [
        {
          matcher: (ctx: { path?: string }) =>
            ctx.path === "/sign-in/email" || ctx.path === "/sign-up/email",
          handler: createAuthMiddleware(async (ctx) => {
            if (persistentDatabaseMissing()) {
              throw new APIError("SERVICE_UNAVAILABLE", { message: DB_UNAVAILABLE });
            }
            if (ctx.path !== "/sign-in/email") return;
            const creds = credentials(ctx);
            if (!creds) return;
            try {
              await alignCredentialPassword(creds.email, creds.password);
            } catch (err) {
              console.error("[credential] sign-in align failed", err);
            }
          }),
        },
      ],
      after: [
        {
          matcher: (ctx: { path?: string }) => ctx.path === "/sign-up/email",
          handler: createAuthMiddleware(async (ctx) => {
            const creds = credentials(ctx);
            if (!creds) return;
            try {
              const payload = await readSignup(ctx.context.returned);
              const fresh = ctx.context.newSession as { user?: { id?: string } } | null;
              const userId = payload?.user?.id || fresh?.user?.id;
              if (!userId) return;
              await sealSignupPassword(userId, creds.password);
            } catch (err) {
              console.error("[credential] sign-up seal failed", err);
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
