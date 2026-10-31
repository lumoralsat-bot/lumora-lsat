// Foundations: Truth vs. Logical Support; Deductive vs. Inductive Reasoning (Curriculum v2.0 §5).
import { item, REVIEW } from './helpers.js';

export const LESSON_TRUTH = {
  id: 'lesson.found.validity', skillId: 'found.validity', version: '2.0.0', review: REVIEW(false),
  title: 'Truth vs. Logical Support', estMinutes: 20,
  objective: 'By the end, you will be able to separate whether a statement is true from whether premises support a conclusion, and tell valid, sound, and merely true-conclusion arguments apart.',
  why: 'LSAT questions almost never ask whether a claim is true in the real world. They ask whether the reasoning works. Students who judge answers by real-world truth pick attractive wrong answers on Flaw, Assumption, and Inference questions.',
  sections: [
    { id: 'terms', title: 'Premise, conclusion, inference', body: [
      'A PREMISE is a claim offered as a reason. The CONCLUSION is the claim the reasons are meant to support. The INFERENCE is the step from one to the other.',
      'Two separate questions: (1) Are the premises true? (2) If they were true, would they support the conclusion? The LSAT tests the second question.',
    ] },
    { id: 'validity', title: 'Validity and soundness', body: [
      'An argument is VALID when it is impossible for all its premises to be true and its conclusion false. Validity is about form and connection, not about whether the premises are actually true.',
      'An argument is SOUND when it is valid AND its premises are true.',
      'A valid argument can have a false conclusion (if a premise is false). An invalid argument can have a true conclusion (by luck).',
    ], diagram: 'valid = the premises guarantee the conclusion · sound = valid + true premises' },
    { id: 'countermodel', title: 'Showing an argument is invalid', body: [
      'To show an argument is invalid, describe a possible situation where every premise is true and the conclusion is false. That situation is a COUNTERMODEL.',
      'Example: “All cats are mammals. Rex is a mammal. So Rex is a cat.” Countermodel: Rex is a dog. Both premises true, conclusion false.',
    ] },
    { id: 'strength', title: 'Evidence strength', body: [
      'Many good arguments are not valid: they make a conclusion more likely without guaranteeing it. Ask how much the premises raise the conclusion’s plausibility, and what else could explain the evidence.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“All cedar trees are plants. This is a cedar tree. Therefore it is a plant.”',
      steps: ['Can both premises be true while the conclusion is false?', 'If every cedar is a plant and this is a cedar, it cannot fail to be a plant.', 'The premises are also true.'],
      conclusion: 'Valid and sound.' },
    { id: 'we2', prompt: '“All rocks are birds. This is a rock. Therefore it is a bird.”',
      steps: ['Same form as the cedar argument, so the conclusion would follow IF the premises were true.', 'But “All rocks are birds” is false.'],
      conclusion: 'Valid but unsound: good form, false premise.' },
  ],
  counterexample: { claim: '“Paris is in France, because some cities have rivers.”', whyInvalid: 'The conclusion is true, but the premise gives no support for it. A true conclusion does not make an argument good.' },
  misconceptions: [
    { tag: 'truth_as_support', label: 'Judging the argument by whether the conclusion is true', fix: 'Assess the link separately: would these premises, if true, establish this conclusion?' },
    { tag: 'valid_means_true', label: 'Thinking “valid” means “true”', fix: 'Validity only says the conclusion follows. A valid argument with a false premise can have a false conclusion.' },
    { tag: 'outside_knowledge', label: 'Using outside facts to judge the reasoning', fix: 'Accept the premises as given and examine only the connection.' },
    { tag: 'conceptual', label: 'Mixing up sound and valid', fix: 'Sound = valid + all premises actually true.' },
  ],
  items: [
    item('tv.o1', 'orient', 1, '“Every planet in our solar system orbits the Sun. The Moon orbits the Earth. Therefore, the Moon is a planet.”', 'Which statement best describes this argument?', [
      ['Its premises are true, but they do not support the conclusion.', 'KEY', 'Both premises are true; nothing in them connects the Moon to being a planet. The conclusion does not follow.'],
      ['It is a strong argument because both premises are true.', 'truth_as_support', 'True premises are not enough; they must support the conclusion.'],
      ['It is valid but has a false premise.', 'valid_means_true', 'The premises are true, and the form is not valid.'],
      ['It is sound.', 'conceptual', 'Sound requires validity; this argument is invalid.'],
    ]),
    item('tv.r1', 'recognize', 1, '“If a liquid is acidic, it turns litmus paper red. This liquid is acidic. So it will turn litmus paper red.”', 'Assuming the premises are true, must the conclusion be true?', [
      ['Yes — the argument is valid.', 'KEY', 'The conclusion follows from the conditional and the fact: it cannot be false if both premises are true.'],
      ['No — some acids might not exist.', 'outside_knowledge', 'Irrelevant: we accept the premises as given.'],
      ['Only if litmus paper is reliable in real life.', 'outside_knowledge', 'Real-world reliability is not the question; the premises already say it turns red.'],
      ['No — the argument reverses the conditional.', 'converse', 'It applies the rule forward (affirms the “if” part), which is valid.'],
    ], { formal: { mode: 'must_be_true', premises: ['Acidic -> Red', 'Acidic'], choices: ['Red', 'Unrelated1', 'Unrelated2', 'Acidic & ~Red'] } }),
    item('tv.r2', 'recognize', 1, '“All violinists in the orchestra practice daily. Kim practices daily. So Kim is a violinist in the orchestra.”', 'What best describes the argument?', [
      ['Invalid: Kim could practice daily without being a violinist in the orchestra.', 'KEY', 'Countermodel: Kim is a pianist who practices daily. Both premises true, conclusion false.'],
      ['Valid, because both premises could be true.', 'truth_as_support', 'Premises being true is not what makes an argument valid.'],
      ['Valid but unsound.', 'valid_means_true', 'It is not valid; the conclusion can be false with true premises.'],
      ['Sound, if Kim really is a violinist.', 'truth_as_support', 'A true conclusion reached by bad reasoning does not make the argument sound.'],
    ]),
    item('tv.r3', 'recognize', 2, 'Argument 1: “All squares have four sides; this shape is a square; so it has four sides.” Argument 2: “All fish can fly; a salmon is a fish; so a salmon can fly.”', 'Which statement is correct?', [
      ['Both arguments are valid; only Argument 1 is sound.', 'KEY', 'Both have a form where true premises would guarantee the conclusion. Argument 2 has a false premise, so it is unsound.'],
      ['Only Argument 1 is valid.', 'valid_means_true', 'Argument 2’s form is valid; its problem is a false premise.'],
      ['Neither is valid because Argument 2’s conclusion is false.', 'valid_means_true', 'A false conclusion can come from a valid argument with a false premise.'],
      ['Both are sound.', 'conceptual', 'Soundness requires true premises; “All fish can fly” is false.'],
    ]),
    item('tv.a1', 'apply', 2, 'Consultant: “Our two best-selling products both have blue packaging. So switching all packaging to blue will raise sales.”', 'Which best describes a situation that shows the consultant’s reasoning is not guaranteed to work?', [
      ['The products sell well because of their price, and their packaging color plays no role.', 'KEY', 'This keeps both facts true while the conclusion fails: a countermodel.'],
      ['Blue is a popular color among customers.', 'irrelevant', 'This fits the conclusion; it does not show the reasoning can fail.'],
      ['The consultant has a strong track record.', 'irrelevant', 'The consultant’s record says nothing about the inference.'],
      ['Some competitors also use blue packaging.', 'irrelevant', 'This neither preserves the premises while defeating the conclusion nor bears on the link.'],
    ], { hints: ['A countermodel keeps every premise true.', 'Then it makes the conclusion false.', 'What else could explain why those two products sell well?'] }),
    item('tv.a2', 'apply', 2, '“Every member of the jury heard the testimony. Rosa heard the testimony. Therefore, Rosa is on the jury.” Suppose Rosa is, in fact, on the jury.', 'Which statement is correct?', [
      ['The conclusion is true, but the argument is still invalid.', 'KEY', 'Courtroom spectators also heard the testimony. A true conclusion does not repair the reasoning.'],
      ['The argument becomes valid because its conclusion is true.', 'truth_as_support', 'Validity depends on whether the premises guarantee the conclusion, not on the conclusion’s actual truth.'],
      ['The argument is sound.', 'conceptual', 'An invalid argument cannot be sound.'],
      ['The argument is valid but has a false premise.', 'valid_means_true', 'The premises may be true; the form is the problem.'],
    ], { hints: ['Does knowing the conclusion is true change the link between premises and conclusion?', 'Could someone hear the testimony without being on the jury?'] }),
    item('tv.c1', 'challenge', 2, 'Commentator: “My grandfather always said the town bridge was completed in 1890, and he was usually right about local history. So the bridge was completed in 1890.”', 'Which one of the following most accurately describes the commentator’s reasoning?', [
      ['Its conclusion may well be true, but the support offered for it is weak.', 'KEY', 'One relative’s usually-reliable memory gives some support but falls far short of establishing the date.'],
      ['It is valid because its conclusion is true.', 'truth_as_support', 'Truth of a conclusion does not make reasoning valid.'],
      ['It proves the bridge was completed in 1890.', 'valid_means_true', 'Testimony from one person does not guarantee the conclusion.'],
      ['It is flawed because the bridge was probably built later.', 'outside_knowledge', 'The weakness is in the support offered, not in outside facts about the bridge.'],
      ['It is sound because it cites a reliable source.', 'conceptual', '“Usually right” is not a guarantee, and soundness requires validity.'],
    ]),
    item('tv.c2', 'challenge', 3, '“Any student who submits the essay by Friday receives feedback. Jordan received feedback. Hence Jordan submitted the essay by Friday.”', 'Which one of the following arguments is VALID?', [
      ['Any student who submits by Friday receives feedback. Jordan submitted by Friday. Hence Jordan received feedback.', 'KEY', 'This applies the rule to its sufficient condition, so the conclusion is guaranteed.'],
      ['Any student who submits by Friday receives feedback. Jordan did not submit by Friday. Hence Jordan did not receive feedback.', 'inverse', 'Jordan might get feedback another way.'],
      ['Any student who submits by Friday receives feedback. Jordan received feedback. Hence Jordan submitted by Friday.', 'converse', 'This is the original invalid reasoning.'],
      ['Some students who submit by Friday receive feedback. Jordan submitted by Friday. Hence Jordan received feedback.', 'quantifier_scope', '“Some” does not cover Jordan.'],
      ['Any student who receives feedback is pleased. Jordan submitted by Friday. Hence Jordan is pleased.', 'chain_error', 'Nothing links submitting to receiving feedback here.'],
    ]),
    item('tv.m1', 'mastery_check', 2, '“Only registered voters may sign the petition. Lena signed the petition. So Lena is a registered voter.”', 'Which statement is correct?', [
      ['The argument is valid.', 'KEY', '“Only registered voters may sign” means Sign → Registered. Lena signed, so she is registered.'],
      ['The argument is invalid because Lena might not have signed.', 'outside_knowledge', 'The premise says she signed; we accept it.'],
      ['The argument is invalid: it confuses necessary and sufficient conditions.', 'converse', 'It applies the necessary condition correctly.'],
      ['The argument is sound no matter what.', 'conceptual', 'Soundness also depends on the premises being true.'],
    ], { formal: { mode: 'must_be_true', premises: ['Sign -> Registered', 'Sign'], choices: ['Registered', 'Unknown1', '~Registered', 'Unknown2'] } }),
    item('tv.m2', 'mastery_check', 3, 'Reviewer: “This novel won a major prize last year. Prize committees are made up of respected critics. Therefore, this novel will be read in schools for decades.”', 'Which one of the following is the best description of the reviewer’s argument?', [
      ['It offers some support for its conclusion, but its premises could be true while the conclusion is false.', 'KEY', 'A prize-winning novel can fall out of school curricula; the argument is at best inductively weak-to-moderate.'],
      ['It is valid because both premises are true.', 'truth_as_support', 'True premises do not make an argument valid.'],
      ['It is sound because the conclusion is a prediction.', 'conceptual', 'Predictions can be supported but rarely guaranteed.'],
      ['It is invalid because the conclusion is certainly false.', 'truth_as_support', 'Invalidity is about the link, not the conclusion’s truth.'],
      ['It is valid but unsound.', 'valid_means_true', 'It is not valid.'],
    ]),
    item('tv.m3', 'mastery_check', 2, '“No metal floats in water. This object floats in water. So this object is not metal.” (In fact, some metal ships float.)', 'Which statement is correct?', [
      ['The argument is valid but unsound.', 'KEY', 'If the first premise were true, the conclusion would follow; but the first premise is false, so the argument is unsound.'],
      ['The argument is invalid because ships float.', 'valid_means_true', 'A false premise makes it unsound, not invalid.'],
      ['The argument is sound.', 'conceptual', 'A false premise rules out soundness.'],
      ['The argument is invalid because it reverses a conditional.', 'converse', 'It uses the contrapositive correctly.'],
    ], { formal: { mode: 'must_be_true', premises: ['Metal -> ~Floats', 'Floats'], choices: ['~Metal', 'Unrel1', 'Unrel2', 'Floats -> Metal'] } }),
  ],
  placementItemIds: ['tv.r3', 'tv.a1', 'tv.a2', 'tv.c2', 'tv.m3'],
  tagToSection: { truth_as_support: 'terms', valid_means_true: 'validity', outside_knowledge: 'terms', conceptual: 'validity', irrelevant: 'countermodel', converse: 'countermodel', inverse: 'countermodel', quantifier_scope: 'countermodel', chain_error: 'countermodel' },
};

export const LESSON_DEDUCTIVE = {
  id: 'lesson.found.deductive_inductive', skillId: 'found.deductive_inductive', version: '2.0.0', review: REVIEW(false),
  title: 'Deductive vs. Inductive Reasoning', estMinutes: 20,
  objective: 'By the end, you will be able to tell an argument that guarantees its conclusion (deductive) from one that only makes it more likely (inductive), and say what new evidence would change your confidence.',
  why: 'Must Be True questions require deductive guarantees; Strengthen, Weaken, and Most Strongly Supported questions are about inductive support. Mixing the two leads to rejecting good evidence or accepting overstatements.',
  sections: [
    { id: 'deductive', title: 'Deductive: guarantee', body: [
      'A deductive argument aims to make the conclusion impossible to deny if the premises are true. It succeeds (is valid) or fails — there is no “partly valid.”',
      'Adding new premises never undoes a valid deduction.',
    ] },
    { id: 'inductive', title: 'Inductive: probability', body: [
      'An inductive argument makes its conclusion more likely. Generalizing from samples, predicting from trends, and inferring causes are usually inductive.',
      'Inductive strength comes in degrees, and it can be weakened by new evidence (it is “defeasible”).',
    ] },
    { id: 'confidence', title: 'What would change your confidence?', body: [
      'For inductive arguments ask: Is the sample large and representative? Are there alternative explanations? Would more data likely look the same?',
      'Strong inductive reasoning is still good reasoning — it just isn’t a guarantee.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: '“All licensed guides completed training. Mara is a licensed guide. So Mara completed training.”', steps: ['If the premises are true, the conclusion cannot be false.', 'No extra evidence could make it false while the premises stay true.'], conclusion: 'Deductive (and valid).' },
    { id: 'we2', prompt: '“Nine of ten guides we surveyed favor the new rule. So most guides probably favor it.”', steps: ['The conclusion goes beyond the sample.', 'Its strength depends on whether the ten were representative.', 'A biased sample (e.g., only guides at one lodge) would weaken it.'], conclusion: 'Inductive; strength depends on the sample.' },
  ],
  counterexample: { claim: '“Inductive reasoning is just guessing, so it is always a flaw.”', whyInvalid: 'Science, medicine, and law rely on strong inductive reasoning. The question is how strong the support is, not whether it is a guarantee.' },
  misconceptions: [
    { tag: 'inductive_as_illogical', label: 'Treating inductive reasoning as illogical', fix: 'Probabilistic reasoning can be strong without certainty.' },
    { tag: 'too_strong', label: 'Treating probable conclusions as guaranteed', fix: 'Watch for words like “proves,” “must,” or “certainly” attached to inductive evidence.' },
    { tag: 'sample_blind', label: 'Ignoring how the sample was chosen', fix: 'Ask whether the sample represents the group in the conclusion.' },
  ],
  items: [
    item('di.o1', 'orient', 1, '“Every time we have tested this bridge design at full load, it held. So the next bridge built with this design will hold at full load.”', 'Is this argument deductive or inductive?', [
      ['Inductive: past results make the prediction likely, not certain.', 'KEY', 'It projects from past cases to a new case; a new bridge could still fail.'],
      ['Deductive: the tests prove the result.', 'too_strong', 'Past success does not guarantee the next case.'],
      ['Neither: it is not an argument.', 'conceptual', 'It offers evidence for a conclusion, so it is an argument.'],
      ['Deductive, because engineering is precise.', 'too_strong', 'Subject matter does not determine argument type.'],
    ]),
    item('di.r1', 'recognize', 1, '“No reptile in the zoo is warm-blooded. The komodo dragon in the zoo is a reptile. So it is not warm-blooded.”', 'Which type of reasoning is this?', [
      ['Deductive — the premises guarantee the conclusion.', 'KEY', 'If both premises are true, the conclusion must be true.'],
      ['Inductive — it generalizes from a sample.', 'inductive_as_illogical', 'It applies a general rule; no sample is involved.'],
      ['Inductive — it predicts the future.', 'conceptual', 'There is no prediction.'],
      ['Neither — reptiles vary.', 'outside_knowledge', 'We accept the premises as given.'],
    ]),
    item('di.r2', 'recognize', 1, '“In a random sample of 2,000 voters, 61 percent supported the measure. So the measure will probably pass.”', 'Which type of reasoning is this?', [
      ['Inductive — the conclusion is probable given the sample.', 'KEY', 'A large random sample supports, but does not guarantee, the outcome.'],
      ['Deductive — 61 percent is a majority.', 'too_strong', 'The sample percentage does not guarantee the election result.'],
      ['Invalid and therefore worthless.', 'inductive_as_illogical', 'Inductive arguments can be strong even though they are not valid.'],
      ['Deductive — random samples are exact.', 'too_strong', 'Random samples have error and turnout can differ.'],
    ]),
    item('di.r3', 'recognize', 2, '“The last four winters were milder than average, so this winter will almost certainly be milder than average.”', 'Which weakness most affects this argument’s strength?', [
      ['Four winters is a small basis for a confident prediction.', 'KEY', 'Small samples support only weak predictions; “almost certainly” overstates it.'],
      ['It is not deductive, so it gives no support.', 'inductive_as_illogical', 'Inductive arguments can give some support.'],
      ['Winters are always cold.', 'outside_knowledge', 'This is outside knowledge and not a description of the reasoning.'],
      ['It uses a conditional statement incorrectly.', 'conceptual', 'There is no conditional statement here.'],
    ]),
    item('di.a1', 'apply', 2, '“Of the 40 students who used the new study app, 34 improved their scores. So the app improves scores for most students.”', 'Which new information would most WEAKEN this argument’s support?', [
      ['The 40 students volunteered because they were already planning to study more.', 'KEY', 'A self-selected, already-motivated sample means the improvement may not come from the app.'],
      ['The app costs less than a tutor.', 'irrelevant', 'Price is irrelevant to whether the app improves scores.'],
      ['Some students prefer paper flashcards.', 'irrelevant', 'Preferences don’t affect whether the app improves scores.'],
      ['The app was designed by teachers.', 'irrelevant', 'Its design origin does not bear on the evidence.'],
    ], { hints: ['This argument is inductive. What could make the sample unrepresentative?', 'Think about who chose to use the app.'] }),
    item('di.a2', 'apply', 2, 'Which of the following conclusions follows DEDUCTIVELY from: “Every ticket holder may enter. Some ticket holders are under 18.”', 'Which conclusion is guaranteed?', [
      ['Some people under 18 may enter.', 'KEY', 'The under-18 ticket holders may enter, so at least one person under 18 may enter.'],
      ['Most people who may enter are under 18.', 'too_strong', '“Some” cannot support “most.”'],
      ['Everyone under 18 may enter.', 'too_strong', 'Only those with tickets are covered.'],
      ['No adult may enter.', 'conceptual', 'Adult ticket holders may enter too.'],
    ], { hints: ['Start with the “some” statement.', 'Apply the “every” rule to that group.'], formal: { kind: 'quantified', premises: ['all Ticket Enter', 'some Ticket Minor'], choices: ['some Minor Enter', 'most Enter Minor', 'all Minor Enter', 'no ~Minor Enter'] } }),
    item('di.c1', 'challenge', 2, 'Analyst: “Since 2015, every quarter in which the company raised prices was followed by higher profits. So raising prices next quarter guarantees higher profits.”', 'The analyst’s reasoning is most vulnerable to criticism because it', [
      ['presents an inductive pattern as if it guaranteed a future result', 'KEY', 'A historical pattern supports a prediction but cannot guarantee it.'],
      ['relies on a sample that is too large', 'conceptual', 'Larger samples are not the problem.'],
      ['uses a deductive argument where none is appropriate', 'inductive_as_illogical', 'The argument is inductive; the error is overstating it.'],
      ['ignores that profits are always unpredictable', 'too_strong', 'This overstates the opposite; the issue is the word “guarantees.”'],
      ['confuses a necessary condition with a sufficient one', 'converse', 'No conditional is reversed here.'],
    ]),
    item('di.c2', 'challenge', 3, 'Researcher: “In our study of 12 hospitals in one city, nurse-to-patient ratios above 1:4 were associated with fewer complications. So nationwide, such ratios would probably reduce complications.”', 'Which one of the following, if true, most strengthens the researcher’s argument?', [
      ['Similar associations were found in studies of hospitals in several other regions.', 'KEY', 'Broader, independent samples make the national generalization more likely.'],
      ['The 12 hospitals were the largest in the city.', 'sample_blind', 'This suggests the sample may not represent hospitals nationwide.'],
      ['Nurses prefer lower ratios.', 'irrelevant', 'Preferences are not evidence about complications.'],
      ['Complications were measured the same way in all 12 hospitals.', 'irrelevant', 'Consistent measurement helps the original finding but does not address generalization.'],
      ['The study lasted six months.', 'irrelevant', 'Duration does not address whether the sample generalizes.'],
    ]),
    item('di.m1', 'mastery_check', 2, '“Every bird that nests in the marsh migrates south. This heron nests in the marsh.”', 'What follows deductively?', [
      ['This heron migrates south.', 'KEY', 'The general rule applies to the heron.'],
      ['Most herons migrate south.', 'too_strong', 'The premises are about marsh-nesting birds, not herons in general.'],
      ['This heron will return next year.', 'outside_knowledge', 'Not stated.'],
      ['Every bird that migrates south nests in the marsh.', 'converse', 'This reverses the rule.'],
    ], { formal: { mode: 'must_be_true', premises: ['Marsh -> South', 'Marsh', 'Marsh_y -> South_y'], choices: ['South', 'MostHerons', 'Return', 'South_y -> Marsh_y'] } }),
    item('di.m2', 'mastery_check', 3, 'Editorial: “Three of the five restaurants that opened downtown last year have closed. So any new restaurant downtown is likely to fail.”', 'Which one of the following most accurately describes a weakness in the editorial’s reasoning?', [
      ['It bases a broad prediction on a very small sample.', 'KEY', 'Five restaurants is too few to support a general claim about any new restaurant.'],
      ['It treats a deductive argument as inductive.', 'conceptual', 'The argument is inductive; the issue is weak support.'],
      ['It fails to show that restaurants are businesses.', 'irrelevant', 'Not relevant.'],
      ['It concludes that every new restaurant will certainly fail.', 'too_strong', 'The editorial says “likely,” not “certainly.”'],
      ['It reverses a conditional statement.', 'converse', 'There is no conditional.'],
    ]),
    item('di.m3', 'mastery_check', 2, 'Which one of the following is an INDUCTIVE argument?', 'Choose the inductive argument.', [
      ['Each of the 300 tomatoes we sampled from the shipment was ripe, so nearly all tomatoes in the shipment are ripe.', 'KEY', 'Generalizes from a sample; strong but not guaranteed.'],
      ['All members get a discount; Sam is a member; so Sam gets a discount.', 'conceptual', 'Deductive application of a rule.'],
      ['If it rains, the game is canceled; it rained; so the game is canceled.', 'conceptual', 'Deductive.'],
      ['No square is round; this is a square; so it is not round.', 'conceptual', 'Deductive.'],
    ]),
  ],
  placementItemIds: ['di.r2', 'di.r3', 'di.a1', 'di.c1', 'di.m2'],
  tagToSection: { inductive_as_illogical: 'inductive', too_strong: 'confidence', sample_blind: 'confidence', irrelevant: 'confidence', conceptual: 'deductive', outside_knowledge: 'deductive', converse: 'deductive' },
};
