# Lumora LSAT — Repository Audit, Plan, and Phase 1–3 Report

_Date: 2026-10-30 · Covers both specs: "Master Build Specification" and the "Expanded Engineering & QA Specification"._

The first section lists **verified facts** found by reading the code. Assumptions and recommendations are labeled as such.

---

## 1. Architecture summary (verified)

| Area | What exists |
|---|---|
| Frontend | React 18 + Vite 5. Almost all of the app is in **one file, `src/App.jsx`** (7,500 lines, 2.1 MB). About 1.7 MB of that is 8 base64 PNG mascot images inlined as JS strings. |
| Styling | Inline style objects. Theme tokens live in a mutable global `C` (DARK/LIGHT), plus `FONT_SCALE`. |
| State/routing | A single `App` component holds `screen` state. There is no router. A `pages` map switches screens. |
| Backend | Vercel serverless functions in `api/`: Stripe checkout, cancel, webhook, and a debug `test.js`. |
| Persistence | **Supabase REST** called from the browser with the **anon key**. A single `users` table stores each user's data as JSON columns (`history`, `learn_progress`, `stats`, `study_plan`, …). Every write is mirrored to `localStorage`, and `getUser` merges the local and remote copies with a "longest array wins" rule. Mistakes, SRS, scores and daily challenge are **localStorage only**. |
| Auth | Custom email + SHA-256 password hash with a predictable salt, computed client-side. The hash is stored in the `users` row. The session is just an email string in `localStorage`. |
| AI | `callClaude()` called `api.anthropic.com` **directly from the browser** using `VITE_ANTHROPIC_API_KEY` (model `claude-sonnet-4-6`). There are 20 call sites. |
| Payments | Stripe Checkout. The webhook sets `is_pro` in Supabase. |
| Tests | **None** before this work. No lint or type-check. |
| Deploy | Push to GitHub, then Vercel auto-deploys. `vercel.json` rewrites everything except `/api/*` to the SPA. |

## 2. Feature inventory (verified by reading code; ✓ = present)

- ✓ Landing, Auth (sign-up/login), 10-question self-report "diagnostic" (no performance items), onboarding overlay
- ✓ **Practice**: adaptive generated questions (`useQueue` + `PRACTICE_SYSTEM` + `buildQ`)
- ✓ **Learn**: 17 question-type lessons (`LEARN_CURRICULUM`) with 4 generated practice levels each. Each level advances on **one correct answer**.
- ✓ Quick 5, Daily Challenge, Flaw Lab (argument sparring), Writing, Full Section (timed), Upload (analyze a pasted question)
- ✓ Mistake Journal, SRS (SM-2 per question *type*), Study Journal/Notes, AI Study Plan, Dashboard / score trajectory
- ✓ Lex mascot + chat, XP/levels/badges/streak with "freezes", Pro gating with daily free limits

**Partial or fragile:** AI study plan is a one-shot generation with no adaptation. Mastery equals "one correct answer per level". Badges count raw volume. Free-tier limits live in `localStorage`, so they are trivially bypassed.

## 3. Generator map (verified)

```
UI (Practice/Quick5/Daily/Learn/SRS/FullSection…)
  → buildQ(section, level, qType, diagnostic, recentTopics)   // user prompt: domain wheel, random correct letter, stimulus type
  → callClaude(PRACTICE_SYSTEM, prompt, 1200)                  // long system prompt: originality + 7 self-checks
  → parseJSON(raw)                                              // strips fences, slices { … }
  → field-presence check (stimulus, question, A–E, correct) → retry ≤3
  → shown to student → answer stored in user.history[] (section, qType, level, correct, xp)
```
There is no independent verification, no duplicate check across sessions (only an in-memory list of 8 recent topics), and no stored question bank.

## 4. Risk register

