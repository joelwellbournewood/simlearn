/* Shared "I want to know more" expander for sim explainer dialogs.
   Markup contract: inside .about-inner, put
   <div class="more-box"><div class="more-body"> ...dense material... </div></div>
   This file injects the styling and the toggle button. */
(function(){
  var css = [
    '.about-inner .more-box{margin-top:22px;padding-top:16px;border-top:1px solid var(--line,rgba(255,255,255,.12))}',
    '.about-inner .more-btn{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;',
    'padding:12px 14px;border:1px solid var(--line-strong,rgba(255,255,255,.22));border-radius:12px;',
    'background:var(--panel-2,rgba(255,255,255,.04));color:var(--ink,#eaf3ee);cursor:pointer;',
    'font-family:var(--display,inherit);font-size:14.5px;font-weight:600;letter-spacing:-.01em;text-align:left}',
    '.about-inner .more-btn:hover,.about-inner .more-btn:focus-visible{border-color:var(--accent,#5fd3a3);color:var(--accent,#5fd3a3)}',
    '.about-inner .more-chev{font-family:var(--mono,monospace);font-size:17px;line-height:1;color:var(--accent,#5fd3a3)}',
    '.about-inner .more-body{margin-top:16px;padding-left:14px;border-left:2px solid var(--line-strong,rgba(255,255,255,.22))}',
    '.about-inner .more-body>h3:first-child{margin-top:0}',
    '.about-inner .eq{display:block;overflow-x:auto;margin:0 0 10px;padding:9px 11px;border-radius:8px;',
    'background:rgba(255,255,255,.05);font-family:var(--mono,monospace);font-size:13px;color:var(--ink,#eaf3ee)}',
    '.about-inner .more-body .refs{list-style:none;padding-left:0;margin:0}',
    '.about-inner .more-body .refs li{font-size:12.5px;line-height:1.5;color:var(--muted,#8fa79c);margin:0 0 5px}',
    '.about-inner .more-body .refs a.doi{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:5px;',
    'border:1px solid var(--line-strong,rgba(255,255,255,.22));font-family:var(--mono,monospace);font-size:10.5px;',
    'letter-spacing:.06em;color:var(--muted,#8fa79c);text-decoration:none;vertical-align:1px}',
    '.about-inner .more-body .refs a.doi:hover,.about-inner .more-body .refs a.doi:focus-visible{',
    'color:var(--accent,#5fd3a3);border-color:var(--accent,#5fd3a3)}',
    '@media (max-width:820px){.about-inner .more-btn{font-size:13.5px;padding:11px 12px}.about-inner .more-body{padding-left:11px}}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function wire(body){
    if (body.dataset.moreWired) return; body.dataset.moreWired = '1';
    body.hidden = true;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'more-btn'; btn.setAttribute('aria-expanded','false');
    btn.innerHTML = '<span class="more-lab">I want to know more</span><span class="more-chev">+</span>';
    body.parentNode.insertBefore(btn, body);
    var id = 'more-body-' + Math.random().toString(36).slice(2,8);
    body.id = id; btn.setAttribute('aria-controls', id);
    btn.addEventListener('click', function(){
      var opening = body.hidden;
      body.hidden = !opening;
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      btn.querySelector('.more-lab').textContent = opening ? 'Show less' : 'I want to know more';
      btn.querySelector('.more-chev').textContent = opening ? '\u2212' : '+';
      if (opening) { try { btn.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e){} }
    });
  }
  function scan(){ document.querySelectorAll('.about-inner .more-body').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();
