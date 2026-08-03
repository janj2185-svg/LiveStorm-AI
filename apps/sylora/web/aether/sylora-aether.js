/**
 * SYLORA Aether — living GPU entry.
 * Readable HUD, form↔scatter logo cycle, mobile-tuned.
 */
(function () {
  'use strict';

  const NODES = [
    'AI', 'Live', 'Community', 'Business',
    'Education', 'Marketplace', 'Gifts', 'Creator Tools',
  ];

  const PETAL_COLORS = [
    [0.24, 0.94, 1.0],
    [0.55, 0.36, 1.0],
    [1.0, 0.31, 0.85],
    [1.0, 0.69, 0.42],
    [0.84, 0.78, 1.0],
  ];

  const state = {
    running: false,
    reduced: false,
    mobile: false,
    stage: 0,
    formAmount: 0,
    t0: 0,
    pointer: { x: 0, y: 0, tx: 0, ty: 0, active: 0 },
    width: 1,
    height: 1,
    dpr: 1,
    gl: null,
    program: null,
    buffers: null,
    count: 0,
    particles: null,
    raf: 0,
    flutterPromise: null,
    hotNode: -1,
    fpsGate: 0,
    skipOdd: false,
    listenersBound: false,
  };

  function prefersAetherRoute() {
    const hash = (location.hash || '').replace(/^#/, '');
    return !hash || hash === '/' || hash === '/welcome' || hash.startsWith('/welcome');
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function buildLogoTargets(count) {
    const targets = new Float32Array(count * 2);
    const colors = new Float32Array(count * 3);
    const depths = new Float32Array(count);
    const petals = 5;
    for (let i = 0; i < count; i += 1) {
      const petal = i % petals;
      const angle = (petal / petals) * Math.PI * 2 - Math.PI / 2;
      const u = Math.random();
      const v = Math.random();
      const lx = (u - 0.5) * 0.4;
      const ly = (v * v) * 0.7 - 0.06;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const core = Math.random() < 0.1;
      // Logo sits upper-mid so copy plate below stays clear.
      const x = core ? (Math.random() - 0.5) * 0.1 : (lx * ca - ly * sa) * 0.92;
      const y = core ? (Math.random() - 0.5) * 0.1 + 0.18 : (lx * sa + ly * ca) * 0.92 + 0.18;
      targets[i * 2] = x;
      targets[i * 2 + 1] = y;
      const c = PETAL_COLORS[petal];
      const jitter = 0.86 + Math.random() * 0.18;
      colors[i * 3] = c[0] * jitter;
      colors[i * 3 + 1] = c[1] * jitter;
      colors[i * 3 + 2] = c[2] * jitter;
      depths[i] = Math.random(); // 0 far → 1 near
    }
    return { targets, colors, depths };
  }

  function createParticles(count) {
    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count * 2);
    const seeds = new Float32Array(count);
    const { targets, colors, depths } = buildLogoTargets(count);
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.9 + Math.random() * 1.8;
      positions[i * 2] = Math.cos(a) * r;
      positions[i * 2 + 1] = Math.sin(a) * r * 0.85;
      velocities[i * 2] = (Math.random() - 0.5) * 0.2;
      velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.2;
      seeds[i] = Math.random() * 1000;
    }
    return { positions, velocities, seeds, targets, colors, depths };
  }

  /** Smooth cycle: scatter → form → hold → scatter … */
  function formCycle(t) {
    const period = 11;
    const x = t % period;
    if (x < 3.2) {
      const u = x / 3.2;
      return u * u * (3 - 2 * u);
    }
    if (x < 6.2) return 1;
    if (x < 9.0) {
      const u = (x - 6.2) / 2.8;
      return 1 - u * u * (3 - 2 * u);
    }
    return 0;
  }

  const VERT = `
    attribute vec2 a_pos;
    attribute vec3 a_color;
    attribute float a_seed;
    attribute float a_depth;
    uniform float u_time;
    uniform float u_form;
    uniform vec2 u_pointer;
    uniform float u_pointerActive;
    uniform vec2 u_res;
    varying vec3 v_color;
    varying float v_alpha;
    void main() {
      vec2 p = a_pos;
      float wave = 0.02 * sin(p.x * 5.5 + u_time * 1.15) * (0.35 + a_depth);
      p.y += wave;
      p.x += 0.014 * cos(p.y * 4.2 - u_time * 0.9) * (0.4 + a_depth);

      // Soft parallax toward pointer — living field.
      if (u_pointerActive > 0.05) {
        vec2 d = p - u_pointer;
        float dist = length(d) + 0.001;
        float fall = smoothstep(0.85, 0.0, dist);
        p += normalize(d) * (0.045 * u_pointerActive * fall) * mix(0.45, 1.2, a_depth);
        // Subtle attract into logo region when forming.
        p -= d * (0.012 * u_form * u_pointerActive * fall);
      }

      float size = mix(1.35, 2.6, a_depth);
      size *= mix(0.85, 1.25, u_form);
      size *= (0.88 + 0.2 * sin(u_time * 1.8 + a_seed));

      // Keep lower HUD readable: fade & shrink particles in copy zone.
      float hud = smoothstep(-0.05, -0.55, p.y);
      size *= mix(1.0, 0.45, hud);
      float alpha = mix(0.22, 0.9, a_depth) * mix(0.55, 1.0, u_form);
      alpha *= mix(1.0, 0.12, hud);

      float aspect = u_res.y / max(u_res.x, 1.0);
      // Depth scale — near particles larger / slightly offset.
      float zoom = mix(0.92, 1.18, a_depth);
      vec2 ndc = vec2(p.x * aspect, p.y) * zoom;
      gl_Position = vec4(ndc, 0.0, 1.0);
      gl_PointSize = max(1.0, size * (u_res.y / 980.0));
      v_color = a_color;
      v_alpha = alpha;
    }
  `;

  const FRAG = `
    precision mediump float;
    varying vec3 v_color;
    varying float v_alpha;
    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float d = dot(uv, uv);
      if (d > 1.0) discard;
      float glow = exp(-d * 3.1);
      gl_FragColor = vec4(v_color, glow * v_alpha);
    }
  `;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || 'shader');
    }
    return sh;
  }

  function initGl(canvas) {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: state.mobile ? 'low-power' : 'high-performance',
    });
    if (!gl) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'program');
    }
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    return { gl, prog };
  }

  function upload(gl, prog, particles) {
    const bind = (data, locName, size, dynamic) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, locName);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return buf;
    };
    const posBuf = bind(particles.positions, 'a_pos', 2, true);
    bind(particles.colors, 'a_color', 3, false);
    bind(particles.seeds, 'a_seed', 1, false);
    bind(particles.depths, 'a_depth', 1, false);
    return {
      posBuf,
      uniforms: {
        time: gl.getUniformLocation(prog, 'u_time'),
        form: gl.getUniformLocation(prog, 'u_form'),
        pointer: gl.getUniformLocation(prog, 'u_pointer'),
        pointerActive: gl.getUniformLocation(prog, 'u_pointerActive'),
        res: gl.getUniformLocation(prog, 'u_res'),
      },
    };
  }

  function resize(canvas) {
    const maxDpr = state.mobile ? 1.35 : 1.75;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    state.width = w;
    state.height = h;
    state.dpr = dpr;
    if (state.gl) state.gl.viewport(0, 0, w, h);
  }

  function stepParticles(particles, dt, t) {
    const { positions, velocities, targets, seeds } = particles;
    const count = state.count;
    const form = formCycle(t);
    state.formAmount = form;
    state.stage = form;

    // Smooth pointer.
    state.pointer.x += (state.pointer.tx - state.pointer.x) * Math.min(1, dt * 10);
    state.pointer.y += (state.pointer.ty - state.pointer.y) * Math.min(1, dt * 10);
    state.pointer.active *= 0.92;

    const px = state.pointer.x;
    const py = state.pointer.y;
    const pActive = state.pointer.active;

    for (let i = 0; i < count; i += 1) {
      const ix = i * 2;
      const n = seeds[i];
      const wanderX = Math.cos(t * 0.55 + n) * (0.55 + (1 - form) * 0.55);
      const wanderY = Math.sin(t * 0.42 + n * 1.3) * (0.42 + (1 - form) * 0.5);
      const tx = targets[ix] * form + wanderX * (1 - form) * 0.85;
      const ty = targets[ix + 1] * form + wanderY * (1 - form) * 0.85;

      let ax = (tx - positions[ix]) * (0.75 + form * 2.1);
      let ay = (ty - positions[ix + 1]) * (0.75 + form * 2.1);

      if (pActive > 0.04) {
        const dx = positions[ix] - px;
        const dy = positions[ix + 1] - py;
        const dist2 = dx * dx + dy * dy + 0.00025;
        const force = (0.055 * pActive) / dist2;
        ax += dx * force;
        ay += dy * force;
      }

      // Vast orbital drift when scattered — scale of a universe.
      if (form < 0.35 && i % 9 === 0) {
        const ang = t * 0.22 + n;
        const radius = 0.85 + (i % 5) * 0.08;
        ax += (Math.cos(ang) * radius - positions[ix]) * 0.08;
        ay += (Math.sin(ang) * radius * 0.7 - positions[ix + 1]) * 0.08;
      }

      velocities[ix] = (velocities[ix] + ax * dt) * 0.84;
      velocities[ix + 1] = (velocities[ix + 1] + ay * dt) * 0.84;
      positions[ix] += velocities[ix] * dt;
      positions[ix + 1] += velocities[ix + 1] * dt;
    }
  }

  function frame(now) {
    if (!state.running) return;
    const t = (now - state.t0) / 1000;
    const rawDt = state._last ? (now - state._last) / 1000 : 0.016;
    const dt = Math.min(0.033, rawDt);
    state._last = now;

    // Adaptive quality: if frame is heavy, alternate physics updates on mobile.
    if (rawDt > 0.028) state.fpsGate = Math.min(8, state.fpsGate + 1);
    else state.fpsGate = Math.max(0, state.fpsGate - 1);
    const skipPhysics = state.mobile && state.fpsGate > 3 && (state.skipOdd = !state.skipOdd);

    const { gl, buffers, particles } = state;
    if (!state.reduced && !skipPhysics) {
      stepParticles(particles, dt, t);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, particles.positions);
    } else if (state.reduced) {
      state.formAmount = 1;
      state.stage = 1;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(buffers.uniforms.time, t);
    gl.uniform1f(buffers.uniforms.form, state.formAmount);
    gl.uniform2f(buffers.uniforms.pointer, state.pointer.x, state.pointer.y);
    gl.uniform1f(buffers.uniforms.pointerActive, state.pointer.active);
    gl.uniform2f(buffers.uniforms.res, state.width, state.height);
    gl.drawArrays(gl.POINTS, 0, state.count);

    if (!state._hudReady && (state.formAmount > 0.55 || t > 2.2 || state.reduced)) {
      state._hudReady = true;
      qs('#sylora-aether')?.classList.add('aether-stage-ready');
    }

    if (NODES.length && t > 1) {
      const idx = Math.floor((t * 0.4) % NODES.length);
      if (idx !== state.hotNode) {
        state.hotNode = idx;
        document.querySelectorAll('.aether-node').forEach((el, i) => {
          el.classList.toggle('is-hot', i === idx);
        });
      }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function pointerFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    if (!src) return;
    const nx = ((src.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((src.clientY - rect.top) / rect.height) * 2 - 1);
    state.pointer.tx = nx * (rect.width / Math.max(rect.height, 1));
    state.pointer.ty = ny;
    state.pointer.active = 1;
  }

  function loadFlutter() {
    if (state.flutterPromise) return state.flutterPromise;
    state.flutterPromise = new Promise((resolve, reject) => {
      const bootLoader = () => {
        if (window._flutter?.loader) {
          window._flutter.loader.load().then(resolve).catch(reject);
          return true;
        }
        return false;
      };
      if (bootLoader()) return;
      const existing = document.querySelector('script[data-sylora-flutter]');
      if (existing) {
        existing.addEventListener('load', () => {
          const wait = () => { if (!bootLoader()) setTimeout(wait, 30); };
          wait();
        });
        return;
      }
      const s = document.createElement('script');
      s.src = 'flutter_bootstrap.js';
      s.async = true;
      s.dataset.syloraFlutter = '1';
      s.onload = () => {
        const wait = () => { if (!bootLoader()) setTimeout(wait, 30); };
        wait();
      };
      s.onerror = reject;
      document.body.appendChild(s);
    });
    return state.flutterPromise;
  }

  function prefetchFlutterIdle() {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1800));
    ric(() => { loadFlutter().catch(() => {}); }, { timeout: 4000 });
  }

  async function enterApp(create) {
    const buttons = document.querySelectorAll('[data-aether-enter], [data-aether-signin], [data-aether-signin-secondary]');
    buttons.forEach((b) => { b.disabled = true; });
    const primary = qs('[data-aether-enter]');
    if (primary) primary.querySelector('span').textContent = 'Opening…';
    try {
      await loadFlutter();
      document.body.classList.remove('sylora-aether-active');
      document.body.classList.add('sylora-app-ready');
      hide();
      location.hash = create ? '#/auth?create=1' : '#/auth';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      console.error(err);
      location.hash = create ? '#/auth?create=1' : '#/auth';
      location.reload();
    }
  }

  function observeUniverse(root) {
    const plate = qs('[data-aether-universe]', root);
    if (!plate || !('IntersectionObserver' in window)) {
      plate?.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.disconnect();
        }
      });
    }, { threshold: 0.28 });
    io.observe(plate);
  }

  function mountHud(root) {
    root.innerHTML = `
      <canvas id="aether-canvas" aria-hidden="true"></canvas>
      <div class="aether-depth" aria-hidden="true"></div>
      <div class="aether-waves" aria-hidden="true"></div>
      <div class="aether-vignette" aria-hidden="true"></div>
      <div class="aether-scroll" data-aether-scroll>
        <div class="aether-hud">
          <div class="aether-top">
            <div class="aether-mark"><span class="aether-mark-petal" aria-hidden="true"></span>SYLORA</div>
            <button type="button" class="aether-pill" data-aether-signin>Sign in</button>
          </div>
          <section class="aether-hero">
            <div class="aether-copy">
              <p class="aether-kicker">Create · Connect · Elevate</p>
              <h1 class="aether-brand">SYLORA</h1>
              <p class="aether-line">Step into a living digital universe — vast, continuous, and built for what comes next.</p>
              <div class="aether-cta-row">
                <button type="button" class="aether-cta" data-aether-enter><span>Enter SYLORA</span></button>
                <button type="button" class="aether-cta ghost" data-aether-signin-secondary><span>Sign in</span></button>
              </div>
              <p class="aether-hint"><span>↓</span> discover the universe</p>
            </div>
          </section>
          <section class="aether-universe" aria-label="Ecosystem">
            <div class="aether-universe-plate" data-aether-universe>
              <h2>One continuum. Infinite rooms.</h2>
              <p>AI, live presence, community, business, learning, marketplace, gifts, and creator tools — orbiting as one world, not a pile of apps.</p>
              <p class="aether-orbit-caption">Ecosystem constellation</p>
              <div class="aether-nodes" data-aether-nodes></div>
            </div>
          </section>
        </div>
      </div>
    `;
    const nodes = qs('[data-aether-nodes]', root);
    NODES.forEach((name) => {
      const el = document.createElement('span');
      el.className = 'aether-node';
      el.textContent = name;
      nodes.appendChild(el);
    });
    qs('[data-aether-enter]', root).addEventListener('click', () => enterApp(true));
    qs('[data-aether-signin]', root).addEventListener('click', () => enterApp(false));
    qs('[data-aether-signin-secondary]', root).addEventListener('click', () => enterApp(false));
    observeUniverse(root);
  }

  function bindPointer(canvas, scrollEl) {
    if (state.listenersBound) return;
    state.listenersBound = true;
    const onMove = (e) => pointerFromEvent(e, canvas);
    const onEnd = () => { state.pointer.active *= 0.3; };
    // Track over whole surface so HUD still ripples the field.
    const surface = scrollEl || canvas;
    surface.addEventListener('pointermove', onMove, { passive: true });
    surface.addEventListener('pointerdown', onMove, { passive: true });
    surface.addEventListener('pointerup', onEnd, { passive: true });
    surface.addEventListener('pointerleave', onEnd, { passive: true });
    surface.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('resize', () => resize(canvas), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(state.raf);
        state.running = false;
      } else if (document.body.classList.contains('sylora-aether-active')) {
        state.running = true;
        state._last = 0;
        state.raf = requestAnimationFrame(frame);
      }
    });
  }

  function particleBudget() {
    state.mobile = window.matchMedia('(max-width: 820px)').matches
      || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
    const cores = navigator.hardwareConcurrency || 4;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const slowNet = !!(navigator.connection && /2g|3g|slow-2g/i.test(navigator.connection.effectiveType || ''));
    if (state.reduced) return 700;
    if (saveData || slowNet) return state.mobile ? 1100 : 2200;
    if (state.mobile) return Math.min(2400, 1400 + cores * 180);
    return Math.min(7000, 3800 + cores * 350);
  }

  function show() {
    let root = qs('#sylora-aether');
    if (!root) {
      root = document.createElement('div');
      root.id = 'sylora-aether';
      document.body.appendChild(root);
    }
    if (!root.dataset.mounted) {
      mountHud(root);
      root.dataset.mounted = '1';
    }
    root.style.display = 'block';
    document.body.classList.add('sylora-aether-active');

    const canvas = qs('#aether-canvas', root);
    const scrollEl = qs('[data-aether-scroll]', root);
    state.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.count = particleBudget();
    state.particles = createParticles(state.count);
    state._hudReady = false;
    root.classList.remove('aether-stage-ready');
    if (state.reduced) {
      root.classList.add('aether-stage-ready');
      state.formAmount = 1;
      state.stage = 1;
    }

    const ctx = initGl(canvas);
    if (!ctx) {
      root.classList.add('aether-stage-ready');
      return;
    }
    state.gl = ctx.gl;
    state.program = ctx.prog;
    state.buffers = upload(ctx.gl, ctx.prog, state.particles);
    resize(canvas);
    state.t0 = performance.now();
    state._last = 0;
    state.running = true;
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(frame);
    bindPointer(canvas, scrollEl);
    prefetchFlutterIdle();
  }

  function hide() {
    state.running = false;
    cancelAnimationFrame(state.raf);
    const root = qs('#sylora-aether');
    if (root) root.style.display = 'none';
    document.body.classList.remove('sylora-aether-active');
  }

  function boot() {
    if (!document.querySelector('link[data-sylora-aether-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'aether/sylora-aether.css';
      link.dataset.syloraAetherCss = '1';
      document.head.appendChild(link);
    }
    if (prefersAetherRoute()) show();
    else {
      document.body.classList.add('sylora-app-ready');
      loadFlutter().catch((e) => console.error(e));
    }
    window.addEventListener('hashchange', () => {
      if (prefersAetherRoute()) {
        if (!document.body.classList.contains('sylora-aether-active')) show();
      } else {
        hide();
        document.body.classList.add('sylora-app-ready');
        loadFlutter().catch(() => {});
      }
    });
  }

  window.SyloraAether = {
    show,
    hide,
    enter(create) { return enterApp(!!create); },
    prefersAetherRoute,
    loadFlutter,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
