// Transfer & real-world logic: Statistics & Base Rates, Evaluating Claims in the Media (Curriculum v2.0 §11).
// Numbers in items are invented for teaching; arithmetic in rationales is checked by tests where noted.
import { item, REVIEW } from './helpers.js';

export const LESSON_STATS = {
  id: 'lesson.transfer.statistics', skillId: 'transfer.statistics', version: '2.0.0', review: REVIEW(false),
  title: 'Statistics & Base Rates', estMinutes: 25,
  objective: 'By the end, you will be able to separate percentages from numbers, account for base rates, and judge whether a sample can support a conclusion.',
  why: 'LSAT arguments often hinge on numerical sleights of hand — and so do news reports, ads, and medical claims.',
  sections: [
    { id: 'pct_vs_num', title: 'Percent vs. number', body: [
      'A larger percentage can be a smaller number if the base is smaller. A rising number can be a falling rate if the population grew faster.',
    ] },
    { id: 'base_rates', title: 'Base rates', body: [
      'Before judging a test or a pattern, ask how common the thing is to begin with. With a rare condition, even an accurate test yields many false positives.',
    ] },
    { id: 'samples', title: 'Samples', body: [
      'A sample supports a conclusion about a population only if it is representative: chosen so that it resembles the population in relevant ways. Size helps only if the sample is unbiased.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: 'A disease affects 1 in 1,000 people. A test catches every case but also flags 5% of healthy people. Someone tests positive.', steps: ['Out of 100,000 people: 100 sick, all flagged.', '99,900 healthy × 5% ≈ 4,995 false positives.', 'Chance a positive is real ≈ 100 / 5,095 ≈ 2%.'], conclusion: 'A positive result is still probably a false alarm.' },
  ],
  counterexample: { claim: '“Most accidents happen near home, so driving near home is most dangerous.”', whyInvalid: 'Most driving happens near home; the rate per mile may be lower.' },
  misconceptions: [
    { tag: 'percent_vs_number', label: 'Confusing percentages with numbers', fix: 'Ask: percent of what base?' },
    { tag: 'base_rate', label: 'Ignoring the base rate', fix: 'Start from how common the thing is.' },
    { tag: 'unrepresentative_sample', label: 'Trusting a biased sample', fix: 'Ask how the sample was chosen.' },
    { tag: 'too_strong', label: 'Overstating what numbers show', fix: 'Numbers rarely prove causes on their own.' },
  ],
  items: [
    item('sb.o1', 'orient', 1, '“Town A’s crime count rose from 100 to 110 crimes. Town B’s rose from 10 to 15.”', 'Which is true?', [
      ['Town B’s crime count rose by a larger percentage.', 'KEY', 'A: +10%; B: +50%.'],
      ['Town A’s crime count rose by a larger percentage.', 'percent_vs_number', 'A added more crimes but a smaller percentage.'],
      ['Town B has more crime.', 'percent_vs_number', 'Fewer crimes.'],
      ['Both rose by the same amount.', 'percent_vs_number', 'No.'],
    ]),
    item('sb.r1', 'recognize', 1, '“Ninety percent of car accidents involve drivers who drank coffee that day. So coffee causes accidents.”', 'What is the main problem?', [
      ['Most drivers drink coffee, so the figure may simply reflect how common coffee is.', 'KEY', 'Base rate.'],
      ['The percentage is too high.', 'too_strong', 'Not the issue.'],
      ['Coffee is a stimulant.', 'too_strong', 'Supports a mechanism; does not fix the base-rate problem.'],
      ['Accidents are rare.', 'base_rate', 'Not the relevant base.'],
    ]),
    item('sb.r2', 'recognize', 2, '“The number of cyclists injured in the city rose 20% over five years.”', 'Which information is most needed to judge whether cycling became more dangerous?', [
      ['How much the number of cyclists or miles cycled changed over the same period.', 'KEY', 'Need a rate, not a count.'],
      ['The color of the bike lanes.', 'too_strong', 'Irrelevant.'],
      ['The names of injured cyclists.', 'too_strong', 'Irrelevant.'],
      ['Whether cyclists like the city.', 'too_strong', 'Irrelevant.'],
    ]),
    item('sb.r3', 'recognize', 2, '“A survey of 50,000 readers of a fitness magazine found that most people exercise daily.”', 'What is the main problem?', [
      ['Fitness magazine readers are unlikely to represent people in general.', 'KEY', 'Size does not fix bias.'],
      ['50,000 is too small.', 'unrepresentative_sample', 'Size is not the issue.'],
      ['Surveys are always inaccurate.', 'too_strong', 'Too strong.'],
      ['Exercise is healthy.', 'too_strong', 'Irrelevant.'],
    ]),
    item('sb.a1', 'apply', 2, 'Analyst: Two years ago, only 40 percent of the company’s revenue came through its website. Last year, that share reached 60 percent. Clearly, the company sold more online last year than it did two years ago.', 'The analyst’s argument is flawed because it', [
      ['fails to consider that total sales may have fallen enough that online sales did not increase', 'KEY', 'A larger share of a smaller total can be a smaller number.'],
      ['relies on a biased sample', 'unrepresentative_sample', 'No sample.'],
      ['attacks the company’s critics', 'too_strong', 'No.'],
      ['confuses cause and effect', 'too_strong', 'No causal claim.'],
      ['uses a term in two senses', 'too_strong', 'No.'],
    ], { hints: ['Percent of what?'] }),
    item('sb.a2', 'apply', 3, 'A screening test for a rare disease correctly identifies 99 percent of people who have the disease and wrongly flags 2 percent of people who do not. The disease affects 1 in 10,000 people.', 'Which one of the following is most strongly supported?', [
      ['Most people who test positive do not have the disease.', 'KEY', 'Per 1,000,000: ~99 true positives vs ~19,998 false positives.'],
      ['A positive result means a 99 percent chance of disease.', 'base_rate', 'Ignores the base rate.'],
      ['The test is useless.', 'too_strong', 'It still catches nearly every true case.'],
      ['Two percent of people have the disease.', 'percent_vs_number', 'Confuses the false-positive rate with prevalence.'],
      ['The test misses most cases.', 'too_strong', 'It catches 99%.'],
    ]),
    item('sb.c1', 'challenge', 3, 'Health report: Hospital X has a higher death rate among heart-surgery patients than Hospital Y. So patients are more likely to survive heart surgery at Hospital Y.', 'Which one of the following, if true, most weakens the argument?', [
      ['Hospital X receives most of the region’s highest-risk heart patients, whom Hospital Y transfers to it.', 'KEY', 'Different patient mix; rates are not comparable.'],
      ['Hospital Y is newer.', 'too_strong', 'Irrelevant.'],
      ['Hospital X performs more surgeries.', 'percent_vs_number', 'Rates already account for volume.'],
      ['Heart surgery is risky.', 'too_strong', 'Irrelevant.'],
      ['Hospital Y has a larger parking lot.', 'too_strong', 'Irrelevant.'],
    ]),
    item('sb.c2', 'challenge', 3, 'Over the past decade, the number of people diagnosed with a certain allergy in the country has doubled, while the population grew by 10 percent.', 'Which one of the following is most strongly supported?', [
      ['The rate of diagnosis per person has increased.', 'KEY', 'Diagnoses ×2 vs population ×1.1.'],
      ['The allergy has become twice as common.', 'too_strong', 'Diagnosis could reflect detection.'],
      ['The allergy is caused by population growth.', 'too_strong', 'Not supported.'],
      ['Most people have the allergy.', 'too_strong', 'Not supported.'],
      ['The rate of diagnosis has fallen.', 'percent_vs_number', 'Contradicted.'],
    ]),
    item('sb.m1', 'mastery_check', 2, '“Most drowning victims knew how to swim. So swimming lessons do not prevent drowning.”', 'The reasoning is flawed because it', [
      ['ignores how common swimmers are among people who spend time in water', 'KEY', 'Base rate: most people in water can swim.'],
      ['relies on an expert', 'too_strong', 'No.'],
      ['uses circular reasoning', 'too_strong', 'No.'],
      ['generalizes from one case', 'unrepresentative_sample', 'Not one case.'],
      ['confuses percent with number', 'percent_vs_number', 'Not the main issue.'],
    ]),
    item('sb.m2', 'mastery_check', 3, 'Mayor: Last year, our city recorded 500 traffic injuries, while the neighboring town recorded only 50. So our streets are far more dangerous.', 'Which one of the following would be most useful to know in evaluating the mayor’s claim?', [
      ['The number of residents or miles driven in each place', 'KEY', 'Need rates.'],
      ['The mayor’s party', 'too_strong', 'Irrelevant.'],
      ['The color of street signs', 'too_strong', 'Irrelevant.'],
      ['The town’s founding date', 'too_strong', 'Irrelevant.'],
      ['Whether injuries are reported', 'percent_vs_number', 'Relevant but secondary.'],
    ]),
    item('sb.m3', 'mastery_check', 3, 'Advertisement: “Four out of five dentists surveyed recommend Brightsmile toothpaste.”', 'Which one of the following, if true, most undermines the advertisement’s implication?', [
      ['The survey included only five dentists, all paid consultants for Brightsmile.', 'KEY', 'A tiny, biased sample.'],
      ['Brightsmile is affordable.', 'too_strong', 'Irrelevant.'],
      ['Dentists recommend brushing twice daily.', 'too_strong', 'Irrelevant.'],
      ['Some dentists recommend other brands too.', 'percent_vs_number', 'Weak.'],
      ['Brightsmile is popular.', 'too_strong', 'Irrelevant.'],
    ]),
  ],
  placementItemIds: ['sb.r2', 'sb.a1', 'sb.a2', 'sb.c1', 'sb.m2'],
  tagToSection: { percent_vs_number: 'pct_vs_num', base_rate: 'base_rates', unrepresentative_sample: 'samples', too_strong: 'samples' },
};

export const LESSON_MEDIA = {
  id: 'lesson.transfer.media', skillId: 'transfer.media', version: '2.0.0', review: REVIEW(false),
  title: 'Evaluating Claims in the Media', estMinutes: 20,
  objective: 'By the end, you will be able to apply LSAT reasoning — gap-finding, causal and statistical scrutiny, source evaluation — to headlines, ads, and reports.',
  why: 'The habits you build for the LSAT are the habits of a careful reader of news. Transfer also strengthens the skills themselves.',
  sections: [
    { id: 'headline', title: 'Headline vs. finding', body: [
      'Headlines often turn “associated with” into “causes,” and “in mice” into “in people.” Find the underlying finding.',
    ] },
    { id: 'source', title: 'Source and incentive', body: [
      'Ask who produced the claim and whether they benefit from it. Incentive does not prove a claim false — it is a reason to check the evidence.',
    ] },
    { id: 'tools', title: 'Bring your LSAT tools', body: [
      'Find the conclusion. Find the gap. Check causal alternatives, samples, base rates, and scope.',
    ] },
  ],
  workedExamples: [
    { id: 'we1', prompt: 'Headline: “Chocolate Makes You Smarter.” Study: countries with higher chocolate consumption have more Nobel laureates per capita.', steps: ['Finding: a country-level correlation.', 'Alternatives: wealth drives both.', 'Scope: countries, not individuals.'], conclusion: 'The headline overstates a correlation into an individual causal claim.' },
  ],
  counterexample: { claim: '“A claim from a biased source is false.”', whyInvalid: 'That is an ad hominem; bias calls for checking, not dismissal.' },
  misconceptions: [
    { tag: 'correlation_causation', label: 'Accepting a causal headline from correlational data', fix: 'Find the study design.' },
    { tag: 'scope_shift', label: 'Missing a shift in scope (mice → people, group → individual)', fix: 'Compare the finding’s scope with the headline’s.' },
    { tag: 'ad_hominem', label: 'Dismissing a claim because of its source', fix: 'Check evidence; incentive is a caution, not a refutation.' },
    { tag: 'unrepresentative_sample', label: 'Trusting a biased sample', fix: 'Ask who was studied.' },
  ],
  items: [
    item('md.o1', 'orient', 1, 'Headline: “Coffee Drinkers Live Longer.” Report: in a survey, coffee drinkers lived longer on average.', 'What is the most important question?', [
      ['Do coffee drinkers differ from non-drinkers in other ways that affect lifespan?', 'KEY', 'Confounders.'],
      ['What brand of coffee?', 'correlation_causation', 'Irrelevant.'],
      ['Is the reporter a coffee drinker?', 'ad_hominem', 'Irrelevant.'],
      ['How tall were the drinkers?', 'correlation_causation', 'Irrelevant.'],
    ]),
    item('md.r1', 'recognize', 1, 'Headline: “New Drug Cures Cancer.” Study: the drug shrank tumors in mice.', 'What is the main problem with the headline?', [
      ['It shifts from a finding in mice to a claim about people, and from shrinking to curing.', 'KEY', 'Scope shift twice.'],
      ['Mice are small.', 'scope_shift', 'Not the point.'],
      ['The drug is new.', 'correlation_causation', 'Irrelevant.'],
      ['The study was published.', 'ad_hominem', 'Irrelevant.'],
    ]),
    item('md.r2', 'recognize', 2, 'An ad from a mattress company claims its mattress improves sleep, citing a study the company funded.', 'What is the most reasonable response?', [
      ['Check the study’s design and results; funding is a reason for scrutiny, not dismissal.', 'KEY', 'Incentive → caution.'],
      ['Reject the claim because the company funded it.', 'ad_hominem', 'Source bias alone does not refute.'],
      ['Accept the claim because it cites a study.', 'unrepresentative_sample', 'Citation alone is not evidence of quality.'],
      ['Ignore the ad.', 'ad_hominem', 'Not a response to the claim.'],
    ]),
    item('md.r3', 'recognize', 2, 'A news site’s online poll found that 70% of respondents distrust the new policy.', 'What limits the conclusion that most citizens distrust the policy?', [
      ['Online poll respondents choose themselves and may not represent citizens.', 'KEY', 'Self-selected sample.'],
      ['70% is a large number.', 'scope_shift', 'Not the issue.'],
      ['Policies are complex.', 'correlation_causation', 'Irrelevant.'],
      ['The site is popular.', 'unrepresentative_sample', 'Popularity does not fix self-selection.'],
    ]),
    item('md.a1', 'apply', 2, 'Magazine article: A national survey asked teenagers how many hours a day they spend on social media and how anxious they feel. Heavy users reported the most anxiety. The article’s headline: “Social Media Is Making Teens Anxious.”', 'Which one of the following, if true, most weakens the article’s conclusion?', [
      ['Anxious teenagers tend to turn to social media more as a way of coping.', 'KEY', 'Reverse causation.'],
      ['Social media use is common.', 'correlation_causation', 'Irrelevant.'],
      ['Some apps are designed to be engaging.', 'correlation_causation', 'Supports a mechanism.'],
      ['The article was widely shared.', 'ad_hominem', 'Irrelevant.'],
      ['Teenagers sleep less than adults.', 'correlation_causation', 'Irrelevant without a link.'],
    ]),
    item('md.a2', 'apply', 3, 'Press release: “Our city is the safest in the state: it had the fewest violent crimes last year.”', 'Which one of the following identifies the most serious problem with the press release’s reasoning?', [
      ['It does not consider that the city may have a small population, so its crime rate could still be high.', 'KEY', 'Number vs. rate.'],
      ['It attacks other cities.', 'ad_hominem', 'No attack.'],
      ['It relies on a famous expert.', 'ad_hominem', 'No expert.'],
      ['It reverses a conditional.', 'scope_shift', 'No conditional.'],
      ['It uses an online poll.', 'unrepresentative_sample', 'No poll.'],
    ]),
    item('md.c1', 'challenge', 3, 'Headline: “Eating Breakfast Linked to Higher Grades — Schools Should Serve It.” Study: students who reported eating breakfast had higher grades.', 'Which one of the following most accurately identifies a gap between the study and the headline?', [
      ['A reported association does not establish that serving breakfast would raise grades.', 'KEY', 'Correlation → policy recommendation.'],
      ['Students might like breakfast.', 'correlation_causation', 'Irrelevant.'],
      ['The headline is too long.', 'ad_hominem', 'Irrelevant.'],
      ['Grades are subjective.', 'scope_shift', 'Not the main gap.'],
      ['Schools already serve lunch.', 'correlation_causation', 'Irrelevant.'],
    ]),
    item('md.c2', 'challenge', 3, 'Commentator: “The study claiming the new bridge is safe was conducted by engineers employed by the construction company. So the bridge is unsafe.”', 'The commentator’s reasoning is flawed because it', [
      ['concludes a claim is false merely because of who made it', 'KEY', 'Ad hominem / genetic fallacy.'],
      ['relies on a small sample', 'unrepresentative_sample', 'No sample.'],
      ['confuses correlation and causation', 'correlation_causation', 'No correlation.'],
      ['shifts from mice to people', 'scope_shift', 'No.'],
      ['uses statistics misleadingly', 'unrepresentative_sample', 'No statistics.'],
    ]),
    item('md.m1', 'mastery_check', 2, 'Ad: “People who use our vitamins report feeling more energetic.”', 'Which question would best test the ad’s implied claim that the vitamins increase energy?', [
      ['Did people given an identical-looking placebo report similar gains?', 'KEY', 'Placebo comparison.'],
      ['What color are the pills?', 'correlation_causation', 'Irrelevant.'],
      ['Is the company profitable?', 'ad_hominem', 'Irrelevant.'],
      ['Do people like vitamins?', 'correlation_causation', 'Irrelevant.'],
      ['How many pills are in a bottle?', 'correlation_causation', 'Irrelevant.'],
    ]),
    item('md.m2', 'mastery_check', 3, 'Headline: “Study: City Dwellers Are Happier.” Study: residents of three large cities reported higher happiness than residents of three rural counties.', 'Which one of the following most weakens the headline’s general claim?', [
      ['The three cities were chosen because they topped a national livability ranking.', 'KEY', 'Unrepresentative cities.'],
      ['Cities have more restaurants.', 'correlation_causation', 'Supports a mechanism.'],
      ['Happiness surveys are common.', 'correlation_causation', 'Irrelevant.'],
      ['The study was reported widely.', 'ad_hominem', 'Irrelevant.'],
      ['Rural counties are large.', 'scope_shift', 'Irrelevant.'],
    ]),
    item('md.m3', 'mastery_check', 3, 'Report: “Since the city installed cameras, reported thefts have fallen 30 percent. Cameras work.”', 'Which one of the following, if true, most weakens the report’s conclusion?', [
      ['Reported thefts fell by a similar amount in neighboring cities without cameras.', 'KEY', 'Comparison suggests another cause.'],
      ['Cameras are expensive.', 'correlation_causation', 'Irrelevant.'],
      ['Residents support cameras.', 'ad_hominem', 'Irrelevant.'],
      ['Thefts are a concern.', 'correlation_causation', 'Irrelevant.'],
      ['Cameras record video.', 'correlation_causation', 'Irrelevant.'],
    ]),
  ],
  placementItemIds: ['md.r2', 'md.a1', 'md.a2', 'md.c1', 'md.m2'],
  tagToSection: { correlation_causation: 'headline', scope_shift: 'headline', ad_hominem: 'source', unrepresentative_sample: 'tools' },
};
