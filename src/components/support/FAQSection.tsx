import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  // Nutrição
  {
    id: 'nutricao-1',
    category: 'nutricao',
    question: 'Como são calculadas minhas metas de macros?',
    answer: 'Suas metas de proteínas, carboidratos e gorduras são calculadas com base no seu peso, altura, idade, nível de atividade e objetivo. Se você está no programa GLP-1, as metas são ajustadas automaticamente para preservar massa muscular.',
  },
  {
    id: 'nutricao-2',
    category: 'nutricao',
    question: 'Posso ajustar minhas metas manualmente?',
    answer: 'Sim! Vá até Configurações > Metas Nutricionais. Se você tem um médico acompanhando, ele pode ter definido metas fixas que não podem ser alteradas pelo app.',
  },
  {
    id: 'nutricao-3',
    category: 'nutricao',
    question: 'Como registrar refeições por foto?',
    answer: 'Na aba Nutri, toque no botão "+" e selecione "Foto". Tire uma foto da sua refeição e nossa IA identificará os alimentos e calculará os macros automaticamente.',
  },
  {
    id: 'nutricao-4',
    category: 'nutricao',
    question: 'O app considera restrições alimentares?',
    answer: 'Sim! Durante o onboarding você pode informar alergias e preferências. A IA levará isso em conta ao sugerir refeições.',
  },

  // GLP-1
  {
    id: 'glp1-1',
    category: 'glp1',
    question: 'Como funciona o programa GLP-1?',
    answer: 'O programa GLP-1 oferece acompanhamento nutricional personalizado para quem usa medicamentos como Ozempic, Mounjaro ou similar. Inclui metas ajustadas, check-in semanal de sintomas e orientação para minimizar efeitos colaterais.',
  },
  {
    id: 'glp1-2',
    category: 'glp1',
    question: 'Como registrar minha aplicação de medicação?',
    answer: 'Na aba Início, role até o Programa GLP-1 e clique no botão "+" para registrar. Informe o local da aplicação, efeitos colaterais e como você se sentiu.',
  },
  {
    id: 'glp1-3',
    category: 'glp1',
    question: 'Posso consultar um médico pelo app?',
    answer: 'Sim! Acesse a seção "Minhas Consultas" para agendar teleconsultas com médicos parceiros, renovar receitas e receber orientação personalizada.',
  },
  {
    id: 'glp1-4',
    category: 'glp1',
    question: 'Quais são os efeitos colaterais comuns?',
    answer: 'Os efeitos mais comuns são náusea, saciedade rápida, constipação e fadiga. Faça o check-in semanal para monitorar como você se sente. Se os sintomas forem intensos, consulte seu médico.',
  },
  {
    id: 'glp1-5',
    category: 'glp1',
    question: 'Como renovar minha receita?',
    answer: 'No Programa GLP-1, clique em "Renovar" quando a receita estiver próxima do vencimento. Você será direcionado para agendar uma consulta com um médico parceiro.',
  },

  // Financeiro
  {
    id: 'financeiro-1',
    category: 'financeiro',
    question: 'Quais são os planos disponíveis?',
    answer: 'Oferecemos planos mensais e trimestrais com diferentes níveis de acesso. Acesse Configurações > Meu Plano para ver detalhes.',
  },
  {
    id: 'financeiro-2',
    category: 'financeiro',
    question: 'Como cancelar minha assinatura?',
    answer: 'Vá em Configurações > Meu Plano > Cancelar Assinatura. Você manterá o acesso até o final do período pago.',
  },
  {
    id: 'financeiro-3',
    category: 'financeiro',
    question: 'Posso mudar de plano?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. A diferença será calculada proporcionalmente.',
  },

  // Técnico
  {
    id: 'tecnico-1',
    category: 'tecnico',
    question: 'O app funciona offline?',
    answer: 'Sim! Você pode registrar refeições e dados sem internet. Eles serão sincronizados quando você se conectar novamente.',
  },
  {
    id: 'tecnico-2',
    category: 'tecnico',
    question: 'Como faço backup dos meus dados?',
    answer: 'Seus dados são salvos automaticamente na nuvem. Para exportar, vá em Configurações > Exportar Dados.',
  },
  {
    id: 'tecnico-3',
    category: 'tecnico',
    question: 'O app está lento, o que fazer?',
    answer: 'Tente: 1) Fechar e reabrir o app, 2) Limpar o cache, 3) Verificar sua conexão. Se persistir, entre em contato com o suporte.',
  },

  // Conta
  {
    id: 'conta-1',
    category: 'conta',
    question: 'Como alterar meu e-mail?',
    answer: 'Vá em Configurações > Conta > Alterar E-mail. Você receberá um e-mail de confirmação no novo endereço.',
  },
  {
    id: 'conta-2',
    category: 'conta',
    question: 'Como alterar minha senha?',
    answer: 'No seu Perfil, clique em "Alterar Senha". Digite a nova senha (mínimo 8 caracteres) e confirme.',
  },
  {
    id: 'conta-3',
    category: 'conta',
    question: 'Posso excluir minha conta?',
    answer: 'Sim, mas atenção: todos os seus dados serão permanentemente excluídos. Entre em contato com o suporte para solicitar.',
  },

  // Programa de Indicação
  {
    id: 'sugestao-1',
    category: 'sugestao',
    question: 'Como funciona o programa de indicação?',
    answer: 'Compartilhe seu link de indicação do seu Perfil. Para cada novo usuário que se cadastrar, você ganha uma comissão. Acompanhe seus ganhos no card de influenciador.',
  },
  {
    id: 'sugestao-2',
    category: 'sugestao',
    question: 'Quando recebo a comissão?',
    answer: 'As comissões são processadas mensalmente e podem ser sacadas via Pix quando atingirem o valor mínimo.',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  nutricao: '🥗 Nutrição',
  glp1: '💊 GLP-1',
  financeiro: '💳 Financeiro',
  tecnico: '⚙️ Técnico',
  conta: '👤 Conta',
  sugestao: '💡 Programa de Indicação',
};

