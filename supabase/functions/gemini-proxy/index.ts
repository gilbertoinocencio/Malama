// Compatibilidade com versões antigas do app. O processamento é exclusivamente
// feito pelos modelos Caramel; novos builds usam a função `caramel-proxy`.
import { handleCaramelProxy } from '../_shared/caramel-proxy-handler.ts';

Deno.serve(handleCaramelProxy);
