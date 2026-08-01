# Modelo financeiro do Malama

> Documento canônico. Se um número na tela discorda daqui, o número está errado.
> Última revisão: 2026-08-01.

## Como o dinheiro entra e sai

```
EMPRESA  ──paga assentos──>  MALAMA  ──repassa por consulta realizada──>  PROFISSIONAL
   │                                                                          ▲
   └──libera assento──> COLABORADOR ──usa crédito──> agenda consulta ─────────┘
                        (não paga nada, nunca vê preço)
```

**Entrada:** a empresa paga por assento contratado (`empresas.valor_por_assento × max_assentos`), faturado em `empresa_faturas`. É a única receita recorrente do modelo atual.

**Saída:** o profissional recebe, por consulta **realizada**, o valor do nível dele — configurado pelo admin em Configurações — menos a taxa de transação do gateway.

**O colaborador não paga nada.** Recebe crédito (`consultation_credits`) da empresa e agenda com ele. Nenhum preço, plano ou paywall aparece no app do paciente.

## Repasse ao profissional

Valor por consulta definido pelo **nível** (1/2/3) e pelo **tipo** (médico ou psicólogo), em `platform_settings`:

| Chave | Uso |
|---|---|
| `doctor_value_nivel1..3` | valor por consulta do médico |
| `psi_value_nivel1..3` | valor por sessão do psicólogo (tabela própria — duração e mercado diferentes) |
| `transaction_fee_percent` | taxa do gateway descontada do repasse (default 5) |

```
bruto   = consultas realizadas no período × valor do nível
taxa    = bruto × transaction_fee_percent
líquido = bruto − taxa          <- é isto que sai por PIX
```

Exemplo: 1 consulta de um médico nível 2 (R$100) com taxa de 5% → **R$95** transferidos.

Gravado em `payouts` pelo `process-payouts` no momento do split:

| Coluna | Significado |
|---|---|
| `amount` | **líquido** — exatamente o valor transferido. Nunca tratar como bruto. |
| `gross_amount` | bruto (consultas × valor do nível) |
| `fee_percent` / `fee_amount` | taxa aplicada — **snapshot**, não muda se a configuração mudar depois |

`payout_items.amount` guarda o valor **cheio** de cada consulta: a taxa incide sobre a transferência inteira, não por consulta.

Split roda nos dias 15 e 30 via `pg_cron`.

## Margem da plataforma

Não existe comissão por consulta. A margem é:

```
margem = receita do período (faturas B2B pagas) − repasses do período (payouts.amount)
```

Os dois lados devem cobrir **a mesma janela de tempo**.

---

## Legado: o que NÃO vale mais

O projeto nasceu B2C — o paciente pagava por consulta e o Malama tirava uma comissão. **Esse modelo acabou.** Restaram colunas e campos que ainda existem no banco mas **não devem ser usados como fonte de verdade financeira**:

| Resquício | Por que não vale | O que usar |
|---|---|---|
| `consultations.price` | preço que ninguém paga (vinha de `doctors.consultation_price`) | crédito de assento; a consulta não tem preço ao paciente |
| `consultations.platform_fee` | comissão de um modelo extinto; valores gravados divergem da configuração atual | não há comissão por consulta |
| `consultations.doctor_payout` | contradiz o repasse real por nível | `payouts.amount` |
| `platform_settings.default_platform_fee` | era a comissão B2C (25%) | reservado para comissão futura de indicação de suplementos — **não afeta repasse** |

Esses campos ficam preservados para histórico das consultas antigas, mas nenhuma tela nova deve somá-los.

**Sintoma clássico do erro:** um número de repasse que não bate com o que saiu no PIX. Se aparecer "taxa retida de 25%" em algum lugar, é código velho — a única taxa que existe é a de transação.

## Onde cada número deve nascer

| Tela | Métrica | Fonte correta |
|---|---|---|
| Admin → Financeiro | Receita | `empresa_faturas` (status `pago`) |
| Admin → Financeiro | Total repassado | `payouts.amount` (status `paid`) |
| Admin → Financeiro | Margem | receita − repasses, **mesmo período** |
| Admin → Financeiro | Repasses (bruto/taxa/líquido) | colunas gravadas em `payouts` — ler, nunca recalcular |
| Admin → Dashboard | MRR B2B | assentos × valor por assento |
| Admin → Usuários | Custo de atendimento | consultas realizadas × valor do nível do profissional |
| Médico → Financeiro | A receber | consultas não pagas × valor do nível, menos a taxa |

## Ao mexer no financeiro

O cálculo do repasse existe em **dois lugares que precisam concordar**:

- `supabase/functions/process-payouts/index.ts` — fonte da verdade no momento do split
- `src/services/billingService.ts` (`loadTransactionFeePercent`, `applyTransactionFee`, `valueForNivel`) — projeções antes do split

Mudou a regra num, muda no outro. A edge function **não sobe com push na main** — precisa de `supabase functions deploy process-payouts`.
