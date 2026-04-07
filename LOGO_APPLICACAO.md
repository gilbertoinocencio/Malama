# 🎨 Logo NURA — Aplicação Completa

## Componente Criado
- **`src/components/NuraLogo.tsx`** — Componente React reutilizável com 4 tamanhos e 3 variantes

### Design do Logo
- **Fonte:** Cormorant Garamond (Google Fonts)
- **Gradiente:** `#1A6070` → `#0C4352` (petrol escuro)
- **Texto:** Branco, `font-weight: 300`, letter-spacing largo
- **Efeito:** Gloss sutil no topo (50% altura, gradiente transparente)

### Tamanhos Disponíveis
| Size | Font Size | Uso |
|------|-----------|-----|
| `sm` | 20px | Headers mobile, sidebar |
| `md` | 32px | Sidebar desktop |
| `lg` | 48px | Páginas de cadastro |
| `xl` | 64px | Páginas de login |

### Variantes
| Variant | Descrição |
|---------|-----------|
| `light` (default) | Fundo gradiente + texto branco |
| `dark` | Mesmo gradiente (preparado para dark mode) |
| `text-only` | Apenas texto, cor `#1A6070`, sem fundo |

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
- **Gradiente:** `linear-gradient(135deg, #1A6070 0%, #0C4352 100%)`
- **Border Radius:** `8px` (sm) → `24px` (xl)
- **Letter Spacing:** `4px` (sm) → `18px` (xl)
- **Font Weight:** `300` (light/extralight)
- **Font Family:** `'Cormorant Garamond', Georgia, serif`
