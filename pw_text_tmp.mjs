import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 3 });
await page.goto('http://localhost:5173/listen', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);

const bz = await (await page.$('.signal-core__bezel'))?.boundingBox();
const center = { x: bz.x+bz.width/2, y: bz.y+bz.height/2 };
const info = await page.evaluate((c) => {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const txt = t.textContent.trim();
    if (!txt) continue;
    const r = t.parentElement.getBoundingClientRect();
    const cx = r.x + r.width/2, cy = r.y + r.height/2;
    const d = Math.hypot(cx - c.x, cy - c.y);
    if (d < 240) {
      const cs = getComputedStyle(t.parentElement);
      out.push({ txt: txt.slice(0,40), cls: (t.parentElement.className||'').toString().slice(0,60), z: cs.zIndex, op: cs.opacity, vis: cs.visibility, d: Math.round(d) });
    }
  }
  return out.sort((a,b)=>a.d-b.d);
}, center);
console.log('ORB CENTER', center);
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: '/tmp/orb_text.png', clip: { x: bz.x-30, y: bz.y-30, width: bz.width+60, height: bz.height+60 } });
await browser.close();