| ID | Risk | Severity | Status |
|---|---|---|---|
| **R-1** | **Anthropic API key shipped in the browser bundle.** Anyone can extract it and run up charges. Verified: a canary key appeared in the built JS. | P0 | **Fixed in this phase.** New `api/claude.js` proxy. The prod bundle now contains 0 copies of the key (verified). |
| **R-2** | **Supabase anon key + no Row-Level Security assumed.** The client can read and patch *any* row in `users` by email, including password hashes, `is_pro`, and history. | P0 | **Fixed in code — you finish it in the dashboard** with `docs/SECURITY_MIGRATION.md` (RLS + column grants, verified on Postgres). |
| R-3 | The `/api/claude` proxy is reachable without authentication. The per-instance rate limit is only best-effort. | P1 | Mitigated (caps on size, tokens, and rate; fixed model). Full fix depends on R-2 (auth). |
| R-4 | Pro can be granted client-side: `?upgraded=true` URL, promo codes in the bundle, and the `isPro` flag saved from the client. | P0 (revenue) | **Fixed:** Pro is set only by the signed Stripe webhook or server-checked promo codes. Unsigned webhooks are rejected. Checkout, cancel and delete use the verified login. |
| R-5 | Hand-rolled password hashing (SHA-256, predictable salt, plaintext legacy fallback). | P0 | **Fixed:** Supabase Auth. Each account migrates on its next sign-in and the old hash is erased; the column is dropped after 60–90 days. |
| R-6 | All learning data lives in JSON blobs on one row, and the local/remote merge picks the longer array, so concurrent devices can lose writes. | P1 | Partly mitigated: the new engine uses id-keyed, idempotent records. A dedicated table is recommended. |
| R-7 | `App.jsx` is a 2.1 MB single file, including 1.7 MB of images. This slows builds and first load, and makes edits risky. | P2 | Open — move images to `/public` and split modules gradually. |
| R-8 | Legacy mastery advances a level on one correct answer. | P1 | New engine replaces this for guided skills. Legacy lessons are unchanged. |
| R-9 | Generated content had no independent check. | P1 | New pipeline adds schema, logic (blind re-solve), skill, and originality checks for guided practice. Legacy screens are unchanged. |
| R-10 | Semantic duplicates: there is no embedding model, so heavy rewrites of the same idea can slip through. | P2 | Documented limitation. Exact, near, and structural screening are in place. |

## 5. Reuse plan

| Keep as-is | Extend / wrap | Replace (later, with your OK) |
|---|---|---|
| `PRACTICE_SYSTEM`, `buildQ`, `useQueue`, all existing screens, Stripe functions, theme | `callClaude` now goes through the server proxy (same signature, so all 20 call sites keep working). The new practice engine reuses `PRACTICE_SYSTEM` + `callClaude` + `parseJSON` and adds lesson context + validation. Learn screen: guided path added above the classic lessons. Home: a "next step" card. | Custom auth → Supabase Auth + RLS. localStorage-only data → server tables. Inline images → static assets. |

## 6. Phased plan (order, dependencies, tests, rollback)

| Phase | Scope | Depends on | Status |
|---|---|---|---|
| 0 | Audit (this doc) + P0 key fix | — | ✅ Done |
| 1 | Learning foundation: skill graph (27 skills, 8 branches), lesson model, engine state, Learn navigation | 0 | ✅ Done |
| 2 | First complete loop: *Necessary & Sufficient Conditions* (Learn → Recognize → Apply → Challenge → Mastery check), placement/test-out, review | 1 | ✅ Done |
| 3 | Generator integration: context-aware requests, validation pipeline, exposure tracking, generation log, labeled fallback | 2 | ✅ Done |
| — | **Gate: R-2/R-4/R-5 security fix (auth + RLS)** | — | ✅ Code done; dashboard steps in `SECURITY_MIGRATION.md` |
| 4 | Tutor: context-grounded hints/explanations for the guided path (graduated, hypothesis-phrased diagnoses) | 3 | ✅ Done |
| 5 | Mastery & review across all skills; error-journal UI that merges with the legacy Mistake Journal | 4 | ✅ Done |
| 6 | Study planning: real test dates (the current diagnostic stores date *ranges*), daily/weekly plans, recompute on change | 5 | ✅ Done |
| 7 | Game layer on top of learning events (XP ledger already idempotent) | 5 | ✅ Done |
| 8 | Curriculum expansion: one full lesson per skill node, with human review | 2–3 | 🟡 5 of 27 skills have full lessons |
| 9 | Hardening: accessibility audit, performance (images), analytics, release | all | 🟡 Partial (see §10) |

