import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error(`Chrome/Chromium was not found. Checked: ${chromeCandidates.join(', ')}`);

const cabinet = (id, name, x, widthIn, kind = 'base-cabinet') => ({
  id,
  kind,
  name,
  x,
  y: 122,
  widthIn,
  depthIn: 24,
  heightIn: 34.5,
  rotation: 0,
  color: '#E8E5DE',
  finishId: 'warm-white-satin',
  material: 'Satin painted cabinet',
});

const upper = (id, name, x, widthIn) => ({
  id,
  kind: 'wall-cabinet',
  name,
  x,
  y: 92,
  widthIn,
  depthIn: 12,
  heightIn: 30,
  elevationIn: 54,
  rotation: 0,
  color: '#E8E5DE',
  finishId: 'warm-white-satin',
  material: 'Satin painted cabinet',
});

const range36 = {
  id: 'range-36-preview',
  kind: 'appliance',
  name: '36" Gas Range – 4 Burners + Center Griddle',
  x: 206,
  y: 118,
  widthIn: 36,
  depthIn: 28,
  heightIn: 36,
  rotation: 0,
  color: '#AEB3B7',
  finishId: 'stainless-steel',
  material: 'Brushed Stainless Steel',
  productId: 'gas-range-36-4-burner-griddle',
  variantId: 'gas-range-36-4-burner-griddle',
  applianceType: 'gas-range',
  fuelType: 'gas',
  burnerCount: 4,
  knobCount: 5,
  hasCenterGriddle: true,
  griddleHandle: true,
  griddleControlKnob: true,
  ovenType: 'double-side-by-side',
  ovenDoorCount: 2,
  dimensionsLocked: true,
};

const project = {
  version: 2,
  id: 'gas-range-runtime-preview-room',
  name: 'Kitchen AI — Gas Range Runtime Preview',
  room: {
    id: 'gas-range-runtime-preview-room',
    widthM: 6.2,
    lengthM: 4.8,
    heightM: 2.74,
    layout: 'single-wall',
    openings: [],
    confidence: 0.98,
    source: 'guided-camera',
    photos: [],
  },
  design: {
    id: 'gas-range-runtime-preview-design',
    name: 'Professional Stainless Kitchen',
    description: 'Runtime preview of the Kitchen AI gas range catalog.',
    style: 'modern',
    cabinetColor: 'white',
    countertop: 'quartz',
    accent: '#DDE8E3',
    includesIsland: false,
  },
  objects: [
    {
      id: 'wall-north',
      kind: 'wall',
      name: 'North Wall',
      x: 120,
      y: 82,
      widthIn: 244,
      depthIn: 4.5,
      heightIn: 96,
      rotation: 0,
      color: '#F2F0EB',
      wallPaintId: 'pure-white',
      material: 'Painted drywall',
    },
    {
      id: 'wall-west',
      kind: 'wall',
      name: 'West Wall',
      x: 82,
      y: 120,
      widthIn: 189,
      depthIn: 4.5,
      heightIn: 96,
      rotation: 90,
      color: '#F2F0EB',
      wallPaintId: 'pure-white',
      material: 'Painted drywall',
    },
    cabinet('base-left-1', 'Drawer Base', 140, 30, 'drawer-base'),
    cabinet('base-left-2', 'Base Cabinet', 170, 36),
    range36,
    cabinet('base-right-1', 'Base Cabinet', 242, 36),
    cabinet('base-right-2', 'Sink Base', 278, 36, 'sink-base'),
    upper('upper-left-1', 'Wall Cabinet', 140, 30),
    upper('upper-left-2', 'Wall Cabinet', 170, 36),
    upper('upper-right-1', 'Wall Cabinet', 242, 36),
    upper('upper-right-2', 'Glass Upper', 278, 36),
    {
      id: 'countertop-left',
      kind: 'countertop',
      name: 'Left Quartz Countertop',
      x: 140,
      y: 119,
      widthIn: 66,
      depthIn: 25.5,
      heightIn: 1.5,
      rotation: 0,
      color: '#EEECE5',
      material: 'White Quartz',
    },
    {
      id: 'countertop-right',
      kind: 'countertop',
      name: 'Right Quartz Countertop',
      x: 242,
      y: 119,
      widthIn: 72,
      depthIn: 25.5,
      heightIn: 1.5,
      rotation: 0,
      color: '#EEECE5',
      material: 'White Quartz',
    },
  ],
  selectedId: range36.id,
  viewMode: '3d',
  view2d: { zoom: 1, pan: { x: 0, y: 0 }, grid: true, snap: true, measurements: true },
  camera3d: { distance: 330, yaw: -24, pitch: 19, target: { x: 224, y: 142 } },
  catalogState: {
    favoriteWallPaintIds: [],
    recentWallPaintIds: [],
    favoriteCabinetFinishIds: [],
    recentCabinetFinishIds: [],
    customColors: [],
    compareWallPaintIds: [],
  },
  updatedAt: new Date().toISOString(),
};

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=swiftshader',
    '--window-size=1800,1080',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1800, height: 1080, deviceScaleFactor: 1 });
  page.on('console', message => console.log(`[browser:${message.type()}] ${message.text()}`));
  page.on('pageerror', error => console.error('[browser-error]', error));
  await page.evaluateOnNewDocument(value => {
    localStorage.setItem('kitchen-ai-project-v2', value);
  }, JSON.stringify(project));

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle0', timeout: 120_000 });

  const clickExactText = async (text, required = false) => {
    const clicked = await page.evaluate(label => {
      const candidates = Array.from(document.querySelectorAll('[role="button"],button,a,div,span'));
      const match = candidates.find(node => node.textContent?.trim() === label);
      if (!match) return false;
      const target = match.closest('[role="button"],button,a') || match;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    }, text);
    if (!clicked && required) throw new Error(`Could not click element with exact text: ${text}`);
    return clicked;
  };

  await page.waitForFunction(() => document.body.innerText.includes('Abrir mi proyecto guardado'), { timeout: 60_000 });
  await clickExactText('Abrir mi proyecto guardado', true);
  await page.waitForFunction(() => document.body.innerText.includes('Appliances'), { timeout: 60_000 });
  await new Promise(resolve => setTimeout(resolve, 1800));

  await clickExactText('3D');
  await new Promise(resolve => setTimeout(resolve, 700));
  await clickExactText('Fit View');
  await new Promise(resolve => setTimeout(resolve, 1200));
  await clickExactText('Appliances', true);
  await new Promise(resolve => setTimeout(resolve, 1400));

  const outputDir = path.resolve('runtime-preview');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({
    path: path.join(outputDir, 'kitchen-ai-gas-ranges-in-app.png'),
    fullPage: false,
  });

  await clickExactText('Fullscreen', true);
  await new Promise(resolve => setTimeout(resolve, 900));
  await clickExactText('Fit', true);
  await new Promise(resolve => setTimeout(resolve, 1600));
  await page.screenshot({
    path: path.join(outputDir, 'kitchen-ai-gas-range-fullscreen-3d.png'),
    fullPage: false,
  });

  console.log('Runtime screenshots saved in runtime-preview/.');
} finally {
  await browser.close();
}
