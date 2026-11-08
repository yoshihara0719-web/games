import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "あそび帖",
    template: "%s｜あそび帖",
  },
  description: "自作のHTMLゲームを投稿して、ブラウザですぐ遊べるひろば。",
};

export const viewport: Viewport = {
  themeColor: "#243056",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a className="skip" href="#main">
          本文へ
        </a>
        <header>
          <div className="bar">
            <a className="brand" href="/">
              <span className="seal">帖</span>
              あそび帖
            </a>
            <a className="button" href="/post">
              投稿する
            </a>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer>
          <p>あそび帖は、自作のHTMLゲームを置いて、その場で遊べるひろばです。作者名は、投稿する人が書いた表示名です。</p>
        </footer>
      </body>
    </html>
  );
}
