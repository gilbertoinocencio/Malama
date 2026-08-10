// =====================================================
// Malama — Validação de CPF pelos dígitos verificadores
//
// Conferir só o tamanho (11 dígitos) aceitava qualquer sequência inventada,
// inclusive 000.000.000-00 e 111.111.111-11. O cálculo dos dois dígitos
// verificadores é o mesmo da Receita Federal: cada bloco é somado com pesos
// decrescentes e o resto da divisão por 11 vira o dígito.
//
// Isto prova que o número é BEM FORMADO, não que ele exista ou pertença à
// pessoa — para isso só consultando a Receita.
// =====================================================

export function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

function checkDigit(digits: string, weightStart: number): number {
  let sum = 0;
  for (let i = 0; i < weightStart - 1; i++) {
    sum += Number(digits[i]) * (weightStart - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;

  // Sequências repetidas passam na conta dos dígitos, mas não são CPFs válidos.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  return checkDigit(cpf, 10) === Number(cpf[9])
    && checkDigit(cpf, 11) === Number(cpf[10]);
}
