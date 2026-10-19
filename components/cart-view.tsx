"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import { Availability } from "@/components/availability";
import { parseRecovery, RECOVERY_KEY, resolveCart, type Recovery } from "@/lib/cart";
import { formatBRL, sumCents } from "@/lib/money";
import { orderMessage, whatsappUrl } from "@/lib/whatsapp";

function linkFor(recovery: Recovery) {
  const items = resolveCart(recovery.lines);
  return whatsappUrl(orderMessage({ items, totalCents: sumCents(items.map((item) => item.lineTotalCents)) }));
}

export function CartView() {
  const { lines, ready, setQuantity, remove, clear, restore } = useCart();
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [error, setError] = useState("");
  const [recoverable, setRecoverable] = useState(false);

  useEffect(() => {
    try {
      const saved = parseRecovery(localStorage.getItem(RECOVERY_KEY));
      setRecovery(saved);
      setRecoverable(Boolean(saved));
    } catch {}
  }, []);

  const rows = resolveCart(lines);
  const total = sumCents(rows.map((row) => row.lineTotalCents));

  function forgetRecovery() {
    setRecovery(null);
    try { localStorage.removeItem(RECOVERY_KEY); } catch {}
  }

  function handoff(event: React.FormEvent) {
    event.preventDefault();
    if (!rows.length) return;
    const saved = { lines: [...lines] };
    try {
      const url = linkFor(saved);
      setRecovery(saved);
      let persisted = false;
      try {
        localStorage.setItem(RECOVERY_KEY, JSON.stringify(saved));
        persisted = true;
      } catch {}
      setRecoverable(persisted);
      const opened = window.open(url, "_blank");
      if (opened) {
        opened.opener = null;
        if (persisted) clear();
        setError(persisted ? "" : "Seu navegador não permitiu guardar a cópia de recuperação. Mantivemos o carrinho.");
      } else {
        setError("Não conseguimos abrir o WhatsApp automaticamente. Seu carrinho foi mantido; use o link abaixo.");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não conseguimos preparar a mensagem. Seu carrinho foi mantido.");
    }
  }

  if (!ready) return <p className="mt-8 text-graphite">Carregando seu carrinho…</p>;

  return (
    <>
      {error ? <p role="alert" className="mt-5 rounded-lg border border-line bg-paper-2 p-4">{error}</p> : null}
      {recovery ? <section aria-label="Recuperar lista para WhatsApp" className="mt-5 rounded-xl border border-line bg-white p-5">
        <h2 className="font-serif text-xl">Sua lista está pronta</h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">Envie a mensagem no WhatsApp para a loja receber seu pedido. Abrir o aplicativo não confirma envio nem pagamento. O PIX será combinado por lá.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={linkFor(recovery)} target="_blank" rel="noopener noreferrer" onClick={() => { if (recoverable && JSON.stringify(lines) === JSON.stringify(recovery.lines)) clear(); }} className="inline-flex min-h-11 items-center rounded-lg bg-ochre px-4 py-3 font-semibold text-paper">Abrir mensagem no WhatsApp</a>
          <button type="button" onClick={() => {
            restore(recovery.lines);
            forgetRecovery();
            setError("");
          }} className="min-h-11 rounded-lg border border-line px-4">Restaurar carrinho</button>
          <button type="button" onClick={forgetRecovery} className="min-h-11 px-2 text-sm text-graphite underline">Descartar cópia</button>
        </div>
      </section> : null}

      {!rows.length ? <div className="py-10 text-center">
        <p className="text-graphite">Seu carrinho está vazio.</p>
        <Link href="/livros/" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-ink px-5 text-paper">Continuar vendo livros</Link>
      </div> : <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/livros/" className="inline-flex min-h-11 items-center text-ochre underline">Continuar vendo livros</Link>
          <button type="button" onClick={() => { clear(); forgetRecovery(); setError(""); }} className="min-h-11 rounded-lg border border-line px-3">Limpar carrinho</button>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
          {rows.map((book) => <li key={book.id} className="grid grid-cols-[1fr_auto] items-start gap-3 p-4 sm:flex sm:flex-wrap">
            <div className="col-span-2 min-w-0 flex-1">
              <Link href={`/livros/${book.isbn}/`} className="font-serif leading-snug hover:underline">{book.title}</Link>
              {book.author ? <p className="mt-1 text-xs text-graphite">{book.author}</p> : null}
              <div className="mt-2"><Availability value={book.availability} /></div>
            </div>
            <div className="flex w-fit items-center rounded-lg border border-line">
              <button type="button" onClick={() => setQuantity(book.id, book.quantity - 1)} aria-label={`Diminuir quantidade de ${book.title}`} className="size-11 text-lg">−</button>
              <span aria-live="polite" className="w-7 text-center font-semibold">{book.quantity}</span>
              <button type="button" disabled={book.quantity >= 99} onClick={() => setQuantity(book.id, book.quantity + 1)} aria-label={`Aumentar quantidade de ${book.title}`} className="size-11 text-lg disabled:opacity-40">+</button>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatBRL(book.lineTotalCents)}</p>
              <p className="text-xs text-graphite">{formatBRL(book.unitPriceCents)} cada</p>
              <button type="button" onClick={() => remove(book.id)} aria-label={`Remover ${book.title}`} className="min-h-11 text-sm text-graphite underline">Remover</button>
            </div>
          </li>)}
        </ul>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-paper-2 p-4"><span>Total</span><strong className="text-xl">{formatBRL(total)}</strong></div>
        <form onSubmit={handoff} className="mt-8 space-y-4">
          <button type="submit" className="min-h-12 w-full rounded-lg bg-ochre px-4 py-3 font-semibold text-paper">Finalizar pelo WhatsApp</button>
          <p className="text-center text-sm text-graphite">Você revisa e envia a mensagem no WhatsApp. Pagamento e retirada são combinados com a loja.</p>
        </form>
      </>}
    </>
  );
}
