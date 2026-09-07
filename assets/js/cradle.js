/* SimLearn hero widget: an interactive Newton's cradle.
   Five equal pendulums hung so that they just touch at rest. Each is integrated as a
   real pendulum (theta'' = -(g/L) sin theta); contacts between neighbours are resolved
   as elastic collisions between equal masses, which is why momentum walks through the
   line and only the far ball leaves. Drag any ball to lift it (and everything outboard
   of it, so you can launch two or three at once) and let go. */
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
  var th = [], om = [], grabbed = -1, grabSet = [];
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  function bx(i) { return px[i] + L * Math.sin(th[i]); }
  function by(i) { return PIVY + L * Math.cos(th[i]); }

  function step(dt) {
    var k = G / L;
    for (var i = 0; i < N; i++) {
      if (grabbed >= 0 && grabSet.indexOf(i) >= 0) { om[i] = 0; continue; }
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
        var va = om[j] * Math.cos(th[j]), vb = om[j + 1] * Math.cos(th[j + 1]);
        if (vb < va) {            // approaching: equal masses swap velocity
          var na = vb * REST, nb = va * REST;
          om[j] = na / Math.max(0.2, Math.cos(th[j]));
          om[j + 1] = nb / Math.max(0.2, Math.cos(th[j + 1]));
        }
        var pen = (2 * R - gap) / 2 / L;   // share the overlap, in radians
        th[j] -= pen; th[j + 1] += pen;
      }
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
  function setDrag(p) {
    var a = Math.atan2(p.x - px[grabbed], Math.max(12, p.y - PIVY));
    a = Math.max(-MAXA, Math.min(MAXA, a));
    if (grabSet.length > 1) a = (grabbed < N / 2) ? Math.min(a, 0) : Math.max(a, 0);
    for (var i = 0; i < grabSet.length; i++) { th[grabSet[i]] = a; om[grabSet[i]] = 0; }
  }
  cv.addEventListener('pointerdown', function (e) {
    var p = local(e), i = pick(p);
    if (i < 0) return;
    grabbed = i; grabSet = [];
    if (i < N / 2) { for (var j = 0; j <= i; j++) grabSet.push(j); }
    else { for (var k = i; k < N; k++) grabSet.push(k); }
    cv.setPointerCapture(e.pointerId);
    setDrag(p); e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (grabbed < 0) return;
    setDrag(local(e)); e.preventDefault();
  });
  function release() { grabbed = -1; grabSet = []; }
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('lostpointercapture', release);

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
