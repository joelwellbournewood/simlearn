// worm-brain: graded-potential dynamics on the real C. elegans connectome.
// Data: Cook 2019 whole-animal wiring via the OpenWorm Connectome Toolbox (cect),
// transmitters per connection from Wang 2024 (eLife 95402), synapse signs from
// Fenyves 2020 receptor predictions, extrasynaptic amines from Bentley 2016.
// Neurons are non-spiking; model is leaky integrator + sigmoid transfer,
// ohmic gap junctions. Everything beyond the wiring data is tagged MODEL ASSUMPTION.
export const TUNE = {
  tau: 0.12,        // membrane time constant, s
  cmdTau: 0.45,     // command interneurons integrate slowly and hold plateau-like activity (sustained AVA during escape, Kawano 2011)
  gChem: 2.4,       // global chemical gain (weights normalized per neuron)
  gGap: 0.55,       // global gap junction gain
  theta: 0.3,       // sigmoid threshold
  slope: 5.0,       // sigmoid slope
  gProp: 2.4,       // proprioceptive current gain into B/A motor classes
  motorChem: 0.15,   // chem input scale into B/A classes: their bending is proprioceptively dominated (Wen 2012; Boyle 2012)
  pepGain: -1.5,     // extrasynaptic neuropeptide layer (Ripoll-Sanchez 2023 short-range model): signed global gain, calibrated against half the Randi 2023 atlas
  pepTauAct: 2.0,    // s, dense-core release follows activity slowly
  pepTauBase: 30.0,  // s, GPCR pathways adapt; the layer signals change, not tonic level
  propOn: 0.24,     // hysteresis threshold: motor classes are bistable switches (Boyle, Berri, Cohen 2012); a switch flips once per wave, so it cannot double the head's frequency
  propOff: 3,       // sensing region ends this many points anterior of the neuron
  propWa: 1.15,     // weight of anterior bend vs own bend; own-bend NEGATIVE feedback is what makes a latched coil flip itself loose
  propWin: 12,       // curvature sample offset (interior points) ahead/behind
  oscTau: 0.14,     // head oscillator relaxation, s (MODEL ASSUMPTION)
  oscAdapt: 0.7,
  oscAdaptGain: 2.0, // adaptation overshoot destabilizes the fixed point so it oscillates   // head oscillator adaptation, s -> ~0.5 Hz cycle
  oscInh: 1.9,      // mutual inhibition between dorsal/ventral head groups
  oscDrive: 0.86,    // tonic arousal driving the oscillator (retuned with the peptide layer on, run 105)
  oscToNeuron: 0.82, // oscillator current into SMB/SMD/RMD head neurons
  oscSeed: 0.92,    // direct seed of first 3 muscle rows (MODEL ASSUMPTION)
  tonicF: 0.30,     // tonic drive to AVB/PVC: forward is the default state
  xInh: 1.5,        // AVA<->AVB soft flip-flop cross-inhibition (MODEL ASSUMPTION)
  revDecay: 0.5,    // touch-evoked reversal drive decay, s
  omegaThresh: 0.7, // reversals longer than this end in an omega turn, s
  omegaDur: 1.5,    // omega ventral head bend duration, s
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
  // --- mechanotransduction from the environment (run 102) ---
  noseGain: 2.8,    // head-on collision drive into ASH/FLP/OLQ (Kaplan and Horvitz 1993); recalibrated after the peptide layer damped ASH/FLP (run 105)
  habTau: 14.0,      // nose touch habituation recovery, s (response fades under a held stimulus)
  habRate: 1.35,     // how fast a sustained bump wears the response down
  wdGain: 2.2,      // side-of-nose contact: OLQ/IL1 head withdrawal (Hart 1995)
  wdTau: 0.3,       // withdrawal bias decay, s
  wallGain: 0.35,   // sustained body contact into ALM/AVM, below reversal threshold:
                    // entrainment along obstacles runs through body touch cells, not the nose
  // --- RIM, the tyramine cell (Alkema 2005; Pirri 2009; LGC-55) ---
  rimDrive: 0.9,    // AVA drives RIM (gap junctions in the wiring; this term keeps it reliable)
  rimOsc: 0.9,      // fraction of head-oscillator output the tyramine shuts off during backing
  tyrGain: 1.8,     // RIM inhibits AVB, which is what stretches escape reversals out
  // --- foraging nose casts (Hart 1995: OLQ/IL1 -> RMD rhythm) ---
  forageAmp: 0.4,   // small fast dorsoventral flicks of the nose during forward runs
  klGain: 0.9,      // klinotaxis: if scent rises while the head is bent one way,
                    // keep bending that way (Iino and Yoshida 2009, ASE -> RIA)
  forageHz: 1.5,    // MODEL ASSUMPTION: the animal's flicks are irregular, a few Hz
  dopaSlow: 0.38,   // basal slowing response: dopaminergic CEP/ADE/PDE feel the
                    // texture of bacteria and slow the crawl on food (Sawin 2000);
                    // routed extrasynaptically (Bentley 2016 amine connectome)
  dopaTau: 1.6,     // dopamine builds and washes out over seconds
  serSlow: 0.18,    // serotonergic NSM fires while feeding and deepens the slowdown
  gMGJ: 0.08,       // electrical coupling between neighbouring muscle cells (Cook 2019):
                    // smooths the activation wave; without it the whole-animal NMJ table
                    // leaves the crawl waveform ragged (measured: purity 0.65 -> 0.91)
  load: 1.0,        // medium, 0 water .. 1 agar; the head oscillator slows under load
                    // (Fang-Yen 2010; in the animal this emerges from mechanics, and the
                    // stand-in oscillator has to be told - MODEL ASSUMPTION)
};
function sig(v){ return 1/(1+Math.exp(-TUNE.slope*(v-TUNE.theta))); }
function gFcast(b){ return Math.max(0,b.command); }
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
    // extrasynaptic neuropeptide layer: Ripoll-Sanchez et al. 2023 short-range
    // model via OpenWorm cect; weight = number of distinct NPP-GPCR pathways
    if (data.pep){
      const pin = new Array(N).fill(0);
      for (const [a,b] of data.pep) pin[b]++;
      this.pPtr = new Int32Array(N+1);
      for (let i=0;i<N;i++) this.pPtr[i+1] = this.pPtr[i]+pin[i];
      this.pSrc = new Int32Array(data.pep.length);
      this.pW = new Float32Array(data.pep.length);
      const pfill = this.pPtr.slice(0,N); const pAbs = new Float32Array(N);
      // the locomotor pattern classes are excluded as peptide SENDERS as well:
      // their coherent gait-locked oscillation would broadcast a rhythmic
      // signal the immobilized-worm recordings that calibrate this layer
      // cannot see, and phasic release is not what dense-core vesicles do best
      const pattS=/^(DA|DB|VA|VB|DD|VD|AS)\d/, headMS=/^(SMB|SMD|RMD|RIV)/;
      for (const [a,b,w] of data.pep){
        const ws=(pattS.test(data.neurons[a])||headMS.test(data.neurons[a]))?0:w;
        const p=pfill[b]++; this.pSrc[p]=a; this.pW[p]=ws; pAbs[b]+=ws;
      }
      this.pNorm = new Float32Array(N);
      for (let i=0;i<N;i++) this.pNorm[i] = pAbs[i]>0 ? 1/pAbs[i] : 0;
      this.actS = new Float32Array(N); this.pepIn = new Float32Array(N); this.pepB = new Float32Array(N);
    }
    this._buildMuscles(data); this._buildGroups();
    // peptide gate: the locomotor pattern system (cord motor classes, command
    // cells, head motor cells) keeps its tuned dynamics; the fitted global
    // peptide inhibition acts on the sensory and interneuron layers, which is
    // where the Randi 2023 evidence for it comes from (head-ganglia recordings)
    this.pepGate=new Float32Array(N).fill(1);
    const patt=/^(DA|DB|VA|VB|DD|VD|AS)\d/, headM=/^(SMB|SMD|RMD|RIV)/;
    for (let i=0;i<N;i++){
      if (patt.test(this.names[i])||headM.test(this.names[i])||this.noAdapt[i]) this.pepGate[i]=0;
    }
    this.reset();
  }
  _buildMuscles(data){
    // nmj entries -> (neuron, side D/V, row 0..23, w). Per-row normalization.
    const dN=[],dR=[],dW=[],vN=[],vR=[],vW=[];
    const dAbs=new Float32Array(24), vAbs=new Float32Array(24);
    // The whole-animal NMJ table (Cook 2019) includes junctions from cells with
    // no patterned activity model here (SAB, SIA/SIB sublaterals, URA/IL1, RMG...).
    // MODEL ASSUMPTION: cells outside the ventral-cord locomotor classes and the
    // head motor system contribute muscle TONE, not the phasic wave, so their
    // drive is scaled down rather than allowed to inject DC into the bend.
    const phasic=/^(DA|DB|VA|VB|DD|VD|AS)\d/, headM=/^(SMB|SMD|RMD|RIV)/;
    for (const [n,m,w0] of data.nmj){
      const name=data.muscles[m], row=parseInt(name.slice(3),10)-1;
      const nm=data.neurons[n];
      const w=w0*(phasic.test(nm)||headM.test(nm)?1:0.15);
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
    // Muscle-to-muscle gap junctions (Cook 2019): neighbouring body wall muscle
    // cells in a quadrant are electrically coupled, which smooths the wave of
    // activation as it travels. Stored as row-pair couplings per side.
    this.mgjD=[]; this.mgjV=[];
    if (data.mgj) for (const [m1,m2,w] of data.mgj){
      const n1=data.muscles[m1], n2=data.muscles[m2];
      const r1=parseInt(n1.slice(3),10)-1, r2=parseInt(n2.slice(3),10)-1;
      if (r1===r2) continue;
      if (n1[1]==='D'&&n2[1]==='D') this.mgjD.push([r1,r2,w]);
      else if (n1[1]==='V'&&n2[1]==='V') this.mgjV.push([r1,r2,w]);
    }
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
    this.gOLQ=this._grp(['OLQDL','OLQDR','OLQVL','OLQVR']);
    this.gWdD=this._grp(['OLQDL','OLQDR','IL1DL','IL1DR']);
    this.gWdV=this._grp(['OLQVL','OLQVR','IL1VL','IL1VR']);
    this.gBodyA=this._grp(['ALML','ALMR','AVM']);
    this.gRIM=this._grp(['RIML','RIMR']);
    this.gDopaA=this._grp(['CEPDL','CEPDR','CEPVL','CEPVR','ADEL','ADER']); // head dopamine
    this.gDopaP=this._grp(['PDEL','PDER']);                                  // tail dopamine
    this.gNSM=this._grp(['NSML','NSMR']);                                    // serotonergic, fires while feeding
    this.gOn=this._grp(['ASEL','AWCL','AWCR']);   // ASEL is the ON cell
    this.gOff=this._grp(['ASER']);                // ASER is the OFF cell
    // classify locomotor classes by name
    const isB=[],isA=[],isAS=[],isDorsal=[];
    for (let i=0;i<this.N;i++){ const n=this.names[i];
      isB.push(/^(DB|VB)\d/.test(n)); isA.push(/^(DA|VA)\d/.test(n));
      isAS.push(/^AS\d/.test(n)); // AS class: dorsal-only cholinergic motor neurons,
      // active during forward AND backward locomotion, keepers of dorsoventral
      // balance (Tolstenkov 2018); modeled as dorsal proprioceptive switches
      isDorsal.push(/^D/.test(n)||/^AS\d/.test(n)); }
    this.isB=isB; this.isA=isA; this.isAS=isAS; this.isDorsal=isDorsal;
    // command interneurons hold state for the length of a run (Pierce-Shimomura
    // 1999 runs last tens of seconds), so they do not adapt either
    this.noAdapt=new Uint8Array(this.N);
    for (const i of this.gAVB) this.noAdapt[i]=1;
    for (const i of this.gAVA) this.noAdapt[i]=1;
  }
  reset(){
    const N=this.N;
    this.V=new Float32Array(N); this.act=new Float32Array(N); this.Iext=new Float32Array(N);
    if (this.pSrc){ this.actS.fill(0); this.pepIn.fill(0); this.pepB.fill(0); this._pepWarm=300; }
    this.activity=new Float32Array(N);
    this.muscleDorsal=new Float32Array(24); this.muscleVentral=new Float32Array(24);
    this.oscD=0.6; this.oscV=0.1; this.adD=0.3; this.adV=0.05; // asymmetric start seeds the first bend
    this.command=1; this.revTime=0; this.omegaT=0;
    this.cPrev=0; this.cSlow=0; this.on=0; this.off=0; this._t=0;
    this.hab=1; this.wdBias=0; this.foragePhase=0; this.rimAct=0; this.noseP=0; this.klBias=0;
    this.dopa=0; this.ser=0;
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
  // mechanotransduction from body-environment contact, called once per frame.
  // noseOn: head-driving-into-wall strength 0..1. noseSide: signed lateral nose
  // contact. bodyA/bodyP: sustained anterior/posterior body contact.
  mech(noseOn,noseSide,bodyA,bodyP,dt,speed){
    const T=TUNE;
    // Wedged: the command says forward, the body touches something ahead, and
    // the worm is not actually advancing. That is sustained pressure on the
    // anterior receptive fields (FLP endings tile the head, Li 2011), and it
    // is what a worm stuck in a corner feels even when its nose tip slides.
    if (speed!==undefined && this.command>0.5 && (noseOn>0||bodyA>0.05)){
      const wedge=Math.max(0,Math.min(1,(0.13-speed)/0.10))*Math.min(1,noseOn*2+bodyA*1.5);
      noseOn=Math.max(noseOn,0.9*wedge);
    }
    // Nose touch: ASH, FLP, OLQ fire and the worm backs away (Kaplan and
    // Horvitz 1993). The response habituates under a held stimulus, so a worm
    // pinned nose-first against a wall backs off hard the first time and less
    // the third time, like the animal in the Not assay.
    // sensory persistence: ASH calcium holds through a sustained press, so
    // intermittent tip contact (the wave slaps the nose on and off the wall)
    // integrates into a firm signal instead of a train of ignorable blips
    this.noseP+=(noseOn-this.noseP)*Math.min(1,dt/0.18);
    if (noseOn>this.noseP) this.noseP=Math.min(1,this.noseP+noseOn*dt*6);
    // gated by forward drive: the response halts forward motion and backs;
    // a nose dragged along a wall during a reversal does not re-trigger it
    const eff=this.noseP*this.hab*Math.max(0,this.command);
    if (eff>0.03){
      const s=T.noseGain*eff*dt*60*0.6;
      for (const i of this.gNose) this.Iext[i]+=s;
      for (const i of this.gOLQ)  this.Iext[i]+=0.6*s;
      // ASH/FLP synapse directly onto AVA/AVD (White 1986); same normalization
      // caveat as touch(), part of the drive goes to the command group
      for (const i of this.gAVA) this.Iext[i]+=0.5*s;
      for (const i of this.gAVB) this.Iext[i]-=0.33*s;
      this.hab=Math.max(0.05,this.hab-T.habRate*eff*dt);
    }
    this.hab+=(1-this.hab)*dt/T.habTau;
    // Head withdrawal: side-of-nose contact, OLQ/IL1 -> bend away (Hart 1995)
    if (noseSide!==0){
      const g=noseSide>0?this.gWdD:this.gWdV, a=Math.min(1,Math.abs(noseSide));
      for (const i of g) this.Iext[i]+=T.wdGain*a*dt*60*0.2;
      this.wdBias+=T.wdGain*a*(noseSide>0?1:-1)*dt*3;
      this.wdBias=Math.max(-1.4,Math.min(1.4,this.wdBias));
    }
    // Entrainment along obstacles is carried by the body touch cells ALM/AVM,
    // not the nose: light sustained drive, well below the reversal threshold
    if (bodyA>0.02) for (const i of this.gBodyA) this.Iext[i]+=T.wallGain*Math.min(1,bodyA)*dt*60*0.15;
    if (bodyP>0.02) for (const i of this.gTouchP) this.Iext[i]+=T.wallGain*Math.min(1,bodyP)*dt*60*0.1;
  }
  chemosense(conc){
    // ON/OFF adaptation: cells respond to change, not level (MODEL ASSUMPTION values).
    // The comparison is FRACTIONAL (Weber law): ASE responds to relative change
    // over decades of concentration (Larsch 2015), which is what lets the worm
    // steer up the faint outer tail of a plume as well as the steep rim of the
    // patch itself. An absolute-difference sensor is blind far from food.
    this.cSlow += (conc-this.cSlow)*(1/60)/TUNE.senseAdapt;
    const d=(conc-this.cSlow)/(0.02+conc+this.cSlow)*TUNE.senseGain*2.5;
    this.on = Math.max(0,Math.min(1,d)); this.off = Math.max(0,Math.min(1,-d));
    for (const i of this.gOn) this.Iext[i]+=this.on*0.8;
    for (const i of this.gOff) this.Iext[i]+=this.off*0.8;
  }
  // food(onAnterior, onPosterior, eating, dt): the basal slowing response.
  // Dopaminergic CEP/ADE/PDE are mechanosensors of bacterial texture (Sawin
  // 2000): they fire while the body is over food and the released dopamine
  // slows locomotion extrasynaptically (Bentley 2016). NSM tastes food in the
  // pharynx while actually feeding and its serotonin deepens the slowdown.
  food(onA,onP,eating,dt){
    const T=TUNE;
    if (onA>0.02) for (const i of this.gDopaA) this.Iext[i]+=onA*dt*60*0.35;
    if (onP>0.02) for (const i of this.gDopaP) this.Iext[i]+=onP*dt*60*0.35;
    if (eating>0.02) for (const i of this.gNSM) this.Iext[i]+=eating*dt*60*0.4;
    const target=Math.min(1,onA+0.6*onP);
    this.dopa+=(target-this.dopa)*Math.min(1,dt/T.dopaTau);
    this.ser+=(Math.min(1,eating)-this.ser)*Math.min(1,dt/0.8);
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
    // RIM: AVA drives it (they share gap junctions in the wiring), and its
    // tyramine does two things through the LGC-55 chloride channel (Pirri
    // 2009): it relaxes the neck so head casts stop during backing, and it
    // inhibits AVB so the escape reversal runs long (Alkema 2005)
    for (const i of this.gRIM) P[i]+=T.rimDrive*B;
    // thresholded: RIM rests near 0.2 like every sigmoid cell, and resting
    // tyramine must not leak; only clear activation releases it
    // tyramine is slow (released over seconds) and matters during commanded
    // backing; a low-pass plus the command gate keeps within-cycle chatter of
    // the RIM membrane from bleeding into the forward gait
    const rimInst=Math.min(1,Math.max(0,(this._mean(this.gRIM)-0.4)/0.3))*Math.max(0,-this.command);
    this.rimAct+=(rimInst-this.rimAct)*Math.min(1,dt/0.25);
    for (const i of this.gAVB) P[i]-=T.tyrGain*this.rimAct;
    // head oscillator: mutual inhibition + adaptation (MODEL ASSUMPTION, Boyle-Cohen style CPG stand-in)
    const turn = Math.max(0.25, 1 - T.klino*this.on + 0.5*this.off); // climbers run straight, descenders cast
    const drv = T.oscDrive*Math.max(F,B*0.9);
    // under lighter load the whole rhythm runs faster (0.5 Hz on agar, near
    // 1.7 Hz in water, Fang-Yen 2010): scale the oscillator clock with load
    const clk = Math.pow(0.23,1-T.load); // 0.48 Hz on agar up to ~2 Hz in water (Fang-Yen 2010)
    // basal slowing on food: dopamine stretches the rhythm (Sawin 2000)
    const slowF=Math.max(0.45, 1 - T.dopaSlow*this.dopa - T.serSlow*this.ser);
    const oTau=T.oscTau*clk/slowF, oAd=T.oscAdapt*clk/slowF;
    const dD = (-this.oscD + Math.max(0, drv - T.oscInh*this.oscV - this.adD + 0.02))/oTau;
    const dV = (-this.oscV + Math.max(0, drv - T.oscInh*this.oscD - this.adV))/oTau;
    this.oscD+=dD*dt; this.oscV+=dV*dt;
    this.adD+=(T.oscAdaptGain*this.oscD*turn-this.adD)*dt/oAd;
    this.adV+=(T.oscAdaptGain*this.oscV*turn-this.adV)*dt/oAd;
    // foraging casts: quick shallow nose flicks while running forward (Hart
    // 1995: OLQ/IL1 and their RMD targets), shut off by RIM tyramine during
    // backing, and damped while climbing a scent (the run straightens)
    this.foragePhase+=2*Math.PI*T.forageHz*dt/Math.max(0.35,clk);
    const rimS=this.rimAct;
    // casts are NOSE-LOCAL: they ride a separate channel into the first
    // muscle rows only, so a flick does not propagate down the body wave
    const cast=T.forageAmp*Math.sin(this.foragePhase)*gFcast(this)*(1-rimS)*(1-0.7*this.on);
    this.castD=Math.max(0,cast); this.castV=Math.max(0,-cast);
    // head withdrawal joins the same nose-local channel: the neural route
    // through the head motor cells is kept for the display, and the bend away
    // is guaranteed by symmetric muscle drive (the real OLQ/IL1->RMD loop is
    // dorsoventrally symmetric; our NMJ table is not quite, so trust physics)
    this.castD+=Math.max(0,this.wdBias)*0.9; this.castV+=Math.max(0,-this.wdBias)*0.9;
    // klinotaxis: correlate scent change with current head bend direction,
    // and lean the wave toward the side that smells better (weathervaning)
    const hb=curvature.length>3?curvature[3]:0;
    const corr=(this.off-this.on)*(hb>0?1:hb<0?-1:0); // sign matched to the body frame empirically: +on-with-bend steered away
    this.klBias+=(T.klGain*corr-this.klBias)*Math.min(1,dt/1.2);
    // head withdrawal bias decays fast; positive bends dorsal
    this.wdBias*=Math.exp(-dt/T.wdTau);
    const headSupp=1-T.rimOsc*rimS;
    // the omega is a tonic deep ventral curl, not a wave: while it lasts the
    // dorsal side is silenced and the ventral side held, which is what makes
    // the turn reorient reliably instead of depending on wave phase
    const om=this.omegaT>0?Math.min(1,this.omegaT/0.3):0;
    const steer=this.wdBias+this.klBias*gFcast(this);
    const oD=Math.min(1,Math.max(0,(this.oscD+Math.max(0,steer))*headSupp))*(1-om);
    const oV=Math.min(1,Math.max(0,(this.oscV+Math.max(0,-steer))*headSupp))*(1-om)+om*1.25;
    for (const i of this.gHeadD) P[i]+=T.oscToNeuron*oD;
    for (const i of this.gHeadV) P[i]+=T.oscToNeuron*oV;
    // proprioception: B cells feel bend anterior to themselves, A cells posterior
    // (Boyle, Berri, Cohen 2012; Wen 2012). Gated by the command groups.
    // Under light load bends are shallower and develop faster, so the switch
    // threshold drops and the sensed region stretches; this is the stand-in
    // for the load dependence that gives the animal its long swim wavelength
    const NC=curvature.length, gF=Math.max(0,this.command), gB=Math.max(0,-this.command);
    const pOn=T.propOn*(0.45+0.55*T.load);
    const pWin=Math.min(NC-2,Math.round(T.propWin*(2-T.load)));
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
        if (own<=pWin){ c=T.gProp*gF*(this.isDorsal[i]?oD-oV:oV-oD); } // head B-class rides the head oscillator (they receive the head motor circuit), giving the chain a clean source
        else {
        let s=0,m=0;
        for(let j=own-pWin;j<own-T.propOff;j++){s+=curvature[j];m++;}
        const sg=(T.propWa*(m?s/m:0)-curvature[own])*(this.isDorsal[i]?1:-1);
        if (sg>pOn) this.propS[i]=1; else if (sg<-pOn) this.propS[i]=-1;
        c=T.gProp*gF*this.propS[i];
        }
      } else if (this.isAS[i]&&(gF>0.02||gB>0.02)){
        // AS: anterior-bend switches like B, but listening to both commands
        // (Tolstenkov 2018: AVA gap junctions, activity in both directions)
        if (own>pWin){
          let s=0,m=0;
          for(let j=own-pWin;j<own-T.propOff;j++){s+=curvature[j];m++;}
          const sg=(T.propWa*(m?s/m:0)-curvature[own]); // dorsal cell: positive bend is its own side
          if (sg>pOn) this.propS[i]=1; else if (sg<-pOn) this.propS[i]=-1;
          c=T.gProp*(T.asGain??0)*Math.max(gF,0.7*gB)*this.propS[i];
        }
      } else if (this.isA[i]&&gB>0.02){
        // the tail seed rides the RAW oscillator: tyramine silences the neck,
        // not the source of the retrograde wave, and gating it here is what
        // made escapes randomly fail to back up
        if (own>=NC-1-pWin){ c=T.gProp*gB*(this.isDorsal[i]?this.oscD-this.oscV:this.oscV-this.oscD); } // reversal wave seeds at the tail and runs forward
        else {
        let s=0,m=0;
        for(let j=own+T.propOff+1;j<=own+pWin;j++){s+=curvature[j];m++;}
        const sg=(T.propWa*(m?s/m:0)-curvature[own])*(this.isDorsal[i]?1:-1);
        if (sg>pOn) this.propS[i]=1; else if (sg<-pOn) this.propS[i]=-1;
        c=T.gProp*gB*this.propS[i];
        }
      }
      P[i]+=c;
    }
    // extrasynaptic neuropeptide layer: slow release proxy, baseline-relative
    if (this.pSrc && T.pepGain!==0){
      const aS=this.actS, kA=dt/T.pepTauAct, kB=dt/T.pepTauBase;
      for (let i=0;i<N;i++) aS[i]+=(act[i]-aS[i])*kA;
      for (let i=0;i<N;i++){
        let s=0;
        for (let p=this.pPtr[i];p<this.pPtr[i+1];p++) s+=this.pW[p]*aS[this.pSrc[p]];
        this.pepIn[i]=s;
        if (this._pepWarm>0) this.pepB[i]=s; else this.pepB[i]+=(s-this.pepB[i])*kB;
      }
      if (this._pepWarm>0) this._pepWarm--;
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
      let inp=T.gChem*this.cNorm[i]*s + T.gGap*this.gNorm[i]*g + T.iGain*P[i] + I[i] - ga*this.A[i];
      // peptide input is gated out of the locomotor pattern classes the same
      // way chemical chatter is (motorChem): their bending is proprioceptively
      // dominated (Wen 2012), and slow inhibition into the oscillating cord
      // wrecks the waveform without any support in the recordings, which are
      // of head-ganglia neurons (Randi 2023)
      if (this.pSrc && T.pepGain!==0)
        inp+=this.pepGate[i]*T.pepGain*this.pNorm[i]*(this.pepIn[i]-this.pepB[i]);
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
      if (k<3){ const wn=1-k/3; // foraging flicks live in the nose tip only
        // reciprocal (push-pull) and headroom-scaled: the whole-animal NMJ table
        // leaves head rows near saturation, where a purely additive nudge clips
        // on one side; the real IL1/OLQ->RMD reflex is reciprocal (Hart 1995)
        const cd=this.castD*wn, cv=this.castV*wn;
        const d0=d, v0=v;
        d=Math.max(0,Math.min(1, d0+cd*(1-d0)-cv*d0*0.9));
        v=Math.max(0,Math.min(1, v0+cv*(1-v0)-cd*v0*0.9)); }
      if (k<4&&this.rimAct>0.02){ // LGC-55 chloride on neck muscle: tyramine
        const relax=this.rimAct*0.75*(1-k/4), m=0.5*(d+v); // relaxes the neck toward slack during backing (Pirri 2009)
        d+=(m-d)*relax; v+=(m-v)*relax; }
      // muscle rates follow the rhythm into thin fluid, or the 2 Hz swim
      // would be filtered flat by crawl-tuned activation kinetics
      const mScl=0.42+0.58*Math.pow(0.23,1-TUNE.load);
      const rd=(d>this.muscleDorsal[k]?T.mRise:T.mFall)*mScl, rv=(v>this.muscleVentral[k]?T.mRise:T.mFall)*mScl;
      this.muscleDorsal[k]+=(d-this.muscleDorsal[k])*dt/rd;
      this.muscleVentral[k]+=(v-this.muscleVentral[k])*dt/rv;
    }
    // electrical coupling between neighbouring muscle cells (Cook 2019)
    const gm=(T.gMGJ??0.08)*dt;
    if (gm>0){
      for (const [a,b,w] of this.mgjD){ const f=gm*w*(this.muscleDorsal[b]-this.muscleDorsal[a]); this.muscleDorsal[a]+=f; this.muscleDorsal[b]-=f; }
      for (const [a,b,w] of this.mgjV){ const f=gm*w*(this.muscleVentral[b]-this.muscleVentral[a]); this.muscleVentral[a]+=f; this.muscleVentral[b]-=f; }
    }
  }
}
