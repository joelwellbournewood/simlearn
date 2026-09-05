import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--enable-unsafe-swiftshader"])
        pg=await b.new_page(viewport={"width":1600,"height":900})
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(6000)
        d=await pg.evaluate("""()=>{
          const q=s=>document.querySelectorAll(s);
          const ab=document.getElementById('b-about').getBoundingClientRect();
          const st=[...q('.stat .v')].map(e=>e.textContent);
          return {presets:q('.preset').length, tips:q('.tip').length,
            aboutY:Math.round(ab.y), aboutX:Math.round(ab.x),
            active:[...q('.preset[aria-pressed=true]')].map(e=>e.textContent),
            stats:st, scrollY:document.documentElement.scrollHeight-window.innerHeight,
            panelScroll:document.querySelector('.panel').scrollHeight-document.querySelector('.panel').clientHeight};
        }""")
        print(d); print("errs",errs)
        art=await pg.evaluate("""()=>{
          const c=document.getElementById('c'),x=c.getContext('2d');
          const W=c.width,H=c.height,d=x.getImageData(0,0,W,H).data;
          const ramp=' .:-=+*#%@'; let out='';
          const CW=76,CH=30;
          for(let ry=0;ry<CH;ry++){let row='';
            for(let rx=0;rx<CW;rx++){
              let mx=0;
              const x0=Math.floor(rx*W/CW),x1=Math.floor((rx+1)*W/CW);
              const y0=Math.floor(ry*H/CH),y1=Math.floor((ry+1)*H/CH);
              for(let y=y0;y<y1;y+=3)for(let xx=x0;xx<x1;xx+=3){const i=(y*W+xx)*4;
                const v=(d[i]+d[i+1]+d[i+2])/3; if(v>mx)mx=v;}
              row+=ramp[Math.max(0,Math.min(9,Math.round((mx-18)/237*9)))];}
            out+=row+'\\n';}
          return out;}""")
        print(art)
        await b.close()
asyncio.run(main())
