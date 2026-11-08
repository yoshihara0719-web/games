"use client";

import { useRef, useState } from "react";
import { formatPlays, playSrc } from "@/lib/format";

export function PlayFrame({
  id,
  entry,
  title,
  playCount,
}: {
  id: string;
  entry: string;
  title: string;
  playCount: number;
}) {
  const [plays, setPlays] = useState(playCount);
  const sent = useRef(false);

  return (
    <>
      <p className="plays">{formatPlays(plays)}</p>
      <div className="stage">
        <iframe
          title={`${title}を遊ぶ`}
          src={playSrc(id, entry)}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          onLoad={() => {
            if (sent.current) return;
            sent.current = true;
            void fetch(`/api/games/${id}/play`, { method: "POST" }).then((response) => {
              if (response.ok) setPlays((count) => count + 1);
            });
          }}
        />
      </div>
    </>
  );
}
