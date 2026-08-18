// =====================================================
// Malama Empresas — Landing Page do modo Mental (/empresas/saude-mental)
//
// Irmã de EmpresasLandingPage (modo Metabólico), não substituta: são duas
// compras diferentes. A metabólica vende redução de sinistralidade; esta
// vende conformidade com a NR-1 e a evidência documental que a acompanha.
// Cabeçalho, formulário e rodapé são compartilhados — ver components/empresas.
//
// REGRA DE CONTEÚDO: todo número exibido carrega a fonte embaixo, no mesmo
// padrão da landing metabólica. Afirmação sobre saúde mental sem fonte numa
// página que vende conformidade é o oposto do que a página promete.
// =====================================================

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight, Brain, ShieldCheck, FileText, Lock, EyeOff,
  ClipboardList, Grid3x3, Video, QrCode, Volume2, Scale,
  AlertTriangle, CheckCircle2, Search, Building2, UserPlus,
  Send, BarChart3, Layers, CalendarClock, FileDown, Award,
  UserCheck, Server, Gavel, TrendingDown, Leaf,
} from 'lucide-react';
import { EmpresasHeader, scrollToContato } from '../components/empresas/EmpresasHeader';
import { EmpresaLeadForm } from '../components/empresas/EmpresaLeadForm';
import { EmpresasFooter } from '../components/empresas/EmpresasFooter';

// ─── Animações (mesmas da landing metabólica) ──────────
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// ─── Dados ─────────────────────────────────────────────
const HERO_BULLETS = [
  {
    stat: '546mil',
    text: 'benefícios por incapacidade relacionados a transtornos mentais e comportamentais foram concedidos em 2025 — alta de 15,66% sobre 2024.',
    fonte: 'Ministério da Previdência Social — dados preliminares de 2025, publicados em 2026',
  },
  {
    stat: '2026',
    text: 'o gerenciamento de riscos psicossociais deixou de ter caráter apenas orientativo e passou a ser exigível no PGR da sua empresa.',
    fonte: 'Portaria MTE nº 1.419/2024, com início de exigibilidade prorrogado pela Portaria MTE nº 765/2025',
  },
  {
    stat: '4×',
    text: 'de retorno: cada dólar investido no tratamento de ansiedade e depressão retorna quatro em saúde e capacidade produtiva.',
    fonte: 'Organização Mundial da Saúde — The Lancet Psychiatry',
  },
];

const HERO_CARD = [
  { stat: '3º', label: 'grupo mais frequente entre os benefícios acidentários: transtornos mentais e comportamentais', fonte: 'Ministério da Previdência Social — 2025' },
  { stat: '166.489', label: 'benefícios por incapacidade temporária ligados a outros transtornos ansiosos em 2025', fonte: 'Ministério da Previdência Social — CID F41, 2025' },
  { stat: '126.608', label: 'benefícios por incapacidade temporária ligados a episódios depressivos em 2025', fonte: 'Ministério da Previdência Social — CID F32, 2025' },
];

const CICLO_GRO = [
  {
    icon: Search, n: '01', titulo: 'Identificar',
    exige: 'Levantar quais fatores psicossociais existem no trabalho — cobrança, autonomia, apoio, jornada, assédio.',
    entrega: 'Campanha com instrumento validado, aplicada por setor e por função.',
  },
  {
    icon: BarChart3, n: '02', titulo: 'Avaliar',
    exige: 'Dimensionar o nível de risco por recorte, com método rastreável e reprodutível.',
    entrega: 'Escore determinístico e visão de prioridades por setor, com o critério publicado, para subsidiar a análise da empresa.',
  },
  {
    icon: ClipboardList, n: '03', titulo: 'Controlar',
    exige: 'Definir medidas com prazo, responsável e hierarquia de controle — e executá-las.',
    entrega: 'Plano de ação que só encerra medida com evidência anexada.',
  },
  {
    icon: CalendarClock, n: '04', titulo: 'Verificar',
    exige: 'Acompanhar a implementação e observar a evolução após as medidas.',
    entrega: 'Reaplicação periódica, série histórica e indicadores de absenteísmo, sem atribuir causalidade automaticamente.',
  },
];

const BENEFICIOS = [
  {
    icon: ShieldCheck, titulo: 'Apoio à gestão da NR-1',
    corpo: 'A empresa passa a reunir dados agregados, avaliações periódicas, medidas e evidências em uma trilha rastreável. Esse material subsidia o processo formal de GRO da empresa, sem substituir inventário de riscos, AEP ou PGR.',
    ganhos: ['Resultados agregados por setor', 'Reavaliação periódica', 'Histórico rastreável'],
  },
  {
    icon: Gavel, titulo: 'Rastreabilidade da diligência',
    corpo: 'O Malama organiza quando houve coleta, quais resultados agregados foram observados, que medidas foram registradas e desde quando o cuidado esteve disponível. Isso cria histórico verificável sem expor respostas ou dados de saúde individuais.',
    ganhos: ['Certificado de disponibilização', 'Medidas com evidência', 'Linha do tempo datada'],
  },
  {
    icon: TrendingDown, titulo: 'Redução de passivo e de custo',
    corpo: 'Afastamento por transtorno mental reconhecido como relacionado ao trabalho é acidentário: gera estabilidade de doze meses, FGTS durante o afastamento e entra no cálculo do FAP, que multiplica a alíquota do RAT. Agir antes do afastamento é a única forma barata de tratar esse risco.',
    ganhos: ['Menos afastamento longo', 'Impacto em FAP/RAT', 'Menos turnover e reposição'],
  },
  {
    icon: Leaf, titulo: 'ESG, due diligence e reputação',
    corpo: 'Saúde e segurança psicossocial já são item de questionário de cliente, de auditoria de cadeia de fornecedores e de relatório de sustentabilidade. Os indicadores saem no formato que esses relatórios pedem — e viram argumento de employer branding em vez de risco reputacional.',
    ganhos: ['Aderente a GRI 403 e ISO 45003', 'Resposta a due diligence', 'Atração e retenção'],
  },
];

