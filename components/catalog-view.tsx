"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookCard } from "@/components/book-card";
import { facets, searchBooks } from "@/lib/catalog";

export function CatalogView({ covers }: { covers: Record<number, string> }) {
  const params = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const { books, total, page, pages } = searchBooks({ ...query, page: Number(query.page) });
  const { publishers, categories } = facets();
  const filtering = Boolean(query.q || query.publisher || query.category || query.availability);
  const pageHref = (value: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(value));
    return `/livros/?${next}`;
  };
  return (
    <div className="store-shell catalog-shell">
      <div className="catalog-heading"><div><p className="eyebrow">A ESTANTE DA LOJINHA</p><h1 className="font-serif text-4xl tracking-tight">Livros</h1><p className="mt-2 max-w-xl text-graphite">Encontre uma leitura para agora ou monte sua lista para pedir pelo WhatsApp.</p></div><span className="catalog-count">{total} títulos</span></div>
      <form action="./" className="catalog-filters" key={params.toString()}>
        <div className="flex gap-2">
          <label htmlFor="busca" className="sr-only">Buscar por título, autor ou ISBN</label>
          <input id="busca" name="q" defaultValue={query.q ?? ""} placeholder="Título, autor ou ISBN" className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-3 text-base" />
          <button className="min-h-11 rounded-lg bg-ink px-5 font-semibold text-paper">Buscar</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { name: "availability", label: "Disponibilidade", options: [["stock", "Disponível no Centro"], ["order", "Sob encomenda"]] },
            { name: "publisher", label: "Editora", options: publishers.map((publisher) => [publisher, publisher]) },
            { name: "category", label: "Categoria", options: categories.map((category) => [category, category]) },
          ].map((filter) => (
            <div key={filter.name} className="min-w-0 text-sm">
              <label htmlFor={filter.name}>{filter.label}</label>
              <select id={filter.name} name={filter.name} defaultValue={query[filter.name] ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-2 text-base">
                <option value="">Todas</option>
                {filter.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button className="min-h-11 justify-self-start rounded-lg border border-line px-4 text-sm font-medium">Aplicar filtros</button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2">
        <p role="status" className="text-sm text-graphite">{total ? `${total} livro${total === 1 ? "" : "s"}` : "Nenhum livro encontrado"}{filtering ? " com estes filtros" : ""}</p>
        {filtering ? <Link href="/livros/" className="text-sm text-ochre underline">Limpar filtros</Link> : null}
      </div>
      {total ? <div className="book-grid mt-4">
        {books.map((book) => <BookCard key={book.id} book={book} coverUrl={covers[book.id]} />)}
      </div> : <p className="py-12 text-center text-graphite">Tente outro título, autor ou categoria.</p>}
      {pages > 1 ? <nav aria-label="Paginação" className="mt-8 flex items-center justify-between gap-2 text-sm">
        {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-lg border border-line p-3">← Anterior</Link> : <span />}
        <span>Página {page} de {pages}</span>
        {page < pages ? <Link href={pageHref(page + 1)} className="rounded-lg border border-line p-3">Próxima →</Link> : <span />}
      </nav> : null}
    </div>
  );
}
