/**
 * SYLORA Aether — Ethereal brand-first landing.
 * Hero: animated Liquid S Sigil. Canvas: energy particles + soft parallax.
 */
(function () {
  'use strict';

  const COPY = {
    uk: {
      signIn: 'Увійти',
      kicker: 'ТЕХНОЛОГІЇ. ГАРМОНІЯ. МАЙБУТНЄ.',
      line: 'Живий ефір, творчість, звʼязок і інтелект — одна преміальна платформа.',
      cta: 'Увійти',
      ctaSecondary: 'Створити акаунт',
      markAria: 'Символ SYLORA — Liquid S у скляній сфері',
      loading: 'Відкриваємо світ…',
      launching: 'Запуск SYLORA…',
      enterError: 'Не вдалося завантажити. Перевірте мережу й спробуйте ще раз.',
      langLabel: 'Мова',
      scrollHint: 'Гортай — відкрий екосистему',
      featProtect: 'Захист даних',
      featFast: 'Швидкий доступ',
      featInnovate: 'Інноваційні рішення',
      chapterLiveTitle: 'Ефір',
      chapterLiveBody: 'Ефір — серце SYLORA. Сцена, аудиторія й жива присутність в одному потоці.',
      chapterCreatorTitle: 'Творці',
      chapterCreatorBody: 'Студія режисера: сцена, світло, гості й інструменти в одному склі.',
      chapterBusinessTitle: 'Бізнес',
      chapterBusinessBody: 'Робочий простір з памʼяттю — брифінги, клієнти, рішення без шуму.',
      chapterEduTitle: 'Навчання',
      chapterEduBody: 'Курси й наставництво з живою присутністю — питай і рухайся далі.',
      chapterEcoTitle: 'Екосистема',
      chapterEcoBody: 'Спільнота, музика, маркет і подарунки — один преміальний візуальний світ.',
    },
    en: {
      signIn: 'Sign in',
      kicker: 'ONE WORLD. INFINITE CREATION.',
      line: 'Live, create, connect, and think — one premium platform.',
      cta: 'Sign in',
      ctaSecondary: 'Create account',
      markAria: 'SYLORA mark — Liquid S in glass sphere',
      loading: 'Opening your world…',
      launching: 'Launching SYLORA…',
      enterError: 'Could not load. Check your network and try again.',
      langLabel: 'Language',
      scrollHint: 'Scroll — meet the ecosystem',
      featProtect: 'Data protection',
      featFast: 'Quick access',
      featInnovate: 'Innovative solutions',
      chapterLiveTitle: 'Live',
      chapterLiveBody: 'Live is the heart of SYLORA. Stage, audience, and living presence in one stream.',
      chapterCreatorTitle: 'Creators',
      chapterCreatorBody: 'Director studio: scenes, light, guests, and tools inside one glass stage.',
      chapterBusinessTitle: 'Business',
      chapterBusinessBody: 'A workspace with memory — briefs, clients, decisions without noise.',
      chapterEduTitle: 'Education',
      chapterEduBody: 'Courses and mentorship with living presence — ask, and move forward.',
      chapterEcoTitle: 'Ecosystem',
      chapterEcoBody: 'Social, music, market, and gifts — one premium visual world.',
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
    flutterEntrypoint: null,
    flutterStamp: null,
    hotNode: -1,
    listenersBound: false,
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
      // Flutter SharedPreferences (web) reads flutter.<key>
      localStorage.setItem('locale.languageCode', state.lang);
      localStorage.setItem('flutter.locale.languageCode', state.lang);
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

  // Kept for API stability — Aura companion no longer lives on the landing hero.
  function setEmotion() {}

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

  async function resolveFlutterEntrypoint() {
    if (state.flutterEntrypoint) return state.flutterEntrypoint;
    let entry = 'main.dart.js';
    let stamp = String(Date.now());
    try {
      const res = await fetch('version.json?v=' + stamp, { cache: 'no-store' });
      if (res.ok) {
        const meta = await res.json();
        if (meta && typeof meta.entrypoint === 'string' && meta.entrypoint) {
          entry = meta.entrypoint;
        }
        if (meta && meta.build_number) stamp = String(meta.build_number);
      }
    } catch (_) {
      /* fall back to main.dart.js */
    }
    state.flutterEntrypoint = entry;
    state.flutterStamp = stamp;
    return entry;
  }

  function prefetchFlutterAssets() {
    if (state.preloadScheduled) return;
    state.preloadScheduled = true;
    // Resolve hashed entrypoint so Cloudflare/SW cannot keep a stale soul build.
    resolveFlutterEntrypoint().then((entry) => {
      const assets = [
        { href: entry, rel: 'preload', as: 'script' },
        {
          href: 'flutter_bootstrap.js?v=' + (state.flutterStamp || '1'),
          rel: 'preload',
          as: 'script',
        },
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
    });
  }

  function loadFlutter() {
    if (state.flutterPromise) return state.flutterPromise;
    if (window._syloraFlutterRunning || window._syloraFlutterFrame) {
      return Promise.resolve();
    }

    armFlutterFrameListener();
    state.flutterPromise = resolveFlutterEntrypoint().then((entry) => new Promise((resolve, reject) => {
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

      // Point Flutter's buildConfig at the stamped entrypoint before bootstrap runs.
      window._flutter = window._flutter || {};
      window._flutter.buildConfig = {
        engineRevision: (window._flutter.buildConfig && window._flutter.buildConfig.engineRevision) || '',
        builds: [{
          compileTarget: 'dart2js',
          renderer: 'canvaskit',
          mainJsPath: entry,
        }],
      };

      // flutter_bootstrap.js already calls loader.load() once.
      // Calling load() again deadlocks CanvasKit on many devices.
      if (!document.querySelector('script[data-sylora-flutter]')) {
        const script = document.createElement('script');
        script.src = 'flutter_bootstrap.js?v=' + (state.flutterStamp || '1');
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
    }));
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
    setEnterStatus(t().loading);

    // Route BEFORE Flutter boots so Auth is the first Flutter route.
    // Persist locale in the hash so Flutter LocaleController can sync.
    const langQ = 'lang=' + encodeURIComponent(state.lang);
    const target = create ? '#/auth?create=1&' + langQ : '#/auth?' + langQ;
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
      setEnterStatus(t().launching);
      await flutterReady;
      // Re-assert auth route in case session-restore redirects raced.
      if (!/^#\/auth/.test(location.hash || '')) {
        location.hash = target;
      }
      if (window.SyloraApp && typeof window.SyloraApp.go === 'function') {
        const path = create
          ? '/auth?create=1&lang=' + encodeURIComponent(state.lang)
          : '/auth?lang=' + encodeURIComponent(state.lang);
        window.SyloraApp.go(path);
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
    const tagline = qs('.aether-tagline');
    if (tagline) tagline.textContent = copy.kicker;
    const enterBtn = qs('[data-aether-enter]');
    if (enterBtn && !enterBtn.disabled) {
      const label = enterBtn.querySelector('span');
      if (label) label.textContent = copy.ctaSecondary;
    }
    document.querySelectorAll('[data-aether-signin]').forEach((el) => {
      const label = el.querySelector('span');
      if (label) label.textContent = copy.cta;
      else if (!el.classList.contains('aether-portal')) el.textContent = copy.signIn;
    });
    const fp = qs('[data-feat-protect]');
    if (fp) fp.textContent = copy.featProtect;
    const ff = qs('[data-feat-fast]');
    if (ff) ff.textContent = copy.featFast;
    const fi = qs('[data-feat-innovate]');
    if (fi) fi.textContent = copy.featInnovate;
    const sigil = qs('.aether-sigil');
    if (sigil) sigil.setAttribute('aria-label', copy.markAria);
    document.querySelectorAll('[data-aether-chapter]').forEach((el) => {
      const key = el.getAttribute('data-aether-chapter');
      const title = el.querySelector('[data-chapter-title]');
      const body = el.querySelector('[data-chapter-body]');
      const titleKey = 'chapter' + key + 'Title';
      const bodyKey = 'chapter' + key + 'Body';
      if (title && copy[titleKey]) title.textContent = copy[titleKey];
      if (body && copy[bodyKey]) body.textContent = copy[bodyKey];
    });
    document.querySelectorAll('[data-aether-lang]').forEach((btn) => {
      const active = btn.getAttribute('data-aether-lang') === state.lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindChapterReveal(root) {
    const chapters = root.querySelectorAll('[data-aether-chapter]');
    if (!chapters.length || state.reduced) {
      chapters.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    if (!('IntersectionObserver' in window)) {
      chapters.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.28, rootMargin: '0px 0px -8% 0px' });
    chapters.forEach((el) => io.observe(el));
  }

  function markSvg(prefix, compact) {
    const size = compact ? 40 : 240;
    return `
      <svg class="aether-mark-svg${compact ? ' aether-mark-svg--mini' : ''}" viewBox="0 0 240 240" width="${size}" height="${size}" fill="none" aria-hidden="true">
        <defs>
          <radialGradient id="${prefix}Aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
            <stop offset="42%" stop-color="#9BB6FF" stop-opacity="0.22"/>
            <stop offset="72%" stop-color="#E6C88B" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#E6C88B" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${prefix}Orb" cx="42%" cy="36%" r="58%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.72"/>
            <stop offset="38%" stop-color="#E8EEFF" stop-opacity="0.38"/>
            <stop offset="68%" stop-color="#C8D4FF" stop-opacity="0.16"/>
            <stop offset="100%" stop-color="#B8C8FF" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="${prefix}Body" x1="70" y1="48" x2="176" y2="196" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#EAF6FF"/>
            <stop offset="22%" stop-color="#7EC8FF"/>
            <stop offset="48%" stop-color="#8B7CFF"/>
            <stop offset="72%" stop-color="#E6C88B"/>
            <stop offset="100%" stop-color="#FFF0D2"/>
          </linearGradient>
          <linearGradient id="${prefix}Hi" x1="60" y1="40" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
            <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.15"/>
            <stop offset="70%" stop-color="#FFF4D2" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.2"/>
          </linearGradient>
          <linearGradient id="${prefix}Orbit" x1="40" y1="40" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
            <stop offset="45%" stop-color="#E6C88B" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#5EC8FF" stop-opacity="0.55"/>
          </linearGradient>
          <filter id="${prefix}Glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle class="aether-gate-core" cx="120" cy="120" r="112" fill="url(#${prefix}Aura)"/>
        <circle cx="120" cy="120" r="86" fill="url(#${prefix}Orb)"/>
        <circle cx="120" cy="120" r="86" stroke="rgba(255,255,255,0.72)" stroke-width="1.4" opacity="0.85"/>
        <g class="aether-orbits">
          <ellipse class="aether-orbit aether-orbit--a" cx="120" cy="120" rx="78" ry="52" stroke="url(#${prefix}Orbit)" stroke-width="1.15" opacity="0.75">
            <animateTransform attributeName="transform" type="rotate" from="-28 120 120" to="332 120 120" dur="18s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse class="aether-orbit aether-orbit--b" cx="120" cy="120" rx="72" ry="48" stroke="url(#${prefix}Orbit)" stroke-width="0.9" opacity="0.55">
            <animateTransform attributeName="transform" type="rotate" from="18 120 120" to="-342 120 120" dur="24s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse class="aether-orbit aether-orbit--c" cx="120" cy="120" rx="66" ry="58" stroke="#E6C88B" stroke-width="0.7" opacity="0.45">
            <animateTransform attributeName="transform" type="rotate" from="-62 120 120" to="298 120 120" dur="30s" repeatCount="indefinite"/>
          </ellipse>
        </g>
        <path fill="#8B9CFF" opacity="0.22" filter="url(#${prefix}Glow)" d="M152 58 C176 52 188 78 168 92 C142 110 98 112 94 138 C90 168 122 184 156 172 C174 166 182 148 168 142 C146 134 122 142 122 128 C122 108 150 102 168 86 C186 70 172 48 146 52 C122 56 108 74 112 86 C116 98 98 106 90 90 C80 68 104 46 132 46 C140 46 147 50 152 58 Z"/>
        <path class="aether-s-body" fill="url(#${prefix}Body)" filter="url(#${prefix}Glow)" d="M152 58 C176 52 188 78 168 92 C142 110 98 112 94 138 C90 168 122 184 156 172 C174 166 182 148 168 142 C146 134 122 142 122 128 C122 108 150 102 168 86 C186 70 172 48 146 52 C122 56 108 74 112 86 C116 98 98 106 90 90 C80 68 104 46 132 46 C140 46 147 50 152 58 Z"/>
        <path fill="none" stroke="url(#${prefix}Hi)" stroke-width="2.4" opacity="0.85" d="M152 58 C176 52 188 78 168 92 C142 110 98 112 94 138 C90 168 122 184 156 172 C174 166 182 148 168 142 C146 134 122 142 122 128 C122 108 150 102 168 86 C186 70 172 48 146 52 C122 56 108 74 112 86 C116 98 98 106 90 90 C80 68 104 46 132 46 C140 46 147 50 152 58 Z"/>
        <path class="aether-s-ribbon" d="M158 62 C178 58 184 84 160 96 C128 112 96 114 94 140 C92 168 124 180 152 170" stroke="url(#${prefix}Hi)" stroke-width="3.2" stroke-linecap="round" opacity="0.55"/>
        <circle class="aether-gate-spark" cx="148" cy="64" r="4.2" fill="#FFFFFF" opacity="0.92"/>
        <circle cx="102" cy="148" r="2.8" fill="#FFF0D2" opacity="0.8"/>
        <g class="aether-bubbles">
          <circle class="aether-bubble" cx="64" cy="78" r="3.2" fill="#FFFFFF" opacity="0.72"/>
          <circle class="aether-bubble" cx="178" cy="70" r="2.4" fill="#E8EEFF" opacity="0.75"/>
          <circle class="aether-bubble" cx="52" cy="132" r="2.1" fill="#C5B8FF" opacity="0.65"/>
          <circle class="aether-bubble" cx="186" cy="128" r="3" fill="#FFFFFF" opacity="0.7"/>
          <circle class="aether-bubble" cx="72" cy="172" r="1.8" fill="#B8C8FF" opacity="0.6"/>
          <circle class="aether-bubble" cx="170" cy="178" r="2.3" fill="#FFF0D2" opacity="0.7"/>
          <circle class="aether-bubble" cx="120" cy="46" r="1.6" fill="#FFFFFF" opacity="0.65"/>
          <circle class="aether-bubble" cx="132" cy="196" r="1.9" fill="#E6C88B" opacity="0.55"/>
        </g>
      </svg>`;
  }

  function mountHud(root) {
    const copy = t();
    root.innerHTML = `
      <canvas id="aether-canvas" aria-hidden="true"></canvas>
      <div class="aether-wave" aria-hidden="true"></div>
      <div class="aether-beams" aria-hidden="true"></div>
      <div class="aether-veil" aria-hidden="true"></div>
      <div class="aether-scroll" data-aether-scroll>
        <div class="aether-hud">
          <div class="aether-top">
            <div class="aether-brand-lockup">
              <span class="aether-mark" aria-hidden="true">${markSvg('nav', true)}</span>
              <span class="aether-brand-text">
                <span class="aether-brand-mini">S Y L O R Λ</span>
              </span>
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
            <div class="aether-sigil" aria-label="${copy.markAria}" role="img">
              <span class="aether-sigil-aura" aria-hidden="true"></span>
              <div class="aether-sigil-svg">${markSvg('hero', false)}</div>
              <span class="aether-sigil-particle aether-sigil-particle--1" aria-hidden="true"></span>
              <span class="aether-sigil-particle aether-sigil-particle--2" aria-hidden="true"></span>
              <span class="aether-sigil-particle aether-sigil-particle--3" aria-hidden="true"></span>
              <span class="aether-sigil-particle aether-sigil-particle--4" aria-hidden="true"></span>
            </div>
            <div class="aether-hero-copy">
              <p class="aether-wordmark">S Y L O R Λ</p>
              <p class="aether-tagline">${copy.kicker}</p>
              <div class="aether-cta-wrap">
                <button type="button" class="aether-portal aether-portal--gold" data-aether-signin>
                  <span>${copy.cta}</span>
                </button>
                <button type="button" class="aether-portal aether-portal--glass" data-aether-enter>
                  <span>${copy.ctaSecondary}</span>
                </button>
              </div>
              <div class="aether-feat-strip" aria-label="SYLORA">
                <div class="aether-feat">
                  <span class="aether-feat-ico aether-feat-ico--shield" aria-hidden="true"></span>
                  <span data-feat-protect>${copy.featProtect}</span>
                </div>
                <div class="aether-feat">
                  <span class="aether-feat-ico aether-feat-ico--bolt" aria-hidden="true"></span>
                  <span data-feat-fast>${copy.featFast}</span>
                </div>
                <div class="aether-feat">
                  <span class="aether-feat-ico aether-feat-ico--nodes" aria-hidden="true"></span>
                  <span data-feat-innovate>${copy.featInnovate}</span>
                </div>
              </div>
            </div>
          </section>
          <section class="aether-chapters" aria-label="SYLORA">
            <article class="aether-chapter" data-aether-chapter="Live">
              <div class="aether-chapter-glow aether-chapter-glow--live" aria-hidden="true"></div>
              <p class="aether-chapter-index">01</p>
              <h2 data-chapter-title>${copy.chapterLiveTitle}</h2>
              <p data-chapter-body>${copy.chapterLiveBody}</p>
            </article>
            <article class="aether-chapter" data-aether-chapter="Creator">
              <div class="aether-chapter-glow aether-chapter-glow--creator" aria-hidden="true"></div>
              <p class="aether-chapter-index">02</p>
              <h2 data-chapter-title>${copy.chapterCreatorTitle}</h2>
              <p data-chapter-body>${copy.chapterCreatorBody}</p>
            </article>
            <article class="aether-chapter" data-aether-chapter="Business">
              <div class="aether-chapter-glow aether-chapter-glow--business" aria-hidden="true"></div>
              <p class="aether-chapter-index">03</p>
              <h2 data-chapter-title>${copy.chapterBusinessTitle}</h2>
              <p data-chapter-body>${copy.chapterBusinessBody}</p>
            </article>
            <article class="aether-chapter" data-aether-chapter="Edu">
              <div class="aether-chapter-glow aether-chapter-glow--edu" aria-hidden="true"></div>
              <p class="aether-chapter-index">04</p>
              <h2 data-chapter-title>${copy.chapterEduTitle}</h2>
              <p data-chapter-body>${copy.chapterEduBody}</p>
            </article>
            <article class="aether-chapter aether-chapter--wide" data-aether-chapter="Eco">
              <div class="aether-chapter-glow aether-chapter-glow--eco" aria-hidden="true"></div>
              <p class="aether-chapter-index">05</p>
              <h2 data-chapter-title>${copy.chapterEcoTitle}</h2>
              <p data-chapter-body>${copy.chapterEcoBody}</p>
            </article>
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
    bindChapterReveal(root);
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
      link.href = 'aether/sylora-aether.css?v=eth6';
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
