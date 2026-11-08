import { incrementPlay } from "@/lib/games";
import { clientKey, isId, limited, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!sameOrigin(request) || !isId(id)) return new Response(null, { status: 204 });
  const ip = clientKey(request);
  if (limited(`play:${ip}:${id}`, 1, 2_000) || limited(`play:${ip}`, 60, 60_000)) {
    return new Response(null, { status: 429 });
  }
  const ok = await incrementPlay(id);
  return new Response(null, { status: ok ? 204 : 404 });
}
