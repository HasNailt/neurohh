/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * Pre-wired for live preview + deploy — do not rewrite this file. To enable
 * local email/password, flip the flag in `./email-password` only (see auth skill).
 *
 * The app runs its own Better Auth at `/api/auth/*`, so the session cookie stays
 * on this app's own origin. Sign-in federates to the shared **Grok auth broker**
 * (`GROK_AUTH_ISSUER`) via the `genericOAuth` plugin — the broker brokers the
 * upstream sign-in methods (Google, X, …) and holds their shared secrets; this
 * app only holds its own client id/secret and names the upstream it wants via
 * each provider's `idp` hint.
 *
 * Tri-mode:
 *   - Deployed: the deployer injects a per-app `GROK_AUTH_*` + `BETTER_AUTH_URL`
 *     + `DATABASE_URL`, so real federated auth is persisted in Postgres.
 *   - Sandbox live preview: no injection -> falls back to the shared **preview
 *     client** (`./preview`) and derives the preview's `https://*.grok-sandbox.com`
 *     origin from the request, so real sign-in works (no demo users). Sessions
 *     and identities persist in the embedded PGLite DB (same DB as app data);
 *     the process restart wipes both. Live-preview iframe clients use a bearer
 *     token (partitioned cookies) — see `client.ts`.
 *   - Off (`VITE_AUTH_ENABLED=false`, the shipped default): no providers;
 *     `requireUserId` resolves a dev user with no database configured, and
 *     throws fail-closed once `DATABASE_URL` is set (see `verify.server.ts`).
 *
 * NEVER import this from client code — it pulls in `pg` + the preview secret +
 * server-only Better Auth internals. The client uses `@/lib/auth/client`;
 * components read the user via `@/lib/auth/use-current-user`; server functions get
 * a verified id via `@/lib/auth/middleware`.
 */
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { createHash, randomBytes } from "node:crypto";
import { resolveDatabaseUrl, sessionSecretMaterial } from "../../../scripts/database-url.mjs";
import { getSharedPool } from "../../../scripts/pg-pool.mjs";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { hashPassword, verifyPassword } from "./password.server";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { repairSessionCookie } from "./session-repair.server";
import { credentialGuard } from "./credential-guard.server";
import { assertInviteAllowsSignup, rememberInviteRedemption } from "./invite.server";
import { GROK_PROVIDERS } from "./providers";
import { pgliteDialect } from "./pglite-dialect";
import { isWorkspacePreview } from "../env.server";
import { SITE_ORIGIN } from "../site";
import {
  PREVIEW_ALLOWED_HOSTS,
  PREVIEW_CLIENT_ID,
  PREVIEW_CLIENT_SECRET,
} from "./preview";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/**
 * Preview secret must outlive module reloads: PGLite (and its session rows) is
 * stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
 * signing secret or every existing session becomes invalid mid-dev. Process
 * restart clears both the secret and PGLite together.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

/**
 * One secret for every server instance. A random fallback is fine in the
 * preview (one process, PGLite wiped on restart) but on the deployed site each
 * lambda would mint its own secret, fail the signed session cookie, and the
 * next tab focus would look like a logout.
 */
function authSecret(): string {
  const fromEnv = env("BETTER_AUTH_SECRET");
  if (fromEnv) return fromEnv;
  // SUPABASE_URL when set, else the database URI. Both are stable across
  // deploys, so the signed session cookie still verifies after a republish
  // and after the visitor switches tabs.
  const material = sessionSecretMaterial();
  if (material) return createHash("sha256").update(`neurohh-session-v1\0${material}`).digest("hex");
  return previewAuthSecret();
}

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

declare const __GROK_AUTH_CLIENT_ID_BUILD__: string;
declare const __GROK_AUTH_CLIENT_SECRET_BUILD__: string;

