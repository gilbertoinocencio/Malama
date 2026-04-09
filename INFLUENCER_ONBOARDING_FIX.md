# Fluxo de Onboarding para Influenciadores - Correções Aplicadas

## Problemas Resolvidos

### 1. ✅ Influencer era redirecionado para tela de login padrão ao invés do onboarding
**Problema:** Ao clicar em "Criar minha conta influencer", o usuário era direcionado para `/entrar?signup=true` (tela de login), sem fluxo claro para o onboarding.

**Solução:**
- Criada nova rota dedicada `/influencer/onboarding` (`src/routes/influencer/InfluencerOnboarding.tsx`)
- Atualizado `InfluencerActivation.tsx` para redirecionar para `/influencer/onboarding` após ativação
- A rota verifica sessão, valida que é influencer, e redireciona para o app principal onde o `App.tsx` detecta `onboarding_completed = false` e mostra o `OnboardingFlow`

### 2. ✅ Influencer via tela de planos premium durante onboarding
**Problema:** Influenciadores estavam vendo a tela "Eleve sua jornada ao nível Premium" (Passo 31 de 34) e sendo direcionados para planos pagos, quando deveriam usar o app gratuitamente.

**Solução:**
- Adicionada flag `nura_is_influencer_signup` no localStorage para detecção imediata
- Atualizado `OnboardingFlow.tsx` para verificar essa flag como fallback (antes da query ao banco)
- A lógica existente `handleNext()` já pula as telas `VANTAGENS_PREMIUM` e `ASSINATURAS` quando `isInfluencer = true`

### 3. ✅ Redirecionamento para tela inicial após conclusão do onboarding
**Problema:** Potencial race condition entre o `upsert` no banco e o `refreshProfile()` podia impedir o redirecionamento correto.

**Solução:**
- Adicionado delay de 1s + retry no `refreshProfile()` para garantir propagação no Supabase
- Limpeza da flag `nura_is_influencer_signup` após conclusão
- Fallback no `LoginView.tsx` que redireciona para `/` se o influencer ficar preso na tela de login

---

## Fluxo Completo Corrigido

### Cenário A: Admin Cria Influencer

```
[Admin cria influencer no painel /admin/influencers]
  - Preenche nome, email, instagram, comissão, PIX
  - Clica em "Criar influenciador"
        ↓
[Backend cria registro na tabela influencers]
  - Gera setup_token (prefixo: setup_)
  - Gera referral_token (prefixo: inf_)
  - user_id = NULL (ainda não ativado)
        ↓
[Admin clica em "Ver" → copia link de ativação]
  - Link: http://localhost:3000/influencer/ativar/:setup_token
  - Envia este link para o influencer
        ↓
[Influencer acessa o link]
  - Vê tela de ativação (InfluencerActivation.tsx)
  - Preenche senha (mínimo 8 caracteres)
  - Clica em "Ativar minha conta"
        ↓
[Backend processa ativação]
  - Cria conta auth (Supabase Auth)
  - Vincula user_id ao registro do influencer
  - Invalida setup_token (setup_token = NULL)
  - Configura flag nura_is_influencer_signup = 'true'
        ↓
[/influencer/onboarding]
  - Verifica sessão ativa
  - Confirma que é influencer
  - Redireciona para / (app principal)
        ↓
[App.tsx detecta onboarding_completed = false]
  - Mostra OnboardingFlow
        ↓
[OnboardingFlow.tsx]
  - Detecta nura_is_influencer_signup = 'true'
  - Influencer preenche dados pessoais, objetivos, hábitos (steps 1-30)
  - Ao chegar em VANTAGENS_PREMIUM:
    → isInfluencer = true → finishOnboarding() IMEDIATO
    → Pula telas de planos premium
        ↓
[finishOnboarding()]
  - Salva onboarding_completed = true no banco
  - Delay de 1s + refreshProfile()
  - Limpa flag nura_is_influencer_signup
  - Chama onComplete()
        ↓
[App.tsx detecta onboarding_completed = true]
  - Redireciona para FlowDashboard (tela inicial do app)
        ↓
[Influencer no app]
  - Acessa perfil → Gera link de indicação
  - Link: http://localhost:3000/i/:referral_token
  - Compartilha com seguidores
```

### Cenário B: Seguidor Acessa Link de Indicação

