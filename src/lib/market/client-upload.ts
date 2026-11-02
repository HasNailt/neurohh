import { attachDealImage, uploadMedia } from "@/lib/market/server";
import { CHAT_IMAGE_DIM, CHAT_IMAGE_MAX, FILE_MAX, MAX_DIM, PREVIEW_MAX } from "@/lib/market/shared";

function readB64(file: Blob): Promise<string> {
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

async function canvasJpeg(file: Blob, edge: number, quality: number): Promise<Blob | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return null;
  }
  const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height, 1));
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    return null;
  }
  ctx.fillStyle = "#131211";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));
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

/** Chat pictures stay original: no canvas, no recompress. */
export async function checkChatImage(file: File): Promise<void> {
  if (file.size > CHAT_IMAGE_MAX) throw new Error(`«${file.name}» больше 3 МБ`);
  if (file.size < 32) throw new Error("Файл пустой");
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("В чат — только PNG, JPG, WEBP или GIF");
  }
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error("В чат — только PNG, JPG, WEBP или GIF");
  }
  const { width, height } = bmp;
  bmp.close();
  if (width > CHAT_IMAGE_DIM || height > CHAT_IMAGE_DIM) {
    throw new Error(`«${file.name}» больше ${CHAT_IMAGE_DIM}×${CHAT_IMAGE_DIM}`);
  }
}

export async function pushChatImage(messageId: string, file: File): Promise<void> {
  await checkChatImage(file);
  const b64 = await readB64(file);
  if (b64.length < 32) throw new Error("Не удалось прочитать файл");
  await attachDealImage({ data: { messageId, filename: file.name, b64 } });
}

export async function pushFile(listingId: string, file: File, kind: "preview" | "file", cover = false) {
  if (kind !== "preview") {
    if (file.size > FILE_MAX) throw new Error(`«${file.name}» больше 4 МБ`);
    if (file.size < 32) throw new Error("Файл пустой");
    throw new Error("Полные файлы через площадку больше не принимаются");
  }
  await checkPreviewFile(file);
  const card = await canvasJpeg(file, 640, 0.64);
  const keepGif = file.type === "image/gif" && file.size <= 700_000;
  const view = keepGif ? file : ((await canvasJpeg(file, 1200, 0.72)) ?? file);
  const [b64, cardB64] = await Promise.all([readB64(view), card ? readB64(card) : Promise.resolve(null)]);
  if (b64.length < 32) throw new Error("Не удалось прочитать файл");
  await uploadMedia({
    data: {
      listingId,
      kind,
      filename: view instanceof File ? view.name : file.name.replace(/\.\w+$/, "") + ".jpg",
      b64,
      cardB64,
      cover,
    },
  });
}