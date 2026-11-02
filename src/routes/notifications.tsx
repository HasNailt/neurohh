import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/notifications")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: { q: "", tag: "", kind: "all", pay: "", sort: "new", page: 1 },
    });
  },
});
