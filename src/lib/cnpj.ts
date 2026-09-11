/** Só os 14 dígitos — é assim que `empresas.cnpj` deve ser gravado, para o
 *  UNIQUE e a checagem de duplicata do self-signup enxergarem
 *  "23.147.091/0001-98" e "23147091000198" como a mesma empresa. */
export const cnpjSomenteDigitos = (valor: string) => valor.replace(/\D/g, '');

/** Mesmo algoritmo de dígito verificador de
 *  supabase/functions/_shared/brasilapi.ts — o servidor revalida. */
export function cnpjValido(cnpj: string): boolean {
  const digitos = cnpjSomenteDigitos(cnpj);
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false;
  const digito = (base: string) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const n of base) {
      soma += Number(n) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const base = digitos.slice(0, 12);
  return Number(digitos[12]) === digito(base) && Number(digitos[13]) === digito(base + digitos[12]);
}

export const formatarCnpj = (cnpj: string) => {
  const d = cnpjSomenteDigitos(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};
