import catalog from "@/data/catalog.json";
import stockedIsbns from "@/data/availability.json";

export interface Book {
  id: number;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string;
  category: string | null;
  collection: string | null;
  description: string | null;
  price_cents: number;
  availability: "stock" | "order";
}

export interface CatalogQuery {
  q?: string;
  publisher?: string;
  category?: string;
  availability?: string;
  page?: number;
}

export const PAGE_SIZE = 24;
export const books: Book[] = catalog.map((book) => ({
  ...book,
  id: Number(book.isbn),
  description: null,
  availability: (stockedIsbns as string[]).includes(book.isbn) ? "stock" : "order",
}));

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function searchBooks(query: CatalogQuery) {
  const term = normalize(query.q?.trim() ?? "");
  const digits = term.replace(/\D/g, "");
  const matching = books.filter((book) =>
    (!query.publisher || book.publisher === query.publisher) &&
    (!query.category || book.category === query.category) &&
    (!query.availability || book.availability === query.availability) &&
    (!term || normalize([book.title, book.author, book.publisher, book.category, book.collection].join(" ")).includes(term) ||
      (digits.length >= 6 && book.isbn?.includes(digits))),
  ).sort((first, second) => Number(second.availability === "stock") - Number(first.availability === "stock") || first.title.localeCompare(second.title, "pt-BR"));
  const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(pages, Number.isSafeInteger(query.page) && query.page! > 0 ? query.page! : 1);
  return { books: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: matching.length, page, pages };
}

export function bookByIsbn(isbn: string): Book | null {
  return books.find((book) => book.isbn === isbn) ?? null;
}

export function booksByIds(ids: readonly number[]): Book[] {
  return books.filter((book) => ids.includes(book.id));
}

export function facets() {
  return {
    publishers: [...new Set(books.map((book) => book.publisher))].sort(),
    categories: [...new Set(books.map((book) => book.category).filter((category): category is string => Boolean(category)))].sort(),
    stockCount: books.filter((book) => book.availability === "stock").length,
  };
}
