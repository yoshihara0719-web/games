"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel">
      <h1>ページを表示できませんでした</h1>
      <p>しばらくしてから、もう一度試してください。</p>
      <button type="button" onClick={reset}>
        もう一度試す
      </button>
    </section>
  );
}
