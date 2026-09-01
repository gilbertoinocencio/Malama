# Aplicar as correções — passo a passo

Siga na ordem. Cada passo diz o que fazer e como confirmar que deu certo antes
de ir pro próximo.

Projeto: `agstaiizemtngcgmliju` · CLI instalada nesta máquina, já logada e
linkada — os passos marcados **[eu rodo]** foram executados diretamente.

**Atualização (01/09/2026):** a integração com o Strava foi desativada em
vez de corrigida — o app cobre atividade física por Apple HealthKit e
Google Health Connect, então proteger um endpoint que ninguém mais deveria
chamar deixou de fazer sentido. `strava-webhook`, `strava-oauth` e
`strava-oauth-callback` agora só devolvem `410 Gone`, sem tocar em banco
nem em API externa. Isso eliminou os passos de gerar segredo e recriar
assinatura — o checklist abaixo já reflete isso.

---

## Passo 1 — a migração SQL

Você já validou os 4 blocos contra o schema real (32 RPCs protegidas, 14
policies aplicadas, gate funcional testado). Se algum bloco ainda não
rodou nesse banco, ou você quer rodar de novo — é seguro, os blocos são
idempotentes — abra:

```
supabase/migrations/20260901_correcoes_auditoria.sql
```

e cole **um bloco por vez** no SQL Editor. Leia os `NOTICE` depois de cada
um.

Se já rodou tudo sem erro, pule este passo.

---

## Passo 2 — conferir a migração

Roda no SQL Editor (não altera nada):

```sql
SELECT p.proname,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_executa
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'rh\_%'
ORDER BY p.proname;
```

Esperado: toda função terminada em `__base` aparece com
`authenticated_executa = false`.

---

## Passo 3 — deploy das Edge Functions **[eu rodo]**

12 functions no total.

**7 editadas para as correções de segurança:**
```
send-consultation-reminders
send-glp1-notifications
send-rh-reminders
webhook-asaas
create-influencer-user
self-register-empresa
strava-webhook            (agora: desativada, devolve 410)
```

**3 que importam `_shared/emails.ts`** (ganhou `escapeHtml`/`safeCtaUrl` —
o `_shared` é empacotado dentro de cada function, quem não republicar
continua com a versão antiga):
```
invite-colaborador
invite-lead
resend-invite
```

**2 novas — desativadas junto com o webhook:**
```
strava-oauth
strava-oauth-callback
```

`strava-sync` e `strava-refresh-token` **não foram tocadas** — quem já
tinha o Strava conectado continua sincronizando normalmente até a remoção
completa da integração (tarefa separada).

---

## Passo 4 — teste manual rápido

- **Portal médico**: abra o prontuário de um paciente, confira se os
  exames aparecem (estava quebrado antes da correção do F1).
- **Portal RH**: com uma conta que só tem o módulo "Colaboradores"
  liberado, confirme que os outros módulos continuam bloqueados (agora
  também no servidor, não só escondidos na tela).
- **Cadastro público** (`/empresas`): preencha até o fim, confirma que não
  trava.
- **Botão "Conectar Strava"** (se existir na tela de integrações): vai
  mostrar erro agora — **esperado**. A remoção do botão em si é parte da
  tarefa de remoção completa, ainda não feita.

---

## Se algo der errado

- **Deploy falhou**: me manda a mensagem exata.
- **RH perdeu acesso a algo que deveria ter**: me diga qual tela e qual é
  o papel/módulo do usuário — pode ser um módulo mapeado errado na
  migração.

---

## Pendente — tarefa separada (não bloqueia nada acima)

Remoção completa da integração Strava: os 18 arquivos de frontend que
mencionam Strava (`Integrations.tsx` tem o botão), as 5 Edge Functions,
as migrations, e uma decisão sobre `strava_connections` e as `activities`
já sincronizadas de quem já conectou (histórico de treino — dado do
usuário, não credencial; provavelmente vale manter, só parar de
alimentar).
