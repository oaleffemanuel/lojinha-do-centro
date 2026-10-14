"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CART_KEY, normalizeLines } from "@/lib/cart";

const KEY = CART_KEY;

export interface CartLine {
  bookId: number;
  quantity: number;
}

interface CartApi {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add(bookId: number, quantity?: number): void;
  setQuantity(bookId: number, quantity: number): void;
  remove(bookId: number): void;
  clear(): void;
  restore(lines: CartLine[]): void;
}

const Ctx = createContext<CartApi | null>(null);

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeLines(parsed);
  } catch {
    // Modo privativo, armazenamento cheio ou JSON corrompido: um carrinho
    // vazio é melhor do que uma tela branca.
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const clear = useCallback(() => {
    setLines([]);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  // Só depois de montar: o servidor não tem localStorage, e ler na primeira
  // renderização faria o HTML do servidor divergir do cliente.
  useEffect(() => {
    setLines(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* sem espaço ou sem permissão: o carrinho segue valendo nesta aba */
    }
  }, [lines, ready]);

  const api = useMemo<CartApi>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add(bookId, quantity = 1) {
        setLines((prev) => {
          const found = prev.find((l) => l.bookId === bookId);
          if (!found) return [...prev, { bookId, quantity }];
          return prev.map((l) =>
            l.bookId === bookId
              ? { ...l, quantity: Math.min(99, l.quantity + quantity) }
              : l,
          );
        });
      },
      setQuantity(bookId, quantity) {
        setLines((prev) =>
          quantity < 1
            ? prev.filter((l) => l.bookId !== bookId)
            : prev.map((l) =>
                l.bookId === bookId ? { ...l, quantity: Math.min(99, quantity) } : l,
              ),
        );
      },
      remove(bookId) {
        setLines((prev) => prev.filter((l) => l.bookId !== bookId));
      },
      clear,
      restore(recovered) {
        setLines((previous) => {
          const merged = new Map(previous.map((line) => [line.bookId, line.quantity]));
          for (const line of normalizeLines(recovered)) merged.set(line.bookId, Math.max(merged.get(line.bookId) ?? 0, line.quantity));
          return [...merged].map(([bookId, quantity]) => ({ bookId, quantity }));
        });
      },
    }),
    [lines, ready, clear],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}