// Mapeamento direto: o que a norma cobra × onde isso está no produto.
// Existe porque comprador de compliance não compra promessa — compra a
// linha que ele vai apontar quando o auditor perguntar.
const MAPEAMENTO_NR1 = [
  { exige: 'Reconhecer fatores psicossociais relacionados ao trabalho', onde: 'JSS e participação dos trabalhadores geram dados agregados para análise da empresa' },
  { exige: 'Avaliar e definir prioridades no GRO', onde: 'Escores determinísticos e recortes agregados subsidiam a decisão formal da empresa' },
  { exige: 'Manter registros do processo', onde: 'Relatórios WHO-5 e JSS documentam método, período e resultados agregados' },
  { exige: 'Planejar e acompanhar medidas de prevenção', onde: 'Plano de ação registra fator, nível de controle, prazo e responsável' },
  { exige: 'Acompanhar a implementação das medidas', onde: 'Conclusão exige registro da evidência de execução' },
];

const INSTRUMENTOS = [
  {
    icon: Brain,
    nome: 'WHO-5',
    subtitulo: 'Índice de Bem-Estar',
    cadencia: 'Mensal',
    eixo: 'Como o colaborador está',
    corpo: 'Cinco itens, escala de 0 a 100. Mede bem-estar subjetivo no período recente. Abaixo de 50 indica bem-estar reduzido; é o termômetro que mostra movimento mês a mês.',
    fonte: 'WHO Regional Office for Europe, 1998 — versão brasileira validada',
  },
  {
    icon: Layers,
    nome: 'JSS',
    subtitulo: 'Job Stress Scale — cobrança, autonomia e apoio',
    cadencia: 'Trimestral',
    eixo: 'O que no trabalho expõe a risco',
    corpo: 'Modelo Karasek/Theorell. Separa o que a organização do trabalho impõe (demanda, que o painel chama de cobrança), quanta autonomia a pessoa tem para decidir (controle) e quanto apoio recebe da chefia e dos colegas. É o eixo que aponta a causa, não o sintoma.',
    fonte: 'Alves MGM et al. Rev Saúde Pública 2004;38(2):164-71 — adaptação brasileira',
  },
];

const RIGOR_ITENS = [
  { icon: Scale, titulo: 'Redação preservada', corpo: 'Não reescrevemos os itens em "linguagem fácil". Alterar o texto de um instrumento validado invalida o escore — e, com ele, o valor do relatório num questionamento fiscal ou pericial.' },
  { icon: BarChart3, titulo: 'Escore calculado, nunca inferido', corpo: 'A chave de correção é a publicada pelos autores e roda por fórmula determinística. Nenhuma nota do seu relatório sai de um modelo de IA.' },
  { icon: Volume2, titulo: 'Feito para o chão de fábrica', corpo: 'Botão de áudio para ouvir cada item e âncora visual nas opções, para quem lê pouco. O apoio muda o acesso à pergunta, nunca a pergunta.' },
  { icon: QrCode, titulo: 'Responde sem login e sem app', corpo: 'Um link (ou QR impresso) por setor. Abre no navegador do celular de qualquer pessoa, inclusive de quem não tem conta na plataforma.' },
];

const QUADRANTES = [
  {
    id: 'estavel', cor: '#0ca30c', label: 'Estável',
    pos: 'Bem-estar preservado · carga de trabalho baixa',
    acao: 'Manter o acompanhamento periódico e a série histórica.',
  },
  {
    id: 'latente', cor: '#fab219', label: 'Risco latente',
    pos: 'Bem-estar preservado · carga de trabalho alta',
    acao: 'O time ainda aguenta, mas a organização do trabalho já pressiona. Agir antes de adoecer.',
  },
  {
    id: 'externo', cor: '#ec835a', label: 'Pede investigação',
    pos: 'Bem-estar reduzido · carga de trabalho baixa',
    acao: 'O JSS não explica sozinho o bem-estar reduzido. Aprofundar a escuta sem presumir causa ou nexo.',
  },
  {
    id: 'ocupacional', cor: '#d03b3b', label: 'Prioridade para aprofundar',
    pos: 'Bem-estar reduzido · carga de trabalho alta',
    acao: 'Há sinais convergentes no período. A empresa aprofunda a análise e decide as medidas cabíveis.',
  },
];

