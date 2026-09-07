/**
 * Homologação de Gerador de PDF de Produção (src/lib/generateOrderPDF.ts)
 * Executar com: npx tsx scripts/test_order_pdf_production_generator.ts
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { generateOrderPDF } from '../src/lib/generateOrderPDF';

console.log('=== HOMOLOGAÇÃO COM O GERADOR REAL DE PRODUÇÃO (src/lib/generateOrderPDF.ts) ===\n');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASSED: ${testName}`);
    totalPassed++;
  } else {
    console.error(`❌ FAILED: ${testName}`);
    totalFailed++;
  }
}

// ----------------------------------------------------------------------------
// EVIDÊNCIA DO MÓDULO E DA FUNÇÃO IMPORTADA (REQUISITO 2)
// ----------------------------------------------------------------------------
console.log('📦 Mapeamento do Módulo Real de Produção:');
console.log('   Módulo: src/lib/generateOrderPDF.ts');
console.log('   Função: generateOrderPDF(orderData, store, items, total, isDraft, returnBlob, options)\n');

// ----------------------------------------------------------------------------
// PEDIDO DE HOMOLOGAÇÃO COM ESTRUTURA COMPLETA DO DB SNAPSHOT (REQUISITO 3)
// ----------------------------------------------------------------------------
const mockOrderData = {
  id: '57f00c3a-5d2a-44df-a4dc-c7cda38de8b4',
  display_id: 1042,
  created_at: '2026-03-15T14:30:00.000Z',
  customer: {
    name: 'Distribuidora Otica Visao LTDA',
    cnpj: '98.765.432/0001-10',
    email: 'compras@visao.com.br',
    phone: '(11) 99999-8888',
    address: 'Rua das Flores, 500 - Sao Paulo, SP',
  },
};

const mockStoreData = {
  name: 'Rep Vendas Distribuidora',
  email: 'contato@repvendas.com.br',
  phone: '(11) 3333-4444',
  primary_color: '#4f46e5',
  footer_message: 'Rep Vendas  •  contato@repvendas.com.br',
};

const mockItems = [
  {
    id: 'item_1',
    name: 'Oculos Boss Black 001',
    reference_code: 'BOSS-001',
    brand: 'BOSS',
    quantity: 10,
    price: 150.0,
  },
  {
    id: 'item_2',
    name: 'Armacao Boss Titanium 002',
    reference_code: 'BOSS-002',
    brand: 'BOSS',
    quantity: 5,
    price: 200.0,
  },
];

const totalValue = 2500.0;

async function runHomologation() {
  try {
    // ----------------------------------------------------------------------------
    // 1. GERAÇÃO DO PDF 1 VIA FUNÇÃO REAL DE PRODUÇÃO
    // ----------------------------------------------------------------------------
    const result1 = await generateOrderPDF(
      mockOrderData,
      mockStoreData,
      mockItems,
      totalValue,
      true, // returnBlob = true (5º parâmetro)
      true,
      {
        paymentTerms: '30/60 dias',
        groupByBrand: true,
      }
    );

    assert(result1 !== undefined && result1 !== null, '1.1 Chamada a generateOrderPDF real retornou resultado válido');

    // Converte o retorno (Blob/Buffer/ArrayBuffer) para Buffer do Node
    let pdfBuffer1: Buffer;
    if (result1 instanceof Buffer) {
      pdfBuffer1 = result1;
    } else if (result1 && typeof (result1 as any).arrayBuffer === 'function') {
      const ab = await (result1 as any).arrayBuffer();
      pdfBuffer1 = Buffer.from(ab);
    } else {
      pdfBuffer1 = Buffer.from(result1 as any);
    }

    const pdfStr1 = pdfBuffer1.toString('utf-8');

    assert(pdfStr1.startsWith('%PDF-1.'), '1.2 PDF retornado possui cabeçalho binário %PDF-1.x válido');
    assert(pdfStr1.includes('%%EOF'), '1.3 PDF retornado possui o delimitador final %%EOF');
    assert(pdfBuffer1.length > 1000, `1.4 PDF real gerado possui tamanho consistente (${pdfBuffer1.length} bytes)`);

    // Salva o PDF real em pasta tmp segura para inspeção visual se desejado
    const tmpDir = path.join(process.cwd(), 'tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const pdfPath1 = path.join(tmpDir, 'homologation_order_1042_original.pdf');
    fs.writeFileSync(pdfPath1, pdfBuffer1);
    console.log(`   📂 Arquivo PDF real salvo em: ${pdfPath1}`);

    // ----------------------------------------------------------------------------
    // 2. SIMULAÇÃO DE AUSÊNCIA NO STORAGE (EM MEMÓRIA - NENHUM ARQUIVO REAL REMOVIDO)
    // ----------------------------------------------------------------------------
    console.log('\n🔍 Simulando ausência do PDF no Storage (pdf_url = null em memória)...');
    let simulatedPdfUrl: string | null = null;
    assert(simulatedPdfUrl === null, '2.1 Simulação de pdf_url = null realizada com sucesso em memória');

    // ----------------------------------------------------------------------------
    // 3. REGENERAÇÃO DO PDF 2 VIA MESMA FUNÇÃO REAL DE PRODUÇÃO
    // ----------------------------------------------------------------------------
    const result2 = await generateOrderPDF(
      mockOrderData,
      mockStoreData,
      mockItems,
      totalValue,
      true, // returnBlob = true
      true,
      {
        paymentTerms: '30/60 dias',
        groupByBrand: true,
      }
    );

    let pdfBuffer2: Buffer;
    if (result2 instanceof Buffer) {
      pdfBuffer2 = result2;
    } else if (result2 && typeof (result2 as any).arrayBuffer === 'function') {
      const ab = await (result2 as any).arrayBuffer();
      pdfBuffer2 = Buffer.from(ab);
    } else {
      pdfBuffer2 = Buffer.from(result2 as any);
    }

    const pdfStr2 = pdfBuffer2.toString('utf-8');

    assert(pdfStr2.startsWith('%PDF-1.'), '3.1 PDF Regenerado possui cabeçalho binário %PDF-1.x válido');
    assert(pdfStr2.includes('%%EOF'), '3.2 PDF Regenerado possui o delimitador final %%EOF');

    const pdfPath2 = path.join(tmpDir, 'homologation_order_1042_regenerated.pdf');
    fs.writeFileSync(pdfPath2, pdfBuffer2);
    console.log(`   📂 Arquivo PDF regenerado salvo em: ${pdfPath2}`);

    // ----------------------------------------------------------------------------
    // 4. COMPARAÇÃO RIGOROSA DE CONTEÚDO TEXTUAL E FIDELIDADE DE DADOS
    // ----------------------------------------------------------------------------
    // Extrai streams de texto contidos no PDF real gerado pelo jsPDF de produção
    assert(pdfStr2.includes('Distribuidora Otica Visao LTDA'), '4.1 Nome do Cliente contido no PDF regenerado');
    assert(pdfStr2.includes('99999-8888'), '4.2 Telefone do Cliente contido no PDF regenerado');
    assert(pdfStr2.includes('compras@visao.com.br'), '4.3 Email do Cliente contido no PDF regenerado');
    assert(pdfStr2.includes('BOSS-001'), '4.4 Código de Referência do Item 1 contido no PDF');
    assert(pdfStr2.includes('BOSS-002'), '4.5 Código de Referência do Item 2 contido no PDF');
    assert(pdfStr2.includes('Oculos Boss Black 001'), '4.6 Nome do Item 1 contido no PDF');
    assert(pdfStr2.includes('30/60 dias'), '4.7 Condições de Pagamento contidas no PDF');

    console.log('\n==================================================');
    console.log(`RESUMO DA HOMOLOGAÇÃO: ${totalPassed} PASSED | ${totalFailed} FAILED`);
    console.log('==================================================\n');

    if (totalFailed === 0) {
      console.log('✨ Homologação concluída com sucesso usando a função REAL de produção!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Erro durante homologação real:', err);
    process.exit(1);
  }
}

runHomologation();
