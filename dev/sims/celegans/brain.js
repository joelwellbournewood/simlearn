// worm-brain: graded-potential dynamics on the real C. elegans connectome.
// Data: OpenWorm CElegansNeuronTables (White 1986 wiring, Varshney 2011 weights).
// Neurons are non-spiking; model is leaky integrator + sigmoid transfer,
// ohmic gap junctions. Everything beyond the wiring data is tagged MODEL ASSUMPTION.
export const TUNE = {
  tau: 0.12,        // membrane time constant, s
  cmdTau: 0.45,     // command interneurons integrate slowly and hold plateau-like activity (sustained AVA during escape, Kawano 2011)
  gChem: 2.4,       // global chemical gain (weights normalized per neuron)
  gGap: 0.55,       // global gap junction gain
  theta: 0.3,       // sigmoid threshold
  slope: 5.0,       // sigmoid slope
  gProp: 2.6,       // proprioceptive current gain into B/A motor classes
  motorChem: 0.15,   // chem input scale into B/A classes: their bending is proprioceptively dominated (Wen 2012; Boyle 2012)
  propOn: 0.24,     // hysteresis threshold: motor classes are bistable switches (Boyle, Berri, Cohen 2012); a switch flips once per wave, so it cannot double the head's frequency
  propOff: 3,       // sensing region ends this many points anterior of the neuron
  propWa: 1.15,     // weight of anterior bend vs own bend; own-bend NEGATIVE feedback is what makes a latched coil flip itself loose
  propWin: 12,       // curvature sample offset (interior points) ahead/behind
  oscTau: 0.14,     // head oscillator relaxation, s (MODEL ASSUMPTION)
  oscAdapt: 0.7,
  oscAdaptGain: 2.0, // adaptation overshoot destabilizes the fixed point so it oscillates   // head oscillator adaptation, s -> ~0.5 Hz cycle
  oscInh: 1.9,      // mutual inhibition between dorsal/ventral head groups
  oscDrive: 1.0,    // tonic arousal driving the oscillator
  oscToNeuron: 0.9, // oscillator current into SMB/SMD/RMD head neurons
  oscSeed: 0.85,    // direct seed of first 3 muscle rows (MODEL ASSUMPTION)
  tonicF: 0.30,     // tonic drive to AVB/PVC: forward is the default state
  xInh: 1.5,        // AVA<->AVB soft flip-flop cross-inhibition (MODEL ASSUMPTION)
  revDecay: 0.5,    // touch-evoked reversal drive decay, s
  omegaThresh: 0.7, // reversals longer than this end in an omega turn, s
  omegaDur: 0.9,    // omega ventral head bend duration, s
  omegaGain: 1.6,   // RIV/SMDV drive during omega
  senseAdapt: 2.8,  // chemosensory adaptation time constant, s
  senseGain: 6.0,   // dC/dt scaling into ON/OFF cells
  revOnOff: 0.9,    // OFF signal -> AVA drive (pirouette: Pierce-Shimomura 1999)
  klino: 0.5,       // ON suppresses turning amplitude (klinokinesis shortcut)
  gNMJ: 3.2,        // neuromuscular gain
  mSlope: 5.0,      // muscle transfer slope: graded, not clipping (crawl wave is near-sinusoidal, Fang-Yen 2010)
  seedRows: 6,      // oscillator seed tapers over this many anterior rows
  mRise: 0.14,      // muscle activation rise, s (calcium-like)
  mFall: 0.26,      // muscle activation decay, s
  gapRect: 0.08,    // backward conductance of the rectifying command-motor gap junctions
  iGain: 5.0,       // gain on persistent drives (they no longer accumulate frame by frame, which tied behaviour to the frame rate)
  vCap: 2.5,        // graded membrane potentials saturate; unbounded V let saturated motor cells drag the command cells through gap junctions
  inputTau: 0.12,
  gAdapt: 2.1,      // spike-frequency adaptation strength: stops network-wide saturation
  adaptTau: 2.6,    // adaptation time constant, s   // decay of setInput/touch injected currents, s
};
function sig(v){ return 1/(1+Math.exp(-TUNE.slope*(v-TUNE.theta))); }
export class WormBrain {
  constructor(data){
    const N = this.N = data.neurons.length;
    this.names = data.neurons; this.cat = data.cat;
    this.idx = {}; for (let i=0;i<N;i++) this.idx[this.names[i]] = i;
    // CSR for chemical synapses (post <- pre) and gap junctions
    const cin = new Array(N).fill(0);
    for (const [a,b] of data.chem) cin[b]++;
    this.cPtr = new Int32Array(N+1);
    for (let i=0;i<N;i++) this.cPtr[i+1] = this.cPtr[i]+cin[i];
    this.cSrc = new Int32Array(data.chem.length);
    this.cW = new Float32Array(data.chem.length);
    const fill = this.cPtr.slice(0,N);
    const cAbs = new Float32Array(N);
    for (const [a,b,w] of data.chem){ const p=fill[b]++; this.cSrc[p]=a; this.cW[p]=w; cAbs[b]+=Math.abs(w); }
    this.cNorm = new Float32Array(N);
    for (let i=0;i<N;i++) this.cNorm[i] = cAbs[i]>0 ? 1/cAbs[i] : 0; // full normalization: bounded recurrent input, no runaway
    // gap: store both directions
    const gin = new Array(N).fill(0);
    for (const [a,b] of data.gap){ gin[a]++; gin[b]++; }
    this.gPtr = new Int32Array(N+1);
    for (let i=0;i<N;i++) this.gPtr[i+1] = this.gPtr[i]+gin[i];
    this.gSrc = new Int32Array(2*data.gap.length);
    this.gW = new Float32Array(2*data.gap.length);
    const gfill = this.gPtr.slice(0,N); const gAbs = new Float32Array(N);
    for (const [a,b,w] of data.gap){
      let p=gfill[a]++; this.gSrc[p]=b; this.gW[p]=w; gAbs[a]+=w;
      p=gfill[b]++; this.gSrc[p]=a; this.gW[p]=w; gAbs[b]+=w;
    }
    this.gNorm = new Float32Array(N);
    for (let i=0;i<N;i++) this.gNorm[i] = gAbs[i]>0 ? 1/Math.sqrt(gAbs[i]) : 0;
    this._buildMuscles(data); this._buildGroups(); this.reset();
  }
  _buildMuscles(data){
    // nmj entries -> (neuron, side D/V, row 0..23, w). Per-row normalization.
    const dN=[],dR=[],dW=[],vN=[],vR=[],vW=[];
    const dAbs=new Float32Array(24), vAbs=new Float32Array(24);
    for (const [n,m,w] of data.nmj){
      const name=data.muscles[m], row=parseInt(name.slice(3),10)-1;
      if (name[1]==='D'){ dN.push(n);dR.push(row);dW.push(w);dAbs[row]+=Math.abs(w); }
      else { vN.push(n);vR.push(row);vW.push(w);vAbs[row]+=Math.abs(w); }
    }
    this.dN=Int32Array.from(dN); this.dR=Int32Array.from(dR); this.dW=Float32Array.from(dW);
    this.vN=Int32Array.from(vN); this.vR=Int32Array.from(vR); this.vW=Float32Array.from(vW);
    this.dNorm=new Float32Array(24); this.vNorm=new Float32Array(24);
    for (let k=0;k<24;k++){ this.dNorm[k]=dAbs[k]>0?1/dAbs[k]:0; this.vNorm[k]=vAbs[k]>0?1/vAbs[k]:0; }
    // body position of each locomotor motor neuron = NMJ-weighted mean row
    const posSum=new Float32Array(this.N), posW=new Float32Array(this.N);
    for (const [n,m,w] of data.nmj){ const row=parseInt(data.muscles[m].slice(3),10)-1;
      posSum[n]+=Math.abs(w)*(row+0.5)/24; posW[n]+=Math.abs(w); }
    this.bodyPos=new Float32Array(this.N);
    for (let i=0;i<this.N;i++) this.bodyPos[i]=posW[i]>0?posSum[i]/posW[i]:-1;
  }
  _grp(list){ return Int32Array.from(list.filter(n=>n in this.idx).map(n=>this.idx[n])); }
  _buildGroups(){
    this.gAVB=this._grp(['AVBL','AVBR','PVCL','PVCR']);
    this.gAVA=this._grp(['AVAL','AVAR','AVDL','AVDR','AVEL','AVER']);
    this.gHeadD=this._grp(['SMBDL','SMBDR','SMDDL','SMDDR','RMDDL','RMDDR']);
    this.gHeadV=this._grp(['SMBVL','SMBVR','SMDVL','SMDVR','RMDVL','RMDVR']);
    this.gOmega=this._grp(['RIVL','RIVR','SMDVL','SMDVR']);
    this.gTouchA=this._grp(['ALML','ALMR','AVM']);
    this.gTouchP=this._grp(['PLML','PLMR']);
    this.gNose=this._grp(['ASHL','ASHR','FLPL','FLPR']);
    this.gOn=this._grp(['ASEL','AWCL','AWCR']);   // ASEL is the ON cell
    this.gOff=this._grp(['ASER']);                // ASER is the OFF cell
    // classify locomotor classes by name
    const isB=[],isA=[],isDorsal=[];
    for (let i=0;i<this.N;i++){ const n=this.names[i];
      isB.push(/^(DB|VB)\d/.test(n)); isA.push(/^(DA|VA)\d/.test(n)); isDorsal.push(/^D/.test(n)); }
    this.isB=isB; this.isA=isA; this.isDorsal=isDorsal;
    // command interneurons hold state for the length of a run (Pierce-Shimomura
    // 1999 runs last tens of seconds), so they do not adapt either
    this.noAdapt=new Uint8Array(this.N);
    for (const i of this.gAVB) this.noAdapt[i]=1;
    for (const i of this.gAVA) this.noAdapt[i]=1;
  }
  reset(){
    const N=this.N;
    this.V=new Float32Array(N); this.act=new Float32Array(N); this.Iext=new Float32Array(N);
    this.activity=new Float32Array(N);
    this.muscleDorsal=new Float32Array(24); this.muscleVentral=new Float32Array(24);
    this.oscD=0.6; this.oscV=0.1; this.adD=0.3; this.adV=0.05; // asymmetric start seeds the first bend
    this.command=1; this.revTime=0; this.omegaT=0;
    this.cPrev=0; this.cSlow=0; this.on=0; this.off=0; this._t=0;
    this.A=new Float32Array(N); // adaptation state
    this.propS=new Float32Array(N); // bistable proprioceptive switch state, -1/0/+1
    this.Iper=new Float32Array(N); // persistent drives, rebuilt every step (frame-rate independent)
    for (let i=0;i<N;i++) this.act[i]=sig(0);
  }
  setInput(name,v){ const i=this.idx[name]; if (i!==undefined) this.Iext[i]+=v; }
  touch(region,s){
    const g = region==='nose'?this.gNose : region==='posterior'?this.gTouchP : this.gTouchA;
    for (const i of g) this.Iext[i]+=s;
    // MODEL ASSUMPTION: normalization underweights the strong touch->command routes,
    // so part of the touch drive goes to the command group directly
    if (region==='posterior'){ for (const i of this.gAVB) this.Iext[i]+=0.5*s; }
    else { for (const i of this.gAVA) this.Iext[i]+=0.6*s; for (const i of this.gAVB) this.Iext[i]-=0.4*s; }
  }
  chemosense(conc){
    // ON/OFF adaptation: cells respond to change, not level (MODEL ASSUMPTION values)
    this.cSlow += (conc-this.cSlow)*(1/60)/TUNE.senseAdapt;
    const d=(conc-this.cSlow)*TUNE.senseGain;
    this.on = Math.max(0,Math.min(1,d)); this.off = Math.max(0,Math.min(1,-d));
    for (const i of this.gOn) this.Iext[i]+=this.on*0.8;
    for (const i of this.gOff) this.Iext[i]+=this.off*0.8;
  }
  _mean(g){ let s=0; for (const i of g) s+=this.act[i]; return g.length?s/g.length:0; }
  step(dt,curvature){
    const N=this.N, V=this.V, act=this.act, I=this.Iext, T=TUNE;
    const P=this.Iper; P.fill(0); // persistent currents live one step, never accumulate
    this._t+=dt;
    const F=this._mean(this.gAVB), B=this._mean(this.gAVA);
    this.command=(F-B)/(F+B+1e-6);
    // command flip-flop: tonic forward + cross-inhibition (MODEL ASSUMPTION)
    for (const i of this.gAVB) P[i]+=T.tonicF - T.xInh*B*0.9;
    for (const i of this.gAVA) P[i]+=T.revOnOff*this.off - T.xInh*F*0.6;
    // reversal bookkeeping and omega turn on resumption
    if (this.command<-0.08) this.revTime+=dt;
    else { if (this.revTime>T.omegaThresh) this.omegaT=T.omegaDur; this.revTime=0; }
    if (this.omegaT>0){ this.omegaT-=dt; for (const i of this.gOmega) P[i]+=T.omegaGain; }
    // head oscillator: mutual inhibition + adaptation (MODEL ASSUMPTION, Boyle-Cohen style CPG stand-in)
    const turn = Math.max(0.25, 1 - T.klino*this.on + 0.5*this.off); // climbers run straight, descenders cast
    const drv = T.oscDrive*Math.max(F,B*0.9);
    const dD = (-this.oscD + Math.max(0, drv - T.oscInh*this.oscV - this.adD + 0.02))/T.oscTau;
    const dV = (-this.oscV + Math.max(0, drv - T.oscInh*this.oscD - this.adV))/T.oscTau;
    this.oscD+=dD*dt; this.oscV+=dV*dt;
    this.adD+=(T.oscAdaptGain*this.oscD*turn-this.adD)*dt/T.oscAdapt;
    this.adV+=(T.oscAdaptGain*this.oscV*turn-this.adV)*dt/T.oscAdapt;
    const oD=Math.min(1,this.oscD), oV=Math.min(1,this.oscV+(this.omegaT>0?1.2:0));
    for (const i of this.gHeadD) P[i]+=T.oscToNeuron*oD;
    for (const i of this.gHeadV) P[i]+=T.oscToNeuron*oV;
    // proprioception: B cells feel bend anterior to themselves, A cells posterior
    // (Boyle, Berri, Cohen 2012; Wen 2012). Gated by the command groups.
    const NC=curvature.length, gF=Math.max(0,this.command), gB=Math.max(0,-this.command);
    for (let i=0;i<N;i++){
      if (this.bodyPos[i]<0) continue;
      let c=0;
      // signed: bend anterior excites the same side AND inhibits the opposite
      // side, which is what keeps a bend from locking itself in place
      // relative sensing: anterior bend MINUS own bend. A pure standing bend
      // yields zero drive, so a bend cannot hold itself; only a phase-offset
      // (traveling) pattern produces current, and it pulls the wave rearward.
      const own=Math.max(0,Math.min(NC-1,Math.round(this.bodyPos[i]*NC)));
      // stretch receptors integrate over an anterior REGION (~0.2 L, Wen 2012),
      // and the motor classes respond as bistable switches with hysteresis
      // (Boyle, Berri, Cohen 2012): the anterior wave flips them, nothing else
      // Each motor switch is a LOCAL relaxation element: bending its own side
      // past threshold flips it off, and the bend just anterior biases when it
      // flips back on. Negative own-feedback means no coil can hold itself,
      // hysteresis means one flip per wave, the anterior term sets the phase.
      if (this.isB[i]&&gF>0.02){
        if (own<=T.propWin){ c=T.gProp*gF*(this.isDorsal[i]?oD-oV:oV-oD); } // head B-class rides the head oscillator (they receive the head motor circuit), giving the chain a clean source
        else {
        let s=0,m=0;
        for(let j=own-T.propWin;j<own-T.propOff;j++){s+=curvature[j];m++;}
        const sg=(T.propWa*(m?s/m:0)-curvature[own])*(this.isDorsal[i]?1:-1);
        if (sg>T.propOn) this.propS[i]=1; else if (sg<-T.propOn) this.propS[i]=-1;
        c=T.gProp*gF*this.propS[i];
        }
      } else if (this.isA[i]&&gB>0.02){
        if (own>=NC-1-T.propWin){ c=T.gProp*gB*(this.isDorsal[i]?oD-oV:oV-oD); } // reversal wave seeds at the tail and runs forward
        else {
        let s=0,m=0;
        for(let j=own+T.propOff+1;j<=own+T.propWin;j++){s+=curvature[j];m++;}
        const sg=(T.propWa*(m?s/m:0)-curvature[own])*(this.isDorsal[i]?1:-1);
        if (sg>T.propOn) this.propS[i]=1; else if (sg<-T.propOn) this.propS[i]=-1;
        c=T.gProp*gB*this.propS[i];
        }
      }
      P[i]+=c;
    }
    // membrane update
    for (let i=0;i<N;i++){
      let s=0;
      for (let p=this.cPtr[i];p<this.cPtr[i+1];p++) s+=this.cW[p]*act[this.cSrc[p]];
      if (this.isB[i]||this.isA[i]||this.noAdapt[i]) s*=T.motorChem; // proprioception and tonic state, not normalized chatter, drive the motor and command classes
      let g=0;
      for (let p=this.gPtr[i];p<this.gPtr[i+1];p++){
        const src=this.gSrc[p]; let w=this.gW[p];
        // the AVB-B and AVA-A gap junctions are rectifying (UNC-7/UNC-9 innexins,
        // Kawano 2011): drive flows from the command hub into the motor chain,
        // and the swinging motor cells cannot drag the command state around
        if (this.noAdapt[i]&&(this.isB[src]||this.isA[src])) w*=T.gapRect;
        g+=w*(V[src]-V[i]);
      }
      const ga=(this.isB[i]||this.isA[i]||this.noAdapt[i])?0:T.gAdapt; // motor switches and command cells do not adapt (Boyle 2012; Pierce-Shimomura 1999), adaptation made them self-oscillate
      const inp=T.gChem*this.cNorm[i]*s + T.gGap*this.gNorm[i]*g + T.iGain*P[i] + I[i] - ga*this.A[i];
      V[i]+=(-V[i]+inp)*dt/(this.noAdapt[i]?T.cmdTau:T.tau);
      if (V[i]>T.vCap) V[i]=T.vCap; else if (V[i]<-T.vCap) V[i]=-T.vCap; // graded potentials saturate: bounded V keeps gap-junction currents physiological
    }
    const dec=Math.exp(-dt/T.inputTau);
    for (let i=0;i<N;i++){ act[i]=sig(V[i]); this.activity[i]=act[i]; I[i]*=dec; this.A[i]+=(act[i]-this.A[i])*dt/T.adaptTau; }
    // muscles: signed NMJ sums per row (DD/VD arrive negative), calcium-like smoothing
    const md=this._md||(this._md=new Float32Array(24)), mv=this._mv||(this._mv=new Float32Array(24));
    md.fill(0); mv.fill(0);
    for (let e=0;e<this.dN.length;e++) md[this.dR[e]]+=this.dW[e]*act[this.dN[e]];
    for (let e=0;e<this.vN.length;e++) mv[this.vR[e]]+=this.vW[e]*act[this.vN[e]];
    for (let k=0;k<24;k++){
      // dorsoventral differential drive: the two sides of one row share tone,
      // which cancels the structural dorsal excess (AS class has no ventral twin)
      const diff=T.gNMJ*(md[k]*this.dNorm[k]-mv[k]*this.vNorm[k]);
      // graded transfer: real body-wall muscle tone is smooth, and the crawl
      // wave is near-sinusoidal (Fang-Yen 2010), so the map must not clip
      let d=1/(1+Math.exp(-T.mSlope*diff)), v=1/(1+Math.exp(T.mSlope*diff));
      if (k<T.seedRows){ const w=0.5*(1+Math.cos(Math.PI*k/T.seedRows)); // smooth taper, no kink at the seam
        d=Math.min(1,d+T.oscSeed*w*oD); v=Math.min(1,v+T.oscSeed*w*oV); } // seed the wave (MODEL ASSUMPTION)
      const rd=d>this.muscleDorsal[k]?T.mRise:T.mFall, rv=v>this.muscleVentral[k]?T.mRise:T.mFall;
      this.muscleDorsal[k]+=(d-this.muscleDorsal[k])*dt/rd;
      this.muscleVentral[k]+=(v-this.muscleVentral[k])*dt/rv;
    }
  }
}
