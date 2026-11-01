import { useEffect, useState } from "react";
import { getBearerToken } from "@/lib/auth/client";
import type { ChatImage } from "@/lib/market/shared";

/** Loads the original bytes. The server does not recompress chat pictures. */
export function ChatPictures({ images }: { images: ChatImage[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto">
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

  function save() {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = image.filename || "image";
    link.click();
  }

  if (failed) return <span className="font-mono text-xs text-muted">нет файла</span>;
  if (!url) return <span className="inline-block h-24 w-24 shrink-0 animate-pulse bg-soft" />;
  return (
    <button type="button" onClick={save} title="Скачать" className="shrink-0">
      <img src={url} alt="" className="h-24 w-24 border border-ink/20 object-cover" />
    </button>
  );
}
