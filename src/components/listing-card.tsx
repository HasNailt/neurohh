import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PreviewImg } from "@/components/preview-img";
import { Frame } from "@/components/ui-bits";
import { formatLeft, formatPrice, type ListingCard } from "@/lib/market/shared";
import { RichText } from "@/components/rich-text";

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

export function ListingCardView({
  item,
  showPrice = true,
  dense = false,
  showSold = false,
}: {
  item: ListingCard;
  showPrice?: boolean;
  dense?: boolean;
  showSold?: boolean;
}) {
  const price = item.kind === "auction" ? (item.currentBid ?? item.price) : item.price;
  const letter = (item.title.trim()[0] || "A").toLocaleUpperCase("ru");
  return (
    <article className="min-w-0">
      <Link to="/lot/$id" params={{ id: item.id }} className="block">
        <Frame gold={item.sellerPremium}>
          <div className="poster relative overflow-hidden bg-soft">
            {item.previewId || item.previewSrc ? (
              <PreviewImg
                id={item.previewId}
                src={item.previewId ? `/api/media/${item.previewId}?s=view` : item.previewSrc}
                alt=""
                variant="view"
                className="h-full w-full object-cover"
                fallback={
                  <div className="grid h-full place-items-center bg-wine-deep">
                    <span className={dense ? "font-display text-4xl leading-none text-foam" : "font-display text-7xl leading-none text-foam"}>{letter}</span>
                  </div>
                }
              />
            ) : (
              <div className="grid h-full place-items-center bg-wine-deep">
                <span className={dense ? "font-display text-4xl leading-none text-foam" : "font-display text-7xl leading-none text-foam"}>{letter}</span>
              </div>
            )}
            <div className="absolute top-2 left-2 flex gap-1">
              <div className="border border-ink/20 bg-paper/85 px-1.5 py-0.5 font-mono text-[10px]">
                {item.kind === "auction" ? "AUC" : "FIX"}
                {item.currency === "sw" ? " · SW" : " · ₽"}
                {item.pinned ? " · PIN" : ""}
              </div>
              {item.sellerPremium ? <div className="border border-[#e6c36a] bg-[#1a1408]/85 px-1.5 py-0.5 font-mono text-[10px] text-[#e6c36a]">★</div> : null}
              {item.boosted ? <div className="bg-[#e6c36a] px-1.5 py-0.5 font-mono text-[10px] text-[#1a1408]">BOOST</div> : null}
            </div>
            {showSold && (item.status === "sold" || item.status === "ended") ? (
              <div className="absolute top-2 right-2 border border-ink/20 bg-paper/90 px-1.5 py-0.5 font-mono text-[10px] text-ink">
                Продан
              </div>
            ) : item.kind === "auction" && item.endsAt && item.status === "active" ? (
              <div className="absolute top-2 right-2 bg-wine px-1.5 py-0.5 font-mono text-[10px] text-foam">
                <LiveLeft endsAt={item.endsAt} />
              </div>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-paper via-paper/95 to-transparent px-2 pt-10 pb-2 text-ink">
              <p className={dense ? "truncate font-display text-sm leading-none" : "truncate font-display text-xl leading-none"}>
                <RichText text={item.title} />
              </p>
              <p className="mt-1 truncate font-mono text-[11px]">
                {item.sellerPremium ? <span className="star">★ </span> : null}
                <span className={item.sellerPremium ? "text-[#e6c36a]" : "text-muted"}>@{item.sellerHandle}</span>
              </p>
              {showPrice ? (
                <p className={dense ? "mt-1 font-display text-base tabular-nums leading-none" : "mt-1 font-display text-lg tabular-nums leading-none"}>
                  {formatPrice(price, item.currency)}
                </p>
              ) : null}
              {item.kind === "auction" && item.bidCount > 0 ? (
                <p className="font-mono text-[11px] text-muted">{item.bidCount} став.</p>
              ) : null}
              {item.status === "sold" && item.buyerHandles ? (
                <p className="truncate font-mono text-[11px] text-muted">
                  {item.buyerHandles.includes(", ") ? "выкупили" : "выкупил"} @{item.buyerHandles}
                </p>
              ) : null}
            </div>
          </div>
        </Frame>
      </Link>
    </article>
  );
}
