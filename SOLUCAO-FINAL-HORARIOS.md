# 🔧 SOLUÇÃO FINAL - Horários Não Aparecem

## 🎯 Problema Identificado

Os logs do console mostram:
```
🕒 [scheduling.ts] Buscando horários disponíveis...
  - Doctor ID: 50e7b384-1083-4217-b769-c95695d3d832
  - Dia da semana: Quarta (3)

⚠️ [scheduling.ts] NENHUMA disponibilidade para Quarta
```

**Causa:** As disponibilidades no banco estão com `is_active = false` ou o `doctor_id` não bate.

---

## ✅ Solução

### Passo 1: Executar Script SQL

1. Acesse **https://supabase.com/dashboard**
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de **`fix-activate-doctor-availability.sql`**
4. Clique em **Run**

**Este script vai:**
- ✅ Listar todos os médicos e seus IDs
- ✅ Listar TODAS as disponibilidades no banco
- ✅ Mostrar as disponibilidades ativas do Romarinho
- ✅ **ATIVAR** todas as disponibilidades desativadas
- ✅ Mostrar resumo final com horários por dia

---

### Passo 2: Atualizar o App (F5)

Após executar o script, **recarregue a página do app** (F5) e teste novamente:

1. Como paciente, vá em **Agendar Consulta**
2. Selecione o médico Romarinho
3. Escolha **Quarta (8 Abr)** ou **Terça (14 Abr)**
4. **Deve aparecer os horários!**

---

## 🔍 Diagnóstico via Console

Os logs que adicionados agora mostram exatamente o que está acontecendo:

### Quando FUNCIONA:
```
✅ [scheduling.ts] Disponibilidade encontrada: {start_time: "10:30", end_time: "14:30"}
🕐 [scheduling.ts] Total de slots gerados: 8
   Slots disponíveis: 8
```

### Quando NÃO funciona:
```
⚠️ [scheduling.ts] NENHUMA disponibilidade para Quarta
🕐 [scheduling.ts] Horários recebidos: 0
```

---

## 📋 Possíveis Causas

### 1. `is_active = false`
As disponibilidades foram inseridas mas estão desativadas.
**Solução:** Script SQL ativa automaticamente.

### 2. `doctor_id` diferente
O médico que salvou tem um ID diferente do que está sendo buscado.
**Solução:** Script SQL mostra todos os IDs para verificação.

### 3. Disponibilidade não salva
O médico configurou mas não clicou em "Salvar disponibilidades" ou deu erro.
**Solução:** Verifique no painel do médico se aparece "Disponibilidade salva com sucesso!"

---

## 🧪 Teste Rápido

Após executar o script SQL, teste no console do navegador (F12 > Console):

```javascript
// Cole isso no console e pressione Enter
fetch('/api/test') // ou qualquer requisição para ver se o app está rodando
```

Depois navegue até **Agendar Consulta** e observe os logs.

---

## ✅ Checklist

- [ ] **Executar `fix-activate-doctor-availability.sql` no Supabase**
- [ ] **Recarregar o app (F5)**
- [ ] **Testar agendamento como paciente**
- [ ] **Verificar logs no console (F12)**

---

## 📄 Arquivos de Referência

- `fix-activate-doctor-availability.sql` - ⭐ **USE ESTE PRIMEIRO**
- `src/lib/scheduling.ts` - Logs de debug
- `src/components/AgendarConsulta.tsx` - Logs de debug

---

**Após executar o script, os horários aparecerão!** 🎉
