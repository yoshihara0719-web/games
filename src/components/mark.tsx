function hue(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function Mark({ id, title, hasThumb }: { id: string; title: string; hasThumb: boolean }) {
  if (hasThumb) {
    return <img className="thumb" src={`/thumb/${id}`} alt="" width={72} height={72} />;
  }
  if (id === "hoshihiroi") return <StarMark />;
  if (id === "todai-kuzushi") return <TowerMark />;
  const letter = Array.from(title)[0] ?? "遊";
  return (
    <span className="mono" style={{ background: `hsl(${hue(id)} 32% 26%)` }} aria-hidden="true">
      {letter}
    </span>
  );
}

function StarMark() {
  return (
    <svg className="mark" viewBox="0 0 72 72" aria-hidden="true">
      <rect width="72" height="72" fill="#10243f" />
      <circle cx="54" cy="16" r="7" fill="#f3e2b3" />
      <circle cx="58" cy="14" r="6" fill="#10243f" />
      <polygon points="36,14 40,28 54,28 43,36 47,50 36,41 25,50 29,36 18,28 32,28" fill="#ffd56a" />
      <path d="M14 56h44l-6 8H20z" fill="#c23b2e" />
    </svg>
  );
}

function TowerMark() {
  return (
    <svg className="mark" viewBox="0 0 72 72" aria-hidden="true">
      <rect width="72" height="72" fill="#1b2438" />
      <polygon points="36,6 48,18 24,18" fill="#7a3030" />
      <rect x="30" y="18" width="12" height="8" fill="#f2c14e" />
      <polygon points="24,26 48,26 54,64 18,64" fill="#3e382f" />
      <rect x="31" y="34" width="5" height="7" fill="#ffd56a" />
      <rect x="38" y="34" width="5" height="7" fill="#ffd56a" />
      <rect x="31" y="46" width="5" height="7" fill="#8aa0c8" />
      <rect x="38" y="46" width="5" height="7" fill="#ffd56a" />
    </svg>
  );
}
