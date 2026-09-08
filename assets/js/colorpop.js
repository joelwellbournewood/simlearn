/* SimLearn shared colour picker. Replaces the operating system's colour dialog with a
   small glass popover in the page: curated swatches plus hue, saturation and lightness,
   in the sim's own palette. It upgrades every <input type="color"> in place and writes
   back through that element's value, so the simulation's own listeners are untouched. */
(function () {
  if (window.__colorPop) return;
  window.__colorPop = true;

  var CSS = ''
    + '.cp-sw{-webkit-appearance:none;appearance:none;width:26px;height:22px;flex:none;padding:0;cursor:pointer;'
    + 'border:1px solid var(--line-strong,rgba(255,255,255,.24));border-radius:7px;'
    + 'box-shadow:inset 0 0 0 1px rgba(0,0,0,.35);transition:transform .12s,border-color .18s}'
    + '.cp-sw:hover{transform:translateY(-1px);border-color:var(--accent,#56e0c2)}'
    + '.cp-sw[aria-expanded="true"]{border-color:var(--accent,#56e0c2)}'
    + '.cp-pop{position:fixed;z-index:9999;width:236px;padding:12px;border-radius:14px;'
    + 'border:1px solid var(--line-strong,rgba(255,255,255,.2));'
    + 'background:var(--panel-solid,var(--panel,#0f1f1a));'
    + 'box-shadow:0 18px 44px rgba(0,0,0,.55);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);'
    + 'font-family:var(--body,var(--ui,system-ui));color:var(--text,var(--ink,#e3efe9));font-size:12px}'
    + '.cp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}'
    + '.cp-head b{font-weight:600;font-size:12px;letter-spacing:.01em}'
    + '.cp-hex{font-family:var(--mono,ui-monospace,monospace);font-size:11px;color:var(--muted,#88a397)}'
    + '.cp-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;margin-bottom:11px}'
    + '.cp-grid button{width:100%;aspect-ratio:1;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:0;cursor:pointer}'
    + '.cp-grid button:hover{border-color:#fff}'
    + '.cp-grid button[aria-pressed="true"]{box-shadow:0 0 0 2px var(--accent,#56e0c2)}'
    + '.cp-row{display:flex;align-items:center;gap:8px;margin-top:7px}'
    + '.cp-row i{font-style:normal;width:9px;color:var(--muted,#88a397);font-family:var(--mono,monospace);font-size:10.5px}'
    + '.cp-r{-webkit-appearance:none;appearance:none;flex:1;height:12px;border-radius:7px;background:#222;'
    + 'border:1px solid rgba(255,255,255,.12);outline:none;padding:0;margin:0}'
    + '.cp-r::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;'
    + 'background:#fff;border:1px solid rgba(0,0,0,.5);box-shadow:0 1px 4px rgba(0,0,0,.5);cursor:pointer}'
    + '.cp-r::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:#fff;border:1px solid rgba(0,0,0,.5);cursor:pointer}'
    + '.cp-foot{display:flex;justify-content:space-between;align-items:center;margin-top:11px}'
    + '.cp-foot button{background:transparent;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:999px;'
    + 'padding:4px 11px;color:var(--muted,#88a397);font-size:11.5px;cursor:pointer;font-family:inherit}'
    + '.cp-foot button:hover{color:var(--text,#e3efe9);border-color:var(--line-strong,rgba(255,255,255,.24))}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  var SWATCHES = ['#f4f7f5', '#a8bdb4', '#56e0c2', '#3fbf9a', '#8bd45f', '#34905c', '#1c6b4a', '#0d3b2c',
                  '#ffd166', '#f4a23b', '#ff7d5c', '#e0483f', '#d46ac8', '#8b6cf0', '#4f8cff', '#0a1512'];

  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(c) { return '#' + c.map(function (v) { v = Math.round(Math.max(0, Math.min(255, v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0, s = 0, l = (mx + mn) / 2;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = 60 * (((g - b) / d) % 6);
      else if (mx === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return [h, s * 100, l * 100];
  }
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    return rgb2hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
  }

  var pop = null, current = null;

  function close() {
    if (pop) { pop.remove(); pop = null; }
    if (current) { current.btn.setAttribute('aria-expanded', 'false'); current = null; }
  }
  document.addEventListener('pointerdown', function (e) {
    if (!pop) return;
    if (pop.contains(e.target) || (current && current.btn === e.target)) return;
    close();
  }, true);
  document.addEventListener('keydown', function (e) { if (pop && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);

  function open(rec) {
    var wasSame = current && current.btn === rec.btn;
    close();
    if (wasSame) return;
    current = rec;
    rec.btn.setAttribute('aria-expanded', 'true');
    var start = (rec.input.value || '#ffffff').toLowerCase();
    var hsl = rgb2hsl.apply(null, hex2rgb(start));
    pop = document.createElement('div');
    pop.className = 'cp-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', rec.name + ' colour');
    pop.innerHTML = '<div class="cp-head"><b></b><span class="cp-hex"></span></div>'
      + '<div class="cp-grid"></div>'
      + '<div class="cp-row"><i>H</i><input class="cp-r" data-k="h" type="range" min="0" max="360" step="1" aria-label="Hue"></div>'
      + '<div class="cp-row"><i>S</i><input class="cp-r" data-k="s" type="range" min="0" max="100" step="1" aria-label="Saturation"></div>'
      + '<div class="cp-row"><i>L</i><input class="cp-r" data-k="l" type="range" min="0" max="100" step="1" aria-label="Lightness"></div>'
      + '<div class="cp-foot"><button type="button" data-a="reset">Undo</button><button type="button" data-a="done">Done</button></div>';
    pop.querySelector('b').textContent = rec.name;
    var grid = pop.querySelector('.cp-grid');
    SWATCHES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.style.background = c; b.title = c;
      b.setAttribute('aria-label', c); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { hsl = rgb2hsl.apply(null, hex2rgb(c)); paint(true); });
      grid.appendChild(b);
    });
    var sliders = {};
    pop.querySelectorAll('.cp-r').forEach(function (r) {
      sliders[r.dataset.k] = r;
      r.addEventListener('input', function () { hsl = [+sliders.h.value, +sliders.s.value, +sliders.l.value]; paint(true); });
    });
    pop.querySelector('[data-a="done"]').addEventListener('click', close);
    pop.querySelector('[data-a="reset"]').addEventListener('click', function () { hsl = rgb2hsl.apply(null, hex2rgb(start)); paint(true); });
    document.body.appendChild(pop);

    function paint(emit) {
      var hx = hsl2hex(hsl[0], hsl[1], hsl[2]);
      sliders.h.value = Math.round(hsl[0]); sliders.s.value = Math.round(hsl[1]); sliders.l.value = Math.round(hsl[2]);
      sliders.h.style.background = 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';
      sliders.s.style.background = 'linear-gradient(90deg,' + hsl2hex(hsl[0], 0, hsl[2]) + ',' + hsl2hex(hsl[0], 100, hsl[2]) + ')';
      sliders.l.style.background = 'linear-gradient(90deg,#000,' + hsl2hex(hsl[0], hsl[1], 50) + ',#fff)';
      pop.querySelector('.cp-hex').textContent = hx.toUpperCase();
      grid.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.title === hx)); });
      if (emit) {
        rec.input.value = hx;
        rec.input.dispatchEvent(new Event('input', { bubbles: true }));
        rec.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    paint(false);

    var r = rec.btn.getBoundingClientRect();
    var w = 236, h = pop.offsetHeight || 250;
    var left = Math.min(window.innerWidth - w - 10, Math.max(10, r.right - w));
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 8);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }

  function upgrade(input) {
    if (input.dataset.cp) return;
    input.dataset.cp = '1';
    var name = (input.getAttribute('aria-label') || input.name || 'Colour').replace(/\s*colour$/i, '');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cp-sw';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', name + ' colour');
    btn.title = name + ' colour';
    input.insertAdjacentElement('afterend', btn);
    /* the native input stays in the document as the value carrier, so every listener the
       simulation attached still fires, but it is no longer a control anyone can click */
    input.type = 'text';
    input.hidden = true; input.tabIndex = -1; input.setAttribute('aria-hidden', 'true');
    var rec = { input: input, btn: btn, name: name };
    function reflect() { btn.style.background = input.value || '#000'; }
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      get: function () { return d.get.call(input); },
      set: function (v) { d.set.call(input, v); reflect(); }
    });
    reflect();
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(rec); });
    window.addEventListener('resize', function () { if (current === rec) close(); });
  }

  function scan() { document.querySelectorAll('input[type="color"]').forEach(upgrade); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  window.__cpScan = scan;
})();
