/* SimLearn shared mobile layer.
   1. Gives the sim control panel a bottom-sheet handle on small screens, unless the
      sim already ships its own toggle.
   2. Mirrors the panel's open state onto <body class="sheet-open"> so CSS can move
      the readouts and floating tools out of the sheet's way.
   3. Lets the sheet be opened and closed by SWIPE as well as by tap.
   Harmless on desktop. */
(function () {
  var panel = null, toggle = null;

  function isOpen() { return !!(panel && panel.classList.contains('open')); }

  function setBody() {
    document.body.classList.toggle('sheet-open', isOpen());
  }

  /* Prefer the sim's own toggle so its bookkeeping (labels, aria) still runs. */
  function fire(open) {
    if (open === isOpen()) return;
    if (toggle) { toggle.click(); }
    else { panel.classList.toggle('open', open); }
    setBody();
  }

  function init() {
    panel = document.querySelector('.panel');
    if (!panel) return;
    toggle = panel.querySelector('.p-toggle') || document.getElementById('btnPanel') ||
             document.querySelector('[data-panel-toggle]');
    if (!toggle) {
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'p-toggle';
      t.id = 'p-toggle';
      t.setAttribute('aria-expanded', 'false');
      t.setAttribute('aria-controls', panel.id || 'panel');
      t.textContent = 'Controls';
      panel.insertBefore(t, panel.firstChild);
      t.addEventListener('click', function () {
        var open = panel.classList.toggle('open');
        t.setAttribute('aria-expanded', open ? 'true' : 'false');
        t.textContent = open ? 'Hide controls' : 'Controls';
        if (open) panel.scrollTop = 0;
        setBody();
      });
      toggle = t;
    }

    /* whoever flips .open, the body class follows */
    new MutationObserver(setBody).observe(panel, { attributes: true, attributeFilter: ['class'] });
    setBody();

    /* ---- swipe ---- */
    var y0 = 0, x0 = 0, t0 = 0, live = false, fromEdge = false;
    function start(e) {
      var t = e.touches ? e.touches[0] : e;
      y0 = t.clientY; x0 = t.clientX; t0 = Date.now();
      var bottomStrip = y0 > window.innerHeight - 72;
      var inPanel = panel.contains(e.target);
      if (e.target.closest && e.target.closest('input,select,textarea,dialog')) { live = false; return; }
      if (!isOpen()) { live = bottomStrip; fromEdge = true; }
      else { live = inPanel && panel.scrollTop <= 2; fromEdge = false; }
    }
    function end(e) {
      if (!live) return;
      live = false;
      var t = (e.changedTouches ? e.changedTouches[0] : e);
      var dy = t.clientY - y0, dx = t.clientX - x0, dt = Date.now() - t0;
      if (dt > 700) return;
      if (Math.abs(dx) > Math.abs(dy) * 0.8) return;
      if (fromEdge && dy < -45) fire(true);
      else if (!fromEdge && dy > 55) fire(false);
    }
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
