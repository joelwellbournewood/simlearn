/* SimLearn hero background: a murmurating flock.
   Self-contained. Draws behind the hero text on the homepage only.
   Pauses when off-screen, when the tab is hidden, or when the user
   prefers reduced motion. */
(function () {
  const cv = document.querySelector('canvas.hero-flock');
  if (!cv) return;
  const ctx = cv.getContext('2d', { alpha: true });
  if (!ctx) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ACCENT = [86, 224, 194];
  const WARM = [255, 125, 92];

  let W = 0, H = 0, dpr = 1;
  let boids = [];
  let anchor = { x: 0, y: 0 };
  let t = 0, last = 0, running = false, visible = true;

  function resize() {
    const r = cv.getBoundingClientRect();
    W = Math.max(320, Math.round(r.width));
    H = Math.max(120, Math.round(r.height));
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.max(95, Math.min(180, Math.round(W * 0.105)));
    while (boids.length > want) boids.pop();
    while (boids.length < want) boids.push(spawn());
  }

  function spawn() {
    const a = Math.random() * Math.PI * 2;
    const sp = 46 + Math.random() * 34;
    return {
      x: W * (0.35 + Math.random() * 0.5),
      y: H * (0.2 + Math.random() * 0.6),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      z: 0.55 + Math.random() * 0.6,
      warm: Math.random() < 0.07
    };
  }

  const R_SEP = 15, R_ALI = 46, R_COH = 62;
  const S2 = R_SEP * R_SEP, A2 = R_ALI * R_ALI, C2 = R_COH * R_COH;

  function step(dt) {
    t += dt;
    // The anchor wanders on a slow Lissajous path; it is what makes the
    // whole flock drift across the hero instead of sitting in the middle.
    anchor.x = W * (0.64 + 0.20 * Math.sin(t * 0.11) * Math.cos(t * 0.043));
    anchor.y = H * (0.50 + 0.24 * Math.sin(t * 0.077 + 1.3));

    const n = boids.length;
    for (let i = 0; i < n; i++) {
      const b = boids[i];
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, na = 0, nc = 0;

      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const o = boids[j];
        const dx = o.x - b.x, dy = o.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > C2 || d2 === 0) continue;
        if (d2 < S2) { const inv = 1 / d2; sx -= dx * inv; sy -= dy * inv; }
        if (d2 < A2) { ax += o.vx; ay += o.vy; na++; }
        cx += o.x; cy += o.y; nc++;
      }

      let fx = sx * 900, fy = sy * 900;
      if (na) { fx += (ax / na - b.vx) * 1.5; fy += (ay / na - b.vy) * 1.5; }
      if (nc) { fx += (cx / nc - b.x) * 0.55; fy += (cy / nc - b.y) * 0.55; }

      // Pull towards the wandering anchor: keeps the flock coherent.
      fx += (anchor.x - b.x) * 0.30;
      fy += (anchor.y - b.y) * 0.30;

      // A slow rotating field. This is the bit that makes the shape churn
      // and fold the way a real murmuration does.
      const k = 0.011;
      fx += Math.sin(b.y * k + t * 0.55) * 26;
      fy += Math.cos(b.x * k - t * 0.43) * 26;

      const m = 46;
      if (b.x < m) fx += (m - b.x) * 2.2;
      if (b.x > W - m) fx -= (b.x - (W - m)) * 2.2;
      if (b.y < m) fy += (m - b.y) * 2.6;
      if (b.y > H - m) fy -= (b.y - (H - m)) * 2.6;

      b.vx += fx * dt;
      b.vy += fy * dt;

      const sp = Math.hypot(b.vx, b.vy) || 1e-6;
      const lo = 38 * b.z, hi = 96 * b.z;
      const cl = sp < lo ? lo / sp : sp > hi ? hi / sp : 1;
      b.vx *= cl; b.vy *= cl;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20) b.x = -20; else if (b.x > W + 20) b.x = W + 20;
      if (b.y < -20) b.y = -20; else if (b.y > H + 20) b.y = H + 20;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      const sp = Math.hypot(b.vx, b.vy) || 1e-6;
      const ux = b.vx / sp, uy = b.vy / sp;
      const len = 5.2 * b.z + sp * 0.018;
      const wid = 1.9 * b.z;
      const col = b.warm ? WARM : ACCENT;
      const alpha = (b.warm ? 0.5 : 0.42) * (0.35 + b.z * 0.62);
      const rgb = col[0] + ',' + col[1] + ',' + col[2];

      ctx.strokeStyle = 'rgba(' + rgb + ',' + (alpha * 0.34).toFixed(3) + ')';
      ctx.lineWidth = wid * 0.7;
      ctx.beginPath();
      ctx.moveTo(b.x - ux * len * 2.6, b.y - uy * len * 2.6);
      ctx.lineTo(b.x - ux * len, b.y - uy * len);
      ctx.stroke();

      ctx.fillStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(b.x + ux * len, b.y + uy * len);
      ctx.lineTo(b.x - ux * len * 0.8 - uy * wid, b.y - uy * len * 0.8 + ux * wid);
      ctx.lineTo(b.x - ux * len * 0.35, b.y - uy * len * 0.35);
      ctx.lineTo(b.x - ux * len * 0.8 + uy * wid, b.y - uy * len * 0.8 - ux * wid);
      ctx.closePath();
      ctx.fill();
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || REDUCED || document.hidden || !visible) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  resize();
  for (let i = 0; i < 90; i++) step(1 / 30);
  draw();
  window.__flock = { boids: boids, isRunning: function () { return running; } };

  if (REDUCED) return;

  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0 }).observe(cv);
  }
  start();
})();
