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
  // --- deliberate (finger) touch: the escape response, not a nudge ---
  // A real prod is a volley onto ALM/AVM/ASH that drives a LONG reversal
  // (Chalfie & Sulston 1981; Kaplan & Horvitz 1993), an omega turn, and then
  // several seconds of ACCELERATED forward locomotion - the tyramine/RIM
  // escape sequence Pirri & Alkema (2008/2012) describe. It also habituates
  // to repeated stimuli (Rankin & Broster 1992).
  escDrive: 0.85,   // sustained drive onto AVA/AVD/AVE while escaping
  escDur: 2.6,      // s of commanded backing after an anterior/nose prod
  sprintDur: 4.5,   // s of accelerated forward running after the escape turn
  sprintGain: 0.45, // fractional boost to locomotor drive during the sprint
  pokeHabDrop: 0.28,// each prod within the recovery window costs this much
  pokeHabTau: 60,   // s, recovery of the touch response (Rankin & Broster 1992)
  // --- worm-worm interaction (only used when more than one animal is on the dish) ---
  // Aggregation in C. elegans is a one-gene story: npr-1 lf / wild isolates
  // aggregate and border, N2 stays solitary (de Bono & Bargmann 1998). The
  // sensory route is the RMG hub-and-spoke circuit - ADL/ASK pheromone
  // (ascaroside) neurons and the URX/AQR/PQR oxygen neurons are gap-junctioned
  // to RMG, and npr-1 inhibits RMG (Macosko et al. 2009; Gray et al. 2004).
  // The behavioural rules are Ding et al. 2019 (eLife 8:e43318), who fitted an
  // agent model to multi-worm tracking: taxis toward neighbours, a
  // density-dependent slowdown, and reversals at the cluster edge.
  pheroGain: 0.55,   // ascaroside drive onto ADL/ASK
  o2Gain: 0.45,      // oxygen drive onto URX/AQR/PQR (high O2 = few neighbours)
  socAttract: 0.40,  // social strain: steer toward neighbours
  socAvoid: 0.08,    // solitary strain: mild turning away (ASH ascr#3 avoidance)
  socSlowGain: 0.42, // density-dependent slowdown inside a cluster (Ding 2019)
  socEdgeRev: 0.60,  // cluster-edge reversal drive onto AVA (Ding 2019)
  revDecay: 0.5,    // touch-evoked reversal drive decay, s
  omegaThresh: 0.7, // reversals longer than this end in an omega turn, s
  omegaDur: 1.5,    // omega ventral head bend duration, s
  omegaGain: 1.6,   // RIV/SMDV drive during omega
  upsilonThresh: 0.32, // reversals shorter than omegaThresh but longer than this
                    // end in a partial (upsilon) turn instead of a plain resume
                    // (Croll 1975 names omega and upsilon as the two classic C.
                    // elegans reorientation shapes; the depth-graded reorientation
                    // continuum below full coiling is also documented directly by
                    // curvature magnitude in Broekmans et al. 2016, eLife 5:e17227)
  upsilonDur: 0.6,  // upsilon turn duration, s: shorter than omega's 1.5s (MODEL ASSUMPTION)
  upsilonGain: 0.65, // partial RIV/SMDV drive: about 40% of the omega gain, so the
                    // ventral bend is real but does not drive the head to the tail
  // --- post-reversal forward inertia (off by default = 0; see run 111) ---
  // Sordillo & Bargmann 2021 (eLife 10:e67723) show RIM's gap junctions
  // actively stabilize the FORWARD state while RIM is hyperpolarized, i.e.
  // runs carry behavioural inertia and reversals are discrete events rather
  // than a chatter; Zhao et al. 2003 (J Neurosci 23:5319) measured the
  // resulting inter-reversal intervals as a smooth lognormal, not a burst
  // train. These three knobs implement that; at 0/0/0 the model is exactly
  // the run-110 model.
  refractTau: 6.0,   // s, decay of the post-reversal state
  offAdaptTau: 20.0,  // s, adaptation time constant of the OFF drive (0 = legacy)
  offAdaptGain: 1.0, // how much of the adapted level is subtracted
  cmdArous: 0.0,     // how much roam/dwell arousal scaling reaches the AVA/AVB
                     // command circuit (1 = legacy, 0 = speed only)
  refractChemo: 0.0, // as refractGain but for the chemosensory pirouette drive;
                     // keep at 0 unless you want reversals to gate navigation
  revInt: 1.8,       // s, floor of the interval between reversal attempts inside
                     // the high-reversal-incidence dwell sub-mode (Flavell 2013
                     // Dwell7). The paper gives the sub-mode, not a rate: this
                     // pair of numbers is the MODEL ASSUMPTION that sets it.
  revIntSpread: 2.4, // s, uniform spread added to revInt
  refractGain: 0.0,  // how much the refractory state suppresses SPONTANEOUS
                     // (dC/dt and dwell-mode) reversal drive - touch/escape
                     // drive deliberately bypasses it (Kaplan & Horvitz 1993)
  inertiaGain: 0.0,  // extra tonic drive to AVB just after a reversal
  dTau: 1.0,         // s, low-pass on the SIGNED chemosensory derivative before
                     // rectification: cancels the head-sweep ripple (symmetric,
                     // zero-mean) while a sustained descent survives. 0 = raw.
  offThresh: 0.85,   // instantaneous-breakthrough threshold: OFF above this
                     // still drives AVA at full gain, so a large abrupt drop
                     // still fires a pirouette. 0 = everything passes (legacy).
                     // MEASURED (run 112, 5 independent 6-seed chemotaxis
                     // batteries per condition): dTau 1.0 + offThresh 0.85
                     // finds the patch in 5.3/6 trials vs 2.6/6 raw, and the
                     // mean closest approach falls from 1.09 to 0.33 dish
                     // units. Reversal rate near food 10.6 -> 9.4/min and the
                     // fraction of inter-reversal intervals under 2 s
                     // 0.665 -> 0.62. Gait, escape battery (14/14 omega with
                     // identical reversal durations), the locoFree=false
                     // legacy benchmark (1.535 / 0.510) and 3x20 min
                     // stability with pokes are all unchanged.
  offTau: 0.0,       // s, low-pass on the OFF (dC/dt) drive into AVA: a real
                     // pirouette integrates a falling concentration over
                     // seconds; 0 = instantaneous, the run-110 behaviour
  // --- area-restricted search -> dispersal after losing food -------------
  // Gray, Hill & Bargmann 2005 (PNAS 102:3184) and Hills, Brockie & Maricq
  // 2004 (J Neurosci 24:1217): an animal removed from food first performs
  // ~15 min of LOCAL search - high reversal and omega-turn frequency, tiny
  // net displacement - and only then switches to GLOBAL search (dispersal:
  // long, nearly straight runs, few turns). The local phase requires
  // dopamine (cat-2 and dop-1 mutants disperse immediately, Hills 2004), so
  // it is gated here on the memory of recent feeding, not on a bare timer.
  arsTau: 400,       // s, decay of the local-search drive (half gone by ~4.6
                     // min, ~90% by 15 min, matching the Gray 2005 time course)
  arsMemTau: 2400,   // s, how long the "I was recently on food" memory that
                     // licenses local search survives; after this the animal
                     // behaves as a never-fed disperser
  arsOnFood: 0.0,    // how much of the local-search drive survives while the
                     // animal is still ON the lawn (1 = legacy, 0 = none)
  arsRevGain: 1.0,   // extra AVA pulse drive during local search
  arsInt: 7.0,       // s, mean interval between local-search reversal attempts
  dispGain: 0.45,    // extra tonic AVB drive during dispersal (long runs)
  dispSupp: 0.5,    // suppression of spontaneous reversal drive during
                     // dispersal - the straight-run phase of global search
  senseAdapt: 2.8,  // chemosensory adaptation time constant, s
  senseGain: 6.0,   // dC/dt scaling into ON/OFF cells
  revOnOff: 0.9,    // OFF signal -> AVA drive (pirouette: Pierce-Shimomura 1999)
  klino: 0.5,       // ON suppresses turning amplitude (klinokinesis shortcut)
  gNMJ: 3.2,        // neuromuscular gain
  mCellDev: 0.5,   // how much a single muscle cell's own junctions pull it off its row's drive
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
  dopaTau: 1.6,     // dopamine builds and washes out over seconds (fast, mechanosensory:
                    // CEP/ADE/PDE report bacterial texture contact within ~1-2s, Sawin 2000)
  // Basal slowing acts on the MOTOR side as well as the rhythm: dopamine
  // released onto the cholinergic ventral-cord motor neurons through DOP-3
  // is what actually slows the animal (Chase, Pepper and Koelle 2004), and
  // stretching the head oscillator alone was measured to move path speed by
  // only ~10% (run 116). These compress the muscle swing around resting tone.
  dopaMotor: 0.52,  // dopamine -> DOP-3 on cholinergic motor neurons
  serMotor: 0.20,   // serotonin (NSM, MOD-1) deepens it; larger when starved,
                    // which is the enhanced slowing response (Sawin 2000)
  serMotorStarve: 1.6, // extra serotonergic weight at zero satiety tone
  motorFloor: 0.34, // the animal on a lawn still crawls; it does not freeze
  serSlow: 0.18,    // serotonergic NSM fires while feeding and deepens the slowdown
  serToneTau: 90,   // MODEL ASSUMPTION (exact constant not published): a second, much
                    // slower serotonin integral standing in for the extrasynaptic/
                    // hormonal buildup that outlasts single feeding bouts by minutes
                    // (Flavell et al. 2013, Cell 154:1023-1035 -- serotonergic neuron
                    // activity and MOD-1 signaling track dwelling on a minutes
                    // timescale, not the ~1s scale of a single pump). This is the
                    // variable that biases roam/dwell bout length below, so it reads
                    // as "satiety" rather than "is the nose on food right now".
  touchSuppressTau: 3, // MODEL ASSUMPTION for the recovery time constant; the effect
                    // itself is measured: tail tap/touch inhibits pharyngeal pumping
                    // in adults via a glutamatergic pathway (Keane and Avery 2003,
                    // Genetics 164:153-162), so mechanical disturbance should visibly
                    // suppress the serotonin/feeding signal, not leave it untouched
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
    // ---- the muscle cells themselves ------------------------------------
    // The animal has 95 body wall muscle cells in four quadrants (DL, DR, VL,
    // VR; VL is one short). Collapsing them to 24 dorsal/ventral rows threw
    // away the per-cell wiring the NMJ table actually carries, so each cell
    // now integrates its own junctions, has its own activation kinetics, and
    // is electrically coupled to its quadrant neighbours through the real
    // muscle-muscle gap junctions. The bend still comes from the row average,
    // which is all a 2D body can use.
    this.MC=data.muscles.length;
    this.mRow=new Int32Array(this.MC); this.mSideD=new Uint8Array(this.MC);
    this.mcNorm=new Float32Array(this.MC);
    this.quadIdx={DL:new Int32Array(24).fill(-1),DR:new Int32Array(24).fill(-1),
                  VL:new Int32Array(24).fill(-1),VR:new Int32Array(24).fill(-1)};
    const cAbs=new Float32Array(this.MC), cN=[],cM=[],cW=[];
    for (const [n,m,w0] of data.nmj){
      const nm=data.neurons[n];
      const w=w0*(phasic.test(nm)||headM.test(nm)?1:0.15);
      cN.push(n); cM.push(m); cW.push(w); cAbs[m]+=Math.abs(w);
    }
    this.mcN=Int32Array.from(cN); this.mcM=Int32Array.from(cM); this.mcW=Float32Array.from(cW);
    const rowD=[],rowV=[]; for (let k=0;k<24;k++){ rowD.push([]); rowV.push([]); }
    for (let m=0;m<this.MC;m++){
      const nm=data.muscles[m], k=parseInt(nm.slice(3),10)-1;
      this.mRow[m]=k; this.mSideD[m]=nm[1]==='D'?1:0;
      this.mcNorm[m]=cAbs[m]>0?1/cAbs[m]:0;
      this.quadIdx[nm.slice(1,3)][k]=m;
      (nm[1]==='D'?rowD:rowV)[k].push(m);
    }
    this.rowD=rowD.map(a=>Int32Array.from(a)); this.rowV=rowV.map(a=>Int32Array.from(a));
    this.mgjCell=(data.mgj||[]).map(e=>[e[0],e[1],e[2]]);
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
    this.gPhero=this._grp(['ADLL','ADLR','ASKL','ASKR']);   // ascaroside sensors
    this.gRMG=this._grp(['RMGL','RMGR']);                   // hub of the npr-1 circuit
    this.gO2=this._grp(['URXL','URXR','AQR','PQR']);        // oxygen sensors
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
    this.muscleCell=new Float32Array(this.MC||95);
    this.oscD=0.6; this.oscV=0.1; this.adD=0.3; this.adV=0.05; // asymmetric start seeds the first bend
    this.escapeT=0; this.sprintT=0; this.pokeHab=1;
    this.socBias=0; this.socSlow=1; this.phero=0; this.socO2=1;
    this.command=1; this.revTime=0; this.revRefract=0; this.offBase=0; this.offS=0; this.omegaT=0; this.upsilonT=0; this.noseTouchRecent=0;
    this.cPrev=0; this.cSlow=0; this.on=0; this.off=0; this.dS=0; this.offGate=0; this._t=0;
    this.hab=1; this.wdBias=0; this.foragePhase=0; this.rimAct=0; this.noseP=0; this.klBias=0;
    this.dopa=0; this.ser=0; this.serTone=0.5; this.touchSuppress=0;
    this.slowGain=1;
    this.arsT=1e4; this.fedMem=0; this._onFoodSm=0; this.ars=0; this.disp=0; this._arsNext=3; this._arsPulse=0;
    // --- spontaneous roaming/dwelling behavioral state (Cermak, Yu, Clark,
    // Huang, Baskoylu, Flavell 2020, eLife 9:e57093): posture-HMM on 30
    // well-fed animals over 180 h found ONE roaming state (high forward
    // velocity, low angular speed, lasting tens of seconds to many minutes)
    // and EIGHT dwelling sub-modes averaging ~10 s each, non-randomly
    // sequenced: five sub-modes were almost completely paused movement,
    // one was steady slow forward crawling, one showed a high incidence of
    // active reversing, and one showed a wide range of head/neck movement.
    // Exact speed multipliers and epoch-length bounds are not given in the
    // paper's text (only in figures we cannot read) -- MODEL ASSUMPTION for
    // the numeric bounds, but the qualitative structure (one fast-straight
    // state; dwelling built from ~10 s sub-bouts, most of them paused) is
    // taken directly from the paper. locoFree=false reproduces the pre-run
    // 108 always-roaming behavior for benchmark comparability.
    if (this.locoFree===undefined) this.locoFree=true;
    if (this._rngS===undefined) this._rngS=(Date.now()^0x9e3779b9)>>>0;
    this.locoMode='roam'; this.locoT=this._rnd()*110+30; // 30-140 s
    this.subMode=null; this.subT=0;
    this.locoTonicMul=1; this.locoTurnMul=1; this.locoRevDrive=0;
    this._revNext=0; this._revPulseT=0;
    this.A=new Float32Array(N); // adaptation state
    this.propS=new Float32Array(N); // bistable proprioceptive switch state, -1/0/+1
    this.Iper=new Float32Array(N); // persistent drives, rebuilt every step (frame-rate independent)
    for (let i=0;i<N;i++) this.act[i]=sig(0);
  }
  setInput(name,v){ const i=this.idx[name]; if (i!==undefined) this.Iext[i]+=v; }
  // One frame of worm-worm interaction. ph: local ascaroside/neighbour
  // density (0 = alone). side: signed lateral direction of the neighbours in
  // the head frame. headC/tailC: body contact with another animal at the
  // front / back half. social=true models an npr-1 loss-of-function (social)
  // strain, false the solitary N2 wild type.
  social(ph,side,headC,tailC,dt,social){
    const T=TUNE, soc=social?1:0;
    this.phero=ph;
    const s=T.pheroGain*Math.min(2,ph)*dt*60*0.1;
    for (const i of this.gPhero) this.Iext[i]+=s;
    // npr-1 (high in N2) inhibits the RMG hub, which is why the same
    // pheromone signal drives aggregation in one strain and not the other
    for (const i of this.gRMG) this.Iext[i]+=s*(soc?1.1:0.2);
    // a cluster of animals is a low-oxygen pocket; URX/AQR/PQR report the
    // 21% surface oxygen the worms are escaping (Gray 2004, Rogers 2006)
    this.socO2=Math.max(0,1-0.5*Math.min(2,ph));
    for (const i of this.gO2) this.Iext[i]+=T.o2Gain*this.socO2*dt*60*0.1*(soc?1:0.4);
    // sign fixed by measurement, not by guesswork: with +side the group flew
    // apart (mean pairwise distance 2.4 -> 4.1 body lengths in 4 min, 3 seeds),
    // with -side it aggregated (2.4 -> 0.5-1.0). run 116.
    const target = soc ? -T.socAttract*Math.min(1.5,ph)*side
                       :  T.socAvoid*Math.min(1.5,ph)*side;
    this.socBias += (target-this.socBias)*Math.min(1,dt/0.8);
    // density-dependent speed: social animals slow in a group and stay,
    // solitary ones keep moving and leave it (Ding 2019)
    this.socSlow = soc ? Math.max(0.5,1-T.socSlowGain*Math.min(1.5,ph))
                       : Math.min(1.25,1+0.12*Math.min(1,ph));
    // cluster-edge reversal: contact at one end of the body and not the
    // other means you are leaving the group, and a social worm turns back in
    const edge=Math.max(0,headC-0.6*tailC);
    if (soc && edge>0.2) for (const i of this.gAVA) this.Iext[i]+=T.socEdgeRev*edge*dt*60*0.1;
  }
  touch(region,s){
    const T=TUNE;
    if (this.pokeHab===undefined) this.pokeHab=1;
    s*=this.pokeHab;
    const g = region==='nose'?this.gNose : region==='posterior'?this.gTouchP : this.gTouchA;
    for (const i of g) this.Iext[i]+=s;
    if (region==='nose') this.noseTouchRecent=Math.min(1,this.noseTouchRecent+Math.abs(s));
    // MODEL ASSUMPTION: normalization underweights the strong touch->command routes,
    // so part of the touch drive goes to the command group directly
    if (region==='posterior'){ for (const i of this.gAVB) this.Iext[i]+=0.5*s; }
    else { for (const i of this.gAVA) this.Iext[i]+=0.6*s; for (const i of this.gAVB) this.Iext[i]-=0.4*s; }
    // mechanical stimulation measurably inhibits pharyngeal pumping in adults
    // (Keane and Avery 2003): any touch anywhere on the body dips the feeding/
    // serotonin signal for a few seconds rather than leaving it untouched
    this.touchSuppress=Math.min(1,this.touchSuppress+Math.abs(s)*0.7);
    // The escape sequence proper. Anterior/nose: commanded backing for a
    // couple of seconds, an omega turn on release (noseTouchRecent marks the
    // reversal as contact-evoked), then a forward sprint. Posterior: no
    // reversal - PLM drives the animal FORWARD, faster, straight away.
    if (region==='posterior'){ this.sprintT=Math.max(this.sprintT||0,T.sprintDur*0.8); this.escapeT=0; }
    else {
      this.escapeT=Math.max(this.escapeT||0,T.escDur*this.pokeHab);
      this.noseTouchRecent=Math.min(1,(this.noseTouchRecent||0)+0.6*this.pokeHab);
    }
  }
  // one deliberate prod: a volley, plus habituation bookkeeping
  prod(region,strength){
    if (this.pokeHab===undefined) this.pokeHab=1;
    this.touch(region,strength);
    this.pokeHab=Math.max(0.25,this.pokeHab-TUNE.pokeHabDrop);
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
      this.noseTouchRecent=Math.max(this.noseTouchRecent,Math.min(1,eff*3));
      for (const i of this.gNose) this.Iext[i]+=s;
      for (const i of this.gOLQ)  this.Iext[i]+=0.6*s;
      // ASH/FLP synapse directly onto AVA/AVD (White 1986); same normalization
      // caveat as touch(), part of the drive goes to the command group
      for (const i of this.gAVA) this.Iext[i]+=0.5*s;
      for (const i of this.gAVB) this.Iext[i]-=0.33*s;
      this.hab=Math.max(0.05,this.hab-T.habRate*eff*dt);
      // same mechanical-stimulation -> pumping-suppression effect as touch()
      // (Keane and Avery 2003), scaled to the nose-touch intensity
      this.touchSuppress=Math.min(1,this.touchSuppress+eff*0.6);
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
    // --- thresholded pirouette gate (run 112) -------------------------------
    // The raw OFF signal is dominated by the head-sweep ripple: the nose
    // swings in and out of the gradient every undulation (~0.5 Hz on agar),
    // so an instantaneous OFF->AVA drive re-triggers a reversal every cycle
    // (measured run 111: 11 reversals/min near food, 66-70% of intervals
    // under 2 s, vs a smooth lognormal with a ~13 s median in real animals,
    // Zhao et al. 2003 J Neurosci 23:5319). Real worms do not reverse on the
    // sweep: AIY/AIB integrate ASER over seconds before a pirouette is
    // committed (Kato et al. 2014, Neuron 81:616 - sensory integration is
    // low-pass on the order of seconds), while a large, abrupt drop (leaving
    // a patch edge, or the step stimuli of Pierce-Shimomura 1999) still
    // triggers immediately.
    // So: smooth the SIGNED derivative (the ripple is symmetric and cancels;
    // a genuine descent has a sustained negative mean and survives), and OR
    // it with an instantaneous breakthrough term for large drops.
    // dTau = 0 and offThresh = 0 reproduce the raw signal exactly.
    this.dS += TUNE.dTau>0 ? (d-this.dS)*Math.min(1,(1/60)/TUNE.dTau) : (d-this.dS);
    const offSlow = Math.max(0,Math.min(1,-this.dS));
    // NOTE (measured run 112): near food the raw OFF signal is SATURATED at 1
    // for ~29% of frames - the head-sweep ripple itself clips - so amplitude
    // alone cannot separate ripple from a real descent. offThresh is kept as
    // an explicit knob but the discriminating variable is persistence (dTau);
    // offThresh = 1 disables the instantaneous breakthrough entirely.
    const offBig = TUNE.offThresh>0 ? Math.min(1,Math.max(0,this.off-TUNE.offThresh)/Math.max(0.05,1-TUNE.offThresh)) : this.off;
    this.offGate = Math.max(offSlow, offBig);
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
    // touch/tail-tap transiently gates pumping down (Keane and Avery 2003):
    // the gate gently recovers over touchSuppressTau once contact stops
    const gate=Math.max(0,1-this.touchSuppress);
    this.touchSuppress=Math.max(0,this.touchSuppress-dt/T.touchSuppressTau);
    if (onA>0.02) for (const i of this.gDopaA) this.Iext[i]+=onA*dt*60*0.35;
    if (onP>0.02) for (const i of this.gDopaP) this.Iext[i]+=onP*dt*60*0.35;
    const effEating=Math.min(1,eating)*gate;
    if (effEating>0.02) for (const i of this.gNSM) this.Iext[i]+=effEating*dt*60*0.4;
    const target=Math.min(1,onA+0.6*onP);
    this.dopa+=(target-this.dopa)*Math.min(1,dt/T.dopaTau);
    this.ser+=(effEating-this.ser)*Math.min(1,dt/0.8);
    // slow satiety-like tone (Flavell 2013): builds and washes out over
    // T.serToneTau (minutes), so it survives brief gaps off food and short
    // touch-evoked dips above, unlike the fast NSM pumping signal
    this.serTone+=(effEating-this.serTone)*Math.min(1,dt/T.serToneTau);
    // clocks for area-restricted search: arsT = time since food was last in
    // the mouth, fedMem = dopamine-dependent memory that there WAS food
    if (effEating>0.02){ this.arsT=0; this.fedMem=1; }
    else { this.arsT+=dt; this.fedMem*=Math.exp(-dt/T.arsMemTau); }
    const decay=Math.exp(-this.arsT/T.arsTau);
    // Area-restricted search is what a worm does when it has LOST food (Gray
    // 2005; Hills 2004 - the assay is literally "remove the animal from the
    // lawn"). Until run 114 the drive was full strength while the animal was
    // still eating, which by itself fired a reversal pulse every ~7 s on the
    // lawn: measured as the single largest contributor to the model's
    // on-food reversal chatter. arsOnFood 1 = the old behaviour.
    this._onFoodSm += ((effEating>0.02?1:0)-this._onFoodSm)*Math.min(1,dt/4);
    const onLawn = 1-(1-T.arsOnFood)*this._onFoodSm;
    this.ars = this.fedMem*decay*onLawn;   // local search: 1 right after loss
    this.disp = this.fedMem*(1-decay);     // global search: takes over later
  }
  _mean(g){ let s=0; for (const i of g) s+=this.act[i]; return g.length?s/g.length:0; }
  // deterministic PRNG (mulberry32) so behavior is reproducible when a seed
  // is set explicitly (benchmark rigs); live pages seed from Date.now().
  _rnd(){ let t=this._rngS+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }
  _locoStep(dt){
    if (!this.locoFree){ this.locoTonicMul=1; this.locoTurnMul=1; this.locoRevDrive=0; return; }
    this.locoT-=dt;
    if (this.locoMode==='roam'){
      if (this.locoT<=0){
        this.locoMode='dwell'; this.subT=0;
        // serotonin promotes dwelling (Flavell et al. 2013: MOD-1-dependent;
        // tph-1 serotonin-deficient animals dwell less, Cermak et al. 2020).
        // Bout length itself is not given a number in either paper -- MODEL
        // ASSUMPTION is the 0.6x-1.7x multiplier range, the direction (more
        // serotonin tone -> longer dwelling) is what is taken from the data.
        const dwellMul=1+1.2*(this.serTone-0.5);
        this.locoT=(this._rnd()*70+30)*dwellMul;
      } // dwell epoch 30-100 s x serotonin-tone multiplier (=1 at the neutral
        // reset tone of 0.5, so a worm that has not yet met food or hunger
        // behaves exactly like the pre-coupling timer)
    } else {
      this.subT-=dt;
      if (this.subT<=0){
        const r=this._rnd();
        // categorical draw matching the paper's 8 sub-modes: 5/8 paused
        // (Dwell2,3,4,5,8), 1/8 steady slow crawl (Dwell1), 1/8 high
        // reversal incidence (Dwell7), 1/8 wide head/neck sweeps (Dwell6)
        this.subMode = r<0.625?'pause' : r<0.75?'slowcrawl' : r<0.875?'reversal' : 'sweep';
        this.subT=10*(0.5+this._rnd()); // ~10 s average (paper), 5-15 s spread
      }
      if (this.locoT<=0){
        this.locoMode='roam'; this.subMode=null;
        // low serotonin tone (food-deprived) extends roaming (Ben Arous et
        // al. 2009, cited in Flavell et al. 2013: "the proportion of time
        // spent roaming increases when food is limited or low in quality").
        // Same MODEL ASSUMPTION caveat on the numeric multiplier as above.
        const roamMul=1-1.2*(this.serTone-0.5);
        this.locoT=(this._rnd()*110+30)*roamMul;
      } // roam bout 30-140 s x (1/serotonin-tone) multiplier, symmetric with
        // the dwell one above so serTone=0.5 (neutral) reproduces the old
        // pure-timer bounds exactly
    }
    if (this.locoMode==='roam'){ this.locoTonicMul=1.0; this.locoTurnMul=1.0; this._revNext=0; this._revPulseT=0; this.locoRevDrive=0; this._arsLocal(dt); return; } // exactly the validated legacy crawl (both a >1 tonic boost and a <1 turn suppression here measurably hurt sine purity); 'low angular speed' in roam falls out naturally because wide sweeps/reversals are confined to dwelling
    switch (this.subMode){
      case 'pause':      this.locoTonicMul=0.10; this.locoTurnMul=0.7; break;
      case 'slowcrawl':  this.locoTonicMul=0.50; this.locoTurnMul=0.8; break;
      case 'sweep':      this.locoTonicMul=0.60; this.locoTurnMul=2.4; break;
      case 'reversal':   this.locoTonicMul=0.55; this.locoTurnMul=0.9; break;
      default:           this.locoTonicMul=1.0;  this.locoTurnMul=1.0;
    }
    if (this.subMode==='reversal'){
      this._revNext-=dt;
      if (this._revNext<=0){ this._revPulseT=0.9; this._revNext=TUNE.revInt+this._rnd()*TUNE.revIntSpread; }
    } else { this._revNext=0; }
    if (this._revPulseT>0){ this._revPulseT-=dt; this.locoRevDrive=1.1; } else this.locoRevDrive=0;
    this._arsLocal(dt);
  }
  // Local (area-restricted) search: independent of the roam/dwell timer,
  // this adds reversal attempts whose PROBABILITY is the local-search drive,
  // so the rate falls off smoothly over ~15 min instead of switching off.
  // Gray 2005 measured exactly this decay in turn frequency after removal.
  _arsLocal(dt){
    const T=TUNE;
    this._arsNext-=dt;
    if (this._arsNext<=0){
      this._arsPulse = (this._rnd()<this.ars) ? 0.8 : 0;
      this._arsNext = T.arsInt*(0.5+this._rnd());
    }
    if (this._arsPulse>0){ this._arsPulse-=dt; this.locoRevDrive=Math.max(this.locoRevDrive,T.arsRevGain); }
  }
  step(dt,curvature){
    const N=this.N, V=this.V, act=this.act, I=this.Iext, T=TUNE;
    const P=this.Iper; P.fill(0); // persistent currents live one step, never accumulate
    this._t+=dt;
    this._locoStep(dt);
    // touch-evoked escape: sustained AVA drive while it lasts, then a sprint
    if (this.pokeHab===undefined){ this.pokeHab=1; this.escapeT=0; this.sprintT=0; }
    this.pokeHab=Math.min(1,this.pokeHab+dt/TUNE.pokeHabTau);
    if (this.escapeT>0){
      this.escapeT-=dt;
      for (const i of this.gAVA) this.Iext[i]+=TUNE.escDrive*dt*60*0.1;
      for (const i of this.gAVB) this.Iext[i]-=TUNE.escDrive*dt*60*0.06;
      this.noseTouchRecent=Math.max(this.noseTouchRecent,0.5);
      this.locoTonicMul=Math.max(this.locoTonicMul,1);   // back away hard even from a pause
      if (this.escapeT<=0) this.sprintT=TUNE.sprintDur;   // the run that follows the turn
    }
    if (this.sprintT>0){
      this.sprintT-=dt;
      const k=Math.min(1,this.sprintT/1.2);   // fades out over the last second
      // the sprint OVERRIDES a dwelling pause: prodding a stationary animal
      // makes it move, which is the whole point of the escape response
      this.locoTonicMul=Math.min(1.6,Math.max(this.locoTonicMul,1)*(1+TUNE.sprintGain*k));
      this._sprintK=k;
    }
    const F=this._mean(this.gAVB), B=this._mean(this.gAVA);
    this.command=(F-B)/(F+B+1e-6);
    // command flip-flop: tonic forward + cross-inhibition (MODEL ASSUMPTION)
    // behavioural inertia: a run that has just started resists being broken
    // again (RIM gap junctions stabilizing forward, Sordillo & Bargmann 2021)
    this.revRefract*=Math.exp(-dt/T.refractTau);
    this.offS += T.offTau>0 ? (this.offGate-this.offS)*Math.min(1,dt/T.offTau) : (this.offGate-this.offS);
    // AWC/ASE OFF responses ADAPT: a sustained decrease stops driving the
    // circuit after a few seconds (Chalasani et al. 2007, Nature 450:63).
    // Without this the model sits in a tonic OFF pedestal whenever it is on a
    // patch it is eating down (measured run 114: mean offS 0.39-0.45 near
    // food, which alone out-drives tonicF and leaves AVA dominant 66% of the
    // time even while roaming). offAdaptTau 0 = no adaptation = legacy.
    if (T.offAdaptTau>0) this.offBase += (this.offS-this.offBase)*Math.min(1,dt/T.offAdaptTau);
    else this.offBase=0;
    const offEff = Math.max(0, this.offS - T.offAdaptGain*this.offBase);
    const spont=Math.max(0,1-T.refractGain*this.revRefract);
    // dispersal suppresses SPONTANEOUS reversals only (the long-run phase of
    // global search); the chemosensory pirouette drive is deliberately left
    // at full gain so a disperser that meets a new gradient still navigates
    const spontLoc=Math.max(0,1-T.dispSupp*this.disp);
    // Arousal (roam/dwell sub-mode) scales the OSCILLATOR drive - that is what
    // makes a dwelling worm slow - but scaling the AVB tonic term by the same
    // factor also biases the flip-flop backward, because AVA's phasic drive is
    // not scaled: at locoTonicMul 0.10 (pause) any AVA blip wins. cmdArous
    // controls how much of the arousal scaling reaches the COMMAND circuit;
    // 1 = the pre-run-114 behaviour, 0 = arousal changes speed only.
    const cmdMul = 1 - T.cmdArous*(1-this.locoTonicMul);
    for (const i of this.gAVB) P[i]+=(T.tonicF+T.inertiaGain*this.revRefract+T.dispGain*this.disp)*cmdMul - T.xInh*B*0.9;
    // refractGain suppresses the SPONTANEOUS (roam/dwell + local-search)
    // reversal drive only. Until run 114 it also multiplied the chemosensory
    // dC/dt drive, which is why every refractoriness setting tested in runs
    // 111-112 killed chemotaxis: the pirouette signal was being gated by the
    // worm's own recent reversals. refractChemo (default 0) is the separate,
    // explicit knob if that gating is ever wanted.
    for (const i of this.gAVA) P[i]+=T.revOnOff*offEff*Math.max(0,1-T.refractChemo*this.revRefract)
                                    + this.locoRevDrive*spontLoc*spont - T.xInh*F*0.6;
    // reversal bookkeeping and omega turn on resumption
    this.noseTouchRecent*=Math.exp(-dt/1.5);
    if (this.command<-0.08) this.revTime+=dt;
    else {
      // Turn depth is decided by WHAT caused the reversal, not only its
      // length: nose touch/collision reliably drives a full omega turn in
      // real animals (Kaplan and Horvitz 1993; Alkema 2005's tyramine/RIM
      // circuit specifically sustains long backing after an aversive
      // stimulus). Reversals with no recent nose contact are the pirouette/
      // spontaneous kind (Pierce-Shimomura 1999); those still reliably clear
      // the duration floor in this model (the AVA/AVB flip-flop is
      // hysteretic by design, run 108) but in the living animal are more
      // often the shallower upsilon-class reorientation, so that is what an
      // untouched reversal becomes here once it clears the floor. MODEL
      // ASSUMPTION: the escape/spontaneous split is a simplification of a
      // continuum the field still argues over (Broekmans et al. 2016 found
      // deep spontaneous coils happen too, just not on every reversal).
      if (this.revTime>T.omegaThresh){
        if (this.noseTouchRecent>0.15) this.omegaT=T.omegaDur;
        else this.upsilonT=T.upsilonDur;
      } else if (this.revTime>T.upsilonThresh) this.upsilonT=T.upsilonDur;
      if (this.revTime>0.05) this.revRefract=1;
      this.revTime=0;
    }
    if (this.omegaT>0){ this.omegaT-=dt; for (const i of this.gOmega) P[i]+=T.omegaGain; }
    else if (this.upsilonT>0){ this.upsilonT-=dt; for (const i of this.gOmega) P[i]+=T.upsilonGain; }
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
    const drv = T.oscDrive*Math.max(F,B*0.9)*this.locoTonicMul; // roam/dwell arousal gates CPG drive directly (normalized command cannot: it saturates near +-1 regardless of magnitude)
    // under lighter load the whole rhythm runs faster (0.5 Hz on agar, near
    // 1.7 Hz in water, Fang-Yen 2010): scale the oscillator clock with load
    const clk = Math.pow(0.23,1-T.load); // 0.48 Hz on agar up to ~2 Hz in water (Fang-Yen 2010)
    // basal slowing on food: dopamine stretches the rhythm (Sawin 2000)
    const slowF=Math.max(0.45, 1 - T.dopaSlow*this.dopa - T.serSlow*this.ser);
    // motor-side slowing (see dopaMotor): the serotonergic term is heavier in
    // a food-deprived animal - Sawin's enhanced slowing response
    const serW=T.serMotor*(1+T.serMotorStarve*Math.max(0,0.5-this.serTone)*2);
    this.slowGain=Math.max(T.motorFloor, 1 - T.dopaMotor*this.dopa - serW*this.ser)
                 *(this.socSlow===undefined?1:this.socSlow);
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
    const cast=T.forageAmp*this.locoTurnMul*Math.sin(this.foragePhase)*gFcast(this)*(1-rimS)*(1-0.7*this.on);
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
    // the turn reorient reliably instead of depending on wave phase. Upsilon
    // is the same mechanism at half depth: the dorsal wave is only partly
    // damped (the body keeps some S-bend, so the head never reaches the
    // tail) and the ventral hold is weaker, which is what keeps the
    // resulting reorientation to roughly a right angle instead of ~180 deg.
    const om=this.omegaT>0?Math.min(1,this.omegaT/0.3):0;
    const up=this.upsilonT>0?Math.min(1,this.upsilonT/0.25):0;
    const steer=this.wdBias+this.klBias*gFcast(this)+(this.socBias||0);
    const dorsalSupp=Math.max(0,1-om-0.55*up);
    const oD=Math.min(1,Math.max(0,(this.oscD+Math.max(0,steer))*headSupp))*dorsalSupp;
    const oV=Math.min(1,Math.max(0,(this.oscV+Math.max(0,-steer))*headSupp))*dorsalSupp+om*1.25+up*0.7;
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
    const tgD=this._tgD||(this._tgD=new Float32Array(24)), tgV=this._tgV||(this._tgV=new Float32Array(24));
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
      // roam/dwell arousal directly gates neuromuscular drive toward resting
      // tone (0.5): the sigmoid above saturates even on a much-weakened neural
      // signal, so attenuating upstream current alone barely dims the crawl
      // (measured: no visible change). This compresses the SWING around rest,
      // which is what lets 'pause' sub-bouts genuinely go still (MODEL ASSUMPTION).
      const mg=this.locoTonicMul*(this.slowGain===undefined?1:this.slowGain);
      d=Math.max(0,Math.min(1,0.5+(d-0.5)*mg)); v=Math.max(0,Math.min(1,0.5+(v-0.5)*mg));
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
      tgD[k]=d; tgV[k]=v;
    }
    // ---- 95 muscle cells -------------------------------------------------
    // Each cell's own neuromuscular junctions pull it off its row's drive;
    // kinetics and electrical coupling are per cell, not per row.
    const cdrv=this._cdrv||(this._cdrv=new Float32Array(this.MC)); cdrv.fill(0);
    for (let e=0;e<this.mcN.length;e++) cdrv[this.mcM[e]]+=this.mcW[e]*act[this.mcN[e]];
    const mScl=0.42+0.58*Math.pow(0.23,1-TUNE.load);
    const cell=this.muscleCell, dev=T.mCellDev;
    for (let m=0;m<this.MC;m++){
      const k=this.mRow[m], D=this.mSideD[m];
      const base=D?tgD[k]:tgV[k];
      const rowDrive=D?md[k]*this.dNorm[k]:mv[k]*this.vNorm[k];
      let t=base+dev*(cdrv[m]*this.mcNorm[m]-rowDrive);
      if (t<0) t=0; else if (t>1) t=1;
      const r=(t>cell[m]?T.mRise:T.mFall)*mScl;
      cell[m]+=(t-cell[m])*dt/r;
    }
    // electrical coupling between neighbouring muscle cells (Cook 2019)
    const gm=(T.gMGJ??0.08)*dt;
    if (gm>0) for (const [a,b,w] of this.mgjCell){
      const f=gm*w*(cell[b]-cell[a]); cell[a]+=f; cell[b]-=f; }
    // the body bends on the row average of its cells
    for (let k=0;k<24;k++){
      const rd=this.rowD[k], rv=this.rowV[k];
      let sd=0; for (let i=0;i<rd.length;i++) sd+=cell[rd[i]];
      let sv=0; for (let i=0;i<rv.length;i++) sv+=cell[rv[i]];
      this.muscleDorsal[k]=rd.length?sd/rd.length:this.muscleDorsal[k];
      this.muscleVentral[k]=rv.length?sv/rv.length:this.muscleVentral[k];
    }
  }
}
