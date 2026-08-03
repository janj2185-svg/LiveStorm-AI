/**
 * SYLORA Aether v4 — AI ecosystem entry with clear product identity.
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

  /** Rough glyph polylines for SYLORA in normalized [-1,1] box. */
  const GLYPHS = {
    S: [[0.35, -0.7], [-0.15, -0.85], [-0.4, -0.55], [-0.1, -0.2], [0.25, 0.05], [0.4, 0.4], [0.1, 0.75], [-0.4, 0.85]],
    Y: [[-0.45, -0.85], [0, -0.1], [0.45, -0.85], [0, -0.1], [0, 0.85]],
    L: [[-0.35, -0.85], [-0.35, 0.85], [0.4, 0.85]],
    O: [[0.0, -0.85], [0.4, -0.55], [0.45, 0.1], [0.25, 0.7], [-0.25, 0.7], [-0.45, 0.1], [-0.4, -0.55], [0.0, -0.85]],
    R: [[-0.4, 0.85], [-0.4, -0.85], [0.2, -0.85], [0.4, -0.55], [0.2, -0.15], [-0.4, -0.15], [0.05, -0.15], [0.4, 0.85]],
    A: [[-0.45, 0.85], [0, -0.85], [0.45, 0.85], [0.28, 0.2], [-0.28, 0.2]],
  };
  const WORD = ['S', 'Y', 'L', 'O', 'R', 'A'];

  const state = {
    running: false,
    reduced: false,
    mobile: false,
    formAmount: 0,
    t0: 0,
    cam: { x: 0, y: 0, tx: 0, ty: 0 },
    pointer: { x: 0, y: 0, tx: 0, ty: 0, active: 0 },
    width: 1,
    height: 1,
    gl: null,
    buffers: null,
    count: 0,
    particles: null,
    raf: 0,
    flutterPromise: null,
    hotNode: -1,
    fpsGate: 0,
    skipOdd: false,
    listenersBound: false,
    revealed: false,
  };

  function prefersAetherRoute() {
    const hash = (location.hash || '').replace(/^#/, '');
    return !hash || hash === '/' || hash === '/welcome' || hash.startsWith('/welcome');
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function samplePolyline(points, t) {
    if (points.length === 1) return points[0];
    const seg = Math.min(points.length - 1.0001, t * (points.length - 1));
    const i = Math.floor(seg);
    const f = seg - i;
    const a = points[i];
    const b = points[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  function buildLogoTargets(count) {
    const targets = new Float32Array(count * 2);
    const colors = new Float32Array(count * 3);
    const depths = new Float32Array(count);
    const layers = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      let x;
      let y;
      let petal = i % 5;
      const roll = Math.random();

      if (roll < 0.58) {
        // Wordmark SYLORA
        const gi = i % WORD.length;
        const glyph = GLYPHS[WORD[gi]];
        const p = samplePolyline(glyph, Math.random());
        const slot = (gi - (WORD.length - 1) / 2) * 0.34;
        x = p[0] * 0.12 + slot;
        y = p[1] * 0.16 + 0.08;
        petal = gi % 5;
      } else if (roll < 0.86) {
        // Petal mark above word
        const angle = (petal / 5) * Math.PI * 2 - Math.PI / 2;
        const u = Math.random();
        const v = Math.random();
        const lx = (u - 0.5) * 0.34;
        const ly = (v * v) * 0.55 - 0.04;
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        x = (lx * ca - ly * sa) * 0.55;
        y = (lx * sa + ly * ca) * 0.55 + 0.42;
      } else {
        // Soft core bloom
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.1;
        x = Math.cos(a) * r;
        y = Math.sin(a) * r + 0.22;
      }

      targets[i * 2] = x;
      targets[i * 2 + 1] = y;
      const c = PETAL_COLORS[petal];
      const j = 0.85 + Math.random() * 0.2;
      colors[i * 3] = c[0] * j;
      colors[i * 3 + 1] = c[1] * j;
      colors[i * 3 + 2] = c[2] * j;
      // Three parallax strata
      const layer = Math.random() < 0.35 ? 0 : Math.random() < 0.55 ? 1 : 2;
      layers[i] = layer;
      depths[i] = layer === 0 ? Math.random() * 0.35 : layer === 1 ? 0.35 + Math.random() * 0.35 : 0.7 + Math.random() * 0.3;
    }
    return { targets, colors, depths, layers };
  }

  function createParticles(count) {
    const positions = new Float32Array(count * 3); // x,y,z
    const velocities = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const { targets, colors, depths, layers } = buildLogoTargets(count);
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 2.4;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r * 0.75;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
      velocities[i * 3] = (Math.random() - 0.5) * 0.25;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
      seeds[i] = Math.random() * 1000;
    }
    return { positions, velocities, seeds, targets, colors, depths, layers };
  }

  /**
   * First open: dramatic coalesce. Later: gentle breathe (partial scatter).
   * Returns 0..1 form amount.
   */
  function formAmountAt(t) {
    if (t < 0.35) return 0;
    if (t < 3.6) {
      const u = (t - 0.35) / 3.25;
      return u * u * (3 - 2 * u);
    }
    // Hold fully formed, then soft pulse between 0.72..1.0
    if (t < 6.2) return 1;
    const pulse = (Math.sin((t - 6.2) * 0.55) + 1) * 0.5;
    return 0.72 + pulse * 0.28;
  }

  const VERT = `
    attribute vec3 a_pos;
    attribute vec3 a_color;
    attribute float a_seed;
    attribute float a_depth;
    uniform float u_time;
    uniform float u_form;
    uniform vec2 u_cam;
    uniform vec2 u_pointer;
    uniform float u_pointerActive;
    uniform vec2 u_res;
    varying vec3 v_color;
    varying float v_alpha;

    void main() {
      vec3 p = a_pos;
      // Living field waves by depth layer
      float w = 0.02 + a_depth * 0.03;
      p.x += w * sin(u_time * (0.7 + a_depth) + p.y * 3.5 + a_seed);
      p.y += w * cos(u_time * (0.55 + a_depth * 0.4) + p.x * 3.0);

      // Pointer gravity / ripples
      if (u_pointerActive > 0.04) {
        vec2 d = p.xy - u_pointer;
        float dist = length(d) + 0.001;
        float fall = smoothstep(1.1, 0.0, dist);
        p.xy += normalize(d) * (0.06 * u_pointerActive * fall) * mix(0.4, 1.35, a_depth);
        p.z += fall * u_pointerActive * 0.08;
      }

      // Camera parallax — true sense of volume
      p.xy -= u_cam * mix(0.15, 0.85, a_depth);

      // Perspective projection
      float z = clamp(p.z, -1.4, 1.4);
      float persp = 1.15 / (1.15 + z * 0.55);
      vec2 view = p.xy * persp;
      float aspect = u_res.y / max(u_res.x, 1.0);
      vec2 ndc = vec2(view.x * aspect, view.y);

      float size = mix(1.2, 3.2, a_depth) * persp;
      size *= mix(0.8, 1.35, u_form);
      size *= (0.88 + 0.2 * sin(u_time * 1.6 + a_seed));

      // Keep lower title readable without a card: soft fade under midline
      float hud = smoothstep(0.05, -0.7, view.y);
      size *= mix(1.0, 0.4, hud);
      float alpha = mix(0.18, 0.95, a_depth) * mix(0.45, 1.0, u_form);
      alpha *= mix(1.0, 0.1, hud);

      gl_Position = vec4(ndc, 0.0, 1.0);
      gl_PointSize = max(1.0, size * (u_res.y / 1000.0));
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
      float glow = exp(-d * 2.9);
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
    const bind = (data, name, size, dynamic) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return buf;
    };
    const posBuf = bind(particles.positions, 'a_pos', 3, true);
    bind(particles.colors, 'a_color', 3, false);
    bind(particles.seeds, 'a_seed', 1, false);
    bind(particles.depths, 'a_depth', 1, false);
    return {
      posBuf,
      uniforms: {
        time: gl.getUniformLocation(prog, 'u_time'),
        form: gl.getUniformLocation(prog, 'u_form'),
        cam: gl.getUniformLocation(prog, 'u_cam'),
        pointer: gl.getUniformLocation(prog, 'u_pointer'),
        pointerActive: gl.getUniformLocation(prog, 'u_pointerActive'),
        res: gl.getUniformLocation(prog, 'u_res'),
      },
    };
  }

  function resize(canvas) {
    const maxDpr = state.mobile ? 1.25 : 1.6;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    state.width = w;
    state.height = h;
    if (state.gl) state.gl.viewport(0, 0, w, h);
  }

  function stepParticles(particles, dt, t) {
    const { positions, velocities, targets, seeds, layers } = particles;
    const count = state.count;
    const form = formAmountAt(t);
    state.formAmount = form;

    state.pointer.x += (state.pointer.tx - state.pointer.x) * Math.min(1, dt * 9);
    state.pointer.y += (state.pointer.ty - state.pointer.y) * Math.min(1, dt * 9);
    state.pointer.active *= 0.9;
    state.cam.x += (state.cam.tx - state.cam.x) * Math.min(1, dt * 4.5);
    state.cam.y += (state.cam.ty - state.cam.y) * Math.min(1, dt * 4.5);

    const px = state.pointer.x;
    const py = state.pointer.y;
    const pActive = state.pointer.active;

    for (let i = 0; i < count; i += 1) {
      const ix = i * 3;
      const n = seeds[i];
      const layer = layers[i];
      const scatter = 1 - form;
      const wanderScale = (layer === 0 ? 1.35 : layer === 1 ? 0.95 : 0.55) * scatter;
      const wanderX = Math.cos(t * (0.35 + layer * 0.12) + n) * (0.7 + wanderScale);
      const wanderY = Math.sin(t * (0.28 + layer * 0.1) + n * 1.2) * (0.55 + wanderScale * 0.8);
      const wanderZ = Math.sin(t * 0.4 + n) * (0.55 * scatter + 0.08);

      const tx = targets[i * 2] * form + wanderX * scatter;
      const ty = targets[i * 2 + 1] * form + wanderY * scatter;
      const tz = wanderZ;

      let ax = (tx - positions[ix]) * (0.7 + form * 2.4);
      let ay = (ty - positions[ix + 1]) * (0.7 + form * 2.4);
      let az = (tz - positions[ix + 2]) * (0.55 + form * 1.2);

      if (pActive > 0.05) {
        const dx = positions[ix] - px;
        const dy = positions[ix + 1] - py;
        const dist2 = dx * dx + dy * dy + 0.0003;
        const force = (0.07 * pActive) / dist2;
        ax += dx * force;
        ay += dy * force;
        az += force * 0.15;
      }

      // Sparse particle interaction — push neighbors apart in formed state
      if (!state.mobile && form > 0.85 && i % 17 === 0) {
        const j = (i + 13) % count;
        const jx = j * 3;
        const ddx = positions[ix] - positions[jx];
        const ddy = positions[ix + 1] - positions[jx + 1];
        const d2 = ddx * ddx + ddy * ddy + 0.0004;
        if (d2 < 0.01) {
          ax += ddx * (0.02 / d2);
          ay += ddy * (0.02 / d2);
        }
      }

      velocities[ix] = (velocities[ix] + ax * dt) * 0.84;
      velocities[ix + 1] = (velocities[ix + 1] + ay * dt) * 0.84;
      velocities[ix + 2] = (velocities[ix + 2] + az * dt) * 0.86;
      positions[ix] += velocities[ix] * dt;
      positions[ix + 1] += velocities[ix + 1] * dt;
      positions[ix + 2] += velocities[ix + 2] * dt;
    }
  }

  function frame(now) {
    if (!state.running) return;
    const t = (now - state.t0) / 1000;
    const rawDt = state._last ? (now - state._last) / 1000 : 0.016;
    const dt = Math.min(0.033, rawDt);
    state._last = now;

    if (rawDt > 0.03) state.fpsGate = Math.min(8, state.fpsGate + 1);
    else state.fpsGate = Math.max(0, state.fpsGate - 1);
    const skipPhysics = state.mobile && state.fpsGate > 3 && (state.skipOdd = !state.skipOdd);

    const { gl, buffers, particles } = state;
    if (!state.reduced && !skipPhysics) {
      stepParticles(particles, dt, t);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, particles.positions);
    } else if (state.reduced) {
      state.formAmount = 1;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(buffers.uniforms.time, t);
    gl.uniform1f(buffers.uniforms.form, state.formAmount);
    gl.uniform2f(buffers.uniforms.cam, state.cam.x, state.cam.y);
    gl.uniform2f(buffers.uniforms.pointer, state.pointer.x, state.pointer.y);
    gl.uniform1f(buffers.uniforms.pointerActive, state.pointer.active);
    gl.uniform2f(buffers.uniforms.res, state.width, state.height);
    gl.drawArrays(gl.POINTS, 0, state.count);

    // Parallax glow follows camera
    const glow = qs('.aether-glow');
    if (glow) {
      glow.style.transform = `translate3d(${(-state.cam.x) * 28}px, ${(state.cam.y) * 22}px, 0)`;
    }

    if (!state.revealed && (state.formAmount > 0.82 || t > 3.8 || state.reduced)) {
      state.revealed = true;
      qs('#sylora-aether')?.classList.add('aether-revealed');
    }

    if (NODES.length) {
      const idx = Math.floor((t * 0.35) % NODES.length);
      if (idx !== state.hotNode) {
        state.hotNode = idx;
        document.querySelectorAll('.aether-star').forEach((el, i) => {
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
    const aspect = rect.width / Math.max(rect.height, 1);
    state.pointer.tx = nx * aspect;
    state.pointer.ty = ny;
    state.pointer.active = 1;
    state.cam.tx = nx * 0.22;
    state.cam.ty = ny * 0.16;
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
      let s = document.querySelector('script[data-sylora-flutter]');
      if (!s) {
        s = document.createElement('script');
        s.src = 'flutter_bootstrap.js';
        s.async = true;
        s.dataset.syloraFlutter = '1';
        s.onerror = reject;
        document.body.appendChild(s);
      }
      s.addEventListener('load', () => {
        const wait = () => { if (!bootLoader()) setTimeout(wait, 30); };
        wait();
      });
    });
    return state.flutterPromise;
  }

  function prefetchFlutterIdle() {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 2200));
    ric(() => { loadFlutter().catch(() => {}); }, { timeout: 5000 });
  }

  async function enterApp(create) {
    document.querySelectorAll('[data-aether-enter], [data-aether-signin]').forEach((b) => {
      b.disabled = true;
    });
    const label = qs('[data-aether-enter] span');
    if (label) label.textContent = 'Opening';
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

  function observeSpace(root) {
    const space = qs('[data-aether-space]', root);
    if (!space) return;
    if (!('IntersectionObserver' in window)) {
      space.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.disconnect();
        }
      });
    }, { threshold: 0.22 });
    io.observe(space);
  }

  function mountHud(root) {
    root.innerHTML = `
      <canvas id="aether-canvas" aria-hidden="true"></canvas>
      <div class="aether-glow" aria-hidden="true"></div>
      <div class="aether-veil" aria-hidden="true"></div>
      <div class="aether-scroll" data-aether-scroll>
        <div class="aether-hud">
          <div class="aether-top">
            <button type="button" class="aether-link" data-aether-signin>Увійти</button>
          </div>
          <section class="aether-hero">
            <p class="aether-kicker">AI-екосистема</p>
            <h1 class="aether-brand">SYLORA</h1>
            <p class="aether-line">Жива цифрова платформа: штучний інтелект, live, спільнота, бізнес і творчість в одному просторі.</p>
            <div class="aether-cta-wrap">
              <button type="button" class="aether-portal" data-aether-enter>
                <span>Почати</span>
                <i class="aether-portal-beam" aria-hidden="true"></i>
              </button>
              <button type="button" class="aether-secondary" data-aether-create>Створити акаунт</button>
            </div>
            <p class="aether-hint"><i>↓</i> можливості екосистеми</p>
          </section>
          <section class="aether-space" data-aether-space aria-label="Ecosystem">
            <h2 class="aether-space-title">Не окремі продукти — єдина AI-екосистема.</h2>
            <div class="aether-constellation" data-aether-nodes></div>
          </section>
        </div>
      </div>
    `;
    const nodes = qs('[data-aether-nodes]', root);
    NODES.forEach((name) => {
      const el = document.createElement('span');
      el.className = 'aether-star';
      el.textContent = name;
      nodes.appendChild(el);
    });
    qs('[data-aether-enter]', root).addEventListener('click', () => enterApp(true));
    qs('[data-aether-create]', root).addEventListener('click', () => enterApp(true));
    qs('[data-aether-signin]', root).addEventListener('click', () => enterApp(false));
    observeSpace(root);
  }

  function bindPointer(canvas, scrollEl) {
    if (state.listenersBound) return;
    state.listenersBound = true;
    const onMove = (e) => pointerFromEvent(e, canvas);
    const onEnd = () => { state.pointer.active *= 0.25; };
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
    const conn = navigator.connection;
    const saveData = !!(conn && conn.saveData);
    const slowNet = !!(conn && /2g|3g|slow-2g/i.test(conn.effectiveType || ''));
    if (state.reduced) return 650;
    if (saveData || slowNet) return state.mobile ? 1000 : 2000;
    if (state.mobile) return Math.min(2200, 1200 + cores * 160);
    return Math.min(6500, 3400 + cores * 320);
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
    root.classList.remove('aether-revealed');
    state.revealed = false;

    const canvas = qs('#aether-canvas', root);
    const scrollEl = qs('[data-aether-scroll]', root);
    state.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.count = particleBudget();
    state.particles = createParticles(state.count);

    if (state.reduced) {
      root.classList.add('aether-revealed');
      state.formAmount = 1;
      state.revealed = true;
    }

    const ctx = initGl(canvas);
    if (!ctx) {
      root.classList.add('aether-revealed');
      return;
    }
    state.gl = ctx.gl;
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
