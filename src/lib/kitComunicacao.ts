// =====================================================
// Malama — Kit de divulgação da campanha
//
// O momento decisivo do produto não é abrir a campanha: é o RH conseguir
// que 200 pessoas respondam. Até aqui o painel entregava a URL e o CSV e
// largava a parte difícil — escrever a mensagem — com quem tem menos tempo
// e mais medo de errar. Sem texto pronto o RH adia, ou improvisa algo que
// soa a vigilância, e a adesão morre antes de começar.
//
// Três regras que estes textos seguem, e que não são estilo:
//
//  1. NUNCA PRESSIONAM. Nada de "contamos com 100%" ou "é rapidinho, não
//     custa nada". Resposta obtida sob pressão enviesa o instrumento, e é a
//     validade dele que sustenta o relatório num questionamento — a mesma
//     razão por que `lib/rhJornada` se recusa a pontuar adesão.
//
//  2. O ANONIMATO É DITO NO CONCRETO. "Seus dados estão seguros" é o que
//     toda empresa escreve antes de um corte, e o funcionário sabe disso.
//     O que convence é o mecanismo: não pede login, não pergunta o nome, e
//     nem o RH nem a Malama conseguem ver resposta individual.
//
//  3. A VOZ É DA EMPRESA, não da Malama. Quem manda a mensagem é o RH; o
//     fornecedor aparecendo no texto transforma cuidado em ferramenta
//     contratada, e o time responde de acordo.
//
// Tudo aqui é função pura de string: o que a tela faz é copiar.
// =====================================================

/** O que o RH precisa saber sobre o instrumento para escrever o convite. */
type PerfilInstrumento = {
  /** Como se chama para o colaborador — nunca a sigla sozinha. */
  rotulo: string;
  /** Chamada do cartaz, em duas linhas (a segunda sai em negrito). Precisa
   *  variar por instrumento: uma chamada fixa sobre o trabalho pendurada
   *  numa campanha de bem-estar contradiz o subtítulo do próprio cartaz. */
  chamada: [string, string];
  perguntas: number;
  /** Arredondado para cima e para o número redondo mais próximo. Prometer
   *  "2 minutos" e levar 4 queima a confiança na próxima campanha. */
  minutos: number;
  /** O que a pessoa vai ser perguntada, na primeira pessoa dela. */
  sobre: string;
  /** Por que responder ajuda ELA — não a empresa. */
  beneficio: string;
};

const PERFIS: Record<string, PerfilInstrumento> = {
  who5: {
    rotulo: 'como você tem se sentido',
    chamada: ['Como você tem', 'se sentido?'],
    perguntas: 5,
    minutos: 2,
    sobre: 'como você tem se sentido nas últimas duas semanas',
    beneficio: 'acompanhar se o clima está melhorando ou piorando ao longo do ano',
  },
  jss: {
    rotulo: 'como está o seu trabalho no dia a dia',
    chamada: ['Como está o seu', 'trabalho no dia a dia?'],
    perguntas: 17,
    minutos: 5,
    sobre: 'ritmo, cobrança, autonomia para decidir e apoio de colegas e chefia',
    beneficio: 'mostrar o que no dia a dia do trabalho precisa mudar',
  },
};

const PERFIL_PADRAO: PerfilInstrumento = {
  rotulo: 'como está o seu trabalho',
  chamada: ['A sua opinião', 'sobre o trabalho'],
  perguntas: 0,
  minutos: 5,
  sobre: 'sua percepção sobre o trabalho',
  beneficio: 'orientar as melhorias do próximo período',
};

export const perfilDe = (instrumento: string): PerfilInstrumento =>
  PERFIS[instrumento] ?? PERFIL_PADRAO;

export type DadosKit = {
  empresa: string;
  /** Código do instrumento (`who5`, `jss`). */
  instrumento: string;
  setor: string;
  url: string;
  /** Fim da janela, já formatado em pt-BR. */
  prazo: string;
};

export type PecaKit = {
  id: 'whatsapp' | 'email' | 'reuniao';
  titulo: string;
  /** Quando usar — a escolha do canal muda mais a adesão que o texto. */
  quando: string;
  /** Só o e-mail tem assunto. */
  assunto?: string;
  texto: string;
};

const frasesDeTempo = (p: PerfilInstrumento) =>
  p.perguntas > 0
    ? `São ${p.perguntas} perguntas, leva cerca de ${p.minutos} minutos`
    : `Leva cerca de ${p.minutos} minutos`;

