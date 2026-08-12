-- =====================================================
-- Malama — Termos de Uso do Painel do RH, versão 1.1
-- Migration: 20260830_termos_painel_rh_v1_1.sql
--
-- Aplicar via SQL Editor, depois de 20260829.
--
-- POR QUE VERSÃO NOVA E NÃO EDIÇÃO DA 1.0
--   A 1.0 pode já ter ciência registrada. Reescrever o texto dela faria o
--   registro apontar para um documento diferente do que estava valendo no
--   momento da ciência — que é exatamente o que o versionamento existe para
--   impedir. Então: a 1.0 é baixada (vigente = FALSE), a 1.1 entra vigente, e
--   os aceites da 1.0 ficam intactos como prova do que valeu até aqui.
--   A ciência automática da 1.1 é registrada no próximo acesso ao painel.
--
-- O QUE MUDA NA 1.1
--   6.1  — o piso de coorte descrito como ele REALMENTE funciona. A versão
--          anterior dizia apenas "suprimidos", e o produto faz duas coisas:
--          suprime (matriz, absenteísmo, JSS) ou reúne em "Demais setores"
--          (participação por campanha), inclusive suprimindo o próprio balde
--          quando ele não alcança o piso. Termo que descreve menos do que o
--          sistema faz é termo que não protege.
--   7.3  — NOVA. Responsabilidade civil exclusiva da Empresa pela inferência
--          por convivência: setor pequeno com afastamento conhecido pode
--          tornar um indicador atribuível a alguém, e nenhuma agregação
--          estatística impede quem convive com a operação de deduzir.
--   9.2  — formato da devolução dos dados (CSV ou JSON).
--   11.3 — NOVA. A plataforma dá indicador, não diagnóstico ocupacional: ASO,
--          PCMSO e PGR seguem com os profissionais habilitados da Empresa.
-- =====================================================

-- Só pode haver um vigente por tipo (índice parcial): baixa a anterior antes.
UPDATE documentos_legais
   SET vigente = FALSE
 WHERE tipo = 'termos_b2b' AND empresa_id IS NULL AND vigente;

INSERT INTO documentos_legais
  (tipo, versao, titulo, conteudo, exige_aceite, vigente, publicado_em)
SELECT
  'termos_b2b', '1.1',
  'Termos de Uso do Painel do RH — Empresa Contratante',
  $doc$TERMOS DE USO DO PAINEL DO RH — EMPRESA CONTRATANTE

Estes Termos regem o uso do Painel do RH da plataforma Malama pela empresa contratante ("Empresa") e o tratamento dos dados que a Empresa insere, importa ou gera nesse painel. Não se confundem com os Termos de Uso do aplicativo, que regem a relação entre a Malama e cada colaborador enquanto usuário.

1. OBJETO

1.1. A Malama Healthtech ("Malama") disponibiliza à Empresa um painel de gestão para administrar os assentos contratados, acompanhar indicadores agregados de saúde e bem-estar e produzir evidência documental de gestão de riscos psicossociais.

1.2. O uso do painel pressupõe contrato comercial vigente. Assentos, valores, vigência e escopo contratado constam do contrato e são exibidos no painel apenas para consulta.

2. PAPÉIS DAS PARTES NO TRATAMENTO DE DADOS

Esta é a cláusula central destes Termos. A plataforma reúne dois fluxos de dados com responsáveis distintos, e a distinção define quem responde perante o colaborador.

2.1. DADOS INSERIDOS PELA EMPRESA. Em relação aos dados que a Empresa cadastra, importa ou lança no painel — descritos na seção 3 — a Empresa é a CONTROLADORA e a Malama atua como OPERADORA, tratando esses dados exclusivamente conforme estes Termos e as instruções da Empresa (Lei nº 13.709/2018, art. 5º, VI e VII).

