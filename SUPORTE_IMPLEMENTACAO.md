# Sistema de Suporte - Documentação

## ✅ Funcionalidades Implementadas

### 1. **FAQ Interativo** (`src/components/support/FAQSection.tsx`)
- **20+ perguntas frequentes** organizadas por categoria:
  - 🥗 Nutrição (metas, macros, restrições)
  - 💊 GLP-1 (programa, medicação, efeitos colaterais)
  - 💳 Financeiro (planos, pagamentos, cancelamento)
  - ⚙️ Técnico (bugs, offline, backup)
  - 👤 Conta (e-mail, senha, exclusão)
  - 💡 Programa de Indicação (comissões, link)
- **Filtro por categoria** com chips clicáveis
- **Accordion** para expandir/colapsar respostas
- **CTA para contato** quando o usuário não encontra o que procura

### 2. **Modal de Contato** (`src/components/support/ContactSupportModal.tsx`)
- **Fluxo em 3 etapas:**
  1. Seleção de categoria (afunila o problema)
  2. Formulário com assunto e descrição detalhada
  3. Confirmação de envio com feedback visual
- **Validação:**
  - Assunto obrigatório (max 100 caracteres)
  - Descrição mínima de 20 caracteres
  - Contador de caracteres em tempo real
- **Categorias disponíveis:**
  - Nutrição e Dieta
  - Programa GLP-1
  - Financeiro
  - Técnico
  - Conta
  - Sugestão
  - Outro

### 3. **Service de Suporte** (`src/services/supportService.ts`)
- **CRUD completo de tickets:**
  - `createTicket()` - Criar novo ticket
  - `getUserTickets()` - Listar tickets do usuário
  - `getAllTickets()` - Listar todos (admin)
  - `updateTicket()` - Atualizar ticket
  - `addResponse()` - Adicionar resposta
  - `resolveTicket()` - Resolver ticket (admin)
  - `getStats()` - Estatísticas de tickets
- **Tipos TypeScript** completos para tickets e respostas

### 4. **Seção no Perfil** (`src/components/ProfileView.tsx`)
- **Card "Central de Ajuda"** com ícone HelpCircle
- **Modal animado** com FAQ integrado
- **Botão "Entrar em contato"** que abre modal de contato
- **Design responsivo** com gradientes e hover effects

### 5. **Migration SQL** (`supabase/migrations/20260414_support_tickets.sql`)
- **Tabela `support_tickets`:**
  - Campos: id, user_id, category, status, priority, subject, description, responses
  - Status: open, in_progress, resolved, closed
  - Prioridade: low, medium, high, urgent
  - Respostas em JSONB array
- **RLS Policies:**
  - Usuários veem apenas seus tickets
  - Admins (super_admin) veem todos os tickets
  - Usuários podem criar e responder seus tickets
  - Admins podem atualizar qualquer ticket
- **Trigger** para atualizar `updated_at` automaticamente
- **Índices** para performance (user_id, status, category, created_at)

## 📁 Arquivos Criados/Modificados

### Criados:
1. `supabase/migrations/20260414_support_tickets.sql` - Schema do banco
2. `src/services/supportService.ts` - Service layer
3. `src/components/support/FAQSection.tsx` - Componente FAQ
4. `src/components/support/ContactSupportModal.tsx` - Modal de contato

### Modificados:
1. `src/components/ProfileView.tsx` - Adicionada seção de Suporte

## 🚀 Como Usar

### Para o Usuário:
1. Ir ao **Perfil** > clicar em **"Central de Ajuda"**
2. Navegar pelo **FAQ** para encontrar resposta rápida
3. Se não encontrar, clicar em **"Entrar em contato com o suporte"**
4. Selecionar categoria → preencher formulário → enviar
5. Aguardar resposta (notificação quando admin responder)

### Para o Admin (Super Admin):
**⚠️ Ainda necessário: Criar página no painel admin para gerenciar tickets**

Próximos passos sugeridos:
1. Criar `src/routes/admin/AdminSupportTickets.tsx`
2. Listar todos os tickets com filtros
3. Visualizar detalhes e adicionar respostas
4. Alterar status e prioridade

## 🎨 Design

- **Categorias com emojis** para identificação visual rápida
- **Gradientes azul/cyan** para diferenciar de outras seções
- **Modal com animação spring** suave
- **Feedback visual** em todas as interações
- **Dark mode** suportado em todos os componentes

## 🔐 Segurança

- **RLS ativo** - usuários só veem seus próprios tickets
- **Validação no client e server** - descrição mínima, campos obrigatórios
- **Verificação de admin** via JWT (user_metadata.role = 'super_admin')
- **Prevenção de spam** - validação de tamanho mínimo

## 📊 Próximos Passos (Opcional)

1. **Página Admin** para gerenciar tickets
2. **Notificações push** quando admin responder
3. **Histórico de tickets** no perfil do usuário
4. **Estatísticas** de tempo de resposta
5. **Categorização automática** com IA
6. **Respostas sugeridas** baseadas em tickets similares

## ✅ Status

- ✅ Build passando sem erros
- ✅ Todos os componentes criados
- ✅ Service layer implementado
- ✅ Migration SQL pronta para aplicar
- ✅ FAQ com 20+ perguntas
- ✅ Modal de contato funcional
- ✅ Integração no ProfileView

**⚠️ Pendente:** Aplicar migration SQL no Supabase antes de usar em produção!
