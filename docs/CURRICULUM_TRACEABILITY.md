# Curriculum traceability (Curriculum & Lesson Overhaul v2.0 + v2.1 Classic addendum)

Generated from the code on 2026-10-31. Regenerate after content changes; `tests/curriculum.test.js` and
`tests/curriculum_v2.test.js` enforce the invariants listed here.

## 1. Every node has a complete guided lesson

| Branch | Node (skill id) | Lesson | Items (orient/rec/apply/chal/mastery) | Formally checked keys | Tracks | Classic entries routed here | Generator spec |
|---|---|---|---|---|---|---|---|
| Foundations | Premises & Conclusions (`found.argument_parts`) | `lesson.found.argument_parts` v1.0.0 | 1/4/3/2/3 | 0 of 13 | — | — | yes |
| Foundations | Truth vs. Logical Support (`found.validity`) | `lesson.found.validity` v2.0.0 | 1/3/2/2/3 | 3 of 11 | — | — | yes |
| Foundations | Deductive vs. Inductive Reasoning (`found.deductive_inductive`) | `lesson.found.deductive_inductive` v2.0.0 | 1/3/2/2/3 | 2 of 11 | — | — | yes |
| Formal Logic | Necessary & Sufficient Conditions (`formal.necessary_sufficient`) | `lesson.formal.necessary_sufficient` v1.0.0 | 1/6/4/5/4 | 19 of 20 | — | — | yes |
| Formal Logic | Negation, "And" & "Or" (`formal.negation_or`) | `lesson.formal.negation_or` v1.0.0 | 1/4/3/2/3 | 13 of 13 | — | — | yes |
| Formal Logic | Quantifiers: All, Most, Some, None (`formal.quantifiers`) | `lesson.formal.quantifiers` v1.0.0 | 1/4/3/2/3 | 10 of 13 | — | — | yes |
| Formal Logic | Conditional Chains (`formal.chains`) | `lesson.formal.chains` v1.0.0 | 1/4/3/3/3 | 14 of 14 | — | — | yes |
| Argument Analysis | Main Conclusion (`analysis.main_conclusion`) | `lesson.analysis.main_conclusion` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Main Point | yes |
| Argument Analysis | Role of a Statement (`analysis.role`) | `lesson.analysis.role` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | — | yes |
| Argument Analysis | Method of Reasoning (`analysis.method`) | `lesson.analysis.method` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Method of Reasoning | yes |
| Argument Evaluation | Necessary Assumptions (`evaluation.necessary_assumption`) | `lesson.evaluation.necessary_assumption` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Assumption | yes |
| Argument Evaluation | Sufficient Assumptions (`evaluation.sufficient_assumption`) | `lesson.evaluation.sufficient_assumption` v2.0.0 | 1/3/2/2/3 | 10 of 11 | — | — | yes |
| Argument Evaluation | Strengthen (`evaluation.strengthen`) | `lesson.evaluation.strengthen` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Strengthen | yes |
| Argument Evaluation | Weaken (`evaluation.weaken`) | `lesson.evaluation.weaken` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Weaken | yes |
| Argument Evaluation | Causal Reasoning (`evaluation.causal`) | `lesson.evaluation.causal` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | — | yes |
| Argument Evaluation | Evaluate the Argument (`evaluation.evaluate`) | `lesson.evaluation.evaluate` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Evaluate | yes |
| Argument Evaluation | Resolve / Explain (`evaluation.paradox`) | `lesson.evaluation.paradox` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Paradox | yes |
| Inference & Flaws | Must Be True (`inference.must_be_true`) | `lesson.inference.must_be_true` v2.0.0 | 1/3/2/2/3 | 6 of 11 | must_be_true, most_supported | LR Inference → must_be_true | yes |
| Inference & Flaws | Common Reasoning Flaws (`inference.flaws`) | `lesson.inference.flaws` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | LR Flaw | yes |
| Advanced LR | Parallel Reasoning & Parallel Flaw (`advanced.parallel`) | `lesson.advanced.parallel` v2.0.0 | 1/3/2/2/3 | 0 of 11 | parallel_reasoning, parallel_flaw | LR Parallel Reasoning → parallel_reasoning | yes |
| Advanced LR | Principles (`advanced.principles`) | `lesson.advanced.principles` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | — | yes |
| Reading Comprehension | Passage Structure (`rc.structure`) | `lesson.rc.structure` v2.0.0 | 1/3/2/2/3 | 0 of 11 | main_idea, purpose | RC Main Idea → main_idea; RC Purpose → purpose | yes |
| Reading Comprehension | Author Perspective & Tone (`rc.author`) | `lesson.rc.author` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | RC Author's Tone | yes |
| Reading Comprehension | RC Inference & Detail (`rc.inference`) | `lesson.rc.inference` v2.0.0 | 1/3/2/2/3 | 0 of 11 | detail, inference, analogy | RC Detail → detail; RC Inference → inference; RC Analogy → analogy | yes |
| Reading Comprehension | Comparative Passages (`rc.comparative`) | `lesson.rc.comparative` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | RC Comparative Passage | yes |
| Transfer & Real-World Logic | Statistics & Base Rates (`transfer.statistics`) | `lesson.transfer.statistics` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | — | yes |
| Transfer & Real-World Logic | Evaluating Claims in the Media (`transfer.media`) | `lesson.transfer.media` v2.0.0 | 1/3/2/2/3 | 0 of 11 | — | — | yes |


