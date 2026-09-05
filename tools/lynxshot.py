import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else "http://localhost:8899/sims/predator-prey/index.html"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--enable-unsafe-swiftshader"])
        pg=await b.new_page(viewport={"width":1600,"height":900})
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(5000)
        art=await pg.evaluate("""()=>{
          const c=document.querySelector('#field');
          const ctx=c.getContext('2d');
          const W=c.width,H=c.height;
          const d=ctx.getImageData(0,0,W,H).data;
          // find coral-ish core pixels (255,125,92)
          const hits=[];
          for(let y=40;y<H-40;y++)for(let x=40;x<W-40;x++){const i=(y*W+x)*4;
            if(d[i]>230&&d[i+1]>105&&d[i+1]<150&&d[i+2]>70&&d[i+2]<120) hits.push([x,y]);}
          if(!hits.length) return 'no coral pixels found; W='+W+' H='+H;
          // pick a hit that is isolated: choose the 5th
          const [cx,cy]=hits[Math.floor(hits.length/2)];
          const S=44, x0=cx-S/2|0, y0=cy-S/2|0;
          const ramp=' .:-=+*#%@';
          let out='canvas '+W+'x'+H+' cssW '+c.getBoundingClientRect().width.toFixed(0)+' coralpx='+hits.length+' crop@'+cx+','+cy+'\\n';
          for(let y=0;y<S;y++){let row='';
            for(let x=0;x<S;x++){const i=((y0+y)*W+(x0+x))*4;
              const v=Math.max(0,Math.min(1,(d[i]-35)/220));
              row+=ramp[Math.round(v*9)];}
            out+=row+'\\n';}
          return out;
        }""")
        print(art); print("errs",errs)
        await b.close()
asyncio.run(main())
