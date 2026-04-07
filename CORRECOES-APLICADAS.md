# ✅ Correções Aplicadas - Problema dos Médicos Não Aparecerem

## 🔍 Problema Raiz Identificado

O banco de dados usa o schema do arquivo `supabase-portal-medico.sql` que tem colunas **diferentes** do schema original `supabase-telemedicine.sql`:

| Campo no Código Antigo | Campo Real no Banco |
|------------------------|---------------------|
| `price` | `consultation_price` |
| `avatar_url` | `photo_url` |
| `crm` (formato "12345-SP") | `crm` (número) + `crm_state` (estado) |
| Não existia | `email` (obrigatório) |
| Não existia | `platform_fee_percent` |

## 🛠️ Arquivos Corrigidos

### 1. `src/lib/scheduling.ts`
✅ **Interface Doctor atualizada:**
- Adicionado `photo_url?` e `consultation_price?`
- Adicionado `platform_fee_percent?`
- Mantido `price` para compatibilidade

✅ **Função `getAvailableDoctors()`:**
- Adicionada normalização de dados: mapeia `consultation_price` → `price`
- Adicionada normalização: `photo_url` → `avatar_url`
- Adicionados logs de debug detalhados

✅ **Função `bookConsultation()`:**
- Alterado para buscar `consultation_price` em vez de `price`
- Adicionado fallback para `platform_fee_percent` (padrão 25%)
- Adicionado fallback para preço (padrão R$ 249)

### 2. `src/components/AgendarConsulta.tsx`
✅ **Logs de debug adicionados:**
- Log quando step "doctors" é ativado
- Log com número de médicos recebidos
- Log de erros detalhado

### 3. `diagnose-complete.sql`
✅ **Campos corrigidos:**
- `consultation_price` em vez de `price`
- INSERT com todos os campos obrigatórios: `email`, `crm`, `crm_state`, `platform_fee_percent`

### 4. `fix-doctors-rls-policy.sql`
✅ **Campos corrigidos no INSERT**

### 5. `test-supabase-doctors.html`
✅ **Todos os campos atualizados para compatibilidade**

---

## 🚀 Como Aplicar as Correções

### Passo 1: Executar Script SQL no Supabase

1. Acesse https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de **`diagnose-complete.sql`**
4. Clique em **Run**

Este script vai:
- ✅ Verificar se existem médicos no banco
- ✅ Inserir 3 médicos mock com os campos corretos
- ✅ Criar a política RLS para pacientes verem médicos
- ✅ Inserir disponibilidade padrão (Seg-Sex, 8h-18h)
- ✅ Mostrar relatório completo

### Passo 2: Reiniciar o App

```bash
# Se o app estiver rodando, pare com Ctrl+C e inicie novamente
npm run dev
```

### Passo 3: Testar no Console do Navegador

1. Abra o app no navegador
2. Pressione **F12** para abrir o DevTools
3. Vá na aba **Console**
4. Navegue até **Agendar Consulta** > Escolha um tipo de consulta

**Você deve ver nos logs:**
```
📋 [AgendarConsulta] Step doctors ativado, buscando médicos...
🔍 [scheduling.ts] Buscando médicos disponíveis...
✅ [scheduling.ts] Médicos encontrados: 3
📋 [AgendarConsulta] Médicos recebidos: 3
```

### Passo 4: Verificar a Lista de Médicos

Após selecionar o tipo de consulta, devem aparecer os 3 médicos:
- **Dra. Ana Rodrigues** - Endocrinologista - ★4.9 - R$ 249
- **Dr. Carlos Silva** - Endocrinologista - ★4.8 - R$ 249
- **Dra. Mariana Costa** - Nutrólogo - ★4.7 - R$ 249

---

## 🧪 Teste Adicional (Opcional)

Abra o arquivo **`test-supabase-doctors.html`** no navegador para:
- Testar conexão com Supabase
- Ver médicos no banco
- Inserir médicos mock manualmente
- Corrigir políticas RLS

Use as credenciais do seu arquivo `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## ⚠️ Se Ainda Não Funcionar

### Verifique no Console do Navegador:

**Se aparecer `Médicos encontrados: 0`:**
- Execute novamente o script `diagnose-complete.sql`
- Verifique no Supabase Dashboard > Table Editor > doctors se existem registros com `status = 'approved'`

**Se aparecer erro de permissão:**
- Vá em Authentication > Policies > tabela `doctors`
- Verifique se existe a política "Pacientes podem ver médicos aprovados"
- Execute o script `fix-doctors-rls-policy.sql`

**Se aparecer erro de conexão:**
- Verifique o arquivo `.env` com as credenciais corretas do Supabase
- Verifique se o app foi reiniciado após as mudanças

---

## 📋 Resumo das Mudanças no Schema

### Schema Correto (supabase-portal-medico.sql):

```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,                    -- ✅ Campo obrigatório
  crm TEXT NOT NULL,                       -- ✅ Apenas número
  crm_state TEXT NOT NULL,                 -- ✅ Estado separado
  specialty TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,                          -- ✅ Não avatar_url
  status TEXT DEFAULT 'pending',
  icp_certificate_url TEXT,
  consultation_price DECIMAL(10,2),        -- ✅ Não price
  consultation_duration INTEGER DEFAULT 30,
  invite_token TEXT UNIQUE,
  platform_fee_percent DECIMAL(5,2) DEFAULT 25.00,  -- ✅ Novo campo
  pix_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Checklist Final

- [x] Interface Doctor atualizada para suportar ambos schemas
- [x] Função getAvailableDoctors com normalização de dados
- [x] Função bookConsultation com campos corretos
- [x] Logs de debug adicionados
- [x] Scripts SQL corrigidos
- [x] HTML de teste atualizado
- [ ] **Execute o script diagnose-complete.sql no Supabase**
- [ ] **Reinicie o app e teste**

---

**Após seguir os passos, os médicos devem aparecer normalmente!** 🎉
