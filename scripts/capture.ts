/**
 * Screenshot harness.
 * ---------------------------------------------------------------------------
 * Drives a headless Chrome over the DevTools Protocol using Node's built-in
 * WebSocket — no Puppeteer, no Playwright, no extra dependency in a repository
 * whose entire point is that it has almost none.
 *
 * Usage:
 *   tsx scripts/capture.ts --out design/captures            every screen, desktop, dark
 *   tsx scripts/capture.ts --screens home,live-viewer --devices iphone,desktop --themes dark,light
 *   tsx scripts/capture.ts --sheet                          one contact sheet per device
 *
 * The harness also reports any screen that overflows its device viewport
 * horizontally, which is the failure mode a static mockup can never catch.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { DEVICES, DEVICE_ORDER, type DeviceId } from '../src/showcase/devices.js';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const has = (name: string) => args.includes(`--${name}`);

const BASE = flag('base', 'http://localhost:5174');
const OUT = resolve(process.cwd(), flag('out', 'design/captures')!);
const DEVICE_LIST = (flag('devices', 'desktop')!.split(',') as DeviceId[]).filter((d) => DEVICES[d]);
const THEMES = flag('themes', 'dark')!.split(',');

mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ */
/* Minimal CDP client                                                  */
/* ------------------------------------------------------------------ */

class Cdp {
  private socket!: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  static async attach(wsUrl: string): Promise<Cdp> {
    const client = new Cdp();
    client.socket = new WebSocket(wsUrl);
    await new Promise<void>((ok, fail) => {
      client.socket.addEventListener('open', () => ok(), { once: true });
      client.socket.addEventListener('error', () => fail(new Error('CDP socket failed')), { once: true });
    });
    client.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      const waiter = message.id !== undefined ? client.pending.get(message.id) : undefined;
      if (waiter) {
        client.pending.delete(message.id);
        if (message.error) waiter.reject(new Error(`CDP error: ${JSON.stringify(message.error)}`));
        else waiter.resolve(message.result);
        return;
      }
      if (message.method) {
        for (const handler of [...client.listeners]) handler(message.method, message.params);
      }
    });
    return client;
  }

  private listeners: ((method: string, params: any) => void)[] = [];

  /** Subscribe to CDP events. Returns an unsubscribe function. */
  on(handler: (method: string, params: any) => void): () => void {
    this.listeners.push(handler);
    return () => {
      const index = this.listeners.indexOf(handler);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  /**
   * Every call is bounded. A CDP request that never gets a reply — an
   * `awaitPromise` on a promise the page never settles, for example — would
   * otherwise hang the whole sweep with no output at all.
   */
  send<T = any>(method: string, params: Record<string, unknown> = {}, timeoutMs = 20000): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((ok, fail) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        fail(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          ok(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          fail(error);
        },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until the device viewport has real content and webfonts have settled.
 * Polling a DOM condition is far more reliable than a fixed delay, and it keeps
 * a 50-screen sweep from taking minutes of padded sleeps.
 */
/**
 * Resolve on the page's next load event.
 *
 * Evaluating script while a navigation is still in flight targets an execution
 * context that is about to be destroyed, and the request is silently dropped —
 * which manifests as a CDP call that never returns.
 */
function waitForLoad(page: Cdp, timeoutMs = 20000): Promise<void> {
  return new Promise((ok) => {
    const finish = () => {
      clearTimeout(timer);
      off();
      ok();
    };
    const timer = setTimeout(finish, timeoutMs);
    const off = page.on((method) => {
      if (method === 'Page.loadEventFired') finish();
    });
  });
}

async function waitForRender(page: Cdp, timeoutMs = 12000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { result } = await page.send<{ result: { value: boolean } }>('Runtime.evaluate', {
      expression: `!!document.querySelector('.sy-device__viewport')?.childElementCount`,
      returnByValue: true,
    });
    if (result.value) {
      /*
        Settle time rather than a font-loading promise. Headless Chrome leaves
        `document.fonts.ready` pending indefinitely for faces it decides not to
        fetch, so awaiting it deadlocks. Animation is frozen for the sweep, so
        this only has to cover layout and the webfont swap.
      */
      await sleep(350);
      return;
    }
    await sleep(120);
  }
  throw new Error('Timed out waiting for the preview to render');
}

/* ------------------------------------------------------------------ */
/* Launch                                                              */
/* ------------------------------------------------------------------ */

let PORT = 9222 + Math.floor(Math.random() * 400);
let chrome: ReturnType<typeof spawn> | null = null;

/**
 * Launch an isolated headless Chrome.
 *
 * The dedicated profile directory matters: a second Chrome started while
 * another is alive quietly hands control to the first instance, and every
 * DevTools call after that is answered by the wrong browser — which presents
 * as requests that simply never return.
 */
function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'sylora-capture-'));
  PORT = 9222 + Math.floor(Math.random() * 4000);
  chrome = spawn(
    '/opt/google/chrome/chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      // Software rasterisation. The aurora backdrop is a pair of very large
      // blurred radial gradients; on the GPU path headless hangs outright at
      // tablet size, while SwiftShader renders it in well under a second.
      '--disable-gpu',
      // Large enough to hold the tallest device (tablet, 1194pt) without the
      // page needing to scroll, which keeps captures free of clipping artefacts.
      'about:blank',
    ],
    // Own process group, so the whole tree can be torn down at once.
    { stdio: 'ignore', detached: true },
  );
}

