import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { Availability } from "@/components/availability";
import { BookCover } from "@/components/book-cover";
import { coverForIsbn } from "@/lib/covers";
import { bookByIsbn, books } from "@/lib/catalog";
import { formatBRL } from "@/lib/money";

export const dynamicParams = false;

export function generateStaticParams() {
  return books.map((book) => ({ isbn: book.isbn! }));
}

export async function generateMetadata({ params }: { params: Promise<{ isbn: string }> }) {
  const book = await bookByIsbn((await params).isbn);
  return { title: book ? book.title : "Livro não encontrado" };
}

export default async function BookPage({ params }: { params: Promise<{ isbn: string }> }) {
  const book = await bookByIsbn((await params).isbn);
  if (!book) notFound();
  const cover = coverForIsbn(book.isbn);

  const facts: [string, string | null][] = [
    ["Autor", book.author],
    ["Editora", book.publisher],
    ["Categoria", book.category],
    ["Coleção", book.collection],
    ["ISBN", book.isbn],
  ];

  return (
    <div className="store-shell product-shell">
      <Link href="/livros" className="text-link">
        ← Livros
      </Link>

      <article className="product-detail mt-5">
        <div className="product-main">
        <div className="product-cover-column">
          <BookCover title={book.title} url={cover?.url} />
          {cover ? <a href={cover.source_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-graphite underline">Capa: {cover.source}</a> : null}
        </div>
        <div className="product-copy min-w-0">
        <p className="eyebrow">DETALHE DO LIVRO</p>
        <h1 className="font-serif text-3xl leading-tight sm:text-5xl">{book.title}</h1>
        {book.author ? <p className="mt-1.5 text-graphite">{book.author}</p> : null}

        <div className="product-price mt-5 flex flex-wrap items-center gap-4">
          <p className="text-2xl font-semibold">{formatBRL(book.price_cents)}</p>
          <Availability value={book.availability} />
        </div>

        <div className="mt-6 max-w-xs">
          <AddToCart bookId={book.id} title={book.title} size="lg" />
        </div>

        <p className="mt-4 max-w-lg text-sm leading-relaxed text-graphite">
          {book.availability === "stock"
            ? "Está no Centro — você pode retirar depois de combinarmos pelo WhatsApp."
            : "Pedimos à editora junto com os outros pedidos da semana e avisamos quando chegar."}
        </p>

        {book.description ? (
          <p className="mt-6 whitespace-pre-line leading-relaxed">{book.description}</p>
        ) : null}
        </div>
        </div>

        <dl className="product-facts mt-10 divide-y divide-line border-y border-line text-sm">
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex gap-4 py-2.5">
                <dt className="w-28 shrink-0 text-graphite">{k}</dt>
                <dd className="min-w-0">{v}</dd>
              </div>
            ))}
        </dl>
      </article>
    </div>
  );
}