const PRIVACIDADE = [
  {
    icon: Server, titulo: 'O corte é no banco, não na tela',
    corpo: 'Recorte com menos de 5 respondentes nunca sai do servidor — aparece como "dados insuficientes". Não é filtro de interface que alguém contorna exportando a planilha.',
  },
  {
    icon: EyeOff, titulo: 'A resposta não carrega identidade',
    corpo: 'Pelo link por setor ninguém faz login. Não gravamos IP nem impressão digital do navegador: o que não se coleta não vaza.',
  },
  {
    icon: Lock, titulo: 'O RH não tem permissão de leitura',
    corpo: 'Na tabela de respostas o perfil de RH não tem permissão nenhuma — não é uma tela escondida, é ausência de acesso no banco. Ele enxerga o agregado, e só.',
  },
  {
    icon: UserCheck, titulo: 'Um link por setor, não por pessoa',
    corpo: 'O RH distribui no grupo, no mural ou no crachá. Ninguém recebe um link com o próprio nome — e o recorte que sustenta o PGR continua exato.',
  },
];

const DOCUMENTOS = [
  { icon: FileText, titulo: 'Relatório de Risco Psicossocial (WHO-5)', corpo: 'Bem-estar agregado por setor, no período que o RH escolher — mês, trimestre, semestre ou intervalo personalizado. Traz metodologia, fonte do instrumento e nota de privacidade.' },
  { icon: Layers, titulo: 'Relatório de Carga de Trabalho (JSS)', corpo: 'Cobrança, autonomia e apoio por setor, com a matriz de risco e as medidas já lançadas no plano de ação. É o documento que aponta o fator, não só o sintoma.' },
  { icon: Award, titulo: 'Certificado de Disponibilização', corpo: 'Prova, colaborador a colaborador, que o cuidado esteve disponível e desde quando. Não contém nenhum dado de uso ou de saúde — só a diligência da empresa.' },
  { icon: ClipboardList, titulo: 'Plano de ação com evidência', corpo: 'Cada medida com fator, nível de controle, responsável, prazo e o arquivo que comprova a execução. Sem evidência, a medida não fecha.' },
];

const CONTROLE_NIVEIS = [
  { nivel: 'Na fonte', corpo: 'Elimina ou reduz o fator na origem: redimensionar carga, rever metas, alterar escala.', peso: 'Prioritário' },
  { nivel: 'Organizacional', corpo: 'Muda como o trabalho é gerido: formar liderança, criar pausas, revisar comunicação.', peso: 'Complementar' },
  { nivel: 'Individual', corpo: 'Cuida de quem já foi afetado: acolhimento, psicólogo, encaminhamento.', peso: 'Não encerra risco de fonte' },
];

const CUIDADO_ITENS = [
  { icon: ShieldCheck, titulo: 'Psicólogo com CRP e e-Psi ativo', corpo: 'O cadastro exige registro no Conselho Regional de Psicologia e declaração de e-Psi ativo, com validação documental e aprovação da Malama antes do primeiro atendimento.' },
  { icon: Video, titulo: 'Consulta mensal por telemedicina', corpo: 'Vídeo dentro do próprio app, do celular do colaborador. Sem fila, sem deslocamento, sem guia — e sem passar pelo RH para marcar.' },
  { icon: EyeOff, titulo: 'A empresa nunca sabe quem agendou', corpo: 'O RH define quantos assentos psicológicos existem e para quais colaboradores. O uso do assento é invisível para ele.' },
  { icon: CalendarClock, titulo: 'Vínculo por consulta, não por chat', corpo: 'De propósito, o psicólogo não atende por mensagem avulsa. O acompanhamento se sustenta na consulta recorrente — é assim que a conduta clínica se mantém coerente.' },
];

const COMO_FUNCIONA = [
  { icon: Building2, step: '01', title: 'Contrata o modo Mental', body: 'Pode ser contratado sozinho ou somado ao modo Metabólico. São valores e números de assento independentes — a empresa não precisa comprar o que não vai usar.' },
  { icon: UserPlus, step: '02', title: 'RH cadastra com setor e função', body: 'O convite pede setor e função além de nome e e-mail. É esse recorte que sustenta a matriz de risco e o relatório do PGR depois.' },
  { icon: Send, step: '03', title: 'Campanha vai ao ar', body: 'O RH abre a janela de resposta e recebe um link (e QR) por setor para distribuir. Acompanha a adesão em tempo real — sem ver nenhuma resposta.' },
  { icon: FileDown, step: '04', title: 'Relatório, matriz e plano', body: 'Fechada a janela, saem o relatório em PDF e a matriz por setor. O plano de ação registra as medidas e o ciclo recomeça no período seguinte.' },
];

