import { readThumb } from "@/lib/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const thumb = await readThumb(id);
  if (!thumb) {
    return new Response(null, {
      status: 404,
      headers: { "x-content-type-options": "nosniff", "cache-control": "no-store" },
    });
  }
  return new Response(Buffer.from(thumb.bytes), {
    headers: {
      "content-type": thumb.type,
      "x-content-type-options": "nosniff",
      "cache-control": "public, max-age=86400",
    },
  });
}
