import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const FILL = "#1A237E";
const FILL_SEL = "#283593";

const STATUS_COLORS = {
  green: "#4CAF50",
  yellow: "#FF9800",
  red: "#F44336",
};

const STATUS_LABELS = {
  green: "Volledig",
  yellow: "Gedeeltelijk",
  red: "Onbekend",
};

const SHIP_SCALE = 6;
const HULL_VIEWBOX = 36;
const RENDER_SIZE = HULL_VIEWBOX * SHIP_SCALE;
const STATUS_STROKE_WIDTH = 2.2;

function buildHullSvg(statusColor) {
  const rot = 90 - 90;
  return `
    <svg width="${RENDER_SIZE}" height="${RENDER_SIZE}" viewBox="0 0 ${HULL_VIEWBOX} ${HULL_VIEWBOX}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${rot}, 18, 18)">
        <path d="M 4,14.5 L 28,14.5 Q 33,18 28,21.5 L 4,21.5 Z"
          fill="${FILL}"
          stroke="${statusColor}"
          stroke-width="${STATUS_STROKE_WIDTH}"
          stroke-linejoin="round"
          stroke-linecap="round" />
      </g>
    </svg>
  `;
}

function buildHtml() {
  const rows = ["green", "yellow", "red"]
    .map((level) => {
      const color = STATUS_COLORS[level];
      const label = STATUS_LABELS[level];
      return `
        <div class="row">
          <div class="ship">${buildHullSvg(color)}</div>
          <div class="meta">
            <span class="swatch" style="background:${color}"></span>
            <span class="label">${label}</span>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
          }
          .container {
            display: inline-flex;
            flex-direction: column;
            gap: 24px;
            padding: 40px 56px;
            background: #ffffff;
          }
          .row {
            display: flex;
            align-items: center;
            gap: 28px;
          }
          .ship {
            width: ${RENDER_SIZE}px;
            height: ${RENDER_SIZE}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .meta {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .swatch {
            width: 18px;
            height: 18px;
            border-radius: 4px;
            display: inline-block;
            border: 1px solid rgba(0,0,0,0.1);
          }
          .label {
            font-size: 22px;
            color: #263238;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container" id="capture">
          ${rows}
        </div>
      </body>
    </html>
  `;
}

async function main() {
  const outDir = path.resolve("docs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "ship-status-symbols.png");

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 800, height: 1000, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();

  await page.setContent(buildHtml(), { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 200));

  const element = await page.$("#capture");
  await element.screenshot({ path: outFile, omitBackground: false });

  await browser.close();

  console.log("Saved", outFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
