/**
 * Configuracao que vem do ambiente.
 *
 * O numero do WhatsApp mora aqui e em lugar nenhum mais: quando a loja mudar
 * de numero, muda uma variavel de ambiente — nao se cacam strings pelo codigo.
 */
export const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER ?? "5531975965032";

export const STORE_NAME = "Lojinha do Centro";
export const STORE_PLACE = "Centro Cultural Itacolomy";
