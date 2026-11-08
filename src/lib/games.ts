import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql, transaction } from "./db";
import { asBytes, imageType, isId } from "./http";
import { LIMITS } from "./limits";
import { UploadError, type PackedFile } from "./upload";

export type GameSummary = {
  id: string;
  title: string;
  author: string;
  description: string;
  playCount: number;
  createdAt: string;
  sample: boolean;
  hasThumb: boolean;
};

export type Game = GameSummary & { entryPath: string };

type GameRow = {
  id: string;
  title: string;
  author: string;
  description: string;
  play_count: number | string;
  created_at: Date | string;
  sample: boolean | number | string;
  has_thumb: boolean | number | string;
  entry_path?: string;
};

const SAMPLES = [
  {
    id: "hoshihiroi",
    title: "星ひろい",
    author: "吉原 望",
    description: "夜の川で、落ちてくる星を小さな舟で受けとめます。金の星は得点が高く、流木に当たるとライフが減ります。",
    folder: "hoshihiroi",
  },
  {
    id: "todai-kuzushi",
    title: "灯台くずし",
    author: "吉原 望",
    description: "光の玉を鏡で跳ね返し、灯台の暗い窓をすべて灯します。玉を海に落とすとライフが減ります。",
    folder: "todai-kuzushi",
  },
] as const;

export function ensureSeed(): Promise<void> {
  const holder = globalThis as unknown as { __asobichoSeed?: Promise<void> };
  holder.__asobichoSeed ??= seed().catch((error: unknown) => {
    holder.__asobichoSeed = undefined;
    throw error;
  });
  return holder.__asobichoSeed;
}

async function seed(): Promise<void> {
  await transaction(async (query) => {
    for (const sample of SAMPLES) {
      const html = readFileSync(join(process.cwd(), "seeds", sample.folder, "index.html"));
      await query(
        `insert into games (id, title, author, description, entry_path, sample)
         values ($1, $2, $3, $4, 'index.html', true)
         on conflict (id) do update set
           title = excluded.title,
           author = excluded.author,
           description = excluded.description,
           entry_path = excluded.entry_path,
           sample = true`,
        [sample.id, sample.title, sample.author, sample.description],
      );
      await query(
        `insert into game_files (game_id, path, body)
         values ($1, 'index.html', $2)
         on conflict (game_id, path) do update set body = excluded.body`,
        [sample.id, html],
      );
    }
  });
}

export async function listGames(): Promise<GameSummary[]> {
  await ensureSeed();
  const rows = await sql<GameRow>(
    `select id, title, author, description, play_count, created_at, sample,
            (thumb is not null) as has_thumb
     from games
     order by created_at desc, id desc
     limit 400`,
  );
  return rows.map(mapSummary);
}

export async function getGame(id: string): Promise<Game | null> {
  if (!isId(id)) return null;
  await ensureSeed();
  const rows = await sql<GameRow>(
    `select id, title, author, description, play_count, created_at, sample, entry_path,
            (thumb is not null) as has_thumb
     from games
     where id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row?.entry_path) return null;
  return { ...mapSummary(row), entryPath: row.entry_path };
}

export async function createGame(input: {
  title: string;
  author: string;
  description: string;
  entry: string;
  files: PackedFile[];
  thumb: Buffer | null;
  thumbType: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const incoming = input.files.reduce((sum, file) => sum + file.bytes.length, 0) + (input.thumb?.length ?? 0);
  await transaction(async (query) => {
    const counts = await query<{ n: number | string }>("select count(*)::int as n from games");
    const sizes = await query<{ bytes: number | string }>(
      "select coalesce(sum(octet_length(body)), 0)::bigint as bytes from game_files",
    );
    const count = Number(counts[0]?.n ?? 0);
    const used = Number(sizes[0]?.bytes ?? 0);
    if (count >= LIMITS.maxGames || used + incoming > LIMITS.storageBytes) throw new UploadError("storage");
    await query(
      `insert into games (id, title, author, description, entry_path, sample, thumb, thumb_type)
       values ($1, $2, $3, $4, $5, false, $6, $7)`,
      [id, input.title, input.author, input.description, input.entry, input.thumb, input.thumbType],
    );
    for (const file of input.files) {
      await query("insert into game_files (game_id, path, body) values ($1, $2, $3)", [
        id,
        file.path,
        file.bytes,
      ]);
    }
  });
  return id;
}

export async function readGameFile(id: string, path: string): Promise<Uint8Array | null> {
  if (!isId(id) || !path) return null;
  await ensureSeed();
  const rows = await sql<{ body: unknown }>("select body from game_files where game_id = $1 and path = $2", [
    id,
    path,
  ]);
  return asBytes(rows[0]?.body);
}

export async function readThumb(id: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (!isId(id)) return null;
  await ensureSeed();
  const rows = await sql<{ thumb: unknown; thumb_type: string | null }>(
    "select thumb, thumb_type from games where id = $1 and thumb is not null",
    [id],
  );
  const row = rows[0];
  if (!row?.thumb_type) return null;
  if (row.thumb_type !== "image/png" && row.thumb_type !== "image/jpeg" && row.thumb_type !== "image/gif" && row.thumb_type !== "image/webp") {
    return null;
  }
  const bytes = asBytes(row.thumb);
  if (!bytes || imageType(bytes) !== row.thumb_type) return null;
  return { bytes, type: row.thumb_type };
}

export async function incrementPlay(id: string): Promise<boolean> {
  if (!isId(id)) return false;
  await ensureSeed();
  const rows = await sql<{ id: string }>(
    "update games set play_count = least(play_count + 1, 2000000000) where id = $1 returning id",
    [id],
  );
  return rows.length > 0;
}

function mapSummary(row: GameRow): GameSummary {
  const created = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    playCount: Number(row.play_count) || 0,
    createdAt: Number.isNaN(created.getTime()) ? "" : created.toISOString(),
    sample: row.sample === true || row.sample === "t" || row.sample === 1 || row.sample === "true",
    hasThumb: row.has_thumb === true || row.has_thumb === "t" || row.has_thumb === 1 || row.has_thumb === "true",
  };
}
