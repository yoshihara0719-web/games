import { NextResponse } from "next/server";
import { createGame } from "@/lib/games";
import { cleanLine, cleanText, clientKey, imageType, limited, requestOrigin, sameOrigin } from "@/lib/http";
import { LIMITS, POST_ERRORS } from "@/lib/limits";
import { packUpload, UploadError } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODES = new Set(Object.keys(POST_ERRORS));

function back(request: Request, code: string) {
  const safe = CODES.has(code) ? code : "server";
  const url = new URL("/post", requestOrigin(request) ?? new URL(request.url).origin);
  url.searchParams.set("error", safe);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return back(request, "origin");
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > LIMITS.requestBytes) {
    return back(request, "too-large");
  }
  const ip = clientKey(request);
  if (limited(`post:${ip}`, 6, 10 * 60 * 1000) || limited("post:all", 20, 10 * 60 * 1000)) {
    return back(request, "rate");
  }

  try {
    const form = await request.formData();
    const title = cleanLine(String(form.get("title") ?? ""), LIMITS.title);
    const author = cleanLine(String(form.get("author") ?? ""), LIMITS.author);
    const description = cleanText(String(form.get("description") ?? ""), LIMITS.description);
    if (!title || !author || !description) return back(request, "fields");

    const file = form.get("file");
    if (!(file instanceof File)) return back(request, "bad-type");
    const packed = await packUpload(file);

    const thumbFile = form.get("thumb");
    let thumb: Buffer | null = null;
    let thumbType: string | null = null;
    if (thumbFile instanceof File && thumbFile.size > 0) {
      if (thumbFile.size > LIMITS.thumbBytes) return back(request, "thumb");
      const bytes = new Uint8Array(await thumbFile.arrayBuffer());
      const type = imageType(bytes);
      if (!type) return back(request, "thumb");
      thumb = Buffer.from(bytes);
      thumbType = type;
    }

    const id = await createGame({
      title,
      author,
      description,
      entry: packed.entry,
      files: packed.files,
      thumb,
      thumbType,
    });
    return NextResponse.redirect(new URL(`/games/${id}`, requestOrigin(request) ?? new URL(request.url).origin), 303);
  } catch (error) {
    if (error instanceof UploadError) return back(request, error.code);
    console.error("post failed", error instanceof Error ? error.name : "unknown");
    return back(request, "server");
  }
}
