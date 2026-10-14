import type { Metadata } from "next";

import { CartProvider } from "@/components/cart-context";
import { Header } from "@/components/header";
import { STORE_NAME, STORE_PLACE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${STORE_NAME} — livraria no ${STORE_PLACE}`, template: `%s · ${STORE_NAME}` },
  description:
    `Livros de espiritualidade, literatura, filosofia e formação na ${STORE_NAME}, ` +
    `dentro do ${STORE_PLACE}. Retirada no Centro ou sob encomenda.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col">
        <CartProvider>
          <a
            href="#conteudo"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-lg focus-visible:border focus-visible:border-line focus-visible:bg-paper focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold"
          >
            Pular para o conteúdo
          </a>
          <Header />
          <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <footer className="store-footer">
            <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5 px-5 py-10 text-sm text-graphite sm:px-6">
              <div><p className="font-serif text-lg text-ink">{STORE_NAME}</p><p className="mt-1">Dentro do {STORE_PLACE}.</p></div>
              <p className="max-w-xs text-sm leading-relaxed">Pedidos pelo WhatsApp, pagamento combinado por PIX e retirada alinhada com a loja.</p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