```
[Seguidor acessa link /i/:referral_token]
        ↓
[InfluencerReferral.tsx]
  - Mostra dados do influencer (nome, instagram)
  - Lista benefícios do app
  - Botão "Criar minha conta influencer"
        ↓
[Clique no botão]
  - Salva nura_influencer_token no localStorage
  - Salva nura_acquisition_channel = 'influencer'
  - Salva nura_is_influencer_signup = 'true'
  - Redireciona para /influencer/onboarding
        ↓
[/influencer/onboarding]
  - Se não há sessão: redireciona para /entrar?signup=true
  - Se há sessão: verifica influencerRecord e redireciona para /
        ↓
[App.tsx detecta onboarding_completed = false]
  - Mostra OnboardingFlow
        ↓
[OnboardingFlow.tsx]
  - Detecta nura_is_influencer_signup = 'true'
  - Seguidor preenche onboarding
  - Pula telas de planos premium
        ↓
[App Principal - FlowDashboard]
  - Usuário é registrado como referido do influencer
  - Influencer recebe comissão
```

---

## Arquivos Modificados

1. **`src/routes/influencer/InfluencerOnboarding.tsx`** (NOVO)
   - Rota dedicada para preparar o onboarding de influencers
   - Verifica sessão, valida que é influencer, redireciona para app principal
   - Configura flag `nura_is_influencer_signup` no localStorage quando detecta influencer
   - Logs de debug detalhados para troubleshooting

2. **`src/routes/index.tsx`**
   - Adicionada rota `/influencer/onboarding`

3. **`src/routes/InfluencerReferral.tsx`**
   - Alterado redirecionamento de `/entrar?signup=true` para `/influencer/onboarding`
   - Adicionada flag `nura_is_influencer_signup` no localStorage

4. **`src/routes/influencer/InfluencerActivation.tsx`**
   - Alterado redirecionamento de `/entrar` para `/influencer/onboarding`
   - Adicionada configuração da flag `nura_is_influencer_signup` antes do redirecionamento

5. **`src/components/onboarding-stitch/OnboardingFlow.tsx`**
   - Verificação de flag localStorage para detecção imediata de influencers
   - Delay e retry no `refreshProfile()` para evitar race conditions
   - Limpeza da flag após conclusão do onboarding
   - Logs de debug detalhados para monitoramento do fluxo

6. **`src/components/LoginView.tsx`**
   - Adicionado `useEffect` que redireciona influencers logados para `/` se ficarem presos na tela de login

---

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

### Teste de fluxo completo (Via Link de Ativação do Admin):

1. Acessar `/admin/influencers`
2. Clicar em "+ Novo influenciador"
3. Preencher: nome, email, instagram, comissão, PIX
4. Clicar em "Criar influenciador"
5. Clicar em "Ver" no influencer criado
6. Copiar link de ativação: `http://localhost:3000/influencer/ativar/:setup_token`
7. Abrir link em aba anônima
8. Preencher senha e confirmar
9. Clicar em "Ativar minha conta"
10. **VERIFICAR CONSOLE**: Deve aparecer `✅ [InfluencerOnboarding] É influencer` e `🔵 [InfluencerOnboarding] Flag final no localStorage: true`
11. Verificar redirecionamento para `/influencer/onboarding`
12. Verificar redirecionamento automático para `/` (app principal)
13. Verificar que onboarding aparece
14. Preencher onboarding
15. **VERIFICAR CONSOLE**: Deve aparecer `✅ [OnboardingFlow] Influencer detectado! Pulando telas de premium e finalizando onboarding...`
16. Verificar que NÃO aparece tela de planos premium (passo 31/32)
17. Verificar redirecionamento para tela inicial do app
18. No app, ir em Perfil → Verificar se há opção de gerar link de indicação

### Teste de fluxo completo (Via Link de Indicação do Influencer):

1. Copiar link de indicação do influencer: `http://localhost:3000/i/:referral_token`
2. Abrir link em aba anônima
3. Clicar em "Criar minha conta influencer"
4. Fazer signup com email/senha
5. Verificar redirecionamento para onboarding
6. Preencher onboarding
7. **VERIFICAR CONSOLE**: Deve aparecer `✅ [OnboardingFlow] Influencer detectado! Pulando telas de premium...`
8. Verificar que NÃO aparece tela de planos premium
9. Concluir onboarding
10. Verificar redirecionamento para tela inicial do app

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

1. Influencer com conta já criada clica no link de ativação
2. Faz login com email/senha
3. É direcionado para dashboard do influencer (não onboarding)
