import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { AppShell } from "@/components/shell";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { themeBoot } from "@/lib/site-theme";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AdoptAI — маркетплейс адоптов" },
      {
        name: "description",
        content:
          "Аукционы и фиксированная цена на персонажей. Оплата вне площадки, переписка в сделке.",
      },
      { name: "theme-color", content: "#131211" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="ru" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--color-card)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-ink)",
                borderRadius: "2px",
              },
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
