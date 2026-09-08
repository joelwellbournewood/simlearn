/* SimLearn hero widget: an interactive Newton's cradle.
   Five equal pendulums hung so that they just touch at rest. Each is integrated as a
   real pendulum (theta'' = -(g/L) sin theta); contacts between neighbours are resolved
   as elastic collisions between equal masses, which is why momentum walks through the
   line and only the far ball leaves. Any ball can be dragged either way: the balls
   between it and that side are touching it, so they are pushed along with it, which is
   how you launch two or three at once. Let go and they swing; flick and they are thrown. */
(function () {
  var host = document.getElementById('cradle');
  if (!host) return;
  var cv = host.querySelector('canvas');
  var ctx = cv.getContext('2d');

  var N = 5, R = 10, L = 84, PIVY = 20;
  var G = 1500;                 // px/s^2, tuned for a lively swing at L=100
  var DAMP = 0.9993;            // per 1/240 s step
  var REST = 0.995;             // restitution between balls
  var MAXA = 1.05;              // largest lift angle, radians
  var W = 0, H = 0, cx = 0, px = [];
  var MAXOM = 3.2;              // largest angular velocity a flick can impart, rad/s
  var HELDREST = 0.45;          // bounce off a ball that a finger is holding still
  var th = [], om = [], grabbed = -1, held = [], fling = 0, flingT = 0, lastA = 0;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__cradleBuild = '20260908e';   // which copy of this file the browser is running

  for (var i = 0; i < N; i++) { th[i] = 0; om[i] = 0; }
  th[0] = -0.85;                // start with one ball lifted so it is moving on load

  var BARW = 2 * R * N + 30;          // width of the drawn top bar
  var PAD = R + Math.ceil(L * Math.sin(MAXA)) + 2;   // swing clearance either side of it
  var phone = function () {
    return window.matchMedia && window.matchMedia('(max-width:820px) and (orientation:portrait)').matches;
  };

  /* Where the art sits inside the canvas. The canvas has to be wide enough for a ball
     at full lift, so the bar is never at its edge; --cradle-shift (CSS) slides the whole
     linkage sideways within that box. On a portrait phone the placement is measured
     instead: the bar is dropped into the empty space to the right of the last word of
     the slogan, level with it. */
  function place() {
    var shift = parseFloat(getComputedStyle(host).getPropertyValue('--cradle-shift'));
    cx = W / 2 + (isNaN(shift) ? 0 : shift);
    if (phone()) {
      var word = document.querySelector('.hero h1 .w:last-child');
      if (word) {
        host.style.marginTop = '0px';
        var wr = word.getBoundingClientRect(), cr = cv.getBoundingClientRect();
        var wantBarY = wr.top + wr.height * 0.5;
        host.style.marginTop = Math.round(wantBarY - PIVY - cr.top) + 'px';
        /* the "Interactive Models" line now sits under that last word, inside the band
           the hanging balls occupy, so the linkage clears whichever of the two is wider */
        var right = wr.right, sub = document.querySelector('.hero-sub');
        if (sub) right = Math.max(right, sub.getBoundingClientRect().right);
        cx = (right + 18 - cr.left) + BARW / 2;
      }
    } else {
      host.style.marginTop = '';
    }
    /* On a narrow portrait phone there is not enough room to keep full swing clearance
       on the right and still clear the last word, so the right margin is allowed to be
       tighter: a ball only reaches it when dragged to full lift. */
    var padR = phone() ? 40 : PAD;
    cx = Math.max(BARW / 2 + PAD, Math.min(W - BARW / 2 - padR, Math.round(cx)));
    if (cx < BARW / 2 + PAD) cx = BARW / 2 + PAD;
    for (var i = 0; i < N; i++) px[i] = cx + (i - (N - 1) / 2) * 2 * R;
  }

  function resize() {
    W = Math.max(240, Math.round(host.clientWidth));
    H = 124;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    place();
  }
  window.__cradle = function () {
    var r = cv.getBoundingClientRect();
    return { canvas: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) },
             barLeft: Math.round(r.left + cx - BARW / 2), barRight: Math.round(r.left + cx + BARW / 2),
             barY: Math.round(r.top + PIVY), cx: cx, pad: PAD };
  };

  /* test surface: lets the headless physics checks read the state they are asserting on */
  window.__cradleState = function (next) {
    if (next && next.th) {
      for (var q = 0; q < N; q++) {
        th[q] = next.th[q] || 0;
        om[q] = (next.om && next.om[q]) || 0;
      }
      grabbed = -1; held = [];
    }
    return { build: window.__cradleBuild, reach: reach(),
             th: th.slice(), om: om.slice(), px: px.slice(), held: held.slice(),
             grabbed: grabbed, R: R, L: L, PIVY: PIVY, W: W, H: H };
  };

  function bx(i) { return px[i] + L * Math.sin(th[i]); }
  function by(i) { return PIVY + L * Math.cos(th[i]); }

  function step(dt) {
    var k = G / L;
    for (var i = 0; i < N; i++) {
      if (isHeld(i)) { om[i] = 0; continue; }
      om[i] += -k * Math.sin(th[i]) * dt;
      om[i] *= DAMP;
      th[i] += om[i] * dt;
      if (th[i] > MAXA) { th[i] = MAXA; om[i] = 0; }
      if (th[i] < -MAXA) { th[i] = -MAXA; om[i] = 0; }
    }
    for (var pass = 0; pass < 3; pass++) {
      for (var j = 0; j < N - 1; j++) {
        var gap = bx(j + 1) - bx(j);
        if (gap >= 2 * R) continue;
        var ha = isHeld(j), hb = isHeld(j + 1);
        if (ha && hb) continue;            // both pinned by the pointer: nothing to resolve
        var va = om[j] * Math.cos(th[j]), vb = om[j + 1] * Math.cos(th[j + 1]);
        if (vb < va) {
          if (ha || hb) {
            /* a held ball is effectively infinitely massive, so the free one rebounds
               off it rather than handing its momentum to a finger */
            var f = ha ? j + 1 : j;
            om[f] = -om[f] * HELDREST;
          } else {                         // approaching: equal masses swap velocity
            var na = vb * REST, nb = va * REST;
            om[j] = na / Math.max(0.2, Math.cos(th[j]));
            om[j + 1] = nb / Math.max(0.2, Math.cos(th[j + 1]));
          }
        }
        var pen = (2 * R - gap) / L;       // the overlap, in radians
        if (ha) { th[j + 1] += pen; }      // held balls do not give ground
        else if (hb) { th[j] -= pen; }
        else { th[j] -= pen / 2; th[j + 1] += pen / 2; }
      }
    }
    /* contacts can shove a ball past the lift clamp; keep it inside the drawn box */
    for (var m = 0; m < N; m++) {
      if (isHeld(m)) continue;
      if (th[m] > MAXA) { th[m] = MAXA; if (om[m] > 0) om[m] = 0; }
      if (th[m] < -MAXA) { th[m] = -MAXA; if (om[m] < 0) om[m] = 0; }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var barW = BARW, bx0 = cx - barW / 2;

    // one horizontal bar, nothing else
    ctx.strokeStyle = 'rgba(163,188,190,.40)';
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx0, PIVY); ctx.lineTo(bx0 + barW, PIVY);
    ctx.stroke();

    // strings: one line per ball
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < N; i++) { ctx.moveTo(px[i], PIVY); ctx.lineTo(bx(i), by(i)); }
    ctx.stroke();

    // balls: a single merged path so touching circles leave no seam between them
    ctx.fillStyle = '#9fd8cd';
    ctx.beginPath();
    for (var j = 0; j < N; j++) {
      ctx.moveTo(bx(j) + R, by(j));
      ctx.arc(bx(j), by(j), R, 0, 6.2832);
    }
    ctx.fill();
  }

  // ---- pointer input ------------------------------------------------------
  function local(e) {
    var r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function pick(p) {
    var best = -1, bd = 26 * 26;
    for (var i = 0; i < N; i++) {
      var dx = p.x - bx(i), dy = p.y - by(i), d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function isHeld(i) { return grabbed >= 0 && held.indexOf(i) >= 0; }

  /* How far the grabbed ball may be lifted before the outermost ball of the line it is
     pushing would be drawn off the edge of the canvas. */
  function limitFor(sign) {
    var edge = sign > 0 ? (W - R - 2 - px[N - 1]) : (px[0] - R - 2);
    var s = Math.min(1, Math.max(0, edge) / L);
    return Math.min(MAXA, Math.asin(s));
  }
  /* The reach is deliberately the same on both sides. If the canvas is narrower on one
     side than the other, the tighter side sets the reach for both, so no ball can ever
     travel further one way than the other. */
  function reach() { return Math.min(limitFor(1), limitFor(-1)); }

  /* The pointer sets the angle of the ball it grabbed. Every ball between that one and
     the side it is moving towards is in contact with it, so it is carried along at the
     same angle: pivots are spaced one ball diameter apart, so equal angles is exactly
     touching. The chain stops at the first neighbour already hanging further out, which
     is why dragging back the other way simply lets the carried balls fall and collide. */
  function setDrag(p) {
    var a = Math.atan2(p.x - px[grabbed], Math.max(12, p.y - PIVY));
    var lim = reach();
    a = Math.max(-lim, Math.min(lim, a));
    th[grabbed] = a; om[grabbed] = 0;
    held = [grabbed];
    var j;
    for (j = grabbed - 1; j >= 0; j--) {
      if (th[j] <= a) break;              // already further left: not being pushed
      th[j] = a; om[j] = 0; held.push(j);
    }
    for (j = grabbed + 1; j < N; j++) {
      if (th[j] >= a) break;              // already further right: not being pushed
      th[j] = a; om[j] = 0; held.push(j);
    }
  }
  /* Angular velocity of the pointer, smoothed, so a flick throws the ball instead of
     dropping it from wherever the finger stopped. */
  function track(a, t) {
    var dt = (t - flingT) / 1000;
    if (dt > 0.004 && dt < 0.2) fling = fling * 0.55 + ((a - lastA) / dt) * 0.45;
    else if (dt >= 0.2) fling = 0;
    lastA = a; flingT = t;
  }
  /* The drag is tracked on the window, not on the canvas. The canvas is only 124px tall,
     so a natural gesture leaves it almost immediately, and setPointerCapture is not
     dependable everywhere (WebKit in particular). Window listeners mean the gesture
     survives whether capture worked or not, and they are removed on release. */
  function onMove(e) {
    if (grabbed < 0) return;
    cv.style.cursor = 'grabbing';
    setDrag(local(e));
    track(th[grabbed], e.timeStamp || performance.now());
    if (e.cancelable) e.preventDefault();
  }
  function release() {
    if (grabbed < 0) return;
    var now = performance.now();
    /* a finger that has been still for a moment is a lift, not a throw */
    var v = (now - flingT > 120) ? 0 : Math.max(-MAXOM, Math.min(MAXOM, fling));
    /* A throw may not add more energy than a full lift is worth, so the ball always
       arrives at the far side inside the swing clearance instead of hitting the clamp
       and stopping dead at the top of its arc. */
    var top = reach();
    var cap = Math.sqrt(Math.max(0, 2 * (G / L) * (Math.cos(th[grabbed]) - Math.cos(top))));
    v = Math.max(-cap, Math.min(cap, v));
    /* Only a flick that continues outwards is a throw. A finger dragging back towards
       the middle has already let the pushed balls go, and they are falling on their own. */
    for (var i = 0; i < held.length; i++) om[held[i]] = v;
    grabbed = -1; held = []; fling = 0;
    cv.style.cursor = 'grab';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
    window.removeEventListener('blur', release);
  }
  cv.addEventListener('pointerdown', function (e) {
    var p = local(e), i = pick(p);
    if (i < 0) return;
    grabbed = i; held = [i]; fling = 0;
    lastA = th[i]; flingT = e.timeStamp || performance.now();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* capture is a bonus, not a need */ }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    setDrag(p); e.preventDefault();
  });
  /* hover: the canvas is much wider than the linkage, so only show the grab cursor when
     the pointer is actually over a ball */
  cv.addEventListener('pointermove', function (e) {
    if (grabbed >= 0) return;
    cv.style.cursor = pick(local(e)) >= 0 ? 'grab' : 'default';
  });
  cv.addEventListener('pointerleave', function () { if (grabbed < 0) cv.style.cursor = 'default'; });

  // ---- loop ---------------------------------------------------------------
  var last = 0, visible = true;
  function frame(t) {
    if (!last) last = t;
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (visible && !document.hidden) {
      var n = Math.max(1, Math.round(dt * 240));
      for (var s = 0; s < n; s++) step(dt / n);
      draw();
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', function () { resize(); draw(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { resize(); draw(); }, 60); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); draw(); });
  /* The slogan words start 0.36em low under their intro animation, so a placement
     measured at load would be that much out. Re-measure once they have landed. */
  var lastWord = document.querySelector('.hero h1 .w:last-child');
  if (lastWord) lastWord.addEventListener('animationend', function () { resize(); draw(); });
  setTimeout(function () { resize(); draw(); }, 1200);
  resize();
  if (reduced) { draw(); }
  else {
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(host);
    }
    requestAnimationFrame(frame);
  }
})();
