import Link from "next/link";

import { AddToCart } from "@/components/add-to-cart";
import { Availability } from "@/components/availability";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/catalog";
import { formatBRL } from "@/lib/money";

export function BookCard({ book, coverUrl }: { book: Book; coverUrl?: string }) {
  return (
    <article className="book-card group">
      <Link
        href={`/livros/${book.isbn}`}
        aria-label={book.title}
      >
        <BookCover title={book.title} url={coverUrl} />
      </Link>

      <div className="book-card-body">
        <Link href={`/livros/${book.isbn}`} className="book-card-title">
          {book.title}
        </Link>
        <p className="book-card-author">{book.author || "Autor não informado"}</p>
        <div className="book-card-meta"><Availability value={book.availability} /><p>{formatBRL(book.price_cents)}</p></div>
        <div className="book-card-action">
          <AddToCart bookId={book.id} title={book.title} />
        </div>
      </div>
    </article>
  );
}
