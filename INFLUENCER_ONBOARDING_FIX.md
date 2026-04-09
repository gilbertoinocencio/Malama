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
   - **Configura flag `nura_is_influencer_signup` no localStorage quando detecta influencer**
   - Logs de debug detalhados para troubleshooting

2. **`src/routes/index.tsx`**
   - Adicionada rota `/influencer/onboarding`

3. **`src/routes/InfluencerReferral.tsx`**
   - Alterado redirecionamento de `/entrar?signup=true` para `/influencer/onboarding`
   - Adicionada flag `nura_is_influencer_signup` no localStorage

4. **`src/routes/influencer/InfluencerActivation.tsx`**
   - Alterado redirecionamento de `/entrar` para `/influencer/onboarding`
   - **Adicionada configuração da flag `nura_is_influencer_signup` antes do redirecionamento**

5. **`src/components/onboarding-stitch/OnboardingFlow.tsx`**
   - Verificação de flag localStorage para detecção imediata de influencers
   - Delay e retry no `refreshProfile()` para evitar race conditions
   - Limpeza da flag após conclusão do onboarding
   - **Logs de debug detalhados para monitoramento do fluxo**

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

### **Debug Mode - Logs no Console**

Os seguintes logs aparecerão no console do navegador durante o teste:

**No `InfluencerOnboarding.tsx`:**
- `🔵 [InfluencerOnboarding] Iniciando verificação...`
- `🔵 [InfluencerOnboarding] Sessão: ATIVA` ou `NÃO EXISTE`
- `🔵 [InfluencerOnboarding] Usuário logado: <user_id>`
- `🔵 [InfluencerOnboarding] influencerRecord atual: <dados>`
- `🔵 [InfluencerOnboarding] Flag localStorage: true/false`
- `🔵 [InfluencerOnboarding] Tentativa X/5 - Verificando status de influencer...`
- `✅ [InfluencerOnboarding] É influencer (via influencerRecord do contexto)` ou `(via query direta)`
- `❌ [InfluencerOnboarding] NÃO é influencer`
- `🔵 [InfluencerOnboarding] Flag final no localStorage: true`
- `🔵 [InfluencerOnboarding] Redirecionando para / (app principal)`

**No `OnboardingFlow.tsx`:**
- `🟢 [OnboardingFlow] Verificação inicial - Flag localStorage: true/false`
- `🟢 [OnboardingFlow] Verificando se é influencer para user: <user_id>`
- `🟢 [OnboardingFlow] Flag atual no localStorage: true/false`
- `🟢 [OnboardingFlow] Query ao banco - É influencer? true/false`
- `🟢 [OnboardingFlow] Limpando flag localStorage (já confirmado pelo banco)`
- `🟡 [OnboardingFlow] Mantendo isInfluencer=true (flag no localStorage, race condition)`
- `🔴 [OnboardingFlow] Definindo isInfluencer=false`
- `🟢 [OnboardingFlow] handleNext - currentStep: <step> nextStep: <step> isInfluencer: true/false`
- `✅ [OnboardingFlow] Influencer detectado! Pulando telas de premium e finalizando onboarding...`

### Teste de fluxo completo (Via Link de Indicação):

1. Criar novo influencer via painel admin
2. Copiar link de indicação `/i/:token`
3. Abrir link em aba anônima
4. Clicar em "Criar minha conta influencer"
5. Verificar redirecionamento para `/influencer/onboarding`
6. Fazer signup com email/senha
7. Verificar que vai direto para onboarding (não login)
8. Preencher onboarding
9. **VERIFICAR CONSOLE**: Deve aparecer `✅ [OnboardingFlow] Influencer detectado! Pulando telas de premium e finalizando onboarding...`
10. Verificar que NÃO aparece tela de planos premium
11. Concluir onboarding
12. Verificar redirecionamento para tela inicial do app

### Teste de fluxo completo (Via Link de Ativação do Admin):

1. Criar novo influencer via painel admin
2. Copiar link de ativação `/influencer/ativar/:setup_token`
3. Abrir link em aba anônima
4. Preencher senha e confirmar
5. Clicar em "Ativar minha conta"
6. **VERIFICAR CONSOLE**: Deve aparecer `✅ [InfluencerOnboarding] É influencer` e `🔵 [InfluencerOnboarding] Flag final no localStorage: true`
7. Verificar redirecionamento para `/influencer/onboarding`
8. Verificar redirecionamento automático para `/` (app principal)
9. Verificar que onboarding aparece
10. Preencher onboarding
11. **VERIFICAR CONSOLE**: Deve aparecer `✅ [OnboardingFlow] Influencer detectado! Pulando telas de premium e finalizando onboarding...`
12. Verificar que NÃO aparece tela de planos premium (passo 31/32)
13. Verificar redirecionamento para tela inicial do app

### Teste de race condition:

1. Fazer signup rápido e verificar se `isInfluencer` é detectado corretamente
2. Verificar que a flag localStorage é limpa após conclusão

### Teste de diagnóstico (se ainda houver problemas):

1. Abrir o console do navegador (F12)
2. Seguir o fluxo de ativação do influencer
3. Observar os logs com emoji 🔵 (InfluencerOnboarding) e 🟢 (OnboardingFlow)
4. Se aparecer `❌ [InfluencerOnboarding] NÃO é influencer`, verificar:
   - O influencer foi criado corretamente no banco de dados?
   - O `user_id` está vinculado na tabela `influencers`?
   - O setup_token foi invalidado após ativação?
5. Se aparecer `🔴 [OnboardingFlow] Definindo isInfluencer=false`, verificar:
   - A flag `nura_is_influencer_signup` está no localStorage?
   - O user_id bate com o registro na tabela `influencers`?

### Teste de usuário existente:

1. Influencer com conta já criada clica no link
2. Faz login
3. É direcionado para dashboard do influencer (não onboarding)
