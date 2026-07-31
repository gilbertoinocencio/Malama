// Compatibilidade para módulos externos ainda não recompilados.
export {
  CaramelAI as GeminiProxy,
  enviarFeedback,
  enviarCorrecao,
  warmCaramel,
  CARAMEL_AUTO_MODEL,
  CARAMEL_FAST_MODEL,
  CARAMEL_DEEP_MODEL,
  CARAMEL_EMBED_MODEL,
} from './caramelAI';
