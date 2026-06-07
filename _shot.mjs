import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
try { await p.goto('http://localhost:5173/combat', { waitUntil: 'networkidle', timeout: 30000 }); }
catch (e) { console.log('GOTO WARN:', e.message); }
await p.waitForTimeout(3500);
await p.screenshot({ path: './_combat-1440.png' });
const m = await p.evaluate(() => {
  const q = s => document.querySelector(s);
  const r = s => { const el=q(s); if(!el) return null; const b=el.getBoundingClientRect(); return {t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),rt:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height)}; };
  return {
    win: { w: innerWidth, h: innerHeight },
    chrome: r('.battle-chrome'), main: r('.combat-page--codex'),
    spread: r('.combat-book-spread'), textPage: r('.combat-text-page'),
    illoPage: r('.combat-illustration-page'), footer: r('.hotkey-footer'),
    spineGapL: (()=>{const t=q('.combat-text-page'),i=q('.combat-illustration-page');if(!t||!i)return null;return Math.round(i.getBoundingClientRect().left - t.getBoundingClientRect().right);})(),
  };
});
console.log(JSON.stringify(m, null, 2));
console.log('CONSOLE ERRORS:', errs.slice(0,5));
await b.close();
