/**
 * SYLORA Lumen v5 — light living AI ecosystem shell.
 * Canvas world: particles, waves, logo bloom, orbits, companion robot.
 */
(function () {
  'use strict';

  const NODES = [
    'AI', 'Live', 'Community', 'Business',
    'Education', 'Marketplace', 'Gifts', 'Creator Tools',
  ];

  const EMOTIONS = ['idle', 'greeting', 'listening', 'thinking', 'speaking', 'amused', 'focused'];

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
  };

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
    if (state.reduced) return state.mobile ? 220 : 420;
    if (state.mobile) return cores <= 4 ? 520 : 780;
    return cores <= 4 ? 1100 : 1600;
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
    if (hue < 0.28) return `rgba(56,183,255,${alpha})`;
    if (hue < 0.5) return `rgba(46,217,194,${alpha})`;
    if (hue < 0.75) return `rgba(123,108,255,${alpha})`;
    return `rgba(255,107,203,${alpha})`;
  }

  function drawWaves(ctx, t) {
    const w = state.width;
    const h = state.height;
    ctx.save();
    for (let i = 0; i < 3; i += 1) {
      const y = h * (0.25 + i * 0.22) + Math.sin(t * 0.35 + i) * 18;
      const grad = ctx.createLinearGradient(0, y - 40, w, y + 40);
      grad.addColorStop(0, 'rgba(56,183,255,0)');
      grad.addColorStop(0.35, `rgba(123,108,255,${0.05 + i * 0.015})`);
      grad.addColorStop(0.65, `rgba(46,217,194,${0.045 + i * 0.012})`);
      grad.addColorStop(1, 'rgba(255,107,203,0)');
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
  }

  function updateEmotion(now) {
    if (now < state.emotionUntil) return;
    // Cycle living presence after greeting.
    const cycle = EMOTIONS[(Math.floor(now / 4200) % (EMOTIONS.length - 1)) + 1];
    setEmotion(cycle === 'greeting' ? 'idle' : cycle, 3800 + Math.random() * 1200);
  }

  function drawRobot(ctx, canvas, t, now) {
    const robotCanvas = qs('#aether-robot');
    if (!robotCanvas) return;
    const rctx = robotCanvas.getContext('2d');
    if (!rctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = robotCanvas.clientWidth || 140;
    const h = robotCanvas.clientHeight || 140;
    if (robotCanvas.width !== Math.floor(w * dpr) || robotCanvas.height !== Math.floor(h * dpr)) {
      robotCanvas.width = Math.floor(w * dpr);
      robotCanvas.height = Math.floor(h * dpr);
    }
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rctx.clearRect(0, 0, w, h);

    updateEmotion(now);
    if (now > state.blinkAt) {
      state.lid = 1;
      state.blinkAt = now + 2200 + Math.random() * 2800;
    }
    state.lid *= 0.78;

    const emo = state.emotion;
    const bob = Math.sin(t * 1.4) * 2.2;
    const listen = emo === 'listening' ? Math.sin(t * 6) * 1.5 : 0;
    const think = emo === 'thinking' ? Math.sin(t * 2.2) * 3 : 0;
    const speak = emo === 'speaking' ? (0.5 + 0.5 * Math.sin(t * 10)) : 0;
    const amused = emo === 'amused' ? 1 : 0;
    const greet = emo === 'greeting' ? Math.sin(Math.min(1, (state.emotionUntil - now) / 1000) * Math.PI) : 0;

    state.headYaw += ((state.pointer.x * 8 + listen) - state.headYaw) * 0.06;
    state.headPitch += ((-state.pointer.y * 5 + think * 0.2 + bob * 0.15) - state.headPitch) * 0.06;

    const cx = w * 0.5 + state.headYaw;
    const cy = h * 0.52 + state.headPitch + bob;

    // Soft body glow
    const glow = rctx.createRadialGradient(cx, cy, 8, cx, cy, w * 0.48);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.45, 'rgba(220,236,255,0.55)');
    glow.addColorStop(1, 'rgba(123,108,255,0)');
    rctx.fillStyle = glow;
    rctx.beginPath();
    rctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    rctx.fill();

    // Neck
    rctx.fillStyle = 'rgba(210,224,255,0.85)';
    rctx.fillRect(cx - 10, cy + 28, 20, 18);

    // Head shell
    rctx.save();
    rctx.translate(cx, cy);
    rctx.rotate(state.headYaw * 0.01);
    const headGrad = rctx.createLinearGradient(-40, -44, 40, 48);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.55, '#eef4ff');
    headGrad.addColorStop(1, '#d7e4ff');
    rctx.fillStyle = headGrad;
    rctx.strokeStyle = 'rgba(123,108,255,0.22)';
    rctx.lineWidth = 1.5;
    roundRect(rctx, -36, -42, 72, 78, 28);
    rctx.fill();
    rctx.stroke();

    // Face plate
    rctx.fillStyle = '#12182f';
    roundRect(rctx, -26, -18, 52, 34, 14);
    rctx.fill();

    // Eyes
    const eyeOpen = Math.max(0.12, 1 - state.lid);
    const eyeY = -2 + (emo === 'focused' ? -1.5 : 0);
    const eyeSpread = 11;
    const eyeW = 7 + (emo === 'listening' ? 1.2 : 0);
    const eyeH = 9 * eyeOpen * (amused ? 0.75 : 1);
    const pupilShift = state.headYaw * 0.15;

    [[-eyeSpread, eyeY], [eyeSpread, eyeY]].forEach(([ex, ey], idx) => {
      const eg = rctx.createRadialGradient(ex + pupilShift, ey, 0.5, ex, ey, eyeW);
      eg.addColorStop(0, '#dffffa');
      eg.addColorStop(0.35, '#38b7ff');
      eg.addColorStop(1, '#7b6cff');
      rctx.fillStyle = eg;
      rctx.beginPath();
      rctx.ellipse(ex + pupilShift, ey, eyeW, eyeH, 0, 0, Math.PI * 2);
      rctx.fill();
      if (amused) {
        rctx.strokeStyle = 'rgba(255,255,255,0.55)';
        rctx.lineWidth = 1.2;
        rctx.beginPath();
        rctx.arc(ex, ey + 2, 5, 0.15, Math.PI - 0.15);
        rctx.stroke();
      }
      if (idx === 0 && greet > 0.2) {
        // tiny sparkle wink during greeting
        rctx.fillStyle = `rgba(255,255,255,${0.35 * greet})`;
        rctx.beginPath();
        rctx.arc(ex + 4, ey - 4, 1.4, 0, Math.PI * 2);
        rctx.fill();
      }
    });

    // Mouth / speaker
    rctx.fillStyle = 'rgba(56,183,255,0.85)';
    const mouthW = 8 + speak * 7;
    const mouthH = 2 + speak * 5 + amused * 2;
    roundRect(rctx, -mouthW / 2, 22, mouthW, mouthH, 3);
    rctx.fill();

    // Antenna
    rctx.strokeStyle = 'rgba(123,108,255,0.55)';
    rctx.lineWidth = 2;
    rctx.beginPath();
    rctx.moveTo(0, -42);
    rctx.quadraticCurveTo(8, -58 - greet * 4, 14, -66 - Math.sin(t * 3) * 2);
    rctx.stroke();
    rctx.fillStyle = emo === 'thinking' ? '#ff6bcb' : '#38b7ff';
    rctx.beginPath();
    rctx.arc(14, -66 - Math.sin(t * 3) * 2, 3.2 + speak, 0, Math.PI * 2);
    rctx.fill();

    // Cheek light
    rctx.fillStyle = 'rgba(255,107,203,0.18)';
    rctx.beginPath();
    rctx.ellipse(-22, 10, 5, 3, 0, 0, Math.PI * 2);
    rctx.ellipse(22, 10, 5, 3, 0, 0, Math.PI * 2);
    rctx.fill();
    rctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function frame(now) {
    if (!state.running) return;
    const canvas = qs('#aether-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!state.t0) state.t0 = now;
    const t = (now - state.t0) / 1000;
    state.pointer.x += (state.pointer.tx - state.pointer.x) * 0.08;
    state.pointer.y += (state.pointer.ty - state.pointer.y) * 0.08;
    state.pointer.active *= 0.96;
    if (!state.reduced) {
      state.formAmount = Math.min(1, state.formAmount + 0.012);
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
    g.addColorStop(0, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.35, 'rgba(232,240,255,0.35)');
    g.addColorStop(1, 'rgba(243,247,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    if (!state.reduced) drawWaves(ctx, t);
    drawParticles(ctx, t);
    drawRobot(ctx, canvas, t, now);

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
    // Prefetch only — do NOT runApp under the living landing (that froze phones).
    [
      'flutter_bootstrap.js',
      'main.dart.js',
      'canvaskit/canvaskit.js',
      'canvaskit/canvaskit.wasm',
    ].forEach((href) => {
      if (document.querySelector(`link[data-sylora-prefetch="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = href.endsWith('.wasm') ? 'fetch' : 'script';
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

    // Drop stale service workers that can pin old broken builds.
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (_) { /* ignore */ }

    try {
      setEnterStatus('Запуск SYLORA…');
      await loadFlutter();
      setEnterStatus('Майже готово…');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 120));
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
        errEl.textContent = 'Не вдалося завантажити. Перевірте мережу й спробуйте ще раз.';
      }
    }
  }

  function observeSpace(root) {
    const space = qs('[data-aether-space]', root);
    if (!space || !('IntersectionObserver' in window)) {
      if (space) space.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.disconnect();
        }
      });
    }, { threshold: 0.2 });
    io.observe(space);
  }

  function mountHud(root) {
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
            <button type="button" class="aether-link" data-aether-signin>Увійти</button>
          </div>
          <section class="aether-hero">
            <div>
              <p class="aether-kicker">Єдина AI-екосистема</p>
              <h1 class="aether-brand">SYLORA</h1>
              <p class="aether-line">Створюйте, спілкуйтеся й розвивайте бізнес у живому цифровому просторі — AI, Live, спільнота і творчість разом.</p>
              <div class="aether-cta-wrap">
                <button type="button" class="aether-portal" data-aether-enter><span>Почати</span></button>
              </div>
              <div class="aether-space" data-aether-space aria-label="Ecosystem">
                <p class="aether-orbit-caption">Модулі екосистеми</p>
                <div class="aether-constellation" data-aether-nodes></div>
              </div>
            </div>
            <div class="aether-robot-wrap" aria-label="SYLORA AI companion">
              <div class="aether-robot-halo" aria-hidden="true"></div>
              <canvas id="aether-robot" aria-hidden="true"></canvas>
              <span class="aether-robot-label">Aura · AI companion</span>
            </div>
          </section>
        </div>
      </div>
    `;
    const nodes = qs('[data-aether-nodes]', root);
    NODES.forEach((name, i) => {
      const el = document.createElement('span');
      el.className = 'aether-star';
      el.textContent = name;
      el.style.transitionDelay = `${0.05 + i * 0.05}s`;
      nodes.appendChild(el);
    });
    qs('[data-aether-enter]', root).addEventListener('click', () => enterApp(true));
    qs('[data-aether-signin]', root).addEventListener('click', () => enterApp(false));
    observeSpace(root);

    // Living constellation highlight
    setInterval(() => {
      const stars = root.querySelectorAll('.aether-star');
      if (!stars.length) return;
      stars.forEach((s) => s.classList.remove('is-hot'));
      state.hotNode = (state.hotNode + 1) % stars.length;
      stars[state.hotNode].classList.add('is-hot');
    }, 1400);
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
