/**
 * SYLORA Lumen — FINAL champagne-glass living landing.
 * Canvas world: warm particles, soft parallax, human Aura companion.
 */
(function () {
  'use strict';

  const EMOTIONS = ['idle', 'greeting', 'listening', 'thinking', 'speaking', 'amused', 'focused'];

  const COPY = {
    uk: {
      signIn: 'Увійти',
      kicker: 'Де AI зустрічає душу',
      line: 'Твій світ у гармонії — жива присутність, творчий потік і Aura поруч.',
      cta: 'Почати подорож',
      auraLabel: 'Aura · супутниця',
      auraAria: 'Aura — жива AI-супутниця',
      loading: 'Відкриваємо світ…',
      enterError: 'Не вдалося завантажити. Перевірте мережу й спробуйте ще раз.',
      langLabel: 'Мова',
    },
    en: {
      signIn: 'Sign in',
      kicker: 'Where AI meets soul',
      line: 'Your world. In harmony — live presence, creative flow, and Aura by your side.',
      cta: 'Begin your journey',
      auraLabel: 'Aura · companion',
      auraAria: 'Aura — living AI companion',
      loading: 'Opening your world…',
      enterError: 'Could not load. Check your network and try again.',
      langLabel: 'Language',
    },
  };

  const state = {
    running: false,
    reduced: false,
    mobile: false,
    formAmount: 0,
    t0: 0,
    pointer: { x: 0, y: 0, tx: 0, ty: 0, active: 0 },
    width: 1,
    height: 1,
    dpr: 1,
    particles: null,
    count: 0,
    raf: 0,
    flutterPromise: null,
    preloadScheduled: false,
    hotNode: -1,
    listenersBound: false,
    emotion: 'greeting',
    emotionUntil: 0,
    blinkAt: 0,
    lid: 0,
    headYaw: 0,
    headPitch: 0,
    lang: 'uk',
  };

  function readStoredLang() {
    try {
      const stored = localStorage.getItem('locale.languageCode');
      if (stored && COPY[stored]) return stored;
    } catch (_) { /* ignore */ }
    const nav = (navigator.language || 'uk').toLowerCase();
    return nav.startsWith('uk') ? 'uk' : 'en';
  }

  function t() {
    return COPY[state.lang] || COPY.uk;
  }

  function setLang(lang) {
    state.lang = COPY[lang] ? lang : 'uk';
    try {
      localStorage.setItem('locale.languageCode', state.lang);
    } catch (_) { /* ignore */ }
    document.documentElement.lang = state.lang;
    applyCopy();
  }

  function prefersAetherRoute() {
    const hash = (location.hash || '').replace(/^#/, '');
    return !hash || hash === '/' || hash === '/welcome' || hash.startsWith('/welcome');
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function particleBudget() {
    state.mobile = window.matchMedia('(max-width: 820px)').matches
      || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
    const cores = navigator.hardwareConcurrency || 4;
    // Keep the living shell light — high particle counts delayed "Почати".
    if (state.reduced) return state.mobile ? 90 : 160;
    if (state.mobile) return cores <= 4 ? 160 : 240;
    return cores <= 4 ? 320 : 480;
  }

  function buildParticles(count) {
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const vx = new Float32Array(count);
    const vy = new Float32Array(count);
    const tx = new Float32Array(count);
    const ty = new Float32Array(count);
    const r = new Float32Array(count);
    const hue = new Float32Array(count);
    const layer = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * 1.35;
      x[i] = Math.cos(ang) * rad;
      y[i] = Math.sin(ang) * rad;
      vx[i] = (Math.random() - 0.5) * 0.02;
      vy[i] = (Math.random() - 0.5) * 0.02;
      r[i] = 0.6 + Math.random() * 1.8;
      hue[i] = Math.random();
      layer[i] = Math.random();

      const roll = Math.random();
      if (roll < 0.42) {
        // Logo nucleus / petals
        const petal = i % 6;
        const a = (petal / 6) * Math.PI * 2 - Math.PI / 2;
        const u = Math.random();
        const v = Math.random();
        const px = Math.cos(a) * (0.08 + v * 0.28) + Math.cos(a + Math.PI / 2) * (u - 0.5) * 0.14;
        const py = Math.sin(a) * (0.08 + v * 0.28) + Math.sin(a + Math.PI / 2) * (u - 0.5) * 0.14;
        tx[i] = px;
        ty[i] = py - 0.08;
      } else if (roll < 0.72) {
        // Orbit ring
        const orbit = 0.42 + (i % 3) * 0.12;
        const a = Math.random() * Math.PI * 2;
        tx[i] = Math.cos(a) * orbit;
        ty[i] = Math.sin(a) * orbit * 0.62 - 0.05;
      } else {
        // Soft field
        tx[i] = (Math.random() - 0.5) * 1.8;
        ty[i] = (Math.random() - 0.5) * 1.4;
      }
    }
    state.particles = { x, y, vx, vy, tx, ty, r, hue, layer };
    state.count = count;
  }

  function resize(canvas) {
    const rect = canvas.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    state.dpr = Math.min(window.devicePixelRatio || 1, state.mobile ? 1.5 : 2);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
  }

  function pointerFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const cx = (('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2));
    const cy = (('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : rect.top + rect.height / 2));
    state.pointer.tx = ((cx - rect.left) / rect.width) * 2 - 1;
    state.pointer.ty = -(((cy - rect.top) / rect.height) * 2 - 1);
    state.pointer.active = 1;
  }

  function colorFor(hue, alpha) {
    if (hue < 0.3) return `rgba(230,200,139,${alpha})`;
    if (hue < 0.55) return `rgba(142,184,216,${alpha})`;
    if (hue < 0.78) return `rgba(245,222,179,${alpha})`;
    return `rgba(255,143,122,${alpha})`;
  }

  function drawWaves(ctx, t) {
    const w = state.width;
    const h = state.height;
    ctx.save();
    for (let i = 0; i < 3; i += 1) {
      const y = h * (0.25 + i * 0.22) + Math.sin(t * 0.35 + i) * 18;
      const grad = ctx.createLinearGradient(0, y - 40, w, y + 40);
      grad.addColorStop(0, 'rgba(230,200,139,0)');
      grad.addColorStop(0.35, `rgba(201,164,92,${0.05 + i * 0.015})`);
      grad.addColorStop(0.65, `rgba(142,184,216,${0.045 + i * 0.012})`);
      grad.addColorStop(1, 'rgba(255,143,122,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 18) {
        const yy = y + Math.sin(x * 0.01 + t * (0.6 + i * 0.15) + i) * (10 + i * 4);
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(w, y + 80);
      ctx.lineTo(0, y + 80);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(ctx, t) {
    const p = state.particles;
    if (!p) return;
    const w = state.width;
    const h = state.height;
    const scale = Math.min(w, h) * 0.42;
    const cx = w * 0.5;
    const cy = h * (state.mobile ? 0.38 : 0.42);
    const form = state.formAmount;
    const px = state.pointer.x;
    const py = state.pointer.y;
    const pull = state.pointer.active * 0.035;

    ctx.save();
    for (let i = 0; i < state.count; i += 1) {
      const targetX = p.tx[i] * form + (1 - form) * Math.cos(t * 0.2 + i) * 0.9;
      const targetY = p.ty[i] * form + (1 - form) * Math.sin(t * 0.17 + i * 0.7) * 0.7;
      const dx = targetX - p.x[i];
      const dy = targetY - p.y[i];
      p.vx[i] = p.vx[i] * 0.9 + dx * 0.05;
      p.vy[i] = p.vy[i] * 0.9 + dy * 0.05;
      p.vx[i] += (px - p.x[i]) * pull * (0.4 + p.layer[i]);
      p.vy[i] += (py - p.y[i]) * pull * (0.4 + p.layer[i]);
      p.x[i] += p.vx[i];
      p.y[i] += p.vy[i];

      const sx = cx + p.x[i] * scale;
      const sy = cy + p.y[i] * scale;
      const alpha = 0.18 + p.layer[i] * 0.45;
      ctx.fillStyle = colorFor(p.hue[i], alpha);
      ctx.beginPath();
      ctx.arc(sx, sy, p.r[i] * (0.8 + form * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function setEmotion(name, ms) {
    state.emotion = name;
    state.emotionUntil = performance.now() + ms;
    const wrap = qs('.aether-aura-wrap');
    if (wrap) {
      EMOTIONS.forEach((emotion) => wrap.classList.remove(`is-${emotion}`));
      wrap.classList.add(`is-${name}`);
      wrap.dataset.emotion = name;
    }
  }

  function updateEmotion(now) {
    if (now < state.emotionUntil) return;
    // Cycle living presence after greeting.
    const cycle = EMOTIONS[(Math.floor(now / 4200) % (EMOTIONS.length - 1)) + 1];
    setEmotion(cycle === 'greeting' ? 'idle' : cycle, 3800 + Math.random() * 1200);
  }

  function updateAuraPresence(now) {
    const wrap = qs('.aether-aura-wrap');
    const portrait = qs('.aether-aura-portrait');
    const lids = qs('.aether-aura-lids');
    if (!wrap || !portrait) return;

    updateEmotion(now);

    // Soft gaze toward pointer — companion, not a frozen headshot.
    const targetYaw = state.pointer.x * 7;
    const targetPitch = -state.pointer.y * 5;
    state.headYaw += (targetYaw - state.headYaw) * 0.06;
    state.headPitch += (targetPitch - state.headPitch) * 0.06;

    if (now >= state.blinkAt) {
      state.lid = 1;
      state.blinkAt = now + 2200 + Math.random() * 3200;
    }
    state.lid *= 0.82;

    const speakBoost = state.emotion === 'speaking' ? 1.03 : 1;
    const thinkDim = state.emotion === 'thinking' ? 0.92 : 1;
    portrait.style.transform =
      `translate3d(${state.headYaw}px, ${state.headPitch}px, 0) scale(${speakBoost * thinkDim})`;
    if (lids) {
      lids.style.opacity = String(Math.min(1, state.lid * 1.35));
    }
  }

  function frame(now) {
    if (!state.running) return;
    const canvas = qs('#aether-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!state.t0) state.t0 = now;
    const elapsed = (now - state.t0) / 1000;
    state.pointer.x += (state.pointer.tx - state.pointer.x) * 0.08;
    state.pointer.y += (state.pointer.ty - state.pointer.y) * 0.08;
    state.pointer.active *= 0.96;
    if (!state.reduced) {
      state.formAmount = Math.min(1, state.formAmount + 0.022);
    } else {
      state.formAmount = 1;
    }

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.width, state.height);

    // soft core light
    const g = ctx.createRadialGradient(
      state.width * 0.5 + state.pointer.x * 30,
      state.height * 0.4 + state.pointer.y * -20,
      10,
      state.width * 0.5,
      state.height * 0.42,
      Math.min(state.width, state.height) * 0.55,
    );
    g.addColorStop(0, 'rgba(255,252,248,0.78)');
    g.addColorStop(0.35, 'rgba(230,200,139,0.22)');
    g.addColorStop(1, 'rgba(255,247,238,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    if (!state.reduced) drawWaves(ctx, elapsed);
    drawParticles(ctx, elapsed);
    updateAuraPresence(now);

    // parallax glow layer
    const glow = qs('.aether-wave');
    if (glow) {
      glow.style.transform = `translate3d(${state.pointer.x * 12}px, ${-state.pointer.y * 10}px, 0)`;
    }

    state.raf = requestAnimationFrame(frame);
  }

  function armFlutterFrameListener() {
    if (window._syloraFlutterFrameListener) return;
    window._syloraFlutterFrameListener = true;
    window.addEventListener('flutter-first-frame', () => {
      window._syloraFlutterFrame = true;
      window._syloraFlutterRunning = true;
    }, { once: true });
  }

  function setEnterStatus(text) {
    const label = qs('[data-aether-enter] span');
    if (label) label.textContent = text;
    let veil = qs('[data-aether-loading]');
    if (!veil) {
      const root = qs('#sylora-aether');
      if (!root) return;
      veil = document.createElement('div');
      veil.className = 'aether-loading';
      veil.setAttribute('data-aether-loading', '1');
      veil.innerHTML = '<div class="aether-loading-card"><div class="aether-loading-spin"></div><p data-aether-loading-text></p></div>';
      root.appendChild(veil);
    }
    veil.style.display = 'flex';
    const t = qs('[data-aether-loading-text]', veil);
    if (t) t.textContent = text;
  }

  function clearEnterStatus() {
    const veil = qs('[data-aether-loading]');
    if (veil) veil.style.display = 'none';
  }

  function stopAetherWorld() {
    state.running = false;
    cancelAnimationFrame(state.raf);
  }

  function prefetchFlutterAssets() {
    if (state.preloadScheduled) return;
    state.preloadScheduled = true;
    // Preload app JS only — CanvasKit comes from gstatic CDN after bootstrap.
    // Do NOT runApp under the living landing (that froze phones).
    const assets = [
      { href: 'main.dart.js', rel: 'preload', as: 'script' },
      { href: 'flutter_bootstrap.js', rel: 'preload', as: 'script' },
    ];
    assets.forEach(({ href, rel, as }) => {
      if (document.querySelector(`link[data-sylora-prefetch="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.as = as;
      link.href = href;
      link.setAttribute('data-sylora-prefetch', href);
      document.head.appendChild(link);
    });
  }

  function loadFlutter() {
    if (state.flutterPromise) return state.flutterPromise;
    if (window._syloraFlutterRunning || window._syloraFlutterFrame) {
      return Promise.resolve();
    }

    armFlutterFrameListener();
    state.flutterPromise = new Promise((resolve, reject) => {
      let settled = false;
      const succeed = () => {
        if (settled) return;
        settled = true;
        window._syloraFlutterRunning = true;
        resolve();
      };
      const fail = (err) => {
        if (settled) return;
        settled = true;
        state.flutterPromise = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      window.addEventListener('flutter-first-frame', succeed, { once: true });

      // flutter_bootstrap.js already calls loader.load() once.
      // Calling load() again deadlocks CanvasKit on many devices.
      if (!document.querySelector('script[data-sylora-flutter]')) {
        const script = document.createElement('script');
        script.src = 'flutter_bootstrap.js';
        script.async = true;
        script.setAttribute('data-sylora-flutter', '1');
        script.onerror = () => fail(new Error('flutter_bootstrap failed'));
        document.body.appendChild(script);
      }

      setTimeout(() => {
        if (window._syloraFlutterFrame || window._syloraFlutterRunning) {
          succeed();
          return;
        }
        fail(new Error('Flutter startup timed out'));
      }, 22000);
    });
    return state.flutterPromise;
  }

  async function enterApp(create) {
    const buttons = document.querySelectorAll('[data-aether-enter], [data-aether-signin]');
    buttons.forEach((b) => { b.disabled = true; });
    const label = qs('[data-aether-enter] span');
    const previousLabel = label ? label.textContent : '';
    setEmotion('speaking', 2400);

    // Free GPU immediately — landing canvas + CanvasKit together freezes mobile.
    stopAetherWorld();
    setEnterStatus('Завантаження…');

    // Route BEFORE Flutter boots so Auth is the first Flutter route.
    const target = create ? '#/auth?create=1' : '#/auth';
    if (location.hash !== target) {
      location.hash = target;
    }

    // Start Flutter immediately; SW cleanup must not block first paint.
    const flutterReady = loadFlutter();
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => { r.unregister().catch(() => {}); });
        }).catch(() => {});
      }
    } catch (_) { /* ignore */ }

    try {
      setEnterStatus('Запуск SYLORA…');
      await flutterReady;
      // Re-assert auth route in case session-restore redirects raced.
      if (!/^#\/auth/.test(location.hash || '')) {
        location.hash = target;
      }
      if (window.SyloraApp && typeof window.SyloraApp.go === 'function') {
        window.SyloraApp.go(create ? '/auth?create=1' : '/auth');
      }
      clearEnterStatus();
      hide();
    } catch (err) {
      console.error('SYLORA enter failed', err);
      clearEnterStatus();
      if (label) label.textContent = previousLabel || 'Почати';
      buttons.forEach((b) => { b.disabled = false; });
      setEmotion('idle', 0);
      // Resume soft landing animation so the page is not dead.
      if (!state.running) {
        state.running = true;
        state.raf = requestAnimationFrame(frame);
      }
      const root = qs('#sylora-aether');
      let errEl = qs('[data-aether-enter-error]');
      if (!errEl && root) {
        errEl = document.createElement('p');
        errEl.setAttribute('data-aether-enter-error', '1');
        errEl.className = 'aether-enter-error';
        root.appendChild(errEl);
      }
      if (errEl) {
        errEl.textContent = t().enterError;
      }
    }
  }


  function applyCopy() {
    const copy = t();
    const signIn = qs('[data-aether-signin]');
    if (signIn) signIn.textContent = copy.signIn;
    const kicker = qs('.aether-kicker');
    if (kicker) kicker.textContent = copy.kicker;
    const line = qs('.aether-line');
    if (line) line.textContent = copy.line;
    const enterBtn = qs('[data-aether-enter]');
    const cta = qs('[data-aether-enter] span');
    if (cta && enterBtn && !enterBtn.disabled) cta.textContent = copy.cta;
    const auraLabel = qs('.aether-aura-label');
    if (auraLabel) auraLabel.textContent = copy.auraLabel;
    const wrap = qs('.aether-aura-wrap');
    if (wrap) wrap.setAttribute('aria-label', copy.auraAria);
    document.querySelectorAll('[data-aether-lang]').forEach((btn) => {
      const active = btn.getAttribute('data-aether-lang') === state.lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function mountHud(root) {
    const copy = t();
    root.innerHTML = `
      <canvas id="aether-canvas" aria-hidden="true"></canvas>
      <div class="aether-wave" aria-hidden="true"></div>
      <div class="aether-veil" aria-hidden="true"></div>
      <div class="aether-scroll" data-aether-scroll>
        <div class="aether-hud">
          <div class="aether-top">
            <div class="aether-brand-lockup">
              <span class="aether-mark" aria-hidden="true"></span>
              <span class="aether-brand-mini">SYLORA</span>
            </div>
            <div class="aether-top-actions">
              <div class="aether-lang" role="group" aria-label="${copy.langLabel}">
                <button type="button" class="aether-lang-btn" data-aether-lang="uk">UK</button>
                <button type="button" class="aether-lang-btn" data-aether-lang="en">EN</button>
              </div>
              <button type="button" class="aether-link" data-aether-signin>${copy.signIn}</button>
            </div>
          </div>
          <section class="aether-hero">
            <div>
              <p class="aether-kicker">${copy.kicker}</p>
              <h1 class="aether-brand">SYLORA</h1>
              <p class="aether-line">${copy.line}</p>
              <div class="aether-cta-wrap">
                <button type="button" class="aether-portal" data-aether-enter><span>${copy.cta}</span></button>
              </div>
            </div>
            <div class="aether-aura-wrap is-greeting" data-emotion="greeting" aria-label="${copy.auraAria}">
              <div class="aether-aura-halo" aria-hidden="true"></div>
              <div class="aether-aura-stage" aria-hidden="true">
                <img class="aether-aura-portrait" src="aether/assets/aura-companion.png" alt="" width="512" height="512" decoding="async" />
                <span class="aether-aura-lids"></span>
                <span class="aether-aura-breath"></span>
              </div>
              <span class="aether-aura-label">${copy.auraLabel}</span>
            </div>
          </section>
        </div>
      </div>
    `;
    qs('[data-aether-enter]', root).addEventListener('click', () => enterApp(true));
    qs('[data-aether-signin]', root).addEventListener('click', () => enterApp(false));
    root.querySelectorAll('[data-aether-lang]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.getAttribute('data-aether-lang')));
    });
    applyCopy();
  }

  function bindPointer(canvas, scrollEl) {
    if (state.listenersBound) return;
    state.listenersBound = true;
    const onMove = (e) => pointerFromEvent(e, canvas);
    const onEnd = () => { state.pointer.active *= 0.2; };
    const surface = scrollEl || canvas;
    surface.addEventListener('pointermove', onMove, { passive: true });
    surface.addEventListener('pointerdown', onMove, { passive: true });
    surface.addEventListener('pointerup', onEnd, { passive: true });
    surface.addEventListener('pointerleave', onEnd, { passive: true });
    surface.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('resize', () => {
      resize(canvas);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(state.raf);
        state.running = false;
      } else if (document.body.classList.contains('sylora-aether-active')) {
        state.running = true;
        state.raf = requestAnimationFrame(frame);
      }
    });
  }

  function show() {
    let root = qs('#sylora-aether');
    if (!root) {
      root = document.createElement('div');
      root.id = 'sylora-aether';
      document.body.prepend(root);
    }
    state.lang = readStoredLang();
    document.documentElement.lang = state.lang;
    state.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    mountHud(root);
    document.body.classList.add('sylora-aether-active');
    root.style.display = 'block';
    root.classList.remove('aether-revealed');
    const canvas = qs('#aether-canvas', root);
    const scrollEl = qs('[data-aether-scroll]', root);
    resize(canvas);
    buildParticles(particleBudget());
    bindPointer(canvas, scrollEl);
    state.formAmount = state.reduced ? 1 : 0;
    state.t0 = 0;
    state.running = true;
    setEmotion('greeting', 3200);
    state.blinkAt = performance.now() + 900;
    requestAnimationFrame(() => root.classList.add('aether-revealed'));
    state.raf = requestAnimationFrame(frame);
    prefetchFlutterAssets();
  }

  function hide() {
    const root = qs('#sylora-aether');
    document.body.classList.remove('sylora-aether-active');
    if (root) root.style.display = 'none';
    state.running = false;
    cancelAnimationFrame(state.raf);
  }

  function ensureCss() {
    if (!document.querySelector('link[data-sylora-aether-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'aether/sylora-aether.css';
      link.setAttribute('data-sylora-aether-css', '1');
      document.head.appendChild(link);
    }
  }

  window.SyloraAether = {
    show,
    hide,
    enter: enterApp,
    setEmotion,
  };

  ensureCss();
  armFlutterFrameListener();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (prefersAetherRoute()) show();
      else loadFlutter();
    });
  } else if (prefersAetherRoute()) {
    show();
  } else {
    loadFlutter();
  }

  window.addEventListener('hashchange', () => {
    if (prefersAetherRoute()) {
      if (!document.body.classList.contains('sylora-aether-active')) show();
    }
  });
}());
