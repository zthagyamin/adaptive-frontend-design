# Motion Lab

Three independent, interruptible mechanism studies. This is a technical and visual reference, not a suggested default composition for other websites.

## Run

From this directory, with Node.js 20 or newer:

```sh
node serve.mjs
```

Open **http://127.0.0.1:4303**. `AFD_DEMO_PORT` overrides the port. The service binds only to loopback, uses Node built-ins, and requires no install or runtime packages. Keep this example beside `migration-field-guide`: the server maps exactly `/vendor/three.module.js` and `/vendor/THREE-LICENSE.txt` to that example's existing engine and MIT notice. It does not copy or download an engine. A missing sibling is a missing dependency, not an automatic network fallback.

## Three studies, three contracts

| Study | Input and visible mechanism | Release, interruption and quiet state |
| --- | --- | --- |
| Scroll sequence | Native document scroll directly maps to image placement, scale and handoff. Three original SVG illustrations accompany real prose. | Reverse, stop or use ordinary page keys at any point. One semantic chapter owns the text; no overlapping paragraph layers. No wheel interception, virtual scroller, or temporal smoothing of scroll position. |
| Elastic surface | A 64 × 40 subdivided Three.js plane responds to a distance-weighted local force. A grab stores its original rest-space point; dragging changes that same patch's displacement target. Lighting and a wire overlay expose the actual deformed vertices. | Release removes external force while preserving current vertex positions and velocities. A damped spring converges to rest; the loop stops at equilibrium. A new direction updates the target without restarting the shape. |
| Particle field | A deterministic seeded cloud carries separate positions and velocities. Pointer movement adds signed local velocity; holding adds local curl. | Release removes force, damping dissipates velocity and a weak rest force restores the field. No idle turbulence. Local DOM pulses use the same simulation. High: 4,200 points / DPR cap 1.6. Low: 1,200 / DPR cap 1. |

Each effect exports `createEffect({ host, reducedMotion })` and returns `reset()`, `setReducedMotion(boolean)`, and `destroy()`. The shell destroys the current instance before mounting a new study. Shared engine module bytes are browser-cached; renderer, geometry, material, observer, listener and animation-loop ownership belongs to each mounted instance. Destroy is idempotent. The surface shares one geometry between its solid and wire layers; disposal deduplicates shared resources.

## Input and accessibility

- Tabs support Left/Right, Home and End. Controls have stable names and visible keyboard focus.
- Surface: pointer hover or a captured grab; canvas arrows select a patch, Space holds/releases, Escape releases. The adjacent point and lift sliders and Hold/Release buttons provide equivalent local shape control.
- Particles: pointer brushing or captured stirring; canvas arrows choose a point, Space pushes, Escape releases. Point/strength sliders plus Push/Stir/Let go provide DOM input without mouse movement.
- Captures are cleared on release, cancellation, lost capture, blur, resize, hiding, leaving the viewport and destroy. A second pointer cannot replace an existing gesture.
- Canvas touch handling retains vertical native page scrolling and pinch zoom. Touch parity still requires real-device observation; CSS intent does not establish it.
- The system motion preference initializes the visible Reduce motion control and updates it when changed. The user can override it on the page. Scroll becomes still chapter reading with every paragraph exposed. The surface becomes a static local lift; particles become a static local disturbance. Release restores each still shape immediately. The same actions remain available.
- WebGL initialization/context failure preserves written content, marks rendering unavailable, and disables its dependent controls. Switch study and return to create a fresh renderer. No claim of automatic context restoration is made.

## Cost and scope

The reused Three.js **r160** module is 1,326,016 uncompressed bytes. It is imported by the module graph on first entry, including the scroll study. Three.js uses its built-in material color pipeline; no custom display shader, HDR, texture, model download, shadow map, bloom, post-processing or GPU compute pass is involved.

The surface has 2,665 vertices, 5,120 triangles and two mesh draw calls. Positions and normals update on the CPU while the spring is active. The particle field uses one points draw call plus one small selection ring, with CPU integration. These counts describe implementation cost, not measured performance. The point cloud is a local artistic response, not a fluid solver; the surface is a visual spring model, not cloth physics or a material simulation. Geometry is original and intentionally abstract.

One animation owner per WebGL study schedules work only while needed. Hiding or leaving the viewport cancels input and suspends advancement. Re-entry resets the frame baseline; hidden wall time is not integrated. Frame deltas are capped and the surface spring uses substeps. These bounds do not establish stable frame rate on a device.

## Verification and remaining observation

```sh
node --test test/*.test.mjs
```

Node tests cover reversible chapter identity, spring release and convergence, local particle response and decay, reduced-motion state, loop deduplication, suspension/re-entry time, listener cleanup and remount, HTTP resources, engine byte identity, method handling and traversal rejection. Use `node --check` for module syntax. Test files are development checks, not runtime dependencies.

The automated checks do **not** establish visual quality, smoothness, hit accuracy with real pointer input, touch behavior, WebGL rendering, actual GPU cleanup, or accessibility conformance. Inspect the running full interface at wide and narrow viewports; walk mid-scroll stops/reversal, strong drag/release, rapid re-entry, blur/cancel, keyboard equivalents, quality changes, and reduced motion at normal speed. A status label, screenshot, computed position or passing Node test is not evidence of continuous motion feel.

## Original work and sources

All example-specific layout, prose, SVG studies, interaction state, integration and numerical code were authored for this example. No commercial site's effect code, assets or layout was copied. The source mechanisms were informed by the accompanying skill's [motion systems](../../skills/adaptive-frontend-design/references/motion-systems.md), [interaction craft](../../skills/adaptive-frontend-design/references/interaction-craft.md), [motion language](../../skills/adaptive-frontend-design/references/motion-language.md) and [Three.js workflow](../../skills/adaptive-frontend-design/references/threejs-workflow.md). Those references describe method; their examples do not prove this implementation's appearance.

Three.js r160 is by the Three.js authors and contributors, under MIT. The existing sibling engine is served without modification. Its full [MIT notice](../migration-field-guide/assets/THREE-LICENSE.txt) is also available at the local server's `/vendor/THREE-LICENSE.txt` route. The original repository's source is [three.js r160](https://github.com/mrdoob/three.js/tree/r160); relevant official references are [BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry), [PointsMaterial](https://threejs.org/docs/#api/en/materials/PointsMaterial), [color management](https://threejs.org/manual/en/color-management.html) and [resource disposal](https://threejs.org/manual/en/how-to-dispose-of-objects.html). API usage was checked against the bundled r160 module, not assumed from a newer release.
