// Lesson: Necessary & Sufficient Conditions  (skill: formal.necessary_sufficient)
//
// Every multiple-choice item carries a `formal` encoding. The unit tests run each one
// through a truth-table checker (src/learning/logic.js) to prove the keyed answer is the
// ONLY choice the premises support. If you edit an item, update its `formal` block too;
// the test suite will fail if the key and the logic disagree.
//
// Encoding convention: facts are about one individual (plain variables). GENERAL claims
// ("any/every/whenever ...") are encoded on a fresh arbitrary individual with the `_y`
// suffix, and the universal rules are instantiated for that individual too. This avoids
// counting a general claim as "true" just because its antecedent is false for the
// individual in the stimulus (vacuous truth).
//
// Review status is honest: authored and machine-checked, but NOT yet reviewed by a
// qualified LSAT instructor. Do not mark 'approved' until a human review happens.

export const LESSON_NS = {
  id: 'lesson.formal.necessary_sufficient',
  skillId: 'formal.necessary_sufficient',
  version: '1.0.0',
  review: { status: 'in_review', machineChecked: true, reviewer: null, lastReviewed: null, knownLimitations: ['Single-variable propositional items only; quantifier-scope items live in the Quantifiers lesson (planned).'] },
  title: 'Necessary & Sufficient Conditions',
  estMinutes: 25,
  objective: 'By the end, you will be able to translate conditional language (if, only if, unless, without, requires, every, no) into a one-way rule, form its valid contrapositive, and reject converse and inverse errors.',
  why: 'Conditional rules appear throughout Logical Reasoning — in Must Be True, Sufficient and Necessary Assumption, Flaw, Parallel, and Principle questions. The same skill helps outside the test: "a degree is required for this job" does not mean "a degree gets you this job."',

  sections: [
    {
      id: 'core',
      title: 'One-way rules',
      body: [
        'A conditional statement links two conditions in ONE direction: "If A, then B."',
        'A is SUFFICIENT for B: knowing A happened is enough to know B happened.',
        'B is NECESSARY for A: A cannot happen without B. B is a requirement for A, not a guarantee of it.',
        'We write this as  A → B.  The arrow only points one way. A → B tells you nothing about what happens when A is false, and nothing about A when B is true.',
      ],
      diagram: 'A  →  B      (A is sufficient · B is necessary)',
    },
    {
      id: 'translate',
      title: 'Translating everyday language',
      body: [
        'Find the condition that guarantees (sufficient) and the condition that is required (necessary). The sufficient condition goes on the left of the arrow.',
      ],
      table: [
        ['If A, B  ·  When A, B  ·  Whenever A, B', 'A → B'],
        ['Every / All / Any A is B', 'A → B'],
        ['A only if B', 'A → B   (B is the requirement)'],
        ['Only B are A  ·  Only B can A', 'A → B'],
        ['A requires B  ·  B is necessary for A  ·  A must have B', 'A → B'],
        ['No A is B', 'A → not B'],
        ['A unless B  ·  A without B', 'not B → A   (equivalently: not A → B)'],
        ['Without B, not A', 'not B → not A   (equivalently: A → B)'],
      ],
      note: '"Only if" introduces the NECESSARY condition. "If" (alone) introduces the SUFFICIENT condition. "Unless" means "if not": negate the term after "unless" and make it sufficient.',
    },
    {
      id: 'contrapositive',
      title: 'The contrapositive — the only other valid form',
      body: [
        'Every conditional has exactly one equivalent restatement: flip the terms AND negate both.',
        'A → B   is equivalent to   not B → not A.',
        'If the requirement (B) is missing, the outcome (A) cannot have happened.',
      ],
      diagram: 'A → B   ≡   ¬B → ¬A',
    },
    {
      id: 'errors',
      title: 'Two tempting errors',
      body: [
        'CONVERSE (flip without negating): from A → B, concluding B → A. Also called affirming the consequent when applied to a fact: "B happened, so A happened."',
        'INVERSE (negate without flipping): from A → B, concluding not A → not B. Also called denying the antecedent: "A did not happen, so B did not happen."',
        'Both feel natural in everyday speech, and the LSAT builds wrong answers around them.',
      ],
    },
  ],

  workedExamples: [
    {
      id: 'we1',
      prompt: '"The museum will open the new wing only if the renovation is finished." The museum opened the new wing. What follows?',
      steps: [
        '"Only if" introduces the necessary condition: renovation finished.',
        'Rule: Opens → Finished.',
        'We are told the sufficient condition happened (the wing opened).',
        'So the necessary condition must have happened: the renovation is finished.',
      ],
      conclusion: 'Valid: the renovation is finished.',
    },
    {
      id: 'we2',
      prompt: '"Tickets will not be refunded unless the event is canceled." Tickets were refunded. What follows?',
      steps: [
        '"A unless B" → "if not B, then A". Here A = "not refunded", B = "canceled".',
        'Rule: not Canceled → not Refunded. Contrapositive: Refunded → Canceled.',
        'Tickets were refunded, so the event was canceled.',
        'Careful: the rule does NOT say a cancellation guarantees a refund. That would be the converse.',
      ],
      conclusion: 'Valid: the event was canceled.',
    },
  ],

  counterexample: {
    claim: '"If it rained, the street is wet. The street is wet. So it rained."',
    whyInvalid: 'A street-cleaning truck could have wet the street. Wet is necessary for rain here, not sufficient for it. This is the converse error.',
  },

  misconceptions: [
    { tag: 'converse', label: 'Reversing the arrow', fix: 'Ask: which condition is the requirement? The requirement stays on the right. Only the contrapositive flips — and it negates both sides.' },
    { tag: 'inverse', label: 'Negating without flipping', fix: 'Knowing the sufficient condition failed tells you nothing. Something else could still bring about the result.' },
    { tag: 'only_if_reversal', label: 'Treating "only if" like "if"', fix: '"Only if" marks the necessary condition. "A only if B" is A → B, not B → A.' },
    { tag: 'unless_misread', label: 'Reading "unless" as two-way', fix: '"A unless B" means "if not B, then A." It does not say what happens when B is true.' },
    { tag: 'chain_error', label: 'Linking rules backwards', fix: 'Chain arrows only head-to-tail: A → B and B → C give A → C. A → B and C → B give nothing about A and C.' },
  ],

  // ── Stage items ───────────────────────────────────────────────────────────
  // stage: 'learn' (checkpoint) | 'recognize' | 'apply' | 'challenge' (authored fallback) | 'mastery_check'
  items: [
    // Learn checkpoint
    {
      id: 'ns.l1', stage: 'orient', difficulty: 1,
      stimulus: '"Whenever the alarm sounds, the doors lock."',
      stem: 'Which condition is SUFFICIENT?',
      choices: { A: 'The alarm sounds.', B: 'The doors lock.', C: 'Both are sufficient for each other.', D: 'Neither; the sentence is not conditional.' },
      correct: 'A',
      formal: null, // classification item: verified by hand (see test "learn checkpoint")
      rationale: '"Whenever" introduces the sufficient condition: Alarm → Lock. The alarm sounding is enough to know the doors lock.',
      distractorRationales: {
        B: 'The doors locking is NECESSARY for the alarm sounding, not sufficient. The doors might lock for other reasons.',
        C: 'The sentence only goes one way. It says nothing about what happens when the doors lock.',
        D: '"Whenever" is a conditional indicator, just like "if."',
      },
      distractorTags: { B: 'converse', C: 'converse', D: 'conceptual' },
    },

    // Recognize — translation (mode: equivalent → exactly one choice is logically equivalent to the statement)
    {
      id: 'ns.r1', stage: 'recognize', difficulty: 1,
      stimulus: '"Every licensed pilot has passed a vision exam."',
      stem: 'Which statement means the same thing?',
      choices: {
        A: 'If someone has passed a vision exam, they are a licensed pilot.',
        B: 'If someone is a licensed pilot, they have passed a vision exam.',
        C: 'If someone is not a licensed pilot, they have not passed a vision exam.',
        D: 'Someone is a licensed pilot if and only if they have passed a vision exam.',
      },
      correct: 'B',
      formal: { mode: 'equivalent', premises: ['Pilot -> Vision'], choices: { A: 'Vision -> Pilot', B: 'Pilot -> Vision', C: '~Pilot -> ~Vision', D: 'Pilot <-> Vision' } },
      rationale: '"Every A is B" translates to A → B: Pilot → Vision.',
      distractorRationales: { A: 'Converse. Many people pass vision exams without being pilots.', C: 'Inverse. Non-pilots may also have passed vision exams.', D: 'Adds the converse, making the rule two-way.' },
      distractorTags: { A: 'converse', C: 'inverse', D: 'converse' },
    },
    {
      id: 'ns.r2', stage: 'recognize', difficulty: 1,
      stimulus: '"The council will approve the budget only if the audit is complete."',
      stem: 'Which diagram is correct?',
      choices: {
        A: 'Audit complete → Budget approved',
        B: 'Budget not approved → Audit not complete',
        C: 'Budget approved → Audit complete',
        D: 'Audit not complete → Budget approved',
      },
      correct: 'C',
      formal: { mode: 'equivalent', premises: ['Approve -> Audit'], choices: { A: 'Audit -> Approve', B: '~Approve -> ~Audit', C: 'Approve -> Audit', D: '~Audit -> Approve' } },
      rationale: '"Only if" introduces the necessary condition. A completed audit is required for approval: Approve → Audit.',
      distractorRationales: { A: 'Reverses the rule: treats "only if" like "if".', B: 'Inverse of the correct rule. A complete audit does not guarantee approval.', D: 'Contradicts the rule. Without the audit, approval cannot happen.' },
      distractorTags: { A: 'only_if_reversal', B: 'inverse', D: 'conceptual' },
    },
    {
      id: 'ns.r3', stage: 'recognize', difficulty: 2,
      stimulus: '"Tickets will not be refunded unless the event is canceled."',
      stem: 'Which statement means the same thing?',
      choices: {
        A: 'If the event is canceled, tickets will be refunded.',
        B: 'Tickets are refunded if and only if the event is canceled.',
        C: 'If tickets are not refunded, the event was not canceled.',
        D: 'If tickets are refunded, the event was canceled.',
      },
      correct: 'D',
      formal: { mode: 'equivalent', premises: ['~Canceled -> ~Refunded'], choices: { A: 'Canceled -> Refunded', B: 'Refunded <-> Canceled', C: '~Refunded -> ~Canceled', D: 'Refunded -> Canceled' } },
      rationale: '"Not refunded unless canceled" means "if not canceled, then not refunded." Its contrapositive is Refunded → Canceled.',
      distractorRationales: { A: 'Reads "unless" as a guarantee. Cancellation is required for a refund, not enough for one.', B: 'Makes the rule two-way, which "unless" does not do.', C: 'Converse of the original. Tickets could go unrefunded even if the event was canceled.' },
      distractorTags: { A: 'unless_misread', B: 'unless_misread', C: 'converse' },
    },
    {
      id: 'ns.r4', stage: 'recognize', difficulty: 1,
      stimulus: '"No one without a reservation will be seated."',
      stem: 'Which statement means the same thing?',
      choices: {
        A: 'If someone is seated, they had a reservation.',
        B: 'If someone has a reservation, they will be seated.',
        C: 'If someone is not seated, they had no reservation.',
        D: 'If someone is seated, they had no reservation.',
      },
      correct: 'A',
      formal: { mode: 'equivalent', premises: ['~Reservation -> ~Seated'], choices: { A: 'Seated -> Reservation', B: 'Reservation -> Seated', C: '~Seated -> ~Reservation', D: 'Seated -> ~Reservation' } },
      rationale: '"Without a reservation, not seated" is ¬Reservation → ¬Seated. Its contrapositive is Seated → Reservation.',
      distractorRationales: { B: 'A reservation is required, not a guarantee.', C: 'People with reservations could still go unseated.', D: 'Contradicts the rule.' },
      distractorTags: { B: 'converse', C: 'inverse', D: 'conceptual' },
    },
    {
      id: 'ns.r5', stage: 'recognize', difficulty: 2,
      stimulus: '"Only employees with badges may enter the lab."',
      stem: 'Which statement means the same thing?',
      choices: {
        A: 'Having a badge guarantees that an employee may enter the lab.',
        B: 'If an employee does not enter the lab, that employee lacks a badge.',
        C: 'An employee may enter the lab if and only if that employee has a badge.',
        D: 'Entering the lab requires having a badge.',
      },
      correct: 'D',
      formal: { mode: 'equivalent', premises: ['Enter -> Badge'], choices: { A: 'Badge -> Enter', B: '~Enter -> ~Badge', C: 'Enter <-> Badge', D: 'Enter -> Badge' } },
      rationale: '"Only B can A" means A → B. A badge is necessary for entry.',
      distractorRationales: { A: 'Treats the requirement as a guarantee (converse).', B: 'Inverse. Plenty of badge-holders never enter.', C: 'Adds the converse.' },
      distractorTags: { A: 'converse', B: 'inverse', C: 'converse' },
    },
    {
      id: 'ns.r6', stage: 'recognize', difficulty: 1,
      stimulus: '"Passing the bar exam is necessary for practicing law in this state."',
      stem: 'Which statement means the same thing?',
      choices: {
        A: 'If someone practices law in this state, they passed the bar exam.',
        B: 'If someone passed the bar exam, they practice law in this state.',
        C: 'If someone does not practice law in this state, they did not pass the bar exam.',
        D: 'Someone practices law in this state if and only if they passed the bar exam.',
      },
      correct: 'A',
      formal: { mode: 'equivalent', premises: ['Practice -> Bar'], choices: { A: 'Practice -> Bar', B: 'Bar -> Practice', C: '~Practice -> ~Bar', D: 'Practice <-> Bar' } },
      rationale: 'The necessary condition goes on the right: Practice → Bar.',
      distractorRationales: { B: 'Converse. Passing does not guarantee someone practices here.', C: 'Inverse. Many people who passed do not practice here.', D: 'Turns a requirement into a two-way rule.' },
      distractorTags: { B: 'converse', C: 'inverse', D: 'converse' },
    },

    // Apply — guided, with graduated hints (mode: must_be_true → exactly one choice is entailed)
    {
      id: 'ns.a1', stage: 'apply', difficulty: 1,
      stimulus: 'If a seedling receives too little light, it grows tall and thin. This seedling did not grow tall and thin.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'The seedling received too little light.',
        B: 'The seedling did not receive too little light.',
        C: 'The seedling received plenty of water.',
        D: 'Any seedling that grows tall and thin received too little light.',
        E: 'If a seedling receives enough light, it will not grow tall and thin.',
      },
      correct: 'B',
      formal: { mode: 'must_be_true', premises: ['LowLight -> Tall', '~Tall', 'LowLight_y -> Tall_y'], choices: { A: 'LowLight', B: '~LowLight', C: 'Water', D: 'Tall_y -> LowLight_y', E: '~LowLight_y -> ~Tall_y' } },
      hints: [
        'Diagram the rule first. Which condition is sufficient, and which is necessary?',
        'Rule: Too little light → Tall & thin. You are told the NECESSARY condition did not happen.',
        'Use the contrapositive: not tall & thin → not too little light.',
      ],
      rationale: 'Contrapositive: ¬Tall → ¬LowLight. The seedling was not tall and thin, so it did not receive too little light.',
      distractorRationales: { A: 'Contradicts the contrapositive.', C: 'Water is never mentioned; nothing supports it.', D: 'Converse of the rule. Other causes could make a seedling tall and thin.', E: 'Inverse of the rule. Enough light does not rule out other causes.' },
      distractorTags: { A: 'conceptual', C: 'out_of_scope', D: 'converse', E: 'inverse' },
    },
    {
      id: 'ns.a2', stage: 'apply', difficulty: 1,
      stimulus: 'The council will approve the transit plan only if the environmental review is finished. The council approved the transit plan.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'The environmental review caused the council to approve the plan.',
        B: 'Whenever an environmental review is finished, the council approves the plan under review.',
        C: 'The council will approve every future transit plan.',
        D: 'The environmental review is finished.',
        E: 'Any plan the council does not approve lacks a finished environmental review.',
      },
      correct: 'D',
      formal: { mode: 'must_be_true', premises: ['Approve -> Review', 'Approve', 'Approve_y -> Review_y'], choices: { A: 'ReviewCaused', B: 'Review_y -> Approve_y', C: 'FutureApprovals', D: 'Review', E: '~Approve_y -> ~Review_y' } },
      hints: [
        'What does "only if" introduce: the requirement or the guarantee?',
        'Rule: Approved → Review finished. Which side are you told happened?',
        'The sufficient condition happened, so the necessary condition must have happened.',
      ],
      rationale: 'Approve → Review, and the plan was approved, so the review is finished.',
      distractorRationales: { A: 'A requirement is not a cause. The rule says nothing about why the council approved.', B: 'Reverses "only if" into "if".', C: 'About future plans, which the rule does not cover.', E: 'Inverse-style reasoning. The review could have been finished even without approval.' },
      distractorTags: { A: 'unsupported', B: 'only_if_reversal', C: 'out_of_scope', E: 'inverse' },
    },
    {
      id: 'ns.a3', stage: 'apply', difficulty: 2,
      stimulus: 'Every member of the debate team is enrolled in the logic seminar. No one enrolled in the logic seminar takes the early chemistry lab. Priya takes the early chemistry lab.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'Priya is enrolled in the logic seminar.',
        B: 'Anyone who is not on the debate team takes the early chemistry lab.',
        C: 'Priya is not on the debate team.',
        D: 'Priya is on the debate team.',
        E: 'Anyone not enrolled in the logic seminar is on the debate team.',
      },
      correct: 'C',
      formal: { mode: 'must_be_true', premises: ['Debate -> Seminar', 'Seminar -> ~Lab', 'Lab', 'Debate_y -> Seminar_y', 'Seminar_y -> ~Lab_y'], choices: { A: 'Seminar', B: '~Debate_y -> Lab_y', C: '~Debate', D: 'Debate', E: '~Seminar_y -> Debate_y' } },
      hints: [
        'Write both rules as arrows, then try to chain them.',
        'Debate → Seminar → not Lab. So Debate → not Lab.',
        'Contrapositive of the chain: Lab → not Debate. Priya takes the lab.',
      ],
      rationale: 'Chain: Debate → Seminar → ¬Lab. Contrapositive: Lab → ¬Debate. Priya takes the lab, so she is not on the debate team.',
      distractorRationales: { A: 'The contrapositive of the second rule shows Priya is NOT in the seminar.', B: 'Inverse of the chain; nothing says non-members take the lab.', D: 'Contradicts the chain.', E: 'Reverses and negates incorrectly; unsupported.' },
      distractorTags: { A: 'chain_error', B: 'inverse', D: 'conceptual', E: 'chain_error' },
    },
    {
      id: 'ns.a4', stage: 'apply', difficulty: 2,
      stimulus: 'The festival will be held outdoors unless it rains. The festival was not held outdoors.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'It rained.',
        B: 'It did not rain.',
        C: 'It did not rain, but the festival was moved indoors anyway.',
        D: 'The festival was canceled.',
        E: 'At this festival, rain always keeps the event indoors.',
      },
      correct: 'A',
      formal: { mode: 'must_be_true', premises: ['~Rain -> Outdoors', '~Outdoors', '~Rain_y -> Outdoors_y'], choices: { A: 'Rain', B: '~Rain', C: '~Rain & ~Outdoors', D: 'Canceled', E: 'Rain_y -> ~Outdoors_y' } },
      hints: [
        '"A unless B" means "if not B, then A."',
        'Rule: no rain → outdoors. You are told it was not outdoors.',
        'Contrapositive: not outdoors → rain.',
      ],
      rationale: '"Outdoors unless rain": ¬Rain → Outdoors. Contrapositive: ¬Outdoors → Rain.',
      distractorRationales: { B: 'Contradicts the contrapositive.', C: 'If it had not rained, the rule says the festival would have been outdoors.', D: 'Nothing supports a cancellation; it may simply have moved indoors.', E: '"Unless" does not say what happens when it rains. Rain removes the guarantee of an outdoor event; it does not force an indoor one.' },
      distractorTags: { B: 'conceptual', C: 'conceptual', D: 'out_of_scope', E: 'unless_misread' },
    },

    // Challenge — authored fallback items (used when generation is unavailable or rejected)
    {
      id: 'ns.c1', stage: 'challenge', difficulty: 2,
      stimulus: 'Zoning official: A building permit for a structure in the river district will be issued only if the structure meets the flood code. Moreover, any structure that meets the flood code has a raised foundation. The proposed library annex, which would sit in the river district, does not have a raised foundation.',
      stem: 'If the zoning official’s statements are true, which one of the following must also be true?',
      choices: {
        A: 'A building permit for the library annex will not be issued.',
        B: 'The library annex will be built outside the river district.',
        C: 'Any river-district structure with a raised foundation will be issued a permit.',
        D: 'Any structure with a raised foundation meets the flood code.',
        E: 'The library annex meets the flood code but will not receive a permit.',
      },
      correct: 'A',
      formal: { mode: 'must_be_true', premises: ['Permit -> Code', 'Code -> Raised', '~Raised', 'Permit_y -> Code_y', 'Code_y -> Raised_y'], choices: { A: '~Permit', B: 'Outside', C: 'Raised_y -> Permit_y', D: 'Raised_y -> Code_y', E: 'Code & ~Permit' } },
      rationale: 'Permit → Code → Raised. No raised foundation, so (contrapositive) no flood-code compliance and no permit.',
      distractorRationales: { B: 'Nothing says the annex will be relocated.', C: 'Treats necessary conditions as sufficient.', D: 'Converse of the second rule.', E: 'The annex cannot meet the flood code without a raised foundation.' },
      distractorTags: { B: 'out_of_scope', C: 'converse', D: 'converse', E: 'chain_error' },
    },
    {
      id: 'ns.c2', stage: 'challenge', difficulty: 3,
      stimulus: 'Ecologist: The heron colony will return to the marsh this spring only if the marsh’s fish population recovers. The fish population will recover if the upstream dam releases water in March. But the dam will release water in March only if the drought ends.',
      stem: 'If the ecologist’s statements are true, which one of the following must also be true?',
      choices: {
        A: 'If the heron colony returns, the drought will have ended.',
        B: 'If the fish population recovers, the heron colony will return.',
        C: 'If the drought does not end, the dam will not release water in March.',
        D: 'If the drought ends, the fish population will recover.',
        E: 'If the dam does not release water in March, the fish population will not recover.',
      },
      correct: 'C',
      formal: { mode: 'must_be_true', premises: ['Return -> Fish', 'Dam -> Fish', 'Dam -> DroughtEnds'], choices: { A: 'Return -> DroughtEnds', B: 'Fish -> Return', C: '~DroughtEnds -> ~Dam', D: 'DroughtEnds -> Fish', E: '~Dam -> ~Fish' } },
      rationale: 'Dam → DroughtEnds, so its contrapositive ¬DroughtEnds → ¬Dam must be true.',
      distractorRationales: { A: 'Broken chain: the fish could recover without the dam, so a return does not require the drought to end.', B: 'Converse of the first rule.', D: 'Reverses the third rule and then chains it.', E: 'Inverse of the second rule; the fish could recover another way.' },
      distractorTags: { A: 'chain_error', B: 'converse', D: 'chain_error', E: 'inverse' },
    },
    {
      id: 'ns.c3', stage: 'challenge', difficulty: 2,
      stimulus: 'Mira will be named a fellowship finalist only if she submits a writing sample. If Mira is named a finalist, she will be interviewed. Mira will not receive the fellowship unless she is interviewed. Mira received the fellowship.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'Mira was named a finalist.',
        B: 'Mira submitted a writing sample.',
        C: 'If Mira had not been named a finalist, she would not have been interviewed.',
        D: 'Mira was not named a finalist.',
        E: 'Mira was interviewed.',
      },
      correct: 'E',
      formal: { mode: 'must_be_true', premises: ['Finalist -> Sample', 'Finalist -> Interview', '~Interview -> ~Fellow', 'Fellow'], choices: { A: 'Finalist', B: 'Sample', C: '~Finalist -> ~Interview', D: '~Finalist', E: 'Interview' } },
      rationale: '¬Interview → ¬Fellow; contrapositive Fellow → Interview. She received it, so she was interviewed.',
      distractorRationales: { A: 'Being interviewed does not require being a finalist (converse of rule 2).', B: 'Only follows if she was a finalist, which is not established.', C: 'Inverse of rule 2.', D: 'Nothing rules out that she was a finalist.' },
      distractorTags: { A: 'converse', B: 'chain_error', C: 'inverse', D: 'unsupported' },
    },
    {
      id: 'ns.c4', stage: 'challenge', difficulty: 2,
      stimulus: 'Library policy: Rare manuscripts may be photographed only by researchers who hold a reading-room card. No one may hold a reading-room card without first completing the handling workshop. Dmitri has not completed the handling workshop.',
      stem: 'If the policy is followed and the statements are true, which one of the following must also be true?',
      choices: {
        A: 'Dmitri holds a reading-room card.',
        B: 'Anyone who completes the handling workshop may photograph rare manuscripts.',
        C: 'Anyone who completes the handling workshop holds a reading-room card.',
        D: 'Dmitri may not photograph rare manuscripts.',
        E: 'Dmitri is not a researcher.',
      },
      correct: 'D',
      formal: { mode: 'must_be_true', premises: ['Photo -> Card', '~Workshop -> ~Card', '~Workshop', 'Photo_y -> Card_y', '~Workshop_y -> ~Card_y'], choices: { A: 'Card', B: 'Workshop_y -> Photo_y', C: 'Workshop_y -> Card_y', D: '~Photo', E: '~Researcher' } },
      rationale: 'No workshop → no card → (contrapositive of rule 1) no photographing.',
      distractorRationales: { A: 'Contradicts rule 2.', B: 'Treats a requirement as a guarantee.', C: 'Completing the workshop is necessary for a card, not sufficient.', E: 'He may be a researcher who simply lacks a card.' },
      distractorTags: { A: 'conceptual', B: 'converse', C: 'converse', E: 'unsupported' },
    },
    {
      id: 'ns.c5', stage: 'challenge', difficulty: 3,
      stimulus: 'If the software update is installed on a device, the device’s backup feature is disabled. The backup feature is never disabled on devices enrolled in the security program. The backup feature on Ana’s laptop is disabled.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'The software update is installed on Ana’s laptop.',
        B: 'Ana’s laptop is not enrolled in the security program.',
        C: 'The software update is not installed on Ana’s laptop.',
        D: 'If Ana’s laptop is not enrolled in the security program, the update is installed on it.',
        E: 'If the update were not installed on Ana’s laptop, its backup feature would be enabled.',
      },
      correct: 'B',
      formal: { mode: 'must_be_true', premises: ['Install -> Disabled', 'Enrolled -> ~Disabled', 'Disabled'], choices: { A: 'Install', B: '~Enrolled', C: '~Install', D: '~Enrolled -> Install', E: '~Install -> ~Disabled' } },
      rationale: 'Enrolled → ¬Disabled; contrapositive Disabled → ¬Enrolled.',
      distractorRationales: { A: 'Affirming the consequent: something else could have disabled the backup.', C: 'Nothing rules out the update.', D: 'Unsupported link between the two rules.', E: 'Inverse of rule 1.' },
      distractorTags: { A: 'converse', C: 'unsupported', D: 'chain_error', E: 'inverse' },
    },

    // Mastery check — independent, no hints
    {
      id: 'ns.m1', stage: 'mastery_check', difficulty: 2,
      stimulus: 'Any restaurant that earns a gold rating from the guide has passed every health inspection this year. Café Lune has not passed every health inspection this year.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'Café Lune earned a gold rating from the guide.',
        B: 'Every restaurant that passes all of its health inspections earns a gold rating.',
        C: 'Café Lune will fail next year’s inspections.',
        D: 'Café Lune did not earn a gold rating from the guide.',
        E: 'Café Lune earned a silver rating from the guide.',
      },
      correct: 'D',
      formal: { mode: 'must_be_true', premises: ['Gold -> Passed', '~Passed', 'Gold_y -> Passed_y'], choices: { A: 'Gold', B: 'Passed_y -> Gold_y', C: 'FailNextYear', D: '~Gold', E: 'Silver' } },
      rationale: 'Contrapositive: ¬Passed → ¬Gold.',
      distractorRationales: { A: 'Contradicts the contrapositive.', B: 'Converse.', C: 'About next year; unsupported.', E: 'No information about other ratings.' },
      distractorTags: { A: 'conceptual', B: 'converse', C: 'out_of_scope', E: 'out_of_scope' },
    },
    {
      id: 'ns.m2', stage: 'mastery_check', difficulty: 3,
      stimulus: 'The orchestra will tour Europe this summer unless its funding is cut. If the orchestra tours Europe, it will hire additional musicians. The orchestra will not hire additional musicians this summer.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'The orchestra will tour Europe this summer.',
        B: 'The orchestra’s funding was not cut.',
        C: 'The orchestra’s funding was cut.',
        D: 'The orchestra will hire musicians for a domestic tour instead.',
        E: 'The orchestra’s funding will be restored next year.',
      },
      correct: 'C',
      formal: { mode: 'must_be_true', premises: ['~Cut -> Tour', 'Tour -> Hire', '~Hire'], choices: { A: 'Tour', B: '~Cut', C: 'Cut', D: 'Domestic', E: 'Restored' } },
      rationale: '¬Hire → ¬Tour (contrapositive of rule 2), and ¬Tour → Cut (contrapositive of rule 1).',
      distractorRationales: { A: 'Contradicts rule 2’s contrapositive.', B: 'Contradicts the chain.', D: 'No domestic tour is mentioned.', E: 'About next year; unsupported.' },
      distractorTags: { A: 'conceptual', B: 'chain_error', D: 'out_of_scope', E: 'out_of_scope' },
    },
    {
      id: 'ns.m3', stage: 'mastery_check', difficulty: 2,
      stimulus: 'Only students who complete the statistics prerequisite may enroll in Econometrics. Every student who enrolls in Econometrics receives a computing-lab account. Jun has not completed the statistics prerequisite.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'Jun does not have a computing-lab account.',
        B: 'Jun is not enrolled in Econometrics.',
        C: 'Jun is enrolled in Econometrics.',
        D: 'Any student who completes the prerequisite enrolls in Econometrics.',
        E: 'Jun will complete the prerequisite next term.',
      },
      correct: 'B',
      formal: { mode: 'must_be_true', premises: ['Enroll -> Prereq', 'Enroll -> LabAccount', '~Prereq', 'Enroll_y -> Prereq_y'], choices: { A: '~LabAccount', B: '~Enroll', C: 'Enroll', D: 'Prereq_y -> Enroll_y', E: 'NextTerm' } },
      rationale: 'Contrapositive of rule 1: ¬Prereq → ¬Enroll.',
      distractorRationales: { A: 'Inverse of rule 2; Jun could have a lab account for another reason.', C: 'Contradicts rule 1.', D: 'Converse of rule 1.', E: 'Unsupported prediction.' },
      distractorTags: { A: 'inverse', C: 'conceptual', D: 'converse', E: 'out_of_scope' },
    },
    {
      id: 'ns.m4', stage: 'mastery_check', difficulty: 3,
      stimulus: 'If the bridge is closed, the ferry runs an extra route. The ferry runs an extra route only if the harbor is not iced over. The harbor is iced over.',
      stem: 'If the statements above are true, which one of the following must also be true?',
      choices: {
        A: 'The bridge is closed.',
        B: 'The ferry runs an extra route.',
        C: 'The ferry is out of service.',
        D: 'The bridge is not closed.',
        E: 'The bridge is under repair.',
      },
      correct: 'D',
      formal: { mode: 'must_be_true', premises: ['Closed -> Extra', 'Extra -> ~Iced', 'Iced'], choices: { A: 'Closed', B: 'Extra', C: 'OutOfService', D: '~Closed', E: 'Repair' } },
      rationale: 'Iced → ¬Extra → ¬Closed (contrapositives, chained).',
      distractorRationales: { A: 'Contradicts the chain.', B: 'Contradicts rule 2.', C: 'Not stated; the ferry may run its regular route.', E: 'Unsupported.' },
      distractorTags: { A: 'chain_error', B: 'conceptual', C: 'out_of_scope', E: 'out_of_scope' },
    },
  ],

  placementItemIds: ['ns.r3', 'ns.a3', 'ns.a4', 'ns.c2', 'ns.m2'],
  // Tag → smallest relevant lesson section (remediation link)
  tagToSection: {
    converse: 'errors', inverse: 'errors', only_if_reversal: 'translate', unless_misread: 'translate',
    chain_error: 'contrapositive', conceptual: 'core', out_of_scope: 'core', unsupported: 'core',
  },
};
