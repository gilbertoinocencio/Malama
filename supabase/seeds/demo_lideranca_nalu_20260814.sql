-- Dados fictícios solicitados para validação do Programa de Evolução da Liderança.
-- Conta alvo: nalu@n.com / Nalu Poke.
-- O script usa as mesmas RPCs chamadas pelo painel para validar o fluxo real.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::text FROM auth.users WHERE lower(email) = lower('nalu@n.com') LIMIT 1),
  true
);
SET LOCAL ROLE authenticated;

DO $demo$
DECLARE
  v_result JSONB;
  v_ciclo_administrativo UUID;
  v_ciclo_atendimento UUID;
  v_ciclo_compras UUID;
  v_ciclo_cozinha UUID;
  v_ciclo_entregas UUID;
  v_acao UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário nalu@n.com não encontrado';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(public.rh_lideranca_listar_ciclos()) item
    WHERE item->>'responsavel_rh' = 'RH — validação fictícia'
  ) THEN
    RAISE EXCEPTION 'Os dados fictícios de liderança já existem para esta conta';
  END IF;

  -- 1/5: jornada iniciada, incluindo o caminho de edição dos pontos.
  v_result := public.rh_lideranca_criar_ciclo(
    'Administrativo', CURRENT_DATE + 90, 'RH — validação fictícia',
    ARRAY['[DEMONSTRAÇÃO] A equipe recebe orientações claras nas reuniões semanais.'],
    ARRAY['[DEMONSTRAÇÃO] Melhorar a distribuição das prioridades ao longo da semana.']
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar Administrativo: %', v_result->>'error';
  END IF;
  v_ciclo_administrativo := (v_result->>'id')::uuid;

  v_result := public.rh_lideranca_atualizar_pontos(
    v_ciclo_administrativo,
    ARRAY[
      '[DEMONSTRAÇÃO] A equipe recebe orientações claras nas reuniões semanais.',
      '[DEMONSTRAÇÃO] Existe abertura para pedir ajuda.'
    ],
    ARRAY['[DEMONSTRAÇÃO] Melhorar a distribuição das prioridades ao longo da semana.'],
    'RH — validação fictícia', CURRENT_DATE + 90
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao editar Administrativo: %', v_result->>'error';
  END IF;

  -- 2/5: plano definido, com um combinado ainda planejado.
  v_result := public.rh_lideranca_criar_ciclo(
    'Atendimento', CURRENT_DATE + 100, 'RH — validação fictícia',
    ARRAY['[DEMONSTRAÇÃO] Boa colaboração nas trocas de turno.'],
    ARRAY['[DEMONSTRAÇÃO] Criar um espaço regular de escuta com a liderança.']
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar Atendimento: %', v_result->>'error';
  END IF;
  v_ciclo_atendimento := (v_result->>'id')::uuid;

  v_result := public.rh_lideranca_adicionar_acao(
    v_ciclo_atendimento, 'apoio',
    '[DEMONSTRAÇÃO] Fortalecer a escuta e o apoio da liderança.',
    '[DEMONSTRAÇÃO] Realizar uma conversa de 20 minutos com a equipe a cada quinze dias.',
    'organizacional', 'Gestor de Atendimento — demonstração', CURRENT_DATE + 30
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar ação de Atendimento: %', v_result->>'error';
  END IF;

  -- 3/5: ação em prática.
  v_result := public.rh_lideranca_criar_ciclo(
    'Compras', CURRENT_DATE + 110, 'RH — validação fictícia',
    ARRAY['[DEMONSTRAÇÃO] O setor mantém boa organização dos pedidos.'],
    ARRAY['[DEMONSTRAÇÃO] Dar mais autonomia para decisões operacionais de baixo risco.']
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar Compras: %', v_result->>'error';
  END IF;
  v_ciclo_compras := (v_result->>'id')::uuid;

  v_result := public.rh_lideranca_adicionar_acao(
    v_ciclo_compras, 'controle',
    '[DEMONSTRAÇÃO] Aumentar a autonomia nas decisões rotineiras.',
    '[DEMONSTRAÇÃO] Definir quais compras podem ser aprovadas diretamente pela equipe e registrar o acordo.',
    'organizacional', 'Gestor de Compras — demonstração', CURRENT_DATE + 35
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar ação de Compras: %', v_result->>'error';
  END IF;
  v_acao := (v_result->>'id')::uuid;

  v_result := public.rh_atualizar_plano_acao(v_acao, 'em_andamento', NULL);
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao iniciar ação de Compras: %', v_result->>'error';
  END IF;
  v_result := public.rh_lideranca_avancar(v_ciclo_compras, 'em_acao', NULL);
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao avançar Compras: %', v_result->>'error';
  END IF;

  -- 4/5: prática incorporada, com ação concluída e evidência fictícia.
  v_result := public.rh_lideranca_criar_ciclo(
    'Cozinha', CURRENT_DATE + 120, 'RH — validação fictícia',
    ARRAY['[DEMONSTRAÇÃO] A equipe coopera bem nos horários de maior movimento.'],
    ARRAY['[DEMONSTRAÇÃO] Tornar pausas e distribuição da carga mais previsíveis.']
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar Cozinha: %', v_result->>'error';
  END IF;
  v_ciclo_cozinha := (v_result->>'id')::uuid;

  v_result := public.rh_lideranca_adicionar_acao(
    v_ciclo_cozinha, 'demanda',
    '[DEMONSTRAÇÃO] Equilibrar a carga nos horários de pico.',
    '[DEMONSTRAÇÃO] Aplicar uma escala simples de pausas e revisar a divisão das tarefas antes do pico.',
    'fonte', 'Gestor de Cozinha — demonstração', CURRENT_DATE + 25
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar ação de Cozinha: %', v_result->>'error';
  END IF;
  v_acao := (v_result->>'id')::uuid;

  v_result := public.rh_atualizar_plano_acao(v_acao, 'em_andamento', NULL);
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao iniciar ação de Cozinha: %', v_result->>'error';
  END IF;
  v_result := public.rh_lideranca_avancar(v_ciclo_cozinha, 'em_acao', NULL);
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao avançar Cozinha para ação: %', v_result->>'error';
  END IF;
  v_result := public.rh_atualizar_plano_acao(
    v_acao, 'concluida',
    '[DEMONSTRAÇÃO] Escala fictícia apresentada à equipe e registrada em ata de validação.'
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao concluir ação de Cozinha: %', v_result->>'error';
  END IF;
  v_result := public.rh_lideranca_avancar(
    v_ciclo_cozinha, 'pratica_incorporada',
    '[DEMONSTRAÇÃO] A rotina fictícia foi compreendida e passou a fazer parte do início do turno.'
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao incorporar prática de Cozinha: %', v_result->>'error';
  END IF;

  -- 5/5: evolução mantida e ciclo concluído.
  v_result := public.rh_lideranca_criar_ciclo(
    'Entregas', CURRENT_DATE + 120, 'RH — validação fictícia',
    ARRAY['[DEMONSTRAÇÃO] A liderança reconhece bons exemplos de cooperação.'],
    ARRAY['[DEMONSTRAÇÃO] Manter uma revisão curta e previsível das rotas.']
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar Entregas: %', v_result->>'error';
  END IF;
  v_ciclo_entregas := (v_result->>'id')::uuid;

  v_result := public.rh_lideranca_adicionar_acao(
    v_ciclo_entregas, 'reconhecimento',
    '[DEMONSTRAÇÃO] Preservar reconhecimento e previsibilidade da operação.',
    '[DEMONSTRAÇÃO] Fazer uma revisão semanal de rotas e reconhecer uma colaboração observada.',
    'organizacional', 'Gestor de Entregas — demonstração', CURRENT_DATE + 20
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao criar ação de Entregas: %', v_result->>'error';
  END IF;
  v_acao := (v_result->>'id')::uuid;

  v_result := public.rh_atualizar_plano_acao(v_acao, 'em_andamento', NULL);
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao iniciar ação de Entregas: %', v_result->>'error';
  END IF;
  v_result := public.rh_lideranca_avancar(v_ciclo_entregas, 'em_acao', NULL);
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao avançar Entregas para ação: %', v_result->>'error';
  END IF;
  v_result := public.rh_atualizar_plano_acao(
    v_acao, 'concluida',
    '[DEMONSTRAÇÃO] Três revisões fictícias registradas para validação do fluxo.'
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao concluir ação de Entregas: %', v_result->>'error';
  END IF;
  v_result := public.rh_lideranca_avancar(
    v_ciclo_entregas, 'pratica_incorporada',
    '[DEMONSTRAÇÃO] A revisão fictícia passou a ocorrer semanalmente.'
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao incorporar prática de Entregas: %', v_result->>'error';
  END IF;
  v_result := public.rh_lideranca_avancar(
    v_ciclo_entregas, 'evolucao_mantida',
    '[DEMONSTRAÇÃO] A prática fictícia foi mantida durante o período de validação.'
  );
  IF NOT COALESCE((v_result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'Falha ao concluir jornada de Entregas: %', v_result->>'error';
  END IF;
END;
$demo$;

COMMIT;
