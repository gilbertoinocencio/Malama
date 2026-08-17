-- =====================================================
-- Malama — Modo Compliance como modalidade própria
--
-- Só existiam dois modos (mental e metabólico), e o admin exigia ao menos
-- um deles. Empresa que quer apenas o ciclo da NR-1 — diagnóstico, plano de
-- ação, dossiê e relatório de evidência, sem atendimento individual — não
-- tinha como ser cadastrada, e o relatório dela acabava descrito como se
-- tivesse serviços de saúde que não contratou.
--
-- Compliance entra como TERCEIRA modalidade, com preço próprio, e NÃO é
-- somada aos contratos existentes: quem tem mental ou metabólico continua
-- pagando exatamente o mesmo. O preço dos módulos de cuidado já embutia a
-- entrega do ciclo; ligá-la por cima aumentaria a fatura de toda a base
-- sem nada ter mudado no serviço.
-- =====================================================

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS modo_compliance          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_assento_compliance NUMERIC;

COMMENT ON COLUMN public.empresas.modo_compliance IS
  'Ciclo de gestão de risco psicossocial faz parte do contrato. SEMPRE verdadeiro quando há mental ou metabólico (vem no pacote, sem custo adicional). Só é cobrado quando é a única modalidade — ver empresa_valor_assento().';

-- Quem já é cliente tem o ciclo incluído: a coluna nasce refletindo isso,
-- senão a listagem do admin diria que a base inteira está fora do
-- compliance no dia seguinte à migração.
UPDATE public.empresas
   SET modo_compliance = true
 WHERE COALESCE(modo_mental, false) OR COALESCE(modo_metabolico, false);

-- Compliance vem agregado ao pacote, então não existe contrato com módulo
-- de cuidado e sem ele. Um trigger, e não só a tela: o admin não é o único
-- caminho de escrita, e um UPDATE manual no SQL Editor deixaria o registro
-- mentindo sobre o que a empresa tem.
CREATE OR REPLACE FUNCTION public.empresa_compliance_incluso()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.modo_mental, false) OR COALESCE(NEW.modo_metabolico, false) THEN
    NEW.modo_compliance := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_empresa_compliance_incluso ON public.empresas;
CREATE TRIGGER trg_empresa_compliance_incluso
  BEFORE INSERT OR UPDATE OF modo_mental, modo_metabolico, modo_compliance
  ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.empresa_compliance_incluso();

-- ── Valor do assento ───────────────────────────────────
-- Mantém a regra de falhar alto: modo ligado sem preço devolve NULL em vez
-- de emitir fatura silenciosamente menor.
CREATE OR REPLACE FUNCTION public.empresa_valor_assento(p_empresa_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  e            RECORD;
  v_total      NUMERIC := 0;
  v_algum_modo BOOLEAN := false;
BEGIN
  SELECT modo_mental, modo_metabolico, modo_compliance, valor_por_assento,
         valor_assento_mental, valor_assento_metabolico, valor_assento_compliance
    INTO e
  FROM empresas WHERE id = p_empresa_id;

  IF e IS NULL THEN RETURN NULL; END IF;

  IF COALESCE(e.modo_metabolico, false) THEN
    IF COALESCE(e.valor_assento_metabolico, e.valor_por_assento) IS NULL THEN
      RETURN NULL;
    END IF;
    v_total := v_total + COALESCE(e.valor_assento_metabolico, e.valor_por_assento);
    v_algum_modo := true;
  END IF;

  IF COALESCE(e.modo_mental, false) THEN
    IF e.valor_assento_mental IS NULL THEN
      RETURN NULL;
    END IF;
    v_total := v_total + e.valor_assento_mental;
    v_algum_modo := true;
  END IF;

  -- Compliance só entra na conta quando é o ÚNICO contratado. Nos contratos
  -- com módulo de cuidado, o ciclo já está no preço deles — somar aqui
  -- reajustaria a base inteira por efeito colateral de uma migração.
  IF COALESCE(e.modo_compliance, false) AND NOT v_algum_modo THEN
    IF e.valor_assento_compliance IS NULL THEN
      RETURN NULL;
    END IF;
    v_total := v_total + e.valor_assento_compliance;
    v_algum_modo := true;
  END IF;

  IF NOT v_algum_modo THEN RETURN NULL; END IF;
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.empresa_valor_assento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.empresa_valor_assento(UUID) TO authenticated, service_role;
