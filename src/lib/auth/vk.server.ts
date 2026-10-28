import type { GenericOAuthConfig } from "better-auth/plugins";
import type { OAuth2Tokens } from "@better-auth/core/oauth2";

/**
 * VK OAuth (oauth.vk.com), not the Grok broker.
 * Redirect URI to register in the VK app:
 *   https://neurohh.ru/api/auth/oauth2/callback/vk
 */
export function vkOAuthConfig(clientId: string, clientSecret: string): GenericOAuthConfig {
  return {
    providerId: "vk",
    clientId,
    clientSecret,
    authorizationUrl: "https://oauth.vk.com/authorize",
    tokenUrl: "https://oauth.vk.com/access_token",
    scopes: ["email"],
    pkce: false,
    authentication: "post",
    authorizationUrlParams: { display: "page", v: "5.199" },
    async getToken({ code, redirectURI }) {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectURI,
        code,
      });
      const res = await fetch(`https://oauth.vk.com/access_token?${params.toString()}`);
      const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
        user_id?: number;
        email?: string;
        error?: string;
        error_description?: string;
      };
      if (!data.access_token || data.user_id == null) {
        throw new Error(data.error_description || data.error || "ВКонтакте не выдал токен");
      }
      const tokens: OAuth2Tokens = {
        accessToken: data.access_token,
        accessTokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        scopes: ["email"],
        raw: data,
      };
      return tokens;
    },
    async getUserInfo(tokens) {
      const raw = (tokens.raw ?? {}) as { user_id?: number | string; email?: string };
      const userId = raw.user_id;
      if (userId == null || !tokens.accessToken) return null;
      const url = new URL("https://api.vk.com/method/users.get");
      url.searchParams.set("user_ids", String(userId));
      url.searchParams.set("fields", "photo_200");
      url.searchParams.set("access_token", tokens.accessToken);
      url.searchParams.set("v", "5.199");
      const res = await fetch(url);
      const body = (await res.json()) as {
        response?: { first_name?: string; last_name?: string; photo_200?: string }[];
      };
      const profile = body.response?.[0];
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || "ВКонтакте";
      const email =
        typeof raw.email === "string" && raw.email.includes("@") ? raw.email : `vk${userId}@users.vk.invalid`;
      return {
        id: String(userId),
        name,
        email,
        image: profile?.photo_200,
        emailVerified: true,
      };
    },
  };
}
