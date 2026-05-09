import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const STEPS = [
  {
    title: 'Sua missão do dia',
    body: 'Não é uma lista de tarefas. É uma frase gerada pelo seu histórico real — o app identifica padrões e te dá um contexto específico para hoje.',
    hint: 'A missão muda conforme seu comportamento ao longo dos dias.',
    icon: '◎',
  },
  {
    title: 'Reserva metabólica',
    body: 'Cada dia em que você bate seus macros principais gera um crédito de reserva. Se tiver um dia ruim, a reserva absorve — sua sequência não quebra por uma escorregada.',
    hint: 'Dias bons constroem margem para os dias que não saem como planejado.',
    icon: '○○○',
  },
  {
    title: 'Janela alimentar',
    body: 'A barra mostra quanto da sua janela alimentar já passou — baseada no horário que você configurou no início. Comer dentro dela ativa o multiplicador de pontos do dia.',
    hint: 'O multiplicador ×1.2 só funciona se você comer dentro da sua janela.',
    icon: '▱',
  },
]

export function EngagementOnboardingSheet({ open, onClose }: Props) {
  const [step, setStep] = useState(0)

  function handleClose() {
    setStep(0)
    onClose()
  }

  function handleNext() {
    if (step === STEPS.length - 1) {
      handleClose()
    } else {
      setStep(s => s + 1)
    }
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — não bloqueia o card acima, só suaviza o fundo */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto"
          >
            <div className="bg-[#faf8f5] rounded-t-3xl px-6 pt-5 pb-8 shadow-2xl">

              {/* Handle + fechar */}
              <div className="relative flex items-center justify-between mb-6">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-10 h-[3px] bg-[#ede9e2] rounded-full" />
                <div />
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-[#f5f2ee] flex items-center justify-center mt-3"
                >
                  <X size={14} color="#8a8078" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex gap-1.5 mb-6">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                      i === step
                        ? 'bg-[#7d3d3d]'
                        : i < step
                        ? 'bg-[#f2c4bc]'
                        : 'bg-[#ede9e2]'
                    }`}
                  />
                ))}
              </div>

              {/* Ícone */}
              <div className="w-10 h-10 rounded-xl bg-[#fce8e4] flex items-center justify-center mb-4">
                <span className="text-[#7d3d3d] text-sm font-medium">{current.icon}</span>
              </div>

              {/* Conteúdo */}
              <h3 className="text-[18px] font-medium text-[#1a1a18] mb-2 leading-snug">
                {current.title}
              </h3>
              <p className="text-[13px] font-light text-[#4a4540] leading-relaxed mb-4">
                {current.body}
              </p>

              {/* Hint */}
              <div className="bg-[#f5f2ee] rounded-xl px-4 py-3 mb-6 border border-[#ede9e2]">
                <p className="text-[11px] font-light text-[#8a8078] leading-relaxed">
                  {current.hint}
                </p>
              </div>

              {/* Avançar */}
              <button
                onClick={handleNext}
                className="w-full bg-[#7d3d3d] text-white rounded-xl py-3.5 flex items-center justify-center gap-2 text-[13px] font-medium"
              >
                {isLast ? 'Entendido' : 'Próximo'}
                {!isLast && <ChevronRight size={15} />}
              </button>

              {/* Pular — só nos primeiros steps */}
              {!isLast && (
                <button
                  onClick={handleClose}
                  className="w-full text-center text-[11px] text-[#8a8078] mt-3 py-1"
                >
                  Pular explicação
                </button>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
