/**
 * Telefone brasileiro, normalizado para o formato que o WhatsApp entende.
 *
 * Guardamos so digitos com DDI (5531999999999) porque e isso que vai no link
 * do WhatsApp. A mascara bonita e assunto da tela.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  // Sem DDI: 11 digitos (celular com 9) ou 10 (fixo). Assume Brasil.
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  // Com DDI.
  if (digits.length === 13 || digits.length === 12) {
    return digits.startsWith("55") ? digits : null;
  }
  return null;
}

/** 5531975965032 -> "(31) 97596-5032" */
export function formatPhone(stored: string): string {
  const d = stored.startsWith("55") ? stored.slice(2) : stored;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return stored;
}
