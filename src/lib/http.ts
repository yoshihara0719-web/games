const buckets = new Map<string, number[]>();

export function isId(id: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(id);
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const raw = forwarded || request.headers.get("x-real-ip")?.trim() || "local";
  return raw.slice(0, 80);
}

export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 2000) buckets.clear();
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}

function isHost(host: string): boolean {
  return /^[A-Za-z0-9.\-:[\]]{1,253}$/.test(host);
}

function isLoopback(host: string): boolean {
  return host === "localhost" || host.startsWith("localhost:") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

export function requestOrigin(request: Request): string | null {
  const host = request.headers.get("host")?.trim() ?? "";
  if (!isHost(host)) return null;
  if (isLoopback(host)) return `http://${host}`;
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (forwarded === "http" || forwarded === "https") return `${forwarded}://${host}`;
  try {
    const proto = new URL(request.url).protocol.replace(":", "");
    if (proto === "http" || proto === "https") return `${proto}://${host}`;
  } catch {
    return `https://${host}`;
  }
  return `https://${host}`;
}

export function assetSources(request: Request): string | null {
  const host = request.headers.get("host")?.trim() ?? "";
  if (!isHost(host)) return null;
  if (isLoopback(host)) return `http://${host}`;
  return `http://${host} https://${host}`;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost = "";
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    originHost = url.host;
  } catch {
    return false;
  }
  if (!isHost(originHost)) return false;
  const host = request.headers.get("host")?.trim() ?? "";
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  if (originHost !== host && originHost !== forwardedHost) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  return true;
}

export function cleanLine(value: string, max: number): string | null {
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!text || Array.from(text).length > max) return null;
  return text;
}

export function cleanText(value: string, max: number): string | null {
  const text = value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  if (!text || Array.from(text).length > max) return null;
  return text;
}

export function imageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/gif" | "image/webp" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function asBytes(value: unknown): Uint8Array | null {
  if (value == null) return null;
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (typeof value === "string" && value.startsWith("\\x")) {
    return new Uint8Array(Buffer.from(value.slice(2), "hex"));
  }
  return null;
}
