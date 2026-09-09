# Authorship and integrity record

Generated 2026-09-09. This file records what exists, when it was made, and who directed it,
so that authorship can be shown later without relying on memory. It is not legal advice.

## How this work was made

SimLearn is directed by the site owner, who sets the goal of every module, chooses which
published models are worth simulating, specifies the interface and the visual language,
reviews every build, and accepts or rejects each change. The code and the prose are
drafted by an AI agent (Foreman) working to those instructions and revised on the owner's
feedback, run by run. The instruction history, the per-run digests, and this commit
history together are the record of that direction.

Two things follow from that, and both are worth knowing before anybody relies on the
copyright position:

- Under UK law a computer-generated work has an author, namely the person who made the
  arrangements necessary for its creation (Copyright, Designs and Patents Act 1988, s9(3)),
  with a 50-year term under s12(7). The instruction record is the evidence of who made
  those arrangements.
- Under US law protection reaches only the human contribution. The Copyright Office
  requires AI-generated material to be identified and excluded from a claim, so a US
  registration should claim the selection, arrangement, direction, and edited text rather
  than the whole of the generated code. See https://www.copyright.gov/ai/ .

## Repository

- Repository: joelwellbournewood/simlearn, published at https://simlearn.ai
- First commit: a160c2a on 2026-08-28 (Add site shell + boids/predator-prey sims)
- Latest commit at generation: a2d2980 on 2026-09-09
- Commits: 115
- HEAD: a2d2980577c2a725e478a7dbc23629a766889a9b

## Third-party components

- three.js r128, MIT licence, loaded at runtime from cdnjs. Not modified, not redistributed.
- No other libraries, frameworks, fonts served locally, or copied assets. Every simulation
  model is implemented from the published description of the model, which is cited in that
  simulation's explainer. Assumption stated plainly: no code was copied from any other
  project into this one.

## File digests (SHA-256)

Any later copy can be compared against these. A match on a file with this much text in it
is not a coincidence.

