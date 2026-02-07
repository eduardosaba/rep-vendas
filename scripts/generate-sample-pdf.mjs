import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

// Pequeno helper para converter SVG para data URI PNG-like (data:image/svg+xml;base64,...)
const svgToDataUrl = (svg) => {
  const cleaned = svg.replace(/\n+/g, '').replace(/>\s+</g, '><');
  return `data:image/svg+xml;base64,${Buffer.from(cleaned).toString('base64')}`;
};

const placeholderSvg = (text = 'IMG') => `
<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
  <rect width='100%' height='100%' fill='#f3f4f6' />
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='#9ca3af' font-family='Arial'>${text}</text>
</svg>`;

const products = Array.from({ length: 8 }).map((_, i) => ({
  id: `p-${i + 1}`,
  name: `Produto Exemplo ${i + 1}`,
  reference_code: `REF-00${i + 1}`,
  brand: i % 2 === 0 ? 'MarcaA' : 'MarcaB',
  category: 'Categoria X',
  price: 99.9 + i * 10,
  imageDataUrl: svgToDataUrl(placeholderSvg(`P${i + 1}`)),
  brandLogo: svgToDataUrl(placeholderSvg(i % 2 === 0 ? 'A' : 'B')),
}));

const generate = () => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const title = 'Catálogo de Exemplo';
  const primary = [37, 99, 235]; // #2563eb

  // Cover (template 1)
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 105, 140, { align: 'center' });

  doc.addPage();

  // Header
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setTextColor(13, 27, 44);
  doc.setFontSize(12);
  doc.text('Catálogo de Exemplo — Página 1', 14, 12);

  // Table-like list
  const startY = 30;
  let y = startY;
  const rowH = 30;
  products.forEach((p, idx) => {
    if (y + rowH > 287) {
      doc.addPage();
      y = startY;
    }

    // Image box
    const imgX = 14;
    const imgY = y;
    const imgW = 30;
    const imgH = 30;
    try {
      doc.addImage(p.imageDataUrl, 'PNG', imgX, imgY, imgW, imgH);
    } catch (e) {
      // fallback: draw rect
      doc.setFillColor(243, 244, 246);
      doc.rect(imgX, imgY, imgW, imgH, 'F');
    }

    // Details
    const detailsX = imgX + imgW + 6;
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(`${p.name}`, detailsX, imgY + 8);
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(
      `Ref: ${p.reference_code} • Marca: ${p.brand}`,
      detailsX,
      imgY + 15
    );
    doc.setFontSize(11);
    doc.setTextColor(0, 100, 0);
    doc.text(
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(p.price),
      190,
      imgY + 12,
      { align: 'right' }
    );

    // brand logo small
    try {
      doc.addImage(p.brandLogo, 'PNG', 170, imgY + 2, 18, 18);
    } catch {}

    y += rowH + 6;
  });

  const out = doc.output('arraybuffer');
  const dest = path.join(process.cwd(), 'tmp', 'sample_catalog.pdf');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(out));
  console.log('PDF salvo em', dest);
};

generate();
