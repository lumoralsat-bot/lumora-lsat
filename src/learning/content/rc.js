// Reading Comprehension: Passage Structure (Main Idea + Purpose), Author Perspective & Tone,
// RC Inference & Detail (Detail + Inference + Analogy/Application), Comparative Passages (Curriculum v2.0 §10).
// Passages are original and short so each item stands alone; real RC passages are longer.
import { item, REVIEW } from './helpers.js';

const P_COFFEE = 'Passage: For decades, historians described the spread of coffeehouses in seventeenth-century Europe as a story of commerce: merchants opened them to profit from a fashionable new drink. Recent scholarship complicates that account. Coffeehouse records show that owners often charged little for coffee and earned most of their income from newspapers, meeting rooms, and auction space. These historians argue that coffeehouses spread chiefly because they met a growing demand for places to exchange information. Still, the newer view may overcorrect: the drink’s novelty plainly drew early customers.';
const P_BEES = 'Passage: Urban beekeeping has grown rapidly, and many advocates claim it helps reverse pollinator decline. Ecologists are less certain. Honeybees are managed livestock, not the wild species whose numbers are falling, and in dense cities large honeybee colonies may compete with wild bees for limited flowers. Some studies have found wild bee diversity dropping where hive density is highest. The ecologists do not oppose urban beekeeping, but they caution that planting diverse native flowers would do more for wild pollinators than adding hives.';
const P_A = 'Passage A: Public libraries should prioritize digital lending. Readers increasingly prefer e-books, and digital collections cost less to store and can reach residents who cannot travel to a branch.';
const P_B = 'Passage B: Libraries that shift resources toward digital lending risk abandoning their most dependent patrons. Many low-income and elderly residents lack reliable internet access. Moreover, publishers often charge libraries several times the consumer price for e-book licenses that expire.';

const STRUCTURE_SECTIONS = [
  { id: 'map', title: 'Map paragraphs by function', body: [
    'For each paragraph or major sentence, write a short label: “old view,” “new evidence,” “author’s qualification.”',
    'Pay attention to pivots: but, however, yet, still, recent scholarship.',
  ] },
  { id: 'main_idea', title: 'Main idea: the whole passage', body: [
    'The main idea covers the passage’s overall point — not one paragraph’s detail and not something broader than the passage.',
  ] },
  { id: 'purpose', title: 'Purpose: why it is there', body: [
    'Purpose questions ask why the author included a sentence or paragraph: to introduce a view, offer evidence, qualify a claim, give an example.',
    'Describe the function with a verb: introduce, challenge, illustrate, qualify.',
  ] },
];