2.2. DADOS GERADOS PELO COLABORADOR NO APLICATIVO. Em relação aos dados que o colaborador produz ao usar o aplicativo — registros alimentares, medidas corporais, respostas a instrumentos de saúde, atendimentos de telemedicina e conteúdo clínico em geral — a Malama é a CONTROLADORA perante o titular, com base no consentimento e demais bases legais aplicáveis à tutela da saúde. A Empresa NÃO tem acesso a esses dados de forma identificada, em nenhuma hipótese, nem mediante solicitação.

2.3. A Empresa não adquire, por força destes Termos ou do contrato, qualquer direito de acesso individualizado ao conteúdo clínico de seus colaboradores. O que a Empresa recebe são indicadores agregados, nos limites da seção 6.

3. DADOS QUE A EMPRESA INSERE NO PAINEL

3.1. Cadastro de colaborador: nome, e-mail, telefone/WhatsApp, CPF, setor e função. O CPF é opcional e serve exclusivamente para vincular eventos de afastamento ao cadastro.

3.2. Registros de afastamento, lançados manualmente ou importados de eventos do eSocial: a plataforma armazena somente SETOR, CAPÍTULO do CID (a letra) e DURAÇÃO em dias. Não são armazenados nome, CPF nem o código de diagnóstico completo. Na importação, o CPF do arquivo é utilizado apenas para resolver o setor correspondente e é descartado ao final do processamento.

3.3. Registros de ambulatório: setor, categoria de queixa (lista fechada) e data. Não identificam pessoa e não constituem prontuário.

3.4. Plano de ação de riscos psicossociais: descrição do risco, medida de controle, nível de controle, responsável interno pela execução, prazo e evidência de conclusão.

3.5. Campanhas de avaliação: instrumento, janela e setores destinatários. As respostas dos colaboradores não são inseridas pela Empresa e não lhe são acessíveis individualmente.

3.6. Dados cadastrais da própria Empresa e do responsável pela conta.

4. RESPONSABILIDADES DA EMPRESA

4.1. BASE LEGAL E INFORMAÇÃO AOS TITULARES. A Empresa declara possuir base legal adequada para tratar os dados que insere no painel e é responsável por informar seus colaboradores, de forma clara e prévia, sobre o benefício, sobre quais dados são compartilhados com a Malama e para qual finalidade. A Malama não presume nem supre essa comunicação.

4.2. EXATIDÃO E ATUALIZAÇÃO. A Empresa é responsável pela veracidade e pela atualização dos dados inseridos, inclusive pelo desligamento tempestivo de colaboradores que deixaram o quadro.

4.3. MÍNIMO NECESSÁRIO. A Empresa compromete-se a inserir apenas os dados previstos na seção 3. É expressamente vedado inserir, em qualquer campo do painel, inclusive campos de texto livre: diagnóstico identificado, laudo, atestado, prontuário, código de CID completo associado a pessoa, dados de dependentes ou de terceiros sem vínculo, e qualquer dado sensível não previsto nestes Termos.

4.4. CONTAS DE ACESSO. A Empresa é responsável por quem recebe acesso ao painel, pela adequação desse acesso à função de cada pessoa e pela revogação imediata quando o vínculo ou a atribuição cessar. As credenciais são pessoais e intransferíveis.

4.5. FINALIDADE E VEDAÇÃO DE USO ADVERSO. Os indicadores fornecidos destinam-se à gestão de saúde ocupacional, ao cumprimento de obrigações de segurança e saúde no trabalho e à melhoria das condições de trabalho. A Empresa compromete-se a NÃO utilizar qualquer informação obtida no painel para decisão adversa individual — desligamento, sanção disciplinar, alteração de remuneração, exclusão de promoção ou processo seletivo — nem para constranger, expor ou retaliar colaborador em razão de participação, não participação ou conteúdo de resposta a qualquer instrumento.

4.6. A violação da cláusula 4.5 autoriza a Malama a suspender o acesso ao painel, sem prejuízo das demais medidas cabíveis.

