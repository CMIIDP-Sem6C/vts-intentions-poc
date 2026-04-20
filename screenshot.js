import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 15000 });
await new Promise(r => setTimeout(r, 3000));

await page.screenshot({ path: 'screenshot.png', fullPage: false });
console.log('Screenshot 1 saved (initial state)');

const shipIcons = await page.$$('.ship-icon');
console.log(`Found ${shipIcons.length} ship icons`);

if (shipIcons.length > 0) {
  await shipIcons[0].click();
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'screenshot-clicked.png', fullPage: false });
  console.log('Screenshot 2 saved (after clicking ship)');
}

const inspection = await page.evaluate(() => {
  try {
    return {
      rootChildCount: document.getElementById('root')?.childElementCount,
      hasLeafletContainer: !!document.querySelector('.leaflet-container'),
      hasShipIcons: document.querySelectorAll('.ship-icon').length,
      hasInboundPanel: !!document.querySelector('.inbound-panel'),
      hasShipInfoCard: !!document.querySelector('.ship-info-card'),
      mapHeight: document.querySelector('.vts-map')?.offsetHeight,
      mapWidth: document.querySelector('.vts-map')?.offsetWidth,
    };
  } catch (e) {
    return { error: e.message };
  }
});
console.log(JSON.stringify(inspection, null, 2));

await browser.close();
