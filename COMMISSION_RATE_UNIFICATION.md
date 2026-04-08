# Unificação da Taxa de Comissão

## 🎯 Problema

A taxa de comissão estava duplicada em dois lugares:
1. **Configurações Globais** (Admin > Configurações) - Taxa padrão da plataforma
2. **Perfil do Médico** (Admin > Médicos > Editar taxa) - Taxa individual por médico

Isso causava:
- ❌ Confusão na gestão
- ❌ Inconsistência de dados
- ❌ Complexidade desnecessária
- ❌ Dificuldade de manutenção

## ✅ Solução

Unificar a taxa de comissão em um **único local**: **Configurações Globais**

## 📋 Alterações Realizadas

### 1. **Admin > Gestão de Médicos** (`AdminDoctorsManagement.tsx`)
- ❌ Removido coluna "Taxa" da tabela de médicos
- ❌ Removido botão "Editar taxa" (ícone de edição azul)
- ❌ Removido modal "Editar Taxa de Comissão"
- ❌ Removido campo "Taxa de comissão" do modal de aprovação
- ✅ Adicionado aviso informativo: "Será utilizada a taxa global configurada em Configurações (X%)"
- ✅ Carregamento das configurações globais para exibição da taxa atual

### 2. **Serviço do Portal Médico** (`doctorPortalService.ts`)
- ✅ `approveDoctor()`: Removido parâmetro `platformFeePercent`, agora só aprova o médico
- ✅ `getPendingPayouts()`: Busca taxa global de `platform_settings` em vez de usar `doctor.platform_fee_percent`

### 3. **Agendamento de Consultas** (`scheduling.ts`)
- ✅ `bookConsultation()`: Agora busca taxa global de `platform_settings` ao invés de usar a taxa do médico

### 4. **Financeiro do Médico** (`DoctorFinancial.tsx`)
- ✅ Adicionado estado `platformFeePercent` carregado das configurações globais
- ✅ Exibição da taxa global em vez da taxa individual
- ✅ Atualização de mensagens informativas

### 5. **Configurações do Médico** (`DoctorSettings.tsx`)
- ✅ Adicionado carregamento da taxa global ao montar o componente
- ✅ Substituído exibição da taxa por aviso: "Taxa da plataforma: X% (configurada globalmente pelo administrador)"

### 6. **Financeiro Admin** (`AdminFinancial.tsx`)
- ✅ Já usava `payout.fee_percent` do service, que agora retorna a taxa global automaticamente

### 7. **Banco de Dados** (`unify_commission_rate.sql`)
- ✅ Migration para remover coluna `platform_fee_percent` da tabela `doctors`

## 🗂️ Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/routes/admin/AdminDoctorsManagement.tsx` | Removido campos e modais de taxa individual |
| `src/routes/admin/AdminSettings.tsx` | Mantido (única fonte de taxa agora) |
| `src/routes/doctor/DoctorFinancial.tsx` | Atualizado para usar taxa global |
| `src/routes/doctor/DoctorSettings.tsx` | Atualizado para exibir taxa global |
| `src/services/doctorPortalService.ts` | Removido `platformFeePercent` de `approveDoctor()`, atualizado `getPendingPayouts()` |
| `src/lib/scheduling.ts` | Atualizado `bookConsultation()` para usar taxa global |
| `src/types/doctorPortal.ts` | Campo `platform_fee_percent` pode ser removido futuramente |
| `supabase-migrations/unify_commission_rate.sql` | **NOVO** - Migration para remover coluna do banco |

## 📊 Como Funciona Agora

### Antes:
```
Admin > Médicos > Médico X > Taxa: 12% ✅
Admin > Configurações > Taxa padrão: 25% ✅
```
**Problema:** Duas fontes de verdade conflitantes

### Depois:
```
Admin > Configurações > Taxa de comissão padrão: 25% ✅ (única fonte)
Admin > Médicos > Médico X > (sem campo de taxa)
```
**Solução:** Uma única fonte de verdade

## 🚀 Próximos Passos

### Obrigatório:
1. **Executar migration SQL** no Supabase:
   ```bash
   # Acessar SQL Editor do Supabase
   # Copiar conteúdo de: supabase-migrations/unify_commission_rate.sql
   # Executar e verificar sucesso
   ```

2. **Atualizar tipo TypeScript** (`src/types/doctorPortal.ts`):
   ```typescript
   export interface Doctor {
     // ... outros campos
     // platform_fee_percent: number; ← REMOVER esta linha
     // ...
   }
   ```

### Opcional:
- Remover referências restantes a `platform_fee_percent` no código
- Atualizar testes automatizados
- Documentar API para desenvolvedores

## ✅ Testes Recomendados

1. **Admin > Configurações:**
   - Alterar taxa de comissão padrão para 30%
   - Salvar e verificar se persiste

2. **Admin > Médicos:**
   - Verificar que coluna "Taxa" não aparece mais na tabela
   - Verificar que botão de editar taxa não existe mais
   - Aprovar um médico pendente e verificar que não pede taxa
   - Verificar aviso informativo sobre taxa global

3. **Agendamento:**
   - Criar uma nova consulta
   - Verificar que taxa aplicada é a global (das Configurações)

4. **Financeiro do Médico:**
   - Acessar financeiro de um médico
   - Verificar que taxa exibida é a global

5. **Financeiro Admin:**
   - Verificar repasses pendentes
   - Confirmar que taxa usada é a global

## ⚠️ Pontos de Atenção

1. **Dados Históricos:**
   - Consultas já criadas mantêm a taxa que foi aplicada no momento do agendamento
   - Repasses pendentes usarão a taxa global atual

2. **Backward Compatibility:**
   - O campo `platform_fee_percent` ainda existe no banco até a migration ser executada
   - O código agora ignora esse campo e usa apenas a taxa global

3. **Performance:**
   - Adicionada query extra para buscar taxa global (mínimo impacto)
   - Considerar cache da taxa global em memória se necessário

## 📝 Notas

- A taxa global é armazenada em `platform_settings` com key `default_platform_fee`
- Valor padrão: 25% (configurável em Admin > Configurações)
- Todos os novos agendamentos usarão automaticamente a taxa global
- Repasses (payouts) calculados com base na taxa global atual
