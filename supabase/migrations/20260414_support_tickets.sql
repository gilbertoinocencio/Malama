-- =====================================================
-- NURA — Sistema de Suporte ao Usuário
-- =====================================================

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Categoria do ticket
  category TEXT NOT NULL CHECK (category IN (
    'nutricao',
    'glp1',
    'financeiro',
    'tecnico',
    'conta',
    'sugestao',
    'outro'
  )),
  
  -- Status do ticket
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Conteúdo
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Respostas (JSON array)
  responses JSONB DEFAULT '[]',
  
  -- Metadados
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

-- Habilitar RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança

-- Usuários podem ver seus próprios tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem criar tickets
CREATE POLICY "Users can create tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus tickets (adicionar respostas)
CREATE POLICY "Users can update own tickets"
  ON support_tickets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin pode ver todos os tickets (verifica via user_metadata)
CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  USING (auth.jwt()->>'role' = 'super_admin');

-- Admin pode atualizar qualquer ticket
CREATE POLICY "Admins can update all tickets"
  ON support_tickets
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'super_admin');

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Comentários para documentação
COMMENT ON TABLE support_tickets IS 'Tickets de suporte enviados pelos usuários';
COMMENT ON COLUMN support_tickets.category IS 'Categoria do problema: nutricao, glp1, financeiro, tecnico, conta, sugestao, outro';
COMMENT ON COLUMN support_tickets.status IS 'Status: open, in_progress, resolved, closed';
COMMENT ON COLUMN support_tickets.priority IS 'Prioridade: low, medium, high, urgent';
COMMENT ON COLUMN support_tickets.responses IS 'Array JSON de respostas (usuario e admin)';
