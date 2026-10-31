import { useEffect, useState } from "react";
import { getBearerToken } from "@/lib/auth/client";
import type { ChatImage } from "@/lib/market/shared";

/** Loads the original bytes. The server does not recompress chat pictures. */
export function ChatPictures({ images }: { images: ChatImage[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-2 grid gap-2">
      {images.map((image) => (
        <ChatPicture key={image.id} image={image} />
      ))}
    </div>
  );
}

function ChatPicture({ image }: { image: ChatImage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stop = false;
    let objectUrl = "";
    const headers = new Headers();
    const token = getBearerToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    void fetch(`/api/chat-image/${image.id}`, { headers, credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("no");
        return res.blob();
      })
      .then((blob) => {
        if (stop) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!stop) setFailed(true);
      });
    return () => {
      stop = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image.id]);

  if (failed) return <p className="font-mono text-xs text-muted">{image.filename} не открылась</p>;
  if (!url) return <p className="font-mono text-xs text-muted">картинка…</p>;
  return (
    <figure className="space-y-1">
      <img src={url} alt="" className="max-h-72 max-w-full border border-ink/20" />
      <a href={url} download={image.filename} className="inline-flex min-h-9 items-center font-mono text-xs underline">
        Скачать {image.filename}
      </a>
    </figure>
  );
}
