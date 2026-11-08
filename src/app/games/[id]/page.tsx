import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { PlayFrame } from "./play-frame";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) return { title: "見つかりません" };
  return { title: game.title, description: game.description };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return (
    <article className="game">
      <p className="back">
        <a className="text-link" href="/">
          一覧へ戻る
        </a>
      </p>
      <div className="game-top">
        <div>
          <h1>
            {game.title}
            {game.sample ? <span className="badge">見本</span> : null}
          </h1>
          <p className="by">{game.author}</p>
        </div>
      </div>
      <p className="story">{game.description}</p>
      <PlayFrame id={game.id} entry={game.entryPath} title={game.title} playCount={game.playCount} />
      <p className="fine">
        操作はゲーム画面の中で行います。画面を押すと始まります。このゲームは、あそび帖の本体から分けた場所で動いています。
      </p>
      <noscript>
        <p>遊ぶには JavaScript を有効にしてください。</p>
      </noscript>
    </article>
  );
}