"Formally checked keys" = answer keys verified by the truth-table / quantifier model checker (`logic.js`).
All other keys are author-verified; every lesson's review status is `in_review` until a qualified human signs it off.

## 2. Lesson flow (all lessons)

| v2 stage | Where | Counts toward mastery? |
|---|---|---|
| Orient | First screen of "Orient & learn": one diagnostic question before instruction | No |
| Learn | Why it matters, sections, worked examples, counterexample, common mistakes | — |
| Recognize | Short items, checkpoint 3 of last 4 | No |
| Guided apply | Hints available (graduated, ≥2 per item), checkpoint 2 correct | Yes (hinted answers count as assisted) |
| Challenge | Fresh generated questions (verified) or authored fallback, no hints | Yes |
| Explain & reflect | Learner writes an explanation (never saved), compares with the model, self-checks 3 points, picks a likely misconception | Self-check result only |
| Mastery check | 3 authored questions, no hints | Yes |
| Retention review | Spaced reviews in Review, plus Mixed review (type not named) | Yes |

## 3. Mastery gate (`config.js` → `MASTERY_POLICY` v `mastery-v2`)

Proficient requires: ≥8 distinct items correct on your own · ≥3 distinct question structures · ≥80% recent unassisted
accuracy · ≥2 challenge-level wins · an acceptable explanation (≥2 of 3 self-checks) · no unresolved misconception
(the same kind of mistake still open twice or more). Mastered additionally requires a correct unassisted review at
least 3 days after first practice **and** a correct answer in mixed review.

"Question structure" is approximated by `structureKey()` (reasoning pattern in the stimulus × task in the stem). It is
deterministic and explainable but not a full logical parse.

## 4. Classic → rebuilt routing (17 entries)

