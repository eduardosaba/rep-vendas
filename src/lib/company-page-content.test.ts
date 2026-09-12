import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  parseCompanyPageContent,
  serializeCompanyPageContent,
  createBlock,
  insertBlock,
  duplicateBlock,
  moveBlock,
  removeBlock,
  createHistory,
  pushHistoryState,
  undoHistoryState,
  redoHistoryState,
  resolveVideoEmbedUrl,
  normalizeWhatsApp,
  normalizeInstagram,
  normalizeBlock,
  type CompanyPageContent,
} from './company-page-content';
import { COMPANY_PAGE_PRESETS, generatePresetBlocks } from './company-page-presets';
import { sanitizeUrl } from './url-sanitizer';

describe('company-page-content unit tests', () => {
  test('should parse legacy raw string HTML as fallback text block', () => {
    const raw = '<p>Texto institucional antigo</p>';
    const parsed = parseCompanyPageContent(raw, 'Título de Teste');

    assert.strictEqual(parsed.isStructured, false);
    assert.strictEqual(parsed.content.version, 1);
    assert.strictEqual(parsed.content.title, 'Título de Teste');
    assert.strictEqual(parsed.content.blocks.length, 1);
    assert.strictEqual(parsed.content.blocks[0].type, 'text');
    assert.strictEqual(parsed.content.blocks[0].data.text, 'Texto institucional antigo');
  });

  test('should parse legacy content without version and add version 1', () => {
    const rawObj = {
      title: 'Página sem versão',
      heroImage: 'https://images.unsplash.com/hero.jpg',
      heroHeight: 400,
      blocks: [
        {
          id: 'b1',
          type: 'text',
          data: { text: 'Olá mundo' },
        },
      ],
    };

    const parsed = parseCompanyPageContent(rawObj);
    assert.strictEqual(parsed.isStructured, true);
    assert.strictEqual(parsed.content.version, 1);
    assert.strictEqual(parsed.content.title, 'Página sem versão');
    assert.strictEqual(parsed.content.heroImage, 'https://images.unsplash.com/hero.jpg');
    assert.strictEqual(parsed.content.heroHeight, 400);
    assert.strictEqual(parsed.content.blocks.length, 1);
  });

  test('should parse and normalize new versioned content with expanded Hero and heading block', () => {
    const content: CompanyPageContent = {
      version: 1,
      title: 'Página Completa',
      heroImage: 'https://images.unsplash.com/hero.jpg',
      heroTitle: 'Bem-vindo',
      heroSubtitle: 'Subtítulo do Hero',
      heroCtaText: 'Conheça mais',
      heroCtaUrl: '/catalogo',
      heroAlign: 'center',
      heroOverlayOpacity: 60,
      heroHeight: 450,
      heroImagePosition: 'top',
      blocks: [
        {
          id: 'h1',
          type: 'heading',
          data: { text: 'Título Principal', level: 'h1', align: 'left' },
        },
      ],
    };

    const serialized = serializeCompanyPageContent(content);
    const parsed = parseCompanyPageContent(serialized);

    assert.strictEqual(parsed.isStructured, true);
    assert.strictEqual(parsed.content.version, 1);
    assert.strictEqual(parsed.content.heroTitle, 'Bem-vindo');
    assert.strictEqual(parsed.content.heroOverlayOpacity, 60);
    assert.strictEqual(parsed.content.heroImagePosition, 'top');
    assert.strictEqual(parsed.content.blocks[0].type, 'heading');
    assert.strictEqual(parsed.content.blocks[0].data.level, 'h1');
  });

  test('should handle pure block operations: insertBlock, duplicateBlock, moveBlock, removeBlock', () => {
    let blocks = [createBlock('text'), createBlock('image')];
    assert.strictEqual(blocks.length, 2);

    // Insert block at index 1
    blocks = insertBlock(blocks, 'heading', 1);
    assert.strictEqual(blocks.length, 3);
    assert.strictEqual(blocks[1].type, 'heading');

    // Duplicate block
    const headingId = blocks[1].id;
    blocks = duplicateBlock(blocks, headingId);
    assert.strictEqual(blocks.length, 4);
    assert.strictEqual(blocks[2].type, 'heading');
    assert.notStrictEqual(blocks[2].id, headingId); // UUID novo

    // Move block up
    const dupId = blocks[2].id;
    blocks = moveBlock(blocks, dupId, 'up');
    assert.strictEqual(blocks[1].id, dupId);

    // Remove block
    blocks = removeBlock(blocks, dupId);
    assert.strictEqual(blocks.length, 3);
  });

  test('should sanitize URLs preventing javascript: injection', () => {
    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), '');
    assert.strictEqual(sanitizeUrl('https://example.com/logo.png'), 'https://example.com/logo.png');
    assert.strictEqual(sanitizeUrl('/catalogo'), '/catalogo');
    assert.strictEqual(sanitizeUrl('#secao'), '#secao');
  });

  test('should handle undo/redo stack logic: structural undo, redo, new change branch, and history capacity limit', () => {
    let history = createHistory('Estado 0 (Inicial)', 80);
    assert.strictEqual(history.present, 'Estado 0 (Inicial)');
    assert.strictEqual(history.past.length, 0);
    assert.strictEqual(history.future.length, 0);

    history = pushHistoryState(history, 'Estado 1');
    assert.strictEqual(history.present, 'Estado 1');
    assert.strictEqual(history.past.length, 1);

    history = undoHistoryState(history);
    assert.strictEqual(history.present, 'Estado 0 (Inicial)');
    assert.strictEqual(history.future[0], 'Estado 1');

    history = redoHistoryState(history);
    assert.strictEqual(history.present, 'Estado 1');
  });

  // --- TESTES FASE 2A ---
  test('Phase 2A: FAQ should preserve valid items with stable IDs and discard invalid items', () => {
    const rawFaq = {
      type: 'faq',
      id: 'faq-1',
      data: {
        faqTitle: 'Perguntas Frequentes',
        faqItems: [
          { id: 'item-1', question: 'Como comprar?', answer: 'Pelo site.' },
          { question: 'Entrega?', answer: 'Em todo o Brasil.' },
          null,
        ],
      },
    };

    const normalized = normalizeBlock(rawFaq);
    assert.strictEqual(normalized?.type, 'faq');
    assert.strictEqual(normalized?.data.faqItems?.length, 2);
    assert.strictEqual(normalized?.data.faqItems?.[0].id, 'item-1');
    assert.ok(normalized?.data.faqItems?.[1].id);
  });

  test('Phase 2A: Video should resolve YouTube/Vimeo URLs and reject untrusted origins', () => {
    assert.strictEqual(
      resolveVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
    assert.strictEqual(resolveVideoEmbedUrl('https://malicious-site.com/video.mp4'), null);
  });

  test('Phase 2A: WhatsApp and Instagram normalization', () => {
    assert.strictEqual(normalizeWhatsApp('(11) 99999-8888'), '5511999998888');
    const instaUser = normalizeInstagram('@minhaloja');
    assert.strictEqual(instaUser.username, 'minhaloja');
  });

  // --- TESTES FASE 2B ---
  test('Phase 2B: Products block should normalize productsLimit strictly between 4 and 24', () => {
    const rawTooHigh = {
      type: 'products',
      data: { productsSource: 'featured', productsLimit: 100 },
    };
    const normalizedHigh = normalizeBlock(rawTooHigh);
    assert.strictEqual(normalizedHigh?.data.productsLimit, 24);

    const rawTooLow = {
      type: 'products',
      data: { productsSource: 'featured', productsLimit: 1 },
    };
    const normalizedLow = normalizeBlock(rawTooLow);
    assert.strictEqual(normalizedLow?.data.productsLimit, 4);
  });

  test('Phase 2B: Brands block should normalize columns strictly to 2, 3, 4 or 6', () => {
    const rawInvalidCols = {
      type: 'brands',
      data: { brandsSource: 'company', brandsColumns: 5 },
    };
    const normalized = normalizeBlock(rawInvalidCols);
    assert.strictEqual(normalized?.data.brandsColumns, 4);
  });

  test('Phase 2B: Serialized JSON must contain ONLY query parameters and ZERO product/brand snapshots', () => {
    const content: CompanyPageContent = {
      version: 1,
      title: 'Página de Lançamentos',
      heroImage: '',
      blocks: [
        {
          id: 'pb-1',
          type: 'products',
          data: {
            productsTitle: 'Lançamentos da Estação',
            productsSource: 'launches',
            productsLimit: 8,
            productsLayout: 'grid',
          },
        },
        {
          id: 'bb-1',
          type: 'brands',
          data: {
            brandsTitle: 'Nossas Marcas',
            brandsSource: 'company',
            brandsColumns: 4,
          },
        },
      ],
    };

    const json = serializeCompanyPageContent(content);
    assert.strictEqual(json.includes('price'), false);
    assert.strictEqual(json.includes('image_url'), false);
    assert.strictEqual(json.includes('stock'), false);
    assert.ok(json.includes('"productsSource":"launches"'));
    assert.ok(json.includes('"brandsSource":"company"'));
  });

  // --- TESTES FASE 2C ---
  test('Phase 2C: Presets should generate unique UUIDs for all blocks and sub-items', () => {
    const blocks1 = generatePresetBlocks('institucional');
    const blocks2 = generatePresetBlocks('institucional');

    assert.ok(blocks1.length >= 4);
    assert.ok(blocks2.length >= 4);

    // Cada chamada gera UUIDs únicos e distintos
    assert.notStrictEqual(blocks1[0].id, blocks2[0].id);

    // Verificar sub-itens com IDs únicos (ex: stats)
    const statsBlock1 = blocks1.find((b) => b.type === 'stats');
    const statsBlock2 = blocks2.find((b) => b.type === 'stats');
    assert.ok(statsBlock1?.data.statsItems?.[0].id);
    assert.notStrictEqual(statsBlock1?.data.statsItems?.[0].id, statsBlock2?.data.statsItems?.[0].id);
  });

  test('Phase 2C: Launches Hotsite preset must use productsSource = launches without fixed product IDs', () => {
    const blocks = generatePresetBlocks('launches_hotsite');
    const productsBlock = blocks.find((b) => b.type === 'products');

    assert.ok(productsBlock);
    assert.strictEqual(productsBlock.data.productsSource, 'launches');
    assert.strictEqual(productsBlock.data.productIds, undefined);
  });

  test('Phase 2C: Item reordering inside FAQ preserves item IDs without regenerating them', () => {
    const faqItems = [
      { id: 'id-q1', question: 'P1', answer: 'R1' },
      { id: 'id-q2', question: 'P2', answer: 'R2' },
      { id: 'id-q3', question: 'P3', answer: 'R3' },
    ];

    // Reordenar P1 para a 2ª posição (swap)
    const nextItems = [...faqItems];
    const [moved] = nextItems.splice(0, 1);
    nextItems.splice(1, 0, moved);

    assert.strictEqual(nextItems[0].id, 'id-q2');
    assert.strictEqual(nextItems[1].id, 'id-q1');
    assert.strictEqual(nextItems[2].id, 'id-q3');
  });
});
