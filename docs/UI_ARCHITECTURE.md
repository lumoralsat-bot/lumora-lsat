# Lumora UI architecture (learning-first restructure, 2026-11)

## 1. Problems with the previous UI

- **Home was a feature grid.** About 10 tiles had nearly equal weight: Practice, Learn, Flaw Lab, Writing, Full Section, Progress, Study Plan, Notes, Mistakes and SRS. Quick 5, the daily challenge, stats, XP, badges, a plan card and a suggestion banner sat on top of the grid. Nothing said "do this next".
- **Learn showed everything at once.** The page held all 27 skills as large cards, each with its description, prerequisites, status and repeated buttons. Below that sat a second grid of 17 question-type lessons labeled as an older system ("Classic", "Replaces Classic", "Legacy: level n").
- **The lesson screen had extras:**
  - A banner explaining the migration.
  - A seven-box stage strip.
  - The floating assistant and its pop-up bubbles, which competed with instruction.
- **Progress mixed several kinds of data on one page:**
  - Skill mastery, XP, a grid of every achievement (including locked ones), a "Practice statistics (classic)" heading, the score predictor, difficulty and type bars, and insights.
  - Percentages were shown from very small samples.
- **The header was crowded:** streak, an Upgrade button, avatar, dark-mode toggle, A+, A- and a hamburger, with 14 destinations in the drawer. Two of those destinations were labeled "Classic".
- **Secondary text was hard to read.** Dark-theme `textMuted` was #4a5c80 on #06080f, about 3:1 contrast.

## 2. Navigation and screen hierarchy

Primary navigation is always visible: a top tab bar on desktop and a bottom tab bar under 820px. It has five destinations:

| Destination | Screen id | Contains |
|---|---|---|
| Home | `home` | Continue/Start learning (the one dominant action), review card, today's plan, preview of the current module, one quiet link to Practice |
| Learn | `learn` | Current objective + Continue, module progress, the learning path as collapsible modules of compact lesson rows. Row → lesson detail (description, objective, why, prerequisites, tracks, placement check, review, question-type drills). Lessons open in the focused lesson workspace. |
| Practice | `practiceHub` | Question generator (`practice`), Quick 5, daily challenge (`daily`), timed section (`fullsection`), Flaw Lab (`flaw`), LSAT Writing (`writing`), question-type drills (the 17 type walkthroughs with four levels), practice mistakes (`mistakes`), question-type review (`srs`) |
| Review | `review` | Spaced reviews, mixed review, mistake journal |
| Progress | `dashboard` | Tabs: Overview · Skill mastery · Practice performance · Achievements · Score estimates |

The account menu (avatar, top right) holds:

- Profile and settings
- Upgrade, subscription status
- Study plan (`plan`)
- Notes (`notes`)
- Ask Lex
- Display: light/dark mode, text size
- Legal links
- Sign out

Sub-screens highlight their parent tab (`NAV_PARENT` in `App.jsx`).

### Lesson workspace (focus mode)

The workspace shows:

- Back to the learning path and the module name
- A Notes button, which opens a notes panel tied to the lesson
- Title and objective
- A compact stage bar, with done stages revisitable and "then: retention review" shown
- One activity at a time

While a lesson, placement, review or mixed review is open, the floating assistant and its pop-up bubbles are hidden. "Ask Lex" stays available inside each question.

## 3. Canonical curriculum data model (unchanged)

- `src/learning/skills.js` — 27 nodes in 8 modules (`BRANCHES`), each `lesson: 'full'`. That is 22 skill-tree destinations plus foundation and formal-logic subskills.
- `src/learning/content/index.js` — `LESSONS` (one per node), `LESSONS_BY_SKILL`.
- `src/learning/navigation.js` — new, pure view-models:
  - `currentLearning`: the in-progress lesson, else the recommendation with reviews excluded
  - `curriculumModules`, `lessonStatus`, `lessonStageProgress`, `reviewSummary`
- Mastery, lesson engine, recommendations, generator and review scheduling are untouched.

## 4. Design system (`src/ui/kit.jsx`)

