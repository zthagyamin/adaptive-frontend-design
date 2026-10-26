# Behavior checks for skill maintainers

Use these checks when changing task routing, clarification, approval conditions or expression selection. They are not a checklist to load for every website and not a visual-quality benchmark.

## Run a bounded check

1. Pick the cases affected by the change from [the case set](../tests/fixtures/behavior-cases.json). Keep their expected/reject fields with the evaluator.
2. Give a fresh agent only the Skill path, the case's request and context, and the actual tool/side-effect boundaries. Do not send the expected answer, suspected defect or prior result. Grant implementation only for a separately authorized production test; these cases request planning.
3. Preserve the observed reply or artifact, Skill file identity, runtime/tool availability and case ID. Compare observable decisions with the criteria. Record pass, fail or unobserved per criterion, with a short evidence pointer. A list of criteria is not a run result.
4. Compare each relevant pair: unresolved versus specified requirements; local implementation versus read-only review; vague versus confirmed 3D; dense operation versus editorial reading. Wording and theme changes do not prove structural difference.
5. Fix demonstrated ambiguity and rerun the affected case. Run broader checks only for a concrete dependency or new failure. Keep prior failures and distinguish planning adoption, a complete implemented site, actual visual inspection and user acceptance.

No fixed success rate, model, paid service or number of repetitions is required. CI checks packaging and executable invariants; it does not ask a model to grade its own prose. Planning checks cannot establish finished visual quality, uninterrupted motion, generalization or a causal improvement due to this Skill.
