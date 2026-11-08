import { connection } from "next/server";
import { Mark } from "@/components/mark";
import { formatDate, formatPlays } from "@/lib/format";
import { listGames } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connection();
  let games: Awaited<ReturnType<typeof listGames>> = [];
  let failed = false;
  try {
    games = await listGames();
  } catch {
    failed = true;
  }

  return (
    <>
      <div className="section-head">
        <h1>いま遊べるゲーム</h1>
        {games.length > 0 ? <p className="count-label">{games.length}本</p> : null}
      </div>
      <p className="lede">手元で作ったゲームを投稿すると、ここに並んで、ブラウザですぐ遊べます。</p>
      {failed ? (
        <section className="panel">
          <h2>一覧を表示できませんでした</h2>
          <p>しばらくしてから、もう一度開いてください。</p>
        </section>
      ) : null}
      {!failed && games.length === 0 ? (
        <section className="panel">
          <p>
            まだ投稿がありません。<a className="text-link" href="/post">最初のゲームを投稿する</a>
          </p>
        </section>
      ) : null}
      <ul className="catalog">
        {games.map((game) => (
          <li key={game.id}>
            <a className="card" href={`/games/${game.id}`}>
              <Mark id={game.id} title={game.title} hasThumb={game.hasThumb} />
              <div>
                <h2>
                  {game.title}
                  {game.sample ? <span className="badge">見本</span> : null}
                </h2>
                <p className="by">{game.author}</p>
                <p className="desc">{game.description.replace(/\s+/g, " ")}</p>
                <p className="meta">
                  {formatPlays(game.playCount)}
                  {game.createdAt ? ` · ${formatDate(game.createdAt)}` : ""}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
