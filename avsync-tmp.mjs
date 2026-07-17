/**
 * Measure the ONE relationship my earlier probes were blind to:
 * where is the audio ACTUALLY, versus what audio.currentTime claims?
 *
 * Method: the engine's AnalyserNode taps the live graph. Sample its energy,
 * stamped with el.currentTime. Cross-correlate against the mp3's known offline
 * RMS envelope. The lag that maximises correlation IS the offset between
 * currentTime and the real audio. Do it before AND after a pause.
 *
 * A positive lag means the audio is BEHIND currentTime -> the highlight leads.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const HOP = 0.02; // envelope resolution, seconds
const env = fs
  .readFileSync('/tmp/claude-1000/-home-deck-Downloads-Scholomance-V12-main/6c479bdb-3669-4ba0-a5f9-cf076f5e08f9/scratchpad/envelope.csv', 'utf8')
  .trim().split('\n').map(Number).map((v) => (Number.isFinite(v) ? v : -120));

const browser = await chromium.launch({ headless: false, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();

// Patch BEFORE any page code runs, so we capture the engine's own analyser.
await page.addInitScript(() => {
  window.__analysers = [];
  const OrigAC = window.AudioContext;
  function Patched(...a) {
    const c = new OrigAC(...a);
    const origCreate = c.createAnalyser.bind(c);
    c.createAnalyser = () => { const n = origCreate(); window.__analysers.push(n); return n; };
    window.__ctx = c;
    return c;
  }
  Patched.prototype = OrigAC.prototype;
  window.AudioContext = Patched;
});

await page.goto('http://localhost:5199/visualiser/album/scholomancer', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { document.querySelector('audio').currentTime = 20; });
await page.click('button[aria-label="Play"]');
await page.waitForTimeout(1500);

const grab = (ms) =>
  page.evaluate(async (ms) => {
    const an = window.__analysers[0];
    if (!an) return { error: 'no analyser captured' };
    const a = document.querySelector('audio');
    const buf = new Uint8Array(an.frequencyBinCount);
    const rows = [];
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      an.getByteFrequencyData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      rows.push({ t: a.currentTime, e: Math.sqrt(s / buf.length) });
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { rows };
  }, ms);

// correlation of sampled energy vs offline envelope shifted by lag
function bestLag(rows) {
  const norm = (arr) => {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length) || 1;
    return arr.map((x) => (x - m) / sd);
  };
  const out = [];
  for (let lagMs = -600; lagMs <= 600; lagMs += 20) {
    const lag = lagMs / 1000;
    const xs = [];
    const ys = [];
    for (const r of rows) {
      const idx = Math.round((r.t - lag) / HOP);
      if (idx < 0 || idx >= env.length) continue;
      xs.push(r.e);
      ys.push(env[idx]);
    }
    if (xs.length < 40) continue;
    const nx = norm(xs);
    const ny = norm(ys);
    let c = 0;
    for (let i = 0; i < nx.length; i++) c += nx[i] * ny[i];
    out.push({ lagMs, r: c / nx.length });
  }
  out.sort((a, b) => b.r - a.r);
  return out;
}

const before = await grab(7000);
if (before.error) { console.log('ERR:', before.error); await browser.close(); process.exit(1); }
await page.click('button[aria-label="Pause"]');
await page.waitForTimeout(1200);
await page.click('button[aria-label="Play"]');
await page.waitForTimeout(1500);
const after = await grab(7000);
await browser.close();

for (const [label, res] of [['BEFORE pause', before], ['AFTER pause -> play', after]]) {
  const top = bestLag(res.rows);
  console.log(`\n=== ${label} — ${res.rows.length} samples ===`);
  console.log(`  best lag ${top[0].lagMs > 0 ? '+' : ''}${top[0].lagMs}ms   r=${top[0].r.toFixed(3)}`);
  console.log(`  runners up: ${top.slice(1, 4).map((x) => `${x.lagMs}ms(r=${x.r.toFixed(2)})`).join('  ')}`);
}
console.log('\n(positive lag = audio BEHIND currentTime = highlight leads the vocal)');
