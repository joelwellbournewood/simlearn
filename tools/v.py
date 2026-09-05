import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for W,H,d in [(1920,1080,2),(1600,900,1),(1280,800,2)]:
            ctx = await b.new_context(viewport={"width":W,"height":H}, device_scale_factor=d)
            pg = await ctx.new_page(); errs=[]
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append("console:"+m.text) if m.type=="error" else None)
            await pg.goto("http://localhost:8899/sim.html?id=boids")
            await pg.wait_for_timeout(6000)
            fr = pg.frames[-1]
            r = await fr.evaluate("""()=>{const c=document.getElementById('c2d');
              return {cw:c.width,ch:c.height,sw:c.clientWidth,sh:c.clientHeight,
                      px:(c.width*c.height/1e6).toFixed(2),
                      boids:document.getElementById('stBoids').textContent,
                      fps:document.getElementById('stFps').textContent};}""")
            print(f"{W}x{H}@{d}: css {r['sw']}x{r['sh']} backing {r['cw']}x{r['ch']} = {r['px']}Mpx boids={r['boids']} hudfps={r['fps']} errs={errs[:2]}")
            await ctx.close()
        await b.close()
asyncio.run(main())
