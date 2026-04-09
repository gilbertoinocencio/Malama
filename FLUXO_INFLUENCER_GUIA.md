# Fluxo do Influencer - Guia Rápido

## ⚠️ IMPORTANTE: Dois Links Diferentes!

### Link 1: Para o INFLUENCER (ACESSO DELE)
```
http://localhost:3000/influencer/login
```
- **Quem acessa:** O próprio influencer
- **Como funciona:** Email + senha (definidos pelo admin na criação)
- **O que acontece:**
  - Se onboarding não completado → Redireciona para onboarding (SEM planos)
  - Se onboarding completado → Redireciona para dashboard do influencer

### Link 2: Para SEGUIDORES (DIVULGAÇÃO)
```
http://localhost:3000/i/:referral_token
```
- **Quem acessa:** Seguidores do influencer
- **Como funciona:** Veem página de convite → Clicam "Criar minha conta" → Fazem signup
- **O que acontece:** Onboarding completo do app (usuário normal)

---

## Fluxo Passo a Passo

### 1. Admin Cria Influencer

1. Acessar `/admin/influencers`
2. Clicar em "+ Novo influenciador"
3. Preencher:
   - Nome completo
   - Email
   - **Senha** (mínimo 8 caracteres)
   - Instagram
   - Comissão por cadastro (R$)
   - Chave PIX
4. Clicar em "Criar influenciador"

### 2. Admin Envia Credenciais ao Influencer

O admin deve enviar estas 3 informações ao influencer:

```
Link de acesso: http://localhost:3000/influencer/login
Email: [email que você cadastrou]
Senha: [senha que você definiu]
```

### 3. Influencer Faz Login

1. Influencer acessa: `http://localhost:3000/influencer/login`
2. Insere email e senha
3. Clica em "Entrar"
4. Sistema verifica se onboarding foi completado:
   - **Se NÃO completado** → Redireciona para `/influencer/onboarding`
   - **Se completado** → Redireciona para `/influencer/dashboard`

### 4. Onboarding (SEM Planos Premium)

O influencer preenche o onboarding normalmente:
- Dados pessoais (idade, gênero, altura, peso)
- Objetivos e metas
- Hábitos alimentares
- Nível de atividade
- ...

**IMPORTANTE:** Quando chegar nas telas de planos premium (passo 31/32):
- O sistema detecta que é influencer
- **PULA automaticamente** as telas de assinatura
- Finaliza o onboarding direto

### 5. Influencer no App Principal

Após completar o onboarding:
- Influencer vê a tela inicial do app (FlowDashboard)
- Pode usar todas as funcionalidades gratuitamente
- Pode acessar o perfil e gerar seu link de indicação

### 6. Influencer Gera Link para Seguidores

No app:
1. Influencer vai em **Perfil**
2. Clica em **"Gerar link de indicação"**
3. Copia o link: `http://localhost:3000/i/:seu_token`
4. Compartilha com seguidores nas redes sociais

### 7. Seguidores Acessam o Link

Quando um seguidor clica no link:
1. Vê página de convite do influencer
2. Clica em "Criar minha conta influencer"
3. Faz signup (cria conta nova)
4. Faz onboarding completo (como usuário normal)
5. É registrado como "indicado" do influencer
6. Influencer recebe comissão por essa indicação

---

## Fluxo Visual

```
[ADMIN]
  ↓ Cria influencer (email + senha)
  ↓ Envia credenciais ao influencer
  
[INFLUENCER]
  ↓ Acessa /influencer/login
  ↓ Faz login com email/senha
  ↓ É redirecionado para onboarding
  ↓ Preenche dados (SEM telas de planos)
  ↓ Conclui onboarding
  ↓ Entra no app (FlowDashboard)
  ↓ Gera link de indicação /i/:token
  ↓ Compartilha com seguidores
  
[SEGUIDORES]
  ↓ Acessam /i/:token
  ↓ Veem página de convite
  ↓ Clicam "Criar minha conta"
  ↓ Fazem signup
  ↓ Fazem onboarding completo
  ↓ Usam o app como usuários normais
  ↓ Influencer recebe comissão
```

---

## Problemas Comuns

### ❌ "User already registered"
**Causa:** Tentando criar conta com email que já existe (o admin já criou a conta)
**Solução:** Use `/influencer/login` com o email/senha que o admin te enviou

### ❌ Influencer vê tela de planos premium
**Causa:** Flag `nura_is_influencer_signup` não está no localStorage
**Solução:** 
1. Abrir console (F12)
2. Verificar logs com emoji 🟢
3. Se não aparecer `✅ Influencer detectado!`, limpar localStorage e tentar novamente

### ❌ Influencer não consegue fazer login
**Causa:** Email ou senha incorretos
**Solução:** 
1. Verificar no admin se o influencer foi criado com sucesso
2. Confirmar email/senha com o admin
3. Tentar login novamente em `/influencer/login`

---

## Logs de Debug

No console do navegador (F12), procurar por:

**No login do influencer:**
- Verificação de `onboarding_completed`
- Redirecionamento para `/influencer/onboarding` ou `/influencer/dashboard`

**No onboarding:**
- `🟢 [OnboardingFlow] Verificação inicial - Flag localStorage: true`
- `🟢 [OnboardingFlow] Query ao banco - É influencer? true`
- `✅ [OnboardingFlow] Influencer detectado! Pulando telas de premium...`
