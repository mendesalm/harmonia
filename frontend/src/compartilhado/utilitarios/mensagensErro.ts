/**
 * Utilitário compartilhado para extrair mensagens legíveis de erros do backend.
 * Trata 422 (Unprocessable Entity) do FastAPI, onde `detail` é uma lista de objetos,
 * sem nunca renderizar o `detail` bruto na interface.
 */
export function extrairMensagemErro(err: any, mensagemPadrao: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ');
  }
  return err?.message || mensagemPadrao;
}
