import { unzipSync } from "fflate";
import { LIMITS } from "./limits";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  map: "application/json; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  bmp: "image/bmp",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "video/webm",
  mp4: "video/mp4",
  wasm: "application/wasm",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  svg: "image/svg+xml",
};

const CONTROL = /[\u0000-\u001f\u007f]/;

export class UploadError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export type PackedFile = { path: string; bytes: Buffer };

export type PackedGame = { entry: string; files: PackedFile[] };

export function contentTypeFor(path: string): string | null {
  return TYPES[extensionOf(path)] ?? null;
}

export function servedPath(path: string): string | null {
  const decision = classifyPath(path);
  if (decision.action !== "keep") return null;
  if (!TYPES[extensionOf(decision.path)]) return null;
  return decision.path;
}

export async function packUpload(file: File): Promise<PackedGame> {
  if (file.size <= 0 || file.size > LIMITS.uploadBytes) {
    throw new UploadError(file.size > LIMITS.uploadBytes ? "too-large" : "bad-type");
  }
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    assertHtml(bytes);
    return { entry: "index.html", files: [{ path: "index.html", bytes: Buffer.from(bytes) }] };
  }
  if (name.endsWith(".zip")) return packZip(bytes);
  throw new UploadError("bad-type");
}

function packZip(bytes: Uint8Array): PackedGame {
  let total = 0;
  let count = 0;
  let extracted: Record<string, Uint8Array>;
  try {
    extracted = unzipSync(bytes, {
      filter(file) {
        if (file.name.endsWith("/")) return false;
        const decision = classifyPath(file.name);
        if (decision.action === "skip") return false;
        if (decision.action === "reject") throw new UploadError(decision.code);
        if (!Number.isFinite(file.originalSize) || file.originalSize < 0 || file.originalSize > LIMITS.maxFileBytes) {
          throw new UploadError("expanded");
        }
        if (!Number.isFinite(file.size) || file.size < 0 || file.size > LIMITS.uploadBytes) {
          throw new UploadError("expanded");
        }
        if (file.compression !== 0 && file.compression !== 8) throw new UploadError("bad-zip");
        total += file.originalSize;
        count += 1;
        if (count > LIMITS.maxFiles) throw new UploadError("too-many");
        if (total > LIMITS.expandedBytes) throw new UploadError("expanded");
        const ext = extensionOf(decision.path);
        if (!TYPES[ext]) throw new UploadError("bad-ext");
        return true;
      },
    });
  } catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError("bad-zip");
  }

  const files: PackedFile[] = [];
  const seen = new Set<string>();
  for (const [name, body] of Object.entries(extracted)) {
    const decision = classifyPath(name);
    if (decision.action !== "keep") continue;
    const key = decision.path.toLowerCase();
    if (seen.has(key)) throw new UploadError("bad-name");
    seen.add(key);
    if (body.byteLength > LIMITS.maxFileBytes) throw new UploadError("expanded");
    files.push({ path: decision.path, bytes: Buffer.from(body) });
  }
  if (files.length === 0) throw new UploadError("no-index");
  if (files.reduce((sum, file) => sum + file.bytes.length, 0) > LIMITS.expandedBytes) {
    throw new UploadError("expanded");
  }

  const entry = chooseEntry(files.map((file) => file.path));
  const html = files.find((file) => file.path === entry);
  if (!html) throw new UploadError("no-index");
  assertHtml(html.bytes);
  return { entry, files };
}

function chooseEntry(paths: string[]): string {
  const rootHtml = paths.filter((path) => {
    if (path.includes("/")) return false;
    const ext = extensionOf(path);
    return ext === "html" || ext === "htm";
  });
  const index = rootHtml.find((path) => path.toLowerCase() === "index.html" || path.toLowerCase() === "index.htm");
  if (index) return index;
  if (rootHtml.length === 1) return rootHtml[0];
  throw new UploadError("no-index");
}

function assertHtml(bytes: Uint8Array): void {
  if (bytes.length === 0) throw new UploadError("bad-type");
  const head = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (head.includes(0)) throw new UploadError("bad-type");
  const text = new TextDecoder("utf-8", { fatal: false }).decode(head).toLowerCase();
  if (!text.includes("<")) throw new UploadError("bad-type");
}

function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

function classifyPath(name: string): { action: "keep"; path: string } | { action: "skip" } | { action: "reject"; code: string } {
  const normalized = name.replaceAll("\\", "/").replace(/^\/+/, "").normalize("NFC");
  if (!normalized || normalized.length > 180 || CONTROL.test(normalized)) {
    return { action: "reject", code: "bad-name" };
  }
  const parts = normalized.split("/");
  if (parts[0] === "__MACOSX") return { action: "skip" };
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    return { action: "reject", code: "bad-name" };
  }
  if (parts.some((part) => part.startsWith("."))) return { action: "skip" };
  return { action: "keep", path: normalized };
}
