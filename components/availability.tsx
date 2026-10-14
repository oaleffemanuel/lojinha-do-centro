/**
 * Está aqui, ou vem por encomenda.
 *
 * As duas únicas coisas que o site precisa dizer sobre estoque. A contagem de
 * unidades continua na planilha, que é o sistema financeiro da loja — duplicar
 * saldo aqui criaria uma segunda verdade para conciliar.
 */
export function Availability({ value }: { value: "stock" | "order" }) {
  const stock = value === "stock";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
        stock
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-line bg-paper-2 text-graphite"
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${stock ? "bg-emerald-600" : "bg-graphite/50"}`}
      />
      {stock ? "Disponível no Centro" : "Sob encomenda"}
    </span>
  );
}
