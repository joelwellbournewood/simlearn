from playwright.sync_api import sync_playwright
import sys
url=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1600,"height":900})
    errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("console",lambda m: errs.append("CONSOLE:"+m.text) if m.type=="error" else None)
    pg.goto(url,wait_until="load"); pg.wait_for_timeout(4000)
    d=pg.evaluate("""()=>{
      const g=s=>{const e=document.querySelector(s);return e?getComputedStyle(e):null};
      const ab=document.querySelector('.about-btn');
      return {
        title:document.title,
        presets:document.querySelectorAll('.preset').length,
        tips:document.querySelectorAll('.tip').length,
        accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        aboutBtnText:ab?ab.textContent.trim():null,
        aboutTop:ab?Math.round(ab.getBoundingClientRect().top):null,
        brandVisible: !!document.querySelector('.brand') && getComputedStyle(document.querySelector('.brand')).display!=='none',
        inframe:document.documentElement.classList.contains('in-frame'),
        boids: (window.flock&&flock.n)||null,
        fps: Math.round(window.fps||0),
        canvasW: document.querySelector('canvas')?document.querySelector('canvas').width:null,
        scroll: document.documentElement.scrollHeight-window.innerHeight,
        font: g('body').fontFamily
      }}""")
    print(d)
    # click a preset + open dialog
    pg.keyboard.press("3"); pg.wait_for_timeout(800)
    pg.click(".about-btn"); pg.wait_for_timeout(500)
    print("dialog open:",pg.evaluate("()=>{const d=document.querySelector('dialog.about');return d?d.open:null}"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    pg.keyboard.press("d"); pg.wait_for_timeout(1500)
    print("diag:",pg.evaluate("()=>{const e=document.getElementById('diag');return e?getComputedStyle(e).display+' | '+e.textContent.slice(0,160):null}"))
    print("ERRORS:",errs[:6])
    b.close()