function buildTime(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Runtime injection wins; otherwise the value baked at `vite build`. */
function resolveGrokClient(): { id: string; secret: string } {
  const runtimeId = env("GROK_AUTH_CLIENT_ID");
  const runtimeSecret = env("GROK_AUTH_CLIENT_SECRET");
  if (runtimeId && runtimeSecret) return { id: runtimeId, secret: runtimeSecret };
  const bakedId = buildTime(
    typeof __GROK_AUTH_CLIENT_ID_BUILD__ === "string" ? __GROK_AUTH_CLIENT_ID_BUILD__ : undefined,
  );
  const bakedSecret = buildTime(
    typeof __GROK_AUTH_CLIENT_SECRET_BUILD__ === "string"
      ? __GROK_AUTH_CLIENT_SECRET_BUILD__
      : undefined,
  );
  if (bakedId && bakedSecret) return { id: bakedId, secret: bakedSecret };
  return { id: PREVIEW_CLIENT_ID, secret: PREVIEW_CLIENT_SECRET };
}

// Explicit off-switch. The deployer sets `VITE_AUTH_ENABLED=true` when it
// provisions auth; set it to "false" to force auth off everywhere (dev user).
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

// Broker federation creds: the deployer injects a per-app client when deployed;
// otherwise fall back to the shared live-preview client, which the broker accepts
// for any `*.grok-sandbox.com` callback (see `./preview`).
const grokClient = resolveGrokClient();
const grokClientId = grokClient.id;
const grokClientSecret = grokClient.secret;

/** Client id sent to auth.grok.me. Not the secret. */
export function grokOAuthClientId(): string {
  return grokClientId;
}

/** True when federated sign-in is active (real auth is enforced). */
export const authConfigured =
  !authDisabled && Boolean(grokClientId && grokClientSecret);

// This app's own Better Auth origin. When deployed the deployer injects the
// public URL. In the sandbox live preview there's no fixed URL (each preview gets
// a dynamic `*.grok-sandbox.com` host), so we hand Better Auth a dynamic baseURL:
// it derives the origin per-request from the (proxied) host, validated against the
// preview allowlist, which makes the OAuth `redirect_uri` the concrete preview URL
// the broker's preview client accepts.
const explicitBaseURL = env("BETTER_AUTH_URL");
// Explicit `string[]` (not a readonly tuple) — Better Auth's DynamicBaseURLConfig
// requires a mutable `allowedHosts: string[]`.
const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
// Local `npm run dev` (port 8080 contract). Browsers may send Origin as any of
// these for the same server — trusting only `localhost` rejects `127.0.0.1` and
// breaks email/password with "Invalid origin".
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];
// Sandbox preview has no fixed host. Production may be opened on neurohh.ru or
// the Vercel alias: the OAuth redirect_uri has to be whichever of those hosts
// the broker client allows, because the state cookie is host-only. Google
// sign-in starts on that host (see `/api/auth/google`) and, if it is not
// neurohh.ru, hands the session back there. Fallback stays the public site so a
// spoofed Host cannot become the redirect.
const baseURL = {
  allowedHosts: [
    ...previewAllowedHosts,
    "localhost",
    "127.0.0.1",
    "[::1]",
    "neurohh.ru",
    "www.neurohh.ru",
    "*.vercel.app",
  ],
  protocol: "auto" as const,
  fallback: SITE_ORIGIN,
};

function extraTrustedOrigin(): string[] {
  if (!explicitBaseURL || explicitBaseURL === SITE_ORIGIN) return [];
  try {
    const host = new URL(explicitBaseURL).hostname.toLowerCase();
    if (
      host === "neurohh.ru" ||
      host === "www.neurohh.ru" ||
      host.endsWith(".vercel.app")
    ) {
      return [explicitBaseURL.replace(/\/$/, "")];
    }
  } catch {
    /* ignore a malformed BETTER_AUTH_URL */
  }
  return [];
}

// Origins Better Auth accepts on credentialed POSTs (sign-up/sign-in, etc.).
// Missing entries here surface as FORBIDDEN "Invalid origin".
const trustedOrigins: string[] = [
  SITE_ORIGIN,
  "https://www.neurohh.ru",
  "https://neurohh.vercel.app",
  "https://*.vercel.app",
  ...LOCAL_DEV_ORIGINS,
  ...extraTrustedOrigin(),
  ...(isWorkspacePreview()
    ? [
        ...previewAllowedHosts,
        ...previewAllowedHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
      ]
    : []),
];

const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const databaseUrl = resolveDatabaseUrl();

// Real Postgres (Supabase when configured, otherwise DATABASE_URL), else the
// app's embedded PGLite — so Better Auth persists to the SAME database as lots,
// bids, and chats. Email/password users live in this database too.
const database = databaseUrl
  ? getSharedPool()
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

/** Session token cookie name — also read by the live-preview popup completion page. */
export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

