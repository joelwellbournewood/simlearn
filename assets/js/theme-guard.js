/* SimLearn theme guard.
   assets/css/theme-lock.css asks browsers and extensions to leave the palette
   alone. Most honour it. A few dark mode extensions repaint the page anyway,
   usually by hanging a filter on the root element, and the result is a site
   whose colour coded scenes no longer mean anything. We cannot out-specify an
   extension, so when one is detected the page says so once, quietly, and
   offers the one fix that works. Test surface: window.__themeGuard(). */
(function(){
  'use strict';
  var KEY = 'simlearn.themeGuard.dismissed';
  var HIDE_DAYS = 30;
  var state = { checks: 0, reason: null, shown: false };

  function lum(c){
    var m = /^rgba?\(([^)]+)\)/.exec(c || '');
    if(!m) return null;
    var p = m[1].split(',').map(function(s){ return parseFloat(s); });
    if(p.length > 3 && p[3] < 0.5) return null;      /* transparent tells us nothing */
    return (0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]) / 255;
  }
  function filtered(el){
    var f = getComputedStyle(el).filter;
    return !!f && f !== 'none';
  }
  function diagnose(){
    var html = document.documentElement, body = document.body;
    if(!body) return null;
    if(filtered(html) || filtered(body)) return 'filter';
    var bg = lum(getComputedStyle(body).backgroundColor);
    if(bg !== null && bg > 0.45) return 'background';
    var fg = lum(getComputedStyle(body).color);
    if(fg !== null && fg < 0.30) return 'text';
    return null;
  }
  function dismissedRecently(){
    try{
      var t = parseInt(localStorage.getItem(KEY) || '0', 10);
      return t > 0 && (Date.now() - t) < HIDE_DAYS*864e5;
    }catch(e){ return false; }
  }
  function show(reason){
    if(state.shown || document.getElementById('theme-guard-note')) return;
    state.shown = true;
    document.documentElement.classList.add('tg-recoloured');
    if(dismissedRecently()) return;
    var n = document.createElement('div');
    n.id = 'theme-guard-note';
    n.setAttribute('role', 'status');
    var p = document.createElement('span');
    p.innerHTML = '<b>Your browser is repainting this page.</b> SimLearn is already dark, and the '
      + 'colours in each simulation carry meaning, so a dark mode extension or theme on top of it '
      + 'hides part of what you are looking at. Turning that extension off for simlearn.ai gives '
      + 'you the intended colours.';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Got it';
    b.addEventListener('click', function(){
      try{ localStorage.setItem(KEY, String(Date.now())); }catch(e){}
      n.remove();
    });
    n.appendChild(p); n.appendChild(b);
    document.body.appendChild(n);
  }
  function check(){
    state.checks++;
    var r = diagnose();
    if(r){ state.reason = r; show(r); return true; }
    return false;
  }
  function start(){
    if(check()) return;
    [700, 2200, 6000].forEach(function(ms){ setTimeout(check, ms); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.__themeGuard = function(){ return { checks: state.checks, reason: state.reason, shown: state.shown, build: '20260908f' }; };
})();
