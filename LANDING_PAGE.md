# 🎨 Landing Page Nura

## Resumo
Landing page principal do Nura, servindo como página de entrada para novos usuários e conexão com o painel do médico.

## ✨ Funcionalidades

### Seções da Landing Page

1. **Header Fixo**
   - Logo Nura
   - Navegação desktop/mobile responsiva
   - Botões "Área do Médico" e "Cadastrar-se"
   - Efeito de blur ao scroll

2. **Hero Section**
   - Título impactante: "Alimente seu fluxo natural"
   - Descrição do app
   - CTAs principais
   - Stats (usuários, médicos, satisfação)
   - Mockup visual do dashboard

3. **Diferenciais**
   - 6 cards com ícones:
     - IA Personalizada
     - Acompanhamento Médico
     - Evolução Visual
     - Segurança Total
     - Agenda Inteligente
     - Metas Alcançáveis

4. **Como Funciona**
   - 3 passos visuais:
     1. Cadastre-se
     2. Receba seu Plano
     3. Acompanhe sua Evolução
   - Linha conectiva entre passos
   - CTA no final

5. **Para Médicos**
   - Seção dedicada a profissionais
   - Mockup do painel do médico
   - Lista de benefícios
   - CTA para cadastro médico

6. **Depoimentos**
   - 3 cards de depoimentos
   - Avaliações com estrelas
   - Nomes e descrições

7. **CTA Final**
   - Background petrol
   - Dois botões: Criar conta / Já tenho conta

8. **Footer**
   - Logo
   - Links rápidos
   - Links para área do médico
   - Copyright

## 🎨 Design System

### Cores Utilizadas
- **nura-petrol:** `#1F4E5F` - Cor principal
- **nura-petrol-light:** `#E0F2F1` - Backgrounds suaves
- **nura-main:** `#1C1917` - Texto principal
- **nura-muted:** `#57534E` - Texto secundário
- **nura-bg:** `#FDFBF9` - Background off-white
- **nura-brown:** `#8C6A4B` - Acentos

### Tipografia
- **Títulos:** Font bold, tamanhos 3xl-6xl
- **Corpo:** Font medium/regular, text-lg
- **Labels:** Font semibold, text-sm

### Animações
- Hover effects em cards
- Transições suaves
- Scroll smooth para seções

## 🔗 Conexões

### Rotas Integradas
- `/` → Landing Page (nova página principal)
- `/medico` → Login do médico
- `/medico/cadastro` → Cadastro do médico
- `/admin` → Login do admin

### Fluxo do Usuário
```
Landing Page (/)
    ↓
Cadastrar-se → /medico/cadastro
    ↓
Login → /medico
    ↓
Dashboard do Médico
```

## 📱 Responsividade

### Breakpoints
- **Mobile:** < 768px
  - Menu hamburger
  - Grid 1 coluna
  - Textos menores
- **Tablet:** 768px - 1024px
  - Grid 2 colunas
  - Menu completo
- **Desktop:** > 1024px
  - Grid 3 colunas
  - Layout completo

## 🚀 Como Usar

### Para Desenvolvedores
A landing page já está integrada como rota principal (`/`).

**Arquivos principais:**
- `src/routes/LandingPage.tsx` - Componente principal
- `src/routes/index.tsx` - Configuração de rotas
- `src/App.tsx` - Integração com AppRoutes

### Testando
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Acessar landing page
http://localhost:3000/
```

## 📊 Métricas Importantes

### Performance
- Build time: ~14.57s
- Componente: Single file (~600 lines)
- Ícones: Lucide React (tree-shakeable)

### SEO (Futuro)
- Meta tags no index.html
- Open Graph tags
- Structured data

## 🔧 Customização

### Alterar Textos
Edite diretamente em `LandingPage.tsx`:
- Títulos: `h1`, `h2` tags
- Descrições: `p` tags
- CTAs: `Link` components

### Alterar Cores
As cores usam o tema Tailwind:
```tsx
bg-nura-petrol
text-nura-petrol
hover:bg-nura-petrol/90
```

### Adicionar Seções
Duplique a estrutura de seção existente:
```tsx
<section id="nova-secao" className="py-20 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Conteúdo */}
  </div>
</section>
```

## ✅ Status
- [x] Landing page criada
- [x] Integrada como rota principal
- [x] Responsiva (mobile/tablet/desktop)
- [x] Links para painel do médico
- [x] Build passando
- [ ] Testes de usabilidade
- [ ] Analytics integrado
- [ ] SEO otimizado

## 📅 Data de Implementação
8 de abril de 2026

## 💡 Próximos Passos

### Melhorias Sugeridas
1. **Animações de entrada:** Scroll reveal para seções
2. **Vídeo de demonstração:** Embed no hero
3. **Blog integrado:** Seção de artigos
4. **FAQ:** Accordion com perguntas frequentes
5. **Chatbot:** Widget de suporte
6. **Multi-language:** Suporte a EN/ES
7. **Analytics:** Google Analytics / Plausible
8. **A/B Testing:** Testar CTAs diferentes

### Conteúdo Adicional
- Cases de sucesso detalhados
- Vídeos de depoimentos
- Antes/depois de usuários
- Artigos científicos sobre nutrição
- Calculadora de IMC integrada
