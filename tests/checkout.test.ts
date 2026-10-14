import { describe, expect, it } from "vitest";

import { formatBRL, lineTotal, sumCents } from "@/lib/money";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { orderMessage, whatsappUrl } from "@/lib/whatsapp";

/**
 * `Intl.NumberFormat("pt-BR")` separa "R$" do valor com **espaço não
 * separável** (U+00A0), não com espaço comum. Isso é a tipografia certa — o
 * símbolo não pode ficar sozinho no fim de uma linha — e é o que o produto
 * emite de verdade.
 *
 * Os testes constroem a string esperada com esse caractere em vez de digitar
 * um espaço comum, que passaria despercebido na revisão e reprovaria o código
 * correto. Se alguém vier "consertar" isto, o conserto é no teste.
 */
const brl = (v: string) => `R$\u00a0${v}`;

describe("dinheiro", () => {
  it("formata em real brasileiro", () => {
    expect(formatBRL(4990)).toBe(brl("49,90"));
    expect(formatBRL(10500)).toBe(brl("105,00"));
    expect(formatBRL(0)).toBe(brl("0,00"));
  });

  /**
   * O motivo de tudo ser centavo inteiro.
   *
   * Em ponto flutuante, 10,10 × 3 dá 30,299999999999997. Três centavos
   * perdidos por linha viram prejuízo real num ano de pedidos.
   */
  it("não perde centavo em soma e multiplicação", () => {
    expect(lineTotal(1010, 3)).toBe(3030);
    expect(sumCents([1010, 1010, 1010])).toBe(3030);
    expect(formatBRL(lineTotal(1010, 3))).toBe(brl("30,30"));

    const total = sumCents(Array.from({ length: 100 }, () => 1));
    expect(total).toBe(100);
    expect(formatBRL(total)).toBe(brl("1,00"));
  });
});

describe("telefone", () => {
  it("entende os formatos que um brasileiro digita", () => {
    for (const written of [
      "(31) 97596-5032",
      "31975965032",
      "31 97596 5032",
      "+55 31 97596-5032",
      "5531975965032",
    ]) {
      expect(normalizePhone(written)).toBe("5531975965032");
    }
  });

  it("recusa o que não dá para discar", () => {
    for (const bad of ["", "123", "abc", "9999999999999999"]) {
      expect(normalizePhone(bad)).toBeNull();
    }
  });

  it("mostra de volta num formato legível", () => {
    expect(formatPhone("5531975965032")).toBe("(31) 97596-5032");
  });
});

describe("mensagem do WhatsApp", () => {
  const order = {
    code: "LC-000123",
    customerName: "Maria Silva",
    items: [
      { title: "Caminho", quantity: 1, unitPriceCents: 4990, lineTotalCents: 4990 },
      { title: "Sulco", quantity: 2, unitPriceCents: 6200, lineTotalCents: 12400 },
    ],
    totalCents: 17390,
  };

  it("formata unidades, itens e total em português claro", () => {
    const text = orderMessage(order);
    expect(text).toContain("*Meu pedido:*");
    expect(text).toContain(`1. Caminho — ${brl("49,90")}`);
    expect(text).toContain(`2. 2x Sulco — ${brl("62,00")}/un. = ${brl("124,00")}`);
    expect(text).toContain(`*Total: ${brl("173,90")}*`);
    expect(text).toContain("Nome: Maria Silva");
    expect(text).toContain("receber os dados para pagamento por PIX");
    expect(text).not.toContain("📚");
  });

  it("inclui a observação só quando existe", () => {
    expect(orderMessage(order)).not.toContain("Observação");
    expect(orderMessage({ ...order, notes: "Retiro sábado" })).toContain(
      "Observação: Retiro sábado",
    );
  });

  it("o link vai para o número configurado e sobrevive a acento e quebra de linha", () => {
    const url = whatsappUrl(orderMessage(order));
    expect(url.startsWith("https://wa.me/5531975965032?text=")).toBe(true);

    // O que importa é voltar idêntico do outro lado.
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toBe(orderMessage(order));
    expect(url).not.toContain(" ");
    expect(url).not.toContain("\n");
    // O espaço não separável também precisa viajar codificado.
    expect(url).not.toContain("\u00a0");
  });

  it("respeita um número diferente quando a loja mudar de WhatsApp", () => {
    expect(whatsappUrl("oi", "5511988887777")).toContain("wa.me/5511988887777");
  });
});
