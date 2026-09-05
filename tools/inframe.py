import sys, time
from playwright.sync_api import sync_playwright
url=sys.argv[1]; W=int(sys.argv[2]); H=int(sys.argv[3])
with sync_playwright() as p:
    b=p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":W,"height":H})
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(4000)
    f=pg.frames[-1]
    print("frame url:", f.url)
    print(f.evaluate("""()=>({
      inframe: document.documentElement.classList.contains('in-frame'),
      presets: document.querySelectorAll('[data-preset],.preset,.presets button').length,
      tips: document.querySelectorAll('.tip').length,
      brandVisible: (()=>{const b=document.querySelector('.brand');return b?getComputedStyle(b).display!=='none':null})(),
      aboutTop: (()=>{const b=document.querySelector('.about-btn');return b?Math.round(b.getBoundingClientRect().top):null})(),
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      canvas: (()=>{const c=document.querySelector('canvas');return c?c.width+'x'+c.height:null})()
    })"""))
    print("page scroll:", pg.evaluate("document.documentElement.scrollHeight-window.innerHeight"))
    print("ERRORS:", errs)
    b.close()
