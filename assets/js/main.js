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

/* The maze in the Turing card is the real model, not a drawing of one: Gray-Scott run
   20,000 steps at F=0.030, k=0.056, Du=0.16, Dv=0.08 on a 124x61 periodic grid, contoured
   at the mid activator level and simplified to 0.7px. Isotropic by measurement (angular
   power spectrum peak/mean 1.75, so no preferred direction), which is what makes it wander
   instead of striping. The field is mapped to a box wider and taller than the card, so the
   open contour ends fall outside the viewBox instead of dangling in view.
   Generator: artifacts/tools/turing_glyph.py 61 124 0.030 0.056 20000 0.7 0.16 0.08 9 */
const TURING_MAZE = ['M294.0 112.9 L289.8 107.1 L284.0 102.0 L271.5 96.9 L264.0 95.9 L256.4 98.9 L246.4 106.7 L238.9 106.1 L233.9 107.2 L213.9 117.8 L181.3 124.1 L171.3 124.0 L162.1 119.7 L155.7 112.1 L152.8 104.5 L150.0 89.3 L141.3 75.7 L138.7 73.2 L133.7 71.4 L128.7 73.6 L126.4 76.7 L125.8 79.2 L127.1 84.3 L136.9 96.9 L145.0 117.2 L156.3 132.5 L163.8 138.6 L168.8 138.8 L193.8 135.1 L208.9 131.6 L226.4 129.7 L231.4 126.4 L246.4 110.2 L248.9 109.6 L258.9 111.8 L274.0 111.3 L279.0 114.0 L281.1 117.2 L281.9 122.3 L278.1 140.0',
'M128.3 -12.0 L133.7 -3.7 L136.7 3.2 L138.6 20.9 L150.0 38.7 L151.3 46.3 L150.3 58.9 L151.9 64.0 L159.4 74.1 L163.8 77.3 L166.3 77.8 L193.8 75.4 L206.1 71.6 L233.4 58.9 L237.6 53.9 L237.9 48.8 L233.9 43.5 L228.9 42.7 L223.9 45.3 L213.5 53.9 L201.3 59.2 L178.8 64.1 L173.8 64.1 L168.8 62.5 L164.9 58.9 L162.7 53.9 L163.4 36.1 L162.5 31.1 L151.0 15.9 L149.9 10.8 L151.0 -1.9 L149.0 -6.9 L144.6 -12.0',
'M88.7 29.5 L83.7 33.7 L76.4 46.3 L71.4 51.3 L53.6 61.0 L41.1 73.7 L28.6 80.8 L24.6 84.3 L21.4 91.9 L22.1 96.9 L23.6 99.2 L28.6 101.3 L33.6 99.5 L51.1 81.0 L72.4 66.5 L86.2 53.9 L98.2 46.3 L101.0 41.2 L100.4 33.6 L96.2 29.5 L93.7 28.7 L88.7 29.5z',
'M211.4 -7.1 L188.8 -2.4 L168.8 -0.1 L166.3 2.6 L165.6 5.7 L166.6 10.8 L168.8 14.7 L171.3 16.8 L176.3 17.4 L191.3 10.4 L198.8 8.1 L211.4 6.2 L218.9 6.4 L223.9 8.1 L226.9 10.8 L231.4 25.0 L233.9 28.6 L236.4 30.1 L241.4 30.2 L246.4 26.8 L248.8 20.9 L246.8 13.3 L234.3 3.2 L228.9 -4.9 L223.9 -8.0 L211.4 -7.1z',
'M101.2 63.1 L96.2 66.2 L81.2 80.2 L61.1 93.6 L43.2 112.1 L38.9 119.7 L39.6 124.8 L41.1 126.7 L48.6 129.6 L56.1 127.8 L58.6 124.6 L62.0 109.6 L66.1 104.6 L83.7 97.4 L94.7 84.3 L98.7 82.1 L108.7 79.2 L112.2 76.7 L113.5 71.6 L111.2 66.0 L106.2 62.6 L101.2 63.1z',
'M246.4 69.0 L228.9 79.5 L201.3 90.1 L191.3 92.1 L171.3 91.9 L167.6 94.4 L166.8 96.9 L167.8 102.0 L169.5 104.5 L173.8 107.5 L183.8 107.6 L208.9 102.2 L228.9 92.6 L248.9 86.3 L256.1 81.7 L257.9 76.7 L256.4 72.2 L253.9 69.7 L251.4 68.6 L246.4 69.0z',
'M26.1 48.8 L11.0 54.0 L6.0 58.0 L0.9 64.0 L-3.8 79.2 L-11.0 91.9 L-10.8 96.9 L-6.5 102.2 L-4.0 103.0 L1.0 101.7 L5.6 96.9 L8.2 79.2 L12.8 71.6 L18.6 67.4 L31.1 61.5 L36.2 56.4 L37.1 53.9 L36.1 50.4 L31.1 48.2 L26.1 48.8z',
'M25.3 -12.0 L23.6 -9.4 L22.6 -4.4 L24.6 0.7 L28.6 3.6 L38.6 6.2 L53.6 2.0 L61.1 1.9 L68.6 5.6 L76.1 15.1 L81.2 17.8 L86.2 16.7 L88.6 13.3 L87.9 5.7 L82.3 -1.9 L71.1 -10.1 L67.0 -12.0',
'M142.2 140.0 L130.1 122.3 L118.7 98.4 L116.2 95.7 L111.2 94.3 L103.7 98.1 L101.3 102.0 L101.3 104.5 L102.4 107.1 L113.7 119.7 L126.5 140.0',
'M203.9 22.9 L193.8 27.6 L183.1 31.1 L179.1 33.6 L177.0 38.7 L178.8 45.5 L183.8 47.7 L188.8 46.8 L207.3 38.7 L215.2 33.6 L217.1 28.5 L214.2 23.5 L208.9 21.9 L203.9 22.9z',
'M94.9 -12.0 L101.8 -1.9 L106.2 18.2 L108.7 21.3 L113.7 23.4 L118.7 22.6 L120.8 20.9 L122.2 18.4 L122.5 13.3 L118.9 3.2 L109.7 -12.0',
'M277.7 -12.0 L274.7 -4.4 L264.4 5.7 L261.6 10.8 L262.1 15.9 L263.6 18.4 L266.5 20.7 L271.5 21.8 L276.5 19.1 L279.0 15.5 L290.1 -12.0',
'M7.3 140.0 L11.0 133.1 L21.1 126.5 L24.7 122.3 L24.9 117.2 L23.6 114.3 L21.1 112.1 L16.0 111.1 L6.5 114.7 L1.6 119.7 L-3.0 140.0',
'M48.6 20.2 L44.0 26.0 L42.6 36.1 L43.6 41.2 L46.1 43.7 L48.6 44.3 L53.6 43.2 L61.1 38.7 L65.4 33.6 L66.8 28.5 L64.6 23.5 L61.1 20.7 L53.6 18.8 L48.6 20.2z',
'M108.0 140.0 L91.2 116.6 L86.2 113.6 L81.2 114.5 L77.5 117.2 L74.5 122.3 L74.8 127.3 L76.8 129.9 L92.5 140.0',
'M-14.0 52.0 L-9.0 51.4 L-3.9 46.3 L-3.1 41.2 L-7.0 28.5 L-7.2 23.5 L-5.7 18.4 L7.1 3.2 L8.1 -1.9 L7.2 -12.0',
'M121.2 35.0 L115.7 41.2 L114.7 46.3 L116.0 51.3 L118.7 54.7 L123.7 57.8 L131.2 58.5 L134.1 56.4 L135.8 51.3 L133.7 41.3 L128.7 35.3 L126.2 34.3 L121.2 35.0z',
'M258.9 35.4 L252.8 41.2 L251.2 48.8 L253.9 54.4 L256.4 56.0 L261.4 56.6 L266.5 54.8 L271.0 51.3 L272.8 48.8 L274.0 43.7 L272.7 38.7 L269.0 34.9 L264.0 34.1 L258.9 35.4z',
'M279.0 63.2 L272.6 69.1 L270.7 76.7 L273.9 81.7 L276.5 83.3 L284.0 84.4 L286.5 83.4 L289.9 79.2 L292.7 71.6 L292.6 66.5 L291.2 64.0 L286.5 61.6 L279.0 63.2z',
'M18.6 15.3 L13.2 18.4 L9.3 26.0 L10.1 33.6 L13.5 36.3 L18.6 36.4 L23.6 34.7 L27.7 31.1 L29.7 26.0 L29.2 20.9 L27.4 18.4 L23.6 15.9 L18.6 15.3z',
'M262.3 140.0 L264.4 134.9 L264.5 129.9 L262.8 127.3 L258.9 125.8 L253.9 126.6 L248.9 129.6 L243.6 134.9 L241.5 140.0',
'M294.0 19.7 L289.0 28.5 L287.8 36.1 L290.1 46.3 L294.0 50.8'];

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
  'turing-patterns'() {
    /* Activator pulses run along the walls of the maze the model actually made. Red is
       present in the still frame (each path carries dashes from offset 0), and on hover the
       dashes travel the tortuous path itself, which is the part a static picture cannot show. */
    const GAP = 108, SEG = 15;
    addAnim(`@keyframes tpFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-${GAP + SEG}px}}` +
      `.tp-flow{animation:tpFlow 5.6s linear infinite}`);
    const base = TURING_MAZE.map(d => `<path d="${d}"/>`).join('');
    const flow = TURING_MAZE.map((d, i) =>
      `<path class="accent2 tp-flow" d="${d}" style="animation-delay:${(-0.41 * i).toFixed(2)}s"/>`).join('');
    return `<g opacity=".46" stroke-width="1.15">${base}</g>
      <g stroke-width="1.75" stroke-dasharray="${SEG} ${GAP}">${flow}</g>`;
  },
  'hodgkin-huxley'() {
    /* A myelinated axon seen from the side, with one action potential jumping from node
       to node. The waveform is the shape the model draws: fast rise, overshoot, slower
       repolarisation through an undershoot. The spike itself and the node it is standing
       on are red, so the still frame already carries the accent (529 red pixels at rest);
       on hover the group steps node to node, which is what saltatory conduction is. */
    const NODE = [44, 88, 132, 176, 220];
    let sheath = '';
    for (let i = 0; i < NODE.length - 1; i++)
      sheath += `<rect x="${NODE[i] + 7}" y="${84}" width="${44 - 14}" height="17" rx="6"/>`;
    sheath += `<rect x="${NODE[NODE.length - 1] + 7}" y="84" width="26" height="17" rx="6"/>`;
    sheath += `<rect x="11" y="84" width="26" height="17" rx="6"/>`;
    const nodes = NODE.map(x => `<path d="M${x} 84 V101"/>`).join('');
    addAnim(`@keyframes hhJump{0%,13%{transform:translateX(0)}17%,30%{transform:translateX(44px)}` +
      `34%,47%{transform:translateX(88px)}51%,64%{transform:translateX(132px)}` +
      `68%,84%{transform:translateX(176px)}100%{transform:translateX(176px)}}` +
      `@keyframes hhFade{0%,84%{opacity:1}93%,100%{opacity:0}}` +
      `.hh-run{animation:hhJump 5.2s cubic-bezier(.5,0,.5,1) infinite,hhFade 5.2s linear infinite}`);
    return `<g class="soft"><path d="M12 66 H268" stroke-dasharray="2 5"/>
        <path d="M12 92 H268"/>${sheath}${nodes}</g>
      <g class="hh-run">
        <rect class="fill2" x="41" y="82" width="6" height="21" rx="2.5" opacity=".85"/>
        <path class="accent2" stroke-width="2.4" d="M18.0 66.0 L18.8 66.0 L19.5 66.0 L20.2 66.0 L21.0 66.0 L21.8 66.0 L22.5 66.0 L23.2 66.0 L24.0 66.0 L24.8 66.0 L25.5 66.0 L26.2 66.0 L27.0 66.0 L27.8 65.9 L28.5 65.9 L29.2 65.8 L30.0 65.6 L30.8 65.4 L31.5 65.0 L32.2 64.4 L33.0 63.6 L33.8 62.5 L34.5 61.0 L35.2 59.0 L36.0 56.5 L36.8 53.4 L37.5 49.8 L38.2 45.7 L39.0 41.4 L39.8 36.9 L40.5 32.5 L41.2 28.6 L42.0 25.4 L42.8 23.1 L43.5 22.0 L44.2 22.2 L45.0 23.7 L45.8 26.5 L46.5 30.3 L47.2 35.0 L48.0 40.2 L48.8 45.6 L49.5 51.0 L50.2 56.1 L51.0 60.8 L51.8 65.0 L52.5 68.5 L53.2 71.4 L54.0 73.8 L54.8 75.6 L55.5 76.9 L56.2 77.7 L57.0 78.3 L57.8 78.5 L58.5 78.4 L59.2 78.1 L60.0 77.7 L60.8 77.1 L61.5 76.4 L62.2 75.6 L63.0 74.7 L63.8 73.8 L64.5 73.0 L65.2 72.1 L66.0 71.3 L66.8 70.5 L67.5 69.8 L68.2 69.2 L69.0 68.6 L69.8 68.1 L70.5 67.7 L71.2 67.4 L72.0 67.1 L72.8 66.8 L73.5 66.6 L74.2 66.5 L75.0 66.4 L75.8 66.3 L76.5 66.2 L77.2 66.1 L78.0 66.1 L78.8 66.1 L79.5 66.0 L80.2 66.0 L81.0 66.0 L81.8 66.0 L82.5 66.0 L83.2 66.0 L84.0 66.0 L84.8 66.0 L85.5 66.0 L86.2 66.0 L87.0 66.0 L87.8 66.0 L88.5 66.0 L89.2 66.0 L90.0 66.0"/>
        <circle class="fill2" cx="44" cy="92" r="5.4"/>
        <circle class="fill2" cx="44" cy="92" r="11" opacity=".18"/>
      </g>`;
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
