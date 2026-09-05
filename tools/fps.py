import sys, asyncio
from playwright.async_api import async_playwright
BASE = "http://localhost:8899"
CONFIGS = [
    ("standalone", BASE + "/sims/boids/index.html", None, False),
    ("in-player", BASE + "/sim.html?id=boids", None, False),
    ("standalone NO backdrop-filter", BASE + "/sims/boids/index.html", "*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}", False),
    ("in-player NO backdrop-filter", BASE + "/sim.html?id=boids", "*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}", False),
    ("standalone ui=min (chrome hidden)", BASE + "/sims/boids/index.html?ui=min", None, False),
    ("standalone forced dpr=1", BASE + "/sims/boids/index.html", None, True),
]
MEASURE = """async () => { return await new Promise(res => { let n=0; const t0=performance.now();
  function tick(){ n++; const e=performance.now()-t0; if(e<4000) requestAnimationFrame(tick); else res({fps:1000*n/e}); }
  requestAnimationFrame(tick); }); }"""
async def main(W,H,dpr):
    rows=[]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--disable-frame-rate-limit","--disable-gpu-vsync","--enable-begin-frame-control"])
        for label,url,css,force1 in CONFIGS:
            ctx = await b.new_context(viewport={"width":W,"height":H}, device_scale_factor=dpr)
            pg = await ctx.new_page()
            if force1: await pg.add_init_script("Object.defineProperty(window,'devicePixelRatio',{get:()=>1});")
            await pg.goto(url); await pg.wait_for_timeout(3000)
            if css:
                for f in pg.frames:
                    try: await f.add_style_tag(content=css)
                    except Exception: pass
                await pg.wait_for_timeout(500)
            fr = pg.frames[-1]
            r = await fr.evaluate(MEASURE)
            try:
                info = await fr.evaluate("""() => { const c=document.querySelector('canvas');
                  return {b:(document.getElementById('stBoids')||{}).textContent,
                          h:(document.getElementById('stFps')||{}).textContent,
                          cw:c?c.width:0, ch:c?c.height:0, sw:c?c.clientWidth:0, sh:c?c.clientHeight:0}; }""")
            except Exception as e: info={}
            rows.append((label, r["fps"], info)); await ctx.close()
        await b.close()
    print(f"=== viewport {W}x{H} dpr={dpr} ===")
    for l,f,i in rows:
        print(f"{f:7.1f} fps | {l:34s} | canvas {i.get('cw')}x{i.get('ch')} css {i.get('sw')}x{i.get('sh')} boids={i.get('b')} hud={i.get('h')}")
