import { describe, expect, it } from "vitest";
import { books, facets, searchBooks } from "@/lib/catalog";
import { CART_KEY, normalizeLines, parseRecovery, resolveCart } from "@/lib/cart";
import { orderMessage, whatsappUrl } from "@/lib/whatsapp";
import { coverForIsbn } from "@/lib/covers";

describe("catálogo estático", () => {
  it("preserva os ISBNs únicos, preços em centavos e capas verificadas", () => {
    expect(books).toHaveLength(1118);
    expect(new Set(books.map((book) => book.isbn)).size).toBe(1118);
    expect(books.every((book) => Number.isInteger(book.price_cents) && book.price_cents > 0)).toBe(true);
    expect(books.filter((book) => coverForIsbn(book.isbn))).toHaveLength(215);
  });
  it("busca ISBN formatado, autor e título sem acentos", () => {
    expect(searchBooks({ q: "978-85-5638-489-8" }).total).toBe(1);
    expect(searchBooks({ q: "Luciano Bandeira" }).total).toBeGreaterThan(0);
    expect(searchBooks({ q: "30 dias, 30 vidas, 1 ceu" }).total).toBe(1);
  });
  it("combina filtros e pagina resultados", () => {
    const result = searchBooks({ category: "Biografias", publisher: "Cultor de Livros", availability: "order" });
    expect(result.total).toBeGreaterThan(0);
    expect(result.books.every((book) => book.category === "Biografias" && book.availability === "order")).toBe(true);
    expect(searchBooks({ availability: "stock" }).total).toBe(facets().stockCount);
    expect(searchBooks({ page: 2 }).books[0].id).not.toBe(searchBooks({ page: 1 }).books[0].id);
    expect(searchBooks({ page: Infinity }).page).toBe(1);
    expect(searchBooks({ q: "inexistente-xyz" }).total).toBe(0);
  });
});

describe("carrinho e WhatsApp sem servidor", () => {
  const bookId = Number("9788556384898");
  it("usa ISBN estável e mantém separado o antigo carrinho de IDs do banco", () => {
    expect(CART_KEY).not.toBe("lojinha.carrinho.v1");
    expect(normalizeLines([{ bookId: 1, quantity: 2 }])).toEqual([]);
    expect(normalizeLines([{ bookId, quantity: 2 }, { bookId, quantity: 3 }, null, { bookId, quantity: 1.5 }])).toEqual([{ bookId, quantity: 5 }]);
  });
  it("recalcula preço e total pelo catálogo, ignorando preço adulterado", () => {
    const rows = resolveCart([{ bookId, quantity: 2, price_cents: 1 } as never]);
    expect(rows[0].unitPriceCents).toBe(6200);
    expect(rows[0].lineTotalCents).toBe(12400);
  });
  it("restaura cópia válida e recusa armazenamento corrompido", () => {
    const saved = { lines: [{ bookId, quantity: 2 }], name: "Maria", notes: "Retiro sábado" };
    expect(parseRecovery(JSON.stringify(saved))).toEqual(saved);
    expect(parseRecovery("{inválido")).toBeNull();
    expect(parseRecovery(null)).toBeNull();
  });
  it("inclui lista, preços, nome e observação sem inventar código LC", () => {
    const items = resolveCart([{ bookId, quantity: 2 }, { bookId: Number("9788556385192"), quantity: 1 }]);
    const message = orderMessage({ customerName: "Maria", notes: "Retiro sábado", items, totalCents: 18390 });
    expect(message).toContain("2x 30 dias, 30 vidas, 1 céu");
    expect(message).toContain("R$\u00a062,00/un. = R$\u00a0124,00");
    expect(message).toContain("*Total: R$\u00a0183,90*");
    expect(message).toContain("Nome: Maria");
    expect(message).toContain("Observação: Retiro sábado");
    expect(message).not.toContain("LC-");
    expect(new URL(whatsappUrl(message)).searchParams.get("text")).toBe(message);
  });
  it("permite nome vazio e recusa destino inválido", () => {
    expect(orderMessage({ customerName: "", items: [], totalCents: 0 })).not.toContain("Nome:");
    expect(() => whatsappUrl("teste", "inválido")).toThrow();
  });
});
