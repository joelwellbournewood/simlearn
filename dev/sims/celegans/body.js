// worm-body: 2D undulatory locomotion by resistive force theory.
// Shape state is the chain of joint angles; muscles drive preferred curvature
// with a first-order lag (muscle-to-shape time constant). World placement per
// substep solves the free-swimmer condition: total anisotropic drag force and
// torque are zero (3x3 linear solve). Only the drag RATIO matters for motion;
// normal drag >> tangential (agar) is what turns wiggle into thrust.
// Sanity: ~0.5 Hz, wavelength ~0.65 L, ratio 12 -> ~0.1-0.3 lengths/s; ratio 1 -> none.
// Body half-width profile (spindle), fraction of body length. Rendering and
// collision share it: the body occupies area, points are not dimensionless.
export function widthAt(s){ return 0.042*Math.pow(Math.sin(Math.PI*Math.min(1,0.12+0.88*s)),0.6)*(1-0.55*s*s*s); }
export const BTUNE = {
  NP: 49,          // body points (48 segments), worm length 1.0
  kmax: 17,        // rad/length at full tetanic contraction; the crawl wave runs at about a third of it, omega turns use the rest
  tauK: 0.6,       // s, muscle-to-bend lag under agar load; this delay is what sets the crawl wavelength (Boyle 2012)
  kBend: 5.0,      // 1/s, bending elasticity: cuticle stiffness smooths curvature along the body
  dragRatio: 80,   // normal/tangential drag; on agar the worm cuts a groove and Cn/Ct is large (Berri 2009), which is why the tail follows the head's path
  sub: 4,          // substeps per frame
  curvSmooth: 0.05,// s, smoothing of curvature output (stretch receptors read it)
  margin: 0.06,    // dish boundary soft margin
  wallTh: 0.035,   // wall half thickness for collision
  // --- contact numerics (run 113). The collision response used to be a bare
  // per-point positional projection, whose displacement then reappeared in the
  // next substep's shape-change velocity (sx-px)/h and was amplified by the
  // drag solve into rigid-body velocities of >20 L/s -- the worm shot through
  // walls. Three guards, all measured in artifacts/celegans-walls-2026-09-16.md:
  colPasses: 2,   // resolve contacts, restore length, resolve again: one pass
                  // leaves residual overlap because the length restoration can
                  // push a point back into a surface
  lenIters: 3,     // Gauss-Seidel passes restoring uniform segment length after
                   // contact, so contact displacement stops being read as shape change
  swept: 1,        // continuous (swept) wall test: a point may not end up on the
                   // far side of a wall it started on this substep
  // Ceilings on the solved rigid-body motion, applied ONLY on the substep after
  // a contact (a contact-free solve is never pathological, and measurement
  // showed a fixed ceiling perturbs free swimming: over 24 worm-min of free
  // locomotion the solve legitimately reaches |U| 3.5 L/s and |Om| 17 rad/s on
  // agar but 25.7 L/s and 74.6 rad/s in water, so the cap has to follow the
  // medium the same log-interpolated way drag and the muscle lag do).
  uMaxAgar: 8.0, uMaxWater: 40.0,     // L/s
  omMaxAgar: 24.0, omMaxWater: 120.0, // rad/s
  wedgeDot: -0.1,  // two contact normals more opposed than this = the point is
                   // wedged in a corner; freeze it instead of letting the two
                   // projections fight (that fight is what pinned the worm in
                   // the dead-end preset once glitching-through was blocked)
  load: 1.0        // medium, 0 water .. 1 agar surface. Drag ratio and the
                   // muscle-to-bend lag both follow it (Berri 2009; Fang-Yen
                   // 2010: as load rises, frequency and wavelength fall)
};
// medium mapping: log-interpolate between water and agar values
export function mediumDrag(load){ return Math.exp(Math.log(2.0)+(Math.log(80)-Math.log(2.0))*load); }
export function mediumTauK(load){ return Math.exp(Math.log(0.055)+(Math.log(0.6)-Math.log(0.055))*load); }
export class WormBody {
  constructor(x,y,angle){
    const NP=BTUNE.NP;
    this.px=new Float32Array(NP); this.py=new Float32Array(NP);
    this.sx=new Float32Array(NP); this.sy=new Float32Array(NP); // scratch shape
    this.qx=new Float32Array(NP); this.qy=new Float32Array(NP); // pre-substep pos
    this.clampHits=0; this._ncPrev=0;
    this.theta=new Float32Array(NP-2);      // joint angles, the shape state
    this.curvature=new Float32Array(NP-2);  // smoothed, normalized output
    this.l0=1/(NP-1);
    this.rad=new Float32Array(NP);
    for (let i=0;i<NP;i++) this.rad[i]=widthAt(i/(NP-1));
    this.contacts=[];
    this.reset(x,y,angle);
  }
  reset(x,y,angle){
    this.baseX=x; this.baseY=y; this.heading=angle+Math.PI; // chain runs tailward
    this.theta.fill(0); this.curvature.fill(0); this.speed=0; this.speedFast=0;
    this.tfx=1; this.tfy=0; this.tsx=1; this.tsy=0; this.turnAng=0;
    this._build(this.px,this.py); this._nose();
    this._comx=this._cx; this._comy=this._cy;
  }
  _build(outx,outy){ // positions from base + heading + joint angles; also com
    const NP=BTUNE.NP,l0=this.l0;
    let a=this.heading, x=this.baseX, y=this.baseY, cx=x, cy=y;
    outx[0]=x; outy[0]=y;
    for (let i=1;i<NP;i++){
      if (i>=2) a+=this.theta[i-2];
      x+=Math.cos(a)*l0; y+=Math.sin(a)*l0;
      outx[i]=x; outy[i]=y; cx+=x; cy+=y;
    }
    this._cx=cx/NP; this._cy=cy/NP;
  }
  _nose(){
    const dx=this.px[0]-this.px[2], dy=this.py[0]-this.py[2];
    const L=Math.hypot(dx,dy)||1e-9;
    this.noseX=this.px[0]; this.noseY=this.py[0];
    this.noseDirX=dx/L; this.noseDirY=dy/L;
  }
  step(dt,dorsal,ventral,env){
    const T=BTUNE, NP=T.NP, l0=this.l0, h=dt/T.sub, ct=1;
    const cn=mediumDrag(T.load), tauK=mediumTauK(T.load);
    this.contacts.length=0;
    for (let s=0;s<T.sub;s++){
      for (let i=0;i<NP;i++){ this.qx[i]=this.px[i]; this.qy[i]=this.py[i]; }
      // 1) muscles pull joint angles toward preferred curvature (first-order lag)
      const g=Math.min(1,h/tauK);
      // stroke depth follows load: the animal crawls deep and swims shallow
      // (curvature amplitude roughly 9/L on agar, 4/L in water, Fang-Yen 2010)
      const kEff=T.kmax*(0.55+0.45*T.load);
      for (let j=0;j<NP-2;j++){
        const r=(j+0.5)/(NP-2)*24, k0=Math.min(23,Math.floor(r)), k1=Math.min(23,k0+1), f=r-k0;
        const act=(dorsal[k0]-ventral[k0])*(1-f)+(dorsal[k1]-ventral[k1])*f;
        this.theta[j]+=(kEff*act*l0-this.theta[j])*g;
      }
      // cuticle bending elasticity: neighbouring segments share curvature,
      // which strips the blocky row-quantized edges off the wave
      const kb=Math.min(0.45,T.kBend*h);
      const t0=this.theta[0];
      let prev=t0;
      for (let j=1;j<NP-3;j++){
        const cur=this.theta[j];
        this.theta[j]+=kb*(prev+this.theta[j+1]-2*cur);
        prev=cur;
      }
      // 2) new shape at old base/heading; shape-change velocity
      this._build(this.sx,this.sy);
      // 3) free swimmer: solve U,V,Omega so net drag force and torque vanish
      let A00=0,A01=0,A02=0,A11=0,A12=0,A20=0,A21=0,A22=0,bx=0,by=0,bt=0;
      const comx=this._cx, comy=this._cy;
      for (let i=0;i<NP;i++){
        let tx,ty;
        if (i===0){tx=this.sx[1]-this.sx[0];ty=this.sy[1]-this.sy[0];}
        else if (i===NP-1){tx=this.sx[i]-this.sx[i-1];ty=this.sy[i]-this.sy[i-1];}
        else {tx=this.sx[i+1]-this.sx[i-1];ty=this.sy[i+1]-this.sy[i-1];}
        const L=Math.hypot(tx,ty)||1e-9; tx/=L;ty/=L;
        const nx=-ty, ny=tx;
        const Cxx=ct*tx*tx+cn*nx*nx, Cxy=ct*tx*ty+cn*nx*ny, Cyy=ct*ty*ty+cn*ny*ny;
        const rx=this.sx[i]-comx, ry=this.sy[i]-comy;
        const px2=-ry, py2=rx; // Omega cross r
        const vsx=(this.sx[i]-this.px[i])/h, vsy=(this.sy[i]-this.py[i])/h;
        A00+=Cxx; A01+=Cxy; A02+=Cxx*px2+Cxy*py2;
        A11+=Cyy; A12+=Cxy*px2+Cyy*py2;
        A20+=rx*Cxy-ry*Cxx; A21+=rx*Cyy-ry*Cxy;
        A22+=rx*(Cxy*px2+Cyy*py2)-ry*(Cxx*px2+Cxy*py2);
        bx+=Cxx*vsx+Cxy*vsy; by+=Cxy*vsx+Cyy*vsy;
        bt+=rx*(Cxy*vsx+Cyy*vsy)-ry*(Cxx*vsx+Cxy*vsy);
      }
      const A10=A01;
      const u=this._solve3(A00,A01,A02,A10,A11,A12,A20,A21,A22,-bx,-by,-bt);
      // safety valve: the 3x3 drag balance goes near-singular when many body
      // points are simultaneously in contact, and an unclamped solve teleports
      // the animal. Real values are |U|~0.25 L/s, |Omega|<=4 rad/s, so these
      // ceilings are inert in free locomotion (verified: legacy benchmark and
      // the 14/14 escape battery byte-identical with them in place).
      if (this._ncPrev>0){
        const uM=Math.exp(Math.log(T.uMaxWater)+(Math.log(T.uMaxAgar)-Math.log(T.uMaxWater))*T.load);
        const oM=Math.exp(Math.log(T.omMaxWater)+(Math.log(T.omMaxAgar)-Math.log(T.omMaxWater))*T.load);
        const sp=Math.hypot(u[0],u[1]);
        if (sp>uM){ u[0]*=uM/sp; u[1]*=uM/sp; this.clampHits++; }
        if (u[2]>oM){ u[2]=oM; this.clampHits++; }
        else if (u[2]<-oM){ u[2]=-oM; this.clampHits++; } }
      // 4) apply shape + rigid motion: rotate about com by Om*h, translate U*h
      const ang=u[2]*h, ca=Math.cos(ang), sa=Math.sin(ang);
      for (let i=0;i<NP;i++){
        const rx=this.sx[i]-comx, ry=this.sy[i]-comy;
        this.px[i]=comx+rx*ca-ry*sa+u[0]*h;
        this.py[i]=comy+rx*sa+ry*ca+u[1]*h;
      }
      // 5) collisions bend and shift the worm, then re-extract the state.
      // qx/qy are where each point was BEFORE this substep's move: the swept
      // wall test needs them to know which side the point came from.
      if (env) for (let cp=0;cp<T.colPasses;cp++){
        this._rec = (cp===0);   // only the first pass reports contacts to the neurons
        const _c0=this.contacts.length;
        env.collide(this,h);
        if (cp===0) this._ncPrev=this.contacts.length-_c0;
        // restore uniform segment length. Without this the projection leaves the
        // chain stretched, and (sx-px)/h next substep reads that stretch as a
        // huge shape-change velocity (the wall glitch-through bug).
        // gated on there actually being a contact: with no contact the chain is
        // already exactly uniform, and running the sweep anyway perturbs free
        // locomotion at float32 level, which this chaotic model amplifies
        // (measured: 60 s free swim path speed 0.510 -> 0.492 L/s).
        if (this.contacts.length>_c0 || cp>0){
          // Centroid-preserving, direction-alternating Gauss-Seidel. Both
          // properties are load-bearing, not cosmetics: a plain head-to-tail
          // sweep is biased along the body axis, so it injects a small spurious
          // translation on every contact frame, and with two collision passes
          // that bias measurably wrecked chemotaxis (1-3 of 6 food patches
          // found against 4-5 of 6; fixed, see artifacts/celegans-walls-2026-09-16.md).
          let gx0=0,gy0=0; for(let i=0;i<NP;i++){gx0+=this.px[i];gy0+=this.py[i];}
          for (let it=0; it<T.lenIters; it++){
            if (it&1){
              for (let i=NP-2;i>=0;i--){
                const dx=this.px[i+1]-this.px[i], dy=this.py[i+1]-this.py[i];
                const d=Math.hypot(dx,dy)||1e-9, c=(d-l0)/d*0.5;
                const ax=dx*c, ay=dy*c;
                this.px[i]+=ax; this.py[i]+=ay; this.px[i+1]-=ax; this.py[i+1]-=ay;
              }
            } else {
              for (let i=0;i<NP-1;i++){
                const dx=this.px[i+1]-this.px[i], dy=this.py[i+1]-this.py[i];
                const d=Math.hypot(dx,dy)||1e-9, c=(d-l0)/d*0.5;
                const ax=dx*c, ay=dy*c;
                this.px[i]+=ax; this.py[i]+=ay; this.px[i+1]-=ax; this.py[i+1]-=ay;
              }
            }
          }
          let gx1=0,gy1=0; for(let i=0;i<NP;i++){gx1+=this.px[i];gy1+=this.py[i];}
          const sx2=(gx0-gx1)/NP, sy2=(gy0-gy1)/NP;
          if (sx2||sy2) for(let i=0;i<NP;i++){ this.px[i]+=sx2; this.py[i]+=sy2; }
        }
      }
      this.baseX=this.px[0]; this.baseY=this.py[0];
      this.heading=Math.atan2(this.py[1]-this.py[0],this.px[1]-this.px[0]);
      let a=this.heading;
      for (let j=0;j<NP-2;j++){
        const b=Math.atan2(this.py[j+2]-this.py[j+1],this.px[j+2]-this.px[j+1]);
        let dth=b-a; while(dth>Math.PI)dth-=2*Math.PI; while(dth<-Math.PI)dth+=2*Math.PI;
        this.theta[j]=dth; a=b;
      }
    }
    // outputs
    const aa=Math.min(1,dt/BTUNE.curvSmooth);
    for (let j=0;j<BTUNE.NP-2;j++)
      this.curvature[j]+=(this.theta[j]/(this.l0*BTUNE.kmax)-this.curvature[j])*aa;
    this._build(this.sx,this.sy); // refresh com
    const v=Math.hypot(this._cx-this._comx,this._cy-this._comy)/dt;
    this.speed+=(v-this.speed)*Math.min(1,dt/0.5);
    // a shorter-smoothed copy, only for the readouts: the 0.5 s constant above
    // made the 'still' state on the chart appear half a second after the
    // animal had visibly stopped
    this.speedFast+=(v-this.speedFast)*Math.min(1,dt/0.15);
    // Track direction of the centre of mass, smoothed twice. The angle
    // between the fast copy and the slow one is how sharply the animal is
    // curving, which is what separates a straight run from a gradual
    // steering turn (weathervaning / klinotaxis, Iino & Yoshida 2009) - a
    // reorientation that happens with no reversal at all and so has no
    // command-state signature.
    if (v>1e-4){
      const inv=1/Math.hypot(this._cx-this._comx,this._cy-this._comy);
      const ux=(this._cx-this._comx)*inv, uy=(this._cy-this._comy)*inv;
      const af=Math.min(1,dt/0.5), as=Math.min(1,dt/1.6);
      this.tfx+=(ux-this.tfx)*af; this.tfy+=(uy-this.tfy)*af;
      this.tsx+=(ux-this.tsx)*as; this.tsy+=(uy-this.tsy)*as;
    }
    this.turnAng=Math.atan2(this.tsx*this.tfy-this.tsy*this.tfx,
                            this.tfx*this.tsx+this.tfy*this.tsy);
    this._comx=this._cx; this._comy=this._cy;
    this._nose();
  }
  _solve3(a,b,c,d2,e,f,g2,h2,i2,x,y,z){
    const det=a*(e*i2-f*h2)-b*(d2*i2-f*g2)+c*(d2*h2-e*g2)||1e-12;
    return [ (x*(e*i2-f*h2)-b*(y*i2-f*z)+c*(y*h2-e*z))/det,
             (a*(y*i2-f*z)-x*(d2*i2-f*g2)+c*(d2*z-y*g2))/det,
             (a*(e*z-y*h2)-b*(d2*z-y*g2)+x*(d2*h2-e*g2))/det ];
  }
}
export class Environment {
  // Food is a lawn of individual particles, like a real bacterial patch:
  // dense at the centre, thinning outward. Every particle is a hidden
  // chemotactic source; the worm eats them one by one, and where it grazes,
  // both the food and its scent disappear. On top of the particle scent sits
  // a long shallow plume (the diffusion tail a patch grows on real agar),
  // which is what lets the worm smell dinner from across the dish.
  constructor(w,h){ this.w=w;this.h=h;this.foods=[];this.walls=[];this.obstacles=[];this.stamp=0;
    // geoStamp changes only when the GEOMETRY does (a patch added or removed, a
    // wall drawn). Eating changes f.amount, which scales the plume without
    // moving it, so the distance fields survive and nothing is rebuilt.
    this.geoStamp=1; this.geoBuilt=0; this.fields=[]; }
  addFood(x,y,amount,radius){
    let seed=((this.foods.length+1)*2654435761 ^ Math.floor(x*997)*40503 ^ Math.floor(y*991))>>>0;
    const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const M=Math.max(20,Math.round(56*amount));
    const parts=[];
    for(let k=0;k<M;k++){
      const u=Math.max(1e-6,rnd()), v=rnd();
      const rr=Math.abs(Math.sqrt(-2*Math.log(u))*Math.cos(6.28318*v))*radius*0.5;
      const th=rnd()*6.28318;
      parts.push({x:x+Math.cos(th)*rr, y:y+Math.sin(th)*rr, a:amount/M, a0:amount/M, sz:1+Math.floor(rnd()*3)});
    }
    // halo: precomputed dither points that draw the scent plume, density
    // falling with distance exactly as the concentration does
    const halo=[];
    for(let k=0;k<70;k++){
      const rr=radius*0.6-Math.log(Math.max(1e-6,rnd()))*0.34, th=rnd()*6.28318;
      halo.push({x:x+Math.cos(th)*rr, y:y+Math.sin(th)*rr, d:rr});
    }
    this.foods.push({x,y,radius,amount,amount0:amount,parts,halo});
    this.stamp++; this.geoStamp++;
  }
  clearFood(){ this.foods.length=0; this.stamp++; this.geoStamp++; }
  addWall(x1,y1,x2,y2){ this.walls.push({x1,y1,x2,y2}); this.geoStamp++; }
  addObstacle(x,y,r){ this.obstacles.push({x,y,r}); this.geoStamp++; }
  clear(){ this.foods.length=0;this.walls.length=0;this.obstacles.length=0; this.stamp++; this.geoStamp++; }
  removeAt(x,y){
    let best=null,bd=0.35;
    for (const f of this.foods){const d=Math.hypot(f.x-x,f.y-y);if(d<bd+f.radius*0.5){bd=d;best=['f',f];}}
    for (const o of this.obstacles){const d=Math.hypot(o.x-x,o.y-y)-o.r;if(d<bd){bd=d;best=['o',o];}}
    for (const w of this.walls){const d=this._segDist(x,y,w);if(d<bd){bd=d;best=['w',w];}}
    if(!best)return false;
    const [t,o]=best;
    if(t==='f'){this.foods.splice(this.foods.indexOf(o),1);this.stamp++;}
    if(t==='o')this.obstacles.splice(this.obstacles.indexOf(o),1);
    if(t==='w')this.walls.splice(this.walls.indexOf(o),1);
    this.geoStamp++;
    return true;
  }
  _segDist(x,y,w){
    const dx=w.x2-w.x1,dy=w.y2-w.y1,L2=dx*dx+dy*dy||1e-9;
    let t=((x-w.x1)*dx+(y-w.y1)*dy)/L2; t=Math.max(0,Math.min(1,t));
    return Math.hypot(x-w.x1-t*dx,y-w.y1-t*dy);
  }
  // ---- the smellscape --------------------------------------------------
  // Odour from a bacterial patch reaches a point by DIFFUSING there, and a
  // barrier is solid to molecules exactly as it is to the animal. So the
  // concentration a nose feels falls off with the length of the shortest path
  // that stays in the open agar, not with the straight line through the
  // plastic. That path is computed once per scene as a geodesic distance
  // field per food source (Dijkstra on a fine grid with a 16-neighbour
  // stencil, which is within about 1% of true Euclidean distance), then
  // sampled bilinearly. Inside a corridor the gradient therefore points at
  // the OPENING, and a corner leaks no smell at all.
  _cellSize(){ return Math.min(this.w,this.h)/100; }
  _buildFields(){
    const cs=this._cellSize();
    const GX=Math.max(16,Math.round(this.w/cs)), GY=Math.max(16,Math.round(this.h/cs));
    this.GX=GX; this.GY=GY; this.cs=cs;
    // blocked mask: a band ~3.4 cells wide around every wall, and the discs
    const N=GX*GY, blk=new Uint8Array(N);
    const band=Math.max(0.085,cs*1.7);
    for (let j=0;j<GY;j++) for (let i=0;i<GX;i++){
      const x=(i+0.5)*cs, y=(j+0.5)*cs;
      let b=0;
      for (const w of this.walls) if (this._segDist(x,y,w)<band){ b=1; break; }
      if (!b) for (const o of this.obstacles) if (Math.hypot(x-o.x,y-o.y)<o.r+cs){ b=1; break; }
      blk[j*GX+i]=b;
    }
    this.blk=blk;
    // 16-neighbour stencil. The knight steps need their two intervening cells
    // open or smell would hop a thin wall.
    const ST=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],
              [1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
    const VIA=ST.map(([dx,dy])=>{
      if (Math.abs(dx)+Math.abs(dy)<=2) return [];
      return [[dx- (dx>0?1:dx<0?-1:0)*(Math.abs(dx)>1?1:0), dy-(dy>0?1:dy<0?-1:0)*(Math.abs(dy)>1?1:0)],
              [(Math.abs(dx)>1?(dx>0?1:-1):dx), (Math.abs(dy)>1?(dy>0?1:-1):dy)]];
    });
    const COST=ST.map(([dx,dy])=>Math.hypot(dx,dy)*cs);
    this.fields=[];
    for (const f of this.foods) this.fields.push(this._dijkstra(f,blk,GX,GY,cs,ST,VIA,COST));
    this.geoBuilt=this.geoStamp;
  }
  _dijkstra(f,blk,GX,GY,cs,ST,VIA,COST){
    // Float64, not Float32: the heap key must compare EXACTLY equal to the stored
    // distance or the lazy-deletion test (d>D[k]) throws away good entries
    const N=GX*GY, D=new Float64Array(N).fill(Infinity);
    // lazy-deletion heap: a cell is re-pushed every time it improves, so the
    // heap can hold more entries than there are cells and has to grow
    let cap=N+2, hk=new Float64Array(cap), hv=new Int32Array(cap), hn=0;
    const grow=()=>{ cap*=2; const a=new Float64Array(cap),b=new Int32Array(cap);
      a.set(hk); b.set(hv); hk=a; hv=b; };
    const push=(k,d)=>{ if (hn+2>=cap) grow(); let i=++hn; hk[i]=d; hv[i]=k;
      while(i>1){const p=i>>1; if(hk[p]<=hk[i])break; const a=hk[p],b=hv[p];hk[p]=hk[i];hv[p]=hv[i];hk[i]=a;hv[i]=b;i=p;} };
    const pop=()=>{ const top=hv[1], d=hk[1]; hk[1]=hk[hn];hv[1]=hv[hn];hn--;
      let i=1; for(;;){ const l=i<<1,r=l|1; let m=i;
        if(l<=hn&&hk[l]<hk[m])m=l; if(r<=hn&&hk[r]<hk[m])m=r; if(m===i)break;
        const a=hk[m],b=hv[m];hk[m]=hk[i];hv[m]=hv[i];hk[i]=a;hv[i]=b;i=m; }
      return [top,d]; };
    // seed: every grid cell the patch itself covers, at its own distance from
    // the centre, so a wide patch is a wide source and not a point
    const r0=f.radius*0.9;
    const i0=Math.max(0,Math.floor((f.x-r0)/cs)), i1=Math.min(GX-1,Math.ceil((f.x+r0)/cs));
    const j0=Math.max(0,Math.floor((f.y-r0)/cs)), j1=Math.min(GY-1,Math.ceil((f.y+r0)/cs));
    let seeded=0;
    for (let j=j0;j<=j1;j++) for (let i=i0;i<=i1;i++){
      const k=j*GX+i; if (blk[k]) continue;
      const d=Math.hypot((i+0.5)*cs-f.x,(j+0.5)*cs-f.y);
      if (d<=r0){ D[k]=d; push(k,d); seeded++; }
    }
    if (!seeded){ // patch sits on top of a wall: seed its nearest open cell
      let best=-1,bd=1e9;
      for (let k=0;k<N;k++){ if(blk[k])continue;
        const d=Math.hypot((k%GX+0.5)*cs-f.x,((k/GX|0)+0.5)*cs-f.y); if(d<bd){bd=d;best=k;} }
      if (best<0) return D;
      D[best]=bd; push(best,bd);
    }
    while (hn){
      const [k,d]=pop(); if (d>D[k]) continue;
      const i=k%GX, j=(k/GX)|0;
      for (let s=0;s<ST.length;s++){
        const ni=i+ST[s][0], nj=j+ST[s][1];
        if (ni<0||nj<0||ni>=GX||nj>=GY) continue;
        const nk=nj*GX+ni; if (blk[nk]) continue;
        const via=VIA[s]; let ok=true;
        for (let v=0;v<via.length;v++){
          const vi=i+via[v][0], vj=j+via[v][1];
          if (vi<0||vj<0||vi>=GX||vj>=GY||blk[vj*GX+vi]){ ok=false; break; }
        }
        if (!ok) continue;
        const nd=d+COST[s];
        if (nd<D[nk]){ D[nk]=nd; push(nk,nd); }
      }
    }
    return D;
  }
  // geodesic distance from food #fi to (x,y), bilinear, Infinity if walled off
  _geoDist(fi,x,y){
    const GX=this.GX, GY=this.GY, cs=this.cs, D=this.fields[fi];
    let fx=x/cs-0.5, fy=y/cs-0.5;
    let i=Math.floor(fx), j=Math.floor(fy);
    const tx=fx-i, ty=fy-j;
    const cl=(v,m)=>v<0?0:(v>m?m:v);
    const a=D[cl(j,GY-1)*GX+cl(i,GX-1)], b=D[cl(j,GY-1)*GX+cl(i+1,GX-1)],
          c=D[cl(j+1,GY-1)*GX+cl(i,GX-1)], d=D[cl(j+1,GY-1)*GX+cl(i+1,GX-1)];
    if (isFinite(a)&&isFinite(b)&&isFinite(c)&&isFinite(d))
      return (a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty;
    // a corner inside a wall: use the open ones, nudged outward so the
    // gradient still pushes away from the plastic
    let m=Infinity; for (const v of [a,b,c,d]) if (v<m) m=v;
    return isFinite(m)? m+cs : Infinity;
  }
  concentrationAt(x,y){
    if (this.geoBuilt!==this.geoStamp) this._buildFields();
    let c=0;
    const s2=2*0.09*0.09, K=0.09;
    for (let fi=0;fi<this.foods.length;fi++){
      const f=this.foods[fi];
      const g=this._geoDist(fi,x,y);
      if (isFinite(g)) c+=f.amount*0.30*Math.exp(-g/1.25);   // long diffusion plume
      if (Math.hypot(f.x-x,f.y-y)<f.radius*2.2+0.35){        // particle-scale structure
        for (const p of f.parts){ if(p.a<=0) continue;
          const dd=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
          if (dd<0.3) c+=p.a*K*Math.exp(-dd/s2)*56;
        }
      }
    }
    return c;
  }
  // particle-local density only: gates eating and the dopamine cells, which
  // in the animal feel bacteria mechanically under the body, not their smell
  localFoodAt(x,y){
    let c=0;
    for (const f of this.foods){
      if (Math.hypot(f.x-x,f.y-y)>f.radius*2.2+0.2) continue;
      for (const p of f.parts){ if(p.a<=0) continue;
        const dd=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
        if (dd<0.018) c+=p.a*56;
      }
    }
    return c;
  }
  consume(x,y,dt,rate){
    let eaten=0;
    for (const f of this.foods){
      if (Math.hypot(f.x-x,f.y-y)>f.radius*2.2+0.2) continue;
      for (const p of f.parts){ if(p.a<=0) continue;
        const d=Math.hypot(p.x-x,p.y-y);
        if (d<0.08){ const e=Math.min(p.a,rate*dt); p.a-=e; eaten+=e; }
      }
      let s=0; for (const p of f.parts) s+=p.a; 
      if (Math.abs(s-f.amount)>1e-9){ f.amount=s; this.stamp++; }
    }
    for (let i=this.foods.length-1;i>=0;i--)
      if (this.foods[i].amount<0.03*this.foods[i].amount0){ this.foods.splice(i,1); this.stamp++; this.geoStamp++; }
    return eaten;
  }
  collide(body,h){
    const T=BTUNE, NP=T.NP, px=body.px, py=body.py, mg=T.margin;
    for (let i=0;i<NP;i++){
      const r=body.rad[i], me=mg+r*0.5;
      // body tangent, for the contact's side (which flank touched the wall)
      const im=Math.max(0,i-1), ip=Math.min(NP-1,i+1);
      let tx=px[ip]-px[im], ty=py[ip]-py[im];
      const tl=Math.hypot(tx,ty)||1e-9; tx/=tl; ty/=tl;
      const an=[]; let wedged=false;
      const rec=(nx,ny,depth)=>{
        for (const a of an) if (a[0]*nx+a[1]*ny < T.wedgeDot) wedged=true;
        an.push([nx,ny]);
        // side: +1 wall touches the flank the muscles call ventral here,
        // -1 the dorsal flank (sign convention matches theta>0 bends).
        // push: normal approach SPEED (the projection resolves depth each
        // substep, so depth alone is meaningless); 0.5 L/s pins it at 1
        const side=(nx*-ty+ny*tx)>0?1:-1;
        if (body._rec!==false) body.contacts.push({i,nx,ny,push:Math.min(1,depth/h/0.5),side});
      };
      const wedgeCheck=()=>{ if (wedged && body.qx){ px[i]=body.qx[i]; py[i]=body.qy[i]; } };
      if (px[i]<me){ rec(1,0,me-px[i]); px[i]=me; }
      if (px[i]>this.w-me){ rec(-1,0,px[i]-(this.w-me)); px[i]=this.w-me; }
      if (py[i]<me){ rec(0,1,me-py[i]); py[i]=me; }
      if (py[i]>this.h-me){ rec(0,-1,py[i]-(this.h-me)); py[i]=this.h-me; }
      for (const o of this.obstacles){
        const dx=px[i]-o.x,dy=py[i]-o.y,d=Math.hypot(dx,dy),rr=o.r+r;
        if (d<rr){ const nx=dx/(d||1e-9),ny=dy/(d||1e-9); rec(nx,ny,rr-d);
          px[i]=o.x+nx*rr; py[i]=o.y+ny*rr; }
      }
      for (const w of this.walls){
        const th=T.wallTh+r;
        const dx=w.x2-w.x1,dy=w.y2-w.y1,L2=dx*dx+dy*dy||1e-9;
        let t=((px[i]-w.x1)*dx+(py[i]-w.y1)*dy)/L2;
        const tc=Math.max(0,Math.min(1,t));
        const cx=w.x1+tc*dx,cy=w.y1+tc*dy;
        let nx=px[i]-cx,ny=py[i]-cy; let d=Math.hypot(nx,ny);
        // swept guard: which side did this point occupy before the move? A wall
        // is only ~0.07 wide, so a fast substep can step clean over it; the
        // plain nearest-surface projection then happily resolves it on the FAR
        // side and the worm is through. Signed side against the wall line.
        let flipped=false;
        if (T.swept && body.qx){
          const wnx=-dy, wny=dx, wL=Math.hypot(wnx,wny)||1e-9;
          const s0=((body.qx[i]-w.x1)*wnx+(body.qy[i]-w.y1)*wny)/wL;
          const s1=((px[i]-w.x1)*wnx+(py[i]-w.y1)*wny)/wL;
          let t0=((body.qx[i]-w.x1)*dx+(body.qy[i]-w.y1)*dy)/L2;
          if (s0*s1<0 && Math.abs(s0)>1e-7 &&
              t0>-0.05 && t0<1.05 && t>-0.05 && t<1.05){
            // came from the s0 side: put it back on that side, at the surface
            const sg=s0>0?1:-1;
            nx=sg*wnx/wL; ny=sg*wny/wL;
            px[i]=w.x1+tc*dx+nx*th; py[i]=w.y1+tc*dy+ny*th;
            rec(nx,ny,th+Math.abs(s1)); flipped=true;
          }
        }
        if (!flipped && d<th){ if(d<1e-9){nx=-dy;ny=dx;const L=Math.hypot(nx,ny);nx/=L;ny/=L;}else{nx/=d;ny/=d;}
          rec(nx,ny,th-d);
          px[i]=cx+nx*th; py[i]=cy+ny*th; }
      }
      wedgeCheck();
    }
  }
}
