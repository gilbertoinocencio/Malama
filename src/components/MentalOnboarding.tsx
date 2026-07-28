// =====================================================
// Malama — Cadastro inicial do modo Mental
//
// Quem entra pelo modo Mental NÃO passa pelo fluxo metabólico: aquele tem
// dezenove telas sobre dieta, janela alimentar, peso e peso objetivo —
// perguntas sem sentido para quem veio buscar apoio psicológico, e que
// pediriam peso justamente a quem pode estar mal com isso.
//
// REAPROVEITA A CASCA DO ONBOARDING EXISTENTE: StepContainer (barra de
// progresso, cabeçalho, transição, rodapé com CTA primário e secundário) e
// DataNascimentoStep (seletor em rolete). O que muda é o CONTEÚDO, não a
// apresentação — os dois fluxos têm que parecer o mesmo produto.
//
// Anamnese NÃO entra aqui de propósito: é trabalho do psicólogo na primeira
// sessão, com formulário próprio no painel dele. Pedir histórico de saúde
// mental num cadastro, sem profissional do outro lado, é ruim clinicamente
// e ruim de confiança.
// =====================================================

import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { StepContainer } from './onboarding-stitch/StepContainer';
import DataNascimentoStep from './onboarding-stitch/steps/DataNascimentoStep';
import type { StitchOnboardingData } from './onboarding-stitch/types';


const inputCls =
  'w-full px-4 py-3.5 rounded-2xl border border-stone-200 bg-white text-stone-800 '
  + 'text-base font-light outline-none focus:border-[#7d4a3c] transition-colors';

const TOTAL = 4;

const PETROL = '#7d4a3c';

/** Cabeçalho no mesmo padrão dos passos do onboarding metabólico:
 *  rótulo "Passo X de Y" + título em Playfair. Os dois fluxos precisam
 *  parecer o mesmo produto. */
const Cabecalho: React.FC<{ passo: number; titulo: string; sub: string }> = ({ passo, titulo, sub }) => (
  <div className="text-center mb-8">
    <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
      Passo {passo} de {TOTAL}
    </span>
    <h1
      className="text-4xl text-stone-800 leading-tight mb-4"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {titulo}
    </h1>
    <p className="text-base font-light text-stone-500 leading-relaxed">{sub}</p>
  </div>
);

