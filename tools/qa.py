import asyncio, json, sys
from playwright.async_api import async_playwright

W,H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv)>2 else (1600,900)
BASE="http://127.0.0.1:8899"
ids=[s["id"] for s in json.load(open("/root/simlearn-pending/sims/manifest.json")) if s.get("status")=="live"]

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--enable-unsafe-swiftshader"])
        pg=await b.new_page(viewport={"width":W,"height":H})
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append("console:"+m.text) if m.type=="error" else None)
        for sid in ids:
            errs.clear()
            await pg.goto(f"{BASE}/sim.html?id={sid}", wait_until="networkidle")
            await pg.wait_for_timeout(2500)
            box=await pg.locator("#sim-frame").bounding_box()
            fr=pg.frame_locator("#sim-frame")
            info=await pg.evaluate("""() => {
              const f=document.getElementById('sim-frame');
              const d=f.contentDocument, w=f.contentWindow;
              const e=d.documentElement;
              const cv=d.querySelector('canvas');
              let px=null, nonbg=0;
              if(cv){ try{ const g=cv.getContext('2d'); const im=g.getImageData(0,0,cv.width,cv.height).data;
                for(let i=0;i<im.length;i+=4*97){ if(im[i]>25||im[i+1]>35||im[i+2]>30) nonbg++; }
                px=Math.round(nonbg/(im.length/(4*97))*1000)/10; }catch(err){ px='ERR:'+err.message; } }
              const cols = d.querySelector('.layout') ? getComputedStyle(d.querySelector('.layout')).gridTemplateColumns : null;
              return {vw:w.innerWidth, vh:w.innerHeight,
                      scrollH:e.scrollHeight, clientH:e.clientHeight,
                      scrollW:e.scrollWidth, clientW:e.clientWidth,
                      canvasCSS: cv? Math.round(cv.getBoundingClientRect().width)+'x'+Math.round(cv.getBoundingClientRect().height):null,
                      inkPct:px, cols:cols};
            }""")
            vfill = round(box['height']/H*100)
            print(f"{sid:20s} frame {round(box['width'])}x{round(box['height'])} ({vfill}% of vh) | inner {info['vw']}x{info['vh']} scroll {info['scrollW']}x{info['scrollH']} | canvas {info['canvasCSS']} ink {info['inkPct']}% | errs {len(errs)} {errs[:1]}")
            if info['cols']: print(f"{'':20s}   grid cols: {info['cols']}")
        await b.close()
asyncio.run(main())
