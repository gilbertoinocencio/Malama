-- Malama — cadência operacional do ciclo psicossocial
-- WHO-5 permanece mensal; o JSS passa a orientar ciclos trimestrais de
-- diagnóstico, devolutiva à liderança, ação e nova medição.

UPDATE public.psychosocial_instruments
SET cadencia_meses = 3
WHERE code = 'jss';

