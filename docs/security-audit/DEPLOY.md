# Estado do deploy — histórico

Este arquivo era o checklist passo-a-passo original. Todos os passos abaixo
**já foram executados** (SQL rodado, functions deployadas, testado ao vivo).
Fica como registro de auditoria de infraestrutura, não como pendência.

Projeto: `agstaiizemtngcgmliju`.

---

## SQL aplicado (nesta ordem)

1. `supabase/migrations/20260901_correcoes_auditoria.sql` — 4 blocos
   (F1, F6, F2/F3, F9). Aplicado; achou e corrigiu 3 policies extras
   (`consultations` x2, `plan_prices`) que nem constavam no relatório
   original.
2. `supabase/migrations/20260901_remove_strava_integration.sql` — aperta
   o `CHECK` de `user_integrations.service`.
3. `supabase/migrations/20260901_corrige_patient_notifications_insert.sql`
   — corrige regressão que o bloco F6 do item 1 introduziu (ver "Revisão
   pós-deploy" abaixo). **Este é o único que pode ainda não ter rodado —
   confira antes de seguir.**

## Edge Functions deployadas (nesta ordem)

**Rodada 1 — correções de segurança + desativação inicial do Strava (12):**
```
strava-webhook, strava-oauth, strava-oauth-callback,
send-consultation-reminders, send-glp1-notifications, send-rh-reminders,
webhook-asaas, create-influencer-user, self-register-empresa,
invite-colaborador, invite-lead, resend-invite
```

**Rodada 2 — remoção completa do Strava (2):**
```
strava-sync, strava-refresh-token
```

**Rodada 3 — correção do `safeCtaUrl` e do escape de `empresa.nome`
faltando em dois e-mails (6, todas que importam `_shared/emails.ts`):**
```
create-influencer-user, invite-colaborador, invite-lead, resend-invite,
send-rh-reminders, webhook-asaas
```

Todas confirmadas `ACTIVE` via `supabase functions list`. As 5 `strava-*`
testadas ao vivo com `curl` — devolvem `410` (as com `verify_jwt=true`
barram antes até no gateway, sem anon key).

---

## Revisão pós-deploy (code-review, mesmo dia)

Depois do deploy, rodei o skill de code review no diff completo da sessão.
Achou uma regressão real e duas correções incompletas:

1. **`patient_notifications` INSERT quebrou 3 funcionalidades.** O bloco
   F6 assumiu que toda notificação nasce de trigger — errado: reagendar
   consulta, responder ticket de suporte e emitir receita inserem direto
   do cliente. Ficaram silenciosamente sem notificar o paciente. Corrigido
   na migração 3 acima (exige vínculo médico↔paciente ou admin, não
   reabre o forjamento que o F6 fechou — testado contra 6 cenários).
2. **`safeCtaUrl` devolvia a URL crua**, não a normalizada — uma
   `redirect_to` maliciosa em `invite-lead` ainda injetava HTML no botão
   do e-mail. Corrigido: agora devolve `parsed.href`.
3. **Duas interpolações de `empresa.nome` sem escape** sobraram do F7 —
   uma em `webhook-asaas` (e-mail de reativação), duas em
   `send-rh-reminders` (dígest semanal). Corrigidas.

## Pendente — precisa de você

**`send-glp1-notifications` não tem `cron.schedule` em nenhuma migração
do repositório**, diferente de `send-consultation-reminders` e
`send-rh-reminders` (que têm, e usam a `service_role_key` do Vault —
essas duas eu confirmei seguras). Se o disparo de lembrete de dose GLP-1
vier de outro lugar (Cron Jobs do painel Supabase, por exemplo) com um
token diferente da service_role_key, o guard novo (`autorizado()`) vai
bloquear silenciosamente. **Confira em Database → Cron Jobs no painel do
Supabase, ou nos logs da function, se ela ainda está disparando** depois
do deploy da Rodada 1.

## Pendente — tarefa separada, não bloqueia nada acima

`strava_connections` (tokens OAuth de quem já conectou) não foi tocada —
`delete-account` ainda usa para revogar no Strava quando alguém apaga a
conta. Pra invalidar de vez, desative o app da Malama no painel de
desenvolvedor do Strava (ou gire o client secret) — isso não dá pra fazer
por código.
