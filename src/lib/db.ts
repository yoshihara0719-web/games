import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

type Slot = {
  pool?: pg.Pool;
  local?: Promise<PGlite>;
};

const slot: Slot = ((globalThis as unknown as { __asobicho?: Slot }).__asobicho ??= {});

export type Query = <T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<T[]>;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    slot.pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await slot.pool.query(text, params)).rows as T[];
  }
  const db = await startLocal();
  return (await db.query<T>(text, params)).rows;
}

export async function transaction<T>(fn: (query: Query) => Promise<T>): Promise<T> {
  if (databaseUrl !== "") {
    slot.pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const client = await slot.pool.connect();
    const query: Query = async (text, params = []) => (await client.query(text, params)).rows as never;
    try {
      await client.query("begin");
      const result = await fn(query);
      await client.query("commit");
      return result;
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        // The connection may already be closing.
      }
      throw error;
    } finally {
      client.release();
    }
  }
  const db = await startLocal();
  return db.transaction(async (tx) => {
    const query: Query = async (text, params = []) => (await tx.query(text, params)).rows as never;
    return fn(query);
  });
}

async function startLocal(): Promise<PGlite> {
  slot.local ??= openLocal().catch((error: unknown) => {
    slot.local = undefined;
    throw error;
  });
  return slot.local;
}

async function openLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