5. RESPONSABILIDADES DA MALAMA

5.1. Tratar os dados da seção 3 apenas para as finalidades destes Termos e do contrato, e não utilizá-los para finalidade própria diversa, ressalvada a produção de estatísticas agregadas e irreversivelmente anonimizadas.

5.2. Manter medidas técnicas e administrativas de segurança compatíveis com a natureza dos dados, incluindo controle de acesso por perfil, segregação por empresa e registro de operações relevantes.

5.3. Aplicar, nos relatórios entregues à Empresa, os limites de agregação descritos na seção 6.

5.4. Auxiliar a Empresa, na medida de sua atuação como operadora, no atendimento a requisições de titulares e de autoridades.

6. O QUE A EMPRESA VÊ E O QUE NÃO VÊ

6.1. Todo indicador de saúde, bem-estar ou risco psicossocial é entregue de forma AGREGADA, sujeito a piso mínimo de coorte, atualmente de 5 (cinco) pessoas. Recorte que não alcance o piso nunca é exibido isoladamente: conforme o relatório, ele é SUPRIMIDO — como ocorre na matriz de risco, no absenteísmo e nos relatórios de fatores ocupacionais — ou REUNIDO a uma linha agregada denominada "Demais setores", como ocorre nos indicadores de participação em campanhas. A própria linha agregada é suprimida quando também não alcançar o piso. A regra prevalece ainda que reduza a granularidade da análise, e sua finalidade é assegurar que nenhum recorte permita identificar indivíduo.

6.2. A Empresa não tem acesso, individualizado ou nominal, a: respostas a instrumentos de avaliação, conteúdo de consultas, registros alimentares ou corporais, prescrições, diagnósticos, ou qualquer informação que permita identificar a situação de saúde de colaborador determinado.

6.3. O painel informa quem tem acesso liberado ao benefício e desde quando — dado de elegibilidade, necessário à gestão contratual. Não informa uso, adesão, frequência nem conteúdo.

6.4. A Empresa reconhece que a supressão de recortes pequenos e a ausência de dado individual são características deliberadas do produto, e não falhas ou limitações a serem contornadas.

7. CONFIDENCIALIDADE E VEDAÇÃO DE REIDENTIFICAÇÃO

7.1. Os relatórios agregados são confidenciais e destinam-se ao uso interno da Empresa para as finalidades da cláusula 4.5, admitida a apresentação a auditoria, fiscalização ou órgão de controle quando exigido.

7.2. A Empresa compromete-se a não divulgar internamente recortes de forma que permita, por cruzamento com informação que já detenha, inferir a situação individual de colaborador.

7.3. INFERÊNCIA POR CONVIVÊNCIA. A Empresa reconhece que a agregação estatística reduz, mas não elimina, a possibilidade de inferência por quem convive com o dia a dia da operação — a título de exemplo, um setor de poucas pessoas em que um afastamento seja de conhecimento interno pode tornar um indicador atribuível a pessoa determinada. A Empresa obriga-se a não realizar tal inferência, a não estimulá-la, a não registrá-la e a não extrair dela qualquer decisão ou tratamento diferenciado. A responsabilidade civil e administrativa decorrente de reidentificação, divulgação ou uso de informação assim obtida é EXCLUSIVA da Empresa, ainda que o dado agregado tenha sido licitamente disponibilizado no painel, não se estendendo à Malama, que cumpriu os limites da seção 6.

8. SUBOPERADORES

8.1. A Malama utiliza fornecedores de infraestrutura, comunicação e processamento para prestar o serviço, obrigando-os contratualmente a padrão de proteção compatível com estes Termos.

8.2. A relação de suboperadores relevantes é disponibilizada à Empresa mediante solicitação ao contato da seção 13.

9. RETENÇÃO E ELIMINAÇÃO

9.1. Os dados inseridos pela Empresa são mantidos enquanto vigente o contrato.

