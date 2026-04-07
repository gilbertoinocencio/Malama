# 🎨 Substituição do Logotipo NURA

## Resumo
O logotipo antigo (componente CSS/React com gradiente e texto) foi substituído pela nova imagem de logotipo (`IMG_7011.jpg`).

## Arquivos Alterados

### 1. **Novo Arquivo de Logotipo**
- **Origem:** `LogotipoNura/IMG_7011.jpg`
- **Destino:** `public/logo.jpg`
- **Tamanho:** ~104 KB

### 2. **Componente React**
- **Arquivo:** `src/components/NuraLogo.tsx`
- **Alterações:**
  - Substituído o texto estilizado por tag `<img>` apontando para `/logo.jpg`
  - Configurado para redimensionar automaticamente conforme o tamanho (sm, md, lg, xl)
  - Mantida a variante `text-only` para exibir apenas texto "NURA" quando necessário

### 3. **Configurações PWA**
- **Arquivo:** `vite.config.ts`
- **Alterações:**
  - Substituído `pwa-icon.svg` por `logo.jpg` no manifest PWA
  - Atualizado o tipo de `image/svg+xml` para `image/jpeg`
  - Ícones PWA agora usam o novo logotipo

### 4. **HTML Principal**
- **Arquivo:** `index.html`
- **Alterações:**
  - Substituído `apple-touch-icon` de `/pwa-icon.svg` para `/logo.jpg`

### 5. **Documentação**
- **Arquivo:** `README.md`
- **Alterações:**
  - Atualizada a referência de imagem do logotipo

- **Arquivo:** `LOGO_APPLICACAO.md`
- **Alterações:**
  - Documentação atualizada para refletir o novo design baseado em imagem
  - Tabela de tamanhos atualizada (de Font Size para Width)
  - Ficha técnica atualizada com novas especificações

## Tamanhos do Logotipo

| Size | Width | Uso |
|------|-------|-----|
| `sm` | 80px | Headers mobile, sidebar |
| `md` | 120px | Sidebar desktop |
| `lg` | 180px | Páginas de cadastro |
| `xl` | 240px | Páginas de login |

## Componentes que Usam o Logo

O componente `NuraLogo` é utilizado em:
- `DoctorLogin.tsx` (size: xl)
- `DoctorRegistration.tsx` (size: lg)
- `DoctorLayout.tsx` (size: md, sm)
- `AdminLogin.tsx` (size: xl)
- `routes/index.tsx` (size: sm)

## Variantes Disponíveis

1. **`light`** (padrão) - Imagem do logo com fundo gradiente
2. **`dark`** - Mesmo fundo gradiente (preparado para dark mode)
3. **`text-only`** - Apenas texto "NURA", cor `#1A6070`, sem fundo

## Como Usar

```tsx
import { NuraLogo } from '../../components/NuraLogo';

// Logo com imagem (padrão)
<NuraLogo size="md" />

// Apenas texto
<NuraLogo variant="text-only" size="lg" />

// Com classe customizada
<NuraLogo size="sm" className="my-custom-class" />
```

## Data da Alteração
7 de abril de 2026
