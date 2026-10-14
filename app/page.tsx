import Link from "next/link";

import { Availability } from "@/components/availability";
import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import { facets, searchBooks } from "@/lib/catalog";
import { STORE_NAME, STORE_PLACE } from "@/lib/config";
import { coverForIsbn } from "@/lib/covers";

export default async function Home() {
  const [{ books }, { stockCount, categories }] = await Promise.all([
    searchBooks({ page: 1 }),
    facets(),
  ]);
  const shelf = books.filter((book) => coverForIsbn(book.isbn)).slice(0, 3);
  const featured = [...books]
    .sort((first, second) => Number(Boolean(coverForIsbn(second.isbn))) - Number(Boolean(coverForIsbn(first.isbn))))
    .slice(0, 6);

  return (
    <div className="store-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">LIVROS NO CENTRO CULTURAL ITACOLOMY</p>
          <h1>Livros para levar a conversa para casa.</h1>
          <p className="hero-lede">Uma pequena livraria de espiritualidade, literatura, filosofia e formação — escolhida com calma, dentro do {STORE_PLACE}.</p>
          <div className="hero-actions">
            <Link href="/livros" className="primary-action">Explorar o catálogo</Link>
            {stockCount > 0 ? <Link href="/livros?availability=stock" className="secondary-action">Ver o que está no Centro</Link> : null}
          </div>
          <div className="hero-note"><Availability value="order" /><span>Você escolhe aqui; a gente confirma tudo pelo WhatsApp.</span></div>
        </div>
        <div className="hero-shelf" aria-label="Alguns livros do catálogo">
          {shelf.map((book, index) => <Link key={book.id} href={`/livros/${book.isbn}`} className={`shelf-book shelf-book-${index + 1}`}><BookCover title={book.title} author={book.author} url={coverForIsbn(book.isbn)?.url} compact /></Link>)}
        </div>
      </section>

      <section className="store-section discovery-section">
        <div className="section-heading"><div><p className="eyebrow">PARA COMEÇAR</p><h2>Uma estante para descobrir</h2></div><Link href="/livros" className="text-link">Ver todos os livros →</Link></div>
        <div className="book-grid book-grid-home">{featured.map((book) => <BookCard key={book.id} book={book} coverUrl={coverForIsbn(book.isbn)?.url} />)}</div>
      </section>

      {categories.length > 0 ? <section className="store-section category-section"><div className="section-heading"><div><p className="eyebrow">ESCOLHA UM CAMINHO</p><h2>Procure por assunto</h2></div></div><div className="category-grid">{categories.slice(0, 12).map((category) => <Link key={category} href={`/livros?category=${encodeURIComponent(category)}`} className="category-link"><span>{category}</span><span aria-hidden>↗</span></Link>)}</div></section> : null}

      {stockCount > 0 ? <section className="store-section stock-section"><div className="section-heading"><div><p className="eyebrow">RETIRADA NO CENTRO</p><h2>Disponível agora</h2></div><Link href="/livros?availability=stock" className="text-link">Ver os {stockCount} livros →</Link></div><div className="book-grid book-grid-stock">{books.filter((book) => book.availability === "stock").slice(0, 4).map((book) => <BookCard key={book.id} book={book} coverUrl={coverForIsbn(book.isbn)?.url} />)}</div></section> : null}

      <section className="store-section how-section"><div className="section-heading"><div><p className="eyebrow">SIMPLES ASSIM</p><h2>Como funciona</h2></div></div><ol className="how-grid"><li><span className="step-mark">01</span><strong>Escolha seus livros</strong><p>Monte uma lista com calma no catálogo.</p></li><li><span className="step-mark">02</span><strong>Envie pelo WhatsApp</strong><p>A mensagem chega pronta para a {STORE_NAME}.</p></li><li><span className="step-mark">03</span><strong>Combine a retirada</strong><p>Confirmamos disponibilidade e pagamento por PIX.</p></li></ol></section>
    </div>
  );
}
