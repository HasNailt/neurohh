import jpeg from "jpeg-js";
import { PNG } from "pngjs";

type Rgba = { width: number; height: number; data: Uint8Array };

function fit(image: Rgba, maxEdge: number): Rgba {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  if (width === image.width && height === image.height) return image;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(image.height - 1, Math.floor((y * image.height) / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, Math.floor((x * image.width) / width));
      const from = (sy * image.width + sx) * 4;
      const to = (y * width + x) * 4;
      data[to] = image.data[from] ?? 0;
      data[to + 1] = image.data[from + 1] ?? 0;
      data[to + 2] = image.data[from + 2] ?? 0;
      data[to + 3] = 255;
    }
  }
  return { width, height, data };
}

function decode(input: Buffer, mime: string): Rgba | null {
  if (mime === "image/jpeg" || mime === "image/jpg") {
    const raw = jpeg.decode(input, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 18 });
    return { width: raw.width, height: raw.height, data: raw.data };
  }
  if (mime === "image/png") {
    const png = PNG.sync.read(input);
    return { width: png.width, height: png.height, data: png.data };
  }
  return null;
}

/** JPEG cover for lists: long edge 800–1200 when the source allows, about 200–400 KB. */
export function compressCoverImage(
  input: Buffer,
  mime: string,
): { jpeg: Buffer; width: number; height: number } | null {
  if (input.length < 32 || input.length > 4_200_000) return null;
  let image: Rgba | null = null;
  try {
    image = decode(input, mime);
  } catch {
    return null;
  }
  if (!image || image.width < 1 || image.height < 1) return null;
  if (image.width * image.height > 17_000_000) return null;

  const long = Math.max(image.width, image.height);
  const edges = [Math.min(1200, long)];
  if (long > 1000) edges.push(1000);
  if (long > 800) edges.push(800);
  const qualities = [88, 82, 76, 70, 64, 58, 52, 46, 40, 34];
  const maxBytes = 400 * 1024;
  let smallest: { jpeg: Buffer; width: number; height: number } | null = null;

  for (const edge of edges) {
    const fitted = fit(image, edge);
    let under: { jpeg: Buffer; width: number; height: number } | null = null;
    for (const quality of qualities) {
      const jpegBuf = Buffer.from(
        jpeg.encode({ data: fitted.data, width: fitted.width, height: fitted.height }, quality).data,
      );
      const made = { jpeg: jpegBuf, width: fitted.width, height: fitted.height };
      if (!smallest || jpegBuf.length < smallest.jpeg.length) smallest = made;
      if (jpegBuf.length <= maxBytes) {
        under = made;
        break;
      }
    }
    if (under) return under;
  }
  return smallest && smallest.jpeg.length <= 450 * 1024 ? smallest : null;
}

/** Small JPEG. Null when the file is too large or not a PNG/JPEG. */
export function jpegThumb(input: Buffer, mime: string, maxEdge: number): Buffer | null {
  if (input.length < 32 || input.length > 4_200_000) return null;
  let image: Rgba | null = null;
  try {
    image = decode(input, mime);
  } catch {
    return null;
  }
  if (!image || image.width < 1 || image.height < 1) return null;
  if (image.width * image.height > 17_000_000) return null;
  const fitted = fit(image, maxEdge);
  const encode = (quality: number) =>
    Buffer.from(jpeg.encode({ data: fitted.data, width: fitted.width, height: fitted.height }, quality).data);
  let out = encode(64);
  if (out.length > 170_000) out = encode(46);
  return out.length > 32 && out.length < 260_000 ? out : null;
}
