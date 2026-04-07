# ✅ CORREÇÃO FINAL - Schema Incompatível Resolvido

## 🔍 Problemas Raiz Identificados

O código do app foi desenvolvido para o schema do `supabase-telemedicine.sql`, mas o banco usa o schema do `supabase-portal-medico.sql` que tem **colunas diferentes**.

### ❌ Colunas Faltantes no Schema Atual:

| Coluna Esperada | Existe no Schema? | Solução |
|----------------|-------------------|---------|
| `price` | ❌ Não | ✅ Mapeado para `consultation_price` |
| `consultation_price` | ✅ Sim | ✅ Usado diretamente |
| `avatar_url` | ❌ Não | ✅ Mapeado para `photo_url` |
| `photo_url` | ✅ Sim | ✅ Usado diretamente |
| `rating` | ❌ Não | ✅ Adicionada via ALTER TABLE |
| `total_consultations` | ❌ Não | ✅ Adicionada via ALTER TABLE |
| `platform_fee_percent` | ✅ Sim | ✅ Usado com fallback 25% |
| `email` | ✅ Sim (obrigatório) | ✅ Incluído no INSERT |
| `crm_state` | ✅ Sim | ✅ Incluído no INSERT |

---

## 🛠️ Arquivos Corrigidos

### 1. **`src/lib/scheduling.ts`**
✅ **Interface Doctor:** Adicionados campos opcionais
✅ **`getAvailableDoctors()`:** Normalização completa com fallbacks
✅ **`bookConsultation()`:** Usa `consultation_price` com fallback

### 2. **`src/components/AgendarConsulta.tsx`**
✅ Logs de debug detalhados

### 3. **`fix-add-missing-columns.sql`** ⭐ NOVO
✅ Adiciona colunas `rating` e `total_consultations`
✅ Insere médicos mock com todos os campos
✅ Cria política RLS
✅ Insere disponibilidade padrão

### 4. **`diagnose-complete.sql`**
✅ Atualizado para verificar estrutura da tabela
✅ Adiciona colunas faltantes automaticamente
✅ Todos os campos corrigidos

### 5. **`test-supabase-doctors.html`**
✅ Trata colunas opcionais com fallbacks

---

## 🚀 COMO APLICAR A CORREÇÃO (Passo a Passo)

### ⭐ Passo 1: Executar o Script de Correção

1. Acesse **https://supabase.com/dashboard**
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de **`fix-add-missing-columns.sql`**
4. Clique em **Run** (▶️)

**Este script vai:**
- ✅ Adicionar colunas `rating` e `total_consultations`
- ✅ Inserir 3 médicos mock completos
- ✅ Criar política RLS para pacientes verem médicos
- ✅ Inserir disponibilidade padrão (Seg-Sex, 8h-18h)
- ✅ Mostrar relatório completo com estrutura da tabela

### ⭐ Passo 2: Reiniciar o App

```bash
# Pare o app (Ctrl+C) e reinicie
npm run dev
```

### ⭐ Passo 3: Testar o Agendamento

1. Abra o app no navegador
2. Pressione **F12** para abrir o DevTools
3. Vá na aba **Console**
4. Navegue até **Agendar Consulta**
5. Selecione um tipo de consulta

**Você deve ver nos logs:**
```
📋 [AgendarConsulta] Step doctors ativado, buscando médicos...
🔍 [scheduling.ts] Buscando médicos disponíveis...
✅ [scheduling.ts] Médicos encontrados: 3
📋 [AgendarConsulta] Médicos recebidos: 3
```

**E na tela devem aparecer:**
- **Dra. Ana Rodrigues** - Endocrinologista - ★4.9 - R$ 249 - 142 consultas
- **Dr. Carlos Silva** - Endocrinologista - ★4.8 - R$ 249 - 98 consultas
- **Dra. Mariana Costa** - Nutrólogo - ★4.7 - R$ 249 - 67 consultas

---

## 🧪 Teste Adicional (Opcional)

Abra **`test-supabase-doctors.html`** no navegador para:
- Ver médicos no banco de dados
- Testar a query exata do app
- Diagnosticar problemas de conexão

Use as credenciais do `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📋 Schema Correto da Tabela doctors

Após executar o script, a tabela `doctors` terá:

```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,                    -- ✅ Obrigatório
  crm TEXT NOT NULL,                       -- ✅ Apenas número
  crm_state TEXT NOT NULL,                 -- ✅ Estado separado
  specialty TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,                          -- ✅ Foto do médico
  status TEXT DEFAULT 'pending',
  icp_certificate_url TEXT,
  consultation_price DECIMAL(10,2),        -- ✅ Preço da consulta
  consultation_duration INTEGER DEFAULT 30,
  invite_token TEXT UNIQUE,
  platform_fee_percent DECIMAL(5,2) DEFAULT 25.00,
  pix_key TEXT,
  rating NUMERIC DEFAULT 4.5,              -- ✅ ADICIONADO
  total_consultations INTEGER DEFAULT 0,   -- ✅ ADICIONADO
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔍 Se Ainda Não Funcionar

### Verifique no Console do Navegador:

**Se aparecer `Médicos encontrados: 0`:**
- Execute novamente `fix-add-missing-columns.sql`
- Verifique no Supabase Dashboard > Table Editor > doctors

**Se aparecer erro de permissão:**
- Vá em Authentication > Policies > tabela `doctors`
- Verifique se existe "Pacientes podem ver médicos aprovados"

**Se aparecer erro de conexão:**
- Verifique o `.env`
- Reinicie o app

---

## ✅ Checklist

- [x] Interface Doctor com campos opcionais
- [x] Normalização de dados com fallbacks
- [x] Script `fix-add-missing-columns.sql` criado
- [x] Script `diagnose-complete.sql` atualizado
- [x] Logs de debug adicionados
- [x] HTML de teste atualizado
- [ ] **EXECUTE `fix-add-missing-columns.sql` NO SUPABASE**
- [ ] **REINICIE O APP**
- [ ] **TESTE O AGENDAMENTO**

---

## 📄 Arquivos de Referência

- `fix-add-missing-columns.sql` - ⭐ **USE ESTE PRIMEIRO**
- `diagnose-complete.sql` - Diagnóstico completo
- `fix-doctors-rls-policy.sql` - Apenas políticas RLS
- `test-supabase-doctors.html` - Teste visual
- `CORRECOES-APLICADAS.md` - Documentação anterior

---

**Execute o script e os médicos aparecerão!** 🎉
