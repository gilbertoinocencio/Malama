# 🔧 Guia de Correção - Médicos Não Aparecem no Agendamento

## Problema Identificado

O app mostra "Nenhum médico disponível no momento" porque:
1. ❌ Não há médicos com status 'approved' no banco de dados, OU
2. ❌ As políticas RLS estão bloqueando a leitura, OU
3. ❌ Ambos os problemas

---

## 🎯 Passo a Passo para Corrigir

### Passo 1: Executar Diagnóstico no Supabase

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Copie e cole o conteúdo do arquivo **`diagnose-complete.sql`**
5. Clique em **Run** (▶️)
6. Analise os resultados:
   - Veja se existem médicos no banco
   - Veja se existem médicos com status 'approved'
   - Veja as políticas RLS configuradas
   - Veja se há disponibilidade configurada

**O script vai automaticamente:**
- ✅ Inserir médicos mock se não existirem
- ✅ Criar a política RLS faltante
- ✅ Inserir disponibilidade padrão

---

### Passo 2: Verificar no Navegador (Console do App)

1. Abra o app Nura no navegador
2. Pressione **F12** para abrir o **DevTools**
3. Vá na aba **Console**
4. Navegue até **Agendar Consulta** > Escolha um tipo de consulta
5. Observe os logs no console:
   - 📋 `[AgendarConsulta] Step doctors ativado, buscando médicos...`
   - 🔍 `[scheduling.ts] Buscando médicos disponíveis...`
   - ✅ `[scheduling.ts] Médicos encontrados: X`

**Se aparecer:**
- `Médicos encontrados: 0` → Problema no banco de dados (volte ao Passo 1)
- Erro de conexão → Verifique o arquivo `.env`
- Erro de política RLS → Execute o script SQL novamente

---

### Passo 3: Testar com HTML de Diagnóstico

1. Abra o arquivo **`test-supabase-doctors.html`** no navegador
2. Cole suas credenciais do Supabase:
   - **Supabase URL**: `VITE_SUPABASE_URL` do seu `.env`
   - **Supabase Anon Key**: `VITE_SUPABASE_ANON_KEY` do seu `.env`
3. Clique em **Testar Conexão**
4. Execute os testes na ordem:
   - ✅ **Ver TODOS os médicos**
   - ✅ **Ver médicos APROVADOS**
   - ✅ **Ver políticas RLS**
   - ✅ **Ver disponibilidade**
   - ✅ **Testar query exata do app**

5. Se necessário, use os botões de correção:
   - 🔧 **Inserir médicos mock**
   - 🔧 **Corrigir políticas RLS**

---

### Passo 4: Verificar Configurações do Supabase

No **Supabase Dashboard**, verifique:

#### 4.1. Tabela `doctors`
1. Vá em **Table Editor**
2. Selecione a tabela `doctors`
3. Verifique se existem registros com `status = 'approved'`

#### 4.2. Tabela `doctor_availability`
1. Vá em **Table Editor**
2. Selecione a tabela `doctor_availability`
3. Verifique se existem registros com `is_active = true`
4. Verifique se `day_of_week` está entre 1-5 (Seg-Sex)
5. Verifique se `start_time` e `end_time` estão corretos

#### 4.3. Políticas RLS
1. Vá em **Authentication** > **Policies**
2. Selecione a tabela `doctors`
3. Verifique se existe uma política que permite SELECT com condição `status = 'approved'`
4. Se não existir, crie uma nova política:
   - **Policy Name**: `Pacientes podem ver médicos aprovados`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `anon`, `authenticated`
   - **Policy definition**: `USING (status = 'approved')`

---

### Passo 5: Testar o Agendamento

1. Abra o app Nura
2. Faça login como paciente
3. Vá em **Agendar Consulta**
4. Selecione um tipo de consulta
5. **Deve aparecer a lista de médicos!**

---

## 🔍 Logs de Debug Ativados

Foram adicionados logs detalhados em:

### `src/lib/scheduling.ts`
```typescript
export async function getAvailableDoctors(): Promise<Doctor[]> {
  console.log('🔍 [scheduling.ts] Buscando médicos disponíveis...');
  // ... query ...
  console.log('✅ [scheduling.ts] Médicos encontrados:', data?.length || 0);
  console.table(data);
  return data || [];
}
```

### `src/components/AgendarConsulta.tsx`
```typescript
useEffect(() => {
  if (step === 'doctors' && doctors.length === 0) {
    console.log('📋 [AgendarConsulta] Step doctors ativado, buscando médicos...');
    // ... busca ...
    console.log('📋 [AgendarConsulta] Médicos recebidos:', result.length);
    console.table(result);
  }
}, [step]);
```

---

## ⚠️ Problemas Comuns e Soluções

### Problema: "relation 'doctors' does not exist"
**Solução:** Execute o script `supabase-portal-medico.sql` primeiro para criar as tabelas.

### Problema: "permission denied for table doctors"
**Solução:** Verifique as políticas RLS. Execute `fix-doctors-rls-policy.sql`.

### Problema: Médicos existem mas não aparecem
**Solução:** Verifique se o `status` está como `'approved'`. Execute:
```sql
UPDATE doctors SET status = 'approved' WHERE status != 'approved';
```

### Problema: Erro de conexão com Supabase
**Solução:** Verifique o arquivo `.env`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

---

## 📁 Arquivos Criados para Diagnóstico

1. **`diagnose-complete.sql`** - Script SQL completo de diagnóstico
2. **`fix-doctors-rls-policy.sql`** - Script para corrigir políticas RLS
3. **`test-supabase-doctors.html`** - Ferramenta visual de teste
4. **`src/lib/scheduling.ts`** - Logs de debug adicionados
5. **`src/components/AgendarConsulta.tsx`** - Logs de debug adicionados

---

## 🚀 Resumo Rápido

1. ✅ Execute `diagnose-complete.sql` no Supabase SQL Editor
2. ✅ Abra `test-supabase-doctors.html` e teste a conexão
3. ✅ Abra o console do navegador (F12) e observe os logs
4. ✅ Verifique as políticas RLS no Supabase Dashboard
5. ✅ Teste o agendamento no app

**Após seguir esses passos, os médicos devem aparecer normalmente!** 🎉
