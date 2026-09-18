import {
  deriveReferenceId,
  isCategoricalValue,
  cleanReferenceId,
  CATEGORICAL_TERMS,
} from '@/lib/utils/reference-logic';

describe('Proteção e Regras de Derivação de reference_id em Importações', () => {
  test('1. Carrera OPT + CLIP-ON: deriva reference_id correto de REF "CA 3036/C" rejeitando termo categórico', () => {
    const refInput = 'CA 3036/C';
    const tipoInput = 'OPT + CLIP-ON';
    const refCode = 'CA 3036/C 086';

    expect(isCategoricalValue(tipoInput)).toBe(true);
    expect(isCategoricalValue(refInput)).toBe(false);

    const referenceId = deriveReferenceId({
      ref: refInput,
      modelCode: tipoInput,
      refCode,
    });

    expect(referenceId).toBe('CA 3036/C');
    expect(referenceId).not.toBe('opt-clip-on');
    expect(referenceId).not.toBe('opt+clip-on');
  });

  test('2. Carrera Solar: deriva reference_id correto de REF "CARRERA 3114/S" rejeitando termo categórico "SUNGLASSES"', () => {
    const refInput = 'CARRERA 3114/S';
    const tipoInput = 'SUNGLASSES';
    const refCode = 'CARRERA 3114/S WR9';

    expect(isCategoricalValue(tipoInput)).toBe(true);

    const referenceId = deriveReferenceId({
      ref: refInput,
      modelCode: tipoInput,
      refCode,
    });

    expect(referenceId).toBe('CARRERA 3114/S');
    expect(referenceId).not.toBe('sunglasses');
  });

  test('3. Carrera Receituário: deriva reference_id correto de REF "CARRERA 3112" rejeitando termo categórico "RECEITUÁRIO"', () => {
    const refInput = 'CARRERA 3112';
    const tipoInput = 'RECEITUÁRIO';
    const refCode = 'CARRERA 3112 000';

    expect(isCategoricalValue(tipoInput)).toBe(true);

    const referenceId = deriveReferenceId({
      ref: refInput,
      modelCode: tipoInput,
      refCode,
    });

    expect(referenceId).toBe('CARRERA 3112');
    expect(referenceId).not.toBe('receituario');
  });

  test('4. Múltiplas cores do mesmo modelo compartilham o mesmo reference_id', () => {
    const color1 = deriveReferenceId({
      ref: 'C FLEX 03/G',
      modelCode: 'RECEITUÁRIO',
      refCode: 'C FLEX 03/G 807',
    });

    const color2 = deriveReferenceId({
      ref: 'C FLEX 03/G',
      modelCode: 'RECEITUÁRIO',
      refCode: 'C FLEX 03/G 003',
    });

    expect(color1).toBe('C FLEX 03/G');
    expect(color2).toBe('C FLEX 03/G');
    expect(color1).toBe(color2);
  });

  test('5. Suporta variações de acentuação, caixa alta/baixa nos termos categóricos e referências', () => {
    const testCases = [
      { input: 'SUNGLASSES', isCat: true },
      { input: 'Sunglasses', isCat: true },
      { input: 'sunglasses', isCat: true },
      { input: 'RECEITUÁRIO', isCat: true },
      { input: 'receituario', isCat: true },
      { input: 'OPT + CLIP-ON', isCat: true },
      { input: 'opt-clip-on', isCat: true },
      { input: 'SOLAR', isCat: true },
      { input: 'CA 3036/C', isCat: false },
      { input: 'CARRERA 1090/S', isCat: false },
    ];

    testCases.forEach(({ input, isCat }) => {
      expect(isCategoricalValue(input)).toBe(isCat);
    });
  });

  test('6. Fallback automático extrai referência base de refCode removendo cor e tamanho sem virar slug', () => {
    const derived1 = deriveReferenceId({
      refCode: 'BOSS 1983/S 4C3',
    });
    expect(derived1).toBe('BOSS 1983/S');
    expect(derived1).not.toBe('boss-1983s-4c3');
    expect(derived1).not.toBe('boss-1983s');

    const derived2 = deriveReferenceId({
      refCode: 'BOSS 1997/G J5G 58',
    });
    expect(derived2).toBe('BOSS 1997/G');

    const derived3 = deriveReferenceId({
      refCode: 'BOSS 2004/G/S KB7',
    });
    expect(derived3).toBe('BOSS 2004/G/S');

    const derived4 = deriveReferenceId({
      modelCode: 'SUNGLASSES',
      refCode: 'CA 3036/C 086',
    });
    expect(derived4).toBe('CA 3036/C');
  });

  test('7. Coluna mapeada explicitamente para modelCode/reference_id preserva o valor exato com trim()', () => {
    const derived = deriveReferenceId({
      modelCode: 'BOSS 1983/S',
      refCode: 'BOSS 1983/S 4C3',
    });

    expect(derived).toBe('BOSS 1983/S');
    expect(derived).not.toBe('boss-1983s');
  });

  test('8. Marca 7A: "7A 117 600" (3 partes) deriva "7A 117", enquanto "7A 117" (2 partes) não remove 117', () => {
    const derivedWithColor = deriveReferenceId({
      refCode: '7A 117 600',
    });
    expect(derivedWithColor).toBe('7A 117');

    const derivedWithoutColor = deriveReferenceId({
      refCode: '7A 117',
    });
    expect(derivedWithoutColor).toBe('7A 117');
    expect(derivedWithoutColor).not.toBe('7A');
    expect(derivedWithoutColor).not.toBe('117');
  });

  test('9. Trata hífen antes da cor no final (MARC 726-086 -> MARC 726) e limpa aspas residuais', () => {
    const derivedMarc1 = deriveReferenceId({
      refCode: 'MARC 726-086',
    });
    expect(derivedMarc1).toBe('MARC 726');

    const derivedMarc2 = deriveReferenceId({
      refCode: 'MARC 726/S-086',
    });
    expect(derivedMarc2).toBe('MARC 726/S');

    const derivedMarc3 = deriveReferenceId({
      refCode: 'MJ 1138/S-JRI',
    });
    expect(derivedMarc3).toBe('MJ 1138/S');

    const derivedWithQuotes = deriveReferenceId({
      refCode: '""HER 0423/G 807""',
    });
    expect(derivedWithQuotes).toBe('HER 0423/G');
  });

  test('10. Preserva tamanhos no final (-58, -90) em reference_code e extrai a referência base limpa', () => {
    const derivedWithSize1 = deriveReferenceId({
      refCode: 'HER 0411/G/S 807-90',
    });
    expect(derivedWithSize1).toBe('HER 0411/G/S');

    const derivedWithSize2 = deriveReferenceId({
      refCode: 'MARC 726-086-58',
    });
    expect(derivedWithSize2).toBe('MARC 726');

    const derivedWithSize3 = deriveReferenceId({
      refCode: '7A 117 600-54',
    });
    expect(derivedWithSize3).toBe('7A 117');
  });
});
