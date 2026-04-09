# Deploy da Edge Function create-influencer-user

## Problema Atual

Ao criar um influencer pelo painel admin, ocorrem **dois possíveis erros**:

### Erro 1: CORS / Failed to fetch
```
Access to fetch at 'https://...supabase.co/functions/v1/create-influencer-user' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Causa:** Edge Function não está deployada no Supabase.

### Erro 2: Row-Level Security (RLS)
```
new row violates row-level security policy for table "influencers"
```

**Causa:** Políticas RLS do Supabase bloqueiam inserts diretos na tabela.

---

## Solução Completa (2 passos)

### Passo 1: Corrigir Políticas RLS

1. Acesse o **Supabase Dashboard** → SQL Editor
2. Cole e execute o SQL do arquivo:
   ```
   supabase/migrations/fix_influencer_rls_policies.sql
   ```
3. Ou execute via CLI:
   ```bash
   supabase db push
   ```

### Passo 2: Deploy da Edge Function

```bash
# 1. Login no Supabase (se ainda não fez)
supabase login

# 2. Linkar com o projeto
cd c:\Users\DELL\Desktop\projetos\Nura
supabase link --project-ref agstaiizemtngcmllju

# 3. Deploy da Edge Function
supabase functions deploy create-influencer-user --project-ref agstaiizemtngcmllju
```

---

## Teste Após Deploy

1. Acessar `/admin/influencers`
2. Clicar em "+ Novo influenciador"
3. Preencher nome, email, **senha** (mín 8 chars), comissão
4. Clicar em "Criar influenciador"
5. **✅ Deve funcionar** com mensagem: "Influenciador criado com sucesso! Ele já pode fazer login com o email e senha definidos."

---

## Se Ainda der Erro

### Debug da Edge Function

1. Verifique se está deployada:
   ```bash
   supabase functions list --project-ref agstaiizemtngcmllju
   ```

2. Verifique os logs:
   ```bash
   supabase functions logs create-influencer-user --project-ref agstaiizemtngcmllju
   ```

3. Teste manualmente:
   ```bash
   supabase functions serve create-influencer-user --env-file .env
   ```

### Debug das Políticas RLS

Verifique se as políticas foram criadas:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'influencers' 
AND policyname LIKE '%autenticado%';
```

Deve retornar 4 políticas (INSERT, SELECT, UPDATE, DELETE).

---

## Solução Alternativa Temporária

Se não conseguir deployar agora, **remova o campo de senha** e use o método legado com link de ativação:

**NÃO RECOMENDADO** pois o RLS também está bloqueando. A correção do RLS é **obrigatória**.
