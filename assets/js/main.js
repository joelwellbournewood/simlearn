/* SimLearn homepage. Card art is generated line-art: some glyphs are drawn from the
   real equations of the model they illustrate (Lorenz, predator-prey, kinetics). */
const W = 280, H = 128, CX = 140, CY = 64;
const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
const sample = (f, a, b, n) => { const o = []; for (let i = 0; i <= n; i++) o.push(f(a + (b - a) * i / n)); return o; };
const dot = (x, y, r, cls) => `<circle class="${cls || 'fillA'}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/>`;

function fit(pts, x0, x1, y0, y1) {
  let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
  for (const p of pts) { ax = Math.min(ax, p[0]); bx = Math.max(bx, p[0]); ay = Math.min(ay, p[1]); by = Math.max(by, p[1]); }
  const s = Math.min((x1 - x0) / (bx - ax || 1), (y1 - y0) / (by - ay || 1));
  const ox = (x0 + x1) / 2 - s * (ax + bx) / 2, oy = (y0 + y1) / 2 - s * (ay + by) / 2;
  return pts.map(p => [p[0] * s + ox, p[1] * s + oy]);
}

const GLYPH = {
  boids() {
    const bird = (x, y, k) => `<path class="${k}" d="M${x} ${y} l15 6.5 l-15 6.5 l4.6-6.5z"/>`;
    const streak = (x, y, l) => `<path class="soft" d="M${x - l} ${y + 6.5} h${l - 4}"/>`;
    const P = [[198, 54], [163, 34], [163, 76], [128, 18], [128, 92], [93, 44], [93, 66]];
    return `<g class="g-drift">${P.map((p, i) => streak(p[0], p[1], 20 + (i % 3) * 9)).join('')}
      ${P.map((p, i) => bird(p[0], p[1], i === 0 ? 'fill2' : 'fillA')).join('')}</g>`;
  },
  'predator-prey'() {
    const hare = sample(t => [t, CY - 26 * Math.sin((t - 26) / 100 * Math.PI * 2)], 26, 254, 70);
    const lynx = sample(t => [t, CY - 15 * Math.sin((t - 26) / 100 * Math.PI * 2 - 1.5)], 26, 254, 70);
    return `<path d="${path(hare)}"/><path class="accent2" d="${path(lynx)}"/>
      <path class="soft" d="M26 ${CY} H254" stroke-dasharray="2 5"/>`;
  },
  'double-pendulum'() {
    const tr = sample(t => [CX + 72 * Math.sin(3 * t) * Math.cos(t * .5), 54 + 38 * Math.sin(2 * t)], 0, Math.PI * 4, 220);
    return `<path class="soft" d="${path(tr)}"/>
      <path d="M140 14 L196 58 L158 110"/>${dot(140, 14, 3.4)}${dot(196, 58, 3.2)}
      <circle class="fill2" cx="158" cy="110" r="5.4"/>`;
  },
  'optics-lens'() {
    const rays = [-26, 0, 26].map(dy =>
      `<path class="${dy ? 'soft' : ''}" d="M62 ${64 + dy * .55} L140 ${64 + dy} L216 64"/>`).join('');
    return `<path class="soft" d="M40 64 H244" stroke-dasharray="2 5"/>
      <path d="M140 26 C160 44 160 84 140 102 C120 84 120 44 140 26z" opacity=".9"/>
      ${rays}<path class="accent2" d="M62 64 V36 M56 43 l6-7 6 7"/>${dot(216, 64, 3.4, 'fill2')}`;
  },
  epidemic() {
    const N = [[70, 40], [110, 78], [150, 34], [190, 72], [228, 42], [96, 24], [172, 100], [58, 92], [212, 100]];
    const E = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 2], [1, 7], [3, 6], [6, 8], [4, 8]];
    return `<g class="soft">${E.map(([a, b]) => `<path d="M${N[a]} L${N[b]}"/>`).join('')}</g>
      ${N.map((n, i) => i === 2 ? '' : dot(n[0], n[1], 3.4)).join('')}
      <g class="g-pulse"><circle class="soft accent2" cx="150" cy="34" r="13"/></g>
      ${dot(150, 34, 5.4, 'fill2')}`;
  },
  traffic() {
    const R = 72, cars = [];
    for (let i = 0; i < 22; i++) {
      const jam = i < 7, a = jam ? -1.5 + i * .13 : -1.5 + 0.9 + (i - 7) * .34;
      cars.push([CX + R * Math.cos(a), CY + R * .5 * Math.sin(a), a, jam]);
    }
    return `<ellipse class="soft" cx="${CX}" cy="${CY}" rx="${R + 9}" ry="${R * .5 + 9}"/>
      <ellipse class="soft" cx="${CX}" cy="${CY}" rx="${R - 9}" ry="${R * .5 - 9}"/>
      ${cars.map(c => `<rect class="${c[3] ? 'fill2' : 'fillA'}" x="${(c[0] - 3).toFixed(1)}" y="${(c[1] - 2).toFixed(1)}" width="6" height="4" rx="1.4" transform="rotate(${(c[2] * 57.3 + 90).toFixed(0)} ${c[0].toFixed(1)} ${c[1].toFixed(1)})"/>`).join('')}`;
  },
  gravity() {
    return `<ellipse class="soft" cx="${CX}" cy="${CY}" rx="86" ry="34" transform="rotate(-16 ${CX} ${CY})"/>
      <ellipse class="soft" cx="${CX}" cy="${CY}" rx="52" ry="21" transform="rotate(22 ${CX} ${CY})"/>
      <g class="g-spin" style="transform-origin:${CX}px ${CY}px">${dot(226, 40, 3.6)}${dot(58, 82, 2.6)}</g>
      <circle class="fill2" cx="${CX}" cy="${CY}" r="7"/>
      <circle class="soft accent2" cx="${CX}" cy="${CY}" r="13"/>`;
  },
  lorenz() {
    let x = 1, y = 1, z = 20; const pts = [], dt = 0.006;
    for (let i = 0; i < 4200; i++) {
      const dx = 10 * (y - x), dy = x * (28 - z) - y, dz = x * y - (8 / 3) * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      if (i > 400) pts.push([x * 1.75, -z]);
    }
    const p = fit(pts, 34, 246, 12, 116);
    return `<path d="${path(p)}" stroke-width="0.85" opacity=".95"/>`;
  },
  'reaction-diffusion'() {
    const ring = (r, k, ph) => path(sample(t => [CX + (r + k * Math.sin(6 * t + ph)) * Math.cos(t) * 1.9,
      CY + (r + k * Math.sin(6 * t + ph)) * Math.sin(t)], 0, Math.PI * 2, 120));
    return `<path class="soft" d="${ring(46, 5, 0)}"/><path d="${ring(31, 4, 1.1)}"/>
      <path class="accent2" d="${ring(16, 3, 2.2)}"/>${dot(CX, CY, 3, 'fillA')}`;
  },
  segregation() {
    let s = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) {
      const x = 50 + c * 18, y = 28 + r * 18;
      const left = c < 4 || (c < 6 && r > 2), n = Math.sin(c * 3.1 + r * 1.7) > .55;
      const blue = left !== n;
      s += blue ? dot(x, y, 3.4, 'fillA') : dot(x, y, 3.4, 'fill2');
    }
    return `<g class="soft"><path d="M41 19 H239 M41 101 H239 M41 19 V101 M239 19 V101"/></g>${s}`;
  },
  'game-of-life'() {
    let g = '';
    for (let i = 0; i <= 9; i++) g += `<path d="M${64 + i * 17} 13 V115"/>`;
    for (let i = 0; i <= 6; i++) g += `<path d="M64 ${13 + i * 17} H217"/>`;
    const cells = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
    return `<g class="soft">${g}</g>${cells.map(([c, r]) =>
      `<rect class="fillA" x="${68 + (c + 2) * 17}" y="${17 + (r + 1) * 17}" width="10" height="10" rx="1.8"/>`).join('')}
      <rect class="fill2" x="${68 + 6 * 17}" y="${17 + 4 * 17}" width="10" height="10" rx="1.8" opacity=".5"/>`;
  },
  pharmacokinetics() {
    const c = sample(t => [t, 104 - 62 * (Math.exp(-(t - 40) / 70) - Math.exp(-(t - 40) / 12))], 40, 250, 90);
    return `<path class="soft" d="M40 104 H252 M40 104 V22" stroke-dasharray="2 5"/>
      <path d="${path(c)}"/><path class="accent2" d="M40 104 V90 M96 104 V96 M152 104 V96"/>
      ${dot(70, 46, 3, 'fillA')}`;
  }
};

