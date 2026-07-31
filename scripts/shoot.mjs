/**
 * Minimal capture helper used while auditing the light-theme migration.
 * One target per capture, one navigation per target, clip to the device frame.
 *
 * Usage: node scripts/shoot.mjs <out-dir> <screens csv> <devices csv> <themes csv> [base]
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [outArg, screensArg, devicesArg, themesArg, baseArg] = process.argv.slice(2);
const OUT = resolve(process.cwd(), outArg ?? '/tmp/shots');
const SCREENS = (screensArg ?? 'home').split(',');
const DEVICES = (devicesArg ?? 'iphone').split(',');
const THEMES = (themesArg ?? 'light').split(',');
const BASE = baseArg ?? 'http://localhost:4173';

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  static async attach(url) {
    const c = new Cdp();
    c.socket = new WebSocket(url);
    c.pending = new Map();
    c.nextId = 1;
    c.listeners = [];
    await new Promise((ok, fail) => {
      c.socket.addEventListener('open', () => ok(), { once: true });
      c.socket.addEventListener('error', () => fail(new Error('socket')), { once: true });
    });
    c.socket.addEventListener('message', (event) => {
      const m = JSON.parse(String(event.data));
      const w = m.id !== undefined ? c.pending.get(m.id) : undefined;
      if (w) {
        c.pending.delete(m.id);
        m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result);
        return;
      }
      if (m.method) for (const h of [...c.listeners]) h(m.method, m.params);
    });
    return c;
  }
  on(handler) {
    this.listeners.push(handler);
    return () => this.listeners.splice(this.listeners.indexOf(handler), 1);
  }
  send(method, params = {}, timeoutMs = 30000) {
    const id = this.nextId++;
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        fail(new Error(`${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => (clearTimeout(timer), ok(v)),
        reject: (e) => (clearTimeout(timer), fail(e)),
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try {
      this.socket.close();
    } catch {}
  }
}

let chrome = null;
let PORT = 0;

function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'sy-shot-'));
  PORT = 9500 + Math.floor(Math.random() * 3000);
  chrome = spawn(
    '/opt/google/chrome/chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      '--window-size=1700,1300',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  );
}

function kill() {
  if (!chrome?.pid) return;
  try {
    process.kill(-chrome.pid, 'SIGKILL');
  } catch {}
  chrome = null;
}

async function endpoint() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const b = await r.json();
      if (b.webSocketDebuggerUrl) return b.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('no devtools endpoint');
}

const FREEZE = `(() => {
  if (document.getElementById('sy-freeze')) return;
  const s = document.createElement('style');
  s.id = 'sy-freeze';
  s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; will-change: auto !important; }';
  (document.head || document.documentElement).appendChild(s);
})()`;

/* Injected before any page script runs: the ambient field animates two very
   large gradients, and a renderer busy compositing them stops answering CDP. */
const FREEZE_EARLY = `document.addEventListener('DOMContentLoaded', () => { ${FREEZE} });`;

const OVERFLOW = `(() => {
  const root = document.querySelector('.sy-device__viewport');
  if (!root) return null;
  const scrolls = (el) => {
    const o = getComputedStyle(el).overflowX;
    return o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip';
  };
  let worst = null;
  for (const el of root.querySelectorAll('*')) {
    if (el.clientWidth < 40) continue;
    if (el.closest('.sy-sr-only')) continue;
    const over = el.scrollWidth - el.clientWidth;
    if (over <= 2) continue;
    if (scrolls(el)) continue;
    let a = el.parentElement, inScroller = false;
    while (a && a !== root) { if (scrolls(a)) { inScroller = true; break; } a = a.parentElement; }
    if (inScroller) continue;
    if (!worst || over > worst.over) {
      worst = { over, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        selector: typeof el.className === 'string' && el.className
          ? el.tagName.toLowerCase() + '.' + el.className.split(/\\s+/).slice(0, 2).join('.')
          : el.tagName.toLowerCase() };
    }
  }
  return worst;
})()`;

async function main() {
  launch();
  let browser = await Cdp.attach(await endpoint());
  let sinceRestart = 0;
  const problems = [];

  async function restart() {
    browser.close();
    kill();
    await sleep(400);
    launch();
    browser = await Cdp.attach(await endpoint());
    sinceRestart = 0;
  }

  for (const device of DEVICES) {
    for (const theme of THEMES) {
      for (const screen of SCREENS) {
        if (sinceRestart >= 20) await restart();
        sinceRestart += 1;
        let target = null;
        try {
          const created = await browser.send('Target.createTarget', { url: 'about:blank' });
          target = created.targetId;
          const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
          const page = await Cdp.attach(list.find((t) => t.id === target).webSocketDebuggerUrl);
          await page.send('Page.enable');
          await page.send('Runtime.enable');
          await page.send('Page.addScriptToEvaluateOnNewDocument', { source: FREEZE_EARLY });
          page.on((method, params) => {
            if (method === 'Runtime.exceptionThrown') {
              problems.push(`${screen}/${device}/${theme} threw: ${params.exceptionDetails?.text}`);
            }
          });
          const loaded = new Promise((ok) => {
            const t = setTimeout(ok, 25000);
            const off = page.on((m) => {
              if (m === 'Page.loadEventFired') {
                clearTimeout(t);
                off();
                ok();
              }
            });
          });
          await page.send('Page.navigate', {
            url: `${BASE}/#/${screen}?device=${device}&theme=${theme}&chrome=0`,
          });
          await loaded;
          await sleep(1600);
          await page.send('Runtime.evaluate', { expression: FREEZE });
          await sleep(200);

          const over = await page.send('Runtime.evaluate', { expression: OVERFLOW, returnByValue: true });
          if (over.result.value) {
            const v = over.result.value;
            problems.push(
              `${screen}/${device}/${theme} overflow: ${v.selector} ${v.scrollWidth}px in ${v.clientWidth}px`,
            );
          }

          const box = await page.send('Runtime.evaluate', {
            expression: `(() => {
              const el = document.querySelector('.sy-device__frame');
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
            })()`,
            returnByValue: true,
          });
          const clip = box.result.value;
          const area = clip ? clip.width * clip.height : 0;
          const scale = area * 4 > 2_000_000 ? 1 : 2;
          const shot = await page.send(
            'Page.captureScreenshot',
            { format: 'png', captureBeyondViewport: true, ...(clip ? { clip: { ...clip, scale } } : {}) },
            60000,
          );
          writeFileSync(resolve(OUT, `${screen}__${device}__${theme}.png`), Buffer.from(shot.data, 'base64'));
          process.stdout.write(`  ${screen}__${device}__${theme}.png\n`);
          page.close();
        } catch (error) {
          console.error(`FAILED ${screen}/${device}/${theme}: ${error.message}`);
          await restart();
          continue;
        }
        await browser.send('Target.closeTarget', { targetId: target }).catch(() => {});
      }
    }
  }

  browser.close();
  kill();
  if (problems.length) console.error(`\n${problems.join('\n')}`);
}

main().catch((e) => {
  console.error(e);
  kill();
  process.exit(1);
});
