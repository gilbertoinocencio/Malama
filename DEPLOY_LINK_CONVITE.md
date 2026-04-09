# Deploy Necessário - Link de Convite do Influencer

## O Que Foi Implementado

Agora o admin gera um **link de convite** para o influencer clicar e acessar diretamente o app!

### Fluxo Corrigido:

1. **Admin cria influencer** → Edge Function gera `access_token`
2. **Admin clica em "Ver"** → Copia link: `http://localhost:3000/influencer/convite/:access_token`
3. **Admin envia link ao influencer**
4. **Influencer clica no link** → Página de boas-vindas
5. **Influencer clica "Começar agora"** → Login automático → Onboarding (SEM planos)

---

## Deploy Necessário (2 passos)

### Passo 1: Executar SQL no Supabase

Acesse: https://supabase.com/dashboard/project/agstaiizemtngcmllju/sql

Cole e execute:

```sql
-- Adicionar coluna access_token na tabela influencers
ALTER TABLE public.influencers 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_influencers_access_token 
ON public.influencers(access_token);

-- Política para permitir leitura por token
CREATE POLICY "Permitir leitura de influencer por access_token"
ON public.influencers
FOR SELECT
TO anon
USING (access_token IS NOT NULL);
```

### Passo 2: Redeploy da Edge Function

1. Acesse: https://supabase.com/dashboard/project/agstaiizemtngcmllju/functions
2. Clique em `create-influencer-user`
3. Clique em **"Edit"**
4. O código já foi atualizado no arquivo local: `supabase/functions/create-influencer-user/index.ts`
5. Copie TODO o conteúdo e cole no editor
6. Clique em **"Deploy"**

---

## Teste Após Deploy

1. Acessar `/admin/influencers`
2. Criar novo influencer (preencher nome, email, senha, etc.)
3. Clicar em **"Ver"** no influencer criado
4. **Deve aparecer dois botões:**
   - **"Link"** (Link de convite) → `http://localhost:3000/influencer/convite/:token`
   - **"Link"** (Link de indicação) → `http://localhost:3000/i/:token`
5. Clicar no **primeiro "Link"** (convite)
6. Abrir em aba anônima
7. Influencer vê página de boas-vindas
8. Clicar em **"Começar agora →"**
9. Faz login automático → Vai para onboarding (SEM planos!)

---

## Importante

- **Link de convite** (`/influencer/convite/:token`) → Para o INFLUENCER acessar
- **Link de indicação** (`/i/:token`) → Para SEGUIDORES do influencer

Não confundir os dois!
