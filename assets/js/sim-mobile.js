/* SimLearn shared mobile layer. Adds a bottom-sheet handle to the sim control
   panel on small screens, unless the sim already ships one. Harmless on desktop. */
(function () {
  function init() {
    var p = document.querySelector('.panel');
    if (!p) return;
    if (p.querySelector('.p-toggle')) return;   /* sim wires its own */
    var t = document.createElement('button');
    t.type = 'button';
    t.className = 'p-toggle';
    t.id = 'p-toggle';
    t.setAttribute('aria-expanded', 'false');
    t.setAttribute('aria-controls', p.id || 'panel');
    t.textContent = 'Controls';
    p.insertBefore(t, p.firstChild);
    t.addEventListener('click', function () {
      var open = p.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.textContent = open ? 'Hide controls' : 'Controls';
      if (open) p.scrollTop = 0;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
