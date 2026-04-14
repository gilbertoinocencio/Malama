import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supportService, type CreateTicketInput } from '../../services/supportService';
import toast from 'react-hot-toast';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'nutricao', label: '🥗 Nutrição e Dieta', desc: 'Dúvidas sobre macros, refeições, metas' },
  { value: 'glp1', label: '💊 Programa GLP-1', desc: 'Medicação, doses, efeitos colaterais' },
  { value: 'financeiro', label: '💳 Financeiro', desc: 'Planos, pagamentos, assinaturas' },
  { value: 'tecnico', label: '⚙️ Técnico', desc: 'Bugs, erros, funcionalidades' },
  { value: 'conta', label: '👤 Conta', desc: 'E-mail, senha, dados pessoais' },
  { value: 'sugestao', label: '💡 Sugestão', desc: 'Ideias de melhorias' },
  { value: 'outro', label: '📌 Outro', desc: 'Assunto diferente dos anteriores' },
] as const;

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [step, setStep] = useState<'category' | 'form' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep('category');
    setSelectedCategory('');
    setSubject('');
    setDescription('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Você precisa estar logado para enviar um ticket');
      return;
    }

    if (!subject.trim()) {
      toast.error('Por favor, informe um assunto');
      return;
    }

    if (!description.trim() || description.trim().length < 20) {
      toast.error('Por favor, descreva seu problema com pelo menos 20 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      const input: CreateTicketInput = {
        category: selectedCategory as CreateTicketInput['category'],
        subject: subject.trim(),
        description: description.trim(),
      };

      await supportService.createTicket(user.id, input);

      setStep('success');
      toast.success('Ticket enviado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast.error('Erro ao enviar ticket. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-nura-border dark:border-white/10">
              <h3 className="text-lg font-bold text-nura-main dark:text-white">
                {step === 'category' && 'Como podemos ajudar?'}
                {step === 'form' && 'Detalhe seu problema'}
                {step === 'success' && 'Ticket enviado!'}
              </h3>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-nura-bg dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-nura-muted dark:text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Step 1: Category Selection */}
              {step === 'category' && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-nura-muted dark:text-slate-400 mb-2">
                    Selecione a categoria do seu problema para agilizar o atendimento:
                  </p>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => handleCategorySelect(cat.value)}
                      className="p-4 bg-nura-bg dark:bg-slate-800 rounded-xl border border-nura-border dark:border-white/10 text-left hover:border-nura-petrol dark:hover:border-primary hover:bg-nura-petrol/5 dark:hover:bg-primary/5 transition-all"
                    >
                      <p className="text-sm font-semibold text-nura-main dark:text-white">{cat.label}</p>
                      <p className="text-xs text-nura-muted dark:text-slate-400 mt-0.5">{cat.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Form */}
              {step === 'form' && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Category badge */}
                  <div className="flex items-center gap-2 p-3 bg-nura-bg dark:bg-slate-800 rounded-xl">
                    <span className="text-sm font-medium text-nura-main dark:text-white">
                      {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('category')}
                      className="text-xs text-nura-petrol dark:text-primary hover:underline"
                    >
                      Alterar
                    </button>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-nura-main dark:text-white mb-1.5">
                      Assunto *
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Resumo do problema (ex: Erro ao registrar refeição)"
                      className="w-full px-4 py-3 bg-nura-bg dark:bg-slate-800 border border-nura-border dark:border-white/10 rounded-xl text-sm text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-slate-500 focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary focus:border-transparent outline-none"
                      maxLength={100}
                      disabled={submitting}
                    />
                    <p className="text-[10px] text-nura-muted dark:text-slate-500 mt-1">
                      {subject.length}/100 caracteres
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-nura-main dark:text-white mb-1.5">
                      Descrição *
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Descreva detalhadamente seu problema ou dúvida. Quanto mais informações, mais rápido poderemos ajudar."
                      className="w-full px-4 py-3 bg-nura-bg dark:bg-slate-800 border border-nura-border dark:border-white/10 rounded-xl text-sm text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-slate-500 focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary focus:border-transparent outline-none resize-none"
                      rows={5}
                      minLength={20}
                      disabled={submitting}
                    />
                    <p className={`text-[10px] mt-1 ${description.length >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-nura-muted dark:text-slate-500'
                      }`}>
                      {description.length}/20 caracteres mínimos
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-3 rounded-xl border border-nura-border dark:border-white/10 text-nura-muted dark:text-slate-400 text-sm font-semibold hover:bg-nura-bg dark:hover:bg-slate-800 transition-colors"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !subject.trim() || description.trim().length < 20}
                      className="flex-1 py-3 rounded-xl bg-nura-main dark:bg-white text-white dark:text-nura-main text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar Ticket
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Success */}
              {step === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-base font-bold text-nura-main dark:text-white mb-2">
                    Ticket enviado com sucesso!
                  </h4>
                  <p className="text-sm text-nura-muted dark:text-slate-400 mb-6">
                    Nossa equipe irá analisar e responder em até 24 horas. Você receberá uma notificação quando houver uma resposta.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 bg-nura-main dark:bg-white text-white dark:text-nura-main text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContactSupportModal;
