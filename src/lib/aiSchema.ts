// Formato JSON Schema aceito pelo contrato Caramel. Mantido local para não
// carregar um SDK de provedor que não é usado pelo aplicativo.
export const SchemaType = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
} as const;
