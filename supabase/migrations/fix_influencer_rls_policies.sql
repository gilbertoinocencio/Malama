-- =====================================================
-- NURA — RLS Policy para permitir admins criarem influencers
-- =====================================================
-- Execute este SQL no Supabase SQL Editor para permitir
-- que usuários autenticados criem registros na tabela influencers

-- Política para INSERT (criar novos influencers)
CREATE POLICY "Permitir usuários autenticados criarem influencers"
ON public.influencers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para SELECT (listar influencers)
CREATE POLICY "Permitir usuários autenticados listarem influencers"
ON public.influencers
FOR SELECT
TO authenticated
USING (true);

-- Política para UPDATE (editar influencers)
CREATE POLICY "Permitir usuários autenticados editarem influencers"
ON public.influencers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para DELETE (remover influencers)
CREATE POLICY "Permitir usuários autenticados removerem influencers"
ON public.influencers
FOR DELETE
TO authenticated
USING (true);

-- Nota: Estas políticas permitem que QUALQUER usuário autenticado
-- gerencie influencers. Para produção, considere adicionar verificações
-- de role (ex: verificar se o usuário é admin na tabela profiles)