**Rollback:** every change is additive. To revert, `git checkout` the previous `src/App.jsx` and remove `src/learning/`, `api/claude.js`, `tests/`. Learning data lives under `learnProgress.__engine`, which old code ignores.

## 7. Decisions needed from you

1. **Security (R-2/4/5).** I recommend migrating to Supabase Auth with Row-Level Security, moving `is_pro` writes to the webhook only, and removing client-side promo codes and the `?upgraded=true` grant. This changes the login flow and requires running SQL in your Supabase dashboard, so I have not done it unilaterally.
2. **Vercel env var.** Add `ANTHROPIC_API_KEY` in Vercel and then delete `VITE_ANTHROPIC_API_KEY`. The proxy temporarily accepts the old name so nothing breaks on deploy, but any `VITE_` variable *can* be inlined into the client bundle.
3. **Human content review.** The new lesson is machine-checked (truth tables) but should be reviewed by a qualified LSAT instructor before it is marked `approved`.

---

## 8. Phase 1–3 report

**1. Objective:** Close the P0 key leak. Build the learning engine and one complete, tested skill loop on top of the existing generator.

**2. Files changed / added**
- `api/claude.js` (new): server-side Anthropic proxy with size/token caps, rate limit, timeout, safe logging
- `src/App.jsx` (edited): `callClaude` goes through the proxy, with a dev-only direct fallback that is compiled out of production. `handleUpdateUser` accepts a functional update. Learn renders the guided path above the classic lessons. Home shows a "Your next step" card. Mobile nav overflow fixed.
- `src/learning/` (new): `config.js` (LSAT format by date + all thresholds, versioned), `skills.js`, `logic.js`, `lessonEngine.js`, `mastery.js`, `review.js`, `xp.js`, `questionValidation.js`, `practiceEngine.js`, `store.js`, `recommend.js`, `LearnPath.jsx`, `content/necessarySufficient.js`
- `tests/learning.test.js`, `tests/api.test.js` (new). `package.json`: `npm test`.

**3. Existing features preserved:** All screens, Practice generator, classic Learn lessons, XP/badges/streaks, Stripe, Supabase sync. Legacy `learnProgress[<Type>]` values are untouched.

**4. New behavior**
- Skill tree with Not Started → Learning → Practicing → Developing → Proficient → Mastered, each with a plain-language reason.
- Full 5-stage lesson: objective, why it matters, explanation, translation table, worked examples, counterexample, common mistakes, comprehension check, recognition items, guided items with 3-level hints, two generated independent challenges, and a 3-item mastery check.
- Confidence capture; hints, reveals and guesses are recorded and count as *assisted*.
- Error journal entry on every miss, with a provisional category the student can change and a link to the smallest relevant lesson section. A later independent success marks the error resolved.
- Test-out placement (5 varied items, no hints) that counts as evidence, not mastery.
- Spaced review per skill (1/3/7/14/30/60 days) using a fresh item.
- Explainable "next step" recommendation (decision order from spec §7).
- Idempotent XP ledger: retries and double-clicks never duplicate rewards.
- Students can report a question; flagged items stop counting toward mastery.

**5. Data model:** Stored at `user.learnProgress.__engine` (this rides the existing synced `learn_progress` jsonb, so **no DB migration**). It holds lessons, append-only attempts (capped at 1,500), derived mastery with policy version, reviews, XP ledger, exposure fingerprints, generation log, errors, and flags.

**6. AI contracts:**
- New generation prompt `skillgen-ns-v1`, which reuses the existing `PRACTICE_SYSTEM`.
- New blind verifier prompt: re-solves the question without the key, and the item is rejected if its answer differs or the verifier calls it ambiguous.
- Legacy prompts are unchanged.