const DIFERENCIAIS = [
  { icon: Scale, titulo: 'Instrumentos com método declarado', corpo: 'WHO-5 e JSS têm finalidade e regras de cálculo próprias. O relatório preserva os itens, aplica fórmulas determinísticas e informa as referências utilizadas.' },
  { icon: Lock, titulo: 'Anonimato imposto pela arquitetura', corpo: 'O piso de anonimato e a ausência de acesso do RH estão no banco de dados, não numa cláusula de contrato. É por isso que o colaborador responde — e sem resposta não existe diagnóstico.' },
  { icon: FileText, titulo: 'A evidência acompanha o ciclo', corpo: 'O Malama mantém coleta periódica, relatório reemitível e plano de ação vivo no mesmo fluxo, para a empresa não depender de registros espalhados.' },
  { icon: Volume2, titulo: 'Desenhado para quem trabalha em pé', corpo: 'Áudio dos itens, âncora visual nas opções, alvo de toque grande e resposta sem login. A base que mais adoece é justamente a que menos responde formulário corporativo.' },
];

// ─── Componente ─────────────────────────────────────────
export const EmpresasMentalPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-Malama-bg text-Malama-main overflow-hidden font-sans selection:bg-Malama-petrol selection:text-white">
      <EmpresasHeader aba="mental" />

      {/* ==================== HERO ==================== */}
      <section className="relative min-h-screen flex items-center pt-32 pb-16 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto w-full">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}
            className="grid lg:grid-cols-[1fr_420px] gap-12 items-center">

            <div>
              <motion.div variants={fadeInUp} className="mb-6 flex items-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">
                  Malama Mental · NR-1
                </span>
              </motion.div>

              <motion.h1 variants={fadeInUp}
                className="font-serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.02] tracking-tight text-Malama-main mb-6">
                Risco psicossocial<br />
                virou obrigação legal.<br />
                <span className="text-Malama-petrol italic">Organize as evidências</span><br />
                do ciclo de prevenção.
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-base md:text-lg text-Malama-muted font-light leading-relaxed max-w-xl mb-10">
                A NR-1 passou a exigir que a empresa identifique, avalie e controle os fatores de risco
                psicossocial do trabalho dentro do GRO. O Malama Mental apoia a coleta com instrumentos
                reconhecidos, organiza relatórios que subsidiam o processo da empresa e coloca psicólogos por
                telemedicina à disposição do seu time.
              </motion.p>

              <motion.div variants={fadeInUp} className="space-y-5 mb-10">
                {HERO_BULLETS.map((b, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="flex-shrink-0 font-serif text-2xl font-light text-Malama-petrol w-20 text-right leading-tight">{b.stat}</span>
                    <div>
                      <p className="text-sm text-Malama-main leading-snug">{b.text}</p>
                      <p className="text-xs text-Malama-muted/60 mt-0.5">{b.fonte}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4">
                <button onClick={scrollToContato}
                  className="group inline-flex items-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300">
                  Organizar o ciclo psicossocial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <span className="text-xs text-Malama-muted/70 max-w-[15rem] leading-snug">
                  Também disponível junto ao modo Metabólico, no mesmo contrato.
                </span>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="bg-Malama-main rounded-3xl p-8 space-y-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Realidade do seu time</p>
              {HERO_CARD.map((c, i) => (
                <div key={i} className={i < HERO_CARD.length - 1 ? 'pb-5 border-b border-white/10' : ''}>
                  <p className="font-serif text-5xl font-light text-white mb-1">{c.stat}</p>
                  <p className="text-sm text-white/70 leading-snug">{c.label}</p>
                  <p className="text-xs text-white/30 mt-1">{c.fonte}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-Malama-petrol-light opacity-50 blur-3xl translate-x-1/2" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-Malama-petrol/5 blur-3xl" />
        </div>
      </section>

      {/* ==================== A NOVA OBRIGAÇÃO ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-main text-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">O que mudou</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl">
              Cuidar da saúde mental do time deixou de ser gentileza. <span className="text-Malama-petrol italic">Virou item de fiscalização.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-white/60 mb-14 max-w-2xl leading-relaxed">
              O fator de risco psicossocial entrou no Gerenciamento de Riscos Ocupacionais e passou a seguir
              o mesmo rito de ruído, calor ou agente químico: precisa estar identificado, avaliado e
              controlado no PGR — com documento que sustente cada decisão.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {CICLO_GRO.map((c, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="group p-7 rounded-2xl border border-white/10 hover:border-Malama-petrol/40 hover:bg-white/5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-Malama-petrol/20 flex items-center justify-center">
                      <c.icon className="w-5 h-5 text-Malama-petrol" />
                    </div>
                    <span className="font-serif text-3xl font-light text-white/15">{c.n}</span>
                  </div>
                  <h3 className="font-semibold text-white text-base mb-3">{c.titulo}</h3>
                  <p className="text-sm text-white/60 leading-relaxed font-light mb-4">{c.exige}</p>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs uppercase tracking-widest text-Malama-petrol mb-1.5">No Malama</p>
                    <p className="text-sm text-white/80 leading-snug">{c.entrega}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp}
              className="rounded-2xl border border-Malama-petrol/30 bg-Malama-petrol/10 p-7 flex flex-col md:flex-row gap-5 items-start">
              <AlertTriangle className="w-6 h-6 text-Malama-petrol flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white text-base mb-2">O custo de não ter o documento</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Sem inventário de risco e sem plano de ação, a empresa chega à fiscalização — ou a uma ação
                  por adoecimento relacionado ao trabalho — sem nada que comprove diligência. A discussão sobre
                  nexo causal acontece sobre o silêncio da empresa: não há registro de que o risco foi avaliado,
                  nem de que o cuidado foi oferecido e quando.
                </p>
                <p className="text-xs text-white/30 mt-3">
                  Conteúdo informativo. As decisões formais e a integração ao GRO cabem à empresa e a quem ela designar para essas atribuições.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== O QUE A EMPRESA GANHA ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">O que a empresa ganha</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl text-Malama-main">
              Organizar o ciclo é o piso. <span className="text-Malama-petrol italic">O que se ganha está acima dele.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-2xl leading-relaxed">
              A NR-1 obriga. Mas o mesmo processo que atende a norma também protege a empresa numa
              reclamatória, tira custo do afastamento e responde ao questionário ESG que o seu cliente
              já está mandando. Um investimento, quatro frentes.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {BENEFICIOS.map((b, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="bg-white rounded-2xl p-7 border border-Malama-border hover:border-Malama-petrol/40 transition-colors flex flex-col">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <b.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-semibold text-Malama-main text-base mb-2">{b.titulo}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed mb-5">{b.corpo}</p>
                  <div className="mt-auto pt-5 border-t border-Malama-border flex flex-wrap gap-2">
                    {b.ganhos.map(g => (
                      <span key={g} className="text-[11px] px-2.5 py-1 rounded-full bg-Malama-petrol/10 text-Malama-petrol font-medium">
                        {g}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Mapeamento exigência → produto */}
            <motion.div variants={fadeInUp} className="bg-white border border-Malama-border rounded-2xl overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-Malama-border flex items-center gap-3">
                <ClipboardList className="w-4 h-4 text-Malama-petrol" />
                <span className="text-sm font-semibold text-Malama-main">O que o processo exige × como o Malama apoia</span>
              </div>
              <div className="hidden sm:grid grid-cols-2 gap-4 px-6 md:px-8 py-3 bg-Malama-bg text-[10px] uppercase tracking-wide text-Malama-muted">
                <span>Exigência do gerenciamento de riscos</span>
                <span>Entrega correspondente</span>
              </div>
              {MAPEAMENTO_NR1.map((m, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 px-6 md:px-8 py-4 border-t border-Malama-border">
                  <div className="flex items-start gap-2.5">
                    <Scale className="w-3.5 h-3.5 text-Malama-muted/50 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-Malama-main leading-snug">{m.exige}</span>
                  </div>
                  <div className="flex items-start gap-2.5 pl-6 sm:pl-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-Malama-petrol flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-Malama-muted leading-snug">{m.onde}</span>
                  </div>
                </div>
              ))}
              <p className="px-6 md:px-8 py-4 border-t border-Malama-border text-xs text-Malama-muted/60 leading-relaxed">
                Quadro informativo. A adequação formal e as decisões técnicas continuam sob responsabilidade
                da empresa e de quem ela designar. O Malama organiza dados, indicadores e evidências de apoio.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== INSTRUMENTOS ==================== */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Como medimos</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl text-Malama-main">
              Um escore transparente e reproduzível — <span className="text-Malama-petrol italic">não uma nota inventada pela IA.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-2xl leading-relaxed">
              Dois instrumentos científicos, validados em português, com chave de correção pública. Um mede
              como a pessoa está; o outro, o que no trabalho a expõe. Juntos respondem a pergunta que a
              NR-1 faz — e que nenhuma pesquisa de satisfação interna consegue responder.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {INSTRUMENTOS.map((inst, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="bg-white rounded-2xl p-8 border border-Malama-border">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-Malama-petrol/10 flex items-center justify-center">
                      <inst.icon className="w-6 h-6 text-Malama-petrol" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide uppercase text-Malama-petrol border border-Malama-petrol/30 rounded-full px-3 py-1">
                      {inst.cadencia}
                    </span>
                  </div>
                  <h3 className="font-serif text-3xl font-light text-Malama-main mb-1">{inst.nome}</h3>
                  <p className="text-sm text-Malama-muted mb-5">{inst.subtitulo}</p>
                  <p className="text-xs uppercase tracking-widest text-Malama-petrol mb-1.5">Mede</p>
                  <p className="text-sm font-medium text-Malama-main mb-4">{inst.eixo}</p>
                  <p className="text-sm text-Malama-muted leading-relaxed mb-5">{inst.corpo}</p>
                  <p className="text-xs text-Malama-muted/60 pt-4 border-t border-Malama-border">{inst.fonte}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {RIGOR_ITENS.map((r, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="bg-white rounded-2xl p-6 border border-Malama-border">
                  <div className="w-9 h-9 rounded-lg bg-Malama-petrol/10 flex items-center justify-center mb-4">
                    <r.icon className="w-4 h-4 text-Malama-petrol" />
                  </div>
                  <h4 className="font-semibold text-Malama-main text-sm mb-2 leading-snug">{r.titulo}</h4>
                  <p className="text-xs text-Malama-muted leading-relaxed">{r.corpo}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== MATRIZ DE RISCO ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">A leitura que importa</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl text-Malama-main">
              O problema é o trabalho <span className="text-Malama-petrol italic">ou é a vida?</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-2xl leading-relaxed">
              Cruzando carga de trabalho (JSS) com bem-estar (WHO-5), cada setor cai num quadrante — e
              cada quadrante pede uma ação diferente. Confundir os dois é o erro mais caro do mercado:
              tratar organização de trabalho com palestra de mindfulness gasta orçamento e não move o risco.
            </motion.p>

            <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
              {/* Matriz */}
              <motion.div variants={fadeInUp} className="bg-white border border-Malama-border rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Grid3x3 className="w-4 h-4 text-Malama-petrol" />
                  <span className="text-sm font-semibold text-Malama-main">Matriz de risco psicossocial por setor</span>
                  <span className="text-xs text-Malama-muted/60 ml-auto hidden sm:inline">exemplo ilustrativo</span>
                </div>

                <div className="flex gap-3">
                  {/* Eixo Y */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-Malama-muted whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                      Bem-estar (WHO-5) →
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      {['estavel', 'latente', 'externo', 'ocupacional'].map(id => {
                        const q = QUADRANTES.find(x => x.id === id)!;
                        const critico = id === 'ocupacional';
                        return (
                          <div key={id}
                            className={`rounded-xl border p-5 min-h-[140px] flex flex-col ${
                              critico ? 'border-[#d03b3b]/30 bg-[#d03b3b]/[0.05]' : 'border-Malama-border bg-Malama-bg'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: q.cor }} />
                              <span className="text-sm font-semibold text-Malama-main leading-tight">{q.label}</span>
                            </div>
                            <p className="text-xs text-Malama-muted/70 mb-3">{q.pos}</p>
                            <div className="mt-auto flex flex-wrap gap-1.5">
                              {(id === 'ocupacional'
                                ? ['Produção · turno B', 'Atendimento']
                                : id === 'latente' ? ['Logística']
                                : id === 'externo' ? ['Comercial']
                                : ['Administrativo', 'Engenharia']
                              ).map(s => (
                                <span key={s} className="text-[11px] px-2 py-1 rounded-full bg-white border border-Malama-border text-Malama-muted">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-Malama-muted text-center mt-3">
                      Carga de trabalho (JSS) →
                    </p>
                  </div>
                </div>

                <p className="text-xs text-Malama-muted/60 mt-6 pt-5 border-t border-Malama-border leading-relaxed">
                  A posição do setor é o que informa — a cor apenas acompanha o rótulo, nunca o substitui,
                  para que a matriz continue legível em impressão preto e branco e para quem tem daltonismo.
                  Setor com menos de 5 respondentes não aparece.
                </p>
              </motion.div>

              {/* O que fazer */}
              <motion.div variants={fadeInUp} className="bg-Malama-main rounded-2xl p-7">
                <p className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol mb-6">O que cada quadrante pede</p>
                <div className="space-y-5">
                  {QUADRANTES.map((q, i) => (
                    <div key={q.id} className={i < QUADRANTES.length - 1 ? 'pb-5 border-b border-white/10' : ''}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: q.cor }} />
                        <span className="text-sm font-medium text-white">{q.label}</span>
                      </div>
                      <p className="text-sm text-white/60 leading-snug">{q.acao}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== PRIVACIDADE ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-main text-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Confiança e LGPD</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl">
              O RH nunca vê a resposta de ninguém. <span className="text-Malama-petrol italic">E é isso que faz o dado existir.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-white/60 mb-14 max-w-2xl leading-relaxed">
              Numa pesquisa de saúde mental, a desconfiança derruba a adesão antes de qualquer análise — e
              sem adesão não há diagnóstico, nem relatório que se defenda. Por isso o anonimato aqui não é
              promessa de contrato: é como o sistema foi construído.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {PRIVACIDADE.map((p, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="p-7 rounded-2xl border border-white/10 hover:border-Malama-petrol/40 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/20 flex items-center justify-center mb-5">
                    <p.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-semibold text-white text-base mb-2">{p.titulo}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{p.corpo}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp} className="rounded-2xl border border-white/10 p-7 flex flex-col md:flex-row gap-5 items-start">
              <ShieldCheck className="w-6 h-6 text-Malama-petrol flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white text-base mb-2">E quando a resposta é identificada?</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Quando o colaborador responde dentro do app, logado, a resposta compõe o histórico clínico
                  dele — e é lida apenas pelo profissional de saúde que o atende, sob sigilo profissional.
                  Para a empresa, o resultado continua saindo só agregado, com o mesmo piso de anonimato.
                  São dois caminhos separados por construção: o registro clínico e o indicador do PGR nunca
                  se misturam.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== DOCUMENTOS / PGR ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Evidência documental</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl text-Malama-main">
              Sai em PDF, com metodologia e fonte — <span className="text-Malama-petrol italic">como subsídio ao GRO.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-2xl leading-relaxed">
              O RH escolhe o período e emite quando quiser, quantas vezes quiser. Todo documento traz a
              metodologia usada, a referência do instrumento e a nota de privacidade — e fica guardado no
              histórico, para ser baixado de novo sempre que a auditoria pedir.
            </motion.p>

            <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">
              {/* Mockup do relatório */}
              <motion.div variants={fadeInUp} className="bg-white border border-Malama-border rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-Malama-main px-6 md:px-8 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-Malama-petrol flex-shrink-0" />
                    <span className="text-white font-medium text-sm tracking-wide truncate">
                      Relatório de Risco Psicossocial — subsídio ao PGR
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-Malama-petrol" />
                    <span className="text-Malama-petrol text-xs font-medium">k ≥ 5</span>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Empresa', value: '[Nome da Empresa]' },
                      { label: 'Competência', value: '1º semestre' },
                      { label: 'Instrumentos', value: 'WHO-5 + JSS' },
                      { label: 'Adesão', value: '78%' },
                    ].map((m, i) => (
                      <div key={i} className="bg-Malama-bg rounded-xl p-4">
                        <p className="text-[10px] text-Malama-muted uppercase tracking-wide mb-1">{m.label}</p>
                        <p className="font-semibold text-Malama-main text-sm leading-tight">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* No celular a tabela rola em vez de espremer: coluna de
                      classificação truncada esconde justamente o quadrante,
                      que é a informação que o RH veio ver. */}
                  <div className="rounded-xl border border-Malama-border overflow-hidden mb-5 overflow-x-auto">
                    <div className="min-w-[520px]">
                    <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr] gap-2 px-4 py-2.5 bg-Malama-bg text-[10px] uppercase tracking-wide text-Malama-muted">
                      <span>Setor</span><span>Bem-estar</span><span>Carga</span><span>Classificação</span>
                    </div>
                    {[
                      { setor: 'Produção · turno B', who: '41', jss: 'Alta', q: 'Aprofundar', cor: '#d03b3b' },
                      { setor: 'Atendimento', who: '46', jss: 'Alta', q: 'Aprofundar', cor: '#d03b3b' },
                      { setor: 'Logística', who: '63', jss: 'Alta', q: 'Risco latente', cor: '#fab219' },
                      { setor: 'Administrativo', who: '71', jss: 'Baixa', q: 'Estável', cor: '#0ca30c' },
                    ].map((l, i) => (
                      <div key={i} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr] gap-2 px-4 py-3 border-t border-Malama-border text-xs items-center">
                        <span className="text-Malama-main font-medium truncate">{l.setor}</span>
                        <span className="text-Malama-muted">{l.who}</span>
                        <span className="text-Malama-muted">{l.jss}</span>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: l.cor }} />
                          <span className="text-Malama-main truncate">{l.q}</span>
                        </span>
                      </div>
                    ))}
                    <div className="grid grid-cols-[1.4fr_2.8fr] gap-2 px-4 py-3 border-t border-Malama-border text-xs items-center bg-Malama-bg/60">
                      <span className="text-Malama-muted/70 truncate">Manutenção</span>
                      <span className="flex items-center gap-1.5 text-Malama-muted/70">
                        <Lock className="w-3 h-3 flex-shrink-0" />
                        Menos de 5 respondentes — dados insuficientes
                      </span>
                    </div>
                    </div>
                  </div>

                  <div className="border-t border-Malama-border pt-5 flex items-start gap-3">
                    <Scale className="w-4 h-4 text-Malama-petrol flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-Malama-muted leading-relaxed">
                      Documento de apoio ao Gerenciamento de Riscos Ocupacionais. Não substitui AEP, PGR,
                      PCMSO, inventário ou decisão técnica da empresa — organiza resultados agregados para
                      subsidiar esse processo.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Lista de documentos */}
              <motion.div variants={staggerContainer} className="space-y-4">
                {DOCUMENTOS.map((d, i) => (
                  <motion.div key={i} variants={fadeInUp}
                    className="bg-white rounded-2xl p-6 border border-Malama-border hover:border-Malama-petrol/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-Malama-petrol/10 flex items-center justify-center flex-shrink-0">
                        <d.icon className="w-5 h-5 text-Malama-petrol" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-Malama-main text-sm mb-1.5 leading-snug">{d.titulo}</h3>
                        <p className="text-xs text-Malama-muted leading-relaxed">{d.corpo}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== PLANO DE AÇÃO ==================== */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Do diagnóstico ao controle</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl text-Malama-main">
              Medir e arquivar é relatório. <span className="text-Malama-petrol italic">A norma pede controle.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-2xl leading-relaxed">
              O plano de ação registra cada medida com fator de risco, nível de controle, responsável e prazo —
              e impõe duas regras que são justamente o que dá valor ao documento.
            </motion.p>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {CONTROLE_NIVEIS.map((n, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className={`rounded-2xl p-7 border ${i === 0 ? 'bg-Malama-petrol text-white border-Malama-petrol' : 'bg-white border-Malama-border'}`}>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className={`font-serif text-3xl font-light ${i === 0 ? 'text-white/40' : 'text-Malama-petrol/30'}`}>0{i + 1}</span>
                    <span className={`text-[10px] uppercase tracking-wide font-medium px-2.5 py-1 rounded-full ${
                      i === 0 ? 'bg-white/15 text-white' : 'bg-Malama-petrol/10 text-Malama-petrol'
                    }`}>{n.peso}</span>
                  </div>
                  <h3 className={`font-semibold text-base mb-2 ${i === 0 ? 'text-white' : 'text-Malama-main'}`}>{n.nivel}</h3>
                  <p className={`text-sm leading-relaxed ${i === 0 ? 'text-white/80' : 'text-Malama-muted'}`}>{n.corpo}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-6">
              <motion.div variants={fadeInUp} className="bg-Malama-petrol-light border border-Malama-border rounded-2xl p-7">
                <CheckCircle2 className="w-5 h-5 text-Malama-petrol mb-4" />
                <h3 className="font-semibold text-Malama-main text-sm mb-2">Concluir exige evidência</h3>
                <p className="text-xs text-Malama-muted leading-relaxed">
                  Nenhuma medida é marcada como concluída sem o arquivo que comprova a execução — a regra
                  também é validada no banco, não só na tela. O arquivo registra a execução, mas não
                  substitui a avaliação do conjunto do processo pela empresa.
                </p>
              </motion.div>
              <motion.div variants={fadeInUp} className="bg-Malama-petrol-light border border-Malama-border rounded-2xl p-7">
                <AlertTriangle className="w-5 h-5 text-Malama-petrol mb-4" />
                <h3 className="font-semibold text-Malama-main text-sm mb-2">Medida individual sozinha é sinalizada</h3>
                <p className="text-xs text-Malama-muted leading-relaxed">
                  Quando os indicadores apontam atenção à organização do trabalho e o plano contém apenas
                  acolhimento individual, o painel sinaliza a lacuna. A classificação formal continua sendo
                  uma decisão da empresa.
                </p>
              </motion.div>
              <motion.div variants={fadeInUp} className="bg-Malama-petrol-light border border-Malama-border rounded-2xl p-7">
                <BarChart3 className="w-5 h-5 text-Malama-petrol mb-4" />
                <h3 className="font-semibold text-Malama-main text-sm mb-2">Absenteísmo fecha o ciclo</h3>
                <p className="text-xs text-Malama-muted leading-relaxed">
                  Os afastamentos entram pelo formato que a empresa já declara ao governo (eSocial S-2230) e
                  viram indicador por capítulo de CID e setor — sem apontar pessoa nenhuma. É uma das séries
                  que ajudam a acompanhar a evolução, sem provar causalidade isoladamente.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== TELECONSULTA COM PSICÓLOGOS ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-main text-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Cuidado, não só diagnóstico</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl">
              Rastrear é universal. <span className="text-Malama-petrol italic">Cuidar é o que muda o número</span> no período seguinte.
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-white/60 mb-14 max-w-2xl leading-relaxed">
              Todo colaborador com assento é rastreado — medir precisa alcançar todo mundo. O acompanhamento
              psicológico é o passo seguinte: a empresa decide quantos assentos abre e para quem, e o
              colaborador agenda direto pelo app, sem pedir autorização a ninguém.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {CUIDADO_ITENS.map((c, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="p-7 rounded-2xl border border-white/10 hover:border-Malama-petrol/40 hover:bg-white/5 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/20 flex items-center justify-center mb-5">
                    <c.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-semibold text-white text-base mb-2">{c.titulo}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{c.corpo}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA ==================== */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Implementação</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl text-Malama-main">
              Do contrato ao primeiro relatório <span className="text-Malama-petrol italic">em um ciclo.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-2xl leading-relaxed">
              Sem integração com o seu ERP, sem projeto de TI, sem treinamento técnico. O RH opera tudo por
              um painel próprio.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {COMO_FUNCIONA.map((c, i) => (
                <motion.div key={i} variants={fadeInUp} className="p-8 rounded-2xl bg-white border border-Malama-border relative">
                  <span className="absolute top-6 right-7 font-serif text-4xl text-Malama-petrol/20">{c.step}</span>
                  <div className="w-12 h-12 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <c.icon className="w-6 h-6 text-Malama-petrol" />
                  </div>
                  <h3 className="font-semibold text-Malama-main text-base mb-2 pr-8">{c.title}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed">{c.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== DIFERENCIAIS ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">O que nos torna únicos</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-3xl text-Malama-main">
              Entre o diagnóstico pontual e o app que ninguém abre, <span className="text-Malama-petrol italic">existe o ciclo acompanhado.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-2xl leading-relaxed">
              A NR-1 não pede um diagnóstico único: pede um processo que se repete e se comprova. É isso
              que o Malama Mental deixa funcionando dentro da sua empresa.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {DIFERENCIAIS.map((d, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="p-7 rounded-2xl bg-white border border-Malama-border hover:border-Malama-petrol/40 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <d.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-semibold text-Malama-main text-base mb-2">{d.titulo}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed">{d.corpo}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section id="contato" className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer}>
              <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Próximo passo</span>
              </motion.div>
              <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 text-Malama-main">
                Sua empresa já tem o inventário de risco psicossocial?
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-Malama-muted mb-12 leading-relaxed">
                Se a resposta ainda é "não", deixe seu contato. A equipe Malama mostra o painel do RH,
                os relatórios e como a plataforma apoia a organização desse ciclo — sem assumir as decisões
                formais da empresa.
              </motion.p>

              <EmpresaLeadForm
                origem="mental"
                ctaLabel="Quero organizar meu ciclo psicossocial"
                variants={fadeInUp}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <EmpresasFooter tagline="Cuidar do time é essencial. Organizar as evidências também." />
    </div>
  );
};
