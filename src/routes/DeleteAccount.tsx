import React, { useState } from 'react';

export const DeleteAccount: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent('Solicitação de exclusão de conta e dados');
    const body = encodeURIComponent(
      `Olá,\n\nSolicito a exclusão completa da minha conta e de todos os meus dados pessoais armazenados no Malama.\n\nE-mail da conta: ${email}\n\nAtenciosamente.`
    );
    window.location.href = `mailto:privacidade@soumalama.com.br?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <header className="bg-[#7d4a3c] text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/joao_de_barro_gravura.svg" alt="Malama" className="w-8 h-8 brightness-0 invert" />
          <span className="text-xl font-semibold">Malama</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-[#7d4a3c]">Excluir minha conta</h1>
        <p className="text-sm text-gray-500 mb-8">Solicitação de exclusão de conta e dados pessoais</p>

        {!submitted ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-amber-800">
                <strong>Atenção:</strong> a exclusão é permanente e irreversível. Todos os seus dados serão removidos em até <strong>30 dias</strong>, incluindo:
              </p>
              <ul className="list-disc list-inside text-sm text-amber-800 mt-2 space-y-1">
                <li>Perfil e dados de saúde</li>
                <li>Histórico de refeições</li>
                <li>Histórico de consultas</li>
                <li>Planos alimentares gerados</li>
                <li>Dados de progresso e conquistas</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail da sua conta Malama
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#7d4a3c] text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#6a3e32] transition"
              >
                Solicitar exclusão da conta
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-6 text-center">
              Ao enviar, abriremos seu cliente de e-mail com a solicitação pronta para envio.
              Você também pode escrever diretamente para{' '}
              <a href="mailto:privacidade@soumalama.com.br" className="text-[#7d4a3c] underline">
                privacidade@soumalama.com.br
              </a>
            </p>
          </>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-lg font-semibold text-green-800 mb-2">Solicitação enviada</h2>
            <p className="text-sm text-green-700">
              Processaremos sua solicitação em até <strong>30 dias</strong>. Você receberá uma confirmação no e-mail informado.
            </p>
          </div>
        )}
      </main>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 py-6 px-4 mt-12">
        © {new Date().getFullYear()} Malama Healthtech. Todos os direitos reservados.{' '}
        <a href="/privacidade" className="text-[#7d4a3c] underline">Política de Privacidade</a>
      </footer>
    </div>
  );
};
