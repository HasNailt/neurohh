import { getBearerToken } from "@/lib/auth/client";
import { uploadMedia } from "@/lib/market/server";
import { FILE_MAX, MAX_DIM, PREVIEW_MAX } from "@/lib/market/shared";

function readB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const cut = raw.indexOf(",");
      resolve(cut >= 0 ? raw.slice(cut + 1) : raw);
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

export async function pushFile(listingId: string, file: File, kind: "preview" | "file") {
  const max = kind === "preview" ? PREVIEW_MAX : FILE_MAX;
  if (file.size > max) {
    throw new Error(kind === "preview" ? `«${file.name}» больше 2 МБ` : `«${file.name}» больше 4 МБ`);
  }
  if (file.size < 32) throw new Error("Файл пустой");
  if (file.type.startsWith("image/")) {
    const bmp = await createImageBitmap(file);
    const { width, height } = bmp;
    bmp.close();
    if (width > MAX_DIM || height > MAX_DIM) {
      throw new Error(`«${file.name}» больше ${MAX_DIM}×${MAX_DIM}`);
    }
  } else if (kind === "preview") {
    throw new Error("Превью — только PNG, JPG, WEBP или GIF");
  }
  const b64 = await readB64(file);
  await uploadMedia({ data: { listingId, kind, filename: file.name, b64 } });
}

export async function downloadMedia(id: string, filename: string) {
  const token = getBearerToken();
  const res = await fetch(`/api/media/${id}`, {
    credentials: "same-origin",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Файл недоступен");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
