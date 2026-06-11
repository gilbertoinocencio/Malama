import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <header className="bg-[#7d4a3c] text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/joao_de_barro_gravura.svg" alt="Malama" className="w-8 h-8 brightness-0 invert" />
          <span className="text-xl font-semibold">Malama</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-[#7d4a3c]">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-10">Última atualização: 11 de junho de 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Quem somos</h2>
          <p>O Malama é um aplicativo de saúde e nutrição desenvolvido por <strong>Malama Saúde Digital Ltda.</strong>, com sede no Brasil. Nosso objetivo é ajudar você a cuidar da sua alimentação, acompanhar sua saúde e conectar você a profissionais de saúde qualificados.</p>
          <p className="mt-2">Contato: <a href="mailto:privacidade@soumalama.com.br" className="text-[#7d4a3c] underline">privacidade@soumalama.com.br</a></p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Dados que coletamos</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Dados de cadastro:</strong> nome, endereço de e-mail e senha.</li>
            <li><strong>Dados de saúde:</strong> peso, altura, objetivos nutricionais, restrições alimentares, uso de medicamentos (ex: GLP-1), registros de refeições e fotos de alimentos.</li>
            <li><strong>Dados de consultas:</strong> histórico de consultas com médicos e nutricionistas agendadas pelo app.</li>
            <li><strong>Dados de uso:</strong> interações com o app, logs de acesso e preferências de configuração.</li>
            <li><strong>Dados de integração:</strong> caso você conecte sua conta ao Strava, recebemos dados de atividade física.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Como usamos seus dados</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Gerar planos alimentares personalizados com inteligência artificial.</li>
            <li>Permitir o agendamento e a realização de consultas por videochamada.</li>
            <li>Exibir seu progresso e métricas de saúde ao longo do tempo.</li>
            <li>Enviar lembretes e notificações relacionados à sua rotina de saúde.</li>
            <li>Melhorar continuamente os serviços do app.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de dados</h2>
          <p className="text-gray-700">Seus dados <strong>não são vendidos</strong> a terceiros. Podemos compartilhá-los apenas nas seguintes situações:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mt-2">
            <li>Com profissionais de saúde que você agendar pelo app, exclusivamente para fins de atendimento.</li>
            <li>Com provedores de infraestrutura (Supabase, Google Cloud) para operação do serviço, sob contrato de confidencialidade.</li>
            <li>Por obrigação legal ou ordem judicial.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Armazenamento e segurança</h2>
          <p className="text-gray-700">Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Adotamos controles de acesso rigorosos e seguimos as melhores práticas do setor.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Seus direitos (LGPD)</h2>
          <p className="text-gray-700">De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mt-2">
            <li>Acessar os dados que temos sobre você.</li>
            <li>Corrigir dados incompletos ou desatualizados.</li>
            <li>Solicitar a exclusão dos seus dados.</li>
            <li>Revogar o consentimento a qualquer momento.</li>
            <li>Portabilidade dos seus dados.</li>
          </ul>
          <p className="mt-3 text-gray-700">Para exercer esses direitos, entre em contato: <a href="mailto:privacidade@soumalama.com.br" className="text-[#7d4a3c] underline">privacidade@soumalama.com.br</a></p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Retenção e exclusão de dados</h2>

          <p className="text-gray-700"><strong>Por quanto tempo guardamos seus dados:</strong> mantemos seus dados pessoais apenas enquanto sua conta estiver ativa, para podermos prestar os serviços do app. Em detalhe:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mt-2">
            <li><strong>Dados de cadastro e de saúde</strong> (nome, e-mail, peso, altura, objetivos, restrições, uso de medicamentos): mantidos enquanto a conta estiver ativa.</li>
            <li><strong>Registros de refeições, fotos de alimentos e métricas:</strong> mantidos enquanto a conta estiver ativa, para exibir seu histórico e evolução.</li>
            <li><strong>Histórico de consultas:</strong> mantido pelo prazo exigido pela legislação de saúde aplicável.</li>
            <li><strong>Logs de acesso:</strong> mantidos por até 6 meses, conforme o Marco Civil da Internet (Lei nº 12.965/2014).</li>
          </ul>

          <p className="mt-4 text-gray-700"><strong>Como excluir seus dados:</strong> você pode solicitar a exclusão da sua conta e de todos os seus dados pessoais a qualquer momento, de duas formas:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mt-2">
            <li>Acessando a página de exclusão de conta em <a href="https://www.soumalama.com.br/deletar-conta" className="text-[#7d4a3c] underline">soumalama.com.br/deletar-conta</a> e preenchendo o formulário.</li>
            <li>Enviando um e-mail para <a href="mailto:privacidade@soumalama.com.br" className="text-[#7d4a3c] underline">privacidade@soumalama.com.br</a> com o assunto "Exclusão de conta".</li>
          </ul>

          <p className="mt-4 text-gray-700">Após a solicitação, todos os seus dados pessoais são <strong>excluídos permanentemente de nossos servidores em até 90 dias</strong>. Alguns dados podem ser retidos por prazo superior apenas quando houver obrigação legal (por exemplo, registros fiscais ou os logs de acesso citados acima). Concluída a exclusão, os dados não poderão ser recuperados.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Crianças e adolescentes</h2>
          <p className="text-gray-700">O Malama é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Alterações nesta política</h2>
          <p className="text-gray-700">Podemos atualizar esta política periodicamente. Notificaremos você por e-mail ou pelo próprio app sobre mudanças relevantes. O uso continuado do app após as alterações implica aceitação da nova versão.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
          <p className="text-gray-700">Dúvidas sobre esta política? Fale conosco:</p>
          <p className="mt-2 text-gray-700">
            E-mail: <a href="mailto:privacidade@soumalama.com.br" className="text-[#7d4a3c] underline">privacidade@soumalama.com.br</a><br />
            Site: <a href="https://www.soumalama.com.br" className="text-[#7d4a3c] underline">www.soumalama.com.br</a>
          </p>
        </section>
      </main>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 py-6 px-4">
        © {new Date().getFullYear()} Malama Saúde Digital. Todos os direitos reservados.
      </footer>
    </div>
  );
};