const ARROW = '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>';
function art(sim) {
  const g = GLYPH[sim.id];
  const body = g ? g() : `<circle class="soft" cx="${CX}" cy="${CY}" r="34"/>${dot(CX, CY, 4)}`;
  return `<div class="card-art"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${body}</svg>
    <span class="card-go">${ARROW}</span></div>`;
}
function cardHTML(sim) {
  const live = sim.status === 'live';
  const inner = `${art(sim)}<div class="card-body">
      <span class="card-tag">${sim.category}</span>
      <h3>${sim.title}</h3>
      <p class="card-hook">${sim.hook || ''}</p>
    </div>${live ? '' : '<span class="badge-soon">Coming soon</span>'}`;
  return live
    ? `<a class="card" data-id="${sim.id}" href="sim.html?id=${encodeURIComponent(sim.id)}">${inner}</a>`
    : `<div class="card disabled">${inner}</div>`;
}
function renderGrid(sims, filter) {
  const grid = document.getElementById('grid');
  const f = filter === 'all' ? sims : sims.filter(s => s.category === filter);
  grid.innerHTML = f.map(cardHTML).join('') || '<p style="color:var(--muted)">Nothing here yet.</p>';
}
function renderFilters(sims, onPick) {
  const cats = ['all', ...new Set(sims.map(s => s.category))];
  const el = document.getElementById('filters');
  el.innerHTML = cats.map((c, i) => {
    const n = c === 'all' ? sims.length : sims.filter(s => s.category === c).length;
    return `<button class="filter-btn${i ? '' : ' active'}" data-filter="${c}">${c === 'all' ? 'All' : c}<b>${n}</b></button>`;
  }).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('.filter-btn'); if (!b) return;
    el.querySelectorAll('.filter-btn').forEach(x => x.classList.toggle('active', x === b));
    onPick(b.dataset.filter);
  });
}

