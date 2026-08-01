# Agente Nutricional Conversacional - NURA

## Visão Geral

O Agente Nutricional é um assistente virtual baseado em IA que conduz entrevistas estruturadas com usuários para criar planos alimentares personalizados de 3 meses.

## Funcionalidades

### 🤖 Conversação Inteligente

- **Onboarding Estruturado**: O agente faz perguntas uma por vez, em sequência lógica
- **Validação de Respostas**: Verifica e corrige inputs inválidos de forma gentil
- **Tom Empático**: Linguagem acolhedora, motivadora e não-julgadora
- **Multilíngue**: Suporte para PT, EN e ES

### 📊 Coleta de Dados

O agente coleta informações em várias categorias:

#### 1. Dados Demográficos
- Nome completo
- Data de nascimento/idade
- Sexo biológico
- Altura e peso

#### 2. Composição Corporal (Opcional)
- Massa muscular esquelética
- Massa de gordura
- Percentual de gordura
- Água corporal
- IMC
- Relação cintura-quadril

#### 3. Atividade Física
- Tipos de atividade praticados
- Frequência semanal
- Duração média
- Intensidade (leve, moderada, alta)

#### 4. Hábitos Alimentares
- Rotina alimentar atual
- Restrições (alergias, intolerâncias)
- Preferências (vegetariano, etc.)
- Histórico de dietas

#### 5. Objetivo Principal
- Emagrecimento
- Ganho de massa muscular
- Performance atlética
- Saúde metabólica

### 🎯 Plano de 3 Meses

Após completar o onboarding, o agente gera um plano dividido em 3 fases:

1. **Fase 1 - Adaptação (Semanas 1-4)**
   - Reorganização alimentar gradual
   - Ajuste de horários
   - Estabelecimento de hábitos

2. **Fase 2 - Progressão/Flow (Semanas 5-8)**
   - Intensificação das estratégias
   - Otimização de macros
   - Timing de nutrientes
   - Fase de máxima performance

3. **Fase 3 - Consolidação (Semanas 9-12)**
   - Manutenção de resultados
   - Ajustes finos
   - Autonomia alimentar

## Arquitetura

### Componentes

```
src/
├── services/
│   └── nutritionistAgentService.ts   # Lógica do agente e IA
├── components/
│   ├── NutritionistChat.tsx         # Interface de chat principal
│   ├── ChatMessage.tsx              # Componente de mensagem
│   └── QuarterlyPlan.tsx            # Integração com plano
```

### Banco de Dados

#### Tabela: `nutritionist_onboarding`

```sql
CREATE TABLE nutritionist_onboarding (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  current_stage TEXT,
  completed BOOLEAN,
  data JSONB,              -- Dados coletados
  messages JSONB,          -- Histórico de conversa
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Tabela: `quarterly_plans`

```sql
CREATE TABLE quarterly_plans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  content JSONB,           -- Plano gerado
  status TEXT,             -- 'active', 'archived', 'completed'
  onboarding_id UUID REFERENCES nutritionist_onboarding(id),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Fluxo de Estados

```
WELCOME
  ↓
NAME
  ↓
BIRTH_DATE
  ↓
BIOLOGICAL_SEX
  ↓
HEIGHT_WEIGHT
  ↓
BODY_COMPOSITION_QUESTION
  ↓
(se sim) BODY_COMPOSITION_DATA
  ↓
ACTIVITY_TYPES
  ↓
ACTIVITY_FREQUENCY
  ↓
ACTIVITY_DURATION
  ↓
ACTIVITY_INTENSITY
  ↓
FOOD_ROUTINE
  ↓
FOOD_RESTRICTIONS
  ↓
FOOD_PREFERENCES
  ↓
PREVIOUS_DIETS
  ↓
MAIN_GOAL
  ↓
COMPLETED
```

## Uso

### Acessar o Chat

1. Vá para "Plano Trimestral" no menu
2. Se não houver plano ativo, clique em "Conversar com Nutricionista"
3. O chat do agente será aberto

### Completar Onboarding

1. Responda as perguntas uma por vez
2. Seja sincero e detalhado nas respostas
3. Você pode pular perguntas opcionais (composição corporal)
4. Ao final, clique em "Gerar Plano de 3 Meses"

### Após Gerar o Plano

