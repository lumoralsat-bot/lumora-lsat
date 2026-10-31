// Argument Analysis: Main Conclusion, Role of a Statement, Method of Reasoning (Curriculum v2.0 §6).
import { item, REVIEW } from './helpers.js';

export const LESSON_MAIN = {
  id: 'lesson.analysis.main_conclusion', skillId: 'analysis.main_conclusion', version: '2.0.0', review: REVIEW(false),
  title: 'Main Conclusion', estMinutes: 20, classicLabel: 'Main Point',
  objective: 'By the end, you will be able to find an author’s ultimate claim — wherever it appears — and distinguish it from evidence, intermediate conclusions, background, and topic.',
  why: 'Every argument-based question depends on knowing what the author is trying to establish. Main Conclusion questions test it directly, and Assumption, Strengthen, and Flaw questions all depend on it.',
  sections: [
    { id: 'tests', title: 'Two conclusion tests', body: [
      'Ask: what is the speaker ultimately trying to get me to accept?',
      'Then map support: which statements support which others? The main conclusion is supported by the others and does not itself support anything further.',
    ] },
    { id: 'indicators', title: 'Indicator words are clues, not proof', body: [
      '“Therefore,” “so,” and “thus” often mark a conclusion — but they can also introduce an intermediate step. And many conclusions have no indicator at all.',
      'The last sentence is often not the conclusion. Authors frequently state their point first and then explain why.',
    ] },
    { id: 'distinguish', title: 'Topic, thesis, intermediate conclusion, background', body: [
      'TOPIC: what the argument is about. THESIS / main conclusion: what it claims about that topic.',
      'An INTERMEDIATE conclusion is supported by a premise and then supports the main conclusion.',
      'BACKGROUND sets the scene but is not offered as support.',
    ] },
    { id: 'strength', title: 'Keep the strength exact', body: [
      'A correct answer restates the conclusion without making it stronger or weaker: “likely” stays “likely”; “some” stays “some.”',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“The creek has risen after each storm this month. Another storm is forecast. Therefore, the low trail is likely to flood tomorrow.”', steps: ['The creek pattern and the forecast are offered as reasons.', 'They support “the low trail is likely to flood.”', 'Note the exact strength: “likely.”'], conclusion: 'Main conclusion: the low trail is likely to flood tomorrow.' },
    { id: 'we2', prompt: '“The city should delay the stadium vote. The traffic study it relies on used data from before the new rail line opened, so the study’s projections are outdated.”', steps: ['“Data from before the rail line” supports “projections are outdated.”', '“Projections are outdated” supports “delay the vote.”', 'The first sentence supports nothing further.'], conclusion: 'Main conclusion (stated first): the city should delay the stadium vote. “Projections are outdated” is an intermediate conclusion.' },
  ],
  counterexample: { claim: '“The last sentence is always the conclusion.”', whyInvalid: 'In the stadium example, the last sentence (“projections are outdated”) is an intermediate step; the main conclusion is the first sentence.' },
  misconceptions: [
    { tag: 'last_sentence', label: 'Picking the last sentence by default', fix: 'Map support; the conclusion can come first or in the middle.' },
    { tag: 'intermediate_as_main', label: 'Stopping at an intermediate conclusion', fix: 'Ask whether the claim supports anything further.' },
    { tag: 'premise_as_conclusion', label: 'Picking a premise', fix: 'Premises do the supporting; they are not what is being proved.' },
    { tag: 'too_strong', label: 'Changing the conclusion’s strength', fix: 'Match qualifiers exactly: likely, some, should.' },
  ],
  items: [
    item('mc.o1', 'orient', 1, '“Our team should switch to the new scheduling software. It cut planning time in half for the other two departments, and its license costs less than our current tool.”', 'What is the main conclusion?', [
      ['The team should switch to the new scheduling software.', 'KEY', 'The other two sentences are reasons for switching.'],
      ['The software cut planning time in half for other departments.', 'premise_as_conclusion', 'A reason offered for switching.'],
      ['The license costs less than the current tool.', 'last_sentence', 'The last clause is a premise, not the conclusion.'],
      ['Scheduling software is useful.', 'too_strong', 'This is a vague topic statement, not the specific claim.'],
    ]),
    item('mc.r1', 'recognize', 1, '“Since the museum’s visitor numbers fell after admission prices rose, and similar museums saw no decline, the price increase probably reduced attendance.”', 'Which is the conclusion?', [
      ['The price increase probably reduced attendance.', 'KEY', 'The “since” clauses give reasons for this claim.'],
      ['Visitor numbers fell after prices rose.', 'premise_as_conclusion', 'Introduced by “since” — a premise.'],
      ['Similar museums saw no decline.', 'premise_as_conclusion', 'A premise.'],
      ['The price increase reduced attendance.', 'too_strong', 'Drops the word “probably.”'],
    ]),
    item('mc.r2', 'recognize', 2, '“Local bakeries should stop using plastic bags. After all, paper bags now cost about the same, and customers in our survey preferred paper.”', 'Where is the main conclusion?', [
      ['In the first sentence.', 'KEY', '“After all” introduces the reasons that follow.'],
      ['In the clause about cost.', 'last_sentence', 'This is a premise.'],
      ['In the survey result.', 'premise_as_conclusion', 'This is a premise.'],
      ['There is no conclusion.', 'conceptual', 'The first sentence is supported by the others.'],
    ]),
    item('mc.r3', 'recognize', 2, '“The river’s fish population has declined, so the dam upstream is likely restricting spawning. Thus the dam’s operators should open the fish ladder during spring.”', 'Which statement is an intermediate conclusion?', [
      ['The dam upstream is likely restricting spawning.', 'KEY', 'It is supported by the fish decline and supports opening the ladder.'],
      ['The fish population has declined.', 'premise_as_conclusion', 'A premise with no support of its own.'],
      ['The operators should open the fish ladder in spring.', 'intermediate_as_main', 'This is the main conclusion.'],
      ['Dams harm fish.', 'too_strong', 'A broader claim not made.'],
    ]),
    item('mc.a1', 'apply', 2, 'Planner: The proposal to widen Elm Street should be rejected. Widening would require removing forty mature trees, and studies of similar projects show that wider streets attract more traffic rather than relieving congestion.', 'Which one of the following most accurately expresses the main conclusion?', [
      ['The proposal to widen Elm Street should be rejected.', 'KEY', 'Both later sentences are reasons to reject.'],
      ['Widening would require removing forty trees.', 'premise_as_conclusion', 'A premise.'],
      ['Wider streets attract more traffic.', 'last_sentence', 'A premise drawn from studies.'],
      ['Elm Street is congested.', 'conceptual', 'Not claimed.'],
      ['Mature trees should never be removed.', 'too_strong', 'Far stronger than anything stated.'],
    ], { hints: ['Which sentence do the others support?', 'Try “X because Y” with each candidate.'] }),
    item('mc.a2', 'apply', 3, 'Critic: Some say the novel’s ending is rushed. But its final chapter resolves every major conflict introduced earlier, and its brevity mirrors the protagonist’s sudden decision. The ending is, in fact, carefully constructed.', 'Which one of the following most accurately expresses the critic’s main conclusion?', [
      ['The novel’s ending is carefully constructed.', 'KEY', '“But…” introduces reasons against the opposing view, leading to this claim.'],
      ['The novel’s ending is rushed.', 'background_as_premise', 'This is the view the critic rejects.'],
      ['The final chapter resolves every major conflict.', 'premise_as_conclusion', 'A premise.'],
      ['The brevity mirrors the protagonist’s decision.', 'premise_as_conclusion', 'A premise.'],
      ['The novel is the author’s best work.', 'too_strong', 'Not claimed.'],
    ], { hints: ['Whose view is the first sentence?', 'Find where the critic turns to their own position.'] }),
    item('mc.c1', 'challenge', 3, 'Economist: Most of the city’s new jobs last year were in health care. Because health-care demand rises as the population ages, and the city’s median age is increasing, this trend will probably continue. City training programs should therefore expand nursing courses.', 'Which one of the following most accurately expresses the main conclusion of the economist’s argument?', [
      ['City training programs should expand nursing courses.', 'KEY', 'The job and aging trends support continued health-care growth, which supports expanding nursing courses.'],
      ['The concentration of new jobs in health care will probably continue.', 'intermediate_as_main', 'This is an intermediate conclusion.'],
      ['Most new jobs last year were in health care.', 'premise_as_conclusion', 'A premise.'],
      ['The city’s median age is increasing.', 'premise_as_conclusion', 'A premise.'],
      ['Health care will provide most new jobs forever.', 'too_strong', 'Overstates “probably continue.”'],
    ]),
    item('mc.c2', 'challenge', 2, 'Gardener: Coffee grounds are not, as many believe, a good all-purpose fertilizer. They acidify soil, which harms many common vegetables, and they can slow seed germination.', 'Which one of the following most accurately expresses the gardener’s conclusion?', [
      ['Coffee grounds are not a good all-purpose fertilizer.', 'KEY', 'The acidity and germination claims support this.'],
      ['Many people believe coffee grounds are a good fertilizer.', 'background_as_premise', 'Background about the opposing belief.'],
      ['Coffee grounds acidify soil.', 'premise_as_conclusion', 'A premise.'],
      ['Coffee grounds harm all plants.', 'too_strong', 'Overstated.'],
      ['Coffee grounds slow germination.', 'last_sentence', 'A premise in the last clause.'],
    ]),
    item('mc.m1', 'mastery_check', 2, 'Mayor: We should keep the library’s Sunday hours. Sunday is the busiest day for families with school-age children, and the cost of staffing it is less than one percent of the library budget.', 'Which one of the following most accurately expresses the main conclusion?', [
      ['The library’s Sunday hours should be kept.', 'KEY', 'The rest supports keeping Sunday hours.'],
      ['Sunday is the busiest day for families.', 'premise_as_conclusion', 'Premise.'],
      ['Sunday staffing costs are small.', 'last_sentence', 'Premise.'],
      ['The library budget should be increased.', 'too_strong', 'Not claimed.'],
      ['Families with children use the library most.', 'conceptual', 'Not quite stated; and not the conclusion.'],
    ]),
    item('mc.m2', 'mastery_check', 3, 'Historian: The letters are probably forgeries. Their paper contains a whitening agent first manufactured decades after the letters’ supposed date, so the paper itself could not have existed then.', 'Which one of the following most accurately expresses the main conclusion?', [
      ['The letters are probably forgeries.', 'KEY', 'Stated first and supported by the paper evidence.'],
      ['The paper could not have existed at the supposed date.', 'intermediate_as_main', 'This intermediate step supports the main conclusion.'],
      ['The paper contains a whitening agent.', 'premise_as_conclusion', 'Premise.'],
      ['The letters are certainly forgeries.', 'too_strong', 'Drops “probably.”'],
      ['Whitening agents were invented recently.', 'conceptual', 'Not what is claimed.'],
    ]),
    item('mc.m3', 'mastery_check', 3, 'Scientist: Critics argue that the new vaccine trial was too small to be meaningful. Yet the trial was designed with enough participants to detect the effect size observed in earlier studies, and it detected that effect. The critics’ objection, therefore, does not undermine the trial’s main finding.', 'Which one of the following most accurately expresses the scientist’s main conclusion?', [
      ['The critics’ objection does not undermine the trial’s main finding.', 'KEY', 'Everything after “Yet” supports this.'],
      ['The trial was too small to be meaningful.', 'background_as_premise', 'The critics’ view.'],
      ['The trial detected the expected effect.', 'premise_as_conclusion', 'Premise.'],
      ['The vaccine is effective for everyone.', 'too_strong', 'Not claimed.'],
      ['The trial was well designed.', 'intermediate_as_main', 'Close to a premise; not the conclusion.'],
    ]),
  ],
  placementItemIds: ['mc.r3', 'mc.a1', 'mc.a2', 'mc.c1', 'mc.m3'],
  tagToSection: { last_sentence: 'indicators', intermediate_as_main: 'distinguish', premise_as_conclusion: 'tests', background_as_premise: 'distinguish', too_strong: 'strength', conceptual: 'tests' },
};

export const LESSON_ROLE = {
  id: 'lesson.analysis.role', skillId: 'analysis.role', version: '2.0.0', review: REVIEW(false),
  title: 'Role of a Statement', estMinutes: 20,
  objective: 'By the end, you will be able to describe how a highlighted statement functions in an argument: premise, main conclusion, intermediate conclusion, concession, objection, example, background, or counterevidence.',
  why: 'Role questions ask what a sentence does, not whether it is true. The skill also underlies Method and Parallel questions.',
  sections: [
    { id: 'roles', title: 'The roles', body: [
      'PREMISE: offered as support. MAIN CONCLUSION: what everything else supports. INTERMEDIATE CONCLUSION: supported by something and supports something further.',
      'CONCESSION: acknowledges a point against the author (“Admittedly…”). OBJECTION: a view the author argues against. EXAMPLE: an instance illustrating a general claim. BACKGROUND: context, not support. COUNTEREVIDENCE: evidence against the conclusion that the author addresses.',
    ] },
    { id: 'map', title: 'Map the argument', body: [
      'Draw arrows from each supporting claim to what it supports. A sentence’s role is its position on that map.',
      'One sentence can be supported by earlier material AND support a later claim — that is what makes it intermediate.',
    ] },
    { id: 'speakers', title: 'Multiple speakers and nested views', body: [
      'When a passage reports someone else’s argument, a statement can be a premise in THEIR argument while being the target of the author’s criticism.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“The road is icy. Thus travel will be slower. Therefore deliveries will arrive late.” Role of “travel will be slower”?', steps: ['It is supported by “the road is icy.”', 'It supports “deliveries will arrive late.”'], conclusion: 'Intermediate conclusion.' },
    { id: 'we2', prompt: '“Admittedly, the new policy costs more. But it cuts processing time in half, so it is worth adopting.” Role of “the new policy costs more”?', steps: ['“Admittedly” signals the author grants a point that cuts against them.', 'It does not support the conclusion.'], conclusion: 'A concession.' },
  ],
  counterexample: { claim: '“A statement can have only one role.”', whyInvalid: '“Travel will be slower” is both a conclusion (of the ice premise) and a premise (for late deliveries).' },
  misconceptions: [
    { tag: 'intermediate_as_main', label: 'Missing that a claim is intermediate', fix: 'Check both directions: is it supported, and does it support?' },
    { tag: 'concession_as_premise', label: 'Treating a concession as support', fix: 'A concession acknowledges a point against the author.' },
    { tag: 'background_as_premise', label: 'Treating background or an opposing view as the author’s premise', fix: 'Trace who asserts the claim and whether it is offered as a reason.' },
    { tag: 'premise_as_conclusion', label: 'Calling a premise a conclusion', fix: 'Ask whether anything supports it.' },
  ],
  items: [
    item('ro.o1', 'orient', 1, '“Because the bakery’s oven broke, it could not bake bread this morning. So the café that buys its bread will run out by noon.”', 'What role does “it could not bake bread this morning” play?', [
      ['It is supported by one claim and supports another.', 'KEY', 'Supported by the broken oven; supports the café running out.'],
      ['It is the main conclusion.', 'intermediate_as_main', 'The main conclusion is about the café.'],
      ['It is background with no role in the argument.', 'background_as_premise', 'It plays a central role.'],
      ['It is an objection the author rejects.', 'conceptual', 'The author accepts it.'],
    ]),
    item('ro.r1', 'recognize', 1, '“Admittedly, electric buses cost more upfront. Still, their lower fuel and maintenance costs make them cheaper over a decade, so the city should buy them.”', 'What role does “electric buses cost more upfront” play?', [
      ['A concession to a point against the conclusion.', 'KEY', '“Admittedly” marks a point the author grants.'],
      ['A premise supporting the conclusion.', 'concession_as_premise', 'It cuts against buying, not for it.'],
      ['The main conclusion.', 'premise_as_conclusion', 'The conclusion is that the city should buy them.'],
      ['An intermediate conclusion.', 'intermediate_as_main', 'Nothing supports it, and it supports nothing.'],
    ]),
    item('ro.r2', 'recognize', 2, '“Some argue that handwriting instruction is obsolete. However, studies show that writing by hand improves retention of new material. Schools should therefore keep handwriting lessons.”', 'What role does “handwriting instruction is obsolete” play?', [
      ['A view the argument opposes.', 'KEY', 'Introduced as what “some argue,” then rejected.'],
      ['The main conclusion.', 'background_as_premise', 'It is the opposing view.'],
      ['A premise.', 'background_as_premise', 'It does not support the author’s conclusion.'],
      ['An example.', 'conceptual', 'It is not illustrating a general claim.'],
    ]),
    item('ro.r3', 'recognize', 2, '“Many species adapt quickly to cities. Urban crows, for instance, have learned to drop nuts in traffic to crack them. So conservation plans should not assume cities are hostile to all wildlife.”', 'What role does the statement about urban crows play?', [
      ['An example offered in support of a general claim.', 'KEY', 'It illustrates that species adapt to cities.'],
      ['The main conclusion.', 'premise_as_conclusion', 'The conclusion concerns conservation plans.'],
      ['A concession.', 'concession_as_premise', 'It supports the author.'],
      ['Background unrelated to the argument.', 'background_as_premise', 'It supports the general claim.'],
    ]),
    item('ro.a1', 'apply', 2, 'Analyst: The factory’s emissions fell 30 percent last year. Yet output also fell 30 percent. So the drop in emissions does not show that the new filters worked, and the claim that the filters reduced pollution is unsupported.', 'The statement that output fell 30 percent plays which role?', [
      ['It is offered to show that the emissions drop has another explanation.', 'KEY', 'Lower output can explain lower emissions, undercutting the filter explanation.'],
      ['It is the main conclusion.', 'premise_as_conclusion', 'Nothing supports it.'],
      ['It supports the claim that the filters worked.', 'concession_as_premise', 'It undercuts that claim.'],
      ['It is a concession that the filters worked.', 'concession_as_premise', 'It does not grant that.'],
      ['It is background with no role.', 'background_as_premise', 'It is central evidence.'],
    ], { hints: ['What does this fact do to the filter explanation?', 'Is it supporting or challenging that explanation?'] }),
    item('ro.a2', 'apply', 3, 'Ethicist: Some hold that it is wrong to break any promise. But suppose you promised to meet a friend and, on the way, you could save a drowning child only by missing the meeting. Surely you should save the child. So not every promise must be kept.', 'The scenario about the drowning child functions as', [
      ['a counterexample to a general principle', 'KEY', 'It describes a case where breaking a promise is right, against the principle.'],
      ['the main conclusion', 'premise_as_conclusion', 'The conclusion is that not every promise must be kept.'],
      ['a concession to the opposing view', 'concession_as_premise', 'It attacks the opposing view.'],
      ['background information', 'background_as_premise', 'It is the key evidence.'],
      ['an example supporting the principle that promises must be kept', 'conceptual', 'It undermines that principle.'],
    ], { hints: ['What principle is under attack?', 'Does the case fit or break that principle?'] }),
    item('ro.c1', 'challenge', 3, 'Columnist: Opponents of the transit levy claim it will burden low-income residents. But the levy is structured as a property tax, and most low-income residents rent. Granted, landlords may pass some costs on to tenants. Even so, the levy’s burden will fall mostly on property owners, so the opponents’ claim is exaggerated.', 'The claim that landlords may pass some costs on to tenants plays which role?', [
      ['It acknowledges a consideration that partly cuts against the columnist’s conclusion.', 'KEY', '“Granted” concedes a point; “Even so” keeps the conclusion.'],
      ['It is the main conclusion.', 'premise_as_conclusion', 'The conclusion is that the opponents’ claim is exaggerated.'],
      ['It supports the claim that the burden falls on owners.', 'concession_as_premise', 'It cuts the other way.'],
      ['It is the opponents’ conclusion.', 'background_as_premise', 'The columnist grants it, not the opponents.'],
      ['It is an intermediate conclusion.', 'intermediate_as_main', 'It supports nothing further.'],
    ]),
    item('ro.c2', 'challenge', 3, 'Biologist: The orchid can only be pollinated by one moth species. That moth is declining because of habitat loss. Hence the orchid is at risk, and protecting the moth’s habitat is the most direct way to protect the orchid.', 'The claim that the orchid is at risk plays which role?', [
      ['It is a conclusion drawn from earlier claims that also supports a further claim.', 'KEY', 'Supported by the pollination and decline premises; supports the habitat recommendation.'],
      ['It is the main conclusion.', 'intermediate_as_main', 'The final recommendation is the main conclusion.'],
      ['It is a premise with no support.', 'premise_as_conclusion', 'It is supported by the first two claims.'],
      ['It is a concession.', 'concession_as_premise', 'The author asserts it.'],
      ['It is an example of habitat loss.', 'conceptual', 'Not an example.'],
    ]),
    item('ro.m1', 'mastery_check', 2, '“The pilot program should be expanded. Participants’ test scores rose more than non-participants’, and the program costs little.”', 'What role does “participants’ test scores rose more than non-participants’” play?', [
      ['A premise supporting the main conclusion.', 'KEY', 'It is a reason to expand the program.'],
      ['The main conclusion.', 'premise_as_conclusion', 'The conclusion is to expand the program.'],
      ['A concession.', 'concession_as_premise', 'It favors the author.'],
      ['An intermediate conclusion.', 'intermediate_as_main', 'Nothing supports it.'],
    ]),
    item('ro.m2', 'mastery_check', 3, 'Engineer: Some claim the old bridge must be replaced. Admittedly, it is over a century old. But age alone does not determine safety, and recent inspections found no structural weaknesses. The bridge should be repaired, not replaced.', 'The statement that the bridge is over a century old plays which role?', [
      ['It concedes a fact that might seem to favor replacement.', 'KEY', '“Admittedly” marks a concession.'],
      ['It supports the conclusion that the bridge should be repaired.', 'concession_as_premise', 'It cuts against repair.'],
      ['It is the main conclusion.', 'premise_as_conclusion', 'The conclusion is repair, not replace.'],
      ['It is the view of those the engineer opposes.', 'background_as_premise', 'The engineer grants it as a fact.'],
      ['It is an intermediate conclusion.', 'intermediate_as_main', 'It is not supported or supporting.'],
    ]),
    item('ro.m3', 'mastery_check', 3, 'Critic: The film’s director says the movie is a comedy. Yet it ends with the main character’s death, and most scenes are somber. Thus the film is better described as a tragedy, despite its few humorous moments.', 'The phrase “despite its few humorous moments” plays which role?', [
      ['It acknowledges evidence that could be cited against the conclusion.', 'KEY', 'Humor would favor “comedy”; the critic grants it but keeps the conclusion.'],
      ['It is the main conclusion.', 'premise_as_conclusion', 'The conclusion is that the film is a tragedy.'],
      ['It supports the conclusion.', 'concession_as_premise', 'It cuts against it.'],
      ['It is the director’s view.', 'background_as_premise', 'The director’s view is that it is a comedy.'],
      ['It is an intermediate conclusion.', 'intermediate_as_main', 'Nothing supports it.'],
    ]),
  ],
  placementItemIds: ['ro.r1', 'ro.a1', 'ro.a2', 'ro.c1', 'ro.m2'],
  tagToSection: { intermediate_as_main: 'map', concession_as_premise: 'roles', background_as_premise: 'speakers', premise_as_conclusion: 'map', conceptual: 'roles' },
};

export const LESSON_METHOD = {
  id: 'lesson.analysis.method', skillId: 'analysis.method', version: '2.0.0', review: REVIEW(false),
  title: 'Method of Reasoning', estMinutes: 20, classicLabel: 'Method of Reasoning',
  objective: 'By the end, you will be able to describe precisely HOW an argument proceeds — not whether it is good — and choose the most accurate abstract description.',
  why: 'Method questions reward precise, abstract descriptions. The same skill drives Parallel Reasoning and helps you see the structure behind any argument.',
  sections: [
    { id: 'categories', title: 'Common methods', body: [
      'By EXAMPLE or counterexample · by ANALOGY · by ELIMINATION of alternatives · by applying a CONDITIONAL rule or PRINCIPLE · by CAUSAL explanation · by STATISTICAL projection from a sample · by REBUTTAL (attacking an opponent’s evidence or reasoning).',
    ] },
    { id: 'abstract', title: 'Describe the operation, not the topic', body: [
      'Translate the argument into abstract terms: “It rejects one explanation by showing it predicts something that did not happen.”',
      'Every word in an answer choice must match. One wrong word (e.g., “proves” instead of “suggests,” “all” instead of “some”) makes it wrong.',
    ] },
    { id: 'method_vs_flaw', title: 'Method vs. flaw', body: [
      'A method question asks what the argument does; it does not ask whether it is good. Do not prefer an answer because it praises or criticizes the argument.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“Two explanations predict opposite outcomes. The observation matches only one. So the other is unlikely.”', steps: ['Two candidate explanations.', 'Evidence that discriminates between them.', 'Conclusion rejects the one that fails the test.'], conclusion: 'Method: uses discriminating evidence to rule out a competing explanation.' },
    { id: 'we2', prompt: '“Opponents say the park will raise crime because a park in another city did. But that park, unlike ours, had no lighting or patrols.”', steps: ['The opponents argue by analogy.', 'The author points out a relevant difference.'], conclusion: 'Method: undermines an analogy by identifying a relevant difference.' },
  ],
  counterexample: { claim: '“It uses statistics” as the description of a statistical-comparison argument.', whyInvalid: 'Too vague: the key operation might be comparing rates to reject an alternative. Precise descriptions name the operation.' },
  misconceptions: [
    { tag: 'topic_not_method', label: 'Describing the topic instead of the method', fix: 'Replace topic words with abstract roles (“a proposal,” “a causal claim”).' },
    { tag: 'one_wrong_word', label: 'Accepting a description with one inaccurate element', fix: 'Check every element of the choice against the argument.' },
    { tag: 'method_as_flaw', label: 'Judging quality instead of describing the method', fix: 'Describe what it does, not whether it works.' },
    { tag: 'too_strong', label: 'Overstating what the argument does', fix: '“Suggests” ≠ “proves”; “some” ≠ “all.”' },
  ],
  items: [
    item('me.o1', 'orient', 1, '“The plant needs either more light or more water. We have given it more water for a month with no improvement. So it needs more light.”', 'How does the argument proceed?', [
      ['By ruling out one of two possibilities.', 'KEY', 'It eliminates water, leaving light.'],
      ['By drawing an analogy to another plant.', 'topic_not_method', 'No analogy is made.'],
      ['By generalizing from many plants.', 'conceptual', 'No sample of plants.'],
      ['By attacking an opponent’s character.', 'conceptual', 'No opponent.'],
    ]),
    item('me.r1', 'recognize', 1, '“Some say all successful startups need venture funding. But the software firm Graybill grew to 500 employees without any outside investment.”', 'The argument proceeds by', [
      ['offering a counterexample to a general claim', 'KEY', 'Graybill contradicts “all successful startups need venture funding.”'],
      ['appealing to an expert', 'conceptual', 'No expert is cited.'],
      ['drawing a statistical generalization', 'conceptual', 'One case, not a sample.'],
      ['proving that venture funding is harmful', 'too_strong', 'Nothing says funding is harmful.'],
    ]),
    item('me.r2', 'recognize', 2, '“Our school should adopt later start times. When Lakeside High did so, attendance rose and tardiness fell, and the two schools serve similar communities.”', 'The argument proceeds by', [
      ['drawing an analogy between two similar cases', 'KEY', 'It infers from Lakeside to “our school,” noting their similarity.'],
      ['eliminating alternative explanations', 'conceptual', 'No alternatives are ruled out.'],
      ['applying a general principle to a case', 'conceptual', 'No principle is stated.'],
      ['showing that the opposing view leads to a contradiction', 'conceptual', 'No opposing view.'],
    ]),
    item('me.r3', 'recognize', 2, '“The council member says the budget surplus proves taxes are too high. But the surplus came entirely from a one-time land sale.”', 'The response proceeds by', [
      ['offering an alternative explanation of the evidence cited', 'KEY', 'It shows the surplus has another source.'],
      ['questioning the council member’s motives', 'conceptual', 'Motives are not discussed.'],
      ['proving that taxes are too low', 'too_strong', 'Not claimed.'],
      ['agreeing with the conclusion for a different reason', 'conceptual', 'It disputes the conclusion’s support.'],
    ]),
    item('me.a1', 'apply', 2, 'Zoologist: If the parrots were learning calls from each other, we would expect birds in the same flock to share unusual calls. But birds in the same flock share no more unusual calls than birds in different flocks. So the parrots are probably not learning calls from each other.', 'The zoologist’s argument proceeds by', [
      ['showing that a hypothesis’s predicted consequence does not occur', 'KEY', 'If learning, then shared calls; no shared calls; so probably no learning.'],
      ['generalizing from a single flock', 'conceptual', 'Multiple flocks are compared.'],
      ['appealing to the authority of other zoologists', 'conceptual', 'No authority.'],
      ['proving that parrots cannot learn calls', 'too_strong', '“Probably not” is about these parrots, not an impossibility claim.'],
      ['drawing an analogy between parrots and other birds', 'topic_not_method', 'No other birds.'],
    ], { hints: ['What would be expected if the hypothesis were true?', 'What was actually observed?'] }),
    item('me.a2', 'apply', 3, 'Attorney: The prosecution’s witness says she recognized the defendant from across the street at night. But she also testified that she was not wearing her glasses, which she needs to see more than a few feet away.', 'The attorney responds by', [
      ['casting doubt on the reliability of a piece of evidence', 'KEY', 'Her vision undermines the identification.'],
      ['proving the defendant was elsewhere', 'too_strong', 'No alibi is offered.'],
      ['attacking the witness’s honesty', 'method_as_flaw', 'Her reliability, not honesty, is questioned.'],
      ['drawing an analogy to another case', 'conceptual', 'No other case.'],
      ['offering a counterexample to a general rule', 'conceptual', 'No general rule.'],
    ], { hints: ['Is the attorney disputing what the witness said, or how well she could know it?'] }),
    item('me.c1', 'challenge', 3, 'Researcher: Students who study with music score lower on tests than students who study in silence. Some conclude that music impairs learning. But students who choose to study with music also report studying fewer hours. Until study time is controlled for, the conclusion is premature.', 'The researcher’s argument proceeds by', [
      ['pointing out a factor that could account for a correlation', 'KEY', 'Study hours could explain the score gap.'],
      ['showing that music improves learning', 'too_strong', 'No such claim.'],
      ['rejecting a conclusion because it is drawn from a small sample', 'conceptual', 'Sample size is not discussed.'],
      ['arguing that test scores are an invalid measure', 'conceptual', 'Not argued.'],
      ['generalizing from one student to all students', 'conceptual', 'Not done.'],
    ]),
    item('me.c2', 'challenge', 3, 'Planner: Either the new interchange will reduce downtown congestion or it will merely shift traffic to nearby streets. Traffic models of the last three comparable interchanges showed nearby streets absorbing nearly all the diverted cars. So the interchange will likely just shift traffic.', 'Which one of the following most accurately describes the planner’s method?', [
      ['It uses evidence from comparable cases to favor one of two outcomes.', 'KEY', 'Two outcomes; evidence from similar interchanges favors one.'],
      ['It proves that congestion cannot be reduced.', 'too_strong', 'Only this interchange, and only “likely.”'],
      ['It rejects a proposal by attacking its supporters.', 'method_as_flaw', 'No attack on supporters.'],
      ['It generalizes from one interchange to all highways.', 'one_wrong_word', 'Three cases, applied to one interchange.'],
      ['It applies an ethical principle to a policy.', 'conceptual', 'No principle.'],
    ]),
    item('me.m1', 'mastery_check', 2, '“Those who say the lake is too polluted for swimming point to last summer’s algae bloom. But the bloom ended in July, and every water test since then has met safety standards.”', 'The argument proceeds by', [
      ['offering more recent evidence that undermines the support for a claim', 'KEY', 'Later tests undercut the old bloom as evidence.'],
      ['showing that algae blooms are harmless', 'too_strong', 'Not claimed.'],
      ['appealing to popular opinion', 'conceptual', 'Not done.'],
      ['drawing an analogy to another lake', 'topic_not_method', 'No other lake.'],
      ['attacking those who hold the claim', 'method_as_flaw', 'Their evidence, not them, is addressed.'],
    ]),
    item('me.m2', 'mastery_check', 3, 'Philosopher: If knowledge required absolute certainty, then no one would know anything about the physical world, since our senses can always be mistaken. But we clearly do know many things about the physical world. So knowledge does not require absolute certainty.', 'The philosopher’s argument proceeds by', [
      ['showing that a view has a consequence that is unacceptable', 'KEY', 'Certainty requirement → no knowledge; but we have knowledge; so reject the requirement.'],
      ['offering a statistical generalization', 'conceptual', 'None.'],
      ['drawing an analogy between knowledge and belief', 'topic_not_method', 'No analogy.'],
      ['appealing to the authority of philosophers', 'conceptual', 'None.'],
      ['proving that our senses are reliable', 'too_strong', 'It says senses can be mistaken.'],
    ]),
    item('me.m3', 'mastery_check', 3, 'Nutritionist: A recent study found that people who eat breakfast weigh less. But the study only surveyed members of a fitness club, who differ from the general population in many ways. So the study does not show that eating breakfast helps people in general weigh less.', 'The nutritionist’s argument proceeds by', [
      ['questioning whether a sample represents the population in a conclusion', 'KEY', 'Fitness-club members may not represent people in general.'],
      ['showing that breakfast causes weight gain', 'too_strong', 'Not claimed.'],
      ['offering a counterexample', 'conceptual', 'No single counterexample.'],
      ['rejecting all nutritional studies', 'too_strong', 'Only this study is addressed.'],
      ['pointing out that the study’s authors were biased', 'method_as_flaw', 'Authors are not discussed.'],
    ]),
  ],
  placementItemIds: ['me.r3', 'me.a1', 'me.a2', 'me.c2', 'me.m2'],
  tagToSection: { topic_not_method: 'abstract', one_wrong_word: 'abstract', method_as_flaw: 'method_vs_flaw', too_strong: 'abstract', conceptual: 'categories' },
};