**7–8. Tests run and results**
- **Unit + integration (`npm test`, Node test runner): 58/58 pass.** Coverage:
  - Conditional logic: contrapositive, converse, inverse, unless, chains, De Morgan.
  - **Every formally encoded lesson item is proven by truth table to have exactly one valid answer, and it matches the key.** This check caught and fixed 7 authoring defects during development.
  - Skill-graph cycles; lesson state machine idempotency and remediation.
  - Mastery: hints, guesses, reveals, easy-only items, a repeated item, and a single perfect set never yield Mastered; delayed review promotes; failed delays decay with the peak kept.
  - Review intervals; XP idempotency; double-submit; error resolution; flag exclusion.
  - Schema rejection cases: missing choice, bad key, explanation contradicts key, two keys, duplicate choices.
  - Duplicate screening: exact, punctuation edit, and noun-swap are all caught, while a distinct item passes.
  - Generator: approved path, verifier mismatch, invalid JSON, timeout, not-configured, verifier down (→ provisional, not scored), exposure repeat, wrong-skill rejection.
  - LSAT format switches correctly on Aug 2027.
  - API proxy: 503 without key, input validation, key never returned, token cap, upstream error / timeout mapping, rate limit.
- **End-to-end (Playwright against a built bundle with a mocked `/api/claude`): 32/32 pass.** Coverage:
  - Full lesson journey, refresh mid-lesson and resume.
  - Hint recorded; double-click submit gives one attempt.
  - Generated question uses lesson context and the verifier.
  - Provider failure gives a labeled authored fallback with no crash.
  - Mastery check has no hints; one session does not give Mastered; review is scheduled.
  - XP is stable across refresh; the generation log contains no question text.
  - Keyboard-only test-out; no horizontal scroll at 375 px.
  - **Existing Practice generator still works through the proxy**; zero uncaught page errors.
- **Build:** Bundled with esbuild (Vite/npm registry not reachable from my sandbox) with production defines. Key canary count: 0. **Not run:** `vite build` itself. Run `npm install && npm run build && npm test` locally once to confirm.

**9. Known limitations**
- Only one skill has a full lesson; other nodes link to classic lessons or show "Coming soon".
- The tutor is not built yet (Phase 4).
- The study plan is still the legacy one-shot generation.
- Mastery thresholds are uncalibrated starting values.
- Semantic duplicate detection is limited (R-10).
- Content is pending human review.
- Engine data shares the legacy "longest array wins" merge across devices (R-6).

**10. Security/privacy:** The key has moved server-side. Logs contain only safe metadata. **R-2/R-4/R-5 remain open and are the most important next step.**

**11. Cost:** Each guided challenge or review item costs one generation call plus one short verification call (~300 tokens). Failures fall back to authored items at no cost.

**12. Rollback:** See §6.

**13. Next:** Security gate (needs your go-ahead), then Phase 4 (tutor) and Phase 5 (mastery/review for all skills, unified error journal).

---

## 9. Requirement traceability (P0/P1)

| Req | Implementation | Test(s) | Result |
|---|---|---|---|
| Secrets server-side (Exp §12) | `api/claude.js`, `callClaude` in App.jsx | api.test.js ×5; bundle canary | Pass |
| Generator preserved (Master §8, Exp §9) | `callClaude` signature unchanged; engine reuses `PRACTICE_SYSTEM` | e2e "existing Practice generator…"; "uses the existing PRACTICE_SYSTEM prompt" | Pass |
| Lesson stages & idempotent transitions (Exp §5) | `lessonEngine.js` | "stages advance…idempotent", "remediation…" | Pass |
| Mastery from evidence, policy-versioned (Exp §6) | `mastery.js`, `config.js` | 10 mastery tests | Pass |
| Hints/reveals ≠ independent | `mastery.js#isIndependentCorrect` | "success with hints…", "revealed answers…" | Pass |
| Test-out without mastery inflation (Journey B) | `placementOutcome`, `tested_out` event | unit + e2e keyboard placement | Pass |
| Wrong answer → explanation, error record, remediation link, later fresh review (Journey C) | `QuestionCard`, `store.recordAttempt`, `review.js` | store tests + e2e | Pass |
| AI unavailable → no blank page / no false reward (Journey E) | `practiceEngine` fallback, `SourceBadge` | 4 generator tests + e2e failure | Pass |
| Schema / answer / skill / originality validation (Exp §9) | `questionValidation.js`, `practiceEngine.js` | 9 tests | Pass |
| XP idempotency (Exp §11) | `xp.js`, keyed awards in `store.js` | unit + e2e refresh | Pass |
| Educational correctness of content (Master §16B) | `content/necessarySufficient.js` + `logic.js` | truth-table test over all items | Pass (human review pending) |
| Date-aware LSAT format (Master §14) | `config.js#formatForDate` | format test | Pass |
| Accessibility basics (Exp §13) | radiogroup/radio roles, focus-visible, text + icon status (not color alone), aria-live feedback | e2e keyboard-only placement | Pass (full audit in Phase 9) |
| Authorization across users (Exp §12) | `supabase/migrations/002_lockdown_rls.sql`, `api/_lib/supabase.js#getAuthUser` | `supabase/tests/rls_test.sql` (26 Postgres assertions), `tests/accounts.test.js` (14), browser E2E (26) | Pass (live once Step 5 is run) |


