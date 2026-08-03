import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <header className="bg-[#1a3a2e] text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/joao_de_barro_gravura.svg" alt="Malama" className="w-8 h-8 brightness-0 invert" />
            <span className="text-xl font-semibold tracking-wide">Malama</span>
          </div>
          <a href="/termos" className="text-xs uppercase tracking-wider text-[#74c69d] hover:underline font-medium">
            Termos de Uso →
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-[#1a3a2e]">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-10">Última atualização: 2 de agosto de 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">1. Quem somos</h2>
          <p className="leading-relaxed">
            O Malama é uma plataforma digital de saúde e nutrição desenvolvida por <strong>Malama Saúde Digital Ltda.</strong>, com sede no Brasil. Nosso objetivo é proporcionar acompanhamento nutricional inteligente, monitoramento de saúde e conexão com profissionais de saúde via telemedicina.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Contato do DPO / Privacidade: <a href="mailto:privacidade@soumalama.com.br" className="text-[#2d6a4f] underline font-medium">privacidade@soumalama.com.br</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">2. Dados que coletamos</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li><strong>Dados de cadastro:</strong> nome completo, e-mail e senha cadastrais.</li>
            <li><strong>Dados de saúde e metabólicos:</strong> peso, altura, metas nutricionais, diário alimentar, registros de sintomas, histórico de dosagens e adesão a tratamentos (ex: GLP-1).</li>
            <li><strong>Imagens e escaneamento corporal:</strong> fotos de refeições e modelos de silhueta corporal de <em>Body Scan</em> com remoção automatizada de face.</li>
            <li><strong>Dados de consultas:</strong> agendamentos e registros de atendimento de telemedicina.</li>
            <li><strong>Dados de uso e dispositivos:</strong> logs de segurança, dados de navegação e identificadores técnicos.</li>
            <li><strong>Integrações (opcionais):</strong> sincronização de treinos via Strava mediante permissão do Usuário.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">3. Como usamos seus dados</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li>Gerar planos alimentares e orientações nutricionais personalizadas por Inteligência Artificial (Malama AI).</li>
            <li>Permitir o acompanhamento diário de sintomas, saciedade e variação metabólica.</li>
            <li>Possibilitar agendamentos e atendimento via telemedicina com médicos e nutricionistas.</li>
            <li>Oferecer suporte especializado a usuários em protocolos específicos (ex: uso de GLP-1).</li>
            <li>Realizar <strong>pesquisas estatísticas, estudos empíricos e aprimoramento tecnológico</strong> com dados irreversivelmente anonimizados.</li>
          </ul>
        </section>

        <section className="mb-8 bg-[#f8f4ed] border-l-4 border-[#52b788] p-5 rounded-r-lg">
          <h2 className="text-xl font-semibold mb-3 text-[#1a3a2e]">4. Dados de Saúde e Anonimização para Pesquisa (LGPD)</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Dados de saúde são considerados sensíveis pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Para garantir total proteção à privacidade dos usuários ao mesmo tempo em que promovemos o avanço científico:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li><strong>Anonimização Irreversível:</strong> Desvinculamos permanentemente qualquer identificador pessoal (PII) dos registros clínicos e metabólicos antes de qualquer processamento estatístico.</li>
            <li><strong>Estudos e Benchmarks:</strong> Utilizamos dados agregados e desidentificados para conduzir estudos empíricos de eficácia, treinar algoritmos de IA e elaborar relatórios de saúde populacional sem expor individualidades.</li>
            <li><strong>Artigo 12 da LGPD:</strong> Nos termos da lei, dados irreversivelmente anonimizados deixam de ser dados pessoais. A solicitação de exclusão da conta elimina seus dados identificáveis, sem afetar o acervo de dados anonimizados incorporado aos estudos e modelos estatísticos da plataforma.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">5. Compartilhamento de dados</h2>
          <p className="text-gray-700 leading-relaxed">
            Seus dados pessoais <strong>não são vendidos</strong>. O compartilhamento ocorre apenas com profissionais de saúde agendados pelo próprio usuário, provedores de infraestrutura segura de nuvem (Supabase, Google Cloud) sob dever de confidencialidade ou mediante obrigação legal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">6. Retenção de dados</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Mantemos seus dados pessoais apenas pelo tempo necessário para as finalidades descritas nesta Política, enquanto sua conta estiver ativa. Após o encerramento da conta ou solicitação de exclusão:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li>Dados pessoais identificáveis (PII) são permanentemente excluídos dos nossos servidores ativos;</li>
            <li>Registros de atendimento e prontuários médicos podem ser mantidos pelo prazo regulatório exigido pelo Conselho Federal de Medicina (CFM);</li>
            <li>Logs de acesso e segurança são mantidos por até 6 meses, conforme exigido pelo Marco Civil da Internet (Lei nº 12.965/2014);</li>
            <li>Dados irreversivelmente anonimizados e estatísticas de pesquisa são mantidos indefinidamente para fins científicos e de aprimoramento de IA, não sendo mais considerados dados pessoais nos termos do Art. 12 da LGPD.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">7. Seus Direitos (LGPD)</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Você possui pleno direito de acessar, corrigir, portar ou solicitar a exclusão de seus dados pessoais identificáveis a qualquer momento.
          </p>
          <p className="text-sm text-gray-600">
            Para exercer seus direitos ou solicitar esclarecimentos, entre em contato via <a href="mailto:privacidade@soumalama.com.br" className="text-[#2d6a4f] underline font-medium">privacidade@soumalama.com.br</a> ou pela página de <a href="/deletar-conta" className="text-[#2d6a4f] underline font-medium">Exclusão de Conta</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-[#2d6a4f]">8. Contato</h2>
          <p className="text-gray-700">
            E-mail: <a href="mailto:privacidade@soumalama.com.br" className="text-[#2d6a4f] underline font-medium">privacidade@soumalama.com.br</a><br />
            Website: <a href="https://www.soumalama.com.br" className="text-[#2d6a4f] underline font-medium">www.soumalama.com.br</a>
          </p>
        </section>
      </main>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 py-6 px-4">
        © {new Date().getFullYear()} Malama Saúde Digital. Todos os direitos reservados.
      </footer>
    </div>
  );
};
