/* SimLearn hero slogan: the letters follow the cursor.
   Every letter and full stop is a little spring. The pointer's horizontal distance to a
   glyph sets that glyph's target lift, scale and glow, so the crest of the wave sits
   under the cursor and travels back and forth with it rather than running one canned
   pass. Full stops are bouncier: passing over one kicks it into the air.
   Touch devices keep the CSS wave (body gets .slogan-js only when a fine pointer and
   hover are available), and reduced-motion users get nothing at all. */
(function () {
  var h1 = document.querySelector('.hero h1');
  if (!h1) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  document.body.classList.add('slogan-js');

  var glyphs = [].slice.call(h1.querySelectorAll('.l,.dot')).map(function (el) {
    return { el: el, dot: el.classList.contains('dot'), cx: 0, cy: 0, y: 0, v: 0, g: 0, kick: 0 };
  });
  if (!glyphs.length) return;

  var R = 150;            // px of influence either side of the cursor
  var LIFT = 13;          // px a letter rises directly under the cursor
  var DOTLIFT = 26;       // full stops jump about twice as far
  var K = 0.24, D = 0.74; // spring stiffness and damping, per frame at 60Hz
  var mx = -1e5, my = -1e5, inside = false, running = false, idle = 0;

  function measure() {
    var hr = h1.getBoundingClientRect();
    for (var i = 0; i < glyphs.length; i++) {
      var r = glyphs[i].el.getBoundingClientRect();
      glyphs[i].cx = r.left + r.width / 2 - hr.left;
      glyphs[i].cy = r.top + r.height / 2 - hr.top;
      glyphs[i].w = r.width;
    }
    box = hr;
  }
  var box = null;

  function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

  function frame() {
    var moving = false;
    for (var i = 0; i < glyphs.length; i++) {
      var s = glyphs[i], t = 0;
      if (inside) {
        var dx = Math.abs(mx - s.cx), dy = Math.abs(my - s.cy);
        var d = Math.sqrt(dx * dx + dy * dy * 0.55);
        if (d < R) { var u = 1 - d / R; t = u * u * (3 - 2 * u); }   // smoothstep falloff
      }
      // full stops get a discrete kick the moment the cursor crosses them
      if (s.dot) {
        var over = inside && Math.abs(mx - s.cx) < Math.max(16, s.w * 1.6) && Math.abs(my - s.cy) < 44;
        if (over && !s.was) { s.v -= 1.15; }
        s.was = over;
        t *= 1.0;
      }
      var target = -(s.dot ? DOTLIFT : LIFT) * t;
      s.v += (target - s.y) * K;
      s.v *= D;
      s.y += s.v;
      s.g += (t - s.g) * 0.3;
      if (Math.abs(s.y) > 0.05 || Math.abs(s.v) > 0.05 || s.g > 0.01) moving = true;
      var lift = s.y;
      var sc = 1 + Math.min(0.16, Math.abs(lift) / 150);
      var sq = s.dot ? (1 + Math.max(0, -lift) * 0.004) : 1;
      s.el.style.transform = 'translate3d(0,' + lift.toFixed(2) + 'px,0) scale(' + (sc * sq).toFixed(3) + ',' + (sc / sq).toFixed(3) + ')';
      s.el.style.filter = s.g > 0.012
        ? 'drop-shadow(0 0 ' + (12 * s.g).toFixed(1) + 'px rgba(86,224,194,' + (0.85 * s.g).toFixed(2) + '))'
        : '';
    }
    if (moving || inside) { idle = 0; requestAnimationFrame(frame); }
    else if (++idle < 8) { requestAnimationFrame(frame); }
    else { running = false; for (var j = 0; j < glyphs.length; j++) { glyphs[j].el.style.transform = ''; glyphs[j].el.style.filter = ''; } }
  }

  // A generous hit area: the pointer is tracked over the whole hero, so the wave leans
  // toward the cursor before it reaches the text and follows it out again.
  var zone = h1.closest('.hero') || h1;
  zone.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    if (!box) measure();
    mx = e.clientX - box.left; my = e.clientY - box.top;
    inside = true; start();
  }, { passive: true });
  zone.addEventListener('pointerleave', function () { inside = false; start(); }, { passive: true });
  window.addEventListener('scroll', function () { box = null; if (inside) { inside = false; start(); } }, { passive: true });
  window.addEventListener('resize', function () { box = null; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { box = null; });
})();