---

## 10. Phase 4–9 report (2026-10-31)

**1. Objective:** Build out the rest of the learning platform on top of the Phase 1–3 engine: a tutor, a review system, an adaptive plan, learning achievements, more lessons, and a hardening pass.

**2. Files added or changed**
- **Added:**
  - `src/learning/tutor.js`
  - `journal.js` and `ReviewHub.jsx`
  - `planner.js` and `PlanPanel.jsx`
  - `achievements.js` and `ProgressPanel.jsx`
  - `content/index.js` (lesson registry)
  - `content/conditionalChains.js`, `negationAndOr.js`, `quantifiers.js`, `argumentParts.js`
  - Tests: `tests/tutor.test.js`, `review.test.js`, `planner.test.js`, `achievements.test.js`, `curriculum.test.js`
- **Extended:**
  - `logic.js`: model checker for quantified statements (all / some / no / most).
  - `practiceEngine.js`: generation specs and skill-alignment checks for each skill.
  - `recommend.js`: prerequisite-gap rule.
  - `store.js`: error snapshots, notes, study profile, plan versions, achievements.
- **App.jsx:**
  - New Review screen.
  - Home shows today's plan.
  - The Study Plan screen gets the adaptive plan.
  - The Progress screen gets the learning-progress panel.
  - Navigation regrouped into Learn, Challenges and Tools; the Practice screen is renamed "Question Generator".
  - Menu buttons get accessible labels.
  - The floating Lex button is smaller on phones.

**3. Preserved:** every existing screen and the existing generator. The old AI study plan, old Mistake Journal, old SRS and old practice statistics are still there, labeled "classic."

**4. New behavior**
- **Tutor (Lex inside lessons):**
  - Answers using only the lesson text and the stored answer key.
  - Hints are graduated and checked for answer leaks; a leaking hint is regenerated, then replaced by the authored hint.
  - After answering, students can ask "why is my answer wrong", "explain it another way", "check my reasoning", or a free question.
  - Does not tutor before submission in challenge, mastery, placement or review stages.
  - Diagnoses are phrased as guesses.
  - If it judges a question ambiguous, the question is flagged and removed from mastery scoring.
  - A tutor hint counts as assistance on the attempt.
  - At most 6 calls per question.
  - If the AI is down, it shows the reviewed explanation instead.
- **Review hub:**
  - *Due today:* capped at 5, with no backlog pressure.
  - *Error journal:* question snapshot, a category the student can edit, notes, archive, link to the relevant lesson section, and status "resolved by a later correct answer".
  - *Weak skills:* skills with repeated recent unresolved mistakes, with the reason.
  - *Flagged questions.*
- **Adaptive plan:**
  - Study profile: test date, or "not scheduled", or "already taken"; minutes per day; days per week; optional target and latest score. Onboarding answers are used only as labeled estimates — no invented test date.
  - Planning modes by time to the test: 12+, 8–12, 4–8, 2–4 and under 2 weeks.
  - Daily plan: never exceeds the student's minutes, reviews take a capped share, one main goal, and a short version for busy days.
  - Missed days never pile up into a backlog.
  - Past test dates are rejected, with options to pick a new date or mark the exam as taken.
  - When the date changes, the app shows "what changed", including a different LSAT format if the new date falls after August 2027.
  - Weekly check-in with no guilt messaging; versioned plan history.