export const auth = betterAuth({
  baseURL,
  // Deployed: BETTER_AUTH_SECRET, or a hash of DATABASE_URL so every instance
  // verifies the same cookie. Preview: process-stable secret (see above).
  secret: authSecret(),
  database,

  // CSRF / origin check for credentialed auth POSTs (email sign-up/sign-in, …).
  // See `trustedOrigins` construction above — must cover live preview hosts AND
  // local loopback variants, or clients get "Invalid origin".
  trustedOrigins,

  // Encrypt broker-issued OAuth tokens at rest, and treat the broker's upstreams
  // as trusted first-party identities. The broker owns identity and X emails are
  // synthetic/unverified, so WITHOUT this a login can fail with
  // `account_not_linked` (Better Auth refuses to attach an untrusted, unverified
  // identity to an existing user). Google and X carry DISTINCT emails, so this
  // never merges them into one user — they stay separate identities.
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: [
        "google",
        ...GROK_PROVIDERS.map((p) => p.providerId),
        "vk",
        "telegram",
        GATE_PROVIDER_ID,
      ],
      // X's synthetic email is never "verified", so don't gate linking on the
      // local user's email-verified state.
      requireLocalEmailVerified: false,
    },
  },

  // 30 days in the database, and a day-long signed cookie cache so a tab
  // switch does not depend on a fresh database read to stay signed in.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 },
  },

  // Local email/password. Hash is pinned to node:crypto scrypt (see password.server)
  // so sign-up and sign-in cannot disagree. Joins stay off: with them on,
  // Better Auth drops the stored password and every sign-in looks wrong.
  ...(emailAndPasswordEnabled
    ? {
        emailAndPassword: {
          enabled: true,
          autoSignIn: true,
          minPasswordLength: 8,
          maxPasswordLength: 128,
          password: {
            hash: hashPassword,
            verify: verifyPassword,
          },
        },
      }
    : {}),
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: "select_account",
          },
        },
      }
    : {}),
  experimental: { joins: false },

  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          await assertInviteAllowsSignup(user.email, context);
        },
        after: async (user) => {
          if (user?.id && user.email) await rememberInviteRedemption(user.email, user.id);
        },
      },
    },
  },

  // `__Host-` prefixed cookies: the browser REFUSES any same-named cookie that
  // carries a `Domain` attribute, so a sibling `*.grok.me` app cannot "toss" a
  // `Domain=.grok.me` session cookie onto this app. `__Host-` requires Secure +
  // Path=/ + no Domain; Better Auth otherwise uses `__Secure-` (which permits
  // Domain), so we drop its auto prefix (`useSecureCookies: false`) and set
  // Secure + the names ourselves. (Browsers allow Secure cookies on
  // `http://localhost`, so local dev still works.)
  advanced: {
    useSecureCookies: false,
    // SameSite=None + Partitioned so the cookie is actually stored in the
    // embedded preview iframe (third-party cookie blocking drops Lax cookies).
    // __Host- still forbids Domain. Top-level neurohh.ru keeps the cookie too.
    defaultCookieAttributes: {
      secure: true,
      sameSite: "none",
      path: "/",
      partitioned: true,
    },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-grok-auth.session_data" },
      account_data: { name: "__Host-grok-auth.account_data" },
      dont_remember: { name: "__Host-grok-auth.dont_remember" },
    },
  },

  plugins: [
    gateIdentitySessions(),

    // Direct Google (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Callback is
    // https://neurohh.ru/api/auth/callback/google — not auth.grok.me.

    // Accept `Authorization: Bearer <session-token>` as an alternative to the
    // cookie. Needed for the LIVE PREVIEW: the app runs in an embedded iframe
    // where cookies are partitioned, so after popup sign-in it authenticates with
    // a bearer token instead (see `client.ts` / the `auth` skill). The hook only
    // fires when an Authorization header is present, so the cookie path
    // (deployed apps) is unaffected.
    bearer(),

    // After bearer, so a raw email-login token or a cookie whose signature no
    // longer verifies is looked up in the database and re-signed.
    repairSessionCookie(),

    // Writes the credential hash on sign-up and lines the row up before sign-in.
    credentialGuard(),

    // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
    // last so it runs after every other plugin's hooks.
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

// Re-exported for convenience; the array lives in the dependency-free
// `providers.ts` so the client can import it too.
export { GROK_PROVIDERS } from "./providers";
