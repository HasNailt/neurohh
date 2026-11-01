import { Link } from "@tanstack/react-router";

export function Nick({
  handle,
  premium = false,
  className = "",
}: {
  handle: string;
  premium?: boolean;
  className?: string;
}) {
  return (
    <Link to="/u/$handle" params={{ handle }} className={`hover:underline ${className}`}>
      {premium ? (
        <span className="star" aria-hidden="true">
          ★{" "}
        </span>
      ) : null}
      <span className={premium ? "text-[#e6c36a]" : undefined}>@{handle}</span>
    </Link>
  );
}

export function PremiumBadge() {
  return <span className="border border-[#e6c36a] px-2 py-1 font-mono text-xs text-[#e6c36a]">Premium</span>;
}