// ── As três peças ──────────────────────────────────────

/**
 * Grupo de WhatsApp. É o canal que alcança quem não tem e-mail corporativo,
 * e por isso é o primeiro. Curto de propósito: mensagem longa em grupo é
 * rolada sem ler.
 */
function pecaWhatsapp(d: DadosKit): PecaKit {
  const p = perfilDe(d.instrumento);
  return {
    id: 'whatsapp',
    titulo: 'Mensagem para o grupo de WhatsApp',
    quando: 'Alcança quem não tem e-mail corporativo. Mande pela manhã, no primeiro dia.',
    texto:
      `Pessoal, a ${d.empresa} abriu uma pesquisa sobre ${p.sobre}.\n\n` +
      `${frasesDeTempo(p)} e é anônima de verdade: não pede login, não pergunta seu nome ` +
      `e ninguém aqui consegue ver a resposta de uma pessoa — só o resultado do setor ` +
      `inteiro, somado.\n\n` +
      `Responder é opcional. Mas é com isso que a gente decide o que mudar no próximo ` +
      `período, então sua resposta pesa.\n\n` +
      `${d.url}\n\n` +
      `Fica aberta até ${d.prazo}. Dá para responder pelo celular, sem instalar nada. ` +
      `Se preferir ouvir as perguntas em vez de ler, tem um botão de áudio em cada uma.`,
  };
}

/** E-mail interno. Mais espaço para explicar o porquê e o que acontece depois. */
function pecaEmail(d: DadosKit): PecaKit {
  const p = perfilDe(d.instrumento);
  return {
    id: 'email',
    titulo: 'E-mail interno',
    quando: 'Para quem tem e-mail corporativo. Bom para registrar formalmente o convite.',
    assunto: `Pesquisa sobre ${p.rotulo} — aberta até ${d.prazo}`,
    texto:
      `Olá,\n\n` +
      `A ${d.empresa} está ouvindo as equipes sobre ${p.sobre}. A participação é ` +
      `voluntária e leva cerca de ${p.minutos} minutos.\n\n` +
      `Responder aqui: ${d.url}\n` +
      `A pesquisa fica aberta até ${d.prazo}.\n\n` +
      `COMO O SIGILO FUNCIONA\n` +
      `O questionário não pede login e não pergunta seu nome. A única informação que ` +
      `acompanha a resposta é o setor. Os resultados só aparecem somados, e um setor com ` +
      `menos de cinco respostas não é exibido separadamente — justamente para que ninguém ` +
      `seja identificável pelo tamanho do grupo. Nem a área de RH nem a empresa que ` +
      `fornece a plataforma têm acesso a respostas individuais.\n\n` +
      `POR QUE ESTAMOS PERGUNTANDO\n` +
      `A empresa precisa avaliar periodicamente os fatores do trabalho que afetam a saúde ` +
      `das pessoas. Isso serve para ${p.beneficio}. O resultado consolidado será ` +
      `apresentado às equipes, e o que for definido a partir dele vira compromisso com ` +
      `prazo e responsável.\n\n` +
      `Se preferir ouvir as perguntas em vez de lê-las, cada uma tem um botão de áudio. ` +
      `Funciona no navegador do celular, sem instalar aplicativo.\n\n` +
      `Obrigado pelo tempo.`,
  };
}

/**
 * Fala de abertura de turno ou reunião. Existe porque em operação com chão
 * de fábrica a mensagem escrita não chega: quem vai converter é a liderança
 * direta falando trinta segundos antes do trabalho começar — e ela precisa
 * saber o que NÃO dizer tanto quanto o que dizer.
 */
