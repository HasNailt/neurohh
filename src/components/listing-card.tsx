import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PreviewImg } from "@/components/preview-img";
import { Frame } from "@/components/ui-bits";
import { formatLeft, formatPrice, type ListingCard } from "@/lib/market/shared";

function LiveLeft({ endsAt }: { endsAt: string }) {
  const [text, setText] = useState("···");
  useEffect(() => {
    const tick = () => setText(formatLeft(endsAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return <span className="tabular-nums">{text}</span>;
}

export function ListingCardView({ item, showPrice = true }: { item: ListingCard; showPrice?: boolean }) {
  const price = item.kind === "auction" ? (item.currentBid ?? item.price) : item.price;
  const letter = (item.title.trim()[0] || "A").toLocaleUpperCase("ru");
  return (
    <article className="flex min-w-0 flex-col gap-3">
      <Link to="/lot/$id" params={{ id: item.id }} className="block">
        <Frame>
          <div className="poster relative overflow-hidden bg-soft">
            {item.previewId || item.previewSrc ? (
              <PreviewImg
                id={item.previewId}
                src={item.previewSrc}
                alt={item.title}
                className="h-full w-full object-cover"
                fallback={
                  <div className="grid h-full place-items-center bg-wine-deep">
                    <span className="font-display text-7xl leading-none text-foam">{letter}</span>
                  </div>
                }
              />
            ) : (
              <div className="grid h-full place-items-center bg-wine-deep">
                <span className="font-display text-7xl leading-none text-foam">{letter}</span>
              </div>
            )}
            <div className="absolute top-3 left-3 border border-ink/20 bg-paper/85 px-2 py-1 font-mono text-xs">
              {item.kind === "auction" ? "AUC" : "FIX"}
              {item.pinned ? " · PIN" : ""}
            </div>
            {item.kind === "auction" && item.endsAt && item.status === "active" ? (
              <div className="absolute top-3 right-3 bg-wine px-2 py-1 font-mono text-xs text-foam">
                <LiveLeft endsAt={item.endsAt} />
              </div>
            ) : null}
            {showPrice ? (
              <div className="absolute inset-x-0 bottom-0 border-t border-ink/15 bg-paper/85 px-3 py-2 text-ink">
                <p className="font-display text-xl tabular-nums">{formatPrice(price)}</p>
                {item.kind === "auction" && item.bidCount > 0 ? (
                  <p className="font-mono text-xs opacity-80">{item.bidCount} став.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Frame>
      </Link>
      <div className="min-w-0">
        <h2 className="font-display text-2xl leading-none">
          <Link to="/lot/$id" params={{ id: item.id }} className="hover:underline">
            {item.title}
          </Link>
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          <Link to="/u/$handle" params={{ handle: item.sellerHandle }} className="hover:text-ink">
            @{item.sellerHandle}
          </Link>
          {item.status !== "active" ? ` · ${item.status === "sold" ? "продан" : "закрыт"}` : ""}
        </p>
        {item.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Link
                key={tag.slug}
                to="/"
                search={{ q: "", tag: tag.slug, kind: "all", sort: "new", page: 1 }}
                className="border border-ink/25 px-2 py-1 font-mono text-xs hover:border-wine hover:bg-wine/20"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
