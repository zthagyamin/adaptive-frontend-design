# What has and has not been validated

The public edition carries over methods developed through website work and explicit revisions. It removes private task archives and machine-specific dependencies; it is not a benchmark of skill effectiveness.

## Included example

The migration field guide's working project was inspected using native pointer and keyboard actions, rendered views, DOM checks, source checks, and deterministic data relationships. The examined paths included seasonal map changes, map selection, notes, archive filters and empty results, related reading, history and deep-link refresh, reduced motion, and selected wide/narrow layouts.

The finished example includes revisions after its first complete version. It should not be represented as an unassisted, single-pass result. Its data is fictional, and its two images are generated concepts.

## Repository checks

`scripts/validate.mjs` checks package structure, metadata, JSON, relative references, required attribution, and release-exclusion markers. The executable tests cover motion/projection invariants, example history behavior and illustrative data relationships. Package fixtures exercise valid and invalid local anchors, icon paths and version agreement. These checks do not establish actual agent adoption, visual quality, complete accessibility, continuous feel, or performance.

The public package can be installed independently of the example. Existing local installations are not replaced by merely cloning this repository.

## Maintainer behavior checks

[Paired behavior cases and procedure](BEHAVIOR-CHECKS.md) support bounded, independent checks of routing, scope, approval conditions and expression choices. The case set contains expectations, not observed results. Record the actual run and its limits separately; it is not a controlled benchmark.

On 2026-10-26, one fresh agent received the updated Skill and the eight request/context pairs, without their grading criteria or prior review. Its planning responses were reviewed against those criteria: it clarified unresolved requests, continued specified work, preserved local/read-only scope, connected the confirmed 3D path, and distinguished the operational and editorial structures. These are eight scenarios in one bounded planning run, not eight isolated production runs or evidence of finished visual quality.

The example history correction was also exercised in a browser using direct-detail → related-content → close, in-site map entry → multiple related items → Escape, and refresh → close. The examined paths returned to a stable manual section or the actual map source with a visible focus target. This targeted check does not repeat the example's entire visual or device acceptance.

## v0.2.0 implementation and release evidence

Version 0.2.0 is prepared for release; it has not yet been merged or published. On 2026-10-27 (Asia/Taipei), the maintainer accepted the overall direction of the two complete pages, their control expressions and the motion studies' interaction feel after being given the live pages. That feedback is distinct from technical checks and does not establish universal quality. True 200% browser zoom is awaiting the maintainer's separate check; it was not waived. Installed/private editions are unchanged.

At public commit `c3383e2cc696cdc086e03b84deccaba737436464`, [CI run 40387533545](https://github.com/zthagyamin/adaptive-frontend-design/actions/runs/40387533545) passed the Node 20/22 checks and 55 Chromium desktop/narrow tests. One redundant narrow video recording was deliberately skipped; narrow functional paths were run. WebKit was skipped for the draft PR and remains a final gate. The uploaded report/video was downloaded and its archive digest checked.

The initial resource measurements exposed startup layout movement, despite the byte budgets passing. A subsequent diagnostic run recorded the actual moving nodes: the journal and lab footers were painted before their module content, and the scheduler date row gained height after data loading. The original failed checks and artifacts remain in the CI history. Commit `69eec755fa0dd8b10d3b81533faf448b57cbddda` reserved the relevant initial space; [CI run 40389257460](https://github.com/zthagyamin/adaptive-frontend-design/actions/runs/40389257460) passed the same behavior tests and three startup observations per example at both sizes.

| Example at `69eec75` | Initial encoded response bodies, each of 3 trials | Startup shift sum: desktop / narrow, each of 3 trials |
|---|---:|---:|
| Scheduler | 45,394 bytes | 0.00078 / 0.00792 |
| Journal | 635,165 bytes | 0 / 0 |
| Motion: scroll first, engine on demand | 37,057 bytes | 0 / 0 |

The same runner also loaded the fixed pre-lazy-loading app fixture against the same effects, CSS and engine in three fresh contexts: 1,337,485 encoded body bytes per trial. This supports a reduced initial dependency cost; it does not prove a universal speed gain. Observation times include the harness's readiness check, font readiness and two frames. Startup shift sums cover that bounded window, not a full-session field metric; 0.1 is this example's diagnostic threshold, not a universal Skill rule. These byte counts exclude response headers. The journal deliberately loads concept WebP derivatives; PNG originals and near-view derivatives remain separate.

Raw startup observations: [initial desktop](validation/v020-startup-before-desktop.json), [initial narrow](validation/v020-startup-before-narrow.json), [corrected desktop](validation/v020-startup-after-desktop.json), [corrected narrow](validation/v020-startup-after-narrow.json). The eager/lazy comparison is matched within each run; separate CI runs are not used to claim timing gains.

Native pointer/keyboard inspection separately exercised scheduler success, delay, retry, conflict recovery, cancel/undo and focus; journal image/related return, direct routes and wide/narrow boundaries; and the lab's scroll reversal, surface and particle input, release, reduced motion and replacement. Repeated lab diagnostics read actual renderer resources after disposal; the examined old instances returned geometry and texture counts to zero. Local frame-interval and CPU simulation/submission samples are bounded observations, not GPU timings or device-wide FPS claims.

The frozen candidate also received one eight-scenario planning run and two independent runnable transfer tasks. The operations slice needed a coordinator repair after a late save redrew the focused resume control; its first failure, original source snapshot and repaired browser path were kept. The editorial slice's examined image/related return paths worked without a coordinator code repair. These are bounded, revised transfer results, not controlled evidence of Skill effectiveness. The planning-only editorial response also proposed extra author/topic pages: those should stay conditional on scope rather than become automatic requirements.

The later additions about startup space and resolved glyph fonts are implementation-derived guidance beyond that frozen transfer run. They have not received a second independent production evaluation. Automated scans and the native paths above do not constitute complete accessibility certification. True 200% browser zoom remains unverified in the available native browser surface; viewport resizing is not counted as zoom. Physical touch, complete screenreader use, continuous native motion observation and final WebKit/main checks remain explicit gaps. The maintainer's accepted effect feedback is recorded above and does not fill those technical gaps.

## Limits

No controlled comparison isolates the contribution of the skill from model, task, assets, author, or reviewer. Other agent hosts have not all been independently exercised. Physical touch, full screen-reader use, arbitrary occlusion, real GPU recovery, and sustained cross-device performance are not comprehensively validated. Continuous motion quality requires appropriate actual observation; recording is optional when useful and supported.
