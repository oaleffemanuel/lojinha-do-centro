import { CartView } from "@/components/cart-view";

export const metadata = { title: "Carrinho" };

export default function CarrinhoPage() {
  return (
    <div className="store-shell cart-shell">
      <p className="eyebrow">SUA LISTA</p>
      <h1 className="font-serif text-4xl tracking-tight">Seu pedido</h1>
      <p className="mt-2 max-w-xl text-graphite">Revise os livros e envie a lista pelo WhatsApp quando estiver pronto.</p>
      <CartView />
    </div>
  );
}
