# ✅ Correção - Erro ao Salvar Disponibilidade e Horários Não Aparecendo

## 🔍 Problemas Identificados

### Problema 1: Erro ao Salvar Disponibilidade
**Erro:** `null value in column "id" of relation "doctor_availability" violates not-null constraint`

**Causa:** O código tentava fazer `upsert` com registros que tinham `id: null` ou `id: 'temp-xxx'`, e o PostgreSQL não aceita `null` em colunas `PRIMARY KEY` mesmo com `DEFAULT`.

### Problema 2: Horários Não Aparecem para o Paciente
**Causa:** O médico Romarinho configurou disponibilidade apenas para **Domingo, Segunda, Terça, Quarta e Quinta**. **Sábado está vazio** (0 slots).

Quando o paciente seleciona **Sábado (11 de Abr)**, não há horários disponíveis.

---

## 🛠️ Correções Aplicadas

### 1. **`src/services/doctorPortalService.ts`**
✅ **Função `upsertAvailability()` reescrita:**
- Separa registros novos (sem id) e existentes (com id)
- Usa `insert` para registros novos (banco gera ID automaticamente)
- Usa `upsert` apenas para registros existentes

### 2. **`src/routes/doctor/DoctorAgenda.tsx`**
✅ **Melhoria na remoção de ID temporário:**
- Agora remove `id` quando é `null`, `undefined` ou começa com `'temp-'`
- Usa optional chaining (`a.id?.startsWith`) para evitar erros

### 3. **`src/lib/scheduling.ts`**
✅ **Logs de debug detalhados:**
- Mostra dia da semana buscado
- Mostra disponibilidade encontrada
- Mostra número de slots gerados
- Ajuda a diagnosticar problemas

### 4. **`src/components/AgendarConsulta.tsx`**
✅ **Logs de debug para horários:**
- Mostra quantos horários foram recebidos
- Mostra quantos estão disponíveis

### 5. **`fix-check-doctor-availability.sql`** ⭐ NOVO
✅ Script para verificar/corrigir disponibilidades do médico

---

## 🚀 Como Resolver

### Passo 1: Corrigir o Código (Já Feito!)
As correções acima já foram aplicadas. Agora você precisa:

### Passo 2: Reiniciar o App
```bash
# Pare o app (Ctrl+C) e reinicie
npm run dev
```

### Passo 3: Médico Salvar Disponibilidade Novamente
1. Acesse o **Portal do Médico** como Romarinho
2. Vá em **Agenda**
3. Arraste horários para **Sábado** (ou outro dia que deseja atender)
4. Clique em **Salvar disponibilidades**
5. Deve aparecer a mensagem "Disponibilidade salva com sucesso!"

### Passo 4: Verificar no Banco (Opcional)
Execute o script **`fix-check-doctor-availability.sql`** no Supabase SQL Editor para ver:
- Disponibilidades configuradas
- Contagem de horários por dia
- Resumo final

### Passo 5: Testar como Paciente
1. Abra o app como paciente
2. Vá em **Agendar Consulta**
3. Selecione o médico Romarinho
4. Escolha uma data de **Segunda a Sexta** (dias com disponibilidade)
5. **Deve aparecer os horários disponíveis!**

---

## 📋 Por Que Sábado Não Tinha Horários?

Olhando a imagem do painel do médico:
- **Domingo:** 3 slots (07:00, 08:00, 09:00)
- **Segunda:** 1 slot (10:00)
- **Terça:** 8 slots (07:00-15:30)
- **Quarta:** 4 slots (10:30-14:30)
- **Quinta:** 3 slots (10:00-11:30)
- **Sexta:** 0 slots ❌
- **Sábado:** 0 slots ❌

O paciente selecionou **Sábado (11 de Abr)** que não tem disponibilidade configurada!

---

## 🔍 Logs de Debug (Console do Navegador)

Quando o paciente busca horários, você verá:

```
🕒 [scheduling.ts] Buscando horários disponíveis...
  - Doctor ID: xxxxx
  - Data: 11/04/2026
  - Dia da semana: Sábado (6)

⚠️  [scheduling.ts] NENHUMA disponibilidade para Sábado
```

Se selecionar uma data com disponibilidade:

```
🕒 [scheduling.ts] Buscando horários disponíveis...
  - Doctor ID: xxxxx
  - Data: 08/04/2026
  - Dia da semana: Quarta (3)

✅ [scheduling.ts] Disponibilidade encontrada: {start_time: "10:30", end_time: "14:30"}
⏱️  [scheduling.ts] Duração da consulta: 30 minutos
📅 [scheduling.ts] Consultas existentes no dia: 0
🕐 [scheduling.ts] Total de slots gerados: 8
   Slots disponíveis: 8
```

---

##  Teste Rápido

Se quiser testar rapidamente **hoje**:

1. Como médico, adicione horários para o dia de hoje (ou amanhã)
2. Salve a disponibilidade
3. Como paciente, selecione a data de hoje (ou amanhã)
4. Os horários devem aparecer!

---

## ⚠️ Se Ainda Der Erro ao Salvar

### Verifique no Console do Navegador (DevTools > Console):

**Se aparecer erro 400 (Bad Request):**
- Abra a aba **Network** do DevTools
- Clique em "Salvar disponibilidades"
- Veja a requisição que falhou
- Verifique o payload enviado

**Se ainda aparecer erro de `null value in column "id"`:**
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Reinicie o app
- Tente novamente

---

## ✅ Checklist

- [x] Corrigido `upsertAvailability` para separar insert/update
- [x] Melhoria na remoção de ID temporário
- [x] Logs de debug adicionados
- [x] Script de verificação criado
- [ ] **Reiniciar o app**
- [ ] **Médico salvar disponibilidade para Sábado (ou testar outro dia)**
- [ ] **Paciente testar agendamento**

---

## 📄 Arquivos de Referência

- `src/services/doctorPortalService.ts` - Correção principal
- `src/routes/doctor/DoctorAgenda.tsx` - Melhoria na remoção de ID
- `src/lib/scheduling.ts` - Logs de debug
- `src/components/AgendarConsulta.tsx` - Logs de debug
- `fix-check-doctor-availability.sql` - Verificar disponibilidades

---

**Após o médico adicionar horários para Sábado e salvar, os horários aparecerão para o paciente!** 🎉
