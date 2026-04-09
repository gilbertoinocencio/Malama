# Fluxo de Onboarding para Influenciadores - Correções Aplicadas

## Problemas Resolvidos

### 1. ✅ Influencer era redirecionado para tela de login padrão ao invés do onboarding
**Problema:** Ao clicar em "Criar minha conta influencer", o usuário era direcionado para `/entrar?signup=true` (tela de login), sem fluxo claro para o onboarding.

**Solução:**
- Criada nova rota dedicada `/influencer/onboarding` (arquivo: `src/routes/influencer/InfluencerOnboarding.tsx`)
- Atualizado `InfluencerReferral.tsx` para redirecionar para `/influencer/onboarding` ao invés de `/entrar`
- A rota verifica se há sessão ativa e se o usuário é influencer, depois redireciona para o app principal (`/`) onde o `App.tsx` detecta `onboarding_completed = false` e mostra o `OnboardingFlow`

### 2. ✅ Influencer via tela de planos premium durante onboarding
**Problema:** Influenciadores estavam vendo a tela "Eleve sua jornada ao nível Premium" (Passo 31 de 34) e sendo direcionados para planos pagos, quando deveriam usar o app gratuitamente.

**Solução:**
- Adicionada flag `nura_is_influencer_signup` no localStorage para detecção imediata de influencers
- Atualizado `OnboardingFlow.tsx` para:
  - Verificar a flag do localStorage como fallback imediato (antes da query ao banco)
  - Manter `isInfluencer = true` mesmo se a query ao banco falhar por race condition
  - Limpar a flag após confirmação de que é influencer
- A lógica existente `handleNext()` já pula as telas `VANTAGENS_PREMIUM` e `ASSINATURAS` quando `isInfluencer = true`

### 3. ✅ Redirecionamento para tela inicial após conclusão do onboarding
**Problema:** Potencial race condition entre o `upsert` no banco e o `refreshProfile()` podia impedir o redirecionamento correto.

**Solução:**
- Adicionado delay de 1s antes do `refreshProfile()` para garantir propagação no Supabase
- Adicionada verificação extra: se `onboarding_completed` ainda é `false` após o refresh, aguarda mais 1s e tenta novamente
- Limpeza da flag `nura_is_influencer_signup` no `finally` do `finishOnboarding()`
- Adicionado fallback no `LoginView.tsx` que redireciona para `/` se o influencer estiver logado mas preso na tela de login

## Arquivos Modificados

1. **`src/routes/influencer/InfluencerOnboarding.tsx`** (NOVO)
   - Rota dedicada para preparar o onboarding de influencers
   - Verifica sessão, valida que é influencer, redireciona para app principal

2. **`src/routes/index.tsx`**
   - Adicionada rota `/influencer/onboarding`

3. **`src/routes/InfluencerReferral.tsx`**
   - Alterado redirecionamento de `/entrar?signup=true` para `/influencer/onboarding`
   - Adicionada flag `nura_is_influencer_signup` no localStorage

4. **`src/routes/influencer/InfluencerActivation.tsx`**
   - Alterado redirecionamento de `/entrar` para `/influencer/onboarding`

5. **`src/components/onboarding-stitch/OnboardingFlow.tsx`**
   - Verificação de flag localStorage para detecção imediata de influencers
   - Delay e retry no `refreshProfile()` para evitar race conditions
   - Limpeza da flag após conclusão do onboarding

6. **`src/components/LoginView.tsx`**
   - Adicionado `useEffect` que redireciona influencers logados para `/` se ficarem presos na tela de login

## Fluxo Completo Atualizado

```
[Influenciador compartilha link /i/:token]
        ↓
[InfluencerReferral.tsx] 
  - Mostra dados do influencer
  - Botão "Criar minha conta influencer"
        ↓
  [Clique no botão]
  - Salva nura_influencer_token no localStorage
  - Salva nura_acquisition_channel = 'influencer'
  - Salva nura_is_influencer_signup = 'true'
  - SignOut de sessão anterior
        ↓
[/influencer/onboarding]
  - Verifica se há sessão ativa
  - Se NÃO há: redireciona para /entrar?signup=true
  - Se há sessão: aguarda e verifica influencerRecord
  - Redireciona para / (app principal)
        ↓
[App.tsx detecta onboarding_completed = false]
        ↓
[OnboardingFlow.tsx]
  - Detecta nura_is_influencer_signup = 'true'
  - Preenche dados pessoais, objetivos, hábitos (steps 1-30)
  - Ao chegar em VANTAGENS_PREMIUM:
    → isInfluencer = true → finishOnboarding() IMEDIATO
    → Pula telas de planos premium
        ↓
[finishOnboarding()]
  - Salva onboarding_completed = true no banco
  - Delay de 1s + refreshProfile()
  - Verifica se foi atualizado, retry se necessário
  - Limpa flag nura_is_influencer_signup
  - Chama onComplete()
        ↓
[App.tsx detecta onboarding_completed = true]
        ↓
[App Principal - FlowDashboard]
  - Influencer usa o app gratuitamente
```

## Testes Recomendados

1. **Teste de fluxo completo:**
   - Criar novo influencer via painel admin
   - Copiar link de indicação
   - Abrir link em aba anônima
   - Clicar em "Criar minha conta influencer"
   - Verificar redirecionamento para `/influencer/onboarding`
   - Fazer signup com email/senha
   - Verificar que vai direto para onboarding (não login)
   - Preencher onboarding
   - Verificar que NÃO aparece tela de planos premium
   - Concluir onboarding
   - Verificar redirecionamento para tela inicial do app

2. **Teste de race condition:**
   - Fazer signup rápido e verificar se `isInfluencer` é detectado corretamente
   - Verificar que a flag localStorage é limpa após conclusão

3. **Teste de usuário existente:**
   - Influencer com conta já criada clica no link
   - Faz login
   - É direcionado para dashboard do influencer (não onboarding)