export const LESSON_RC_STRUCTURE = {
  id: 'lesson.rc.structure', skillId: 'rc.structure', version: '2.0.0', review: REVIEW(false),
  title: 'Passage Structure', estMinutes: 25, classicLabel: 'Main Idea',
  tracks: [{ id: 'main_idea', title: 'Main idea' }, { id: 'purpose', title: 'Purpose' }],
  objective: 'By the end, you will be able to map a passage by function and answer Main Idea and Purpose questions from that map.',
  why: 'RC rewards structural reading. A good map answers main idea, purpose, and organization questions quickly and keeps you from drowning in detail.',
  sections: STRUCTURE_SECTIONS,
  workedExamples: [
    { id: 'we1', prompt: 'The coffeehouse passage.', steps: ['Old view: coffeehouses spread for commerce.', 'New evidence: income came from information services.', 'New view: they spread to meet demand for information exchange.', 'Author’s qualification: novelty mattered too.'], conclusion: 'Main idea: recent scholarship reframes coffeehouses as information hubs, though the author thinks it may overcorrect.' },
  ],
  counterexample: { claim: '“The main idea is in the first sentence.”', whyInvalid: 'In the coffeehouse passage, the first sentence is the view being revised.' },
  misconceptions: [
    { tag: 'detail_not_main', label: 'Choosing a detail as the main idea', fix: 'Ask whether the choice covers the whole passage.' },
    { tag: 'too_broad', label: 'Choosing a scope broader than the passage', fix: 'Stay inside what the passage discusses.' },
    { tag: 'wrong_function', label: 'Misdescribing a part’s function', fix: 'Use the paragraph map: what verb fits?' },
    { tag: 'wrong_viewpoint', label: 'Attributing a view to the wrong party', fix: 'Track who says what.' },
  ],
  items: [
    item('rs.o1', 'orient', 1, P_COFFEE, 'Which best describes the passage’s organization?', [
      ['A traditional explanation is presented, challenged by new evidence, and then the challenge is qualified.', 'KEY', 'Old view → new evidence/view → “Still…” qualification.'],
      ['Two theories are compared and both are rejected.', 'wrong_function', 'The new view is largely accepted.'],
      ['A problem is described and a solution proposed.', 'wrong_function', 'No solution.'],
      ['A history of coffee is given in chronological order.', 'detail_not_main', 'Not the structure.'],
    ], { track: 'main_idea' }),
    item('rs.r1', 'recognize', 1, P_COFFEE, 'Which best states the main idea?', [
      ['Coffeehouses likely spread mainly as places for exchanging information, though the drink’s appeal also mattered.', 'KEY', 'Covers the new view and the qualification.'],
      ['Coffeehouse owners charged little for coffee.', 'detail_not_main', 'A supporting detail.'],
      ['European commerce was transformed in the seventeenth century.', 'too_broad', 'Too broad.'],
      ['Historians have always misunderstood coffee.', 'too_broad', 'Overstated.'],
    ], { track: 'main_idea' }),
    item('rs.r2', 'recognize', 2, P_COFFEE, 'The author mentions newspapers, meeting rooms, and auction space primarily in order to', [
      ['provide evidence for the view that coffeehouses served an informational purpose', 'KEY', 'They show where income came from.'],
      ['show that coffee was unpopular', 'wrong_function', 'Not claimed.'],
      ['criticize the older commercial account as entirely false', 'too_broad', 'The author qualifies the new view too.'],
      ['describe a typical coffeehouse menu', 'detail_not_main', 'Not a menu.'],
    ], { track: 'purpose' }),
    item('rs.r3', 'recognize', 2, P_COFFEE, 'The final sentence functions to', [
      ['qualify the newer view by noting a factor it may underplay', 'KEY', '“Still… may overcorrect.”'],
      ['reject the newer view entirely', 'too_broad', 'Only qualifies it.'],
      ['restate the traditional view as correct', 'wrong_viewpoint', 'Does not endorse it fully.'],
      ['introduce a new topic', 'wrong_function', 'Same topic.'],
    ], { track: 'purpose' }),
    item('rs.a1', 'apply', 2, P_BEES, 'Which one of the following most accurately expresses the main point of the passage?', [
      ['Urban beekeeping may do less for declining wild pollinators than advocates claim, and planting native flowers may help more.', 'KEY', 'Captures the ecologists’ caution and recommendation.'],
      ['Urban beekeeping should be banned.', 'wrong_viewpoint', 'The ecologists do not oppose it.'],
      ['Honeybees are livestock.', 'detail_not_main', 'Detail.'],
      ['All pollinators are declining worldwide.', 'too_broad', 'Not claimed.'],
      ['Wild bee diversity is highest in cities.', 'detail_not_main', 'Contradicts the passage.'],
    ], { track: 'main_idea' }),
    item('rs.a2', 'apply', 3, P_BEES, 'The reference to studies finding that wild bee diversity drops where hive density is highest serves primarily to', [
      ['support the concern that honeybee colonies may compete with wild bees', 'KEY', 'Evidence for the competition concern.'],
      ['prove that honeybees cause wild bee extinction', 'too_broad', 'Overstated.'],
      ['show that urban beekeeping is unpopular', 'wrong_function', 'Not addressed.'],
      ['explain why advocates support beekeeping', 'wrong_viewpoint', 'It supports the ecologists.'],
      ['introduce the topic of native flowers', 'wrong_function', 'Flowers come later.'],
    ], { track: 'purpose' }),
    item('rs.c1', 'challenge', 3, P_BEES, 'Which one of the following best describes the organization of the passage?', [
      ['A popular claim is presented, reasons for doubting it are given, and an alternative approach is suggested.', 'KEY', 'Claim → doubts → native flowers.'],
      ['A scientific consensus is presented and then confirmed.', 'wrong_function', 'The claim is doubted.'],
      ['Two experiments are described and compared.', 'detail_not_main', 'Not the structure.'],
      ['A policy is proposed and then rejected.', 'wrong_function', 'Not rejected.'],
      ['A historical account is revised in light of new records.', 'wrong_function', 'That is the coffee passage.'],
    ], { track: 'main_idea' }),
    item('rs.c2', 'challenge', 3, P_COFFEE, 'The phrase “Recent scholarship complicates that account” serves to', [
      ['signal a shift from the traditional view to a revised one', 'KEY', 'A pivot.'],
      ['dismiss recent scholarship', 'wrong_viewpoint', 'It introduces it.'],
      ['state the author’s final conclusion', 'wrong_function', 'The author’s qualification comes later.'],
      ['give an example of coffeehouse income', 'detail_not_main', 'Not an example.'],
      ['summarize the passage', 'too_broad', 'It is a transition.'],
    ], { track: 'purpose' }),
    item('rs.m1', 'mastery_check', 2, P_BEES, 'The primary purpose of the passage is to', [
      ['present a qualified challenge to a popular claim about urban beekeeping', 'KEY', 'Ecologists question the claim without opposing beekeeping.'],
      ['advocate for more urban hives', 'wrong_viewpoint', 'Opposite.'],
      ['describe how honeybees make honey', 'detail_not_main', 'Not discussed.'],
      ['argue that cities harm all wildlife', 'too_broad', 'Not claimed.'],
      ['explain the history of beekeeping', 'wrong_function', 'Not discussed.'],
    ], { track: 'main_idea' }),
    item('rs.m2', 'mastery_check', 3, P_COFFEE, 'The author mentions that “owners often charged little for coffee” primarily to', [
      ['undercut the idea that coffee sales were the main source of profit', 'KEY', 'Low prices suggest profit came from elsewhere.'],
      ['show that coffee was cheap to produce', 'detail_not_main', 'Not claimed.'],
      ['support the traditional commercial account', 'wrong_viewpoint', 'It challenges it.'],
      ['criticize coffeehouse owners', 'wrong_function', 'No criticism.'],
      ['introduce the qualification in the final sentence', 'wrong_function', 'The qualification is separate.'],
    ], { track: 'purpose' }),
    item('rs.m3', 'mastery_check', 3, P_BEES, 'Which one of the following titles best fits the passage?', [
      ['Hives Versus Habitat: Rethinking How Cities Help Pollinators', 'KEY', 'Captures the contrast and recommendation.'],
      ['The Complete Guide to Urban Beekeeping', 'too_broad', 'Not a guide.'],
      ['Why Honeybees Are Livestock', 'detail_not_main', 'Detail.'],
      ['The End of Wild Bees', 'too_broad', 'Overstated.'],
      ['Native Flowers of North America', 'detail_not_main', 'Not the subject.'],
    ], { track: 'main_idea' }),
  ],
  placementItemIds: ['rs.r2', 'rs.a1', 'rs.a2', 'rs.c1', 'rs.m2'],
  tagToSection: { detail_not_main: 'main_idea', too_broad: 'main_idea', wrong_function: 'purpose', wrong_viewpoint: 'map' },
};