- O plano ficará visível na tela principal
- Você pode visualizar:
  - Meta calórica diária
  - Distribuição de macros
  - Descrição detalhada das 3 fases
- O plano é armazenado e vinculado aos dados do onboarding

## Prompts do Sistema

### Prompt Principal (nutritionistAgentService.ts)

```
Você é uma nutricionista clínica experiente, com foco em composição corporal,
saúde metabólica e alimentação baseada em evidências científicas.

REGRAS IMPORTANTES:
1. Faça APENAS UMA pergunta de cada vez
2. Aguarde a resposta antes de prosseguir
3. Seja empática, clara, educativa e motivadora
4. NUNCA julgue hábitos ou corpo
5. Valide respostas e corrija erros gentilmente
6. Use linguagem acessível (evite jargões técnicos)
7. Incentive mudanças sustentáveis
8. Respeite a realidade e cultura alimentar do usuário
9. NUNCA prescreva medicamentos
```

### Prompt de Geração de Plano (geminiService.ts)

O prompt foi melhorado para:
- Usar TODOS os dados coletados no onboarding
- Considerar restrições e preferências alimentares
- Adaptar às atividades físicas praticadas
- Gerar descrições detalhadas (200-300 palavras por fase)
- Tom motivador e empático

## Personalização

### Modificar Perguntas

Edite `nutritionistAgentService.ts`:
- Adicione novos estágios no tipo `OnboardingStage`
- Atualize a interface `OnboardingData`
- Modifique o prompt do sistema

### Ajustar Prompt de Geração

Edite `geminiService.ts` → função `generatePlanContent`:
- Adicione mais detalhes à seção de dados do usuário
- Modifique instruções para as fases
- Ajuste o formato do JSON retornado

### Customizar UI do Chat

Edite `NutritionistChat.tsx` e `ChatMessage.tsx`:
- Modifique cores e estilos
- Adicione novos elementos visuais
- Ajuste animações e transições

## Limitações Atuais

1. **Gemini 2.0 Flash**: Modelo experimental, pode ter instabilidades
2. **Validação Básica**: Validação de inputs é feita pela IA (pode melhorar)
3. **Sem Edição**: Usuário não pode editar respostas anteriores
4. **Sem Voltar**: Não há opção de voltar para pergunta anterior
5. **Único Idioma**: Conversa em um idioma por vez

## Melhorias Futuras

### Curto Prazo
- [ ] Adicionar opção de editar respostas anteriores
- [ ] Permitir navegação entre perguntas
- [ ] Validação client-side mais robusta
- [ ] Feedback visual durante validação
- [ ] Sugestões automáticas para respostas

### Médio Prazo
- [ ] Chat disponível após geração do plano (acompanhamento)
- [ ] Sistema de ajustes do plano durante os 3 meses
- [ ] Notificações de check-in (semanais/mensais)
- [ ] Integração com tracking de refeições
- [ ] Análise de aderência ao plano

### Longo Prazo
- [ ] Múltiplos planos simultâneos (ex: nutrição + treino)
- [ ] Compartilhamento com nutricionista real
- [ ] Export de plano para PDF
- [ ] Integração com wearables
- [ ] ML para prever aderência

## Troubleshooting

### Agente não responde

1. Verifique se `VITE_GEMINI_API_KEY` está configurada
2. Verifique rate limits da API do Gemini
3. Verifique console do navegador para erros

### Mensagens em loop

1. Pode ser problema no parsing do JSON retornado
2. Verifique logs no console
3. Tente resetar o onboarding

### Dados não salvam

1. Verifique se tabela `nutritionist_onboarding` existe no Supabase
2. Verifique RLS policies
3. Verifique se usuário está autenticado

### Plano não gera

1. Verifique se onboarding foi completado
2. Verifique se `quarterly_plans` table existe
3. Verifique logs do Gemini no console

## Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Consulte a documentação do Gemini AI
- Verifique o schema do Supabase

---

**Desenvolvido para NURA - Feed the Flow** 🌊

Versão: 1.0.0
Última atualização: 2026-03-14
# Documento histórico

> As referências a Gemini abaixo pertencem à implementação antiga. A agente
> atual usa exclusivamente Caramel; consulte `README.md` e `src/lib/caramelAI.ts`.
