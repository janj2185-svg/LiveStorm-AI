/* Local screenshot helper used while re-tuning the light theme. Not part of the build. */
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const BASE = flag('base', 'http://localhost:4173');
const OUT = resolve(process.cwd(), flag('out', '/tmp/sy/shots'));
const SCREENS = flag('screens', 'creator-dashboard').split(',');
const DEVICES = flag('devices', 'desktop').split(',');
const THEMES = flag('themes', 'light').split(',');
const FULL = args.includes('--full');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  static async attach(ws) {
    const c = new Cdp();
    c.socket = new WebSocket(ws);
    c.nextId = 1;
    c.pending = new Map();
    c.listeners = [];
    await new Promise((ok, fail) => {
      c.socket.addEventListener('open', () => ok(), { once: true });
      c.socket.addEventListener('error', () => fail(new Error('socket')), { once: true });
    });
    c.socket.addEventListener('message', (e) => {
      const m = JSON.parse(String(e.data));
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
  on(h) {
    this.listeners.push(h);
    return () => this.listeners.splice(this.listeners.indexOf(h), 1);
  }
  send(method, params = {}, timeoutMs = 25000) {
    const id = this.nextId++;
    return new Promise((ok, fail) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        fail(new Error(`${method} timeout`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => (clearTimeout(t), ok(v)),
        reject: (e) => (clearTimeout(t), fail(e)),
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
  const profile = mkdtempSync(join(tmpdir(), 'sy-shots-'));
  PORT = 9300 + Math.floor(Math.random() * 3000);
  chrome = spawn(
    '/opt/google/chrome/chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  );
}

function killChrome() {
  if (!chrome?.pid) return;
  try {
    process.kill(-chrome.pid, 'SIGKILL');
  } catch {
    try {
      chrome.kill('SIGKILL');
    } catch {}
  }
  chrome = null;
}

async function endpoint() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const r = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      if (r.webSocketDebuggerUrl) return r.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('no devtools');
}

const FREEZE = `(() => {
  if (document.getElementById('sy-freeze')) return;
  const s = document.createElement('style');
  s.id = 'sy-freeze';
  s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';
  document.head.appendChild(s);
})()`;

const PROBE = `(() => {
  const root = document.querySelector('.sy-device__viewport');
  if (!root) return null;
  const scrolls = (el) => ['auto','scroll','hidden','clip'].includes(getComputedStyle(el).overflowX);
  let worst = null;
  for (const el of root.querySelectorAll('*')) {
    if (el.clientWidth < 40) continue;
    if (el.closest('.sy-sr-only')) continue;
    const over = el.scrollWidth - el.clientWidth;
    if (over <= 2 || scrolls(el)) continue;
    let a = el.parentElement, inS = false;
    while (a && a !== root) { if (scrolls(a)) { inS = true; break; } a = a.parentElement; }
    if (inS) continue;
    if (!worst || over > worst.over) worst = { over, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, selector: (el.tagName + '.' + String(el.className || '')).slice(0, 90) };
  }
  return worst;
})()`;

const BOX = `(() => { const el = document.querySelector('.sy-device__frame'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; })()`;

const GROW = `(() => {
  const vp = document.querySelector('.sy-device__viewport');
  const fr = document.querySelector('.sy-device__frame');
  if (!vp || !fr) return 0;
  let tallest = 0;
  for (const el of vp.querySelectorAll('*')) {
    const o = getComputedStyle(el).overflowY;
    if (o === 'auto' || o === 'scroll') tallest = Math.max(tallest, el.scrollHeight);
  }
  const target = Math.min(Math.max(tallest, vp.scrollHeight) + 40, 9000);
  fr.style.height = target + 'px';
  vp.style.height = target + 'px';
  return target;
})()`;

let browser = null;

async function newBrowser() {
  try {
    browser?.close();
  } catch {}
  killChrome();
  await sleep(300);
  launch();
  browser = await Cdp.attach(await endpoint());
}

async function openTarget() {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = await Cdp.attach(list.find((t) => t.id === targetId).webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  return { page, targetId };
}

async function captureOne(screen, device, theme) {
  const { page, targetId } = await openTarget();
  try {
    const loaded = new Promise((ok) => {
      const t = setTimeout(ok, 20000);
      page.on((m) => {
        if (m === 'Page.loadEventFired') {
          clearTimeout(t);
          ok();
        }
      });
    });
    await page.send('Page.navigate', { url: `${BASE}/#/${screen}?device=${device}&theme=${theme}&chrome=0` });
    await loaded;
    await sleep(900);
    await page.send('Runtime.evaluate', { expression: FREEZE });
    await sleep(150);
    if (FULL) {
      await page.send('Runtime.evaluate', { expression: GROW });
      await sleep(350);
    }
    const probe = await page.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const box = await page.send('Runtime.evaluate', { expression: BOX, returnByValue: true });
    const clip = box.result.value;
    const area = clip ? clip.width * clip.height : 0;
    const scale = area * 4 > 4_000_000 ? 1 : 2;
    const shot = await page.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true, ...(clip ? { clip: { ...clip, scale } } : {}) },
      60000,
    );
    writeFileSync(resolve(OUT, `${screen}__${device}__${theme}.png`), Buffer.from(shot.data, 'base64'));
    return probe.result.value ? { screen, device, theme, ...probe.result.value } : null;
  } finally {
    page.close();
    await browser.send('Target.closeTarget', { targetId }).catch(() => {});
  }
}

const main = async () => {
  await newBrowser();
  const overflows = [];
  let n = 0;
  for (const device of DEVICES) {
    for (const theme of THEMES) {
      for (const screen of SCREENS) {
        if (n > 0 && n % 24 === 0) await newBrowser();
        let attempt = 0;
        for (;;) {
          try {
            const o = await captureOne(screen, device, theme);
            if (o) overflows.push(o);
            break;
          } catch (error) {
            attempt += 1;
            if (attempt > 2) {
              console.error(`FAILED ${screen} ${device}/${theme}: ${error.message}`);
              break;
            }
            await newBrowser();
          }
        }
        n += 1;
        process.stdout.write(`  ${screen} ${device} ${theme}\n`);
      }
    }
  }
  if (overflows.length) {
    console.log('\nOVERFLOW:');
    for (const o of overflows)
      console.log(`  ${o.screen} ${o.device}/${o.theme}: ${o.selector} ${o.scrollWidth} in ${o.clientWidth}`);
  } else console.log('\nno overflow');
  try {
    browser.close();
  } catch {}
  killChrome();
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  killChrome();
  process.exit(1);
});
