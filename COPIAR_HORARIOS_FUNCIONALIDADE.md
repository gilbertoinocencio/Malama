# 📋 Copiar Horários entre Dias da Semana

## Resumo
Nova funcionalidade que permite ao médico copiar rapidamente os horários de disponibilidade de um dia da semana para outros dias selecionados, otimizando significativamente o fluxo de configuração da agenda.

## 🎯 Problema Resolvido
**Antes:** O médico precisava arrastar individualmente cada horário para cada dia da semana, um por um.
**Agora:** Com um clique, pode copiar todos os horários de um dia para vários outros dias de uma vez.

## ✨ Funcionalidades Implementadas

### 1. **Botão de Copiar em Cada Dia**
- 📍 **Localização:** Canto superior direito de cada coluna de dia
- 👁️ **Visibilidade:** Aparece ao passar o mouse (hover)
- 🔒 **Estado:** Desabilitado se o dia não tem horários configurados
- 🎨 **Design:** Ícone de cópia verde com tooltip explicativo

### 2. **Modal Inteligente de Cópia**

#### Preview dos Horários
- Mostra todos os horários que serão copiados
- Exibe a quantidade total de slots
- Visualização clara antes de confirmar

#### Botões de Seleção Rápida
1. **Dias Úteis (Seg-Sex)** - Seleciona automaticamente segunda a sexta
2. **Fim de Semana** - Seleciona sábado e domingo
3. **Todos os Dias** - Seleciona todos os 7 dias da semana

#### Seleção Individual
- Checkboxes para cada dia da semana
- Mostra quantidade de slots já existentes em cada dia
- Dia de origem é ocultado da lista (não pode copiar para si mesmo)
- Visual destacado para dias selecionados (borda verde)

#### Validações
- ✅ Impede cópia se dia de origem não tem horários
- ✅ Impede cópia se nenhum dia de destino selecionado
- ✅ Evita duplicatas silenciosamente (horários já existentes não são copiados)
- ✅ Feedback claro ao usuário via toast notifications

### 3. **Feedback e UX**

#### Toast Notifications
- **Sucesso:** "X horário(s) copiado(s) com sucesso!"
- **Info:** "Todos os horários já existem nos dias selecionados"
- **Erro:** "Não há horários para copiar neste dia"
- **Erro:** "Selecione pelo menos um dia de destino"

#### Interações
- Clique fora do modal fecha automaticamente
- Botão de fechar (X) no canto superior
- Botão "Cancelar" para voltar sem aplicar
- Animações suaves de hover e transição

## 📊 Exemplo de Uso

### Cenário: Médica com horário fixo
1. Configura **segunda-feira** com: 08:00, 09:00, 10:00, 14:00, 15:00
2. Passa o mouse sobre segunda-feira → botão de copiar aparece
3. Clica no botão de copiar
4. Modal abre mostrando os 5 horários
5. Clica em "Dias Úteis (Seg-Sex)"
6. Clica em "Copiar para 4 dias"
7. ✅ Terça, quarta, quinta e sexta agora têm os mesmos 5 horários!

### Cenário: Médico com horários diferentes
1. Configura **terça-feira** com horários específicos da manhã
2. Clica em copiar
3. Seleciona apenas **quinta-feira** e **sábado**
4. Clica em "Copiar para 2 dias"
5. ✅ Apenas quinta e sábado recebem os horários

## 🔧 Detalhes Técnicos

### Arquivo Modificado
- `src/routes/doctor/DoctorAgenda.tsx`

### Novos Imports
```typescript
import { Copy, ChevronRight } from 'lucide-react';
```

### Novos Estados
```typescript
const [showCopyModal, setShowCopyModal] = useState<number | null>(null);
const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);
```

### Novas Funções
- `handleCopySchedule(sourceDay, targetDays)` - Lógica principal de cópia
- `selectAllWeekdays()` - Seleciona Seg-Sex rapidamente
- `selectWeekend()` - Seleciona Sáb-Dom rapidamente
- `selectAllDays()` - Seleciona todos os dias

### Lógica de Cópia
```typescript
// Para cada dia de destino:
// 1. Verifica se não é o dia de origem
// 2. Para cada horário do dia de origem:
//    - Verifica se já existe no dia de destino (evita duplicatas)
//    - Cria novo slot com mesmo start_time e end_time
// 3. Reordena cronologicamente
// 4. Atualiza estado
```

## 🎨 Design System

### Cores
- **Botão de copiar:** `bg-[#2ECC71]` (verde Nura)
- **Hover:** `hover:bg-[#27ae60]`
- **Desabilitado:** `opacity-30`
- **Selecionado:** `border-[#2ECC71] bg-[#2ECC71]/5`

### Tipografia
- **Horários preview:** `text-sm font-semibold`
- **Labels:** `text-sm font-medium`
- **Quantidade:** `text-xs text-gray-500`

### Espaçamento
- **Grid de dias:** `grid-cols-2 gap-3`
- **Modal:** `max-w-lg p-6`
- **Botões:** `px-6 py-3`

##  Benefícios

### Produtividade
- ⏱️ **Economia de tempo:** Configura 5 dias em segundos vs minutos
- 🖱️ **Menos cliques:** 1 clique vs 10+ cliques (arrastar cada horário)
- 📈 **Escalabilidade:** Funciona bem mesmo com muitos horários

### Experiência do Usuário
- ✨ **Intuitivo:** Botão aparece no hover, sem poluição visual
- 🎯 **Preciso:** Seleção clara dos dias de destino
- 🔍 **Transparente:** Preview antes de confirmar
- 🛡️ **Seguro:** Validações evitam erros e duplicatas

### Flexibilidade
- 📋 **Seleção múltipla:** Pode copiar para 1, 2 ou todos os dias
- 🎛️ **Atalhos:** Botões rápidos para padrões comuns
- 🔄 **Reutilizável:** Pode copiar várias vezes, de dias diferentes

## 📱 Responsividade
- Modal com `max-h-[90vh]` e scroll interno
- Grid adaptativo de 2 colunas para dias
- Botões empilhados em mobile
- Touch targets adequados (mínimo 44px)

## 🧪 Testes Recomendados
1. Copiar de dia vazio → deve mostrar erro
2. Copiar sem selecionar destino → deve mostrar erro
3. Copiar para dia que já tem mesmos horários → não duplicar
4. Copiar para dia com horários diferentes → mesclar sem duplicatas
5. Copiar usando botão "Dias Úteis" → selecionar Seg-Sex
6. Copiar usando botão "Fim de Semana" → selecionar Sáb-Dom
7. Salvar após copiar → horários persistem no backend

## 📅 Data de Implementação
7 de abril de 2026

## ✅ Status
- [x] Implementação completa
- [x] Build passando
- [x] Toast notifications
- [x] Validações
- [x] Preview de horários
- [x] Botões de seleção rápida
- [x] Design responsivo
- [ ] Testes em produção

## 💡 Sugestões Futuras
1. **Copiar horários inverso:** Selecionar dias e aplicar horários de outro dia
2. **Template de agenda:** Salvar configurações como templates reutilizáveis
3. **Copiar de múltiplos dias:** Selecionar vários dias como origem e consolidar
4. **Agendamento recorrente:** Configurar semanas alternadas (ex:Seg/Qua/Sex)
5. **Bloquear datas:** Marcar dias específicos como indisponíveis (feriados)