| file | bytes | sha256 |
| --- | --- | --- |
| `.nojekyll` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `CNAME` | 12 | `cca160060bbf93894b6ca52cbc3dd537062ac970b318f9fb02c931a28288097e` |
| `README.md` | 1858 | `539f363ba80c7a7ee527906366761bff8cc049ee28d6858eb7f272254dd3c7f9` |
| `about.html` | 2085 | `917cdac5e4e61cd1338e345c5442bc276149aca168b57b795364d286b9ed684f` |
| `assets/css/sim-legacy-mobile.css` | 688 | `e1f8752c43f221dab92ca5a3b733f8e2b4f94088439f3fef762f985055a74fb3` |
| `assets/css/sim-mobile.css` | 3595 | `711678d6cc54d1be1ac3f82ee352689c1208060a23488b5a09df8bc5f76d9fbf` |
| `assets/css/sim-touch.css` | 1800 | `a906dd87f5ff6c672479b91cc8e1ecdc8d11326a97874b5233f0a4f3df6f9973` |
| `assets/css/style.css` | 20261 | `b3f61e310574a9cc4b5ff09bdf7d150242b964ab4bb11902e0fe731e9c2be4e7` |
| `assets/css/theme-lock.css` | 2565 | `a613dceb8131a580de6cca627605cb1fcc0e34e8709b19cb5e3dddf5b8846a99` |
| `assets/js/colorpop.js` | 10208 | `703396a16991138954d2d2c489f20abdd1dfed0da10fd1dbcfe3d8f42c58e1ac` |
| `assets/js/cradle.js` | 14205 | `14d75301a244647ec626a5b66aff8345d643d3738825f314b981cb859dc03233` |
| `assets/js/explainer.js` | 3636 | `6d3d802f0277594e94083ae38802bf0a38e565d88fc74ffcc404949f32bc6d77` |
| `assets/js/main.js` | 26336 | `9844a11dc38bfd866a4da8322dc1c79ef15e1360238e9b6ea318483ce2d8ecad` |
| `assets/js/sim-mobile.js` | 3132 | `aa1db59a85e80c8c7abb5228dd80839c5d74e59e86b0ac5499969cf40df69aee` |
| `assets/js/slogan.js` | 4321 | `fad84d74994c74b43a0a7a0cff4dd67879dcb3ce2eb3bd9130dd00237cbfae9c` |
| `assets/js/theme-guard.js` | 4056 | `79e4f89a6bb364b2a05f6363cbd0d37192bad938b6c1bebbcd7e88d67ab8734c` |
| `docs/ADDING-A-SIM.md` | 4861 | `ddaaf889391c8eb19a51732171b7d594536016a1b89f70abc2dcbba1a1f39b17` |
| `docs/ARCHITECTURE.md` | 4572 | `07199fed8dbbdb68447954b9f45bdebe556e395d7eafbcc81fadf678219d3b11` |
| `docs/HOSTING.md` | 2172 | `ded34c5fa7d4cbabfada29a88becef298b4217533328e14259e2fbb71d1aa628` |
| `docs/PERFORMANCE.md` | 4279 | `cd0e3dbe3e1a1f73330ddef274b4bbeed14f8766342adb4e6c69a392eb543849` |
| `docs/STATUS.md` | 5126 | `6b51c24d4ce9af79edbe1c99fc5a4f519b0c380aae6dc4e43cc6aa18d27c6c75` |
| `docs/originals/turing-patterns.html` | 57129 | `e9858d6cc3fdbe919b90ff98f5197d2990cda70e2d2c8e5ec5d58cdf867c9796` |
| `docs/run-notes-2026-09-07.md` | 7257 | `1d827938fa854663bbcf68ae7a00ef56636e744655c719c8f2d24373c6d1fd05` |
| `index.html` | 3153 | `412504ebed5d97bc0c3b49ef01b140552fd01782883c60491bbcba99e92d8c36` |
| `sim.html` | 4591 | `22d8083fd7923785369fcda91f99c09b4ca05d2b189607b14bd5eb1eb594a1ee` |
| `sims/boids/index.html` | 161430 | `c649ed668f905be110bf767b2a0ab28d3c872daa5693ce90d6c947d47497b9be` |
| `sims/double-pendulum/index.html` | 37324 | `3df1c5a74e1b88c4a2785df3468be418c301e1a9443f0132357297f7f6ce61a7` |
| `sims/epidemic/epidemic.js` | 9532 | `c0503328e90d74a7ec3f3bec90772a8dba5fd88c12f01f3241298c32b672f50b` |
| `sims/epidemic/index.html` | 5829 | `5f434ea1a5316a22969d32a3baac2ec68e91fdd74b391d70fdefac36215d10e7` |
| `sims/game-of-life/index.html` | 7448 | `f455682b337062e263dea757b40faa5acfa0a84bf4e6ae7669b0b8f356fe52b5` |
| `sims/gravity/index.html` | 95998 | `a6061a0223026fafb658025f26f970275d031c0d2dc7ceddb17cc835fd73adb9` |
| `sims/hodgkin-huxley/index.html` | 164128 | `dd9d8ebd1df91d1bebcc7e3dc06aca65446d959c56dc380368a767d1a9ab0ee0` |
| `sims/lorenz/index.html` | 36778 | `eebadec0cfec6ff8bd1e84b46a3565bc255c938d18841c04959b1edf6d0e59ac` |
| `sims/manifest.json` | 6360 | `bb1685da5619e253c6dc676f1aa0fc149fc9464fa774a4e531cd23fb09a82568` |
| `sims/optics-lens/index.html` | 47373 | `1da41751c67390519d56b18147808133a538ae5becbf00c6e7a9c2f166ad9791` |
| `sims/predator-prey/index.html` | 85127 | `0c91410f98385b770d757c5ce66b7b8f565c0a47aedb63e52e3b02def44474ae` |
| `sims/segregation/index.html` | 6747 | `d95439d48909a3ec95cd539dc3c3eb5024907613deb71e87eb2a73f70edaa740` |
| `sims/traffic/index.html` | 59631 | `9a669000617fc60f2d050df18f6339cc849c054fe348611480ac0c0a4f759e11` |
| `sims/turing-patterns/index.html` | 109752 | `95ed6783de8b34112887d2a75d8e0ab886e0264c76817a82e5c1678f17b82563` |
| `tools/boidscheck.py` | 2069 | `be4b8e3b6c3ac706529d872626c11a4f99b2ef46d4ae269b1a549f706dfdee36` |
| `tools/fps.py` | 2557 | `c991330053662553e7e60986a0a62603b261b333dcd478983b5448624309cd31` |
| `tools/gcheck.py` | 1949 | `1735e3f532a7a1d8cf90310941289da9c392e32e1657cf4a9972fd567f607f7d` |
| `tools/inframe.py` | 1265 | `e9e2c624dc6a13085468119d868d8ee084066d7ef376bf749846586a4aa97fee` |
| `tools/lynxshot.py` | 1715 | `e7bf10cbc37763035903362e385d3375427d016f32cd790860183444c723a48b` |
| `tools/qa.py` | 2495 | `51556a9852000ae03dc80b58e2d221d5c6b83f29fd9f3f1aaf16442276e654ba` |
| `tools/v.py` | 1278 | `2bebc9bf1c98ca33198c59859acd2edd943025308c156787dd4f423ad1d4f7d1` |