- **Achievements:** 11 achievements for retention, fixing mistakes, transfer to new questions, calibration and routine. None reward volume or speed. They are idempotent, and the learning level comes from learning XP.
- **Progress panel:** mastery per skill with reasons and evidence, on-your-own vs. with-help accuracy, confidence vs. correctness, retention, and timing shown separately from accuracy. Percentages only appear once a group has at least 5 answers.
- **Curriculum:** 5 full lessons, 72 items in total:
  - Premises & Conclusions (author-verified)
  - Necessary & Sufficient (truth-table verified)
  - Negation / And / Or (truth-table verified)
  - Quantifiers (model-checked; "most" is checked only up to a size bound)
  - Conditional Chains (truth-table verified)

  The checker caught and fixed a wrong answer key in the Chains lesson. Each skill also has its own generation spec.

**7–8. Tests run**
- **Unit and integration (`npm test`): 121/121 pass.**
- **Supabase rules on real Postgres: 26/26 pass.**
- **Browser end-to-end tests:**
  - Learning flows: 31/31 pass. Covers the plan card, opening a lesson directly, the AI hint and its logging, no tutoring in challenges, the hedged diagnosis, review notes, plan edits including a past date, achievements, no horizontal scroll at 375 px on four screens, keyboard-only test-out of a new lesson, and the existing generator.
  - Account security: 26/26 pass.
- **Not run:** `vite build` itself (the npm registry is blocked in my sandbox; bundling was checked with esbuild). Real-model quality of tutor and generator output (mocked in tests).

**9. Known limitations**
- 22 skills still link to classic lessons or show "coming soon". Priority next: necessary/sufficient assumption, flaws, inference, and Reading Comprehension. Those need author review, because they cannot be machine-proved.
- All content still needs review by a qualified instructor.
- Daily Challenge, Timed Section and Flaw Lab do not yet feed skill mastery, because their items have no skill tags yet.
- Mastery thresholds have not been calibrated against real students.
- Images are still inlined in `App.jsx` (about 1.7 MB).

**10. Security and privacy:**
- Tutor requests contain no names or emails, and student text is sent as data, not instructions.
- Notes are capped at 1,000 characters; only category, note and archive can be edited.
- All learning data lives in the student's own profile row, which row-level security protects once Step 5 of `SECURITY_MIGRATION.md` is done.

**11. Cost:** Tutor calls are made only on request, capped at 6 per question, at about 500 output tokens each.

**13. Next:** The dashboard session (`SECURITY_MIGRATION.md`), then more lessons.

## 11. Curriculum & Lesson Overhaul v2.0 / v2.1 (2026-10-31)

- All 27 curriculum nodes now have complete guided lessons (22 new or rebuilt: Truth vs. Support, Deductive vs.
  Inductive, Main Conclusion, Role, Method, Necessary and Sufficient Assumptions, Strengthen, Weaken, Causal, Evaluate,
  Resolve/Explain, Must Be True (+ Most Strongly Supported), Flaws, Parallel (+ Parallel Flaw), Principles, Passage
  Structure (Main Idea + Purpose), Author Perspective, RC Inference & Detail (+ Analogy), Comparative Passages,
  Statistics & Base Rates, Media claims). Generator specs exist for every node.
- Lesson engine v2: Orient (unscored diagnostic before instruction), Explain & reflect (self-check; text never stored),
  retention review shown in the stage list, mixed review (type hidden) required for Mastered.
- Mastery policy `mastery-v2`: ≥8 distinct items, ≥3 structures, ≥80% recent unassisted, explanation, no unresolved
  misconception; Mastered = delayed + mixed.
- Classic: all 17 entries open the rebuilt lesson/track (deep links `#classic/LR/Weaken`, `#learn/<skill>/<track>`);
  Classic levels shown as legacy only; originals reachable as reference.
- Text size: fixed small text app-wide (`fz()` floor of 12px, scaled by A+/A-), and fixed a render loop caused by a
  name clash (`setFontScale`) that would have crashed the app on load.
- Traceability matrix: `docs/CURRICULUM_TRACEABILITY.md`. Tests: 226 passing.
