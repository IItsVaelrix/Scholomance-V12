#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

async function wait(url) {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (r.ok || r.status === 304) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('timeout');
}

async function main() {
  let child = null;
  try {
    const probe = await fetch(BASE, { signal: AbortSignal.timeout(1000) }).catch(() => null);
    if (!probe || !(probe.ok || probe.status === 304)) {
      child = spawn(
        'npx',
        ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
        { cwd: process.cwd(), stdio: 'pipe', shell: process.platform === 'win32' },
      );
      await wait(BASE);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-background-timer-throttling'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${BASE}/listen`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(5000);

  const inventory = await page.evaluate(() => {
    const ancestry = (el) => {
      const parts = [];
      let n = el;
      for (let i = 0; i < 8 && n; i++) {
        const cls =
          n.className && typeof n.className === 'string'
            ? '.' + [...n.classList].slice(0, 4).join('.')
            : '';
        const id = n.id ? '#' + n.id : '';
        parts.push((n.tagName || '?').toLowerCase() + id + cls);
        n = n.parentElement;
      }
      return parts.join(' < ');
    };
    return [...document.querySelectorAll('canvas')].map((c, i) => {
      const rect = c.getBoundingClientRect();
      const style = getComputedStyle(c);
      let ctxKind = 'none';
      try {
        if (c.getContext('webgl2')) ctxKind = 'webgl2';
        else if (c.getContext('webgl')) ctxKind = 'webgl';
        else if (c.getContext('2d')) ctxKind = '2d';
      } catch {
        /* ignore */
      }
      return {
        i,
        w: c.width,
        h: c.height,
        cssW: Math.round(rect.width),
        cssH: Math.round(rect.height),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        className: String(c.className || ''),
        parentClass: String(c.parentElement?.className || ''),
        ancestry: ancestry(c),
        inViewport: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight,
        area: c.width * c.height,
        ctxKind,
      };
    });
  });

  console.log(JSON.stringify(inventory, null, 2));
  await browser.close();
  if (child) child.kill('SIGTERM');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
