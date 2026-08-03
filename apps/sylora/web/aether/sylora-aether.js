/**
 * SYLORA Aether — GPU particle world for the public entry.
 * Instant canvas paint; Flutter boots only on demand.
 */
(function () {
  'use strict';

  const NODES = [
    'AI',
    'Live',
    'Community',
    'Business',
    'Education',
    'Marketplace',
    'Gifts',
    'Creator Tools',
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
    stage: 0,
    t0: 0,
    pointer: { x: 0, y: 0, active: false },
    width: 1,
    height: 1,
    dpr: 1,
    gl: null,
    program: null,
    buffers: null,
    count: 0,
    targets: null,
    raf: 0,
    flutterPromise: null,
    hotNode: -1,
  };

  function prefersAetherRoute() {
    const hash = (location.hash || '').replace(/^#/, '');
    if (!hash || hash === '/' || hash === '/welcome') return true;
    if (hash.startsWith('/welcome')) return true;
    return false;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function buildLogoTargets(count) {
    const targets = new Float32Array(count * 2);
    const colors = new Float32Array(count * 3);
    const petals = 5;
    for (let i = 0; i < count; i += 1) {
      const petal = i % petals;
      const angle = (petal / petals) * Math.PI * 2 - Math.PI / 2;
      const u = Math.random();
      const v = Math.random();
      // Ellipse petal in local space, then rotate + offset from center.
      const lx = (u - 0.5) * 0.42;
      const ly = (v * v) * 0.72 - 0.08;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const x = lx * ca - ly * sa;
      const y = lx * sa + ly * ca;
      // Slight denser core.
      const core = Math.random() < 0.12;
      targets[i * 2] = core ? (Math.random() - 0.5) * 0.12 : x * 0.95;
      targets[i * 2 + 1] = core ? (Math.random() - 0.5) * 0.12 : y * 0.95;
      const c = PETAL_COLORS[petal];
      const jitter = 0.85 + Math.random() * 0.2;
      colors[i * 3] = c[0] * jitter;
      colors[i * 3 + 1] = c[1] * jitter;
      colors[i * 3 + 2] = c[2] * jitter;
    }
    return { targets, colors };
  }

  function createParticles(count) {
    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count * 2);
    const seeds = new Float32Array(count);
    const { targets, colors } = buildLogoTargets(count);
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.55 + Math.random() * 1.4;
      positions[i * 2] = Math.cos(a) * r;
      positions[i * 2 + 1] = Math.sin(a) * r;
      velocities[i * 2] = (Math.random() - 0.5) * 0.25;
      velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.25;
      seeds[i] = Math.random() * 1000;
    }
    return { positions, velocities, seeds, targets, colors };
  }

  const VERT = `
    attribute vec2 a_pos;
    attribute vec3 a_color;
    attribute float a_seed;
    uniform float u_time;
    uniform float u_stage;
    uniform vec2 u_pointer;
    uniform float u_pointerActive;
    uniform vec2 u_res;
    varying vec3 v_color;
    varying float v_alpha;
    void main() {
      float breathe = 0.012 * sin(u_time * 1.3 + a_seed);
      vec2 p = a_pos;
      // Soft light-wave field.
      p.y += 0.018 * sin(p.x * 6.0 + u_time * 1.4);
      p.x += 0.012 * cos(p.y * 5.0 - u_time * 1.1);
      if (u_pointerActive > 0.5) {
        vec2 d = p - u_pointer;
        float dist = length(d) + 0.0001;
        p += normalize(d) * (0.035 / dist) * smoothstep(0.55, 0.0, dist);
      }
      float size = mix(1.6, 2.8, clamp(u_stage, 0.0, 1.0));
      size *= (0.85 + 0.25 * sin(u_time * 2.0 + a_seed));
      // Aspect-correct
      vec2 ndc = vec2(p.x * (u_res.y / u_res.x), p.y);
      gl_Position = vec4(ndc * 1.15, 0.0, 1.0);
      gl_PointSize = size * (1.0 + breathe * 8.0) * (u_res.y / 900.0);
      v_color = a_color;
      v_alpha = mix(0.35, 0.95, clamp(u_stage, 0.0, 1.0));
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
      float glow = exp(-d * 2.8);
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
      powerPreference: 'high-performance',
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
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, particles.positions, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const colBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, particles.colors, gl.STATIC_DRAW);
    const aColor = gl.getAttribLocation(prog, 'a_color');
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

    const seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, particles.seeds, gl.STATIC_DRAW);
    const aSeed = gl.getAttribLocation(prog, 'a_seed');
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);

    return {
      posBuf,
      uniforms: {
        time: gl.getUniformLocation(prog, 'u_time'),
        stage: gl.getUniformLocation(prog, 'u_stage'),
        pointer: gl.getUniformLocation(prog, 'u_pointer'),
        pointerActive: gl.getUniformLocation(prog, 'u_pointerActive'),
        res: gl.getUniformLocation(prog, 'u_res'),
      },
    };
  }

  function resize(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    const { positions, velocities, targets } = particles;
    const count = state.count;
    // Formation stage eases toward logo; later adds orbital drift.
    const form = Math.min(1, Math.max(0, (t - 0.4) / 2.8));
    const ease = form * form * (3 - 2 * form);
    state.stage = ease;
    const px = state.pointer.x;
    const py = state.pointer.y;
    const pActive = state.pointer.active;

    for (let i = 0; i < count; i += 1) {
      const ix = i * 2;
      const tx = targets[ix];
      const ty = targets[ix + 1];
      // Noise field before formation.
      const n = particles.seeds[i];
      const wanderX = Math.cos(t * 0.7 + n) * 0.35;
      const wanderY = Math.sin(t * 0.55 + n * 1.3) * 0.28;
      const goalX = tx * ease + wanderX * (1 - ease);
      const goalY = ty * ease + wanderY * (1 - ease);
      let ax = (goalX - positions[ix]) * (0.9 + ease * 1.8);
      let ay = (goalY - positions[ix + 1]) * (0.9 + ease * 1.8);
      if (pActive) {
        const dx = positions[ix] - px;
        const dy = positions[ix + 1] - py;
        const dist2 = dx * dx + dy * dy + 0.0002;
        const force = 0.08 / dist2;
        ax += dx * force;
        ay += dy * force;
      }
      // Late-stage constellation orbit for a subset.
      if (ease > 0.85 && i % 11 === 0) {
        const ang = t * 0.35 + n;
        const radius = 0.55 + (i % 7) * 0.05;
        ax += (Math.cos(ang) * radius - positions[ix]) * 0.15;
        ay += (Math.sin(ang) * radius * 0.62 - positions[ix + 1]) * 0.15;
      }
      velocities[ix] = (velocities[ix] + ax * dt) * 0.86;
      velocities[ix + 1] = (velocities[ix + 1] + ay * dt) * 0.86;
      positions[ix] += velocities[ix] * dt;
      positions[ix + 1] += velocities[ix + 1] * dt;
    }
  }

  function frame(now) {
    if (!state.running) return;
    const t = (now - state.t0) / 1000;
    const dt = Math.min(0.033, state._last ? (now - state._last) / 1000 : 0.016);
    state._last = now;
    const { gl, program, buffers, particles } = state;
    if (!state.reduced) {
      stepParticles(particles, dt, t);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, particles.positions);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(buffers.uniforms.time, t);
    gl.uniform1f(buffers.uniforms.stage, state.stage);
    gl.uniform2f(buffers.uniforms.pointer, state.pointer.x, state.pointer.y);
    gl.uniform1f(buffers.uniforms.pointerActive, state.pointer.active ? 1 : 0);
    gl.uniform2f(buffers.uniforms.res, state.width, state.height);
    gl.drawArrays(gl.POINTS, 0, state.count);

    if (state.stage > 0.72 && !state._hudReady) {
      state._hudReady = true;
      qs('#sylora-aether')?.classList.add('aether-stage-ready');
    }
    // Hot node pulse
    if (NODES.length) {
      const idx = Math.floor((t * 0.45) % NODES.length);
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
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    // Match vertex aspect mapping roughly.
    state.pointer.x = nx * (rect.width / Math.max(rect.height, 1));
    state.pointer.y = ny;
    state.pointer.active = true;
  }

  function loadFlutter() {
    if (state.flutterPromise) return state.flutterPromise;
    state.flutterPromise = new Promise((resolve, reject) => {
      if (window._flutter?.loader) {
        window._flutter.loader.load()
          .then(resolve)
          .catch(reject);
        return;
      }
      const existing = document.querySelector('script[data-sylora-flutter]');
      if (existing) {
        existing.addEventListener('load', () => {
          window._flutter.loader.load().then(resolve).catch(reject);
        });
        return;
      }
      const s = document.createElement('script');
      s.src = 'flutter_bootstrap.js';
      s.async = true;
      s.dataset.syloraFlutter = '1';
      s.onload = () => {
        const boot = () => {
          if (window._flutter?.loader) {
            window._flutter.loader.load().then(resolve).catch(reject);
          } else {
            setTimeout(boot, 30);
          }
        };
        boot();
      };
      s.onerror = reject;
      document.body.appendChild(s);
    });
    return state.flutterPromise;
  }

  function prefetchFlutterIdle() {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
    ric(() => {
      loadFlutter().catch(() => {});
    }, { timeout: 2500 });
  }

  async function enterApp(create) {
    const primary = qs('[data-aether-enter]');
    const secondary = qs('[data-aether-signin]');
    [primary, secondary].forEach((b) => b && (b.disabled = true));
    if (primary) primary.textContent = 'Opening…';
    try {
      await loadFlutter();
      document.body.classList.remove('sylora-aether-active');
      document.body.classList.add('sylora-app-ready');
      hide();
      const path = create ? '/auth?create=1' : '/auth';
      location.hash = `#${path}`;
      // Give GoRouter a moment if already running.
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      console.error(err);
      location.hash = create ? '#/auth?create=1' : '#/auth';
      location.reload();
    }
  }

  function mountHud(root) {
    root.innerHTML = `
      <canvas id="aether-canvas" aria-hidden="true"></canvas>
      <div class="aether-vignette"></div>
      <div class="aether-hud">
        <div class="aether-top">
          <div class="aether-mark"><span class="aether-mark-petal" aria-hidden="true"></span>SYLORA</div>
          <button type="button" class="aether-pill" data-aether-signin>Sign in</button>
        </div>
        <div class="aether-center">
          <p class="aether-kicker">Create · Connect · Elevate</p>
          <h1 class="aether-brand">SYLORA</h1>
          <p class="aether-line">A living digital ecosystem — AI, live presence, community, and creation in one continuum.</p>
          <div class="aether-cta-row">
            <button type="button" class="aether-cta" data-aether-enter>Enter SYLORA</button>
            <button type="button" class="aether-cta ghost" data-aether-signin-secondary>Sign in</button>
          </div>
        </div>
        <div class="aether-bottom">
          <p class="aether-orbit-caption">Ecosystem constellation</p>
          <div class="aether-nodes" data-aether-nodes></div>
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
    const mobile = window.matchMedia('(max-width: 820px)').matches;
    const cores = navigator.hardwareConcurrency || 4;
    const count = state.reduced ? 900 : mobile ? Math.min(4500, 2200 + cores * 300) : Math.min(12000, 6000 + cores * 600);
    state.count = count;
    state.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.particles = createParticles(count);
    state._hudReady = false;
    root.classList.remove('aether-stage-ready');
    if (state.reduced) {
      root.classList.add('aether-stage-ready');
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

    const onMove = (e) => pointerFromEvent(e, canvas);
    const onEnd = () => { state.pointer.active = false; };
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerdown', onMove, { passive: true });
    canvas.addEventListener('pointerup', onEnd, { passive: true });
    canvas.addEventListener('pointerleave', onEnd, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('resize', () => resize(canvas), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(state.raf);
        state.running = false;
      } else if (document.body.classList.contains('sylora-aether-active')) {
        state.running = true;
        state.t0 = performance.now() - state.stage * 3000;
        state.raf = requestAnimationFrame(frame);
      }
    });
    prefetchFlutterIdle();
  }

  function hide() {
    state.running = false;
    cancelAnimationFrame(state.raf);
    const root = qs('#sylora-aether');
    if (root) {
      root.style.display = 'none';
    }
    document.body.classList.remove('sylora-aether-active');
  }

  function boot() {
    // Ensure stylesheet
    if (!document.querySelector('link[data-sylora-aether-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'aether/sylora-aether.css';
      link.dataset.syloraAetherCss = '1';
      document.head.appendChild(link);
    }
    if (prefersAetherRoute()) {
      show();
    } else {
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
    enter: function (create) {
      return enterApp(!!create);
    },
    prefersAetherRoute,
    loadFlutter,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
