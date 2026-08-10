// =====================================================
// Malama — Mensagem real de erro de uma Edge Function
//
// supabase.functions.invoke() devolve um FunctionsHttpError genérico
// ("Edge Function returned a non-2xx status code") em qualquer resposta
// não-2xx. O motivo de verdade está no corpo, exposto em .context (Response).
// Sem ler isso, o admin vê só "erro, tente novamente" e não tem o que fazer.
// =====================================================

export async function edgeFunctionErrorMessage(
  error: unknown,
  fallback = 'Erro inesperado. Tente novamente.',
): Promise<string> {
  const err = error as { message?: string; context?: Response };
  let msg = err?.message || fallback;

  const resp = err?.context;
  if (resp && typeof resp.json === 'function') {
    try {
      const body = await resp.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      try {
        const text = await resp.clone().text();
        if (text) msg = text.slice(0, 300);
      } catch { /* mantém msg padrão */ }
    }
  }

  return msg;
}
