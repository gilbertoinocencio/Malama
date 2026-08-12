import React from 'react';

export const TermsOfUse: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <header className="bg-[#1a3a2e] text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/joao_de_barro_gravura.svg" alt="Malama" className="w-8 h-8 brightness-0 invert" />
            <span className="text-xl font-semibold tracking-wide">Malama</span>
          </div>
          <a href="/privacidade" className="text-xs uppercase tracking-wider text-[#74c69d] hover:underline font-medium">
            Política de Privacidade →
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
          <h1 className="text-3xl font-bold text-[#1a3a2e]">Termos de Uso</h1>
          <span className="px-3 py-1 bg-[#1a3a2e]/10 text-[#1a3a2e] text-xs font-semibold rounded-full">
            LGPD & CFM Compliant
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-10">Última atualização: 21 de julho de 2026</p>

        <section className="mb-8">
          <p className="leading-relaxed text-gray-700">
            Estes Termos de Uso ("Termos") regem o acesso e a utilização dos serviços oferecidos pela <strong>Malama Healthtech</strong> ("Malama"). Ao cadastrar-se ou utilizar nossa plataforma, você declara ter lido, compreendido e concordado com as condições aqui estabelecidas.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">1. Descrição do Serviço</h2>
          <p className="leading-relaxed text-gray-700">
            O Malama oferece uma experiência completa em saúde digital e nutrição, que inclui:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mt-2 leading-relaxed">
            <li>Análise inteligente de refeições e plano alimentar via Inteligência Artificial (Malama AI).</li>
            <li>Monitoramento diário de hábitos, sintomas e ingestão hídrica (*Daily Check-ins*).</li>
            <li>Acompanhamento dedicado para protocolos específicos (incluindo tratamento com agonistas GLP-1).</li>
            <li>Escaneamento corporal 3D (*Body Scan*) para acompanhamento visual da evolução física.</li>
            <li>Intermediação tecnológica para agendamento de consultas via telemedicina.</li>
          </ul>
        </section>

        <section className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-lg">
          <h2 className="text-xl font-semibold mb-2 text-amber-900">2. Caráter Informativo e Telemedicina</h2>
          <p className="text-amber-800 leading-relaxed">
            As orientações geradas pela inteligência artificial do Malama possuem caráter exclusivamente educativo e informativo, <strong>não substituindo consultas, diagnósticos ou prescrições médicas</strong>. As consultas de telemedicina são conduzidas por profissionais de saúde independentes cadastrados, sendo estes integralmente responsáveis pelos atos técnicos prestados.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">3. Elegibilidade e Conta</h2>
          <p className="leading-relaxed text-gray-700">
            Você deve ter pelo menos 18 anos para utilizar a plataforma. Você é responsável pela veracidade dos dados informados e por manter a segurança e o sigilo de suas credenciais de acesso.
          </p>
        </section>

        <section className="mb-8 bg-[#f8f4ed] border-l-4 border-[#52b788] p-5 rounded-r-lg">
          <h2 className="text-xl font-semibold mb-3 text-[#1a3a2e]">
            4. Dados Clínicos Anonimizados, Estudos Empíricos e IA (LGPD)
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Para impulsionar a pesquisa científica em saúde digital e garantir o aprimoramento contínuo dos nossos modelos nutricionais e algoritmos:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li><strong>Uso Científico e Tecnológico:</strong> O Usuário autoriza o Malama a utilizar seus dados clínicos, sintomáticos, metabólicos e antropométricos de forma <strong>irreversivelmente anonimizada</strong> para a realização de estudos estatísticos, pesquisas empíricas, publicação de relatórios de saúde e treinamento de modelos de inteligência artificial.</li>
            <li><strong>Desidentificação Absoluta:</strong> Todos os dados são desvinculados permanentemente de informações pessoais identificáveis (como nome, e-mail e CPF), tornando tecnicamente impossível a reidentificação do usuário.</li>
            <li><strong>Artigo 12 da LGPD:</strong> Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), dados irreversivelmente anonimizados não são considerados dados pessoais. A exclusão de conta remove os dados pessoais cadastrais, mantendo-se os acervos estatísticos anonimizados para aprimoramento e estudos da plataforma por prazo indeterminado.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">5. Regras da Comunidade e Moderação</h2>
          <p className="leading-relaxed text-gray-700">
            Adotamos política de <strong>tolerância zero</strong> contra discursos de ódio, assédio, incitação a transtornos alimentares ou divulgação de desinformação médica. Conteúdos inadequados podem ser denunciados diretamente no aplicativo e serão analisados em até 24 horas para remoção e eventual suspensão de conta.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">6. Encerramento e Exclusão de Conta</h2>
          <p className="leading-relaxed text-gray-700 mb-2">
            Você pode solicitar o encerramento e a exclusão permanente de seus dados pessoais a qualquer momento através do aplicativo ou visitando <a href="/deletar-conta" className="text-[#2d6a4f] underline font-medium">soumalama.com.br/deletar-conta</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">7. Legislação e Foro</h2>
          <p className="leading-relaxed text-gray-700">
            Estes Termos são regidos pela legislação da República Federativa do Brasil, ficando eleito o foro do domicílio do Usuário para dirimir eventuais controvérsias.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">8. Contato</h2>
          <p className="text-gray-700">
            Para dúvidas jurídicas ou de privacidade: <a href="mailto:privacidade@soumalama.com.br" className="text-[#2d6a4f] underline font-medium">privacidade@soumalama.com.br</a>
          </p>
        </section>
      </main>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 py-6 px-4">
        © {new Date().getFullYear()} Malama Healthtech. Todos os direitos reservados.
      </footer>
    </div>
  );
};
