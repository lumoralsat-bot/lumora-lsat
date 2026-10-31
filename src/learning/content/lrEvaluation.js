// Argument Evaluation: Necessary & Sufficient Assumptions, Strengthen, Weaken, Evaluate (Curriculum v2.0 §7).
import { item, REVIEW } from './helpers.js';

const GAP_SECTION = { id: 'gap', title: 'Find the gap first', body: [
  'State the conclusion exactly. List the evidence. Then ask: what NEW idea appears in the conclusion that the evidence never mentions? That is the gap.',
  'Most assumption, strengthen, weaken, and evaluate answers work by touching that gap.',
] };

export const LESSON_NA = {
  id: 'lesson.evaluation.necessary_assumption', skillId: 'evaluation.necessary_assumption', version: '2.0.0', review: REVIEW(false),
  title: 'Necessary Assumptions', estMinutes: 25, classicLabel: 'Assumption',
  objective: 'By the end, you will be able to identify a claim the argument REQUIRES — one whose falsity would wreck the argument — and confirm it with the negation test.',
  why: 'Necessary Assumption questions are among the most common in LR, and the same gap-finding drives Weaken, Strengthen, and Flaw questions.',
  sections: [
    GAP_SECTION,
    { id: 'negation', title: 'The negation test', body: [
      'Negate the answer choice in its weakest logical form. If the negated version destroys the argument, the choice is necessary.',
      'Negating “all” gives “not all” (at least one is not) — not “none.” Negating “some” gives “none.”',
    ] },
    { id: 'minimal', title: 'Necessary answers are often modest', body: [
      'A required assumption can be weak: “at least some,” “not all,” “it is possible that.” A choice that would PROVE the conclusion is often too strong to be required.',
      'Sufficient is not the same as necessary: something can guarantee the conclusion without being the only way to get there.',
    ] },
    { id: 'defenders', title: 'Defender assumptions', body: [
      'Many necessary assumptions rule out a problem: “no other factor explains the result,” “the sample is not unusual.” Negating them introduces the problem.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“Mara studied for the final exam. So she will pass.” Necessary assumption?', steps: ['Gap: studying → passing.', 'Candidate: “Studying is not useless for passing this exam.”', 'Negate: “Studying is useless for passing.” The argument collapses.'], conclusion: 'Necessary: studying has at least some relevance to passing.' },
    { id: 'we2', prompt: 'Same argument. Is “Everyone who studies passes” necessary?', steps: ['Negate: “Not everyone who studies passes.”', 'Mara could still pass — the argument is weaker but not destroyed.'], conclusion: 'Sufficient (it would guarantee the conclusion) but not necessary.' },
  ],
  counterexample: { claim: '“A necessary assumption is anything that helps the argument.”', whyInvalid: 'Many statements help without being required. The test is whether the argument fails when the statement is false.' },
  misconceptions: [
    { tag: 'sufficient_not_necessary', label: 'Choosing a sufficient but non-required claim', fix: 'Negate it: if the argument survives, it is not necessary.' },
    { tag: 'negation_error', label: 'Negating to the extreme', fix: 'The negation of “all” is “not all,” not “none.”' },
    { tag: 'restates_premise', label: 'Choosing something already stated', fix: 'An assumption is unstated; restating a premise fills no gap.' },
    { tag: 'out_of_scope', label: 'Choosing something outside the argument', fix: 'If the choice is irrelevant to the gap, negating it changes nothing.' },
  ],
  items: [
    item('na.o1', 'orient', 1, '“The bakery’s new bread recipe uses less salt. Therefore, the new bread is healthier.”', 'Which claim must the argument assume?', [
      ['Using less salt does not make bread less healthy.', 'KEY', 'Negate it: less salt makes bread less healthy — then “healthier” fails.'],
      ['Salt is the most important factor in bread’s healthiness.', 'too_strong', 'Not required; the argument survives if salt is merely one factor.'],
      ['The new recipe is more popular.', 'out_of_scope', 'Popularity is irrelevant.'],
      ['The new recipe uses less salt.', 'restates_premise', 'This is stated, not assumed.'],
    ]),
    item('na.r1', 'recognize', 1, '“Ellis has a library card. So Ellis visits the library.”', 'Which is NECESSARY for this argument?', [
      ['Having a library card is at least some indication that a person visits the library.', 'KEY', 'If the card were no indication at all, the argument would have nothing.'],
      ['Everyone with a library card visits the library weekly.', 'sufficient_not_necessary', 'Too strong; not required.'],
      ['Libraries offer free cards.', 'out_of_scope', 'Irrelevant to the gap.'],
      ['Ellis has a library card.', 'restates_premise', 'Already stated.'],
    ]),
    item('na.r2', 'recognize', 2, 'Which is the correct negation of “All of the samples were stored correctly”?', 'Choose the logical negation.', [
      ['At least one sample was not stored correctly.', 'KEY', 'The negation of “all” is “not all.”'],
      ['None of the samples were stored correctly.', 'negation_error', 'Too extreme — that is a contrary, not the negation.'],
      ['Most samples were stored incorrectly.', 'negation_error', 'Not the minimal negation.'],
      ['All of the samples were stored incorrectly.', 'negation_error', 'An extreme opposite.'],
    ]),
    item('na.r3', 'recognize', 2, '“The trail is closed only if there is a fire warning. The trail is closed today, so the park must have issued a fire warning.” Is anything assumed?', 'Choose the best description.', [
      ['No gap — the conclusion follows from the conditional as stated.', 'KEY', 'Closed → fire warning; closed; so fire warning. Valid as written.'],
      ['It assumes every closure is caused by fire.', 'sufficient_not_necessary', 'The premise already gives what is needed.'],
      ['It assumes the trail will reopen.', 'out_of_scope', 'Irrelevant.'],
      ['It assumes fire warnings close all trails.', 'converse', 'That reverses the conditional and is not needed.'],
    ]),
    item('na.a1', 'apply', 2, 'Commissioner: Our city’s new bike lanes have not reduced traffic accidents. Accident totals this year are the same as last year’s. Therefore the bike lanes have had no safety benefit.', 'The argument depends on assuming which one of the following?', [
      ['Other factors did not increase accident risk this year enough to offset a benefit from the lanes.', 'KEY', 'Negate: other factors did raise risk — then the lanes may have helped, and the argument fails.'],
      ['Bike lanes always reduce accidents.', 'sufficient_not_necessary', 'This would contradict the conclusion; not assumed.'],
      ['Most residents use the bike lanes.', 'out_of_scope', 'Not required.'],
      ['Accident totals were the same as last year’s.', 'restates_premise', 'Stated.'],
      ['No accidents occurred in the bike lanes.', 'too_strong', 'Not required.'],
    ], { hints: ['What else could keep accident totals flat even if the lanes helped?', 'Try the negation test on each answer.'] }),
    item('na.a2', 'apply', 3, 'Archaeologist: The tools found at the site are made of a stone found only in the northern hills. So the people who lived at the site must have traveled to the northern hills.', 'Which one of the following is an assumption the argument requires?', [
      ['The tools were not obtained through trade with people who traveled to the hills.', 'KEY', 'Negate: they were traded in — then residents need not have traveled.'],
      ['The northern hills were inhabited.', 'out_of_scope', 'Not required.'],
      ['All tools at the site were made of northern stone.', 'too_strong', 'Even some such tools would serve the argument.'],
      ['Stone tools last for centuries.', 'out_of_scope', 'Irrelevant to the gap.'],
      ['The people who lived at the site made all of their own tools from stone they collected themselves.', 'sufficient_not_necessary', 'Stronger than needed; the argument needs only that these tools were not traded in.'],
    ], { hints: ['How else could the stone have reached the site?'] }),
    item('na.c1', 'challenge', 3, 'Manager: The two employees who completed the advanced training both had higher sales the following quarter. So the training increases sales, and we should require it for all staff.', 'The manager’s argument requires assuming which one of the following?', [
      ['The two employees’ sales increases were not due mainly to factors unrelated to the training.', 'KEY', 'Negate: the increases were due to other factors — the causal claim fails.'],
      ['The training is inexpensive.', 'out_of_scope', 'Relevant to the recommendation perhaps, but not required by the causal argument.'],
      ['Every employee who takes the training will increase sales.', 'sufficient_not_necessary', 'Too strong to be required.'],
      ['The two employees had the highest sales of any staff.', 'out_of_scope', 'Not required.'],
      ['No employee who skipped the training increased sales.', 'too_strong', 'Not required.'],
    ]),
    item('na.c2', 'challenge', 3, 'Editor: This essay should not be published in our journal. Our journal publishes only work that presents original research, and the essay summarizes previously published studies.', 'Which one of the following is an assumption on which the editor’s argument depends?', [
      ['An essay that summarizes previously published studies does not thereby present original research.', 'KEY', 'Negate: summarizing can count as original research — then the essay might qualify.'],
      ['Most journals avoid summaries.', 'out_of_scope', 'Irrelevant.'],
      ['The essay is poorly written.', 'out_of_scope', 'Not part of the reasoning.'],
      ['All original research is published.', 'too_strong', 'Not needed.'],
      ['The journal publishes only work that presents original research.', 'restates_premise', 'Stated.'],
    ]),
    item('na.m1', 'mastery_check', 2, '“Jun will be able to fix the leak. After all, he has fixed several leaks in similar pipes.”', 'Which one of the following is an assumption required by the argument?', [
      ['This leak is not significantly different in a way that would prevent Jun from fixing it.', 'KEY', 'Negate: it differs in a disabling way — the past record says little.'],
      ['Jun has fixed every leak he has attempted.', 'too_strong', 'Not required.'],
      ['The leak is in a similar pipe.', 'restates_premise', 'Roughly stated.'],
      ['Leaks are common in old homes.', 'out_of_scope', 'Irrelevant.'],
      ['Jun is a licensed plumber.', 'sufficient_not_necessary', 'Not needed.'],
    ]),
    item('na.m2', 'mastery_check', 3, 'Critic: The museum’s new exhibit will attract fewer visitors than last year’s. Last year’s exhibit featured a famous painter, while this year’s features an unknown sculptor.', 'The critic’s argument assumes which one of the following?', [
      ['A featured artist’s fame has some influence on how many visitors an exhibit attracts.', 'KEY', 'Negate: fame has no influence — the comparison collapses.'],
      ['Sculpture is less popular than painting in every city.', 'too_strong', 'Not needed.'],
      ['Last year’s exhibit was the most popular ever.', 'out_of_scope', 'Not needed.'],
      ['Every exhibit featuring a famous artist attracts more visitors than every exhibit featuring an unknown artist.', 'sufficient_not_necessary', 'Would help but far stronger than required.'],
      ['The museum will charge the same admission.', 'out_of_scope', 'Possibly relevant but not required by the stated reasoning.'],
    ]),
    item('na.m3', 'mastery_check', 3, 'Scientist: This bacterial strain cannot survive in the river, because the river’s temperature never rises above 10°C, and the strain needs temperatures above 20°C to reproduce.', 'Which one of the following is an assumption required by the scientist’s argument?', [
      ['The strain cannot survive in the river without reproducing there.', 'KEY', 'Negate: individual bacteria survive without reproducing — then “cannot survive” fails.'],
      ['No bacteria can survive below 10°C.', 'too_strong', 'Far broader than needed.'],
      ['The river’s temperature never rises above 10°C.', 'restates_premise', 'Stated.'],
      ['The strain is harmful.', 'out_of_scope', 'Irrelevant.'],
      ['River temperatures will rise in the future.', 'out_of_scope', 'Would cut against the scientist; not assumed.'],
    ]),
  ],
  placementItemIds: ['na.r2', 'na.a1', 'na.a2', 'na.c1', 'na.m3'],
  tagToSection: { sufficient_not_necessary: 'minimal', negation_error: 'negation', restates_premise: 'gap', out_of_scope: 'gap', too_strong: 'minimal', converse: 'gap' },
};

export const LESSON_SA = {
  id: 'lesson.evaluation.sufficient_assumption', skillId: 'evaluation.sufficient_assumption', version: '2.0.0', review: REVIEW(true),
  title: 'Sufficient Assumptions', estMinutes: 25,
  objective: 'By the end, you will be able to identify a claim that, added to the premises, GUARANTEES the conclusion — usually by bridging the new term in the conclusion to the evidence.',
  why: 'Sufficient Assumption (“justify”) questions test whether you can complete a valid argument. They reward conditional-logic skill.',
  sections: [
    GAP_SECTION,
    { id: 'bridge', title: 'Build the bridge', body: [
      'If the premise says A → B and the conclusion says A → C, the missing link is B → C.',
      'Write the bridge yourself before reading the choices; then find a choice that contains it (or something stronger).',
    ] },
    { id: 'strength', title: 'Strong is fine here', body: [
      'Unlike necessary assumptions, sufficient assumptions can be broader than needed: “All B are C” justifies a conclusion about some B.',
      'Watch direction: C → B (the converse) does not bridge A → C.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“All of Kim’s paintings are watercolors. So all of Kim’s paintings will fade in sunlight.”', steps: ['Premise: Kim painting → watercolor.', 'Conclusion: Kim painting → fades.', 'Bridge: watercolor → fades.'], conclusion: 'Sufficient: “All watercolors fade in sunlight.”' },
  ],
  counterexample: { claim: '“Anything that strengthens the argument is sufficient.”', whyInvalid: 'Strengthening makes the conclusion more likely; sufficiency makes it certain given the premises.' },
  misconceptions: [
    { tag: 'converse', label: 'Bridging in the wrong direction', fix: 'The bridge must run from the premise term to the conclusion term.' },
    { tag: 'necessary_not_sufficient', label: 'Choosing a required but not guaranteeing claim', fix: 'Ask: premises + this choice → conclusion with certainty?' },
    { tag: 'unsupported', label: 'Choosing a claim that only makes the conclusion likelier', fix: 'Likelier is not guaranteed.' },
    { tag: 'out_of_scope', label: 'Choosing a claim that misses the gap', fix: 'The new term in the conclusion must appear in the bridge.' },
  ],
  items: [
    item('sa.o1', 'orient', 1, '“Every member of the choir sings at the festival. So Ana will sing at the festival.”', 'Which assumption makes the conclusion certain?', [
      ['Ana is a member of the choir.', 'KEY', 'Choir → sings; Ana is in the choir; so Ana sings.'],
      ['Ana enjoys singing.', 'unsupported', 'Does not guarantee anything.'],
      ['Some festival singers are not in the choir.', 'out_of_scope', 'Irrelevant.'],
      ['Everyone who sings at the festival is in the choir.', 'converse', 'Reverses the premise; does not place Ana.'],
    ], { formal: { mode: 'sufficient', premises: ['C -> S'], target: 'S', choices: ['C', 'E', 'X', 'S -> C'] } }),
    item('sa.r1', 'recognize', 1, 'Premise: “All of the essays are under 500 words.” Conclusion: “All of the essays qualify for the prize.”', 'Which bridge makes the argument valid?', [
      ['All essays under 500 words qualify for the prize.', 'KEY', 'Under 500 → qualifies, linking premise to conclusion.'],
      ['All essays that qualify are under 500 words.', 'converse', 'Wrong direction.'],
      ['Some short essays qualify.', 'unsupported', '“Some” does not guarantee “all.”'],
      ['The prize is awarded yearly.', 'out_of_scope', 'Irrelevant.'],
    ], { formal: { kind: 'quantified', mode: 'sufficient', premises: ['all E U'], target: 'all E Q', choices: ['all U Q', 'all Q U', 'some U Q', 'some Q U'] } }),
    item('sa.r2', 'recognize', 2, '“If the grant is approved, the lab will hire a technician. So the lab will expand its research.”', 'Which assumption, together with the premise, guarantees the conclusion?', [
      ['The grant is approved, and if the lab hires a technician, it will expand its research.', 'KEY', 'Grant → hire → expand, plus the grant is approved.'],
      ['If the lab expands its research, it will hire a technician.', 'converse', 'Wrong direction, and the grant is not established.'],
      ['The grant is approved.', 'necessary_not_sufficient', 'Gets us to hiring, but not to expansion.'],
      ['Technicians help labs.', 'unsupported', 'Vague; no guarantee.'],
    ], { formal: { mode: 'sufficient', premises: ['G -> H'], target: 'E', choices: ['G & (H -> E)', 'E -> H', 'G', 'X'] } }),
    item('sa.r3', 'recognize', 2, '“No one who misses the deadline is eligible. Therefore Rui is not eligible.”', 'Which assumption makes the conclusion follow?', [
      ['Rui missed the deadline.', 'KEY', 'Missed → not eligible; Rui missed; so Rui is not eligible.'],
      ['Rui did not miss the deadline.', 'out_of_scope', 'Then the rule says nothing about Rui.'],
      ['Everyone who is not eligible missed the deadline.', 'converse', 'Reverses the rule; does not place Rui.'],
      ['Most applicants missed the deadline.', 'unsupported', 'Says nothing certain about Rui.'],
    ], { formal: { mode: 'sufficient', premises: ['M -> ~L'], target: '~L', choices: ['M', '~M', '~L -> M', 'X'] } }),
    item('sa.a1', 'apply', 2, 'Every species of frog in the valley breeds only in standing water. The dam project will eliminate all standing water in the valley. Therefore the dam project will prevent every species of frog in the valley from breeding there.', 'Which one of the following, if assumed, enables the conclusion to be properly drawn?', [
      ['No additional assumption is required; the conclusion already follows.', 'KEY', 'Breeds only in standing water + no standing water in the valley → cannot breed there.'],
      ['Frogs will leave the valley.', 'out_of_scope', 'Irrelevant to whether they can breed there.'],
      ['Some frogs breed in running water.', 'out_of_scope', 'Contradicts the premise for these species.'],
      ['The dam will be built soon.', 'out_of_scope', 'Timing is irrelevant.'],
      ['Standing water is necessary for all amphibians.', 'unsupported', 'Not needed.'],
    ], { hints: ['Check whether the gap is already closed before looking for a bridge.'] }),
    item('sa.a2', 'apply', 3, 'Every project funded by the foundation has a public outreach component. The Rivera project has no public outreach component. So the Rivera project will not receive the foundation’s highest rating.', 'Which one of the following, if assumed, allows the conclusion to be properly drawn?', [
      ['Only projects funded by the foundation receive its highest rating.', 'KEY', 'Highest rating → funded → outreach; Rivera lacks outreach, so it cannot be rated highest.'],
      ['Projects with outreach receive the highest rating.', 'converse', 'Says nothing about projects without outreach.'],
      ['Most highly rated projects have outreach.', 'unsupported', '“Most” cannot guarantee the result.'],
      ['The Rivera project is not funded by the foundation.', 'necessary_not_sufficient', 'True by the premises, but it does not link funding to the rating.'],
      ['Outreach is expensive.', 'out_of_scope', 'Irrelevant.'],
    ], { formal: { mode: 'sufficient', premises: ['F -> O', '~O'], target: '~R', choices: ['R -> F', 'O -> R', 'X', '~F', 'Y'] }, hints: ['The conclusion introduces a new idea: the highest rating.', 'Link the rating back to funding.'] }),
    item('sa.c1', 'challenge', 3, 'Any candidate who receives the union’s endorsement will win the primary. Halvorsen has the support of every local labor leader. Therefore Halvorsen will win the primary.', 'The conclusion follows logically if which one of the following is assumed?', [
      ['Any candidate supported by every local labor leader receives the union’s endorsement.', 'KEY', 'Support → endorsement → wins.'],
      ['Any candidate who wins the primary had the union’s endorsement.', 'converse', 'Reversed.'],
      ['Labor leaders usually influence union endorsements.', 'unsupported', '“Usually” cannot guarantee.'],
      ['Halvorsen is the most popular candidate.', 'out_of_scope', 'Not linked to the rule.'],
      ['The union endorses only one candidate.', 'out_of_scope', 'Does not show Halvorsen gets it.'],
    ], { formal: { mode: 'sufficient', premises: ['E -> W', 'L'], target: 'W', choices: ['L -> E', 'W -> E', 'X', 'Y', 'Z'] } }),
    item('sa.c2', 'challenge', 3, 'Philosopher: An action is praiseworthy only if it is done freely. Since actions performed under hypnosis are not done freely, Sato’s act of returning the wallet was not praiseworthy.', 'Which one of the following, if assumed, enables the philosopher’s conclusion to be properly drawn?', [
      ['Sato returned the wallet while under hypnosis.', 'KEY', 'Hypnosis → not free → not praiseworthy.'],
      ['Sato did not return the wallet while under hypnosis.', 'out_of_scope', 'Then the rule says nothing.'],
      ['Every action done freely is praiseworthy.', 'converse', 'Reverses the necessary condition.'],
      ['Most actions under hypnosis are trivial.', 'unsupported', 'Irrelevant and uncertain.'],
      ['Returning a wallet is usually praiseworthy.', 'unsupported', 'Does not guarantee the conclusion.'],
    ], { formal: { mode: 'sufficient', premises: ['P -> F', 'H -> ~F'], target: '~P', choices: ['H', '~H', 'F -> P', 'X', 'Y'] } }),
    item('sa.m1', 'mastery_check', 2, 'All of the apartments in the Larch building have balconies. So the apartment Dee rents has a balcony.', 'Which one of the following, if assumed, allows the conclusion to be properly drawn?', [
      ['Dee rents an apartment in the Larch building.', 'KEY', 'Larch → balcony; Dee’s is in Larch.'],
      ['Most apartments in the city have balconies.', 'unsupported', 'No guarantee.'],
      ['All apartments with balconies are in the Larch building.', 'converse', 'Reversed; does not place Dee’s.'],
      ['Dee wants a balcony.', 'out_of_scope', 'Irrelevant.'],
      ['The Larch building is new.', 'out_of_scope', 'Irrelevant.'],
    ], { formal: { mode: 'sufficient', premises: ['L -> B'], target: 'B', choices: ['L', 'X', 'B -> L', 'Y', 'Z'] } }),
    item('sa.m2', 'mastery_check', 3, 'Only students who complete the lab sequence may enroll in the seminar. Ilsa has not completed the lab sequence. Therefore Ilsa will not present at the spring symposium.', 'Which one of the following, if assumed, allows the conclusion to be properly drawn?', [
      ['Only students enrolled in the seminar present at the spring symposium.', 'KEY', 'Present → seminar → lab done; Ilsa has not done the labs.'],
      ['Students in the seminar present at the symposium.', 'converse', 'Wrong direction.'],
      ['Ilsa does not want to present.', 'out_of_scope', 'Not a logical bridge.'],
      ['Most presenters have completed the labs.', 'unsupported', '“Most” cannot guarantee.'],
      ['Ilsa will not enroll in the seminar.', 'necessary_not_sufficient', 'Already follows; still no link to presenting.'],
    ], { formal: { mode: 'sufficient', premises: ['S -> L', '~L'], target: '~P', choices: ['P -> S', 'S -> P', 'X', 'Y', '~S'] } }),
    item('sa.m3', 'mastery_check', 3, 'Any vehicle that meets the emissions standard qualifies for the tax credit. The Mira sedan qualifies for the tax credit. Therefore the Mira sedan meets the emissions standard.', 'Which one of the following, if assumed, enables the conclusion to be properly drawn?', [
      ['Only vehicles that meet the emissions standard qualify for the tax credit.', 'KEY', 'Credit → standard; Mira has the credit.'],
      ['Every vehicle that meets the standard is a sedan.', 'out_of_scope', 'Irrelevant.'],
      ['Most vehicles that qualify meet the standard.', 'unsupported', '“Most” cannot guarantee.'],
      ['The Mira sedan is fuel efficient.', 'out_of_scope', 'Not a bridge.'],
      ['Any vehicle that meets the standard qualifies for the tax credit.', 'converse', 'Restates the premise, which runs the wrong way.'],
    ], { formal: { mode: 'sufficient', premises: ['M -> Q', 'Q'], target: 'M', choices: ['Q -> M', 'X', 'Y', 'Z', 'M -> Q'] } }),
  ],
  placementItemIds: ['sa.r2', 'sa.a2', 'sa.c1', 'sa.c2', 'sa.m2'],
  tagToSection: { converse: 'strength', necessary_not_sufficient: 'bridge', unsupported: 'bridge', out_of_scope: 'gap' },
};

export const LESSON_STRENGTHEN = {
  id: 'lesson.evaluation.strengthen', skillId: 'evaluation.strengthen', version: '2.0.0', review: REVIEW(false),
  title: 'Strengthen', estMinutes: 20, classicLabel: 'Strengthen',
  objective: 'By the end, you will be able to choose new information that makes the conclusion more likely by supporting the gap or ruling out an objection.',
  why: 'Strengthen questions are frequent and reward targeted thinking: the right answer addresses why the evidence might not support the conclusion.',
  sections: [
    GAP_SECTION,
    { id: 'how', title: 'Ways to strengthen', body: [
      'Support the assumption directly. Rule out an alternative explanation. Show the sample is representative. Show the mechanism works. Show the analogy holds.',
      'Answers do not need to prove the conclusion — any increase in support counts.',
    ] },
    { id: 'traps', title: 'Common traps', body: [
      'Topic matches (same subject, no effect on the gap). Answers that support a different conclusion. Answers that weaken (direction reversed).',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“Towns that adopted the recycling program saw less landfill waste. So the program reduces waste.” Strengthen?', steps: ['Gap: correlation → cause.', 'Threat: those towns were already reducing waste.', 'Strengthener: before adoption, waste in those towns had been rising.'], conclusion: 'Ruling out a pre-existing trend strengthens the causal claim.' },
  ],
  counterexample: { claim: '“The answer that mentions the conclusion’s topic most strengthens it.”', whyInvalid: 'Topic overlap without logical effect does nothing; the right answer affects the gap.' },
  misconceptions: [
    { tag: 'wrong_direction', label: 'Choosing a weakener', fix: 'Check whether the choice makes the conclusion more or less likely.' },
    { tag: 'irrelevant', label: 'Topic match with no effect', fix: 'Ask: does this change how well the evidence supports the conclusion?' },
    { tag: 'shell_game', label: 'Supporting a different conclusion', fix: 'Re-read the exact conclusion.' },
    { tag: 'alternative_cause', label: 'Ignoring alternative explanations', fix: 'Ruling out alternatives is one of the most common ways to strengthen.' },
  ],
  items: [
    item('st.o1', 'orient', 1, '“Plants watered with rainwater grew taller than plants watered with tap water. So rainwater helps plants grow.”', 'Which would most strengthen the argument?', [
      ['The two groups of plants received the same light and soil.', 'KEY', 'Rules out other differences that could explain the growth.'],
      ['Rainwater is free.', 'irrelevant', 'Cost is irrelevant.'],
      ['Tap water plants received more sunlight.', 'wrong_direction', 'That would explain the result differently — less support.'],
      ['Some plants need little water.', 'irrelevant', 'Irrelevant.'],
    ]),
    item('st.r1', 'recognize', 1, '“Since the new manager arrived, team productivity rose 20%. The new manager caused the rise.”', 'Which strengthens?', [
      ['No other changes were made to the team during that period.', 'KEY', 'Eliminates alternative causes.'],
      ['The team also hired three experienced workers.', 'wrong_direction', 'An alternative cause — weakens.'],
      ['The new manager is well liked.', 'irrelevant', 'Liking is not productivity.'],
      ['Productivity is hard to measure.', 'wrong_direction', 'Casts doubt on the evidence.'],
    ]),
    item('st.r2', 'recognize', 2, '“A survey of library visitors found that 80% favor longer hours. So most residents favor longer hours.”', 'Which strengthens?', [
      ['Library visitors’ views on hours closely match those of residents in general.', 'KEY', 'Shows the sample is representative.'],
      ['Most library visitors visit weekly.', 'irrelevant', 'Says nothing about representativeness.'],
      ['Residents who never visit the library oppose longer hours.', 'wrong_direction', 'Shows the sample is biased.'],
      ['Longer hours cost money.', 'shell_game', 'Bears on whether hours should be extended, not on what residents favor.'],
    ]),
    item('st.r3', 'recognize', 2, '“Dolphins in tank A, which hear recorded ocean sounds, are more active than dolphins in tank B. Ocean sounds increase dolphin activity.”', 'Which strengthens?', [
      ['When tank B played the recordings, its dolphins became more active.', 'KEY', 'Shows the effect follows the sound.'],
      ['Tank A is larger than tank B.', 'wrong_direction', 'An alternative explanation.'],
      ['Dolphins are intelligent.', 'irrelevant', 'Irrelevant.'],
      ['Tank B’s dolphins are older.', 'wrong_direction', 'Alternative explanation.'],
    ]),
    item('st.a1', 'apply', 2, 'Nutritionist: Children at schools that serve breakfast score higher on morning tests than children at schools that do not. So eating breakfast improves children’s morning test performance.', 'Which one of the following, if true, most strengthens the argument?', [
      ['At schools that serve breakfast, children who eat it score higher than classmates who skip it.', 'KEY', 'Within the same school, breakfast still predicts scores — ruling out school differences.'],
      ['Schools that serve breakfast tend to have more funding.', 'wrong_direction', 'Funding is an alternative explanation.'],
      ['Many parents prefer schools that serve breakfast.', 'irrelevant', 'Preference is irrelevant.'],
      ['Morning tests are harder than afternoon tests.', 'irrelevant', 'Irrelevant.'],
      ['Breakfast programs are expensive.', 'shell_game', 'About cost, not effect.'],
    ], { hints: ['What else differs between these schools?', 'Find the answer that removes that difference.'] }),
    item('st.a2', 'apply', 3, 'Ecologist: Wolves were reintroduced to the park ten years ago, and since then the riverbank willows have recovered. The wolves reduced the elk that had been eating the willows.', 'Which one of the following, if true, most strengthens the ecologist’s argument?', [
      ['Willows recovered most in areas where elk numbers dropped the most.', 'KEY', 'Ties the willow recovery to elk reduction, supporting the mechanism.'],
      ['Wolves are popular with park visitors.', 'irrelevant', 'Irrelevant.'],
      ['Rainfall in the park increased over the decade.', 'wrong_direction', 'Alternative cause for willow recovery.'],
      ['Elk also eat grasses.', 'irrelevant', 'Not relevant to willows.'],
      ['Some willows were planted by park staff.', 'wrong_direction', 'Alternative explanation.'],
    ]),
    item('st.c1', 'challenge', 3, 'Economist: When the city raised parking fees downtown, retail sales downtown fell. So higher parking fees discourage shopping downtown.', 'Which one of the following, if true, most strengthens the economist’s argument?', [
      ['In the same period, retail sales rose in nearby areas where parking fees were unchanged.', 'KEY', 'Suggests the decline is not due to a general downturn.'],
      ['Retail sales fell nationwide in the same period.', 'wrong_direction', 'A general downturn is an alternative explanation.'],
      ['Downtown parking is often hard to find.', 'irrelevant', 'True before and after; no change.'],
      ['The fee increase raised city revenue.', 'shell_game', 'Irrelevant to shopping.'],
      ['Some shoppers use public transit.', 'irrelevant', 'Does not affect the causal link.'],
    ]),
    item('st.c2', 'challenge', 3, 'Historian: The town’s population declined sharply in the 1840s. Records show that the town’s main crop failed repeatedly during that decade. Therefore the crop failures caused the population decline.', 'Which one of the following, if true, most strengthens the argument?', [
      ['Families that left the town in the 1840s cited a lack of food or farm income as their reason.', 'KEY', 'Direct evidence linking departure to the crop failures.'],
      ['The town’s population recovered by 1870.', 'irrelevant', 'Later recovery does not bear on the cause.'],
      ['An epidemic struck the town in 1843.', 'wrong_direction', 'Alternative cause.'],
      ['The crop is still grown today.', 'irrelevant', 'Irrelevant.'],
      ['Neighboring towns had larger farms.', 'irrelevant', 'Irrelevant.'],
    ]),
    item('st.m1', 'mastery_check', 2, '“Students who use the study app have higher grades than those who do not. Therefore the app improves grades.”', 'Which one of the following, if true, most strengthens the argument?', [
      ['Before using the app, users’ grades were similar to those of non-users.', 'KEY', 'Rules out that stronger students chose the app.'],
      ['The app is free.', 'irrelevant', 'Irrelevant.'],
      ['Students who use the app also study more hours.', 'wrong_direction', 'Alternative explanation.'],
      ['Most students own smartphones.', 'irrelevant', 'Irrelevant.'],
      ['Some app users have low grades.', 'wrong_direction', 'Slightly undercuts, not strengthens.'],
    ]),
    item('st.m2', 'mastery_check', 3, 'Transportation report: Of the county’s footbridges inspected this spring, those decked with recycled composite planks had far less surface rot than those decked with treated pine. The report concludes that composite planking resists rot better than pine.', 'Which one of the following, if true, most strengthens the engineer’s argument?', [
      ['The composite-decked and pine-decked footbridges were of similar age and stood in similarly damp locations.', 'KEY', 'Rules out age and moisture as explanations.'],
      ['Composite planks cost more than pine.', 'irrelevant', 'Cost is irrelevant.'],
      ['Most composite decks were installed within the last three years.', 'wrong_direction', 'Newer decks have had less time to rot — an alternative explanation.'],
      ['Pine has been used for footbridges for longer.', 'irrelevant', 'Irrelevant.'],
      ['Rot is not the only sign of wear.', 'shell_game', 'Irrelevant to rot resistance.'],
    ]),
    item('st.m3', 'mastery_check', 3, 'Researcher: People who keep a gratitude journal report feeling happier after a month than they did before starting. Keeping such a journal increases happiness.', 'Which one of the following, if true, most strengthens the argument?', [
      ['People who were asked to keep a neutral daily log for a month did not report feeling happier.', 'KEY', 'A control group suggests the effect is specific to gratitude journaling.'],
      ['Most people enjoy writing.', 'irrelevant', 'Irrelevant.'],
      ['Journal keepers often start in winter and report in spring.', 'wrong_direction', 'Seasonal change could explain it.'],
      ['Happiness is hard to measure.', 'wrong_direction', 'Undercuts the evidence.'],
      ['Gratitude journals are sold widely.', 'irrelevant', 'Irrelevant.'],
    ]),
  ],
  placementItemIds: ['st.r2', 'st.a1', 'st.a2', 'st.c1', 'st.m3'],
  tagToSection: { wrong_direction: 'traps', irrelevant: 'traps', shell_game: 'traps', alternative_cause: 'how' },
};

export const LESSON_WEAKEN = {
  id: 'lesson.evaluation.weaken', skillId: 'evaluation.weaken', version: '2.0.0', review: REVIEW(false),
  title: 'Weaken', estMinutes: 20, classicLabel: 'Weaken',
  objective: 'By the end, you will be able to choose new information that makes the conclusion less likely by attacking the gap — without needing to disprove it.',
  why: 'Weaken questions are among the most frequent in LR. They test whether you can see why evidence might not support a conclusion.',
  sections: [
    GAP_SECTION,
    { id: 'how', title: 'Ways to weaken', body: [
      'Introduce an alternative explanation. Show the sample is unrepresentative. Show the analogy breaks. Show the plan has a side effect that defeats its goal. Deny an assumption.',
      'A weakener does not need to prove the conclusion false. It only needs to reduce support.',
    ] },
    { id: 'traps', title: 'Common traps', body: [
      'Attacking a premise’s truth is usually not intended — premises are accepted. Answers that are irrelevant to the conclusion, or that actually strengthen.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“Ice cream sales and drownings rise together. So ice cream causes drowning.” Weaken?', steps: ['Gap: correlation → cause.', 'Alternative: hot weather increases both swimming and ice cream eating.'], conclusion: 'A common cause weakens the causal conclusion.' },
  ],
  counterexample: { claim: '“A weakener must show the conclusion is false.”', whyInvalid: 'An alternative explanation leaves the conclusion possible but less supported — that is enough.' },
  misconceptions: [
    { tag: 'wrong_direction', label: 'Choosing a strengthener', fix: 'Check the direction of the effect.' },
    { tag: 'irrelevant', label: 'Topic match with no effect', fix: 'Ask how the choice changes support.' },
    { tag: 'shell_game', label: 'Attacking a different claim', fix: 'Weaken the exact conclusion.' },
    { tag: 'too_strong', label: 'Requiring disproof', fix: 'Reducing support is enough.' },
  ],
  items: [
    item('wk.o1', 'orient', 1, '“Since the café started playing classical music, its sales have increased. So the music increased sales.”', 'Which weakens the argument?', [
      ['The café began offering a popular new menu at the same time.', 'KEY', 'Alternative explanation.'],
      ['Classical music is relaxing.', 'wrong_direction', 'Slightly supports a mechanism.'],
      ['Some customers dislike classical music.', 'irrelevant', 'Sales still rose overall.'],
      ['The café is downtown.', 'irrelevant', 'Irrelevant.'],
    ]),
    item('wk.r1', 'recognize', 1, '“Our online poll found that 90% of respondents want a new stadium. So the city’s residents want a new stadium.”', 'Which weakens?', [
      ['The poll was posted only on a sports fan website.', 'KEY', 'Unrepresentative sample.'],
      ['The poll had many respondents.', 'wrong_direction', 'Mildly supports.'],
      ['Stadiums are costly.', 'shell_game', 'About cost, not what residents want.'],
      ['Some respondents live in the city.', 'irrelevant', 'Does not show bias.'],
    ]),
    item('wk.r2', 'recognize', 2, '“The new fertilizer increased crop yields at Farm X. So it will increase yields at Farm Y.”', 'Which weakens?', [
      ['Farm Y’s soil lacks the bacteria the fertilizer needs to work.', 'KEY', 'The analogy breaks on a relevant difference.'],
      ['Farm Y is larger than Farm X.', 'irrelevant', 'Size alone may be irrelevant.'],
      ['The fertilizer is organic.', 'irrelevant', 'Irrelevant.'],
      ['Farm X and Farm Y have similar climates.', 'wrong_direction', 'Supports the analogy.'],
    ]),
    item('wk.r3', 'recognize', 2, '“To reduce traffic, the city plans to add a lane to the highway.”', 'Which most weakens the plan’s prospects?', [
      ['Added lanes typically attract new drivers until congestion returns to previous levels.', 'KEY', 'Shows the plan may not achieve its goal.'],
      ['Construction will take a year.', 'irrelevant', 'Timing is not the goal.'],
      ['Many residents drive to work.', 'irrelevant', 'Background.'],
      ['Wider highways are safer.', 'irrelevant', 'Safety is not the goal.'],
    ]),
    item('wk.a1', 'apply', 2, 'Doctor: Patients who took the new sleep medication reported sleeping longer than they had before taking it. The medication is therefore effective at increasing sleep.', 'Which one of the following, if true, most weakens the argument?', [
      ['Patients who received an identical-looking pill with no active ingredient reported a similar increase in sleep.', 'KEY', 'A placebo effect explains the improvement.'],
      ['The medication is expensive.', 'irrelevant', 'Cost is irrelevant.'],
      ['Patients who took the medication slept even longer in the second week.', 'wrong_direction', 'Supports.'],
      ['Most patients had trouble sleeping.', 'irrelevant', 'Background.'],
      ['Some patients reported mild headaches.', 'shell_game', 'Side effects are not effectiveness.'],
    ], { hints: ['Would patients have slept longer anyway?'] }),
    item('wk.a2', 'apply', 3, 'Analyst: Since the company introduced flexible hours, employee turnover has fallen by half. Flexible hours, therefore, reduced turnover.', 'Which one of the following, if true, most weakens the analyst’s argument?', [
      ['At the same time, unemployment in the region rose, making it harder for employees to find other jobs.', 'KEY', 'Alternative explanation for lower turnover.'],
      ['Employees report liking flexible hours.', 'wrong_direction', 'Supports a mechanism.'],
      ['Turnover is costly for companies.', 'irrelevant', 'Irrelevant.'],
      ['The company is large.', 'irrelevant', 'Irrelevant.'],
      ['Other companies also offer flexible hours.', 'irrelevant', 'Irrelevant without more.'],
    ]),
    item('wk.c1', 'challenge', 3, 'Researcher: In a study, people who drank green tea daily had lower rates of heart disease than people who did not. So drinking green tea reduces the risk of heart disease.', 'Which one of the following, if true, most seriously weakens the argument?', [
      ['Daily green tea drinkers in the study also exercised more and smoked less than others.', 'KEY', 'Confounding factors could explain the difference.'],
      ['Green tea contains antioxidants.', 'wrong_direction', 'Suggests a mechanism.'],
      ['The study included thousands of people.', 'wrong_direction', 'Supports reliability.'],
      ['Some non-drinkers had no heart disease.', 'irrelevant', 'Expected; irrelevant.'],
      ['Black tea has different chemical properties.', 'irrelevant', 'Irrelevant.'],
    ]),
    item('wk.c2', 'challenge', 3, 'Commissioner: Our anti-littering campaign worked. In the year since it began, the number of littering fines issued has dropped by 40 percent.', 'Which one of the following, if true, most seriously weakens the commissioner’s argument?', [
      ['During the past year, the number of officers assigned to issue littering fines was cut in half.', 'KEY', 'Fewer fines may reflect less enforcement, not less littering.'],
      ['The campaign cost less than expected.', 'irrelevant', 'Irrelevant.'],
      ['Littering fines were raised last year.', 'wrong_direction', 'Could also reduce littering — not a weakener of the campaign’s effect on fines specifically.'],
      ['Residents noticed the campaign’s posters.', 'wrong_direction', 'Mildly supports.'],
      ['Littering is a problem in many cities.', 'irrelevant', 'Irrelevant.'],
    ]),
    item('wk.m1', 'mastery_check', 2, '“Residents who live near the new park visit their doctors less often than other residents. Living near the park improves health.”', 'Which one of the following, if true, most weakens the argument?', [
      ['Homes near the new park are mostly occupied by young adults, who visit doctors less often regardless of where they live.', 'KEY', 'Age is an alternative explanation.'],
      ['Parks encourage exercise.', 'wrong_direction', 'Supports.'],
      ['The park opened recently.', 'irrelevant', 'Without more, irrelevant.'],
      ['Doctor visits are costly.', 'irrelevant', 'Irrelevant.'],
      ['Some residents near the park never visit it.', 'irrelevant', 'Mild at best.'],
    ]),
    item('wk.m2', 'mastery_check', 3, 'Planner: Raising bus fares will increase transit revenue, since each rider will pay more per trip.', 'Which one of the following, if true, most weakens the planner’s argument?', [
      ['Ridership would fall by more than enough to offset the higher fare per trip.', 'KEY', 'Revenue = riders × fare; fewer riders can offset higher fares.'],
      ['Bus fares have not risen in a decade.', 'irrelevant', 'Irrelevant.'],
      ['Most riders commute to work.', 'irrelevant', 'Background.'],
      ['Higher fares would fund new buses.', 'shell_game', 'Assumes revenue rises.'],
      ['Some riders have passes.', 'irrelevant', 'Minor.'],
    ]),
    item('wk.m3', 'mastery_check', 3, 'Critic: The novelist’s latest book sold more copies than any of her earlier books, so it is her best work.', 'Which one of the following, if true, most weakens the critic’s argument?', [
      ['The latest book was released after the novelist became famous for a film adaptation of an earlier book.', 'KEY', 'Sales may reflect fame, not quality.'],
      ['The latest book won a prize.', 'wrong_direction', 'Supports quality.'],
      ['The novelist has written six books.', 'irrelevant', 'Irrelevant.'],
      ['Some readers prefer her earlier books.', 'irrelevant', 'Weak — some readers always differ.'],
      ['The book is long.', 'irrelevant', 'Irrelevant.'],
    ]),
  ],
  placementItemIds: ['wk.r2', 'wk.a1', 'wk.a2', 'wk.c2', 'wk.m2'],
  tagToSection: { wrong_direction: 'traps', irrelevant: 'traps', shell_game: 'traps', too_strong: 'how' },
};

export const LESSON_EVALUATE = {
  id: 'lesson.evaluation.evaluate', skillId: 'evaluation.evaluate', version: '2.0.0', review: REVIEW(false),
  title: 'Evaluate the Argument', estMinutes: 20, classicLabel: 'Evaluate',
  objective: 'By the end, you will be able to choose the question whose answer would most help judge the argument — one where different answers push the conclusion in different directions.',
  why: 'Evaluate questions combine strengthen and weaken: you need information that could go either way.',
  sections: [
    GAP_SECTION,
    { id: 'two_answers', title: 'The two-answer test', body: [
      'Answer the question “yes,” then “no.” If one answer strengthens and the other weakens, it is relevant. If neither changes anything, it is not.',
    ] },
    { id: 'traps', title: 'Common traps', body: [
      'Questions about interesting but irrelevant details; questions whose answer would matter only for a different conclusion.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“Sales rose after the ad campaign. So the campaign worked.” Which question helps evaluate?', steps: ['Candidate: “Did sales also rise at stores where the ad did not run?”', 'Yes → the campaign probably did not cause it (weakens). No → supports.'], conclusion: 'Both answers matter, so the question is useful.' },
  ],
  counterexample: { claim: '“Any question about the topic helps evaluate.”', whyInvalid: '“What color were the ads?” has no answer that changes the support.' },
  misconceptions: [
    { tag: 'irrelevant', label: 'Choosing a question whose answer would not matter', fix: 'Use the two-answer test.' },
    { tag: 'shell_game', label: 'Choosing a question about a different conclusion', fix: 'Re-read the conclusion.' },
    { tag: 'one_side_only', label: 'Choosing a question where only one answer matters', fix: 'Both answers should move the conclusion.' },
  ],
  items: [
    item('ev.o1', 'orient', 1, '“Ana’s tomatoes grew larger after she switched fertilizers. So the new fertilizer works better.”', 'Which question would best help evaluate the argument?', [
      ['Did anything else change in Ana’s garden at the same time?', 'KEY', 'Yes weakens; no strengthens.'],
      ['What brand is the new fertilizer?', 'irrelevant', 'The brand changes nothing.'],
      ['Does Ana like tomatoes?', 'irrelevant', 'Irrelevant.'],
      ['How much does the new fertilizer cost?', 'shell_game', 'Cost is not effectiveness.'],
    ]),
    item('ev.r1', 'recognize', 1, '“The town installed speed bumps, and accidents fell. So the speed bumps reduced accidents.”', 'Which question is most useful?', [
      ['Did accidents also fall in similar towns without speed bumps?', 'KEY', 'Yes weakens; no strengthens.'],
      ['How many speed bumps were installed?', 'irrelevant', 'Neither answer changes the inference much.'],
      ['Do residents like the speed bumps?', 'irrelevant', 'Irrelevant.'],
      ['Who designed the speed bumps?', 'irrelevant', 'Irrelevant.'],
    ]),
    item('ev.r2', 'recognize', 2, '“A survey of gym members shows most exercise four times a week. So most adults exercise four times a week.”', 'Which question is most useful?', [
      ['Do gym members’ exercise habits resemble those of adults in general?', 'KEY', 'Tests representativeness either way.'],
      ['How large is the gym?', 'irrelevant', 'Irrelevant.'],
      ['Does exercise improve health?', 'shell_game', 'Different issue.'],
      ['Was the survey printed or online?', 'irrelevant', 'Matters little alone.'],
    ]),
    item('ev.r3', 'recognize', 2, '“Replacing the office lights with LEDs will save money, since LEDs use less electricity.”', 'Which question is most useful?', [
      ['Will the electricity savings exceed the cost of buying and installing the LEDs?', 'KEY', 'Either answer directly affects the conclusion.'],
      ['Are LEDs brighter?', 'irrelevant', 'Brightness is not money.'],
      ['Do employees prefer LED light?', 'irrelevant', 'Irrelevant.'],
      ['Who makes the LEDs?', 'irrelevant', 'Irrelevant.'],
    ]),
    item('ev.a1', 'apply', 2, 'Principal: Students who joined the chess club improved their math grades more than students who did not. So playing chess improves math skills.', 'The answer to which one of the following questions would be most useful in evaluating the argument?', [
      ['Were students who joined the chess club already improving in math faster before they joined?', 'KEY', 'Yes weakens (pre-existing trend); no strengthens.'],
      ['How many students joined the chess club?', 'irrelevant', 'Size alone settles little.'],
      ['Do chess players enjoy math?', 'irrelevant', 'Enjoyment does not settle the cause.'],
      ['Is chess an ancient game?', 'irrelevant', 'Irrelevant.'],
      ['Does the school offer other clubs?', 'irrelevant', 'Irrelevant without more.'],
    ]),
    item('ev.a2', 'apply', 3, 'Mayor: Our town’s new recycling bins have increased recycling. The amount of material collected for recycling has doubled since they were introduced.', 'Which one of the following would be most useful to know in evaluating the mayor’s argument?', [
      ['Whether the amount of contaminated, non-recyclable material placed in the bins also increased', 'KEY', 'If much of the doubled amount is trash, recycling may not have increased.'],
      ['Whether the bins are blue', 'irrelevant', 'Irrelevant.'],
      ['Whether the bins were expensive', 'shell_game', 'Cost is not effectiveness.'],
      ['Whether other towns recycle', 'irrelevant', 'Irrelevant without comparison data.'],
      ['Whether residents like the bins', 'irrelevant', 'Irrelevant.'],
    ]),
    item('ev.c1', 'challenge', 3, 'Biologist: The lake’s trout population has dropped since a new species of bass was introduced. The bass must be preying on young trout.', 'Which one of the following would be most useful to determine in evaluating the biologist’s argument?', [
      ['Whether young trout have been found in the stomach contents of the bass', 'KEY', 'Yes supports predation; no weakens it.'],
      ['Whether bass are popular with anglers', 'irrelevant', 'Irrelevant.'],
      ['Whether trout prefer cold water', 'irrelevant', 'Irrelevant unless water changed.'],
      ['Whether the bass are larger than the trout', 'irrelevant', 'Size alone settles little.'],
      ['Whether trout were introduced to the lake originally', 'irrelevant', 'Irrelevant.'],
    ]),
    item('ev.c2', 'challenge', 3, 'Economist: Since the minimum wage rose, the number of restaurant jobs in the city has fallen. Therefore the wage increase caused restaurants to cut jobs.', 'The answer to which one of the following would be most helpful in evaluating the argument?', [
      ['Did restaurant jobs also fall in nearby cities where the minimum wage did not rise?', 'KEY', 'Yes weakens; no strengthens.'],
      ['How many restaurants are in the city?', 'irrelevant', 'Count alone settles nothing.'],
      ['Do restaurant workers support the increase?', 'irrelevant', 'Irrelevant.'],
      ['What was the previous minimum wage?', 'irrelevant', 'Matters little alone.'],
      ['Are restaurant meals more expensive than before?', 'one_side_only', 'Could relate, but either answer leaves the causal question open.'],
    ]),
    item('ev.m1', 'mastery_check', 2, '“After the library began opening on Sundays, weekly visits rose. Sunday hours increased library use.”', 'Which question would be most useful in evaluating the argument?', [
      ['Did visits on other days fall by a similar amount?', 'KEY', 'Yes means visits merely shifted; no supports the conclusion.'],
      ['How many staff work on Sundays?', 'irrelevant', 'Irrelevant.'],
      ['Is the library old?', 'irrelevant', 'Irrelevant.'],
      ['Do visitors prefer quiet?', 'irrelevant', 'Irrelevant.'],
      ['Are Sunday hours costly?', 'shell_game', 'Cost is a different issue.'],
    ]),
    item('ev.m2', 'mastery_check', 3, 'Manager: Our new hiring test predicts job success, because employees who scored highest on it have received the best performance reviews.', 'Which one of the following would be most useful to know in evaluating the manager’s argument?', [
      ['Whether the managers who wrote the reviews knew the employees’ test scores', 'KEY', 'If they knew, the reviews may reflect the scores rather than performance.'],
      ['Whether the test is long', 'irrelevant', 'Irrelevant.'],
      ['Whether employees liked the test', 'irrelevant', 'Irrelevant.'],
      ['Whether the test was written by experts', 'one_side_only', 'Either answer leaves the evidence largely intact.'],
      ['How many employees took the test', 'irrelevant', 'Small effect at most.'],
    ]),
    item('ev.m3', 'mastery_check', 3, 'Scientist: Cities that added fluoride to their water saw a decline in tooth decay. So fluoride reduces tooth decay.', 'The answer to which one of the following would be most useful in evaluating the argument?', [
      ['Did tooth decay decline similarly in cities that did not add fluoride during the same period?', 'KEY', 'Yes weakens; no strengthens.'],
      ['Does fluoride change the taste of water?', 'irrelevant', 'Irrelevant.'],
      ['Are dentists in favor of fluoride?', 'irrelevant', 'Opinion does not settle the cause.'],
      ['Is fluoride inexpensive?', 'shell_game', 'Cost is a different issue.'],
      ['How large are the cities?', 'irrelevant', 'Irrelevant alone.'],
    ]),
  ],
  placementItemIds: ['ev.r3', 'ev.a1', 'ev.a2', 'ev.c1', 'ev.m2'],
  tagToSection: { irrelevant: 'two_answers', shell_game: 'traps', one_side_only: 'two_answers' },
};
