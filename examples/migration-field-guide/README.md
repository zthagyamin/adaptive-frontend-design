# Migration field guide · 逐候

A complete fictional field handbook connecting seasonal routes, a realtime coastal map, eight notes, and two illustrative groups. The public example includes the finished source, not private task logs or evaluation transcripts.

## Run locally

From the repository root with Node.js 20+:

```sh
node examples/migration-field-guide/serve.mjs
```

Open the address printed in the terminal. It listens on the local machine only. Set `AFD_DEMO_PORT` to choose a different port. No package installation, API key, or runtime download is required.

Try a seasonal route, a location and its note; search and combine archive filters; read a related group and another note, then return. Detail URLs support direct entry and browser history. Narrow screens have the same content and direct location-list controls. The reduced-motion switch retains actions and reading.

## Asset and dependency statement

| Material | Source and status |
| --- | --- |
| `index.html`, `app.js`, `data.js`, `map.js`, `style.css` | Project-authored example and subsequent bounded revisions, Apache-2.0. An internal debug global is omitted in the public edition. |
| Terrain, plants, route and bird shapes | Original programmatic demonstration geometry. No external model, texture, HDR, sound, or map data imported. |
| `assets/wetland.png`, `assets/shorebird.png` | Generated for this project with the built-in image-generation tool on 2026-10-26. Conceptual wetland/flock and generic shorebird imagery, not photographs, species identification, or observed locations. Pixels are included without editing. |
| `vendor/three.module.js` | Three.js r160; complete [MIT license](assets/THREE-LICENSE.txt) retained. |
| Fonts | Operating-system font families and fallbacks; no font files redistributed. |

All places, routes, dates, counts, weather, and behavior records are illustrative. The map is not to scale and has no real coordinates. This is not field monitoring, species identification, conservation evidence, or navigation guidance.

The generated images depict generic birds. They are not evidence that a particular real species exists or follows a particular route. The screenshots in the repository show this example's rendered pages without browser or desktop chrome.

## Scope

The example illustrates the workflow; it does not certify the skill's quality across tasks or agent hosts. It includes revisions after an initial complete build. See the repository's [validation limits](../../docs/VALIDATION.md).
