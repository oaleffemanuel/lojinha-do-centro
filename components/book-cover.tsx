"use client";

import { useState } from "react";

export function BookCover({ title, author, url, compact = false }: { title: string; author?: string | null; url?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`book-cover ${compact ? "book-cover-compact" : ""}`}>
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Capa de ${title}`}
          width={360}
          height={480}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="placeholder-cover">
          <span className="placeholder-kicker">LOJINHA DO CENTRO</span>
          <strong>{title}</strong>
          {author ? <span>{author}</span> : null}
          <small>Capa não disponível</small>
        </div>
      )}
    </div>
  );
}
