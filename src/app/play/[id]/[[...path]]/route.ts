import { getGame, readGameFile } from "@/lib/games";
import { assetSources, isId } from "@/lib/http";
import { contentTypeFor, servedPath } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path } = await context.params;
  if (!isId(id)) return missing();
  const game = await getGame(id);
  if (!game) return missing();
  const requested = servedPath(path && path.length > 0 ? path.join("/") : game.entryPath);
  if (!requested) return missing();
  const bytes = await readGameFile(id, requested);
  const type = contentTypeFor(requested);
  const sources = assetSources(request);
  if (!bytes || !type || !sources) return missing();
  return new Response(Buffer.from(bytes), {
    headers: headersFor(sources, requested, type),
  });
}

function missing(): Response {
  return new Response("見つかりません", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
}

function headersFor(sources: string, path: string, type: string): Headers {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const scripts = ext === "html" || ext === "htm";
  const headers = new Headers();
  headers.set("content-type", type);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("cache-control", "public, max-age=300");
  headers.set("content-security-policy", csp(sources, scripts));
  return headers;
}

function csp(sources: string, scripts: boolean): string {
  return [
    scripts ? "sandbox allow-scripts" : "sandbox",
    `default-src ${sources}`,
    scripts ? `script-src ${sources} 'unsafe-inline' 'unsafe-eval' blob:` : "script-src 'none'",
    `style-src ${sources} 'unsafe-inline'`,
    `img-src ${sources} data: blob:`,
    `media-src ${sources} data: blob:`,
    `font-src ${sources} data:`,
    scripts ? `connect-src ${sources}` : "connect-src 'none'",
    "worker-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    `frame-ancestors ${sources}`,
  ].join("; ");
}
