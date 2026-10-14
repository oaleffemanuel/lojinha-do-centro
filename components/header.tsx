"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/components/cart-context";

export function Header() {
  const { count, ready } = useCart();
  const path = usePathname();
  if (path.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-baseline gap-2">
          <span className="font-serif text-[19px] font-semibold tracking-tight group-hover:text-ochre">
            Lojinha
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-graphite">do Centro</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Navegação principal">
          <Link
            href="/livros"
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-graphite hover:bg-paper-2 hover:text-ink"
          >
            Livros
          </Link>
          <Link
            href="/carrinho"
            className="relative rounded-lg px-3 py-2 text-sm font-medium text-graphite hover:bg-paper-2 hover:text-ink"
          >
            Carrinho
            {/* Só aparece depois de ler o localStorage: mostrar "0" e trocar
                para "3" logo em seguida seria um salto na tela. */}
            {ready && count > 0 ? (
              <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-ochre px-1.5 py-0.5 text-xs font-semibold text-paper">
                {count}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
