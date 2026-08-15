// =====================================================
// Malama — Rola até a âncora da URL depois que a tela carrega
//
// O app usa <BrowserRouter> sem <ScrollRestoration>. Um <Link> navega por
// pushState, e pushState NÃO rola até o fragmento — quem faz isso é a
// navegação nativa do browser, que o <Link> justamente evita. Sem este
// hook, todo botão que aponta para "#alvo" da própria página fica inerte:
// a URL muda, a tela não. Foi o que matou os dois primeiros passos do
// guia do RH ("cadastrar setores", "adicionar colaboradores").
//
// `pronto` existe porque o alvo costuma estar atrás de um loading: rolar
// antes de a seção existir no DOM não faz nada e não tem segunda chance.
// =====================================================

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollParaHash(pronto: boolean): void {
  // `key` muda a cada navegação: sem ele, clicar duas vezes no mesmo passo
  // (hash idêntico) não voltaria a rolar.
  const { hash, key } = useLocation();

  useEffect(() => {
    if (!pronto || !hash) return;
    const id = decodeURIComponent(hash.slice(1));
    // Um frame de folga: o alvo pode montar no mesmo tick da navegação.
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pronto, hash, key]);
}
