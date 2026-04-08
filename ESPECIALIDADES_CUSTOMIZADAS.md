#  Especialidades Customizadas para Médicos

## Resumo
O admin agora pode definir especialidades personalizadas ao aprovar médicos, eliminando a dependência da opção genérica "Outro".

## 🎯 Problema Resolvido
**Antes:** Quando um médico se cadastrava com uma especialidade não listada (ex: Cardiologista, Dermatologista), ele selecionava "Outro" e não havia como especificar qual era a especialidade real.

**Agora:** O admin pode:
1. Ver a especialidade declarada pelo médico
2. Selecionar uma especialidade da lista OU escolher "Outro"
3. Se escolher "Outro", digitar a especialidade específica
4. A especialidade customizada é salva no perfil do médico

## ✨ Funcionalidades Implementadas

### 1. **Novo Campo no Tipo Doctor**
```typescript
export interface Doctor {
  // ... campos existentes
  specialty: DoctorSpecialty | string;
  specialty_custom?: string | null; // NOVO! Especialidade personalizada
  // ...
}
```

### 2. **Modal de Aprovação Atualizado**

#### Informações do Médico
- Mostra "Especialidade declarada" (o que o médico colocou no cadastro)
- Se houver `specialty_custom`, mostra também

#### Dropdown de Especialidade
- Opção "Manter especialidade declarada" (padrão)
- Todas as especialidades da lista (Endocrinologista, Nutrólogo, etc.)
- Opção "Outro" para especialidades não listadas

#### Campo de Especialidade Customizada
- **Aparece apenas** quando "Outro" é selecionado
- Campo de texto livre para digitar a especialidade
- Placeholder: "Ex: Cardiologista, Dermatologista, etc."
- Background azul para destacar que é um campo condicional

### 3. **Migration SQL**
- **Arquivo:** `supabase-migrations/add_specialty_custom_to_doctors.sql`
- Adiciona coluna `specialty_custom VARCHAR(255) NULL`
- Comentário de documentação incluído

## 📊 Fluxo de Uso

### Cenário 1: Médico com especialidade padrão
1. Médico cadastra-se como "Endocrinologista"
2. Admin abre modal de aprovação
3. Vê "Especialidade declarada: Endocrinologista"
4. Seleciona "Manter especialidade declarada"
5. Aprova normalmente

### Cenário 2: Médico com especialidade da lista, mas quer corrigir
1. Médico cadastra-se como "Outro" (por engano)
2. Admin abre modal de aprovação
3. Vê "Especialidade declarada: Outro"
4. Seleciona "Nutrólogo" no dropdown
5. Aprova → Médico agora tem especialidade correta

### Cenário 3: Médico com especialidade não listada
1. Médico cadastra-se como "Cardiologista" (cai em "Outro")
2. Admin abre modal de aprovação
3. Vê "Especialidade declarada: Outro"
4. Seleciona "Outro" no dropdown
5. Campo de texto aparece
6. Digita "Cardiologista"
7. Aprova → Médico tem `specialty = 'Outro'` e `specialty_custom = 'Cardiologista'`

## 🔧 Detalhes Técnicos

### Arquivos Modificados

#### 1. **TypeScript Types**
- **Arquivo:** `src/types/doctorPortal.ts`
- **Alteração:** Adicionado campo `specialty_custom?: string | null` na interface `Doctor`

#### 2. **Admin Doctors Management**
- **Arquivo:** `src/routes/admin/AdminDoctorsManagement.tsx`
- **Novos estados:**
  ```typescript
  const [approveSpecialty, setApproveSpecialty] = useState('');
  const [approveSpecialtyCustom, setApproveSpecialtyCustom] = useState('');
  ```
- **Handler atualizado:** `handleApprove` agora salva especialidade e especialidade customizada
- **Modal atualizado:** Dropdown + campo condicional para especialidade customizada

#### 3. **Migration SQL**
- **Arquivo:** `supabase-migrations/add_specialty_custom_to_doctors.sql`
- **Coluna:** `specialty_custom VARCHAR(255) NULL`

### Lógica de Salvamento
```typescript
const updates: any = { platform_fee_percent: approveFee };

// Se mudou a especialidade, atualizar
if (approveSpecialty) {
  updates.specialty = approveSpecialty;
  // Se selecionou "Outro" e preencheu custom, salvar
  if (approveSpecialty === 'Outro' && approveSpecialtyCustom.trim()) {
    updates.specialty_custom = approveSpecialtyCustom.trim();
  }
}

await doctorService.updateDoctor(showApproveModal, updates);
await doctorService.approveDoctor(showApproveModal, approveFee);
```

## 🎨 Design

### Campo Condicional
```tsx
{approveSpecialty === 'Outro' && (
  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <label>Especificar especialidade</label>
    <input 
      placeholder="Ex: Cardiologista, Dermatologista, etc."
    />
    <p className="text-xs text-gray-500">
      Esta especialidade será adicionada ao perfil do médico
    </p>
  </div>
)}
```

### Cores
- **Campo condicional:** `bg-blue-50 border-blue-200`
- **Placeholder:** Cinza padrão
- **Texto auxiliar:** `text-xs text-gray-500`

## 📋 Próximos Passos

### Obrigatório
1. ✅ **Aplicar migration SQL** no Supabase
   ```bash
   # No Supabase Dashboard → SQL Editor
   # Executar: supabase-migrations/add_specialty_custom_to_doctors.sql
   ```

2. **Testar fluxo completo:**
   - Cadastrar médico com "Outro"
   - Aprovar com especialidade customizada
   - Verificar se salvou corretamente

### Melhorias Futuras
1. **Lista dinâmica de especialidades:**
   - Criar tabela `doctor_specialties` no banco
   - Admin pode adicionar/remover especialidades da lista
   - Dropdown populated do banco

2. **Edição de especialidade pós-aprovação:**
   - Modal de "Editar Taxa" → adicionar campo de especialidade
   - Permitir corrigir especialidade de médicos já aprovados

3. **Filtro por especialidade customizada:**
   - Na lista de médicos, filtrar também por `specialty_custom`
   - Busca case-insensitive

## ✅ Status
- [x] Tipo TypeScript atualizado
- [x] Modal de aprovação com campos
- [x] Handler de aprovação atualizado
- [x] Migration SQL criada
- [x] Build passando
- [ ] Migration aplicada no Supabase
- [ ] Testes em produção

## 💡 Notas Importantes

### Backward Compatibility
- Campo `specialty_custom` é **opcional** (NULL)
- Médicos existentes não são afetados
- Especialidades padrão continuam funcionando normalmente

### Validações
- Campo custom só aparece se "Outro" for selecionado
- Campo é **trim()** antes de salvar (remove espaços extras)
- Se campo custom estiver vazio, não salva nada

### Exibição
- Na tabela de médicos: mostra `specialty` (se "Outro", pode mostrar `specialty_custom`)
- No perfil do médico: lógica similar
- Futuramente: criar helper para exibir especialidade corretamente

## 📅 Data da Implementação
8 de abril de 2026
