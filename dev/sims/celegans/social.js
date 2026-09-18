// Worm-worm interaction: the geometry half. The neural half is WormBrain.social().
//
// What is modelled, and where it comes from:
//  * Ascaroside pheromone. Every animal excretes ascarosides continuously;
//    ADL and ASK sense them and feed the RMG hub (Macosko et al. 2009,
//    Nature 458:1171). Here the field is the sum over neighbours of
//    exp(-d/pheroL) - a standing diffusive halo about one body length wide,
//    not a solved diffusion equation (MODEL ASSUMPTION).
//  * Oxygen. A clump of animals is a low-oxygen pocket; URX/AQR/PQR report
//    it (Gray et al. 2004; Rogers et al. 2006). Taken as a function of the
//    same neighbour density rather than a separate solved O2 field.
//  * Contact. Real worms in a cluster crawl over one another, so bodies are
//    NOT mutually exclusive here; what contact does is stimulate the touch
//    receptors, which is what drives the cluster-edge reversals Ding et al.
//    2019 (eLife 8:e43318) needed to fit real aggregation data.
//  * Strain. Social (npr-1 loss of function / wild isolates) vs solitary
//    (N2) - de Bono & Bargmann 1998, Cell 94:679.
export const SOC={ mode:'solitary', pheroL:0.85, touchR:0.085, sampleEvery:4 };

// list: objects with .body (WormBody), .brain (WormBrain) and .soc (scratch)
export function socialStep(list,dt){
  const n=list.length;
  for (const w of list){
    if(!w.soc) w.soc={};
    const S=w.soc; S.nb=0; S.gx=0; S.gy=0; S.head=0; S.tail=0; S.side=0;
    const b=w.body, NP=b.px.length, E=SOC.sampleEvery;
    let cx=0,cy=0,m=0; for(let i=0;i<NP;i+=E){cx+=b.px[i];cy+=b.py[i];m++;}
    S.cx=cx/m; S.cy=cy/m;
  }
  if (n>1){
    const E=SOC.sampleEvery, TR=SOC.touchR, TR2=TR*TR;
    for (let i=0;i<n;i++) for (let j=i+1;j<n;j++){
      const A=list[i], B=list[j], a=A.soc, b=B.soc;
      const dx=b.cx-a.cx, dy=b.cy-a.cy, d=Math.hypot(dx,dy)||1e-6;
      if (d>4) continue;                       // pheromone halo is negligible
      const q=Math.exp(-d/SOC.pheroL);
      a.nb+=q; b.nb+=q;
      a.gx+=dx/d*q; a.gy+=dy/d*q; b.gx-=dx/d*q; b.gy-=dy/d*q;
      if (d<1.2){                              // close enough for bodies to meet
        const PA=A.body, PB=B.body, NP=PA.px.length;
        for (let p=0;p<NP;p+=E) for (let r=0;r<NP;r+=E){
          const ex=PB.px[r]-PA.px[p], ey=PB.py[r]-PA.py[p];
          const dd=ex*ex+ey*ey;
          if (dd<TR2){
            const s=1-Math.sqrt(dd)/TR;
            if (p<NP*0.45) a.head=Math.max(a.head,s); else a.tail=Math.max(a.tail,s);
            if (r<NP*0.45) b.head=Math.max(b.head,s); else b.tail=Math.max(b.tail,s);
          }
        }
      }
    }
  }
  const social = SOC.mode==='social';
  for (const w of list){
    const S=w.soc, b=w.body;
    const g=Math.hypot(S.gx,S.gy);
    // lateral component of the neighbour direction in the animal's own frame
    S.side = g>1e-6 ? (b.noseDirX*S.gy-b.noseDirY*S.gx)/g : 0;
    w.brain.social(S.nb,S.side,S.head,S.tail,dt,social);
  }
}
