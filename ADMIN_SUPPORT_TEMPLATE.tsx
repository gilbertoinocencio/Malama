// =====================================================
// NURA — Admin: Gerenciamento de Tickets de Suporte
// =====================================================
// ⚠️ Este é um TEMPLATE/EXEMPLO. Para usar:
// 1. Copie este arquivo para src/routes/admin/AdminSupportTickets.tsx
// 2. Adicione a rota no App.tsx
// 3. Aplique a migration SQL no Supabase
// =====================================================

import React, { useEffect, useState } from 'react';
import { supportService, type SupportTicket } from '../../services/supportService';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = {
  open: '🔴 Aberto',
  in_progress: '🟡 Em Andamento',
  resolved: '🟢 Resolvido',
  closed: '⚫ Fechado',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: '🔥 Urgente',
};

const CATEGORY_LABELS: Record<string, string> = {
  nutricao: '🥗 Nutrição',
  glp1: '💊 GLP-1',
  financeiro: '💳 Financeiro',
  tecnico: '⚙️ Técnico',
  conta: '👤 Conta',
  sugestao: '💡 Sugestão',
  outro: '📌 Outro',
};

export const AdminSupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  const loadTickets = async () => {
    try {
      const filters = filterStatus === 'all' ? undefined : { status: filterStatus as any };
      const data = await supportService.getAllTickets(filters);
      setTickets(data);
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await supportService.resolveTicket(ticketId, 'ADMIN_USER_ID'); // Substituir pelo ID real do admin
      toast.success('Ticket resolvido!');
      loadTickets();
      setSelectedTicket(null);
    } catch (error) {
      toast.error('Erro ao resolver ticket');
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;

    setSending(true);
    try {
      await supportService.addResponse(
        selectedTicket.id,
        'ADMIN_USER_ID', // Substituir pelo ID real do admin
        responseText.trim(),
        'admin'
      );
      toast.success('Resposta enviada!');
      setResponseText('');
      loadTickets();
      // Recarregar ticket selecionado
      const updated = await supportService.getAllTickets();
      setSelectedTicket(updated.find(t => t.id === selectedTicket.id) || null);
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Tickets de Suporte</h2>
        <div className="flex gap-2">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatus === status
                ? 'bg-[#2ECC71] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {status === 'all' ? 'Todos' : STATUS_LABELS[status]?.replace(/[^\w\s]/g, '').trim()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Tickets */}
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum ticket encontrado
            </div>
          ) : (
            tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-2 ${selectedTicket?.id === ticket.id ? 'border-[#2ECC71]' : 'border-transparent'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{ticket.subject}</p>
                    <p className="text-sm text-gray-500">{ticket.user_name}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {CATEGORY_LABELS[ticket.category]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{STATUS_LABELS[ticket.status]}</span>
                  <span>•</span>
                  <span>{PRIORITY_LABELS[ticket.priority]}</span>
                  <span>•</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detalhes do Ticket */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          {selectedTicket ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedTicket.subject}</h3>
                <p className="text-sm text-gray-500">
                  {selectedTicket.user_name} ({selectedTicket.user_email})
                </p>
              </div>

              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {CATEGORY_LABELS[selectedTicket.category]}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {STATUS_LABELS[selectedTicket.status]}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {PRIORITY_LABELS[selectedTicket.priority]}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* Respostas */}
              {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Respostas:</h4>
                  {selectedTicket.responses.map((resp, i) => (
                    <div key={i} className={`p-3 rounded-lg ${resp.from === 'admin' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                      }`}>
                      <p className="text-xs text-gray-500 mb-1">
                        {resp.from === 'admin' ? '👨‍⚕️ Admin' : '👤 Usuário'} • {new Date(resp.created_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{resp.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Responder */}
              <div className="space-y-2">
                <textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  placeholder="Sua resposta..."
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSendResponse}
                    disabled={!responseText.trim() || sending}
                    className="flex-1 py-2 bg-[#2ECC71] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {sending ? 'Enviando...' : 'Enviar Resposta'}
                  </button>
                  <button
                    onClick={() => handleResolve(selectedTicket.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200"
                  >
                    Marcar como Resolvido
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Selecione um ticket para visualizar detalhes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTickets;