interface FAQProps {
  onContactSupport: () => void;
}

export const FAQSection: React.FC<FAQProps> = ({ onContactSupport }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFAQs = selectedCategory === 'all'
    ? FAQ_DATA
    : FAQ_DATA.filter(f => f.category === selectedCategory);

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-Malama-petrol/10 to-emerald-50 dark:from-primary/20 dark:to-emerald-900/10 rounded-2xl p-5 border border-Malama-petrol/20 dark:border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">❓</span>
          <h3 className="text-lg font-bold text-Malama-main dark:text-white">Perguntas Frequentes</h3>
        </div>
        <p className="text-sm text-Malama-muted dark:text-slate-400">
          Encontre respostas rápidas antes de entrar em contato com o suporte
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === 'all'
            ? 'bg-Malama-main dark:bg-white text-white dark:text-Malama-main'
            : 'bg-Malama-bg dark:bg-slate-700 text-Malama-muted dark:text-slate-400 hover:bg-Malama-petrol/10 dark:hover:bg-primary/10'
            }`}
        >
          Todas
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === key
              ? 'bg-Malama-main dark:bg-white text-white dark:text-Malama-main'
              : 'bg-Malama-bg dark:bg-slate-700 text-Malama-muted dark:text-slate-400 hover:bg-Malama-petrol/10 dark:hover:bg-primary/10'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <div className="flex flex-col gap-3">
        {Object.entries(groupedFAQs).map(([category, faqs]) => (
          <div key={category} className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-Malama-main dark:text-white flex items-center gap-2">
              <span>{CATEGORY_LABELS[category]}</span>
            </h4>
            {faqs.map(faq => (
              <div
                key={faq.id}
                className="bg-white dark:bg-surface-dark rounded-xl border border-Malama-border dark:border-transparent overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-Malama-bg dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-medium text-Malama-main dark:text-white pr-4">{faq.question}</span>
                  {expandedId === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-Malama-muted dark:text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-Malama-muted dark:text-slate-400 flex-shrink-0" />
                  )}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedId === faq.id ? 'max-h-96' : 'max-h-0'
                  }`}>
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-Malama-muted dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Contact Support CTA */}
      <div className="bg-Malama-bg dark:bg-slate-800 rounded-2xl p-5 text-center">
        <MessageCircle className="w-10 h-10 text-Malama-petrol dark:text-primary mx-auto mb-2" />
        <p className="text-sm font-semibold text-Malama-main dark:text-white mb-1">
          Não encontrou o que procurava?
        </p>
        <p className="text-xs text-Malama-muted dark:text-slate-400 mb-3">
          Nossa equipe está pronta para ajudar!
        </p>
        <button
          onClick={onContactSupport}
          className="px-6 py-2.5 bg-Malama-main dark:bg-white text-white dark:text-Malama-main text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          Entrar em contato com o suporte
        </button>
      </div>
    </div>
  );
};

export default FAQSection;
