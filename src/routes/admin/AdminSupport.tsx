import React, { useEffect, useState } from 'react';
import { supportService, SupportTicket } from '../../services/supportService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MessageSquare, User, Calendar, CheckCircle, Clock, 
  AlertTriangle, Send, X 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminSupport: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<SupportTicket['status'] | 'all'>('all');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await supportService.getAllTickets();
      setTickets(data);
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      toast.error('Erro ao carregar os chamados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReply = async () => {
    if (!selectedTicket || !user || !replyText.trim()) return;

    setReplying(true);
    try {
      await supportService.addResponse(selectedTicket.id, user.id, replyText, 'admin');
      
      // If the ticket was open, mark as in_progress automatically
      if (selectedTicket.status === 'open') {
        await supportService.updateTicket(selectedTicket.id, user.id, { status: 'in_progress' });
      }

      toast.success('Resposta enviada com sucesso!');
      setReplyText('');
      
      // Refresh tickets
      await fetchTickets();
      
      // Update selected ticket in view
      const updated = await supportService.getAllTickets();
      setSelectedTicket(updated.find(t => t.id === selectedTicket.id) || null);
    } catch (error) {
      console.error('Erro ao responder ticket:', error);
      toast.error('Erro ao enviar a resposta.');
    } finally {
      setReplying(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket || !user) return;
    
    if (window.confirm('Tem certeza que deseja marcar este chamado como resolvido?')) {
      try {
        await supportService.resolveTicket(selectedTicket.id, user.id);
        toast.success('Chamado marcado como resolvido!');
        await fetchTickets();
        
        // Update selected ticket in view
        const updated = await supportService.getAllTickets();
        setSelectedTicket(updated.find(t => t.id === selectedTicket.id) || null);
      } catch (error) {
        console.error('Erro ao resolver:', error);
        toast.error('Erro ao fechar o chamado.');
      }
    }
  };

  const filteredTickets = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto';
      case 'in_progress': return 'Em Andamento';
      case 'resolved': return 'Resolvido';
      case 'closed': return 'Fechado';
      default: return status;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-gray-50 -m-8">
      {/* Sidebar List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#7d4a3c]" />
            Chamados de Suporte
          </h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                  statusFilter === status 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status === 'all' ? 'Todos' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Nenhum chamado encontrado.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedTicket?.id === ticket.id ? 'bg-indigo-50/50 hover:bg-indigo-50/50 border-l-4 border-[#7d4a3c]' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate pr-2">
                      {ticket.subject}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <User className="w-3 h-3" />
                    <span className="truncate">{ticket.user_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details View */}
      <div className="flex-1 bg-gray-50 flex flex-col h-full">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="bg-white p-6 border-b border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> {selectedTicket.user_name} ({selectedTicket.user_email})</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}</span>
                    <span className="flex items-center gap-1 uppercase tracking-wide text-xs font-semibold px-2 py-1 bg-gray-100 rounded-md">
                      Categoria: {selectedTicket.category}
                    </span>
                  </div>
                </div>
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={handleResolve}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-semibold transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar Resolvido
                  </button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Original Message */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex flex-shrink-0 items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {(selectedTicket.responses || []).map((resp, idx) => (
                <div key={idx} className={`flex gap-4 ${resp.from === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center ${
                    resp.from === 'admin' ? 'bg-[#7d4a3c] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {resp.from === 'admin' ? <MessageSquare className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className={`text-[10px] text-gray-400 mb-1 ${resp.from === 'admin' ? 'text-right' : ''}`}>
                      {new Date(resp.created_at).toLocaleString('pt-BR')}
                    </span>
                    <div className={`${
                      resp.from === 'admin' 
                        ? 'bg-[#7d4a3c] text-white border-transparent rounded-2xl rounded-tr-none ml-auto' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none mr-auto'
                    } p-4 shadow-sm text-sm whitespace-pre-wrap inline-block max-w-[85%]`}>
                      {resp.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="bg-white p-4 border-t border-gray-200">
              <div className="flex flex-col gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva sua resposta..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#7d4a3c] outline-none resize-none"
                  rows={3}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replying}
                    className="flex items-center gap-2 px-6 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-semibold text-sm disabled:opacity-50 transition"
                  >
                    {replying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enviar Resposta
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecione um chamado na lista para visualizar os detalhes</p>
          </div>
        )}
      </div>
    </div>
  );
};
