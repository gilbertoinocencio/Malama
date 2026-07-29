// =====================================================
// Malama — Integração Asaas (admin)
//
// A cobrança B2B inteira depende de um webhook invisível: se o Asaas parar de
// entregar evento, nada dá erro na tela — as faturas simplesmente deixam de
// ser quitadas e os créditos deixam de ser emitidos, em silêncio.
//
// Esta tela existe para dar um lugar onde isso aparece.
//
// Nenhuma credencial do Asaas passa por aqui: API key e segredo do webhook
// vivem como secrets de Edge Function e nunca chegam ao navegador. O painel
// mostra apenas SE estão configurados.
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Check, Copy, Link2, MinusCircle,
  RefreshCw, ShieldCheck, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getIntegracaoStatus, getWebhookSaude, webhookUrl,
  type IntegracaoStatus, type WebhookSaude,
} from '../../services/integracaoService';

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

/** Status com ícone + rótulo: nunca só cor. */
const STATUS_VISUAL = {
  ok:       { Icon: Check,       cor: 'text-emerald-700 bg-emerald-50', rotulo: 'OK' },
  erro:     { Icon: X,           cor: 'text-red-700 bg-red-50',         rotulo: 'Erro' },
  ignorado: { Icon: MinusCircle, cor: 'text-gray-600 bg-gray-100',      rotulo: 'Ignorado' },
} as const;

const LinhaSaude: React.FC<{ ok: boolean; label: string; detalhe: string }> = ({
  ok, label, detalhe,
}) => (
  <div className="flex items-start gap-3 py-2">
    <span
      className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
        ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {ok ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
    </span>
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className="text-xs text-gray-500">{detalhe}</p>
    </div>
  </div>
);

export const IntegracaoAsaas: React.FC = () => {
  const [status, setStatus] = useState<IntegracaoStatus | null>(null);
  const [saude, setSaude] = useState<WebhookSaude | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    try {
      const [s, h] = await Promise.all([getIntegracaoStatus(20), getWebhookSaude()]);
      setStatus(s);
      setSaude(h);
    } catch (e) {
      console.error('Erro ao carregar integração:', e);
      toast.error('Não foi possível carregar o status da integração.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  const copiarUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl());
      toast.success('URL copiada.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.');
    }
  };

  const eventos = status?.eventos ?? [];
  const erros7d = status?.erros_7d ?? 0;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Integração Asaas</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Cobrança das empresas e emissão automática dos créditos de consulta. A chave de
            API e o segredo do webhook ficam como secrets da Edge Function — não são exibidos
            nem editáveis por aqui, nem para o admin.
          </p>
        </div>
        <button
          onClick={() => void carregar()}
          disabled={carregando}
          className="shrink-0 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Falha de emissão de créditos é o pior silêncio do fluxo: a empresa
          pagou, ficou ativa, e os colaboradores abrem o app sem consulta. */}
      {erros7d > 0 && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{erros7d}</strong> {erros7d === 1 ? 'evento falhou' : 'eventos falharam'} nos
            últimos 7 dias. Se houver <code className="text-xs">CREDITOS_NAO_EMITIDOS</code> na
            lista abaixo, a empresa pagou mas os colaboradores estão sem consulta — reemita os
            créditos no painel da empresa.
          </p>
        </div>
      )}

      {/* ── URL do webhook ─────────────────────────────────────────── */}
      <div className="mt-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL do webhook
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Cadastre no Asaas em Integrações → Webhooks, com o mesmo token definido no secret
          <code className="mx-1 text-xs">ASAAS_WEBHOOK_SECRET</code>.
        </p>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50">
            <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-mono truncate">{webhookUrl()}</span>
          </div>
          <button
            onClick={() => void copiarUrl()}
            className="px-3 py-2 rounded-lg bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm flex items-center gap-2 shrink-0"
          >
            <Copy className="w-4 h-4" />
            Copiar
          </button>
        </div>
      </div>

      {/* ── Saúde ──────────────────────────────────────────────────── */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          Estado da conexão
        </h4>

        {carregando && !saude ? (
          <p className="text-sm text-gray-400 py-2">Verificando…</p>
        ) : (
          <div className="divide-y divide-gray-50">
            <LinhaSaude
              ok={Boolean(saude?.alcancavel)}
              label="Edge Function publicada"
              detalhe={
                saude?.alcancavel
                  ? 'A function responde. O Asaas consegue entregar eventos.'
                  : saude?.erro ?? 'Sem resposta da function.'
              }
            />
            <LinhaSaude
              ok={Boolean(saude?.segredo_configurado)}
              label="Segredo do webhook configurado"
              detalhe={
                saude?.segredo_configurado
                  ? 'Requisições sem o token correto são recusadas. O valor não é exibido aqui.'
                  : 'ASAAS_WEBHOOK_SECRET não está setado — qualquer um poderia postar eventos falsos.'
              }
            />
            <LinhaSaude
              ok={Boolean(saude?.alerta_admin_configurado)}
              label="E-mail de alerta do admin"
              detalhe={
                saude?.alerta_admin_configurado
                  ? 'Inadimplência e falha de emissão de créditos disparam e-mail.'
                  : 'ADMIN_ALERT_EMAIL não está setado — falhas só aparecem nesta tela.'
              }
            />
          </div>
        )}
      </div>

      {/* ── Eventos recebidos ──────────────────────────────────────── */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-semibold text-gray-800 mb-1">Eventos recebidos</h4>
        <p className="text-xs text-gray-400 mb-3">
          Últimos 20. O registro começa a partir do deploy desta versão da function.
        </p>

        {eventos.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">
            Nenhum evento registrado ainda. Se já houve cobrança paga depois do deploy, a
            entrega do Asaas pode não estar chegando — confira a URL cadastrada no painel deles.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Quando</th>
                  <th className="pb-2 pr-4 font-medium">Evento</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {eventos.map(ev => {
                  const visual = STATUS_VISUAL[ev.status] ?? STATUS_VISUAL.ignorado;
                  return (
                    <tr key={ev.id} className="align-top">
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                        {dataHora(ev.created_at)}
                      </td>
                      <td className="py-2 pr-4 text-gray-800 font-mono text-xs">{ev.evento}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${visual.cor}`}
                        >
                          <visual.Icon className="w-3 h-3" />
                          {visual.rotulo}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500 text-xs max-w-md">
                        {ev.detalhe ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
