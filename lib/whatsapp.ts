import { formatBRL } from "@/lib/money";
import { STORE_NAME, WHATSAPP_NUMBER } from "@/lib/config";

export interface MessageItem {
  title: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export function orderMessage(input: {
  items: readonly MessageItem[];
  totalCents: number;
}): string {
  const lines = [
    `Olá! Gostaria de fazer uma encomenda`,
    `pela ${STORE_NAME}.`,
    "",
    "📚 *Meu pedido:*",
    ...input.items.map((item, index) => item.quantity === 1
      ? `${index + 1}. ${item.title} — ${formatBRL(item.unitPriceCents)}`
      : `${index + 1}. ${item.title} — ${item.quantity} un. × ${formatBRL(item.unitPriceCents)} = ${formatBRL(item.lineTotalCents)}`),
    "",
    `*Total: ${formatBRL(input.totalCents)}*`,
  ];
  lines.push("", "Aguardo a confirmação de disponibilidade e as orientações para pagamento e retirada.", "Obrigado!");
  return lines.join("\n");
}

/** O link que abre o WhatsApp com a mensagem pronta. */
export function whatsappUrl(message: string, phone = WHATSAPP_NUMBER): string {
  const digits = phone.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(digits)) throw new Error("Número de WhatsApp da loja inválido.");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
