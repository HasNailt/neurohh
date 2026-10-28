export type Magic =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "application/zip"
  | "image/vnd.adobe.photoshop";

const IMAGE_MAGICS = new Set<Magic>(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export function isRaster(magic: Magic): boolean {
  return IMAGE_MAGICS.has(magic);
}

export function sniffMagic(bytes: Uint8Array): Magic | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    return "image/webp";
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    return "application/zip";
  }
  if (bytes[0] === 0x38 && bytes[1] === 0x42 && bytes[2] === 0x50 && bytes[3] === 0x53) {
    return "image/vnd.adobe.photoshop";
  }
  return null;
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function positive(width: number, height: number): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width < 1 || height < 1 || width > 30000 || height > 30000) return null;
  return { width, height };
}

export function psdSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 22) return null;
  if (sniffMagic(bytes) !== "image/vnd.adobe.photoshop") return null;
  const view = viewOf(bytes);
  return positive(view.getUint32(18), view.getUint32(14));
}

/** Raster dimensions from file headers. Null if the file isn't a known image. */
export function decodedImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 16) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    if (bytes.length < 24) return null;
    const view = viewOf(bytes);
    return positive(view.getUint32(16), view.getUint32(20));
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return positive(bytes[6] | (bytes[7] << 8), bytes[8] | (bytes[9] << 8));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0x00 || marker === 0xff) {
        i += 1;
        continue;
      }
      if (marker === 0xd8 || marker === 0xd9) {
        i += 2;
        continue;
      }
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      if (len < 2 || i + 2 + len > bytes.length) return null;
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isSof) {
        const height = (bytes[i + 5] << 8) | bytes[i + 6];
        const width = (bytes[i + 7] << 8) | bytes[i + 8];
        return positive(width, height);
      }
      i += 2 + len;
    }
    return null;
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length > 30 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const tag = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (tag === "VP8X") {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return positive(width, height);
    }
    if (tag === "VP8L" && bytes[20] === 0x2f) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (b0 | ((b1 & 0x3f) << 8));
      const height = 1 + (((b1 & 0xc0) >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10));
      return positive(width, height);
    }
    if (tag === "VP8 ") {
      const end = Math.min(bytes.length - 8, 96);
      for (let j = 20; j < end; j += 1) {
        if (bytes[j] === 0x9d && bytes[j + 1] === 0x01 && bytes[j + 2] === 0x2a) {
          const width = (bytes[j + 3] | (bytes[j + 4] << 8)) & 0x3fff;
          const height = (bytes[j + 5] | (bytes[j + 6] << 8)) & 0x3fff;
          return positive(width, height);
        }
      }
    }
  }
  return null;
}
