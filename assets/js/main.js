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

let ANIM = '';
const addAnim = s => { ANIM += s; };
// Keyframes made of translate() steps sampled from f(t), t in [0,1]. No transform-origin
// involved, so the shape never shears: the dot stays round while it walks its orbit.
function orbitKF(name, f, n) {
  let k = '';
  for (let i = 0; i <= n; i++) {
    const p = f(i / n);
    k += `${(100 * i / n).toFixed(2)}%{transform:translate(${p[0].toFixed(2)}px,${p[1].toFixed(2)}px)}`;
  }
  return `@keyframes ${name}{${k}}`;
}

const GLYPH = {
  boids() {
    // The flock flies right; the predator is the odd-coloured bird at the BACK, chasing.
    const bird = (x, y, k, s) => {
      s = s || 1;
      const a = (15 * s).toFixed(1), b = (6.5 * s).toFixed(1), c = (4.6 * s).toFixed(1);
      return `<path class="${k}" d="M${x} ${y} l${a} ${b} l-${a} ${b} l${c} -${b}z"/>`;
    };
    const streak = (x, y, l, s) => `<path class="soft" d="M${x - l} ${(y + 6.5 * (s || 1)).toFixed(1)} h${l - 4}"/>`;
    const P = [[236, 52], [212, 30], [212, 74], [186, 16], [186, 90], [160, 40], [160, 66], [136, 58]];
    const PRED = [58, 48], PS = 1.55;
    return `<g class="g-drift">${P.map((p, i) => streak(p[0], p[1], 18 + (i % 3) * 8)).join('')}
      ${P.map(p => bird(p[0], p[1], 'fillA')).join('')}</g>
      <g class="g-chase">${streak(PRED[0], PRED[1], 30, PS)}
      ${bird(PRED[0], PRED[1], 'fill2', PS)}</g>`;
  },
  'predator-prey'() {
    const per = 100;
    const wave = (amp, ph) => path(sample(t => [t, CY - amp * Math.sin((t - 26) / per * Math.PI * 2 - ph)], 4, 384, 150));
    addAnim(`@keyframes ppScroll{from{transform:translateX(0)}to{transform:translateX(-${per}px)}}` +
      `.pp-wave{animation:ppScroll 11s linear infinite}`);
    return `<clipPath id="ppclip"><rect x="20" y="4" width="240" height="120"/></clipPath>
      <path class="soft" d="M26 ${CY} H254" stroke-dasharray="2 5"/>
      <g clip-path="url(#ppclip)"><g class="pp-wave">
        <path d="${wave(26, 0)}"/><path class="accent2" d="${wave(15, 1.5)}"/></g></g>`;
  },
  'double-pendulum'() {
    const tr = sample(t => [CX + 72 * Math.sin(3 * t) * Math.cos(t * .5), 54 + 38 * Math.sin(2 * t)], 0, Math.PI * 4, 220);
    addAnim(`@keyframes dpA1{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}` +
      `@keyframes dpA2{0%,100%{transform:rotate(15deg)}50%{transform:rotate(-19deg)}}` +
      `.dp-a1{animation:dpA1 4.6s ease-in-out infinite;transform-origin:140px 14px}` +
      `.dp-a2{animation:dpA2 2.9s ease-in-out infinite;transform-origin:196px 58px}`);
    return `<path class="soft" d="${path(tr)}"/>
      <g class="dp-a1"><path d="M140 14 L196 58"/>${dot(196, 58, 3.2)}
        <g class="dp-a2"><path d="M196 58 L158 110"/><circle class="fill2" cx="158" cy="110" r="5.4"/></g>
      </g>${dot(140, 14, 3.4)}`;
  },
  'optics-lens'() {
    const rays = [-26, 0, 26].map(dy =>
      `<path class="${dy ? 'soft' : ''}" d="M62 ${64 + dy * .55} L140 ${64 + dy} L216 64"/>`).join('');
    addAnim(`@keyframes opRay{0%{transform:translateX(0);opacity:0}10%{opacity:1}` +
      `88%{opacity:1}100%{transform:translateX(154px);opacity:0}}` +
      `.op-ray{animation:opRay 2.8s linear infinite}`);
    return `<path class="soft" d="M40 64 H244" stroke-dasharray="2 5"/>
      <path d="M140 26 C160 44 160 84 140 102 C120 84 120 44 140 26z" opacity=".9"/>
      ${rays}<path class="accent2" d="M62 64 V36 M56 43 l6-7 6 7"/>${dot(216, 64, 3.4, 'fill2')}
      <circle class="fillA op-ray" cx="62" cy="64" r="3.2"/>`;
  },
  epidemic() {
    const N = [[70, 40], [110, 78], [150, 34], [190, 72], [228, 42], [96, 24], [172, 100], [58, 92], [212, 100]];
    const E = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 2], [1, 7], [3, 6], [6, 8], [4, 8]];
    addAnim(`@keyframes epWave{0%{transform:scale(.3);opacity:.6}70%{opacity:0}100%{transform:scale(2.2);opacity:0}}` +
      `.ep-wave{animation:epWave 3s ease-out infinite;transform-origin:150px 34px}` +
      `@keyframes epPulse{0%,100%{opacity:.32}50%{opacity:.95}}` +
      `.ep-pulse{animation:epPulse 2.1s ease-in-out infinite}`);
    return `<g class="soft">${E.map(([a, b]) => `<path d="M${N[a]} L${N[b]}"/>`).join('')}</g>
      ${N.map((n, i) => i === 2 ? '' : dot(n[0], n[1], 3.4)).join('')}
      <circle class="soft accent2 ep-wave" cx="150" cy="34" r="13"/>
      <circle class="soft accent2 ep-pulse" cx="150" cy="34" r="13"/>
      ${dot(150, 34, 5.4, 'fill2')}`;
  },
  traffic() {
    // A stop-and-go wave, built the way one really works: every car drives the same loop and
    // carries the same small speed oscillation, each car a fixed phase behind the one ahead.
    // That phase lag makes the cars bunch, and the bunch drifts BACKWARDS while the cars all
    // move forwards through it. Cars redden as they slow, so the jam is visible as a shape.
    const R = 74, N = 14, AMP = 40;      // ring radius, cars, speed-wobble amplitude in degrees
    const LAP = 8, OSC = 6.2;            // seconds per lap; seconds between two jam encounters
    // jam drift = 360/LAP - 360/OSC = -13 deg/s, i.e. one backward lap every 28s.
    const FREE = [86, 224, 194], SLOW = [255, 125, 92];
    const hex = w => '#' + FREE.map((c, i) => Math.round(c + (SLOW[i] - c) * w)
      .toString(16).padStart(2, '0')).join('');
    let wob = '', heat = '';
    const S = 24;
    for (let i = 0; i <= S; i++) {
      const u = i / S, p = 2 * Math.PI * u, pc = (100 * u).toFixed(2);
      wob += `${pc}%{transform:rotate(${(AMP * Math.sin(p)).toFixed(2)}deg)}`;
      const slow = Math.max(0, -Math.cos(p));            // 0 at full speed, 1 at a standstill
      heat += `${pc}%{fill:${hex(Math.min(1, Math.max(0, (slow - .18) / .82) ** .85))}}`;
    }
    addAnim(`@keyframes trWob{${wob}}@keyframes trHeat{${heat}}` +
      `@keyframes trSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}` +
      `.tr-spin{animation:trSpin ${LAP}s linear infinite;transform-origin:0 0}` +
      `.tr-wob{animation:trWob ${OSC}s linear infinite;transform-origin:0 0}` +
      `.tr-car{animation:trHeat ${OSC}s linear infinite}`);
    let cars = '';
    for (let i = 0; i < N; i++) {
      const slot = i * 360 / N, ph = i / N, d = (-ph * OSC).toFixed(3);
      const rest = (AMP * Math.sin(2 * Math.PI * ph)).toFixed(2);   // phase-0 frame, kept as the
      const w0 = Math.min(1, Math.max(0, (Math.max(0, -Math.cos(2 * Math.PI * ph)) - .18) / .82) ** .85);
      cars += `<g transform="rotate(${slot.toFixed(2)})"><g class="tr-wob" transform="rotate(${rest})"
        style="animation-delay:${d}s"><rect class="tr-car" style="animation-delay:${d}s"
        x="${R - 3.1}" y="-4" width="6.2" height="8" rx="1.8" stroke="none" fill="${hex(w0)}"/></g></g>`;
    }
    return `<g transform="translate(${CX},${CY}) scale(1,.5)">
      <circle class="soft" cx="0" cy="0" r="${R + 11}"/><circle class="soft" cx="0" cy="0" r="${R - 11}"/>
      <g class="tr-spin">${cars}</g></g>`;
  },
  gravity() {
    const orb = (a, b, rotDeg, ph) => t => {
      const th = ph + t * Math.PI * 2, r = rotDeg * Math.PI / 180;
      const x = a * Math.cos(th), y = b * Math.sin(th);
      return [CX + x * Math.cos(r) - y * Math.sin(r), CY + x * Math.sin(r) + y * Math.cos(r)];
    };
    const out = orb(86, 34, -16, 0), inn = orb(52, 21, 22, Math.PI * 160 / 180);
    addAnim(orbitKF('gvOut', out, 60) + orbitKF('gvIn', inn, 60) +
      `.gv-out{animation:gvOut 12s linear infinite both}` +
      `.gv-in{animation:gvIn 7s linear infinite both}`);
    const a = out(0), b = inn(0);
    return `<ellipse class="soft" cx="${CX}" cy="${CY}" rx="86" ry="34" transform="rotate(-16 ${CX} ${CY})"/>
      <ellipse class="soft" cx="${CX}" cy="${CY}" rx="52" ry="21" transform="rotate(22 ${CX} ${CY})"/>
      <circle class="fillA gv-out" cx="0" cy="0" r="3.6" style="transform:translate(${a[0].toFixed(2)}px,${a[1].toFixed(2)}px)"/>
      <circle class="fillA gv-in" cx="0" cy="0" r="2.6" style="transform:translate(${b[0].toFixed(2)}px,${b[1].toFixed(2)}px)"/>
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
    const d = path(fit(pts, 34, 246, 12, 116));
    addAnim(`@keyframes lzBead{from{stroke-dashoffset:0}to{stroke-dashoffset:-1040}}` +
      `.lz-bead{animation:lzBead 8s linear infinite}`);
    return `<path d="${d}" stroke-width="0.85" opacity=".55"/>
      <path class="accent2 lz-bead" d="${d}" pathLength="1000" stroke-dasharray="34 1000" stroke-width="1.7"/>`;
  },
  'reaction-diffusion'() {
    const ring = (r, k, ph) => path(sample(t => [CX + (r + k * Math.sin(6 * t + ph)) * Math.cos(t) * 1.9,
      CY + (r + k * Math.sin(6 * t + ph)) * Math.sin(t)], 0, Math.PI * 2, 120));
    addAnim(`@keyframes rdBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.075)}}` +
      `.rd{animation:rdBreath 3.4s ease-in-out infinite;transform-origin:${CX}px ${CY}px}` +
      `.rd-2{animation-delay:-.55s}.rd-3{animation-delay:-1.1s}`);
    return `<path class="soft rd" d="${ring(46, 5, 0)}"/><path class="rd rd-2" d="${ring(31, 4, 1.1)}"/>
      <path class="accent2 rd rd-3" d="${ring(16, 3, 2.2)}"/>${dot(CX, CY, 3, 'fillA')}`;
  },
  segregation() {
    let s = '';
    const SW = [[5, 2], [6, 2]];   // these two neighbours trade places
    for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) {
      if (SW.some(p => p[0] === c && p[1] === r)) continue;
      const x = 50 + c * 18, y = 28 + r * 18;
      const left = c < 4 || (c < 6 && r > 2), n = Math.sin(c * 3.1 + r * 1.7) > .55;
      s += (left !== n) ? dot(x, y, 3.4, 'fillA') : dot(x, y, 3.4, 'fill2');
    }
    addAnim(`@keyframes sgR{0%,38%{transform:translateX(0)}62%,100%{transform:translateX(18px)}}` +
      `@keyframes sgL{0%,38%{transform:translateX(0)}62%,100%{transform:translateX(-18px)}}` +
      `.sg-a{animation:sgR 4.6s ease-in-out infinite alternate}` +
      `.sg-b{animation:sgL 4.6s ease-in-out infinite alternate}`);
    return `<g class="soft"><path d="M41 19 H239 M41 101 H239 M41 19 V101 M239 19 V101"/></g>${s}
      ${dot(50 + 5 * 18, 28 + 2 * 18, 3.4, 'fill2 sg-a')}
      ${dot(50 + 6 * 18, 28 + 2 * 18, 3.4, 'fillA sg-b')}`;
  },
  'game-of-life'() {
    let g = '';
    for (let i = 0; i <= 9; i++) g += `<path d="M${64 + i * 17} 13 V115"/>`;
    for (let i = 0; i <= 6; i++) g += `<path d="M64 ${13 + i * 17} H217"/>`;
    const cells = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
    const glider = (dc, dr, cls) => `<g class="${cls}">${cells.map(([c, r]) =>
      `<rect class="fillA" x="${68 + (c + 2 + dc) * 17}" y="${17 + (r + 1 + dr) * 17}" width="10" height="10" rx="1.8"/>`).join('')}</g>`;
    addAnim(`@keyframes golA{0%,42%{opacity:1}58%,100%{opacity:0}}` +
      `@keyframes golB{0%,42%{opacity:0}58%,100%{opacity:1}}` +
      `.gol-a{animation:golA 2.6s ease-in-out infinite}` +
      `.gol-b{animation:golB 2.6s ease-in-out infinite}`);
    return `<g class="soft">${g}</g>${glider(0, 0, 'gol-a')}${glider(1, 1, 'gol-b')}`;
  },
  pharmacokinetics() {
    const c = sample(t => [t, 104 - 62 * (Math.exp(-(t - 40) / 70) - Math.exp(-(t - 40) / 12))], 40, 250, 90);
    addAnim(`@keyframes pkDraw{0%{stroke-dashoffset:1000}58%,100%{stroke-dashoffset:0}}` +
      `.pk-draw{animation:pkDraw 4.6s ease-out infinite}` +
      `@keyframes pkDose{0%,100%{opacity:.35}18%{opacity:1}}` +
      `.pk-dose{animation:pkDose 4.6s ease-out infinite}`);
    return `<path class="soft" d="M40 104 H252 M40 104 V22" stroke-dasharray="2 5"/>
      <path class="pk-draw" d="${path(c)}" pathLength="1000" stroke-dasharray="1000 1000"/>
      <path class="accent2 pk-dose" d="M40 104 V90 M96 104 V96 M152 104 V96"/>
      ${dot(70, 46, 3, 'fillA')}`;
  }
};

const ARROW = '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>';
function art(sim) {
  ANIM = '';
  const g = GLYPH[sim.id];
  const body = g ? g() : `<circle class="soft" cx="${CX}" cy="${CY}" r="34"/>${dot(CX, CY, 4)}`;
  const css = ANIM ? `<style>${ANIM}</style>` : '';
  return `<div class="card-art"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${css}${body}</svg>
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
  .then(all => {
    const sims = all.filter(s => s.visible !== false);
    const bar = document.getElementById('filters');
    if (sims.length < 6) { bar.hidden = true; bar.style.display = 'none'; }
    else renderFilters(sims, f => renderGrid(sims, f));
    renderGrid(sims, 'all');
    wireTransitions();
  })
  .catch(err => {
    document.getElementById('grid').innerHTML =
      `<p style="color:var(--accent-2)">Could not load the simulation list: ${err.message}</p>`;
  });
