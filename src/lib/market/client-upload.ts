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

/** Reject a preview before a lot exists. Throws instead of uploading. */
export async function checkPreviewFile(file: File): Promise<void> {
  if (file.size > PREVIEW_MAX) throw new Error(`«${file.name}» больше 4 МБ`);
  if (file.size < 32) throw new Error("Файл пустой");
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Превью — только PNG, JPG, WEBP или GIF");
  }
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error("Превью — только PNG, JPG, WEBP или GIF");
  }
  const { width, height } = bmp;
  bmp.close();
  if (width > MAX_DIM || height > MAX_DIM) {
    throw new Error(`«${file.name}» больше ${MAX_DIM}×${MAX_DIM}`);
  }
}

export async function pushFile(listingId: string, file: File, kind: "preview" | "file") {
  if (kind === "preview") {
    await checkPreviewFile(file);
  } else {
    if (file.size > FILE_MAX) throw new Error(`«${file.name}» больше 4 МБ`);
    if (file.size < 32) throw new Error("Файл пустой");
    if (file.type.startsWith("image/")) {
      const bmp = await createImageBitmap(file);
      const { width, height } = bmp;
      bmp.close();
      if (width > MAX_DIM || height > MAX_DIM) {
        throw new Error(`«${file.name}» больше ${MAX_DIM}×${MAX_DIM}`);
      }
    }
  }
  const b64 = await readB64(file);
  await uploadMedia({ data: { listingId, kind, filename: file.name, b64 } });
}