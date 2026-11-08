import { connection } from "next/server";
import { FileField } from "@/components/file-field";
import { POST_ERRORS } from "@/lib/limits";

export const dynamic = "force-dynamic";

export const metadata = { title: "投稿する" };

export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { error } = await searchParams;
  const message = error && Object.hasOwn(POST_ERRORS, error) ? POST_ERRORS[error] : "";

  return (
    <>
      <h1>ゲームを投稿する</h1>
      <p className="lede">作者名は表示名です。初期値は吉原 望です。別の名前にも変えられます。</p>
      {message ? (
        <p className="banner" role="alert">
          {message}
        </p>
      ) : null}
      <form className="form" action="/api/games" method="post" encType="multipart/form-data">
        <label>
          タイトル
          <input name="title" type="text" required maxLength={48} autoComplete="off" />
        </label>
        <label>
          作者名
          <input name="author" type="text" required maxLength={32} defaultValue="吉原 望" autoComplete="nickname" />
        </label>
        <label>
          説明
          <textarea name="description" required maxLength={300} />
        </label>
        <FileField
          label="ゲームのファイル"
          name="file"
          accept=".html,.htm,.zip,text/html,application/zip"
          required
          empty="選択されていません"
        />
        <FileField
          label="サムネイル（任意）"
          name="thumb"
          accept="image/png,image/jpeg,image/gif,image/webp"
          empty="選択されていません"
        />
        <ul className="notes">
          <li>HTMLファイルを1つ投稿するときは、絵もスクリプトもその中に書きます。</li>
          <li>複数ファイルのときは zip にして、いちばん上の階層に index.html を置きます。JS、CSS、画像、音声を同梱できます。</li>
          <li>ファイルは 3MB まで。zip の中は 40 ファイル、展開後 8MB までです。</li>
          <li>ゲームはページの中の砂場で動き、あそび帖の本体とは分かれています。外部サイトへの接続や script の type=&quot;module&quot; は動かないことがあります。</li>
        </ul>
        <button className="submit" type="submit">
          投稿する
        </button>
      </form>
    </>
  );
}