function pecaReuniao(d: DadosKit): PecaKit {
  const p = perfilDe(d.instrumento);
  return {
    id: 'reuniao',
    titulo: 'Fala de 30 segundos para a liderança',
    quando: 'Na abertura do turno ou da reunião de equipe. É o que mais converte em operação.',
    texto:
      `Para ler ou adaptar:\n\n` +
      `"Abriu uma pesquisa sobre ${p.sobre}. São ${p.perguntas} perguntas, uns ` +
      `${p.minutos} minutos, pelo celular de vocês. Está no cartaz ali — é só apontar a ` +
      `câmera no QR.\n\n` +
      `Ninguém precisa fazer login e ninguém digita o nome. Eu não vejo o que cada um ` +
      `respondeu, e nem o RH vê. O que chega é o resultado do setor todo junto.\n\n` +
      `Quem não quiser responder, não tem problema nenhum e não vou perguntar quem ` +
      `respondeu. Fica aberto até ${d.prazo}."\n\n` +
      `— Combinados com quem for falar:\n` +
      `· Não perguntar depois quem respondeu, nem cobrar individualmente. Além de ` +
      `constranger, invalida o resultado.\n` +
      `· Não pedir para responder na frente de outras pessoas nem em equipamento ` +
      `compartilhado.\n` +
      `· Dar o tempo dentro da jornada, não pedir que respondam no intervalo ou em casa.`,
  };
}

export function pecasDoKit(d: DadosKit): PecaKit[] {
  return [pecaWhatsapp(d), pecaEmail(d), pecaReuniao(d)];
}

// ── Perguntas que a equipe faz ─────────────────────────
//
// Adaptado do que já está em `/rh/nr1`, mas com a virada que importa:
// naquela página o RH é quem pergunta, aqui ele é quem responde. Sem isto,
// a primeira pergunta difícil no corredor trava a divulgação inteira.

export type DuvidaEquipe = { pergunta: string; resposta: string };

export const DUVIDAS_DA_EQUIPE: DuvidaEquipe[] = [
  {
    pergunta: 'Isso é anônimo mesmo? Como eu sei?',
    resposta:
      'O questionário não pede login e não tem campo de nome — a única coisa gravada junto '
      + 'da resposta é o setor. E o resultado de um setor só aparece se pelo menos cinco '
      + 'pessoas dele responderem; abaixo disso o sistema simplesmente não mostra, para que '
      + 'ninguém seja identificável por eliminação.',
  },
  {
    pergunta: 'Se eu falar mal da minha chefia, ela vai saber?',
    resposta:
      'Não. Ninguém recebe resposta individual — nem você, nem eu, nem a diretoria. O que a '
      + 'liderança recebe é o resultado do setor somado, junto com a orientação de tratar '
      + 'isso como informação sobre o trabalho, não sobre pessoas.',
  },
  {
    pergunta: 'Isso vai ser usado para demitir alguém ou em avaliação?',
    resposta:
      'Não. O resultado é do setor, não da pessoa, e nem chega em formato que permitiria '
      + 'isso. A finalidade é identificar o que no trabalho precisa mudar — é uma exigência '
      + 'de saúde e segurança, e fica separada de qualquer avaliação de desempenho.',
  },
  {
    pergunta: 'Sou obrigado a responder?',
    resposta:
      'Não. É voluntário e não haverá cobrança de quem não responder. Também não vamos '
      + 'divulgar lista de quem respondeu, porque essa lista não existe.',
  },
  {
    pergunta: 'Não tenho o aplicativo. Consigo responder?',
    resposta:
      'Sim. O link abre direto no navegador do celular, sem instalar nada e sem criar conta. '
      + 'Também dá para responder pelo QR do cartaz.',
  },
  {
    pergunta: 'Tenho dificuldade para ler. E agora?',
    resposta:
      'Cada pergunta tem um botão para ouvir em voz alta, e aparece uma pergunta por vez, '
      + 'com figuras nas opções de resposta. Se ainda assim ficar difícil, me procure que a '
      + 'gente vê um jeito — sem que ninguém veja o que você respondeu.',
  },
  {
    pergunta: 'Já respondi mês passado. De novo?',
    resposta:
      'Sim, e é de propósito. Uma medição isolada só mostra um retrato; repetindo é que dá '
      + 'para ver se o que a gente mudou funcionou. Por isso as perguntas são parecidas.',
  },
  {
    pergunta: 'O que vai acontecer com o resultado?',
    resposta:
      'O resultado consolidado volta para as equipes, e a partir dele são definidas ações '
      + 'com responsável e prazo. Você vai ouvir falar do que saiu daqui — se não ouvir, '
      + 'pode cobrar.',
  },
];

/** As dúvidas em texto corrido, para o RH colar num documento ou e-mail. */
export const duvidasComoTexto = (): string =>
  ['PERGUNTAS FREQUENTES SOBRE A PESQUISA', '']
    .concat(DUVIDAS_DA_EQUIPE.flatMap(d => [d.pergunta, d.resposta, '']))
    .join('\n')
    .trim();
