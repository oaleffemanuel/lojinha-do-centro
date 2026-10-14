/**
 * Dinheiro em centavos inteiros.
 *
 * Nada no sistema guarda ou soma reais em ponto flutuante: 0.1 + 0.2 nao da
 * 0.3, e um pedido e um compromisso com o cliente. Entra inteiro, soma
 * inteiro, e so vira texto na hora de aparecer na tela.
 */
const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/** 4990 -> "R$ 49,90" */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100);
}

/** Soma de linhas, em centavos. */
export function sumCents(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

export function lineTotal(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}