/* Zoom-into-the-simulation transition.
   Chrome does this natively with a cross-document view transition (@view-transition in the
   stylesheet); we only tag the card so it morphs into the player frame. Everywhere else we
   run a short CSS zoom and then navigate. No cost while idle either way. */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NATIVE_VT = 'onpagereveal' in window && CSS.supports('view-transition-name: a');
function wireTransitions() {
  document.getElementById('grid').addEventListener('click', e => {
    const card = e.target.closest('a.card');
    if (!card || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (REDUCED) return;
    if (NATIVE_VT) { card.style.viewTransitionName = 'sim-stage'; return; }
    e.preventDefault();
    card.classList.add('launching');
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = card.href; }, 190);
  });
  addEventListener('pageshow', e => {
    if (e.persisted) {
      document.body.classList.remove('leaving');
      document.querySelectorAll('.card.launching').forEach(c => c.classList.remove('launching'));
    }
  });
}

fetch('sims/manifest.json')
  .then(r => { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
  .then(sims => {
    renderFilters(sims, f => renderGrid(sims, f));
    renderGrid(sims, 'all');
    wireTransitions();
  })
  .catch(err => {
    document.getElementById('grid').innerHTML =
      `<p style="color:var(--accent-2)">Could not load the simulation list: ${err.message}</p>`;
  });
