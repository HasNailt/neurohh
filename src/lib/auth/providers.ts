/**
 * Upstream identity providers federated through the Grok auth broker.
 *
 * Google only. X is intentionally not offered. Telegram and VK are direct
 * providers (see `telegram.server.ts` and `socialProviders.vk` in `server.ts`),
 * not broker idps — the broker rejects unknown upstreams.
 */
export type GrokProvider = {
  /** This app's local provider id; also the callback path segment. */
  providerId: string;
  /** Upstream hint the broker forwards to (Better Auth social id). */
  idp: string;
  /** Human label for the sign-in button. */
  label: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
];
