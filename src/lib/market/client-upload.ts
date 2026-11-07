import { attachDealImage, attachDmImage, uploadMedia } from "@/lib/market/server";
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

function drawJpeg(bmp: ImageBitmap, edge: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height, 1));
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = "#131211";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));
}

/** Cover for the feed: about 800–1200 px and 200–400 KB. Does not upscale. */
async function compressCover(file: Blob): Promise<Blob | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const long = Math.max(bmp.width, bmp.height, 1);
    const edges = [Math.min(1200, long)];
    if (long > 1000) edges.push(1000);
    if (long > 800) edges.push(800);
    const maxBytes = 400 * 1024;
    const qualities = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54, 0.48, 0.4, 0.32];
    let smallest: Blob | null = null;
    for (const edge of edges) {
      let under: Blob | null = null;
      for (const quality of qualities) {
        const blob = await drawJpeg(bmp, edge, quality);
        if (!blob) continue;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= maxBytes) {
          under = blob;
          break;
        }
      }
      if (under) return under;
    }
    return smallest;
  } finally {
    bmp.close();
  }
}

async function canvasJpeg(file: Blob, edge: number, quality: number): Promise<Blob | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    return await drawJpeg(bmp, edge, quality);
  } finally {
    bmp.close();
  }
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

export async function pushDmImage(messageId: string, file: File): Promise<void> {
  await checkChatImage(file);
  const b64 = await readB64(file);
  if (b64.length < 32) throw new Error("Не удалось прочитать файл");
  await attachDmImage({ data: { messageId, filename: file.name, b64 } });
}

export async function pushFile(listingId: string, file: File, kind: "preview" | "file", cover = false) {
  if (kind !== "preview") {
    if (file.size > FILE_MAX) throw new Error(`«${file.name}» больше 4 МБ`);
    if (file.size < 32) throw new Error("Файл пустой");
    throw new Error("Полные файлы через площадку больше не принимаются");
  }
  await checkPreviewFile(file);
  if (cover) {
    const packed = (await compressCover(file)) ?? (await canvasJpeg(file, 1200, 0.72)) ?? file;
    const b64 = await readB64(packed);
    if (b64.length < 32) throw new Error("Не удалось прочитать файл");
    const jpegName = file.name.replace(/\.\w+$/, "") + ".jpg";
    await uploadMedia({
      data: {
        listingId,
        kind,
        filename: packed instanceof File ? packed.name : jpegName,
        b64,
        cardB64: packed.type === "image/jpeg" || !(packed instanceof File) ? b64 : null,
        cover: true,
      },
    });
    return;
  }
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