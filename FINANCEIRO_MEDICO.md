# 💰 Financeiro do Médico - Página Detalhada

## Resumo
Nova aba "Financeiro" adicionada ao painel do médico com visão completa e detalhada de todos os aspectos financeiros da prática médica no Nura.

## ✨ Funcionalidades Implementadas

### 1. **Cards de Resumo Financeiro** (4 cards)
- **Total Faturado (Bruto)** - Soma de todas as consultas realizadas
- **Taxa da Plataforma** - Valor total de comissão deduzida
- **A Receber (Pendente)** - Valor aguardando pagamento
- **Líquido Recebido** - Valor já pago ao médico

### 2. **Filtro de Período**
- Últimos 7 dias
- Últimos 30 dias
- Últimos 3 meses
- Últimos 12 meses
- Todo período

### 3. **Seção: Repasses (Payouts)**
- Tabela completa de repasses
- Filtro por status (Pendente/Pago/Cancelado)
- Colunas:
  - Período do repasse
  - Quantidade de consultas
  - Valor do repasse
  - Chave PIX
  - Status
  - Data do pagamento
- Resumo com:
  - Total recebido
  - Pendente
  - Total de repasses

### 4. **Seção: Histórico de Consultas**
- Tabela detalhada de todas as consultas
- Filtro por status de pagamento
- Colunas:
  - Data da consulta
  - Nome do paciente
  - Tipo (Inicial/Retorno/Renovação)
  - Valor total
  - Taxa da plataforma
  - Valor líquido (destaque verde)
  - Status do pagamento
- Rodapé com totais:
  - Total bruto
  - Total taxas
  - Total líquido

### 5. **Seção: Resumo do Período** (Card gradiente verde)
- Consultas realizadas
- Taxa média por consulta
- Comissão líquida total
- Percentual recebido

### 6. **Nota Informativa**
- Explicação sobre como funcionam os repasses
- Informações sobre a taxa da plataforma

## 🎨 Design

### Cores
- **Verde (#2ECC71):** Valores positivos, botões principais
- **Amarelo:** Valores pendentes
- **Vermelho:** Taxas deduzidas
- **Azul:** Valores líquidos recebidos
- **Laranja:** Taxa da plataforma

### Layout
- **Cards:** Grid responsivo (1/2/4 colunas)
- **Tabelas:** Scroll horizontal em mobile
- **Filtros:** Dropdowns nativos
- **Badges:** Cores por status

## 🔧 Detalhes Técnicos

### Arquivos Criados/Modificados

#### 1. **DoctorFinancial.tsx** (Novo)
- **Local:** `src/routes/doctor/DoctorFinancial.tsx`
- **Linhas:** ~400
- **Funcionalidades:**
  - Carregamento de dados via `consultationService` e `payoutService`
  - Cálculos financeiros em tempo real
  - Filtros por período e status
  - Tabelas com paginação implícita

#### 2. **DoctorLayout.tsx** (Modificado)
- **Alteração:** Adicionado item "Financeiro" no menu
- **Ícone:** DollarSign (lucide-react)
- **Posição:** Entre "Pacientes" e "Configurações"

#### 3. **routes/index.tsx** (Modificado)
- **Import:** `DoctorFinancial`
- **Rota:** `/medico/financeiro`
- **Protegida:** Sim (dentro do DoctorRoute)

### Cálculos Financeiros

```typescript
// Total Faturado (Bruto)
totalRevenue = Σ(consultas.price) onde status != 'cancelled'

// Taxa da Plataforma
totalPlatformFee = Σ(consultas.platform_fee) onde status != 'cancelled'

// Líquido do Médico
totalDoctorEarnings = Σ(consultas.doctor_payout) onde status != 'cancelled'

// Valor Pago
paidAmount = Σ(consultas.doctor_payout) onde payment_status = 'paid'

// Valor Pendente
pendingAmount = Σ(consultas.doctor_payout) onde payment_status = 'pending'
```

### Serviços Utilizados

```typescript
// Consultas
consultationService.getDoctorConsultations(doctorId, {
  fromDate,
  toDate
})

// Repasses
payoutService.getDoctorPayouts(doctorId)
```

## 📊 Dados Exibidos

### Consultas
| Campo | Origem | Formato |
|-------|--------|---------|
| Data | scheduled_at | DD/MM/YYYY |
| Paciente | patient_name | Texto |
| Tipo | type | Inicial/Retorno/Renovação |
| Valor | price | R$ 0,00 |
| Taxa | platform_fee | -R$ 0,00 |
| Líquido | doctor_payout | R$ 0,00 (verde) |
| Pagamento | payment_status | Badge colorido |

### Repasses
| Campo | Origem | Formato |
|-------|--------|---------|
| Período | period_start/period_end | DD/MMM/YYYY |
| Consultas | consultations_count | Número |
| Valor | amount | R$ 0,00 |
| PIX | pix_key | Texto |
| Status | status | Badge colorido |
| Pagamento | paid_at | DD/MM/YYYY |

## 📱 Responsividade

### Desktop (> 1024px)
- 4 cards de resumo em linha
- Tabelas completas com todas as colunas
- Filtros visíveis

### Tablet (768px - 1024px)
- 2 cards por linha
- Algumas colunas ocultas
- Filtros compactos

### Mobile (< 768px)
- 1 card por linha
- Tabelas com scroll horizontal
- Colunas essenciais apenas

## 🔍 Filtros Disponíveis

### Período
- 7 dias, 30 dias, 3 meses, 12 meses, todo

### Status de Pagamento (Consultas)
- Todos
- Pagos
- Pendentes
- Reembolsados

### Status de Repasse
- Todos
- Pendentes
- Pagos
- Cancelados

## 🎯 Fluxo do Usuário

1. Médico acessa painel
2. Clica em "Financeiro" na sidebar
3. Vê resumo financeiro do período (padrão: 30 dias)
4. Pode filtrar por período diferente
5. Visualiza repasses recebidos
6. Visualiza histórico detalhado de consultas
7. Acompanha valores pendentes vs recebidos

## ✅ Status
- [x] Componente DoctorFinancial criado
- [x] Menu "Financeiro" adicionado ao DoctorLayout
- [x] Rota /medico/financeiro configurada
- [x] Filtros de período e status
- [x] Tabela de repasses
- [x] Tabela de consultas
- [x] Cards de resumo
- [x] Resumo do período
- [x] Nota informativa
- [x] Responsivo
- [x] Build passando
- [ ] Testes com dados reais
- [ ] Exportação para PDF/CSV (futuro)

## 💡 Melhorias Futuras

### Alta Prioridade
1. **Gráficos:** Linha de evolução de ganhos
2. **Exportação:** Download CSV/PDF de relatórios
3. **Notificações:** Alerta quando repasse é processado

### Média Prioridade
4. **Projeções:** Estimativa de ganhos futuros
5. **Comparativo:** Período vs período anterior
6. **Impostos:** Cálculo de impostos retidos

### Baixa Prioridade
7. **Multi-moeda:** Suporte a outras moedas
8. **Integração:** Export para contabilidade
9. **Metas:** Definir meta mensal de ganhos

## 📅 Data de Implementação
8 de abril de 2026

## 🚀 Como Acessar

1. Fazer login como médico
2. Clicar em "Financeiro" na sidebar
3. Ou acessar diretamente: `/medico/financeiro`

## 📋 Estrutura de Menu Atualizada

```
📊 Dashboard
📅 Agenda
👥 Pacientes
💰 Financeiro ← NOVO
⚙️ Configurações
```