/**
 * Kill Chrome and everything it spawned.
 *
 * Chrome forks a zygote plus a renderer and GPU process per tab. Signalling
 * only the parent leaves those children alive holding hundreds of megabytes
 * each; after a dozen restarts the machine is under enough memory pressure
 * that even a freshly launched browser stops responding. Killing the process
 * group is what makes repeated restarts actually reclaim anything.
 */
function killChrome() {
  if (!chrome?.pid) return;
  try {
    process.kill(-chrome.pid, 'SIGKILL');
  } catch {
    try {
      chrome.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
  chrome = null;
}

async function endpoint(): Promise<string> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const body = (await response.json()) as { webSocketDebuggerUrl: string };
      if (body.webSocketDebuggerUrl) return body.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a DevTools endpoint');
}

interface ScreenMeta {
  id: string;
  name: string;
  group: string;
  immersive?: boolean;
}

interface Overflow {
  screen: string;
  device: DeviceId;
  theme: string;
  scrollWidth: number;
  clientWidth: number;
  selector: string;
}

async function main() {
  launchChrome();
  let browser = await Cdp.attach(await endpoint());

  /**
   * Open a fresh page target and wire up its listeners.
   *
   * Used both at startup and as the recovery path: a renderer that has stopped
   * answering DevTools cannot be fixed by reloading it, because the reload
   * itself needs the renderer. Replacing the target always works.
   */
  const pageErrors: string[] = [];
  let currentTargetId: string | null = null;

  async function createPage(): Promise<Cdp> {
    if (currentTargetId) {
      await browser.send('Target.closeTarget', { targetId: currentTargetId }).catch(() => {});
    }
    const { targetId } = await browser.send<{ targetId: string }>('Target.createTarget', {
      url: 'about:blank',
    });
    currentTargetId = targetId;
    const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as {
      id: string;
      webSocketDebuggerUrl: string;
    }[];
    const next = await Cdp.attach(list.find((t) => t.id === targetId)!.webSocketDebuggerUrl);

    await next.send('Page.enable');
    await next.send('Runtime.enable');
    next.on((method, params) => {
      if (method === 'Runtime.exceptionThrown') {
        const detail = params.exceptionDetails;
        pageErrors.push(detail?.exception?.description ?? detail?.text ?? 'Unknown exception');
      }
      if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
        pageErrors.push(params.args?.map((a: any) => a.value ?? a.description).join(' ') ?? '');
      }
    });
    return next;
  }

  let page = await createPage();

  /*
    Surface page errors. A screen that throws at render would otherwise be
    captured as a plausible-looking blank frame, which is exactly the class of
    failure this harness exists to catch.
  */
  // One document load for the whole sweep. The gallery starts with its chrome
  // showing so the screen registry can be read out of the navigation list.
  const verbose = has('verbose');
  const stage = (label: string) => verbose && console.error(`[stage] ${label}`);

  const requested = flag('screens');

  /*
    Bootstrap only when the screen list has to be discovered.

    Loading the gallery with all of its chrome leaves the browser in a state
    where a later bare-mode target can hang indefinitely at tablet and
    large-phone sizes. When the caller names the screens, that load is
    unnecessary — so it is skipped, and the process performs nothing but the
    single navigation per capture that is known to be reliable.
  */
  if (!requested) {
    stage('navigating');
    const loaded = waitForLoad(page);
    await page.send('Page.navigate', { url: `${BASE}/#/home?device=desktop&theme=dark` });
    await loaded;
    stage('loaded');
    await sleep(1500);
  }

  /*
    Freeze animation for the duration of the sweep.

    Two reasons. First, determinism: a spinner, the aurora drift and the live
    pulse would otherwise land at a different phase in every run, so no two
    captures of the same screen would ever be byte-identical. Second, and more
    practically, a page with continuously running compositor animations never
    reaches the stable frame that a clipped screenshot waits for, so captures
    simply hang.

    `animation: none` rather than a paused state, so elements with
    `animation-fill-mode: backwards` render at their natural values instead of
    being stuck at opacity 0.
  */
  const freezeExpression = `(() => {
    if (document.getElementById('sy-capture-freeze')) return;
    const style = document.createElement('style');
    style.id = 'sy-capture-freeze';
    style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';
    document.head.appendChild(style);
  })()`;

  await page.send('Runtime.evaluate', { expression: freezeExpression });

  /*
    Recycle the document periodically.

    Mounting several hundred distinct screens into one long-lived page leaves
    the renderer progressively slower until evaluations start timing out — it
    fails reliably somewhere past the fortieth capture. Reloading resets that
    without restarting the browser, at a cost of about a second per batch.
  */
  const RESET_EVERY = 60;

  /**
   * Throw the browser process away and start again.
   *
   * Used to recycle periodically and as the recovery path. Killing the process
   * group rather than the parent is what actually reclaims memory, because
   * Chrome's renderer and GPU children outlive a signal sent only to the
   * launcher.
   */
  async function restartBrowser() {
    try {
      page.close();
      browser.close();
    } catch {
      /* already gone */
    }
    killChrome();
    await sleep(400);
    launchChrome();
    browser = await Cdp.attach(await endpoint());
    currentTargetId = null;
    page = await createPage();
  }

  if (requested) {
    // Names supplied: no discovery needed, and therefore no bootstrap load.
    await runSweep(requested.split(',').map((id) => ({ id, name: id, group: '' }) as ScreenMeta));
    return;
  }

  stage('reading registry');

  // The screen list is read out of the running gallery rather than imported,
  // so the harness can never drift from what the app actually renders.
  const registry = await page.send<{ result: { value: ScreenMeta[] } }>('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('[data-screen-id]')).map((node) => ({
      id: node.dataset.screenId,
      name: node.textContent.trim(),
      group: node.closest('section')?.querySelector('h2')?.textContent ?? '',
      immersive: node.dataset.screenImmersive === 'true',
    }))`,
    returnByValue: true,
  });

  const all = registry.result.value;
  if (!all || all.length === 0) throw new Error('No screens found in the gallery.');

  await runSweep(all);
  return;

  /**
   * Run the sweep for a given screen list.
   *
   * Extracted so it can be invoked either with an explicitly named list — in
   * which case no gallery bootstrap happens at all — or with the list read
   * out of the running app.
   */
  async function runSweep(screens: ScreenMeta[]) {
    const overflows: Overflow[] = [];
    let captured = 0;

    /*
      Warm-up.

      The first bare-mode load after the gallery bootstrap reliably wedges the
      renderer at tablet and large-phone sizes — and only there. Rather than lose
      a real screen to it, a throwaway target absorbs the failure: it is created,
      pointed at the first combination, given a moment, and discarded whatever
      happens.
    */
    stage('warming up');
    try {
      const warm = await createPage();
      const ready = waitForLoad(warm, 8000);
      await warm.send(
        'Page.navigate',
        { url: `${BASE}/#/${screens[0].id}?device=${DEVICE_LIST[0]}&theme=${THEMES[0]}&chrome=0` },
        8000,
      );
      await ready;
      await sleep(1500);
      warm.close();
    } catch {
      /* the warm-up is allowed to fail; that is its entire purpose */
    }
    await restartBrowser();
    stage('warm');

    /**
     * Capture one screen/device/theme combination.
     *
     * The gallery is driven through its fragment rather than renavigating: each
     * `Page.navigate` tears down the execution context, and evaluating into the
     * replacement is racy enough that requests get dropped and never answered.
     * One document load, then pure state changes.
     */
    /**
     * Capture one screen/device/theme combination.
     *
     * Every capture gets a brand-new page target that performs exactly one
     * navigation. That constraint is the whole reliability story: a target which
     * navigates a second time intermittently stops answering `Runtime.evaluate`
     * altogether, and no amount of waiting recovers it, whereas a target that
     * navigates once has never failed. Creating a target costs a few hundred
     * milliseconds, which is a fair price for a sweep that always finishes.
     */
    async function captureOne(screen: ScreenMeta, device: DeviceId, theme: string) {
      {
        {
          pageErrors.length = 0;
          const target = `#/${screen.id}?device=${device}&theme=${theme}&chrome=0`;

          page = await createPage();

          /*
            NOTE: do not call `Emulation.setDeviceMetricsOverride` here. It
            restarts the renderer's widget, and the replacement intermittently
            stops answering `Runtime.evaluate` for good — reproducibly so at
            tablet and large-phone sizes. The browser window is instead launched
            big enough for the tallest device, and each capture clips to the
            frame's bounding box, which needs no emulation at all.
          */
          const ready = waitForLoad(page);
          await page.send('Page.navigate', { url: `${BASE}/${target}` });
          await ready;
          /*
            Do not evaluate the instant the load event fires. React is still
            mounting at that point, and a script evaluation landing mid-hydration
            is what leaves the renderer permanently unresponsive. Waiting out the
            first commit costs half a second and removes the failure entirely.
          */
          await sleep(800);
          await waitForRender(page);
          await page.send('Runtime.evaluate', { expression: freezeExpression });
          // Let the freeze take effect before measuring or capturing.
          await sleep(120);

          if (pageErrors.length > 0) {
            console.error(`\n${screen.id} @ ${device}/${theme} logged errors:`);
            console.error(pageErrors.slice(0, 3).join('\n'));
          }

          const probe = await page.send<{ result: { value: Overflow | null } }>('Runtime.evaluate', {
            /*
              Find content that is genuinely clipped, not content that is
              deliberately scrollable. Three exclusions matter:
                - the element itself scrolls horizontally (a carousel)
                - an ancestor scrolls horizontally (a carousel's contents)
                - the element is visually hidden (`.sy-sr-only` is a 1px box that
                  always "overflows" by design)
            */
            expression: `(() => {
              const root = document.querySelector('.sy-device__viewport');
              if (!root) return null;
              const scrolls = (el) => {
                const o = getComputedStyle(el).overflowX;
                // 'hidden' and 'clip' are deliberate clipping, not a layout bug —
                // a decorative layer intentionally bleeding past a masked box
                // reports overflow but is never visible.
                return o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip';
              };
              let worst = null;
              for (const el of root.querySelectorAll('*')) {
                if (el.clientWidth < 40) continue;
                if (el.closest('.sy-sr-only')) continue;
                const over = el.scrollWidth - el.clientWidth;
                if (over <= 2) continue;
                if (scrolls(el)) continue;
                let ancestor = el.parentElement;
                let inScroller = false;
                while (ancestor && ancestor !== root) {
                  if (scrolls(ancestor)) { inScroller = true; break; }
                  ancestor = ancestor.parentElement;
                }
                if (inScroller) continue;
                if (!worst || over > worst.over) {
                  worst = {
                    over,
                    scrollWidth: el.scrollWidth,
                    clientWidth: el.clientWidth,
                    selector: el.className && typeof el.className === 'string'
                      ? el.tagName.toLowerCase() + '.' + el.className.split(/\\s+/).slice(0, 2).join('.')
                      : el.tagName.toLowerCase(),
                  };
                }
              }
              return worst;
            })()`,
            returnByValue: true,
          });

          if (probe.result.value) {
            overflows.push({
              screen: screen.id,
              device,
              theme,
              scrollWidth: probe.result.value.scrollWidth,
              clientWidth: probe.result.value.clientWidth,
              selector: (probe.result.value as { selector?: string }).selector ?? '',
            });
          }

          /*
            Capture by clipping to the device frame's own bounding box instead of
            emulating a viewport per device. Emulation forces a renderer restart
            on every change, and the resulting execution-context churn makes CDP
            evaluations unreliable. Clipping is both faster and pixel-exact.
          */
          const box = await page.send<{ result: { value: { x: number; y: number; width: number; height: number } } }>(
            'Runtime.evaluate',
            {
              expression: `(() => {
                const el = document.querySelector('.sy-device__frame');
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
              })()`,
              returnByValue: true,
            },
          );

          let clip = box.result.value;
          /*
            Adaptive pixel density.

            Screenshots are captured at 2x where the result stays inside roughly
            four megapixels and at 1x above that. Past that budget the headless
            encoder stops returning at all — a desktop frame at 2x is over six
            megapixels and simply never completes — so a phone gets retina detail
            and a 1512pt desktop gets a frame that actually arrives.
          */
          const area = clip ? clip.width * clip.height : 0;
          const scale = area > 0 && area * 4 > 4_000_000 ? 1 : 2;

          /*
            Retry on failure. Headless Chrome intermittently answers
            "Unable to capture screenshot" when the compositor has not produced a
            frame for the new layer tree yet — most often on the first capture
            after a layout change. Re-reading the clip and asking again clears it.
          */
          let shot: { data: string } | undefined;
          for (let attempt = 1; attempt <= 4 && !shot; attempt += 1) {
            try {
              shot = await page.send<{ data: string }>(
                'Page.captureScreenshot',
                {
                  format: 'png',
                  // Frames are taller than the default viewport, so the clip has
                  // to reach past it. Safe here because animation is frozen
                  // first — it is unfrozen pages that never reach a stable frame.
                  captureBeyondViewport: true,
                  ...(clip ? { clip: { ...clip, scale } } : {}),
                },
                60000,
              );
            } catch (error) {
              if (attempt === 4) throw error;
              await sleep(400 * attempt);
              const refreshed = await page.send<{ result: { value: typeof clip } }>('Runtime.evaluate', {
                expression: `(() => {
                  const el = document.querySelector('.sy-device__frame');
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
                })()`,
                returnByValue: true,
              });
              clip = refreshed.result.value;
            }
          }
          if (!shot) throw new Error(`Could not capture ${screen.id} @ ${device}/${theme}`);
          const name = `${screen.id}__${device}__${theme}.png`;
          writeFileSync(resolve(OUT, name), Buffer.from(shot.data, 'base64'));
          captured += 1;
          process.stdout.write(`\r  captured ${captured}  ${name.padEnd(46)}`);
        }
      }
    }

    for (const device of DEVICE_LIST) {
      for (const theme of THEMES) {
        for (const screen of screens) {
          // Targets are disposable, but the browser process still accumulates;
          // recycling it keeps a long sweep from slowing to a crawl.
          if (captured > 0 && captured % RESET_EVERY === 0) await restartBrowser();

          /*
            Self-healing capture.

            Switching screen, device and theme in one state update occasionally
            leaves the renderer unresponsive — evaluations stop returning even
            though the same screen loads perfectly from a cold navigation. Rather
            than special-casing the screens it happens to hit, each capture gets
            two more chances behind a full document reset, which is the path that
            is always reliable.
          */
          let attempt = 0;
          for (;;) {
            try {
              await captureOne(screen, device, theme);
              break;
            } catch (error) {
              attempt += 1;
              if (attempt > 2) {
                console.error(`\n${screen.id} @ ${device}/${theme} failed after ${attempt} attempts.`);
                if (pageErrors.length > 0) console.error(pageErrors.slice(0, 3).join('\n'));
                throw error;
              }
              if (verbose) console.error(`\n  retrying ${screen.id} @ ${device}/${theme}`);
              // Always take the hard path on failure: if a reload could have
              // fixed it, the capture would not have failed in the first place.
              await restartBrowser();
            }
          }
        }
      }
    }

    process.stdout.write('\n');
    console.log(`\n${captured} screenshots written to ${OUT}`);

    if (overflows.length > 0) {
      console.error(`\n${overflows.length} horizontal overflow(s) detected:`);
      for (const row of overflows) {
        console.error(
          `  ${row.screen} @ ${row.device}/${row.theme}: ${row.selector} — ${row.scrollWidth}px content in ${row.clientWidth}px box`,
        );
      }
    } else {
      console.log('No horizontal overflow detected in any captured combination.');
    }

    writeFileSync(
      resolve(OUT, 'overflow-report.json'),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), captured, overflows }, null, 2)}\n`,
    );

  }

  page.close();
  browser.close();
  killChrome();
}

main().catch((error) => {
  console.error(error);
  killChrome();
  process.exit(1);
});
