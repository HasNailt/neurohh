export function asBody(buf: Buffer): Uint8Array {
  const out = new Uint8Array(buf.byteLength);
  out.set(buf);
  return out;
}

function bodyBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/** Whole body in one response. No image library, no stream. */
export function imageResponse(bytes: Uint8Array, mime: string, cacheSeconds: number): Response {
  const body = bodyBuffer(bytes);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": mime,
      "content-length": String(body.byteLength),
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
      "cache-control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "private, no-store",
    },
  });
}
