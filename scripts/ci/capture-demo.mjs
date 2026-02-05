import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const url = process.env.DEMO_URL || 'http://localhost:3000/demo/pdf';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Click 'Visualizar como Revista' button
  const btn = await page.$x("//button[contains(., 'Visualizar como Revista')]");
  if (btn && btn.length > 0) {
    await btn[0].click();
    console.log('Clicked preview button');
  } else {
    console.warn('Preview button not found');
  }

  // Wait for flipbook pages to render
  try {
    await page.waitForSelector('.page', { timeout: 10000 });
    console.log('Flipbook pages detected');
  } catch (e) {
    console.warn('Flipbook pages not detected:', e.message);
  }

  // Capture screenshot of modal area
  const modal = await page.$('div[style*="position: fixed"][style*="z-index"]');
  const outPath = 'tmp/demo-pdf-preview.png';
  if (modal) {
    await modal.screenshot({ path: outPath });
    console.log('Saved screenshot to', outPath);
  } else {
    // full page fallback
    await page.screenshot({ path: outPath, fullPage: true });
    console.log('Saved full page screenshot to', outPath);
  }

  await browser.close();
}

run().catch((e) => {
  console.error('Error in capture-demo:', e);
  process.exit(1);
});
