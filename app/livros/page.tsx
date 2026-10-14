import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { books } from "@/lib/catalog";
import { coverForIsbn } from "@/lib/covers";

export const metadata = { title: "Livros" };

export default function CatalogPage() {
  const covers = Object.fromEntries(books.map((book) => [book.id, coverForIsbn(book.isbn)?.url ?? ""]));
  return <Suspense fallback={<p className="p-5">Carregando catálogo…</p>}><CatalogView covers={covers} /></Suspense>;
}
