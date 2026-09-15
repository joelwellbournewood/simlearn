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
    this.theta.fill(0); this.curvature.fill(0); this.speed=0;
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
      // 4) apply shape + rigid motion: rotate about com by Om*h, translate U*h
      const ang=u[2]*h, ca=Math.cos(ang), sa=Math.sin(ang);
      for (let i=0;i<NP;i++){
        const rx=this.sx[i]-comx, ry=this.sy[i]-comy;
        this.px[i]=comx+rx*ca-ry*sa+u[0]*h;
        this.py[i]=comy+rx*sa+ry*ca+u[1]*h;
      }
      // 5) collisions bend and shift the worm, then re-extract the state
      if (env) env.collide(this,h);
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
  constructor(w,h){ this.w=w;this.h=h;this.foods=[];this.walls=[];this.obstacles=[]; }
  addFood(x,y,amount,radius){ this.foods.push({x,y,amount,amount0:amount,radius}); }
  clearFood(){ this.foods.length=0; }
  addWall(x1,y1,x2,y2){ this.walls.push({x1,y1,x2,y2}); }
  addObstacle(x,y,r){ this.obstacles.push({x,y,r}); }
  clear(){ this.foods.length=0;this.walls.length=0;this.obstacles.length=0; }
  removeAt(x,y){
    let best=null,bd=0.35;
    for (const f of this.foods){const d=Math.hypot(f.x-x,f.y-y);if(d<bd+f.radius*0.5){bd=d;best=['f',f];}}
    for (const o of this.obstacles){const d=Math.hypot(o.x-x,o.y-y)-o.r;if(d<bd){bd=d;best=['o',o];}}
    for (const w of this.walls){const d=this._segDist(x,y,w);if(d<bd){bd=d;best=['w',w];}}
    if(!best)return false;
    const [t,o]=best;
    if(t==='f')this.foods.splice(this.foods.indexOf(o),1);
    if(t==='o')this.obstacles.splice(this.obstacles.indexOf(o),1);
    if(t==='w')this.walls.splice(this.walls.indexOf(o),1);
    return true;
  }
  _segDist(x,y,w){
    const dx=w.x2-w.x1,dy=w.y2-w.y1,L2=dx*dx+dy*dy||1e-9;
    let t=((x-w.x1)*dx+(y-w.y1)*dy)/L2; t=Math.max(0,Math.min(1,t));
    return Math.hypot(x-w.x1-t*dx,y-w.y1-t*dy);
  }
  concentrationAt(x,y){
    let c=0;
    for (const f of this.foods){
      const d2=(f.x-x)*(f.x-x)+(f.y-y)*(f.y-y), s2=2*f.radius*f.radius;
      c+=f.amount*Math.exp(-d2/s2);
    }
    return c;
  }
  consume(x,y,dt,rate){
    let eaten=0;
    for (const f of this.foods){
      const d=Math.hypot(f.x-x,f.y-y);
      if (d<f.radius){
        const e=Math.min(f.amount,rate*dt*(1-d/f.radius));
        f.amount-=e; eaten+=e;
      }
    }
    for (let i=this.foods.length-1;i>=0;i--) if (this.foods[i].amount<0.05*this.foods[i].amount0) this.foods.splice(i,1);
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
      const rec=(nx,ny,depth)=>{
        // side: +1 wall touches the flank the muscles call ventral here,
        // -1 the dorsal flank (sign convention matches theta>0 bends).
        // push: normal approach SPEED (the projection resolves depth each
        // substep, so depth alone is meaningless); 0.5 L/s pins it at 1
        const side=(nx*-ty+ny*tx)>0?1:-1;
        body.contacts.push({i,nx,ny,push:Math.min(1,depth/h/0.5),side});
      };
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
        let t=((px[i]-w.x1)*dx+(py[i]-w.y1)*dy)/L2; t=Math.max(0,Math.min(1,t));
        const cx=w.x1+t*dx,cy=w.y1+t*dy;
        let nx=px[i]-cx,ny=py[i]-cy; const d=Math.hypot(nx,ny);
        if (d<th){ if(d<1e-9){nx=-dy;ny=dx;const L=Math.hypot(nx,ny);nx/=L;ny/=L;}else{nx/=d;ny/=d;}
          rec(nx,ny,th-d);
          px[i]=cx+nx*th; py[i]=cy+ny*th; }
      }
    }
  }
}