- **Primitives:** `Page` (880px width, 20px gutter, one heading style), `Panel` (default, accent and quiet tones), `SectionTitle`, `Eyebrow`, `Button` (primary, secondary, ghost; one primary per view), `ProgressBar`, `StatusMark` (shape plus label, never color alone), `Chip`, `Tabs` (ARIA tablist), `Stat`, `Row`.
- **Responsive helpers:** `UI_CSS` provides the `lm-grid-*` collapse rules and mobile padding that keeps content clear of the bottom bar.
- **Contrast:** in dark mode, `textMuted` went from #4a5c80 to #8494ba and `textSub` from #7a90bb to #9aaccf. In light mode, `textMuted` went from #7a8aaa to #55668a.
- **Headings:** the global `h1/h2/h3 !important` sizes now apply only to headings without `.lm-h`, so new components size their own headings.

## 5. Terminology removed from student-facing UI

| Removed | Now |
|---|---|
| "Replaces Classic: …" (skill cards) | removed (lesson detail lists "Extra practice: … drills") |
| "Classic lessons by question type" + explanation | question-type drills in Practice |
| "Opens the rebuilt lesson", "Classic progress shown as legacy" | removed |
| "Legacy: level n of 4", "Legacy: complete" | "Level n of 4" on drill rows |
| "You opened the Classic X lesson. It has been rebuilt here…" | removed; the lesson simply opens (with its track) |
| "View the original Classic lesson (reference)" | "Extra practice" drills in lesson detail |
| "Free: … Pro adds the original Classic lessons as reference" | removed; drills show a Pro chip where locked |
| "Practice statistics (classic)" | Progress → Practice performance |
| "AI-written overview (classic)" | Study plan → Written study guide |
| "Classic Mistake Journal" / "Mistake Journal" | Practice mistakes |
| "Classic SRS Review" / "SRS Review" | Question-type review |
| "classic Mistake Journal" (Review screen) | Practice mistakes |
| "Study Journal" | Notes |
| "Question Generator" page title "Practice" | Question generator |
| "a classic strengthener" (Strengthen lesson) | "one of the most common ways to strengthen" |
| "Classic example:" (Paradox generator prompt) | "Typical example:" |
| Lex system prompt section list | rewritten for the current IA; it tells Lex never to describe any part of the app as old, new, classic, legacy or a replacement |
| Onboarding tour (11 cards, "17 question types" textbook) | 5 cards: Learn, Review, Practice, Progress, Study plan & notes |

## 6. Internal compatibility mappings retained

- `src/learning/content/classicMap.js` → `CLASSIC_ROUTES` (17 type → lesson/track mappings), `classicRoute`, `parseHash`. Older `#classic/LR/<Type>` links still resolve to the current lesson and the URL is rewritten to `#learn/<skill>[/<track>]`.
- `classicLabel` on lessons (metadata only, never rendered).
- `user.learnProgress[<TypeName>]` levels for the 17 question-type drills, shown as "Level n of 4" in Practice.
- `user.history` is unchanged. New records from Quick 5 and timed sections add `mode` and `timed: true`, which powers timed vs. untimed. Earlier records count as untimed, and the UI says so.
- Auth `legacy_login` migration endpoint and `profileFromLegacyDiagnostic` (internal names).
- Screen ids `practice`, `mistakes`, `srs`, `notes`, `plan` and `dashboard` are unchanged, so Lex navigation and existing links keep working.

## 7. Verification (2026-11-01)

- `npm test`: 232 passing. New tests:
  - `tests/navigation.test.js` (NAV-01..05)
  - UI-01 terminology scan across all student-facing screens and lesson content
  - CL-04/CL-05 updated
- Production bundle builds.
- Browser checks at 1280, 820 and 390px: no horizontal overflow on Home, Learn, Practice, Review or Progress; bottom navigation on tablet and phone.
- New student: Home shows "Start learning", the first lesson and a placement check.
- Returning student: Home shows "Continue learning" with the stage.
- An older `#classic/LR/Weaken` link opens the Weaken lesson and is rewritten to `#learn/evaluation.weaken`.
- The floating assistant is hidden in lessons, and the Notes panel opens.
- Lesson detail → drills → back returns to the lesson. Practice → drills → back returns to Practice.
- All six practice modes, practice mistakes, study plan and notes open.
- Progress persists: lesson stage survives a reload (Recognize before and after).

## 8. Open items

- The Pro lock on question-type drills (first type free per section) is kept from before. Confirm it is still wanted.
- Profile hides the main navigation (unchanged); consider showing it.
- Older practice screens (question generator, Flaw Lab, Writing, timed section) keep their internal layouts. They now sit under Practice, and the kit primitives are available to migrate them gradually.
