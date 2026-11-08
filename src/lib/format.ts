export function formatPlays(count: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(count)}回遊ばれた`;
}

export function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function playSrc(id: string, entry: string): string {
  const parts = entry.split("/").map((part) => encodeURIComponent(part));
  return `/play/${encodeURIComponent(id)}/${parts.join("/")}`;
}
