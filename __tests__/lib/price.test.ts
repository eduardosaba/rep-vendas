import { formatProductPrice } from '@/lib/utils/price';

describe('formatProductPrice', () => {
  it('mostra "Sob consulta" quando price_on_request = true e price = 0.00', () => {
    expect(formatProductPrice(0, true)).toBe('Sob consulta');
  });

  it('mostra "Sob consulta" quando price_on_request = true e price > 0', () => {
    expect(formatProductPrice(350, true)).toBe('Sob consulta');
  });

  it('mostra o valor formatado em BRL quando price_on_request = false e price = 350.00', () => {
    const result = formatProductPrice(350, false);
    expect(result.replace(/\s/g, ' ')).toMatch(/R\$\s*350,00/);
  });

  it('mostra R$ 0,00 quando price_on_request = false e price = 0.00', () => {
    const result = formatProductPrice(0, false);
    expect(result.replace(/\s/g, ' ')).toMatch(/R\$\s*0,00/);
  });

  it('trata valores nulos ou indefinidos de price_on_request como false', () => {
    const result = formatProductPrice(100, undefined);
    expect(result.replace(/\s/g, ' ')).toMatch(/R\$\s*100,00/);
  });
});
