import { books } from "@/lib/catalog";

export const CART_KEY = "lojinha.carrinho.static.v1";
export const RECOVERY_KEY = "lojinha.whatsapp.recovery.v1";
export interface CartLine { bookId: number; quantity: number }
export interface Recovery { lines: CartLine[] }

export function normalizeLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const quantities = new Map<number, number>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { bookId, quantity } = item;
    if (!Number.isSafeInteger(bookId) || !books.some((book) => book.id === bookId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) continue;
    quantities.set(bookId, Math.min(99, (quantities.get(bookId) ?? 0) + quantity));
  }
  return [...quantities].map(([bookId, quantity]) => ({ bookId, quantity }));
}

export function resolveCart(lines: CartLine[]) {
  return normalizeLines(lines).map((line) => {
    const book = books.find((entry) => entry.id === line.bookId)!;
    return { ...book, quantity: line.quantity, unitPriceCents: book.price_cents, lineTotalCents: book.price_cents * line.quantity };
  });
}

export function parseRecovery(value: string | null): Recovery | null {
  try {
    const parsed = JSON.parse(value ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const lines = normalizeLines(parsed.lines);
    return lines.length ? { lines } : null;
  } catch { return null; }
}
