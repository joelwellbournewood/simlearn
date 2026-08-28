async function loadManifest() {
  const res = await fetch('sims/manifest.json');
  if (!res.ok) throw new Error('Could not load manifest');
  return res.json();
}
function cardHTML(sim) {
  const live = sim.status === 'live';
  const inner = `
    <span class="card-tag">${sim.category}</span>
    <h3>${sim.title}</h3>
    <p>${sim.description}</p>
    ${!live ? '<span class="badge-soon">Coming soon</span>' : ''}
  `;
  if (live) {
    return `<a class="card" href="sim.html?id=${encodeURIComponent(sim.id)}">${inner}</a>`;
  }
  return `<div class="card disabled">${inner}</div>`;
}
function renderGrid(sims, filter) {
  const grid = document.getElementById('grid');
  const filtered = filter === 'all' ? sims : sims.filter(s => s.category === filter);
  grid.innerHTML = filtered.map(cardHTML).join('') || '<p style="color:var(--text-dim)">No simulations in this category yet.</p>';
}
function renderFilters(sims) {
  const cats = ['all', ...new Set(sims.map(s => s.category))];
  const filters = document.getElementById('filters');
  filters.innerHTML = cats.map((c, i) =>
    `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${c}">${c === 'all' ? 'All' : c}</button>`
  ).join('');
  filters.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(sims, btn.dataset.filter);
    });
  });
}
loadManifest()
  .then(sims => {
    renderFilters(sims);
    renderGrid(sims, 'all');
  })
  .catch(err => {
    document.getElementById('grid').innerHTML =
      `<p style="color:#e88">Failed to load simulation list: ${err.message}</p>`;
  });