| Classic section | Classic lesson | Rebuilt lesson | Track | Deep link |
|---|---|---|---|---|
| LR | Assumption | Necessary Assumptions | — | `#classic/LR/Assumption` |
| LR | Weaken | Weaken | — | `#classic/LR/Weaken` |
| LR | Strengthen | Strengthen | — | `#classic/LR/Strengthen` |
| LR | Flaw | Common Reasoning Flaws | — | `#classic/LR/Flaw` |
| LR | Inference | Must Be True | must_be_true | `#classic/LR/Inference` |
| LR | Main Point | Main Conclusion | — | `#classic/LR/Main%20Point` |
| LR | Paradox | Resolve / Explain | — | `#classic/LR/Paradox` |
| LR | Method of Reasoning | Method of Reasoning | — | `#classic/LR/Method%20of%20Reasoning` |
| LR | Parallel Reasoning | Parallel Reasoning & Parallel Flaw | parallel_reasoning | `#classic/LR/Parallel%20Reasoning` |
| LR | Evaluate | Evaluate the Argument | — | `#classic/LR/Evaluate` |
| RC | Main Idea | Passage Structure | main_idea | `#classic/RC/Main%20Idea` |
| RC | Purpose | Passage Structure | purpose | `#classic/RC/Purpose` |
| RC | Author's Tone | Author Perspective & Tone | — | `#classic/RC/Author's%20Tone` |
| RC | Detail | RC Inference & Detail | detail | `#classic/RC/Detail` |
| RC | Inference | RC Inference & Detail | inference | `#classic/RC/Inference` |
| RC | Analogy | RC Inference & Detail | analogy | `#classic/RC/Analogy` |
| RC | Comparative Passage | Comparative Passages | — | `#classic/RC/Comparative%20Passage` |

Behavior: clicking any Classic card (or opening its deep link) opens the rebuilt lesson on the right track, with a note
explaining the change and a button to view the original Classic lesson as reference (Pro, as before). Classic levels
are shown as "Legacy: level n of 4" and never feed mastery. Back from the reference view returns to the rebuilt lesson.

## 5. Acceptance tests

| ID | What it checks | Test |
|---|---|---|
| CUR-01 | Every node has a complete lesson; graph acyclic | curriculum_v2.test.js |
| CUR-02 | Eight stages, one Orient item per lesson | curriculum_v2.test.js |
| CUR-03 | Orient/Learn/Recognize unscored | curriculum_v2.test.js |
| CUR-04 | Challenge → Explain → Mastery check | curriculum_v2.test.js |
| CUR-05 | Pre-v2 saved progress still completes | curriculum_v2.test.js |
| CUR-06 | Explanation self-check; written text never stored | curriculum_v2.test.js |
| CUR-07 | Repeated open mistakes block Proficient until fixed | curriculum_v2.test.js |
| CUR-08 | Objective, why, worked examples, counterexample, misconceptions → sections | curriculum_v2.test.js + curriculum.test.js |
| CUR-09 | Tracks tagged and ordered | curriculum_v2.test.js |
| CUR-10 | Structure key | curriculum_v2.test.js |
| CUR-11 | Every key formally checked or author-verified; every distractor explained, tagged, remediated | curriculum.test.js |
| CUR-12 | Graduated hints on every guided item | curriculum.test.js |
| CUR-13 | No near-duplicates across the curriculum (RC sets compared by question) | curriculum.test.js |
| CUR-14 | Generator spec for every node | curriculum.test.js |
| CUR-15 | Mastery gate (8 items / 3 structures / explanation / misconception) | learning.test.js |
| CUR-16 | Mastered needs delayed + mixed | learning.test.js |
| CUR-17 | Hints/guesses/reveals never count as independent | learning.test.js |
| CUR-18 | End-to-end lesson run (Orient → Mastery check) in a browser | manual Playwright run, 2026-10-31 |
| CL-01 | All 17 Classic types routed, tracks exist | curriculum_v2.test.js |
| CL-02 | RC vs LR "Inference" disambiguated | curriculum_v2.test.js |
| CL-03 | Deep links round-trip; junk and auth hashes rejected | curriculum_v2.test.js |
| CL-04 | Classic grid opens rebuilt lesson; legacy not promoted | curriculum_v2.test.js |
| CL-05 | Original reachable as reference with a way back | curriculum_v2.test.js |
| CL-06 | Lesson events work when opened from Classic | curriculum_v2.test.js |

## 6. Known limitations

- All lesson content is original and `in_review`; it needs a qualified human review before being called final.
- Explanations are self-assessed against a model explanation (no AI grading), so "acceptable" depends on honesty.
- Structure diversity is a heuristic (see §3).
- Mixed review unlocks after two completed (or tested-out) lessons.
- Business decision to confirm: all guided lessons are free; Pro still gates the original Classic lessons (reference view).