export const MentalOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user, profile } = useAuth();
  const [passo, setPasso] = useState(1);

  const [nome, setNome] = useState(profile?.display_name ?? '');
  // DataNascimentoStep opera sobre StitchOnboardingData — usamos o mesmo
  // formato para poder plugar o componente sem adaptador.
  const [dados, setDados] = useState<StitchOnboardingData>({
    dataNascimento: (profile as any)?.date_of_birth ?? undefined,
  });
  const [contatoNome, setContatoNome] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');
  const [contatoRelacao, setContatoRelacao] = useState('');
  const [aceite, setAceite] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const concluir = async () => {
    if (!user) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: nome.trim(),
          date_of_birth: dados.dataNascimento || null,
          contato_emergencia_nome: contatoNome.trim() || null,
          contato_emergencia_telefone: contatoTelefone.trim() || null,
          contato_emergencia_relacao: contatoRelacao.trim() || null,
          // Marcador PRÓPRIO do modo Mental. Não toca em onboarding_completed:
          // se a empresa contratar o metabólico depois, o colaborador ainda
          // precisa do cadastro nutricional, que este fluxo não coleta.
          onboarding_mental_completed: true,
        })
        .eq('id', user.id);
      if (error) throw error;
      onComplete();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  // ── 2. Data de nascimento — componente do fluxo existente, sem adaptador ──
  if (passo === 2) {
    return (
      <DataNascimentoStep
        data={dados}
        updateData={novo => setDados(d => ({ ...d, ...novo }))}
        onNext={() => setPasso(3)}
        onBack={() => setPasso(1)}
        currentStep={2}
        totalSteps={TOTAL}
        // O componente é o mesmo; o texto padrão fala de cálculo metabólico,
        // que não faz sentido para quem entrou pelo modo Mental.
        subtitulo="Ajuda o profissional a te conhecer melhor."
        ajuda="A idade é um dado clínico básico do seu acompanhamento."
      />
    );
  }

  // ── 1. Identificação ──
  if (passo === 1) {
    return (
      <StepContainer
        currentStep={1}
        totalSteps={TOTAL}
        showBack={false}
        onNext={() => setPasso(2)}
        onBack={() => {}}
        nextDisabled={nome.trim().length < 2}
      >
        <Cabecalho
          passo={1}
          titulo="Bem-vindo à Malama"
          sub="São quatro telas. Nenhuma pergunta sobre dieta ou peso."
        />

        <label className="block text-sm font-light text-stone-500 mb-2">
          Como você quer ser chamado?
        </label>
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          className={inputCls}
          placeholder="Seu nome"
          autoFocus
        />
      </StepContainer>
    );
  }

  // ── 3. Contato de emergência ──
  if (passo === 3) {
    return (
      <StepContainer
        currentStep={3}
        totalSteps={TOTAL}
        onNext={() => setPasso(4)}
        onBack={() => setPasso(2)}
        secondaryLabel="Preencher depois"
        onSecondary={() => setPasso(4)}
      >
        <Cabecalho
          passo={3}
          titulo="Contato de emergência"
          sub="Alguém de sua confiança que possa ser acionado se houver risco à sua segurança."
        />

        <div className="rounded-2xl p-4 mb-8 border" style={{ borderColor: `${PETROL}25`, background: `${PETROL}08` }}>
          <p className="text-sm font-light text-stone-600 leading-relaxed">
            Esse contato fica <strong className="font-normal">oculto</strong> e só aparece para o
            profissional que te atende, quando ele avaliar que é necessário. O aplicativo nunca
            liga nem envia mensagem para essa pessoa por conta própria.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-light text-stone-500 mb-2">Nome</label>
            <input
              value={contatoNome} onChange={e => setContatoNome(e.target.value)}
              className={inputCls} placeholder="Nome da pessoa"
            />
          </div>
          <div>
            <label className="block text-sm font-light text-stone-500 mb-2">Telefone</label>
            <input
              type="tel" value={contatoTelefone} onChange={e => setContatoTelefone(e.target.value)}
              className={inputCls} placeholder="(11) 90000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-light text-stone-500 mb-2">Relação</label>
            <input
              value={contatoRelacao} onChange={e => setContatoRelacao(e.target.value)}
              className={inputCls} placeholder="Mãe, cônjuge, amigo..."
            />
          </div>
        </div>
      </StepContainer>
    );
  }

  // ── 4. Termo de ciência ──
  return (
    <StepContainer
      currentStep={4}
      totalSteps={TOTAL}
      onNext={concluir}
      onBack={() => setPasso(3)}
      nextLabel={salvando ? 'Salvando...' : 'Começar'}
      nextDisabled={!aceite || salvando}
    >
      <Cabecalho passo={4} titulo="Antes de começar" sub="Três coisas que você precisa saber." />

      <div className="space-y-3 mb-8">
        {[
          {
            t: 'O que sua empresa vê',
            d: 'Nada individual. Suas respostas aos questionários e o conteúdo das suas sessões '
              + 'nunca são mostrados à empresa — ela recebe apenas números agregados, de grupos '
              + 'com no mínimo cinco pessoas.',
          },
          {
            t: 'Quem cuida de você',
            d: 'Os profissionais que te atendem trocam entre si o que for necessário para não '
              + 'errar na conduta. O que você fala em sessão fica com o psicólogo.',
          },
          {
            t: 'Isto não é atendimento de emergência',
            d: 'A Malama funciona por agendamento. Em situação de crise, ligue 188 (CVV, 24h, '
              + 'gratuito) ou procure a emergência mais próxima.',
          },
        ].map(item => (
          <div key={item.t} className="bg-white border border-stone-200 rounded-2xl p-4">
            <p className="text-base font-normal text-stone-800 mb-1">{item.t}</p>
            <p className="text-sm font-light text-stone-500 leading-relaxed">{item.d}</p>
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)}
          className="w-5 h-5 mt-0.5 rounded flex-shrink-0"
          style={{ accentColor: PETROL }}
        />
        <span className="text-sm font-light text-stone-600 leading-relaxed">
          Li e entendi. Estou ciente do acolhimento psicológico disponível e de que este
          aplicativo não atende emergências.
        </span>
      </label>
    </StepContainer>
  );
};
