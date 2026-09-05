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

  test('6. Fallback limpo quando REF não é fornecida mas refCode é válido', () => {
    const derived = deriveReferenceId({
      modelCode: 'SUNGLASSES',
      refCode: 'CA 3036/C 086',
    });

    expect(derived).toBe('CA 3036/C 086');
    expect(derived).not.toBe('sunglasses');
  });
});
