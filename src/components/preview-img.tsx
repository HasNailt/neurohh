import { useEffect, useState, type ReactNode } from "react";
import { imageData } from "@/lib/market/server";

const cache = new Map<string, string | null>();
let running = 0;
const waiters: Array<() => void> = [];

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = () => {
      running += 1;
      job().then(resolve, reject).finally(() => {
        running -= 1;
        waiters.shift()?.();
      });
    };
    if (running < 2) start();
    else waiters.push(start);
  });
}

export function PreviewImg({
  id,
  src,
  variant = "card",
  alt,
  className,
  fallback,
}: {
  id: string | null;
  src?: string | null;
  variant?: "card" | "view";
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(src ?? null);
  const [pending, setPending] = useState(!src && Boolean(id));
  useEffect(() => {
    if (src) {
      setUrl(src);
      setPending(false);
      return;
    }
    if (!id) {
      setPending(false);
      return;
    }
    const key = `${variant}:${id}`;
    if (cache.has(key)) {
      setUrl(cache.get(key) ?? null);
      setPending(false);
      return;
    }
    let stop = false;
    setPending(true);
    enqueue(() => imageData({ data: { id, variant } }))
      .then((res) => {
        cache.set(key, res.src);
        if (!stop) setUrl(res.src);
      })
      .catch(() => {
        cache.set(key, null);
        if (!stop) setUrl(null);
      })
      .finally(() => {
        if (!stop) setPending(false);
      });
    return () => {
      stop = true;
    };
  }, [id, src, variant]);
  if (!url && pending) return <div className="h-full w-full animate-pulse bg-soft" />;
  if (!url) return <>{fallback ?? null}</>;
  return <img src={url} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setUrl(null)} />;
}
