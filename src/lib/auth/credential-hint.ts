import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { providerLabel } from "@/lib/market/shared";

/** Why an email/password sign-in was rejected. Does not say whether the password itself matched. */
export const credentialHint = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const email =
      input && typeof input === "object" && "email" in input && typeof input.email === "string"
        ? input.email.trim().toLowerCase()
        : "";
    if (!email.includes("@") || email.length > 200) throw new Error("Проверьте email");
    return { email };
  })
  .handler(async ({ data }): Promise<{ kind: "unknown" | "password" | "social"; via: string }> => {
    try {
      const sql = await getSql();
      const users = await sql<{ id: string }>`
        select id from "user" where lower(email) = ${data.email} limit 1
      `;
      const user = users[0];
      if (!user) return { kind: "unknown", via: "" };
      const accounts = await sql<{ provider_id: string; has_password: boolean }>`
        select "providerId" as provider_id,
          ("password" is not null and length("password") > 0) as has_password
        from account
        where "userId" = ${user.id}
      `;
      if (accounts.some((row) => row.provider_id === "credential" && row.has_password)) {
        return { kind: "password", via: "" };
      }
      const via = [
        ...new Set(
          accounts
            .map((row) => row.provider_id)
            .filter((id) => id !== "credential" && id !== "grok-gate")
            .map((id) => providerLabel(id)),
        ),
      ];
      return { kind: "social", via: via.join(", ") || "соцсеть" };
    } catch {
      return { kind: "unknown", via: "" };
    }
  });
