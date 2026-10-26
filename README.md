# Adaptive Frontend Design

**Content-led frontend design for coding agents — from readable interfaces to motion and interactive 3D.**

[中文](README.zh-CN.md) · [Install](#install) · [Try a prompt](#try-a-prompt) · [Example](#a-complete-example) · [Contribute](CONTRIBUTING.md)

[![License](https://img.shields.io/github/license/zthagyamin/adaptive-frontend-design)](LICENSE)
[![Validate](https://github.com/zthagyamin/adaptive-frontend-design/actions/workflows/validate.yml/badge.svg)](https://github.com/zthagyamin/adaptive-frontend-design/actions/workflows/validate.yml)

Give your agent a design process that starts with **who will use the site, what they need, and how the content works**. Then build the complete path: browse, choose, inspect, read, and return.

![Migration field guide: content, routes, and a realtime map](docs/assets/field-guide-routes.jpg)

## What it helps with

| Situation | Guidance |
| --- | --- |
| Every new site looks like the last one | Compare structure, typography rhythm, copy, and interaction — beyond theme and color. |
| A page feels cramped or empty | Diagnose hierarchy, grouping, content distance, and density instead of enlarging every gap. |
| Motion is a collection of isolated effects | Connect input, visible change, readable content, interruption, and return. |
| A 3D model sits beside unrelated paragraphs | Make scene changes reveal what the content describes, with direct navigation and stable reading. |
| Controls all look the same | Choose links, commands, selections, continuous controls, or spatial markers by their actual role. |
| A demo works but the full site breaks | Check native input, detail/history paths, resizing, fallback, focus, and reduced motion. |

This is an **instruction skill**, not a component library or an autonomous website generator. It does not require an API key, server, account, or particular framework. The agent still needs the project, suitable assets, implementation tools, and a way to inspect the result.

## Install

### Skills CLI

From the project where you want to use it:

```sh
npx skills add zthagyamin/adaptive-frontend-design --skill adaptive-frontend-design
```

Choose your coding agent when prompted. The community [Skills CLI](https://github.com/vercel-labs/skills) currently requires Node.js 22.20+. Its installer supports multiple agents; this project's practical workflow has been exercised with Codex, not independently validated across every supported host. The CLI's documentation explains its optional telemetry and opt-out.

### Codex installer or manual copy

Ask Codex:

```text
Use $skill-installer to install adaptive-frontend-design from
https://github.com/zthagyamin/adaptive-frontend-design/tree/main/skills/adaptive-frontend-design
```

Or clone this repository and copy **the whole** `skills/adaptive-frontend-design` folder into your project's `.agents/skills/`. For user-wide Codex use, copy it into `~/.agents/skills/`. Avoid duplicate installations with the same skill name; compare existing changes before replacing a folder. See the [official skill documentation](https://learn.chatgpt.com/docs/build-skills).

The root `plugin.json` also describes a portable skills-only plugin. A GitHub release does **not** mean the plugin has been reviewed or listed in a universal plugin directory.

## Try a prompt

```text
Use $adaptive-frontend-design to build a complete website for a neighborhood
repair workshop. Help visitors understand services, choose a repair category,
and read what to bring. Ask only the missing questions that would change the
design. Use the audience's language and inspect the actual result.
```

For a spatial project:

```text
Use $adaptive-frontend-design to create a complete wildlife migration field
guide. Connect a seasonal 3D route map with observation notes and species
records. Use fictional data clearly marked as illustrative. Preserve direct
links, stable reading, keyboard access, and meaningful return paths.
```

For a local change:

```text
Use $adaptive-frontend-design to improve the Save filter button's feedback.
Keep the accepted layout and existing save behavior. Inspect the real success,
failure, and keyboard paths; do not redesign the whole page.
```

The entry point is English; the detailed guidance is currently primarily Chinese. Ask the agent to use your audience's language. Translations that preserve the methods and their limits are welcome.

## A complete example

The included **migration field guide** connects three seasons, three locations, eight illustrative notes, and two example groups. It has a realtime map, search and combined filters, linked reading, direct URLs, browser history, and a reduced-motion control.

```sh
git clone https://github.com/zthagyamin/adaptive-frontend-design.git
cd adaptive-frontend-design
node examples/migration-field-guide/serve.mjs
```

Open the address printed by the server. Node.js 20+ is sufficient for this local demo; it has no install step or runtime package download. [Example details and assets](examples/migration-field-guide/README.md).

![Field guide homepage](docs/assets/field-guide-home.jpg)

These are real screenshots of the included project, not a promise that a skill call produces the same design. Its images are generated concepts and its records are fictional. The public edition preserves the working methods while removing private research and task history. [Validation scope](docs/VALIDATION.md).

## How the skill is organized

The agent reads the entry point, then only the references needed for the task:

```text
skills/adaptive-frontend-design/
  SKILL.md             Scope, workflow, and route selection
  references/          Typography, composition, controls, motion, space, assets
  assets/motion/       Optional dependency-free geometry and motion helpers
  agents/openai.yaml   Optional Codex interface metadata
  SOURCES.md           Attribution and modification notices
  licenses/            Upstream license and NOTICE texts
```

It keeps **implementation checks**, **visual assessment**, and **human acceptance** separate. Source inspection or a screenshot alone does not establish continuous feel, performance, accessibility, or aesthetic improvement.

## Contribute

Useful contributions include reproducible interaction bugs, better task-specific references, faithful translations, and complete examples with clear asset rights. Run:

```sh
node scripts/validate.mjs
node --test tests/*.test.mjs
```

Please read [CONTRIBUTING.md](CONTRIBUTING.md). If the workflow helps, a star makes the project easier to find; a concrete example or issue helps improve it.

## License and sources

Original project material and modifications are available under [Apache-2.0](LICENSE). Incorporated third-party material retains its applicable terms and attribution in [SOURCES.md](skills/adaptive-frontend-design/SOURCES.md) and the bundled license texts. The example includes Three.js under its MIT license. Linked commercial sites, brands, fonts, models, and photographs are not licensed by this repository. No upstream author endorsement is implied.
