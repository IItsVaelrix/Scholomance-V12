import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5173/combat', { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
await p.waitForTimeout(3500);
// Chrome bar clip
await p.screenshot({ path: './_chrome.png', clip: { x:0, y:0, width:1440, height:52 } });
// Left leaf clip
await p.screenshot({ path: './_leftleaf.png', clip: { x:0, y:50, width:720, height:850 } });
await b.close();
