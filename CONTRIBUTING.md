# Contributing

Help improve decisions and complete user paths, rather than adding another universal style rule.

## Useful changes

- A reproducible failure: request, relevant state, input sequence, expected result, actual result, and environment.
- A complete example with sufficient content, real interactions, and asset attribution.
- A reference that changes an implementation decision, including tradeoffs and counterexamples.
- A translation that preserves scope, conditions, uncertainty, and behavior.

Do not submit private project material, personal task histories, credentials, or commercial assets without distribution rights. Keep examples fictional or explicitly authorized. Describe checks honestly: screenshots, synthetic events, native input, continuous observation, and human feedback are different evidence.

## Before a pull request

1. Keep the change scoped. Preserve existing methods and legitimate design alternatives.
2. Keep detailed guidance conditional; the entry point should remain a useful router.
3. Preserve source attributions, modification notices, and applicable license texts.
4. Run `node scripts/validate.mjs` and `node --test tests/*.test.mjs` with Node.js 20+.
5. For behavior changes, include a representative request and a nearby request that should stay unaffected. Static checks do not demonstrate agent adoption or aesthetic improvement.

Use the user's requested language. Do not turn one site's palette, typography, spacing, controls, or camera into a default for unrelated work.

By contributing, you agree that your original contribution may be distributed under the project's Apache-2.0 terms. Identify separately licensed third-party material instead of relabeling it. Be respectful and keep discussions concrete.
