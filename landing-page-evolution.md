# Evolução da Landing Page - Malama

## 🧠 DEEP DESIGN THINKING

### 1. CONTEXT ANALYSIS
- **Sector**: Saúde/Nutrição Premium.
- **Audience**: Pessoas que buscam qualidade de vida, acompanhamento premium, e valorizam estética e facilidade.
- **Emotion**: Confiança, Serenidade, Sofisticação (Quiet Luxury).
- **Core Identity**: "Alimente seu fluxo natural" - Uma abordagem elegante, sem esforço e altamente tecnológica.

### 2. THE MODERN CLICHÉ SCAN
- 🚫 **Bento Grids**: Evitados. Vamos usar assimetria controlada.
- 🚫 **Glassmorphism Excessivo**: Evitado. Usaremos superfícies foscas (matte) e sombras sutis.
- 🚫 **Azul Genérico / Petroleum Antigo**: Removido. Foco 100% no Vermelho Queimado (`Malama-petrol`) e off-whites (`Malama-bg`, `Malama-pastel-orange`).

### 3. DESIGN COMMITMENT (QUIET LUXURY)
- **Topologia**: Layout fluido, uso dramático de espaço negativo (whitespace). Ao invés do split 50/50 padrão, usaremos sobreposição de imagens e texto.
- **Tipografia**: Headers em Serif (`font-serif` - Playfair/Cormorant) para o toque de luxo, combinados com Sans limpo para legibilidade.
- **Cores**: `Malama-bg` para o fundo principal. Contraste profundo com `Malama-main`. Acentos estratégicos em `Malama-petrol` (Vermelho Queimado).
- **Animações (Imagens Animadas)**: Uso de `framer-motion` para criar paralaxe suave, imagens de fundo com slow zoom continuo (scale sutil), e aparição elegante de elementos (staggered fade-up).

## 🛠️ PLANO DE EXECUÇÃO

1. **Refatorar `LandingPage.tsx`**:
   - Mudar para `framer-motion`.
   - Implementar o Hero Section com tipografia Serif grande e um componente animado.
   - Atualizar a paleta para focar estritamente no Vermelho Queimado (`bg-Malama-petrol`), removendo traços azuis/verdes antigos.
   - Refinar os botões: Remover sombras pesadas, usar botões com stroke e animações sutis.
   - Seções de Diferenciais e Como Funciona com layouts assimétricos e elementos que entram em cena com scroll.
   - Melhorar o mockup do dashboard para parecer um widget premium, usando animações de Reveal.

2. **Revisão e Polimento**:
   - Certificar-se de que a página reflete a identidade "Malama" (cuidar, proteger).
   - Testar responsividade e performance das animações.
