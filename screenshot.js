import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 15000 });
await new Promise(r => setTimeout(r, 3000));

await page.screenshot({ path: 'screenshot.png', fullPage: false });
console.log('Screenshot 1 saved (initial state)');

const rows = await page.$$('.inbound-row');
console.log(`Found ${rows.length} inbound rows`);
if (rows.length > 0) {
  await rows[0].click();
  await new Promise(r => setTimeout(r, 500));
}

await page.screenshot({ path: 'screenshot-clicked.png', fullPage: false });
console.log('Screenshot 2 saved (after clicking row)');

const inspection = await page.evaluate(() => {
  try {
    return {
      shipIconCount: document.querySelectorAll('.ship-icon').length,
      namedShipCount: document.querySelectorAll('.ship-name-tooltip').length,
      hasInboundPanel: !!document.querySelector('.inbound-panel'),
      hasShipInfoCard: !!document.querySelector('.ship-info-card'),
      hasScanBtn: !!document.querySelector('.scan-ais-btn'),
      hasDestInput: !!document.querySelector('.dest-input'),
    };
  } catch (e) {
    return { error: e.message };
  }
});
console.log(JSON.stringify(inspection, null, 2));

await browser.close();