9.2. Encerrado o contrato, a Empresa pode solicitar, em até 30 (trinta) dias, a devolução dos dados que inseriu, em formato estruturado e interoperável de uso corrente, como CSV ou JSON, acompanhado da descrição dos campos. Findo esse prazo, eles são eliminados, salvo o que a Malama deva conservar por obrigação legal ou regulatória.

9.3. A remoção de colaborador do painel encerra o acesso corporativo dele ao benefício e libera o assento. Não apaga os dados que o colaborador gerou como usuário do aplicativo, que seguem sob a relação dele com a Malama e sob os direitos que ele exerce diretamente.

9.4. Registros já agregados e irreversivelmente anonimizados, bem como documentos de evidência emitidos, não são revertidos por não constituírem dados pessoais.

10. INCIDENTES DE SEGURANÇA

10.1. A Malama comunicará a Empresa, sem demora injustificada e em até 72 (setenta e duas) horas da ciência, sobre incidente de segurança que possa acarretar risco ou dano relevante aos dados tratados por conta dela, com as informações disponíveis e as medidas adotadas.

10.2. A comunicação a titulares e à Autoridade Nacional de Proteção de Dados, quando cabível em relação aos dados da seção 3, é atribuição da Empresa na qualidade de controladora, com o apoio da Malama.

11. AUDITORIA, EVIDÊNCIA E LIMITES TÉCNICOS

11.1. A Malama disponibiliza no painel documentos de evidência — relatórios agregados e certificados de disponibilização do benefício — destinados a comprovar diligência da Empresa perante fiscalização.

11.2. Esses documentos refletem os dados existentes na plataforma na data de emissão e não substituem os registros próprios da Empresa nem laudo de profissional habilitado.

11.3. AUSÊNCIA DE DIAGNÓSTICO OCUPACIONAL. A plataforma produz INDICADORES destinados a apoiar a identificação e a gestão de riscos psicossociais. Não realiza diagnóstico ocupacional, não emite Atestado de Saúde Ocupacional, não elabora nem valida Programa de Controle Médico de Saúde Ocupacional (PCMSO), Programa de Gerenciamento de Riscos (PGR) ou inventário de riscos, e não substitui avaliação de médico do trabalho, engenheiro ou técnico de segurança do trabalho. A definição, a implementação, a validação técnica e a assinatura dos documentos legais de medicina e segurança do trabalho permanecem sob responsabilidade exclusiva dos profissionais habilitados da Empresa, que respondem tecnicamente por eles.

12. VIGÊNCIA, ALTERAÇÕES E ACEITE

12.1. Estes Termos vigoram enquanto durar o acesso da Empresa ao painel.

12.2. O acesso ao Painel do RH é concedido no âmbito do contrato firmado com a Empresa. O registro de ciência destes Termos é gravado eletronicamente no acesso ao painel, com a versão do documento, data e hora e identificação do usuário autenticado. A Empresa pode, a qualquer tempo, registrar aceite formal, hipótese em que ficam consignados também o nome e o cargo de quem aceita, cabendo à Empresa assegurar que essa pessoa detém poderes para obrigá-la.

12.3. Alterações materiais dão origem a nova versão, submetida a novo registro. O registro das versões anteriores e de suas ciências e aceites é preservado.

13. LEGISLAÇÃO, FORO E CONTATO

13.1. Estes Termos são regidos pela legislação brasileira, em especial a Lei nº 13.709/2018.

13.2. Fica eleito o foro da comarca de Taubaté, Estado de São Paulo, para dirimir controvérsias oriundas destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.

13.3. Contato do Encarregado pelo Tratamento de Dados Pessoais: privacidade@soumalama.com.br
$doc$,
  TRUE, TRUE, CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM documentos_legais
   WHERE tipo = 'termos_b2b' AND empresa_id IS NULL AND versao = '1.1'
);
