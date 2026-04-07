# 🎨 Logo NURA — Aplicação Completa

## Componente Criado
- **`src/components/NuraLogo.tsx`** — Componente React reutilizável com 4 tamanhos e 3 variantes
- **`public/logo.jpg`** — Arquivo de imagem do novo logotipo NURA

### Design do Logo
O logotipo NURA agora utiliza uma imagem personalizada (`IMG_7011.jpg`) que é carregada dinamicamente em todos os pontos da aplicação.

### Tamanhos Disponíveis
| Size | Width | Uso |
|------|-----------|-----|
| `sm` | 80px | Headers mobile, sidebar |
| `md` | 120px | Sidebar desktop |
| `lg` | 180px | Páginas de cadastro |
| `xl` | 240px | Páginas de login |

### Variantes
| Variant | Descrição |
|---------|-----------|
| `light` (default) | Imagem do logo com fundo gradiente |
| `dark` | Mesmo fundo gradiente (preparado para dark mode) |
| `text-only` | Apenas texto "NURA", cor `#1A6070`, sem fundo |

## Onde foi aplicado

### Portal do Médico
| Arquivo | Localização | Size |
|---------|-------------|------|
| `DoctorLogin.tsx` | Topo da página | `xl` |
| `DoctorRegistration.tsx` | Topo da página | `lg` |
| `DoctorLayout.tsx` | Sidebar desktop | `md` |
| `DoctorLayout.tsx` | Sidebar mobile | `sm` |
| `DoctorLayout.tsx` | Header mobile | `sm` |

### Painel Admin
| Arquivo | Localização | Size |
|---------|-------------|------|
| `AdminLogin.tsx` | Topo da página | `xl` |
| `routes/index.tsx` | Header do AdminLayout | `sm` |

### Configuração Global
| Arquivo | Alteração |
|---------|-----------|
| `tailwind.config.js` | Fonte `serif` agora inclui `Cormorant Garamond` |
| `index.html` | Google Fonts link adicionado (`Cormorant Garamond: 300-700`) |
| `index.html` | Theme color atualizado para `#1A6070` |

## Como usar

```tsx
import { NuraLogo } from '../../components/NuraLogo';

// Logo com fundo gradiente
<NuraLogo size="md" />

// Apenas texto
<NuraLogo variant="text-only" size="lg" />

// Com classe customizada
<NuraLogo size="sm" className="my-custom-class" />
```

## Fichas Técnicas
- **Imagem:** `public/logo.jpg` (original: `LogotipoNura/IMG_7011.jpg`)
- **Border Radius:** `8px` (sm) → `24px` (xl)
- **Width:** `80px` (sm) → `240px` (xl)
- **Object Fit:** `contain`
- **Formato:** JPEG
