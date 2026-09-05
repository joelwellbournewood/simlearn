/* SimLearn site background: murmurating flocks over the whole page.
   Parameters follow the Murmuration preset in sims/boids (topological
   neighbours, alignment-led weights, cruise, startle, initiative).
   Pauses when the tab is hidden or the user prefers reduced motion. */
(function () {
  var cv = document.querySelector('canvas.site-flock') || document.querySelector('canvas.hero-flock');
  if (!cv) return;
  var ctx = cv.getContext('2d', { alpha: true });
  if (!ctx) return;

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ACCENT = '86,224,194', WARM = '255,125,92';

  // --- Murmuration preset, translated to px and seconds -------------------
  var MAXSPEED = 168, MINSPEED = MAXSPEED * 0.55;
  var MAXFORCE = MAXSPEED * 4.2;          // agility 0.12
  var PERC = 78, SEP = 27, K = 7;         // perception / separation / topo
  var W_SEP = 2.15, W_ALI = 2.2, W_COH = 0.8;
  var CRUISE = 0.7, JITTER = 0.8, STARTLE = 0.8 * 4, INITIATIVE = 1;
  var ATTRACT = 0.20, ROOST = 0.3, COS_FOV = Math.cos(300 * Math.PI / 360);

  var W = 0, H = 0, dpr = 1, t = 0, last = 0, running = false;
  var boids = [], clusters = [];
  var kd2 = new Float64Array(K), kj = new Int32Array(K);

  function makeCluster(i, nc) {
    return {
      cx: 0, cy: 0, r: 0,
      ax: (0.5 + i) / nc, ay: (i % 2 ? 0.68 : 0.30) + (Math.random() - 0.5) * 0.1,
      sx: 0.055 + Math.random() * 0.05, sy: 0.041 + Math.random() * 0.05,
      px: Math.random() * 6.28, py: Math.random() * 6.28,
      rx: 0.06 + Math.random() * 0.06, ry: 0.10 + Math.random() * 0.09
    };
  }

  function spawnAt(c) {
    var a = Math.random() * 6.283, rr = Math.sqrt(Math.random());
    var d = Math.random() * 6.283;
    return {
      x: c.cx + Math.cos(a) * rr * c.r, y: c.cy + Math.sin(a) * rr * c.r * 0.7,
      vx: Math.cos(d) * MAXSPEED * 0.7, vy: Math.sin(d) * MAXSPEED * 0.7,
      z: 0.6 + Math.random() * 0.62, g: c.i, bank: 0, imp: 0, ix: 0, iy: 0,
      warm: Math.random() < 0.06
    };
  }

  function resize() {
    W = Math.max(320, innerWidth); H = Math.max(320, innerHeight);
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var nc = W < 900 ? 3 : W < 1500 ? 4 : 5;
    if (clusters.length !== nc) {
      clusters = [];
      for (var i = 0; i < nc; i++) { var c = makeCluster(i, nc); c.i = i; clusters.push(c); }
      boids = [];
    }
    moveAnchors();
    var want = Math.max(150, Math.min(430, Math.round(W * H / 4600)));
    while (boids.length > want) boids.pop();
    while (boids.length < want) boids.push(spawnAt(clusters[boids.length % clusters.length]));
  }

  function moveAnchors() {
    for (var i = 0; i < clusters.length; i++) {
      var c = clusters[i];
      c.r = Math.min(W, H) * 0.19;
      c.cx = W * (c.ax + c.rx * Math.sin(t * c.sx + c.px));
      c.cy = H * (c.ay + c.ry * Math.sin(t * c.sy + c.py));
      var mx = W * 0.10, my = H * 0.14;
      if (c.cx < mx) c.cx = mx; else if (c.cx > W - mx) c.cx = W - mx;
      if (c.cy < my) c.cy = my; else if (c.cy > H - my) c.cy = H - my;
    }
  }

  // --- uniform grid -------------------------------------------------------
  var gnx = 0, gny = 0, gcell = PERC, gstart = null, gsorted = null, gcount = null;
  function buildGrid() {
    gcell = PERC;
    gnx = Math.max(1, Math.ceil(W / gcell) + 2); gny = Math.max(1, Math.ceil(H / gcell) + 2);
    var cells = gnx * gny, n = boids.length;
    if (!gstart || gstart.length !== cells + 1) { gstart = new Int32Array(cells + 1); gcount = new Int32Array(cells); }
    else gcount.fill(0);
    if (!gsorted || gsorted.length !== n) gsorted = new Int32Array(n);
    var i, ci;
    for (i = 0; i < n; i++) { boids[i].c = cellOf(boids[i]); gcount[boids[i].c]++; }
    var acc = 0;
    for (ci = 0; ci < cells; ci++) { gstart[ci] = acc; acc += gcount[ci]; gcount[ci] = gstart[ci]; }
    gstart[cells] = acc;
    for (i = 0; i < n; i++) gsorted[gcount[boids[i].c]++] = i;
  }
  function cellOf(b) {
    var gx = Math.floor(b.x / gcell) + 1, gy = Math.floor(b.y / gcell) + 1;
    if (gx < 0) gx = 0; else if (gx >= gnx) gx = gnx - 1;
    if (gy < 0) gy = 0; else if (gy >= gny) gy = gny - 1;
    return gy * gnx + gx;
  }

  var S0 = 0, S1 = 0;
  function steer(dx, dy, vx, vy, force, w) {
    var d = Math.sqrt(dx * dx + dy * dy); if (d < 1e-6) return;
    var sx = dx / d * MAXSPEED - vx, sy = dy / d * MAXSPEED - vy;
    var m = Math.sqrt(sx * sx + sy * sy); if (m < 1e-6) return;
    if (m > force) { sx = sx / m * force; sy = sy / m * force; }
    S0 += sx * w; S1 += sy * w;
  }

  function step(dt) {
    t += dt; moveAnchors(); buildGrid();
    var n = boids.length, R2 = PERC * PERC, SEP2 = SEP * SEP;
    var cruiseSpeed = MAXSPEED * 0.78, decay = Math.pow(0.06, dt);

    // initiative: an edge bird now and then throws a sharp turn
    if (INITIATIVE > 0 && n > 0 && Math.random() < INITIATIVE * 1.6 * dt) {
      var best = -1, bd = -1;
      for (var q = 0; q < 12; q++) {
        var cand = boids[(Math.random() * n) | 0], cc = clusters[cand.g];
        var dd = (cand.x - cc.cx) * (cand.x - cc.cx) + (cand.y - cc.cy) * (cand.y - cc.cy);
        if (dd > bd) { bd = dd; best = cand; }
      }
      var ang = Math.atan2(best.vy, best.vx) + (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.8);
      best.ix = Math.cos(ang); best.iy = Math.sin(ang); best.imp = 0.45;
    }

    for (var i = 0; i < n; i++) {
      var b = boids[i], x = b.x, y = b.y, vx = b.vx, vy = b.vy;
      var sp = Math.sqrt(vx * vx + vy * vy) || 1e-6, ux = vx / sp, uy = vy / sp;
      var sx = 0, sy = 0, alx = 0, aly = 0, cxs = 0, cys = 0, wsum = 0, wsumC = 0, kn = 0;
      var gx = (b.c % gnx), gy = ((b.c / gnx) | 0);

      for (var oy = gy - 1; oy <= gy + 1; oy++) {
        if (oy < 0 || oy >= gny) continue;
        var row = oy * gnx, from = gstart[row + Math.max(0, gx - 1)], to = gstart[row + Math.min(gnx - 1, gx + 1) + 1];
        for (var s = from; s < to; s++) {
          var j = gsorted[s]; if (j === i) continue;
          var o = boids[j], ddx = o.x - x, ddy = o.y - y, d2 = ddx * ddx + ddy * ddy;
          if (d2 >= R2 || d2 < 1e-6) continue;
          var dot = ddx * ux + ddy * uy;
          if (!(dot >= 0 || dot * dot <= COS_FOV * COS_FOV * d2)) continue;   // 300 deg field of view
          if (d2 < SEP2) { var inv = 1 / d2; sx -= ddx * inv; sy -= ddy * inv; }
          cxs += o.x * 0.3; cys += o.y * 0.3; wsumC += 0.3;                    // weak long-range cohesion
          if (kn < K || d2 < kd2[kn - 1]) {                                    // keep the K nearest
            var m2 = kn < K ? kn : K - 1;
            while (m2 > 0 && kd2[m2 - 1] > d2) { kd2[m2] = kd2[m2 - 1]; kj[m2] = kj[m2 - 1]; m2--; }
            kd2[m2] = d2; kj[m2] = j; if (kn < K) kn++;
          }
        }
      }
      for (var m = 0; m < kn; m++) {
        var nb = boids[kj[m]], ta = 1 + STARTLE * nb.bank;
        alx += nb.vx * ta; aly += nb.vy * ta; cxs += nb.x; cys += nb.y; wsum += ta; wsumC += 1;
      }

      S0 = 0; S1 = 0;
      if (sx !== 0 || sy !== 0) steer(sx, sy, vx, vy, MAXFORCE, W_SEP);
      if (wsum > 0) steer(alx / wsum, aly / wsum, vx, vy, MAXFORCE, W_ALI);
      if (wsumC > 0) {
        var gxx = cxs / wsumC - x, gyy = cys / wsumC - y;
        var dl = Math.sqrt(gxx * gxx + gyy * gyy) / (SEP * 2.5);
        steer(gxx, gyy, vx, vy, MAXFORCE, W_COH * (dl > 1 ? 1 : dl));
      }
      var c = clusters[b.g], adx = c.cx - x, ady = c.cy - y;
      var ad = Math.sqrt(adx * adx + ady * ady) || 1, roostR = c.r * ROOST;
      var aw = (ad - roostR) / roostR; aw = aw < 0 ? 0 : aw > 1 ? 1 : aw;
      if (aw > 0) steer(adx, ady, vx, vy, MAXFORCE, ATTRACT * 1.2 * aw);

      if (b.imp > 0) { b.imp -= dt; S0 += b.ix * MAXFORCE * 2.2; S1 += b.iy * MAXFORCE * 2.2; }
      if (CRUISE > 0) { var dv = (cruiseSpeed - sp) * CRUISE * 3.4; S0 += ux * dv; S1 += uy * dv; }
      var jf = JITTER * MAXFORCE * 0.5;
      S0 += (Math.random() - 0.5) * jf; S1 += (Math.random() - 0.5) * jf;

      vx += S0 * dt; vy += S1 * dt;
      var ns = Math.sqrt(vx * vx + vy * vy) || 1e-6;
      var lo = MINSPEED * b.z, hi = MAXSPEED * b.z;
      if (ns < lo) { vx = vx / ns * lo; vy = vy / ns * lo; ns = lo; }
      else if (ns > hi) { vx = vx / ns * hi; vy = vy / ns * hi; ns = hi; }
      var turn = Math.abs(ux * (vy / ns) - uy * (vx / ns)) / (0.9 * dt);
      var dec = b.bank * decay; b.bank = turn > dec ? (turn > 1 ? 1 : turn) : dec;

      b.vx = vx; b.vy = vy; b.x = x + vx * dt; b.y = y + vy * dt;
      if (b.x < -60) b.x = W + 60; else if (b.x > W + 60) b.x = -60;
      if (b.y < -60) b.y = H + 60; else if (b.y > H + 60) b.y = -60;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < boids.length; i++) {
      var b = boids[i];
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1e-6;
      var ux = b.vx / sp, uy = b.vy / sp;
      var len = 8.2 * b.z, wid = 3.0 * b.z;
      var rgb = b.warm ? WARM : ACCENT;
      var alpha = (b.warm ? 0.62 : 0.52) * (0.4 + b.z * 0.6);

      ctx.strokeStyle = 'rgba(' + rgb + ',' + (alpha * 0.3).toFixed(3) + ')';
      ctx.lineWidth = wid * 0.6;
      ctx.beginPath();
      ctx.moveTo(b.x - ux * len * 3.0, b.y - uy * len * 3.0);
      ctx.lineTo(b.x - ux * len, b.y - uy * len);
      ctx.stroke();

      ctx.fillStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(b.x + ux * len, b.y + uy * len);
      ctx.lineTo(b.x - ux * len * 0.8 - uy * wid, b.y - uy * len * 0.8 + ux * wid);
      ctx.lineTo(b.x - ux * len * 0.3, b.y - uy * len * 0.3);
      ctx.lineTo(b.x - ux * len * 0.8 + uy * wid, b.y - uy * len * 0.8 - ux * wid);
      ctx.closePath();
      ctx.fill();
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.045, (now - last) / 1000 || 0.016);
    last = now; step(dt); draw();
    requestAnimationFrame(frame);
  }
  function start() { if (running || REDUCED || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }

  resize();
  for (var w = 0; w < 120; w++) step(1 / 30);
  draw();
  window.__flock = { boids: boids, clusters: clusters, isRunning: function () { return running; } };
  if (REDUCED) return;
  addEventListener('resize', function () { resize(); }, { passive: true });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  start();
})();
