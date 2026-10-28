import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { DealStatus, ListingStatus } from "@/lib/market/shared";
import { dealStatusLabel, listingStatusLabel } from "@/lib/market/shared";

export const fieldClass =
  "min-h-11 w-full border border-ink/25 bg-card px-3 text-ink outline-none placeholder:text-muted focus:border-wine";

export function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative border border-ink/20", className)}>
      <span className="pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-wine" />
      <span className="pointer-events-none absolute -top-px -right-px h-2.5 w-2.5 border-t border-r border-wine" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b border-l border-wine" />
      <span className="pointer-events-none absolute -right-px -bottom-px h-2.5 w-2.5 border-r border-b border-wine" />
      {children}
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs tracking-widest text-muted uppercase">{children}</p>
  );
}

const variants = {
  wine: "border border-wine bg-wine text-foam hover:bg-wine-deep",
  ink: "border border-ink bg-ink text-paper hover:opacity-90",
  line: "border border-ink/30 bg-card text-ink hover:border-wine",
  ghost: "text-ink hover:bg-ink/10",
} as const;

export function Button({
  variant = "ink",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 px-4 font-medium tracking-wide transition disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function StatusChip({
  kind,
  status,
}: {
  kind: "deal" | "listing";
  status: DealStatus | ListingStatus;
}) {
  const label = kind === "deal" ? dealStatusLabel(status as DealStatus) : listingStatusLabel(status as ListingStatus);
  const hot = status === "awaiting_payment" || status === "active";
  return (
    <span className={cn("inline-flex items-center border px-2 py-1 font-mono text-xs uppercase", hot ? "border-wine bg-wine text-foam" : "border-ink/30 text-ink")}>
      {label}
    </span>
  );
}
