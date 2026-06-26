// =====================================================
// Malama — Serviço de Suporte ao Usuário
// =====================================================

import { supabase } from './supabase';

export interface SupportTicket {
  id: string;
  user_id: string;
  category: 'nutricao' | 'glp1' | 'financeiro' | 'tecnico' | 'conta' | 'sugestao' | 'outro';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  responses: SupportResponse[];
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  // Dados do usuário (para admin)
  user_name?: string;
  user_email?: string;
}

export interface SupportResponse {
  id: string;
  from: 'user' | 'admin';
  message: string;
  created_at: string;
}

export interface CreateTicketInput {
  category: SupportTicket['category'];
  subject: string;
  description: string;
}

export interface UpdateTicketInput {
  status?: SupportTicket['status'];
  priority?: SupportTicket['priority'];
  response?: string;
}

export const supportService = {
  /**
   * Listar tickets do usuário logado
   */
  async getUserTickets(userId: string, limit = 20): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Listar todos os tickets (apenas admin)
   */
  async getAllTickets(filters?: {
    status?: SupportTicket['status'];
    category?: SupportTicket['category'];
    priority?: SupportTicket['priority'];
  }): Promise<SupportTicket[]> {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.priority) query = query.eq('priority', filters.priority);

    const { data, error } = await query;
    if (error) throw error;

    // Buscar dados dos usuários
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);

      return data.map(ticket => {
        const profile = profiles?.find(p => p.id === ticket.user_id);
        return {
          ...ticket,
          user_name: profile?.display_name || 'Usuário',
          user_email: profile?.email || '',
        };
      });
    }

    return data || [];
  },

  /**
   * Criar um novo ticket
   */
  async createTicket(userId: string, input: CreateTicketInput): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        category: input.category,
        subject: input.subject,
        description: input.description,
        status: 'open',
        priority: 'medium',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Atualizar ticket (usuário ou admin)
   */
  async updateTicket(
    ticketId: string,
    userId: string,
    updates: UpdateTicketInput
  ): Promise<SupportTicket> {
    const { data: existing, error: fetchError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !existing) throw fetchError || new Error('Ticket não encontrado');

    // Verificar se é admin
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user?.app_metadata?.role === 'super_admin';

    const updateData: any = {};

    // Usuário pode apenas adicionar resposta
    if (!isAdmin && existing.user_id !== userId) {
      throw new Error('Não autorizado');
    }

    // Admin pode atualizar status e prioridade
    if (isAdmin) {
      if (updates.status) updateData.status = updates.status;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = userId;
      }
    }

    // Ambos podem adicionar resposta
    if (updates.response) {
      const newResponse: SupportResponse = {
        id: crypto.randomUUID(),
        from: isAdmin ? 'admin' : 'user',
        message: updates.response,
        created_at: new Date().toISOString(),
      };
      updateData.responses = [...(existing.responses || []), newResponse];
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Adicionar resposta ao ticket
   */
  async addResponse(
    ticketId: string,
    userId: string,
    message: string,
    from: 'user' | 'admin' = 'user'
  ): Promise<SupportTicket> {
    return this.updateTicket(ticketId, userId, { response: message });
  },

  /**
   * Resolver ticket (apenas admin)
   */
  async resolveTicket(ticketId: string, adminId: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, adminId, { status: 'resolved' });
  },

  /**
   * Obter estatísticas de tickets (admin)
   */
  async getStats(): Promise<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('status, category, priority');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    data?.forEach(ticket => {
      // Por status
      if (ticket.status === 'open') stats.open++;
      else if (ticket.status === 'in_progress') stats.in_progress++;
      else if (ticket.status === 'resolved') stats.resolved++;
      else if (ticket.status === 'closed') stats.closed++;

      // Por categoria
      stats.byCategory[ticket.category] = (stats.byCategory[ticket.category] || 0) + 1;

      // Por prioridade
      stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
    });

    return stats;
  },
};

export default supportService;