export const LESSON_RC_AUTHOR = {
  id: 'lesson.rc.author', skillId: 'rc.author', version: '2.0.0', review: REVIEW(false),
  title: 'Author Perspective & Tone', estMinutes: 20, classicLabel: "Author's Tone",
  objective: 'By the end, you will be able to separate the author’s view from the views the author reports, and describe the author’s attitude with accurately calibrated words.',
  why: 'Many RC questions hinge on whose view a statement expresses. Tone answers must match the strength of the author’s language.',
  sections: [
    { id: 'voices', title: 'Track the voices', body: [
      'Mark each view: “advocates claim,” “ecologists argue,” “the author.” Reported views are not the author’s unless endorsed.',
    ] },
    { id: 'tone', title: 'Calibrate tone', body: [
      'LSAT authors are rarely extreme. Prefer “cautious,” “qualified approval,” “measured skepticism” over “hostile” or “enthusiastic.”',
      'Look for evaluative words: plainly, may overcorrect, less certain, caution.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: 'Coffee passage, final sentence: “Still, the newer view may overcorrect.”', steps: ['The author largely accepts the newer view.', '“May overcorrect” signals a mild reservation.'], conclusion: 'Attitude toward the newer view: qualified agreement.' },
  ],
  counterexample: { claim: '“The author agrees with every view described.”', whyInvalid: 'In the bee passage, advocates’ claims are reported, and the ecologists doubt them.' },
  misconceptions: [
    { tag: 'wrong_viewpoint', label: 'Attributing a reported view to the author', fix: 'Find the source of each view.' },
    { tag: 'extreme_wording', label: 'Choosing an extreme tone', fix: 'Match the strength of the author’s language.' },
    { tag: 'too_broad', label: 'Overgeneralizing the author’s view', fix: 'Stay with the specific claim.' },
    { tag: 'outside_knowledge', label: 'Using your own opinion', fix: 'Only the text counts.' },
  ],
  items: [
    item('ra.o1', 'orient', 1, P_COFFEE, 'The author’s attitude toward the newer scholarship is best described as', [
      ['largely accepting, with a reservation', 'KEY', 'The author presents it favorably but says it may overcorrect.'],
      ['entirely dismissive', 'extreme_wording', 'Too strong.'],
      ['enthusiastic and uncritical', 'extreme_wording', 'There is a reservation.'],
      ['indifferent', 'extreme_wording', 'The author takes a position.'],
    ]),
    item('ra.r1', 'recognize', 1, P_BEES, 'Whose view is that urban beekeeping helps reverse pollinator decline?', [
      ['Advocates of urban beekeeping.', 'KEY', '“Many advocates claim…”'],
      ['The ecologists.', 'wrong_viewpoint', 'They are less certain.'],
      ['The author, unconditionally.', 'wrong_viewpoint', 'The author reports it.'],
      ['Wild bee researchers only.', 'wrong_viewpoint', 'Not stated.'],
    ]),
    item('ra.r2', 'recognize', 2, P_BEES, 'The ecologists’ attitude toward urban beekeeping is best described as', [
      ['cautious rather than opposed', 'KEY', '“Do not oppose… but they caution.”'],
      ['hostile', 'extreme_wording', 'They do not oppose it.'],
      ['enthusiastic', 'extreme_wording', 'They are skeptical of its benefits.'],
      ['uninformed', 'outside_knowledge', 'Not supported.'],
    ]),
    item('ra.r3', 'recognize', 2, P_COFFEE, 'The word “plainly” in the final sentence indicates that the author', [
      ['considers the drink’s appeal to early customers evident', 'KEY', '“Plainly” signals confidence.'],
      ['doubts the drink was popular', 'wrong_viewpoint', 'Opposite.'],
      ['thinks coffee was plain-tasting', 'outside_knowledge', 'A misreading.'],
      ['rejects all earlier scholarship', 'extreme_wording', 'Not implied.'],
    ]),
    item('ra.a1', 'apply', 2, P_BEES, 'The author would most likely agree with which one of the following?', [
      ['Adding honeybee hives is not the most effective way to help wild pollinators in cities.', 'KEY', 'The passage ends with that caution, unrebutted.'],
      ['Urban beekeeping should be outlawed.', 'extreme_wording', 'Not supported.'],
      ['Honeybees are wild species in decline.', 'wrong_viewpoint', 'Contradicted.'],
      ['Advocates are deliberately misleading the public.', 'extreme_wording', 'Unsupported.'],
      ['Native flowers harm honeybees.', 'outside_knowledge', 'Not stated.'],
    ]),
    item('ra.a2', 'apply', 3, P_COFFEE, 'Which one of the following best describes the author’s attitude toward the traditional commercial account?', [
      ['It is incomplete but not wholly wrong.', 'KEY', 'Complicated by new evidence; novelty still mattered.'],
      ['It is entirely correct.', 'extreme_wording', 'The author accepts it was complicated.'],
      ['It is absurd.', 'extreme_wording', 'Too strong.'],
      ['It is irrelevant to the topic.', 'wrong_viewpoint', 'It is the starting point.'],
      ['It is the author’s own original view.', 'wrong_viewpoint', 'It is historians’ view.'],
    ]),
    item('ra.c1', 'challenge', 3, P_BEES, 'Which one of the following statements would the ecologists described in the passage be LEAST likely to accept?', [
      ['Adding hives in dense cities reliably increases wild bee diversity.', 'KEY', 'Contradicts their concern about competition.'],
      ['Honeybees are managed livestock.', 'wrong_viewpoint', 'They state this.'],
      ['Native flowers can help wild pollinators.', 'wrong_viewpoint', 'They recommend this.'],
      ['Urban beekeeping need not be banned.', 'wrong_viewpoint', 'They do not oppose it.'],
      ['Flowers in dense cities can be limited.', 'wrong_viewpoint', 'They imply this.'],
    ]),
    item('ra.c2', 'challenge', 3, P_COFFEE, 'The author’s use of “may overcorrect” suggests that the author regards the newer view as', [
      ['an improvement that risks discounting a real factor', 'KEY', 'Overcorrect = too far in fixing a real error.'],
      ['a mistake that should be abandoned', 'extreme_wording', 'Too strong.'],
      ['identical to the traditional view', 'wrong_viewpoint', 'It differs.'],
      ['unsupported by any evidence', 'extreme_wording', 'Records support it.'],
      ['the author’s own discovery', 'wrong_viewpoint', 'It is others’ scholarship.'],
    ]),
    item('ra.m1', 'mastery_check', 2, P_BEES, 'The passage suggests that the advocates’ claim is', [
      ['plausible-sounding but possibly mistaken', 'KEY', 'Ecologists offer reasons for doubt.'],
      ['proven false', 'extreme_wording', 'Too strong.'],
      ['universally accepted', 'extreme_wording', 'Ecologists doubt it.'],
      ['the author’s own view', 'wrong_viewpoint', 'Reported.'],
      ['irrelevant to wild bees', 'too_broad', 'It concerns pollinator decline.'],
    ]),
    item('ra.m2', 'mastery_check', 3, P_COFFEE, 'The author would most likely describe the role of coffee’s novelty as', [
      ['a genuine early attraction that the newer scholarship may underweight', 'KEY', 'Final sentence.'],
      ['the sole reason coffeehouses spread', 'extreme_wording', 'The author largely accepts the information view.'],
      ['a myth', 'extreme_wording', 'The author says it plainly drew customers.'],
      ['irrelevant to coffeehouse history', 'wrong_viewpoint', 'Contradicted.'],
      ['the merchants’ invention', 'outside_knowledge', 'Not stated.'],
    ]),
    item('ra.m3', 'mastery_check', 3, P_BEES, 'The author’s tone in presenting the ecologists’ position is best described as', [
      ['neutral and explanatory', 'KEY', 'The author reports their reasons without endorsing extremes or mocking them.'],
      ['sarcastic', 'extreme_wording', 'No sarcasm.'],
      ['alarmed', 'extreme_wording', 'Measured language.'],
      ['dismissive', 'extreme_wording', 'No dismissal.'],
      ['celebratory', 'extreme_wording', 'No celebration.'],
    ]),
  ],
  placementItemIds: ['ra.r2', 'ra.a1', 'ra.a2', 'ra.c1', 'ra.m2'],
  tagToSection: { wrong_viewpoint: 'voices', extreme_wording: 'tone', too_broad: 'tone', outside_knowledge: 'voices' },
};

export const LESSON_RC_INFERENCE = {
  id: 'lesson.rc.inference', skillId: 'rc.inference', version: '2.0.0', review: REVIEW(false),
  title: 'RC Inference & Detail', estMinutes: 25, classicLabel: 'Detail',
  tracks: [{ id: 'detail', title: 'Detail' }, { id: 'inference', title: 'Inference' }, { id: 'analogy', title: 'Analogy / application' }],
  objective: 'By the end, you will be able to locate stated details, draw inferences the text supports, and apply a passage’s idea to a new situation — without outside knowledge.',
  why: 'Detail and inference questions make up a large share of RC. Analogy questions test whether you understood the idea well enough to recognize it elsewhere.',
  sections: [
    { id: 'detail', title: 'Detail: go back to the text', body: [
      'Locate the line. The answer usually paraphrases it. Do not rely on memory.',
    ] },
    { id: 'inference', title: 'Inference: one small step', body: [
      'An RC inference stays close to the text: it must be supported, not merely possible. Extreme or speculative answers are usually wrong.',
    ] },
    { id: 'analogy', title: 'Analogy: match the relationship', body: [
      'Describe the passage’s situation abstractly (“a business earning most income from services other than its namesake product”), then find the parallel case.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: 'Coffee passage: what can be inferred about coffeehouse owners?', steps: ['Text: they charged little for coffee and earned most income elsewhere.', 'Small step: coffee was not their main source of profit.'], conclusion: 'Supported inference — no speculation about why they set prices low.' },
  ],
  counterexample: { claim: '“If it’s probably true in real life, it’s a good inference.”', whyInvalid: 'RC inferences must be supported by the passage itself.' },
  misconceptions: [
    { tag: 'outside_knowledge', label: 'Using outside knowledge', fix: 'Find the supporting line.' },
    { tag: 'extreme_wording', label: 'Choosing an overstated inference', fix: 'Stay one small step from the text.' },
    { tag: 'wrong_viewpoint', label: 'Mixing up whose claim it is', fix: 'Check the source.' },
    { tag: 'topic_match', label: 'Analogy chosen by topic', fix: 'Match the relationship, not the subject.' },
    { tag: 'unsupported', label: 'Possible but not supported', fix: 'Supported means the text gives a reason.' },
  ],
  items: [
    item('ri.o1', 'orient', 1, P_COFFEE, 'According to the passage, coffeehouse owners earned most of their income from', [
      ['newspapers, meeting rooms, and auction space', 'KEY', 'Stated directly.'],
      ['selling coffee', 'wrong_viewpoint', 'The traditional view; contradicted by records.'],
      ['government grants', 'outside_knowledge', 'Not mentioned.'],
      ['food sales', 'outside_knowledge', 'Not mentioned.'],
    ], { track: 'detail' }),
    item('ri.r1', 'recognize', 1, P_BEES, 'According to the passage, honeybees are', [
      ['managed livestock', 'KEY', 'Stated.'],
      ['the wild species in decline', 'wrong_viewpoint', 'Contradicted.'],
      ['harmful to all plants', 'extreme_wording', 'Not stated.'],
      ['native to cities', 'outside_knowledge', 'Not stated.'],
    ], { track: 'detail' }),
    item('ri.r2', 'recognize', 2, P_BEES, 'It can be inferred from the passage that in dense cities', [
      ['the supply of flowers may be insufficient for all bees', 'KEY', '“Compete… for limited flowers.”'],
      ['wild bees have disappeared', 'extreme_wording', 'Overstated.'],
      ['beekeepers plant native flowers', 'unsupported', 'Not stated.'],
      ['honeybees avoid native flowers', 'outside_knowledge', 'Not stated.'],
    ], { track: 'inference' }),
    item('ri.r3', 'recognize', 2, P_COFFEE, 'The relationship between coffeehouses and coffee, as the newer scholarship describes it, is most similar to which situation?', [
      ['A bookstore that earns most of its income from its café and events rather than book sales.', 'KEY', 'Named product is not the main income source.'],
      ['A bakery that earns most of its income from bread.', 'topic_match', 'Product is the main source.'],
      ['A coffee farm that grows coffee beans.', 'topic_match', 'Topic match only.'],
      ['A library that lends books for free.', 'unsupported', 'Different relationship.'],
    ], { track: 'analogy' }),
    item('ri.a1', 'apply', 2, P_BEES, 'Which one of the following can be most reasonably inferred from the passage?', [
      ['An increase in urban honeybee hives does not by itself indicate that wild pollinators are recovering.', 'KEY', 'Honeybees are not the declining wild species.'],
      ['Urban beekeeping has caused pollinator decline.', 'extreme_wording', 'Too strong.'],
      ['All ecologists oppose urban beekeeping.', 'wrong_viewpoint', 'They do not oppose it.'],
      ['Honey production is increasing.', 'outside_knowledge', 'Not stated.'],
      ['Native flowers grow best in dense cities.', 'unsupported', 'Not stated.'],
    ], { track: 'inference' }),
    item('ri.a2', 'apply', 3, P_BEES, 'Which one of the following situations is most analogous to the ecologists’ concern about urban beekeeping?', [
      ['Releasing farm-raised trout into a stream to help a declining native fish, when the trout compete with that fish for food.', 'KEY', 'A managed species added to help may compete with the declining wild one.'],
      ['Keeping chickens in a backyard for eggs.', 'topic_match', 'No competition with a declining wild species.'],
      ['Planting a vegetable garden.', 'topic_match', 'Different relationship.'],
      ['Building a zoo for endangered animals.', 'unsupported', 'No competition element.'],
      ['Feeding wild birds in winter.', 'unsupported', 'Helps wild species directly.'],
    ], { track: 'analogy' }),
    item('ri.c1', 'challenge', 3, P_COFFEE, 'The passage most strongly suggests that the historians who hold the newer view would agree that', [
      ['the low price of coffee is evidence about coffeehouses’ main purpose', 'KEY', 'They cite pricing and income records.'],
      ['coffee’s novelty was irrelevant', 'wrong_viewpoint', 'That is not stated; the author raises novelty.'],
      ['coffeehouses were unprofitable', 'extreme_wording', 'Income came from other services.'],
      ['merchants did not open coffeehouses', 'extreme_wording', 'Not claimed.'],
      ['newspapers were invented in coffeehouses', 'outside_knowledge', 'Not stated.'],
    ], { track: 'inference' }),
    item('ri.c2', 'challenge', 3, P_BEES, 'According to the passage, what did some studies find?', [
      ['Wild bee diversity was lower where hive density was highest.', 'KEY', 'Stated.'],
      ['Honeybees outnumber wild bees in all cities.', 'extreme_wording', 'Not stated.'],
      ['Native flowers attract honeybees.', 'outside_knowledge', 'Not stated.'],
      ['Urban beekeeping is declining.', 'wrong_viewpoint', 'It has grown.'],
      ['Pollinator decline has reversed.', 'unsupported', 'Not stated.'],
    ], { track: 'detail' }),
    item('ri.m1', 'mastery_check', 2, P_COFFEE, 'Which one of the following is stated in the passage?', [
      ['The drink’s novelty drew early customers.', 'KEY', 'Final sentence.'],
      ['Coffeehouses replaced taverns.', 'outside_knowledge', 'Not stated.'],
      ['Merchants opposed coffeehouses.', 'unsupported', 'Not stated.'],
      ['Coffee was expensive in coffeehouses.', 'wrong_viewpoint', 'Contradicted.'],
      ['Auctions were banned.', 'outside_knowledge', 'Not stated.'],
    ], { track: 'detail' }),
    item('ri.m2', 'mastery_check', 3, P_BEES, 'The passage provides the most support for which one of the following?', [
      ['Planting diverse native flowers could benefit wild pollinators without adding competition from managed colonies.', 'KEY', 'Follows from the ecologists’ reasoning.'],
      ['Honeybees are more important than wild bees.', 'unsupported', 'Not supported.'],
      ['Cities should remove all hives.', 'extreme_wording', 'Not supported.'],
      ['Wild bees cannot survive in cities.', 'extreme_wording', 'Not supported.'],
      ['Advocates plant many native flowers.', 'outside_knowledge', 'Not stated.'],
    ], { track: 'inference' }),
    item('ri.m3', 'mastery_check', 3, P_COFFEE, 'Which one of the following is most analogous to the newer scholarship’s account of why coffeehouses spread?', [
      ['Early internet cafés spread mainly because people wanted places to go online, not because of the coffee they sold.', 'KEY', 'Spread driven by demand for information access, not the namesake drink.'],
      ['Tea shops spread because tea became cheaper.', 'topic_match', 'Driven by the product.'],
      ['A restaurant became popular because of its famous chef.', 'unsupported', 'Different relationship.'],
      ['A coffee brand advertised heavily.', 'topic_match', 'Topic match.'],
      ['A town built a new library.', 'unsupported', 'No parallel.'],
    ], { track: 'analogy' }),
  ],
  placementItemIds: ['ri.r2', 'ri.a1', 'ri.a2', 'ri.c1', 'ri.m3'],
  tagToSection: { outside_knowledge: 'detail', extreme_wording: 'inference', wrong_viewpoint: 'detail', topic_match: 'analogy', unsupported: 'inference' },
};

export const LESSON_RC_COMPARATIVE = {
  id: 'lesson.rc.comparative', skillId: 'rc.comparative', version: '2.0.0', review: REVIEW(false),
  title: 'Comparative Passages', estMinutes: 20, classicLabel: 'Comparative Passage',
  objective: 'By the end, you will be able to identify where two passages agree, disagree, or address different questions, and describe the relationship between them.',
  why: 'Every RC section includes a comparative set. Questions ask about agreement, disagreement, and how one passage would respond to the other.',
  sections: [
    { id: 'each', title: 'Summarize each passage first', body: [
      'One line per passage: its main claim and its key reasons.',
    ] },
    { id: 'relation', title: 'Then map the relationship', body: [
      'Agree? Disagree? Address different aspects? Does B respond to A’s reasoning, or only to its conclusion?',
      'Answers about agreement must be supported by BOTH passages.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: 'Digital lending passages A and B.', steps: ['A: prioritize digital — preference, cost, reach.', 'B: shifting risks abandoning dependent patrons — access gaps, license costs.'], conclusion: 'B challenges A’s cost and reach claims.' },
  ],
  counterexample: { claim: '“If both passages mention a topic, they agree about it.”', whyInvalid: 'Both discuss cost; A says digital is cheaper, B says licenses are expensive.' },
  misconceptions: [
    { tag: 'one_passage_only', label: 'Choosing a claim only one passage supports', fix: 'Check both passages for agreement questions.' },
    { tag: 'wrong_viewpoint', label: 'Mixing up which passage says what', fix: 'Keep separate summaries.' },
    { tag: 'extreme_wording', label: 'Overstating the disagreement', fix: 'Match the strength of each author’s claim.' },
    { tag: 'topic_match', label: 'Treating shared topic as agreement', fix: 'Ask what each says about the topic.' },
  ],
  items: [
    item('rc.o1', 'orient', 1, P_A + '\n\n' + P_B, 'The passages disagree most clearly about', [
      ['whether libraries should shift resources toward digital lending', 'KEY', 'A says prioritize; B warns against shifting.'],
      ['whether readers like e-books', 'one_passage_only', 'Only A addresses this.'],
      ['whether libraries exist', 'extreme_wording', 'Both assume they do.'],
      ['the history of libraries', 'topic_match', 'Not discussed.'],
    ]),
    item('rc.r1', 'recognize', 1, P_A + '\n\n' + P_B, 'Which concern is raised in Passage B but not in Passage A?', [
      ['Some residents lack reliable internet access.', 'KEY', 'Only B.'],
      ['E-books are popular.', 'wrong_viewpoint', 'That is A.'],
      ['Digital collections are cheaper to store.', 'wrong_viewpoint', 'That is A.'],
      ['Libraries should close branches.', 'extreme_wording', 'Neither.'],
    ]),
    item('rc.r2', 'recognize', 2, P_A + '\n\n' + P_B, 'Passage B’s point about e-book license prices most directly challenges which claim in Passage A?', [
      ['Digital collections cost less.', 'KEY', 'Expensive, expiring licenses undercut cost savings.'],
      ['Readers prefer e-books.', 'topic_match', 'Not about price.'],
      ['Digital reaches residents who cannot travel.', 'topic_match', 'Challenged by the internet point instead.'],
      ['Libraries should exist.', 'extreme_wording', 'Not claimed.'],
    ]),
    item('rc.r3', 'recognize', 2, P_A + '\n\n' + P_B, 'Both authors would most likely agree that', [
      ['decisions about digital lending should consider who library patrons are', 'KEY', 'A cites reach; B cites dependent patrons.'],
      ['libraries should stop buying print books', 'extreme_wording', 'Neither says so.'],
      ['e-book licenses are cheap', 'one_passage_only', 'B denies it; A says nothing about licenses.'],
      ['most residents lack internet access', 'extreme_wording', 'B says “many,” A does not say.'],
    ]),
    item('rc.a1', 'apply', 2, P_A + '\n\n' + P_B, 'The author of Passage B would most likely respond to Passage A’s claim that digital collections “can reach residents who cannot travel to a branch” by pointing out that', [
      ['many such residents may lack the internet access digital lending requires', 'KEY', 'B’s access concern.'],
      ['travel is easy', 'extreme_wording', 'Not B’s point.'],
      ['e-books are unpopular', 'wrong_viewpoint', 'B does not claim this.'],
      ['branches should close', 'extreme_wording', 'Not B’s view.'],
      ['print books cost more to store', 'one_passage_only', 'Supports A.'],
    ]),
    item('rc.a2', 'apply', 3, P_A + '\n\n' + P_B, 'Which one of the following best describes the relationship between the passages?', [
      ['Passage B raises considerations that complicate the recommendation in Passage A.', 'KEY', 'B challenges A’s reasons.'],
      ['Passage B provides evidence supporting Passage A.', 'wrong_viewpoint', 'It challenges.'],
      ['The passages address unrelated topics.', 'topic_match', 'Same topic.'],
      ['Passage A responds to Passage B.', 'wrong_viewpoint', 'B responds to A’s kind of claim.'],
      ['Passage B proves Passage A false.', 'extreme_wording', 'Too strong.'],
    ]),
    item('rc.c1', 'challenge', 3, P_A + '\n\n' + P_B, 'Which one of the following, if true, would most weaken Passage B’s argument against Passage A?', [
      ['The library already provides free internet-ready devices and home hotspots to residents who lack access.', 'KEY', 'Addresses B’s access concern.'],
      ['Many readers prefer print.', 'wrong_viewpoint', 'Would strengthen B.'],
      ['E-book licenses are getting more expensive.', 'wrong_viewpoint', 'Strengthens B.'],
      ['Libraries have existed for centuries.', 'topic_match', 'Irrelevant.'],
      ['Digital collections need servers.', 'topic_match', 'Irrelevant.'],
    ]),
    item('rc.c2', 'challenge', 3, P_A + '\n\n' + P_B, 'Passage A, but not Passage B, makes a claim about', [
      ['readers’ changing preferences', 'KEY', '“Readers increasingly prefer e-books.”'],
      ['the cost of digital materials', 'one_passage_only', 'Both discuss cost.'],
      ['patrons’ access to library services', 'one_passage_only', 'Both discuss access.'],
      ['elderly residents', 'wrong_viewpoint', 'Only B.'],
      ['license expiration', 'wrong_viewpoint', 'Only B.'],
    ]),
    item('rc.m1', 'mastery_check', 2, P_A + '\n\n' + P_B, 'The authors of the passages would most likely disagree about whether', [
      ['digital lending lowers a library’s costs', 'KEY', 'A says it costs less; B says licenses are expensive.'],
      ['some residents cannot travel to branches', 'one_passage_only', 'Only A addresses this; B does not deny it.'],
      ['libraries serve the public', 'extreme_wording', 'Both assume so.'],
      ['e-books exist', 'extreme_wording', 'Both assume so.'],
      ['elderly residents use libraries', 'one_passage_only', 'Only B.'],
    ]),
    item('rc.m2', 'mastery_check', 3, P_A + '\n\n' + P_B, 'Which one of the following is a concern that Passage B suggests but Passage A does not address?', [
      ['A digital-first policy might reduce services for patrons who depend most on libraries.', 'KEY', 'B’s central concern.'],
      ['E-books are more convenient.', 'wrong_viewpoint', 'A’s point.'],
      ['Libraries should be closed.', 'extreme_wording', 'Neither.'],
      ['Print storage is cheap.', 'one_passage_only', 'Not stated by B.'],
      ['All patrons have internet access.', 'extreme_wording', 'Contradicted by B.'],
    ]),
    item('rc.m3', 'mastery_check', 3, P_A + '\n\n' + P_B, 'The author of Passage A would most likely regard Passage B’s point about elderly residents as', [
      ['a concern that A’s argument does not address', 'KEY', 'A does not discuss access gaps.'],
      ['support for A’s proposal', 'wrong_viewpoint', 'It cuts against A.'],
      ['the same as A’s point about travel', 'topic_match', 'Different concerns.'],
      ['irrelevant to libraries', 'extreme_wording', 'Clearly relevant.'],
      ['proof that A is correct', 'extreme_wording', 'No.'],
    ]),
  ],
  placementItemIds: ['rc.r2', 'rc.a1', 'rc.a2', 'rc.c1', 'rc.m1'],
  tagToSection: { one_passage_only: 'relation', wrong_viewpoint: 'each', extreme_wording: 'relation', topic_match: 'relation' },
};
