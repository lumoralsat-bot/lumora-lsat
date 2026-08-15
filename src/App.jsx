import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SECTIONS = ["Logical Reasoning","Reading Comprehension"];
const QUESTION_TYPES = {
  "Logical Reasoning":["Assumption","Weaken","Strengthen","Flaw","Inference","Main Point","Paradox","Method of Reasoning","Parallel Reasoning","Evaluate"],
  "Reading Comprehension":["Main Idea","Author's Tone","Detail","Inference","Purpose","Analogy","Comparative Passage"],
};
const LEVEL_LABELS = {1:"Foundations",2:"Developing",3:"Proficient",4:"Expert"};
const LEVEL_COLORS = {1:"#38bdf8",2:"#a78bfa",3:"#fb923c",4:"#f43f5e"};
const XP_PER_CORRECT = {1:10,2:20,3:35,4:55};
const XP_PER_LEVEL = 300;
const SECTION_TIME = 35*60;
const SECTION_Q_COUNT = 25;

const DIAGNOSTIC_QUESTIONS = [
  {id:"experience",q:"How long have you been studying for the LSAT?",type:"single",options:["Haven't started yet","Less than 1 month","1–3 months","3–6 months","6+ months"]},
  {id:"target_score",q:"What is your target LSAT score?",type:"single",options:["140–149","150–154","155–159","160–164","165–170","171–180"]},
  {id:"test_date",q:"When are you planning to take the LSAT?",type:"single",options:["Less than 1 month","1–2 months","3–4 months","5–6 months","6+ months","Not sure yet"]},
  {id:"lr_comfort",q:"Logical Reasoning comfort level? (1=none, 5=strong)",type:"scale"},
  {id:"rc_comfort",q:"Reading Comprehension comfort level? (1=none, 5=strong)",type:"scale"},
  {id:"writing_comfort",q:"Argumentative writing comfort level? (1=none, 5=strong)",type:"scale"},
  {id:"weak_types",q:"Which question types do you find hardest? (Select all)",type:"multi",options:["Assumption","Flaw","Weaken/Strengthen","Parallel Reasoning","Reading Inference","Main Point","Argumentative Writing","Not sure yet"]},
  {id:"study_hours",q:"How many hours per week can you dedicate to LSAT prep?",type:"single",options:["Less than 5 hrs","5–10 hrs","10–15 hrs","15–20 hrs","20+ hrs"]},
  {id:"biggest_challenge",q:"What's your biggest challenge right now?",type:"single",options:["Time pressure during sections","Understanding question types","Writing coherent arguments","Reading dense passages","Careless mistakes","Staying motivated"]},
  {id:"learning_style",q:"How do you learn best?",type:"single",options:["Step-by-step explanations","Learning from mistakes","Lots of practice questions","Understanding the big picture first","A mix of everything"]},
];

// ─── BADGES ───────────────────────────────────────────────────────────────────
const BADGES = [
  {id:"first_q",icon:"🎯",name:"First Shot",desc:"Answer your first question",check:(h,s)=>h.length>=1},
  {id:"ten_q",icon:"🔟",name:"Getting Started",desc:"Answer 10 questions",check:(h,s)=>h.length>=10},
  {id:"fifty_q",icon:"🏅",name:"Committed",desc:"Answer 50 questions",check:(h,s)=>h.length>=50},
  {id:"hundred_q",icon:"💯",name:"Century",desc:"Answer 100 questions",check:(h,s)=>h.length>=100},
  {id:"streak_3",icon:"🔥",name:"On Fire",desc:"3-day study streak",check:(h,s)=>(s?.streak||0)>=3},
  {id:"streak_7",icon:"⚡",name:"Lightning Week",desc:"7-day study streak",check:(h,s)=>(s?.streak||0)>=7},
  {id:"streak_30",icon:"🌟",name:"LSAT Warrior",desc:"30-day study streak",check:(h,s)=>(s?.streak||0)>=30},
  {id:"perfect_l4",icon:"💎",name:"Diamond Level",desc:"Get a Level 4 question correct",check:(h,s)=>h.some(q=>q.level===4&&q.correct)},
  {id:"accuracy_80",icon:"🎖",name:"Sharp Mind",desc:"Maintain 80%+ accuracy over 20+ questions",check:(h,s)=>h.length>=20&&Math.round(h.filter(q=>q.correct).length/h.length*100)>=80},
  {id:"all_lr",icon:"⚖",name:"LR Master",desc:"Answer all 10 LR question types",check:(h,s)=>{const t=new Set(h.filter(q=>q.section==="Logical Reasoning").map(q=>q.qType));return t.size>=10;}},
  {id:"all_rc",icon:"📚",name:"RC Scholar",desc:"Answer all 7 RC question types",check:(h,s)=>{const t=new Set(h.filter(q=>q.section==="Reading Comprehension").map(q=>q.qType));return t.size>=7;}},
  {id:"xp_500",icon:"🏆",name:"XP Hunter",desc:"Earn 500 total XP",check:(h,s)=>(s?.xp||0)>=500},
  {id:"xp_2000",icon:"👑",name:"XP Royalty",desc:"Earn 2000 total XP",check:(h,s)=>(s?.xp||0)>=2000},
  {id:"flaw_lab",icon:"🔍",name:"Flaw Finder",desc:"Complete your first Flaw Lab",check:(h,s)=>(s?.flawLabCount||0)>=1},
  {id:"full_section",icon:"⏱",name:"Endurance",desc:"Complete a Full Section",check:(h,s)=>(s?.fullSectionCount||0)>=1},
  {id:"daily_7",icon:"📅",name:"Daily Devotion",desc:"Complete 7 Daily Challenges",check:(h,s)=>(s?.dailyChallengesCompleted||0)>=7},
];

function checkBadges(history,stats,earnedBadges=[]){
  return BADGES.filter(b=>!earnedBadges.includes(b.id)&&b.check(history,stats)).map(b=>b.id);
}

// ─── DB ───────────────────────────────────────────────────────────────────────
const DB={
  getUsers:()=>{try{return JSON.parse(localStorage.getItem("lumora_users")||"{}")}catch{return{}}},
  saveUsers:(u)=>{try{localStorage.setItem("lumora_users",JSON.stringify(u))}catch{}},
  getSession:()=>{try{return localStorage.getItem("lumora_session")||null}catch{return null}},
  saveSession:(e)=>{try{localStorage.setItem("lumora_session",e)}catch{}},
  clearSession:()=>{try{localStorage.removeItem("lumora_session")}catch{}},
  getUser:(e)=>{const u=DB.getUsers();return u[e]||null},
  saveUser:(e,d)=>{const u=DB.getUsers();u[e]=d;DB.saveUsers(u)},
  getDailyChallenge:()=>{try{return JSON.parse(localStorage.getItem("lumora_daily")||"null")}catch{return null}},
  saveDailyChallenge:(d)=>{try{localStorage.setItem("lumora_daily",JSON.stringify(d))}catch{}},
  getScoreHistory:(email)=>{try{const k="lumora_scores_"+email;return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}},
  saveScoreHistory:(email,h)=>{try{const k="lumora_scores_"+email;localStorage.setItem(k,JSON.stringify(h.slice(-60)))}catch{}},
  getMistakes:(email)=>{try{const k="lumora_mistakes_"+email;return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}},
  saveMistakes:(email,m)=>{try{const k="lumora_mistakes_"+email;localStorage.setItem(k,JSON.stringify(m.slice(-200)))}catch{}},
  getSRS:(email)=>{try{const k="lumora_srs_"+email;return JSON.parse(localStorage.getItem(k)||"{}")}catch{return{}}},
  saveSRS:(email,s)=>{try{const k="lumora_srs_"+email;localStorage.setItem(k,JSON.stringify(s))}catch{}},
};

// ─── SRS ENGINE (SM-2 simplified) ─────────────────────────────────────────────
// For each question type, track interval and ease factor
// Due date is stored as a timestamp
function srsUpdate(srsData, qType, correct){
  const now=Date.now();
  const entry=srsData[qType]||{interval:1,ease:2.5,due:now,reps:0};
  if(correct){
    const newReps=entry.reps+1;
    const newEase=Math.max(1.3,entry.ease+(0.1-(1-0.5)*0.08));
    const newInterval=newReps===1?1:newReps===2?6:Math.round(entry.interval*newEase);
    return{...entry,interval:newInterval,ease:newEase,reps:newReps,due:now+newInterval*86400000};
  }else{
    return{...entry,interval:1,ease:Math.max(1.3,entry.ease-0.2),reps:0,due:now+86400000};
  }
}
function srsDueTypes(srsData){
  const now=Date.now();
  return Object.entries(srsData).filter(([,v])=>v.due<=now).map(([k])=>k);
}

// ─── API ──────────────────────────────────────────────────────────────────────
let API_KEY="";
try{API_KEY=import.meta.env.VITE_ANTHROPIC_API_KEY||"";}catch{API_KEY="";}

async function callClaude(system,userMsg,maxTokens=1200){
  if(!API_KEY)throw new Error("No API key configured. Add VITE_ANTHROPIC_API_KEY in Vercel environment variables.");
  const messages=[{role:"user",content:userMsg}];
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:maxTokens,system,messages}),
  });
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||"API error "+res.status);}
  const data=await res.json();
  const text=data.content?.map(i=>i.text||"").join("").trim();
  if(!text)throw new Error("Empty response from API");
  // When we prefilled "{", prepend it back so parseJSON gets valid JSON
  return text;
}

function parseJSON(raw){
  const BT=String.fromCharCode(96);
  let clean=raw.trim();
  // Strip markdown fences
  const fence3=BT+BT+BT;
  if(clean.startsWith(fence3+"json"))clean=clean.slice(7);
  else if(clean.startsWith(fence3))clean=clean.slice(3);
  if(clean.endsWith(fence3))clean=clean.slice(0,-3);
  clean=clean.trim();
  // If response doesn't start with { find the first { and try from there
  if(!clean.startsWith("{")){
    const idx=clean.indexOf("{");
    if(idx!==-1)clean=clean.slice(idx);
  }
  // Trim any trailing content after the last }
  const lastBrace=clean.lastIndexOf("}");
  if(lastBrace!==-1)clean=clean.slice(0,lastBrace+1);
  return JSON.parse(clean);
}
// ─── LEARN CURRICULUM (Comprehensive Interactive Textbook) ────────────────────
const LEARN_CURRICULUM = {
  "Logical Reasoning": [
    {
      type: "Assumption",
      tagline: "Find the hidden link the argument cannot survive without.",
      why: "Assumption questions are the single most common LR question type. Mastering assumptions makes every other LR type easier because ALL arguments depend on unstated assumptions.",
      sections: [
        {
          title: "What Is an Assumption?",
          content: `Every LSAT argument has three parts:

1. EVIDENCE — the facts or premises the author offers
2. CONCLUSION — what the author is trying to prove  
3. THE GAP — the logical space between them

An ASSUMPTION is the unstated belief that BRIDGES the gap. The author never says it out loud, but they MUST believe it for their argument to work.

Think of it like a bridge: the evidence is on one side, the conclusion is on the other, and the assumption is the bridge connecting them. Remove the bridge and the argument collapses.

Example:
Evidence: "Maria studied for 10 hours yesterday."
Conclusion: "Maria will do well on today's test."
Gap: What's missing? The author assumes studying leads to good test performance — and that 10 hours is enough.

The assumption: "Studying for 10 hours is sufficient preparation for this test."`,
        },
        {
          title: "How to Spot the Assumption",
          content: `Follow this 4-step process on every Assumption question:

STEP 1 — FIND THE CONCLUSION
Look for conclusion indicator words: therefore, thus, so, hence, consequently, it follows that, this shows that, clearly, must be.
Ask yourself: "What is this person ultimately trying to PROVE?"

STEP 2 — FIND THE EVIDENCE  
Look for evidence indicator words: because, since, given that, as, for the reason that.
Ask yourself: "What REASONS does the author give?"

STEP 3 — FIND THE GAP
Compare the evidence to the conclusion. Ask: "What has to be true that the author never stated but clearly believes?"
Look for:
• New concepts in the conclusion not mentioned in the evidence
• A leap from one type of thing to another (e.g., from "popular" to "good")
• A causal connection assumed without proof

STEP 4 — THE NEGATION TEST
This is your secret weapon. Take each answer choice and NEGATE it (make it false). If negating the answer DESTROYS the argument — makes the conclusion impossible — that's your assumption. If negating it doesn't hurt the argument, eliminate it.`,
        },
        {
          title: "Common Assumption Patterns",
          content: `Learn to recognize these recurring patterns:

PATTERN 1 — NEW CONCEPT IN CONCLUSION
The conclusion introduces a term not in the evidence.
"This medication reduces inflammation. Therefore, it will cure arthritis."
The assumption: Inflammation causes arthritis (connects the two concepts).

PATTERN 2 — SAMPLING ASSUMPTION  
The argument generalizes from a sample to a larger group.
"Everyone I know prefers coffee to tea. Therefore, most people prefer coffee."
The assumption: The people you know are representative of most people.

PATTERN 3 — CAUSAL ASSUMPTION
The argument assumes one thing causes another.
"Students who eat breakfast score higher on tests. Schools should require breakfast."
The assumption: Eating breakfast is what CAUSES the higher scores (not some other factor).

PATTERN 4 — COMPARISON ASSUMPTION
The argument treats two different things as equivalent.
"This drug worked in lab mice. It will work in humans."
The assumption: Mice and humans respond similarly to this drug.

PATTERN 5 — NO ALTERNATIVE ASSUMPTION
The argument assumes there's no other explanation.
"Crime rose after the new mayor took office. The mayor's policies caused the crime increase."
The assumption: Nothing else could explain the crime increase.`,
        },
        {
          title: "What to Avoid",
          content: `TRAP 1 — GOING TOO FAR
Wrong answers often make claims stronger than the argument needs. The assumption must be the MINIMUM needed — not a bold new claim.

TRAP 2 — IRRELEVANT ANSWERS
Many wrong answers are true statements that simply don't connect to the gap you identified. Always ask: "Does this answer fill the specific gap between THIS evidence and THIS conclusion?"

TRAP 3 — RESTATING THE EVIDENCE OR CONCLUSION
The assumption is the BRIDGE, not a restatement of what's already said.

TRAP 4 — NEGATION TEST MISTAKE
When you negate, you're making the answer FALSE. Don't confuse "negate" with "contradict." Negating "all birds fly" gives you "not all birds fly" — not "no birds fly."

THE GOLDEN RULE: The correct assumption, when added to the evidence, makes the conclusion follow logically. It fills the gap — nothing more, nothing less.`,
        },
      ],
      levels: [
        {level:1,desc:"Simple, everyday arguments with obvious gaps"},
        {level:2,desc:"Two-step reasoning with less obvious assumptions"},
        {level:3,desc:"LSAT-style arguments with subtle gaps"},
        {level:4,desc:"Full test difficulty — complex, multi-layered assumptions"},
      ]
    },
    {
      type: "Weaken",
      tagline: "Find the answer that most damages the argument's reasoning.",
      why: "Weaken questions are the second most common LR type. They test your ability to attack arguments — a skill you'll use constantly in law school and legal practice.",
      sections: [
        {
          title: "What Does It Mean to Weaken?",
          content: `To weaken an argument is to make its conclusion LESS LIKELY to be true — not impossible, just less supported.

Important: You are NOT proving the conclusion false. You're introducing information that damages the reasoning. Think of it as finding a crack in the argument's foundation.

The key insight: Every argument has an assumption (a gap in the reasoning). To weaken an argument, ATTACK that assumption.

Example:
Argument: "Studies show people who eat more vegetables live longer. Therefore, eating vegetables causes longer life."
Assumption: Nothing else explains the correlation.
Weaken: "People who eat more vegetables also tend to exercise more, sleep better, and smoke less."
Why this weakens: It suggests vegetables aren't the cause — other healthy habits might explain the longer lifespans.`,
        },
        {
          title: "The Weakening Process",
          content: `STEP 1 — IDENTIFY THE CONCLUSION
What is the author trying to prove? This is your target.

STEP 2 — IDENTIFY THE ASSUMPTION (THE GAP)
What does the argument silently depend on? What must be true for it to hold?

STEP 3 — ATTACK THE ASSUMPTION
Look for an answer that makes the assumption FALSE or QUESTIONABLE.

Common attack strategies:
• Provide an ALTERNATIVE EXPLANATION (undermines causal arguments)
• Show the SAMPLE IS UNREPRESENTATIVE (undermines generalizations)  
• Reveal a COUNTEREXAMPLE (shows the conclusion doesn't always hold)
• Show a RELEVANT DIFFERENCE between things being compared
• Introduce NEW INFORMATION that makes the conclusion less likely

STEP 4 — APPLY THE WEAKENING TEST
Ask: "If this answer is true, does the conclusion become harder to believe?"
If yes → potential correct answer
If no → eliminate`,
        },
        {
          title: "Weaken vs. Destroy",
          content: `A critical distinction: you're weakening, not destroying.

CORRECT weaken answer: Makes the conclusion less likely — but the argument could still be true.

INCORRECT approach: Looking for an answer that proves the conclusion is definitely false.

Example:
Argument: "Our new product will increase sales by 20%."
Good Weaken: "Consumer surveys show declining interest in this product category." (Reduces likelihood — but sales could still rise)
Too Strong: "No one will ever buy this product." (Destroys it — but LSAT correct answers don't go this far)

Also watch out for IRRELEVANT INFORMATION. An answer that introduces a true fact unrelated to the argument's gap does nothing to weaken it.

STRENGTHEN vs. WEAKEN: Many wrong answer choices do the OPPOSITE — they strengthen the argument. Always check: "Am I making the conclusion more or less believable?"`,
        },
        {
          title: "Common Weaken Patterns",
          content: `PATTERN 1 — ALTERNATIVE CAUSE
Causal argument: "X causes Y"  
Weaken by: Showing something else could cause Y

PATTERN 2 — UNREPRESENTATIVE SAMPLE
Statistical argument: "Most X are Y"
Weaken by: Showing the sample wasn't representative

PATTERN 3 — RELEVANT DIFFERENCE
Analogy argument: "X worked for A, so it will work for B"
Weaken by: Showing A and B differ in an important way

PATTERN 4 — CHANGING CIRCUMSTANCES
Prediction argument: "Because X happened, Y will happen"
Weaken by: Showing conditions have changed, making the prediction unreliable

PATTERN 5 — OVERLOOKED POPULATION
Generalization: "Policy X will benefit everyone"
Weaken by: Identifying a group for whom X would be harmful

Signal words in question stems: weakens, undermines, calls into question, most damages, casts doubt on.`,
        },
      ],
      levels: [{level:1,desc:"Simple causal and correlation arguments"},{level:2,desc:"Statistical and analogical arguments"},{level:3,desc:"Complex policy and prediction arguments"},{level:4,desc:"Full test difficulty — multi-layered reasoning"}]
    },
    {
      type: "Strengthen",
      tagline: "Find the answer that best supports the argument's conclusion.",
      why: "The mirror image of Weaken. Understanding both makes you a complete logical reasoner — and they're often tested back-to-back on the LSAT.",
      sections: [
        {
          title: "What Does It Mean to Strengthen?",
          content: `To strengthen an argument is to make its conclusion MORE LIKELY to be true.

Just as weakening attacks the assumption, strengthening SUPPORTS or VALIDATES the assumption.

The process:
1. Find the conclusion
2. Find the gap/assumption  
3. Find the answer that fills or supports that gap

Example:
Argument: "Our city installed red light cameras and traffic accidents decreased. Therefore, the cameras caused the decrease."
Assumption: The cameras (not something else) caused the decrease.
Strengthen: "Traffic accidents in neighboring cities without cameras did not decrease during the same period."
Why this strengthens: It eliminates the alternative explanation that accidents decreased everywhere — isolating the cameras as the likely cause.`,
        },
        {
          title: "The Strengthening Toolkit",
          content: `Different argument types need different kinds of support:

FOR CAUSAL ARGUMENTS:
• Eliminate alternative causes ("nothing else changed")
• Show the cause preceded the effect
• Show the correlation is strong and consistent
• Provide a mechanism explaining HOW the cause leads to the effect

FOR SAMPLING/STATISTICAL ARGUMENTS:
• Show the sample was large and representative
• Show the methodology was sound
• Show similar results in other studies

FOR ANALOGY ARGUMENTS:
• Show the two things being compared are relevantly similar
• Show the key features that made it work in one case also exist in the other

FOR PREDICTION ARGUMENTS:
• Show conditions are stable / comparable to when the precedent was set
• Provide additional evidence supporting the prediction

RULE: The correct strengthen answer doesn't need to make the conclusion CERTAIN — just more likely than before.`,
        },
        {
          title: "Strengthen vs. Assumption vs. Support",
          content: `Students often confuse these three:

ASSUMPTION: What MUST be true for the argument to work (required)
STRENGTHEN: What HELPS the argument — makes conclusion more likely (beneficial)
SUPPORT: General term — both assumptions and strengtheners provide support

Key difference:
An assumption is NECESSARY — if it's false, the argument FAILS.
A strengthener is HELPFUL — it makes the argument better, but the argument might survive without it.

This means: Every correct Assumption answer is also a strengthener — but not every strengthener is an assumption.

When you're stuck on a Strengthen question, ask: "If this were true, would I feel better about the conclusion?" If yes, it's probably your answer.

WRONG ANSWER TRAPS:
• Answers that strengthen a DIFFERENT argument (related topic, wrong conclusion)
• Answers that are true but irrelevant to the gap
• Answers that actually WEAKEN the argument (common trap)
• Answers that just restate the evidence`,
        },
        {
          title: "The Weakening Test in Reverse",
          content: `Just as the Negation Test helps with Assumption questions, you can use a "strengthening test":

For each answer, ask: "If this is true, does the conclusion become easier to believe?"

You can also use PROCESS OF ELIMINATION aggressively:
• Eliminate anything that weakens the argument
• Eliminate anything irrelevant to the conclusion
• Eliminate anything that restates the evidence
• What's left is almost always correct

DEGREES OF STRENGTHENING:
Some answers strengthen more than others. The question asks for the answer that MOST strengthens — so compare candidates.

A direct attack on the assumption beats a tangentially related fact.
Specific, concrete information beats vague generalities.

Practice: After identifying your answer, always check — "is there another answer that strengthens it MORE?"`,
        },
      ],
      levels: [{level:1,desc:"Direct, clear support relationships"},{level:2,desc:"Eliminating alternatives and providing mechanisms"},{level:3,desc:"Complex causal and statistical arguments"},{level:4,desc:"Full test difficulty"}]
    },
    {
      type: "Flaw",
      tagline: "Precisely identify the logical error in the argument.",
      why: "Flaw questions build critical thinking that directly applies to legal analysis. Lawyers spot flawed reasoning for a living — this is your first training ground.",
      sections: [
        {
          title: "What Is a Logical Flaw?",
          content: `A flaw is a SPECIFIC ERROR in reasoning — a place where the argument makes an illegitimate logical move.

Every Flaw question argument has a real, identifiable mistake. Your job isn't just to say "this seems wrong" — you need to NAME the error precisely, because the answer choices describe flaws in abstract, general terms.

Example:
Argument: "My neighbor's dog barked all night, and the next morning my car wouldn't start. The dog's barking must have drained my battery."
The flaw: Assuming that because one event preceded another, it caused it. (Post hoc ergo propter hoc — "after this, therefore because of this.")

The correct answer would say something like: "The argument assumes that because one event preceded another, the first event caused the second."`,
        },
        {
          title: "The LSAT's Favorite Flaws",
          content: `Memorize these — they appear constantly:

FLAW 1 — AD HOMINEM
Attacking the person making the argument instead of the argument itself.
"Senator Smith supports this tax policy, but she's been under investigation. We should reject this policy."
The flaw: The senator's character is irrelevant to whether the policy is good.

FLAW 2 — CIRCULAR REASONING (Begging the Question)
The conclusion is hidden inside the premises — the argument assumes what it's trying to prove.
"This painting is beautiful because it has aesthetic value, and aesthetic value is what makes things beautiful."
The flaw: "Beautiful" and "aesthetic value" are just restating each other.

FLAW 3 — HASTY GENERALIZATION
Drawing a broad conclusion from too small or unrepresentative a sample.
"I've met three people from that city, and they were all rude. People from that city are rude."
The flaw: Three people is not a representative sample.

FLAW 4 — FALSE DILEMMA (False Dichotomy)
Presenting only two options when more exist.
"Either we cut education funding or we raise taxes. We can't raise taxes. Therefore, we must cut education funding."
The flaw: Other options exist (cut other spending, find new revenue sources, etc.)

FLAW 5 — EQUIVOCATION
Using the same word with two different meanings.
"The law prohibits anything that is cruel. Hunting is cruel to animals. Therefore, hunting should be illegal."
The flaw: "Cruel" in the law refers to human suffering; in the second premise it means causing animal suffering — different meanings.`,
        },
        {
          title: "More Essential Flaws",
          content: `FLAW 6 — CONFUSING CORRELATION WITH CAUSATION
Assuming that because two things happen together, one causes the other.
"Ice cream sales increase in summer, and so does crime. Ice cream causes crime."
The flaw: Both increase in summer due to a third factor (heat/more people outdoors) — not because one causes the other.

FLAW 7 — APPEAL TO AUTHORITY
Treating someone's opinion as fact simply because they're an authority figure — especially when outside their area of expertise.
"This famous actor endorses this diet, so it must be healthy."
The flaw: Fame doesn't equal nutritional expertise.

FLAW 8 — SLIPPERY SLOPE
Assuming a small step will lead to extreme consequences without showing how.
"If we allow students to redo one exam, soon they'll expect to redo every exam, and academic standards will collapse."
The flaw: No mechanism is provided showing why the first step leads to the extreme outcome.

FLAW 9 — APPEAL TO POPULARITY
Assuming something is correct because many people believe it.
"Most people believe the earth is only 6,000 years old, so that must be right."
The flaw: Popularity doesn't determine truth.

FLAW 10 — PART TO WHOLE / WHOLE TO PART
Assuming what's true of parts is true of the whole, or vice versa.
"Every brick in this wall is light. Therefore, this wall is light."
The flaw: The property of parts doesn't necessarily transfer to the whole.`,
        },
        {
          title: "How to Approach Flaw Questions",
          content: `THE PROCESS:

STEP 1 — READ THE ARGUMENT CRITICALLY
Don't just accept it. Ask: "Where is the logical leap? Where does the reasoning go wrong?"

STEP 2 — IDENTIFY THE CONCLUSION AND EVIDENCE
What is being claimed? What supports it?

STEP 3 — NAME THE FLAW BEFORE READING ANSWER CHOICES
Before you look at the answers, try to identify the flaw yourself. This prevents the answer choices from confusing you.

STEP 4 — MATCH YOUR FLAW TO AN ANSWER CHOICE
Answer choices describe flaws in general, abstract terms. Practice translating specific flaws into abstract descriptions:
"The dog barking caused the battery to die" → "assumes causation from temporal sequence"

STEP 5 — VERIFY YOUR ANSWER APPLIES TO THIS ARGUMENT
Wrong answers often describe real flaws — just not the one in THIS argument. Check that the flaw described in your chosen answer actually appears in the argument.

KEY TRAP: "This argument is flawed because it's wrong" is not a flaw description. You need the STRUCTURAL error — the logical move that doesn't hold up regardless of whether the conclusion happens to be true or false.`,
        },
      ],
      levels: [{level:1,desc:"Named, recognizable fallacies in simple arguments"},{level:2,desc:"Subtler errors in more complex arguments"},{level:3,desc:"LSAT-style arguments with non-obvious flaws"},{level:4,desc:"Full test difficulty — precise flaw identification"}]
    },
    {
      type: "Inference",
      tagline: "Determine what must be true based on the statements given.",
      why: "Inference questions test pure logical deduction — the foundation of legal analysis. If you can prove what MUST follow from given facts, you think like a lawyer.",
      sections: [
        {
          title: "Inference vs. Assumption: A Critical Distinction",
          content: `Students often confuse these two question types. Here's the key difference:

ASSUMPTION: What the argument needs but never says (you're filling a gap)
INFERENCE: What logically FOLLOWS from what IS said (you're drawing a conclusion)

For Inference questions, treat the statements as FACTS. They are all true. Your job is to find what must also be true given these facts.

The golden rule: The correct answer CANNOT be false given the statements. It follows with certainty.

Wrong answers for Inference questions:
• Things that MIGHT be true (possible, but not certain)
• Things that PROBABLY are true (likely, but not certain)  
• Things that are related but go BEYOND what the statements say

Only choose an answer if you can point to specific statements that GUARANTEE it.`,
        },
        {
          title: "Conditional Logic: The Core Tool",
          content: `Many Inference questions involve CONDITIONAL STATEMENTS — "if-then" logic. This is the most important logical structure on the LSAT.

THE BASIC FORM:
"If A, then B" — written as A → B

This means: Whenever A is true, B must also be true.

THE CONTRAPOSITIVE (equally valid):
"If not B, then not A" — written as ¬B → ¬A
This is ALWAYS logically equivalent to the original statement.

Example:
"If it's raining, the ground is wet." (Rain → Wet ground)
Contrapositive: "If the ground is NOT wet, it's NOT raining." (¬Wet → ¬Rain)
Valid: "It's raining. Therefore, the ground is wet."
INVALID: "The ground is wet. Therefore, it's raining." (The ground could be wet for other reasons — this is the FALLACY OF AFFIRMING THE CONSEQUENT)
INVALID: "It's not raining. Therefore, the ground isn't wet." (FALLACY OF DENYING THE ANTECEDENT)`,
        },
        {
          title: "Combining Statements: The Chain Rule",
          content: `Many Inference questions give you multiple statements and expect you to CHAIN them together.

THE CHAIN RULE:
If A → B and B → C, then A → C

Example:
Statement 1: "All lawyers passed the bar exam." (Lawyer → Passed bar)
Statement 2: "Everyone who passed the bar exam studied for at least 6 months." (Passed bar → Studied 6+ months)
Chain: Lawyer → Passed bar → Studied 6+ months
Inference: "All lawyers studied for at least 6 months." ✓

QUANTIFIER LOGIC:
"All A are B" → If something is A, it must be B
"No A are B" → If something is A, it cannot be B
"Some A are B" → At least one A exists that is also B (cannot be negated to "no A are B")
"Most A are B" → More than half of A are B (NOT "all")

COMBINING QUANTIFIERS:
All A are B + All B are C = All A are C ✓
Some A are B + All B are C = Some A are C ✓
Most A are B + Most A are C = Some B are C ✓ (the overlapping group)`,
        },
        {
          title: "The Inference Process",
          content: `STEP 1 — READ ALL STATEMENTS CAREFULLY
Don't rush. Inference questions often have 3-5 statements that each carry meaning.

STEP 2 — LOOK FOR CONNECTIONS
Which statements share terms? Where can you chain conditionals together?

STEP 3 — DRAW WHAT FOLLOWS
Before reading answer choices, ask: "What must be true? What can I guarantee?"

STEP 4 — TEST EACH ANSWER CHOICE
For each answer: "Can I prove this from the given statements? Is there any scenario where these statements are all true but this answer is false?"
If yes → eliminate
If no (it must be true) → potential correct answer

STEP 5 — CHOOSE THE MOST STRONGLY SUPPORTED
If multiple answers seem possible, choose the one you can most directly prove from the statements.

COMMON TRAP: Answers that SEEM obvious but go slightly beyond the statements. The LSAT loves answers that are almost certainly true — but "almost certainly" isn't "must be."

Example trap: Statements establish a correlation; answer claims causation. The statements don't prove causation → eliminate.`,
        },
      ],
      levels: [{level:1,desc:"Direct one-step inferences from clear statements"},{level:2,desc:"Two-statement chains and basic conditional logic"},{level:3,desc:"Multi-statement chains with quantifiers"},{level:4,desc:"Full test difficulty — complex conditional chains"}]
    },
    {
      type: "Main Point",
      tagline: "Identify the author's primary conclusion across the whole argument.",
      why: "If you can't find the main point, you can't analyze any argument correctly. This is the foundational skill that makes all other LR types easier.",
      sections: [
        {
          title: "What Is the Main Point?",
          content: `The MAIN POINT (also called the main conclusion) is the central claim the author is arguing for. It's what the entire argument is designed to establish.

CRITICAL DISTINCTION: Main Point vs. Sub-Conclusion
Arguments often have multiple conclusions. A sub-conclusion is something proved WITHIN the argument that then serves as evidence for the main conclusion.

Example:
Premise 1: "Air pollution causes respiratory illness."
Sub-conclusion: "Cities with heavy traffic have high rates of respiratory illness." (proved by Premise 1)
Main conclusion: "Cities should restrict private vehicle use." (the ultimate point — everything else supports this)

The sub-conclusion SUPPORTS the main conclusion. The main conclusion doesn't support anything else.

THE TEST: Ask of each statement — "Is this used to SUPPORT something, or is it the thing being SUPPORTED?" The main conclusion is supported by everything else. It supports nothing.`,
        },
        {
          title: "Conclusion Indicator Words",
          content: `Train yourself to recognize these words — they signal conclusions:

STRONG CONCLUSION INDICATORS:
• Therefore / Thus / Hence / So / Consequently
• This shows / This demonstrates / This proves / This means
• We can conclude that / It follows that
• Clearly / Obviously / Certainly (when introducing a claim)
• Must / Should (when drawing a moral or practical conclusion)

EVIDENCE INDICATOR WORDS (these point AWAY from the conclusion):
• Because / Since / Given that / As / For the reason that
• After all / Due to the fact that / In light of
• Studies show / Evidence suggests / Research indicates

PRACTICE: When you read an argument, mentally circle every indicator word. Conclusion indicators point to the conclusion; evidence indicators point to premises.

WARNING: Not every conclusion has an indicator word. When there's no indicator, use the COULD BE USED AS EVIDENCE TEST: If a statement could naturally serve as a reason for another statement in the passage, it's probably a premise. The statement that couldn't serve as evidence for anything else is the conclusion.`,
        },
        {
          title: "Scope and Precision",
          content: `The hardest Main Point questions involve scope errors in the answer choices.

TOO NARROW: The answer only captures part of the argument.
Example: If the argument concludes "We should ban all single-use plastics," an answer saying "Plastic bags should be banned" is too narrow.

TOO BROAD: The answer goes beyond what the argument actually claims.
Example: If the argument concludes "This city should invest in public transportation," an answer saying "All cities should prioritize public transportation" is too broad.

TOO STRONG: The answer makes a more definitive claim than the argument.
Example: Argument says "This policy will likely reduce crime." Wrong answer: "This policy will definitely eliminate crime."

THE PRECISION TEST: The correct Main Point answer must:
✓ Capture the FULL conclusion (not just part)
✓ Stay within the SCOPE of the argument (not go beyond it)
✓ Match the STRENGTH of the claim (likely vs. definitely)
✓ Be directly SUPPORTED by the argument's evidence`,
        },
        {
          title: "The Argument Map Method",
          content: `For complex Main Point questions, build a quick ARGUMENT MAP:

1. List each statement in the argument (number them)
2. Ask of each: "Does this SUPPORT another statement, or is it SUPPORTED BY other statements?"
3. Draw arrows: Evidence → Conclusion

The statement with only INCOMING arrows (supported by others, supporting nothing) = the main conclusion.

Example argument:
[1] "Violent crime has decreased steadily over 30 years."
[2] "Public health interventions targeting at-risk youth were introduced 35 years ago."
[3] "The interventions preceded and correlate with the crime decrease."
[4] "Therefore, public health interventions are an effective crime-reduction strategy."

Arrow map: [1] → [4], [2] → [3] → [4]
Statement [4] has only incoming arrows → Main conclusion ✓

COMMON WRONG ANSWER TYPES for Main Point:
• Sub-conclusion (proves something, but also supports something else)
• Pure evidence (a premise that only supports, never gets supported)
• Related but not the actual conclusion made
• The contrapositive or converse of the conclusion`,
        },
      ],
      levels: [{level:1,desc:"Simple 2-3 sentence arguments with clear indicators"},{level:2,desc:"Multi-premise arguments with sub-conclusions"},{level:3,desc:"Complex arguments requiring scope precision"},{level:4,desc:"Full test difficulty — nested and subtle conclusions"}]
    },
    {
      type: "Paradox",
      tagline: "Find the answer that explains how two contradictory facts can both be true.",
      why: "Paradox questions reward flexible thinking — the ability to reconcile conflicting information. This is a core lawyering skill: explaining why apparently contradictory evidence is actually consistent.",
      sections: [
        {
          title: "What Is a Paradox?",
          content: `A paradox question presents two facts that seem to CONTRADICT each other. Both facts are given as TRUE. Your job is to find an explanation that makes BOTH facts true simultaneously.

You are not proving one fact wrong. You are explaining how BOTH can coexist.

Classic example:
FACT 1: "Exercise improves cardiovascular health."
FACT 2: "Professional athletes have a higher rate of heart disease than the general population."

These seem contradictory — if exercise is healthy, why are athletes sicker? 

Correct resolution: "Professional athletes train at intensities far beyond what is beneficial — extreme exercise for decades damages the heart in ways moderate exercise doesn't."

Now both facts are true: moderate exercise is healthy, AND extreme exercise in athletes causes heart damage.

The resolution explains the MECHANISM that makes both facts compatible.`,
        },
        {
          title: "The Resolution Must Do Two Things",
          content: `A correct Paradox answer MUST:

1. EXPLAIN FACT 1 (or at least be consistent with it)
2. EXPLAIN FACT 2 (or at least be consistent with it)
3. SHOW HOW BOTH CAN BE TRUE AT THE SAME TIME

An answer that only explains one fact is WRONG. An answer that explains one fact by making the other false is WRONG.

TEST FOR EACH ANSWER:
→ "Does this explain why [Fact 1] is true?" 
→ "Does this explain why [Fact 2] is true?"
→ "If this answer is true, can I now see how both facts are compatible?"

If all three are YES → likely correct
If any are NO → eliminate

TRAP: Answers that DEEPEN the paradox (make it MORE surprising that both facts are true). These are tempting because they're relevant to the topic — but they make things worse, not better.`,
        },
        {
          title: "Common Paradox Patterns",
          content: `PATTERN 1 — THE SUBSET SOLUTION
The two facts seem to apply to the same group, but actually apply to different subgroups.
Fact 1: Country A spends more per pupil on education than Country B.
Fact 2: Students in Country B perform better academically.
Resolution: Country A's extra spending goes disproportionately to low-performing schools, while Country B's strong average is driven by elite schools — different subgroups explain the paradox.

PATTERN 2 — THE HIDDEN THIRD VARIABLE
Something not mentioned in the facts explains both.
Fact 1: Sales of winter coats increased in June.
Fact 2: It was unusually warm in June.
Resolution: A massive winter coat sale triggered bulk buying in anticipation of fall — a third variable (the sale) explains both.

PATTERN 3 — THE DEFINITIONAL SOLUTION
A key term is being used differently in the two facts.
Fact 1: Hospital A has a higher mortality rate than Hospital B.
Fact 2: Hospital A provides better medical care.
Resolution: Hospital A accepts more severely ill patients — "mortality rate" isn't measuring quality, it's measuring patient severity.

PATTERN 4 — THE TIMING SOLUTION
The facts are both true, but at different times.
Fact 1: The new traffic law reduced accidents.
Fact 2: Traffic fatalities increased after the law.
Resolution: The law was passed before being enforced — accidents dropped after enforcement began, but fatalities rose during the gap period.`,
        },
        {
          title: "Avoiding Paradox Traps",
          content: `TRAP 1 — EXPLAINS ONLY ONE FACT
Many wrong answers beautifully explain one of the surprising facts but ignore the other. Always verify your answer handles BOTH.

TRAP 2 — OUT OF SCOPE
The answer introduces information that seems related but doesn't actually connect the two facts.

TRAP 3 — DEEPENS THE PARADOX
An answer that makes it even MORE surprising that both facts are true — this is the OPPOSITE of what you want.

TRAP 4 — ALREADY KNOWN INFORMATION
Some answers just restate what the prompt told you. Information you already have doesn't resolve anything.

THE LANGUAGE OF PARADOX QUESTION STEMS:
"Which of the following, if true, most helps to explain...?"
"Which of the following, if true, resolves the apparent discrepancy...?"
"Which of the following would most help reconcile...?"

These all ask for the same thing — an explanation that makes both facts compatible.

STRATEGY: Before reading answers, try to articulate your own explanation of the paradox. Then look for an answer that matches your reasoning. If your explanation doesn't work, try different angles until the two facts "click."`,
        },
      ],
      levels: [{level:1,desc:"Simple contradictions with straightforward explanations"},{level:2,desc:"Statistical and cause-effect paradoxes"},{level:3,desc:"Complex multi-variable paradoxes"},{level:4,desc:"Full test difficulty"}]
    },
    {
      type: "Method of Reasoning",
      tagline: "Describe HOW the argument makes its case — the technique, not the content.",
      why: "Forces you to think about argument STRUCTURE rather than content. This is essential for advanced LSAT performance and legal writing, where understanding HOW arguments work is as important as WHAT they claim.",
      sections: [
        {
          title: "What Are You Being Asked?",
          content: `Method of Reasoning questions ask you to describe the LOGICAL TECHNIQUE the author uses to make their argument. You're not evaluating whether the argument is good or bad — you're describing its structure.

The answer must describe WHAT THE ARGUMENT DOES, not WHAT IT CONCLUDES.

Think of yourself as a film critic describing cinematography techniques, not the plot. The "how," not the "what."

Example:
Argument: "Both Jones and Smith claim this drug is safe. But Jones has financial ties to the manufacturer, and Smith based her conclusion on Jones's research. Therefore, we really only have one independent source, not two."
The method: The argument exposes that what appear to be multiple independent sources of evidence are actually a single source (Jones), undermining the claim's support.
Abstract description: "Demonstrating that what appear to be multiple independent sources of support are actually a single source."`,
        },
        {
          title: "Common Argument Methods",
          content: `LEARN TO RECOGNIZE THESE:

METHOD 1 — ANALOGY
Using a similar, better-understood case to shed light on the case at hand.
"Teaching critical thinking is like teaching swimming — you learn by doing, not by reading about it."

METHOD 2 — COUNTEREXAMPLE  
Disproving a general claim by producing one exception.
"You claim all birds can fly. But penguins are birds, and they cannot fly."

METHOD 3 — APPEAL TO AUTHORITY
Using an expert's opinion to support a claim.
"Renowned economist Dr. Chen concludes that this policy will reduce inflation."

METHOD 4 — ELIMINATING ALTERNATIVES
Showing that all other possibilities are false, leaving only the conclusion.
"The artifact is either Roman, Greek, or Egyptian. Tests rule out Roman and Greek origins. Therefore, it must be Egyptian."

METHOD 5 — CITING EVIDENCE / EMPIRICAL SUPPORT  
Using data, statistics, studies, or observations to support the conclusion.
"Studies of 10,000 patients show this treatment reduces recovery time by 30%."

METHOD 6 — REDUCTIO AD ABSURDUM
Showing that if the opponent's position is true, it leads to an absurd conclusion.
"If we banned everything with some risk, we'd have to ban cars, electricity, and food."

METHOD 7 — APPEAL TO CONSEQUENCES
Arguing that a position should be adopted (or rejected) based on its practical outcomes.`,
        },
        {
          title: "Dialogue and Two-Person Arguments",
          content: `Some Method of Reasoning questions involve a DIALOGUE — one person makes an argument, another responds. You may be asked:
• How does the second speaker respond to the first?
• What is the method of the FIRST speaker's argument?
• How does the exchange as a whole proceed?

COMMON DIALOGUE RESPONSES:
"Accepts the premise but challenges the conclusion" — agrees with the facts but disputes what follows.
"Questions a key assumption" — attacks an unstated belief.
"Offers a counterexample" — gives a specific case that disproves the general claim.
"Offers an analogy" — uses a parallel case to support or attack a position.
"Points out an ambiguity" — identifies a term used with two different meanings.
"Questions the relevance" — argues the evidence doesn't support the conclusion.

TIP: In dialogue questions, carefully track WHO is saying WHAT. Students often mix up the positions and argue for the wrong person's method.`,
        },
        {
          title: "Reading Answer Choices Accurately",
          content: `Method of Reasoning answer choices are written in highly abstract, general language. This is intentional — the method must be described independently of specific content.

MATCHING PROCESS:
1. Identify the method in your own words
2. Find the abstract description that matches

TRAPS TO AVOID:

TRAP 1 — CONTENT ANSWERS
Answers that describe WHAT the argument says, not HOW it argues. Eliminate any answer that references specific content from the passage.

TRAP 2 — WRONG RELATIONSHIP
Answers that accurately describe a technique — just not one used in this argument. The description must match THIS argument.

TRAP 3 — REVERSED DIRECTION
Answers that describe the method backwards — for example, saying the argument moves from general to specific when it actually moves from specific to general.

TRAP 4 — PARTIAL DESCRIPTION
Answers that correctly describe part of the method but miss a key element.

ACCURACY CHECK: After choosing your answer, re-read the argument and trace through each step of the method described in your answer. Each step should map to something in the actual argument.`,
        },
      ],
      levels: [{level:1,desc:"Simple single-technique arguments"},{level:2,desc:"Two-step methods and dialogues"},{level:3,desc:"Complex rhetorical structures"},{level:4,desc:"Full test difficulty — subtle method identification"}]
    },
    {
      type: "Parallel Reasoning",
      tagline: "Find the argument with the exact same logical structure as the original.",
      why: "The most structurally demanding LR type. Mastering parallel reasoning means you've internalized argument structure at a deep level — a skill that will serve you throughout law school.",
      sections: [
        {
          title: "What Does Parallel Mean?",
          content: `Parallel Reasoning questions ask you to find an argument in the answer choices with the IDENTICAL logical structure to the original. The content will be completely different. Only the structure matters.

Think of it like matching sentence structures in grammar: "The cat sat on the mat" is parallel to "The dog ran in the park" — different words, same noun-verb-preposition structure.

In LSAT parallel reasoning, you're matching argument structure, not topic.

WHAT MUST MATCH:
1. The TYPE OF REASONING (conditional, causal, analogical, etc.)
2. The LOGICAL FORM (general to specific, specific to general, etc.)
3. The TYPE OF CONCLUSION (definite vs. probable; positive vs. negative; universal vs. particular)
4. The NUMBER OF PREMISES and their relationship
5. Whether the argument is VALID or INVALID (if the original has a flaw, the parallel must have the same flaw)

WHAT DOESN'T MATTER:
Content, topic, specific nouns, emotional tone`,
        },
        {
          title: "Abstracting the Argument",
          content: `The key skill in Parallel Reasoning is ABSTRACTION — stripping away content to reveal the bare logical structure.

STEP 1 — TRANSLATE TO LETTERS
Identify the key terms and replace them with letters.

Example:
"All mammals are warm-blooded. Dogs are mammals. Therefore, dogs are warm-blooded."
Translation: All M are W. D is M. Therefore, D is W.
Structure: Universal affirmative + specific instance → specific conclusion.

STEP 2 — IDENTIFY THE ARGUMENT TYPE
Is it: Conditional? Causal? Analogical? Elimination? Statistical? Deductive? Inductive?

STEP 3 — NOTE THE CONCLUSION TYPE
• Definite vs. probable ("must be" vs. "is likely")
• Universal vs. particular ("all" vs. "some")
• Positive vs. negative ("is" vs. "is not")

STEP 4 — CHECK VALIDITY
Is this a VALID argument (conclusion follows necessarily) or INVALID (contains a flaw)?
If invalid: What is the flaw? The parallel argument must contain the SAME flaw.`,
        },
        {
          title: "Common Parallel Structures",
          content: `VALID STRUCTURES TO RECOGNIZE:

MODUS PONENS (affirming the antecedent):
If A → B. A is true. Therefore, B is true. ✓

MODUS TOLLENS (denying the consequent):
If A → B. B is false. Therefore, A is false. ✓

HYPOTHETICAL SYLLOGISM (chain):
If A → B. If B → C. Therefore, A → C. ✓

DISJUNCTIVE SYLLOGISM:
Either A or B. Not A. Therefore, B. ✓

INVALID STRUCTURES (flawed arguments — still need to match):

AFFIRMING THE CONSEQUENT (INVALID):
If A → B. B is true. Therefore, A is true. ✗ (B could be true for other reasons)
Example: "If it rains, the ground is wet. The ground is wet. Therefore, it rained."

DENYING THE ANTECEDENT (INVALID):
If A → B. Not A. Therefore, not B. ✗
Example: "If it rains, the ground is wet. It didn't rain. Therefore, the ground isn't wet." (Could be wet from a sprinkler)

When matching a flawed argument, you must find the answer with the SAME flaw.`,
        },
        {
          title: "Efficient Elimination Strategy",
          content: `Parallel Reasoning questions are time-consuming. Use this efficient approach:

QUICK ELIMINATIONS:
Before reading every answer carefully, eliminate obvious mismatches:

1. WRONG CONCLUSION TYPE
If the original has a definite conclusion ("must be"), eliminate answers with probable conclusions ("probably is") and vice versa.
If the original is universal ("all"), eliminate answers that are particular ("some") and vice versa.

2. WRONG NUMBER OF PREMISES
If the original has two premises, eliminate answers with one or three.

3. WRONG DIRECTION
If the original goes from general to specific, eliminate answers going specific to general.

AFTER QUICK ELIMINATION:
You should be down to 1-2 candidates. Now apply full structural analysis to these.

VERIFICATION:
Take your chosen answer and your abstracted structure. Can you map every element of the original to a corresponding element in the answer? If the mapping is perfect → correct answer.

TIME MANAGEMENT: If stuck, note the conclusion type first (hardest to fake) and eliminate based on that. Most wrong answers fail on conclusion type alone.`,
        },
      ],
      levels: [{level:1,desc:"Simple conditional arguments with clear structure"},{level:2,desc:"Causal and analogical parallel structures"},{level:3,desc:"Invalid arguments requiring same-flaw matching"},{level:4,desc:"Full test difficulty — complex multi-step structures"}]
    },
    {
      type: "Evaluate",
      tagline: "Find the question whose answer would most help assess the argument's strength.",
      why: "Tests the most sophisticated form of logical analysis — knowing WHAT information would matter. This is exactly what lawyers do: identify the pivotal questions in a case.",
      sections: [
        {
          title: "What Are Evaluate Questions?",
          content: `Evaluate questions ask: "What additional information would most help us determine whether this argument is good or bad?"

You're not strengthening or weakening the argument. You're finding the KEY QUESTION that, when answered, would either strengthen OR weaken the argument depending on the answer.

The correct answer is a question (or information need) such that:
• If the answer is YES → the argument is STRONGER
• If the answer is NO → the argument is WEAKER
(Or vice versa — either direction works)

The wrong answers are questions whose answers wouldn't change how we feel about the argument either way.

Example:
Argument: "Our company switched to remote work, and productivity increased by 15%. Remote work improves productivity."
Evaluate answer: "Did the company implement any other changes at the same time as the shift to remote work?"
• If YES (other changes happened) → the productivity increase might not be due to remote work (WEAKENS)
• If NO (only remote work changed) → the argument is STRONGER

This is the pivotal question — the answer matters either way.`,
        },
        {
          title: "Finding the Pivotal Question",
          content: `The pivotal question always targets the argument's KEY ASSUMPTION.

PROCESS:
STEP 1 — Identify the conclusion
STEP 2 — Identify the assumption (the gap in the reasoning)
STEP 3 — Ask: "What question, if answered, tells us whether this assumption holds?"

The assumption IS the answer to the pivotal question.

Example:
Argument: "Organic foods contain more nutrients than conventional foods. Therefore, eating organic is healthier."
Assumption: More nutrients = healthier for humans (the leap from "more nutrients" to "healthier")
Pivotal question: "Are the additional nutrients found in organic foods ones that improve human health outcomes?"
• YES → the argument is stronger
• NO → "healthier" claim doesn't follow from "more nutrients"

This question directly probes the assumption.`,
        },
        {
          title: "The Yes/No Test",
          content: `Apply the YES/NO TEST to every answer choice:

For each answer choice (which is a question), ask:
"If the answer to this question is YES, does the argument get stronger or weaker? What about NO?"

CORRECT ANSWER: The answer matters — yes and no lead to different assessments.
WRONG ANSWER: The answer doesn't change anything — yes and no lead to the same assessment.

Example wrong answers and why they fail:

Wrong answer: "Was the remote work policy popular with employees?"
• YES → Still doesn't tell us if productivity went up because of remote work
• NO → Still doesn't tell us
The answer doesn't matter → ELIMINATE

Wrong answer: "Did the company track productivity before the switch?"
• YES → Good, we have a valid comparison
• NO → The 15% increase figure is meaningless without a baseline
This DOES matter → could be correct

TRAP: Answers where one direction matters but the other doesn't:
"Did any employees leave the company?" 
• YES → Could affect productivity comparison
• NO → Doesn't strengthen the argument
This is asymmetric — the answer only helps in one direction. Correct Evaluate answers help in BOTH directions.`,
        },
        {
          title: "Evaluate vs. Strengthen vs. Weaken",
          content: `These three question types are closely related. Understanding the differences sharpens all three:

STRENGTHEN: Gives you information that DOES make the argument stronger.
WEAKEN: Gives you information that DOES make the argument weaker.  
EVALUATE: Asks what information WOULD be relevant — without telling you which way it cuts.

You can practice converting between them:
• The correct Evaluate answer, answered YES, often becomes a correct Strengthen answer
• The correct Evaluate answer, answered NO, often becomes a correct Weaken answer

This also means you can WORK BACKWARDS:
If you were writing a Weaken answer for this argument, what would you use? The Evaluate answer often asks whether that weakening condition is true.

COMMON EVALUATE QUESTION STEMS:
• "Which of the following would be most useful to know in evaluating the argument?"
• "The answer to which of the following questions would most help in assessing the argument?"
• "Which of the following would be most important to determine?"
• "To evaluate the conclusion, it would be most helpful to know..."

All ask the same thing: find the pivotal question.`,
        },
      ],
      levels: [{level:1,desc:"Simple causal arguments with clear assumptions"},{level:2,desc:"Statistical and policy arguments"},{level:3,desc:"Complex multi-variable arguments"},{level:4,desc:"Full test difficulty — subtle pivotal questions"}]
    },
  ],
  "Reading Comprehension": [
    {
      type: "Main Idea",
      tagline: "Identify the author's central argument across the entire passage.",
      why: "Every RC question becomes easier when you know exactly what the passage is about. The Main Idea is your anchor — everything else in the passage relates back to it.",
      sections: [
        {
          title: "Active Reading Strategy",
          content: `RC is not about memorizing details. It's about understanding STRUCTURE and PURPOSE.

As you read, constantly ask:
• What is the author's MAIN CLAIM or PURPOSE?
• What EVIDENCE supports it?
• What is the author's STANCE? (positive, critical, neutral, cautious?)
• How does each paragraph CONTRIBUTE to the whole?

THE PASSAGE MAP:
After each paragraph, jot a 3-5 word summary in the margin (or mentally):
P1: "Introduces controversy about X"
P2: "Traditional view — argues Y"
P3: "Author's challenge — actually Z"
P4: "Implications and conclusion"

Your passage map becomes your navigation tool for all questions.

MAIN IDEA = What the author is ultimately arguing across ALL paragraphs.`,
        },
        {
          title: "Scope: Too Narrow, Too Broad, Just Right",
          content: `The most common Main Idea traps involve SCOPE errors.

TOO NARROW: Captures only one paragraph or one example.
If a passage argues "Three factors explain the decline of Roman civilization," a too-narrow answer would be "Economic factors contributed to Rome's decline." True — but it misses the other two factors.

TOO BROAD: Goes beyond what the passage claims.
If the passage argues "Economic factors in 3rd-century Rome contributed to its fall," a too-broad answer would be "Economic instability destroys civilizations." The passage makes a specific historical argument — not a universal claim.

TOO STRONG: Makes a more definitive claim than the author does.
If the author argues X "may have" caused Y, the correct answer cannot say X "did" cause Y.

JUST RIGHT: Matches the exact scope and strength of the author's central argument.

PRECISION TEST: After choosing your answer, re-read the passage's first and last paragraphs. Does your answer capture what's established across both? If yes → likely correct.`,
        },
        {
          title: "Author's Stance and Purpose",
          content: `Main Idea and Primary Purpose questions are related. The PURPOSE answers "why did the author write this?" The MAIN POINT answers "what does the author conclude?"

COMMON PASSAGE PURPOSES:
• Argue for a position (advocate, defend, contend)
• Challenge an established view (critique, question, dispute)
• Explain a phenomenon (describe, examine, analyze)
• Compare two perspectives (contrast, evaluate, assess)
• Reconcile conflicting views (synthesize, resolve)

THE AUTHOR'S STANCE:
Watch for stance-revealing language:
• Positive: "importantly," "fortunately," "correctly"
• Negative: "unfortunately," "erroneously," "problematically"  
• Cautious: "may," "might," "suggests," "appears to"
• Strong: "demonstrates," "proves," "shows," "establishes"

An author who "questions" a theory has a different stance than one who "examines" it. The Main Idea must reflect the correct stance.`,
        },
        {
          title: "Eliminating Wrong Answers",
          content: `WRONG ANSWER TYPES for Main Idea:

TYPE 1 — DETAIL ANSWER
Focuses on a supporting example or sub-point. True, but too specific.
"The author argues that the 1921 trade agreement had unexpected effects." → Only part of the argument.

TYPE 2 — CONTRADICTION
States something the author argues AGAINST.
If the author challenges traditional views, a wrong answer summarizes the traditional view the author rejects.

TYPE 3 — HALF RIGHT
Captures the topic but not the author's specific claim about it.
"The passage discusses the history of public education." → Too vague — doesn't capture the author's argument.

TYPE 4 — DISTORTION
Takes a real element and slightly misrepresents it.
Author: "X contributed to Y" → Wrong answer: "X alone caused Y."

SELECTION PROCESS:
First, eliminate answers that clearly fall into these types. Then compare remaining answers — which one best captures the ENTIRE passage's central argument with the CORRECT strength and scope?`,
        },
      ],
      levels: [{level:1,desc:"Short passages with clear central arguments"},{level:2,desc:"Multi-paragraph passages with supporting evidence"},{level:3,desc:"Complex academic passages requiring scope precision"},{level:4,desc:"Full test difficulty"}]
    },
    {
      type: "Author's Tone",
      tagline: "Identify the author's attitude toward the subject matter.",
      why: "Tone questions reward close attention to language. In law, understanding a judge's or author's tone — skeptical, supportive, qualified — is critical to understanding the force of their conclusions.",
      sections: [
        {
          title: "What Is Tone?",
          content: `Tone is the author's ATTITUDE toward the subject — how they feel about what they're discussing. It's revealed through word choice, not just content.

Two authors can write about the same topic with opposite tones:
Author A: "The new policy has brought about remarkable improvements in public health outcomes."
Author B: "The new policy's claimed improvements in public health outcomes remain unverified."

Same topic. Radically different tones. A is supportive/enthusiastic. B is skeptical/qualified.

HOW TONE IS EXPRESSED:
• WORD CHOICE: "significant" vs. "allegedly significant"; "demonstrates" vs. "suggests"
• QUALIFIERS: "clearly," "remarkably" (strong) vs. "may," "appears to" (cautious)  
• TREATMENT OF OPPOSING VIEWS: Does the author engage them seriously or dismiss them?
• DESCRIPTIVE LANGUAGE: Are problems described as "challenges" or "crises"? Are benefits "modest" or "dramatic"?`,
        },
        {
          title: "The LSAT Tone Spectrum",
          content: `LSAT authors typically fall somewhere on this spectrum:

STRONG POSITIVE ←————————→ STRONG NEGATIVE
Enthusiastic | Supportive | Cautiously positive | Neutral/objective | Cautiously critical | Skeptical | Dismissive | Harshly critical

IMPORTANT: LSAT passages rarely express extreme tones. Authors are almost never "enraged," "ecstatic," "contemptuous," or "indignant." These strong emotional words are WRONG ANSWER TRAPS.

COMMON CORRECT TONES ON LSAT:
• Cautiously optimistic — supports something with reservations
• Skeptical — doubts claims without fully rejecting them
• Critical — finds problems with an argument or position
• Analytical/objective — examines without taking strong sides
• Qualified support — mostly agrees but with important caveats
• Persuasive — actively arguing for a position

TONE WORDS TO KNOW:
Ambivalent (mixed feelings), Sanguine (optimistic), Circumspect (cautious), Laudatory (praising), Disparaging (critical), Equivocal (avoiding commitment), Didactic (teaching-oriented)`,
        },
        {
          title: "Tone vs. Content: Don't Confuse Them",
          content: `A critical skill: separating WHAT the author discusses from HOW they discuss it.

An author can discuss a NEGATIVE topic with a POSITIVE tone:
"Despite early setbacks, the new cancer treatment has shown remarkable promise." → Positive tone about a health topic.

An author can discuss a POSITIVE topic with a SKEPTICAL tone:
"Proponents celebrate the economic boom, but a closer examination reveals troubling inequities." → Skeptical tone about economic growth.

CONTENT TRAP: Don't let the subject matter determine your tone choice. Analyze the author's ATTITUDE toward the subject, not the subject itself.

TECHNIQUE — THE STANCE SIGNAL:
In the first paragraph, look for stance signals. Authors often reveal their position early:
• "Contrary to popular belief..." → Author is about to challenge something
• "Recent scholarship has successfully demonstrated..." → Author accepts and builds on existing work  
• "While X has been widely celebrated, a closer look reveals..." → Critical examination follows`,
        },
        {
          title: "Tone for Specific Parts",
          content: `Some questions ask about the author's tone toward a SPECIFIC part — a theory, a person, a study.

Different parts of the same passage can have different tones:
• Author is neutral in describing the traditional view
• Author is critical in evaluating the traditional view
• Author is cautiously supportive of the new approach

PROCESS FOR PART-SPECIFIC TONE:
1. Find the relevant section
2. Identify evaluative language in THAT section
3. Determine the tone of THAT section — not the whole passage

VERB CHOICES REVEAL TONE:
• "argues" → neutral
• "demonstrates" → accepts as proven
• "claims" → slight skepticism (not yet verified)
• "acknowledges" → concedes with possible reservations
• "correctly observes" → accepts and endorses
• "mistakenly believes" → directly critical
• "fails to recognize" → critical of a gap

ELIMINATION STRATEGY FOR TONE:
Eliminate answers that are too extreme for the passage's measured academic register. Then eliminate answers that misidentify the direction (positive vs. negative). What remains is almost always correct.`,
        },
      ],
      levels: [{level:1,desc:"Clearly positive or negative tone in short passages"},{level:2,desc:"Nuanced or mixed tones requiring careful reading"},{level:3,desc:"Subtle academic tones with qualified language"},{level:4,desc:"Full test difficulty — distinguishing similar tones"}]
    },
    {
      type: "Detail",
      tagline: "Find information explicitly stated in the passage.",
      why: "Tests careful, precise reading. The answer is always directly in the text — your job is locating it quickly and accurately without being misled by paraphrasing.",
      sections: [
        {
          title: "What Are Detail Questions?",
          content: `Detail questions ask about specific information EXPLICITLY STATED in the passage. No inference required — the answer is in the text.

The challenge isn't understanding; it's LOCATING and RECOGNIZING the relevant information under time pressure — especially when answer choices paraphrase the original.

SIGNAL PHRASES in question stems:
• "According to the passage..."
• "The author states..."
• "The passage mentions..."
• "Which of the following is mentioned in the passage?"

KEY RULE: If the answer requires you to go BEYOND what's stated — to infer, interpret, or draw conclusions — it's not a Detail question answer. Eliminate it.`,
        },
        {
          title: "The Passage Map Pays Off",
          content: `Detail questions are where your PASSAGE MAP saves you. Instead of re-reading the whole passage, use your paragraph summaries to navigate to the right section.

HOW TO USE YOUR MAP:
1. Read the question and identify the KEY TERM or TOPIC
2. Recall which paragraph discussed that topic
3. Go directly to that paragraph
4. Read it carefully — the answer is there

WHEN THE MAP ISN'T ENOUGH:
For very specific details, use KEYWORD SCANNING:
• Identify the most specific, unusual term in the question
• Scan the passage for that exact word or a close synonym
• Read that sentence and the surrounding 2-3 sentences carefully

EXAMPLE:
Question: "According to the passage, when did the species first migrate south?"
Key term: "migrate south" / timing word "when"
Scan for: "migration," "south," and date/time language
Find the relevant sentence → answer is paraphrased there`,
        },
        {
          title: "Paraphrase Recognition",
          content: `LSAT Detail answers almost always PARAPHRASE the original text — they don't quote it directly. Learning to recognize paraphrases is essential.

EXAMPLE:
Passage text: "The species' population declined precipitously in the early 20th century due to extensive habitat destruction."
Correct answer: "Significant habitat loss led to a sharp decrease in the species' numbers during the 1900s."
Same meaning, completely different words.

WRONG answer: "The species became extinct in the early 20th century." (Goes beyond — says extinct, not just declined)
WRONG answer: "Habitat destruction was the primary cause of all wildlife decline in the 20th century." (Too broad — passage says this species, not all wildlife)

HOW TO VERIFY YOUR ANSWER:
After choosing an answer, point to the SPECIFIC SENTENCE in the passage that supports it. If you can't find the sentence, reconsider your answer. Detail questions ALWAYS have a directly supporting sentence.`,
        },
        {
          title: "Traps in Detail Questions",
          content: `TRAP 1 — TRUE BUT NOT STATED
An answer that is likely true based on common knowledge — but never explicitly stated in the passage. LSAT passages are the only source. If the passage didn't say it, it doesn't count.

TRAP 2 — CORRECT TOPIC, WRONG DETAIL
An answer about the right subject that misstates the specific claim.
Passage: "Costs rose 15%." Wrong answer: "Costs doubled."

TRAP 3 — REVERSAL
Swaps the relationship between two things.
Passage: "X led to Y." Wrong answer: "Y led to X."

TRAP 4 — EXTREME LANGUAGE
Passage: "The treatment often reduced symptoms." Wrong answer: "The treatment always eliminated symptoms." Adding "always" and "eliminated" is a distortion.

TRAP 5 — SCOPE EXPANSION
Passage makes a claim about one specific thing; wrong answer applies it broadly.
Passage: "This technique was effective in coastal regions." Wrong answer: "This technique was effective everywhere."

STRATEGY: For Detail questions, be a detective. Your job is to find the EXACT sentence and verify your answer matches it without distortion, expansion, or reversal.`,
        },
      ],
      levels: [{level:1,desc:"Obvious details that are easy to locate"},{level:2,desc:"Details requiring careful scanning and paraphrase recognition"},{level:3,desc:"Details in complex passages with similar-sounding wrong answers"},{level:4,desc:"Full test difficulty"}]
    },
    {
      type: "Inference",
      tagline: "Find what must be true based on the passage — going just beyond what's stated.",
      why: "RC Inference questions test the ability to draw logical conclusions from text — the most essential skill in legal reading.",
      sections: [
        {
          title: "RC Inference vs. LR Inference",
          content: `Both question types ask "what must be true?" but they operate differently:

LR INFERENCE: Short stimulus, very tight logic. What follows necessarily from these specific statements?

RC INFERENCE: Long passage. The answer is STRONGLY SUPPORTED by the passage — but you often need to combine information from different parts.

RC Inference answers are not always strictly necessary — but they must be STRONGLY supported. The best answer is the one most firmly grounded in the passage.

THE SPECTRUM:
"Must be true" (strictest — directly follows from stated facts)
"Most strongly supported" (less strict — best supported by passage)
"Author would most likely agree" (requires understanding the author's position)

All three types work similarly — find the answer most grounded in what the passage says.`,
        },
        {
          title: "How to Generate RC Inferences",
          content: `STEP 1 — IDENTIFY THE RELEVANT PASSAGE SECTION
Use the question's keywords to locate the relevant paragraph(s).

STEP 2 — READ CAREFULLY
Re-read the relevant section, looking for:
• Relationships between ideas
• Comparisons and contrasts
• Cause-effect connections
• Implications of stated facts

STEP 3 — ASK "WHAT FOLLOWS?"
Given what's stated, what else must be true? What can you deduce?

Example:
Passage states: "In the 1950s, the company's revenues exceeded those of its three largest competitors combined. By the 1970s, it had fallen to third place in the industry."

Inference: "At some point between the 1950s and 1970s, the company lost its dominant position." ✓
(Doesn't require anything beyond what's stated — follows necessarily)

WRONG inference: "The company's revenues declined between the 1950s and 1970s." 
(NOT necessarily true — it could still have GROWN, just more slowly than competitors who grew faster)`,
        },
        {
          title: "Author Agreement Questions",
          content: `"The author would most likely agree with which of the following?" questions require understanding the author's POSITION and REASONING.

STRATEGY:
1. Identify the author's main argument and stance
2. For each answer, ask: "Would this author, given their stated position, agree with this?"
3. Look for answers that EXTEND the author's position logically
4. Be wary of answers that go farther than the author goes

The author's position should PREDICT their agreement:
If the author argues that X is problematic, they would likely agree that:
• X should be reformed ✓
• X has been underexamined ✓
They would likely DISAGREE that:
• X is fundamentally sound ✗
• X's problems are overstated ✗

TRAP: Answers that the author MIGHT agree with in the abstract but that go beyond the passage's specific claims. The author only "agrees" with things their stated argument implies.`,
        },
        {
          title: "Avoiding RC Inference Traps",
          content: `TRAP 1 — TOO STRONG (Most Common)
Answer makes a bolder claim than the passage supports.
Passage: "Studies suggest X may contribute to Y."
Wrong answer: "X causes Y." (Passage says "suggests" and "may" — not "causes")

TRAP 2 — REQUIRES OUTSIDE KNOWLEDGE
Answer that you know to be true from outside the passage — but isn't supported BY the passage.
Eliminate any answer that requires knowledge the passage doesn't provide.

TRAP 3 — CONTRADICTS THE PASSAGE
Answer that is directly inconsistent with something stated. Common trap — the answer SEEMS to follow but actually reverses a relationship.

TRAP 4 — ADDRESSES THE RIGHT TOPIC, WRONG CLAIM
Answer about the same subject as the correct answer but making a different claim. Often differs subtly — "all" vs. "most," "caused" vs. "contributed to."

TRAP 5 — SCOPE CREEP
Answer that takes something true about one part of the subject and applies it to a broader category.

FINAL CHECK: After choosing your answer, locate the specific passage text that supports it. Can you point to the sentence? If yes → strong confidence. If not → reconsider.`,
        },
      ],
      levels: [{level:1,desc:"Direct, obvious inferences from clear passage statements"},{level:2,desc:"Inferences combining two paragraph sections"},{level:3,desc:"Nuanced inferences requiring careful scope control"},{level:4,desc:"Full test difficulty — subtle distinctions between similar inferences"}]
    },
    {
      type: "Purpose",
      tagline: "Explain WHY the author included a specific part of the passage.",
      why: "Purpose questions test structural understanding — the ability to see how each part of a passage contributes to the whole argument. Essential for legal analysis.",
      sections: [
        {
          title: "Function vs. Content",
          content: `Purpose questions ask WHY, not WHAT.

WRONG approach: "This paragraph discusses the economic implications of the policy."
RIGHT approach: "This paragraph provides evidence that undermines the preceding claim."

You're not describing the CONTENT of a paragraph or example — you're describing its ROLE in the overall argument.

ASK THESE QUESTIONS:
• What did the argument need at this point?
• What job does this section do?
• How would the argument be different WITHOUT this section?

If the section weren't there:
• Would a key objection go unaddressed? → Purpose: addresses a counterargument
• Would a claim lack support? → Purpose: provides evidence
• Would a term be undefined? → Purpose: defines a concept
• Would the conclusion seem too strong? → Purpose: qualifies the main claim`,
        },
        {
          title: "Common Paragraph Functions",
          content: `LEARN TO RECOGNIZE THESE:

PROVIDES EVIDENCE: Gives facts, data, or examples that support a claim made elsewhere.
INTRODUCES A COUNTERARGUMENT: Presents an opposing view — usually before the author refutes it.
REFUTES A COUNTERARGUMENT: Responds to and undermines an opposing view.
QUALIFIES A CLAIM: Limits or adds nuance to a previous statement.
APPLIES A PRINCIPLE: Takes a general rule and shows how it works in a specific case.
PROVIDES HISTORICAL CONTEXT: Sets up background needed to understand the main argument.
DRAWS A CONCLUSION: Summarizes the logical outcome of previous sections.
DEFINES A TERM: Clarifies how a key word is being used.
INTRODUCES A PROBLEM: Establishes the issue the rest of the passage will address.
OFFERS A SOLUTION: Proposes an answer to the problem.
PRESENTS A COMPARISON: Contrasts two things to illuminate both.

For each passage you read, practice identifying which function each paragraph serves. This makes all RC questions — not just Purpose — easier.`,
        },
        {
          title: "The Purpose of Specific Examples",
          content: `Many Purpose questions ask about specific EXAMPLES within a paragraph, not the whole paragraph.

Examples almost always serve one of these functions:
• ILLUSTRATE a general principle (make an abstract claim concrete)
• PROVE a claim (provide evidence)
• PROVIDE A COUNTEREXAMPLE (challenge a previous claim)
• SHOW A CONTRAST (demonstrate a difference between two things)

PROCESS FOR EXAMPLE QUESTIONS:
1. Identify what the example IS about (the content)
2. Identify what COMES BEFORE the example (the claim it's illustrating or challenging)
3. Ask: "Is this example supporting, challenging, or illustrating something?"
4. Match to an answer that describes the function abstractly

TRAP: Wrong answers describe what the example IS about (content) rather than what it DOES (function). Eliminate any answer that just summarizes the example's topic.`,
        },
        {
          title: "Matching Abstract Functions to Passage Actions",
          content: `Purpose answer choices are written in abstract language. Practice translating:

"To illustrate the broader principle discussed in the preceding paragraph."
→ The example makes a general point concrete.

"To introduce a consideration that complicates the argument made in the first paragraph."
→ A wrinkle is added to the main argument — it's not a full counterargument, just a complication.

"To provide evidence in support of the claim that X is the primary cause of Y."
→ The section gives proof for a specific causal claim.

"To acknowledge an objection and explain why it does not undermine the author's central argument."
→ The author addresses a counterargument and defends their position.

VERIFICATION PROCESS:
After choosing your answer, re-read the section in question and the section immediately before and after it. Ask:
• Does my answer describe what this section DOES for the argument?
• Does the section actually ACCOMPLISH what my answer says?
Both must be yes → confident in your answer.`,
        },
      ],
      levels: [{level:1,desc:"Clear paragraph functions in simple passages"},{level:2,desc:"Examples and counterarguments"},{level:3,desc:"Complex rhetorical functions in academic passages"},{level:4,desc:"Full test difficulty — subtle purpose distinctions"}]
    },
    {
      type: "Analogy",
      tagline: "Find the situation most analogous to something described in the passage.",
      why: "Tests the ability to see structural similarity across different contexts — a core skill in legal reasoning, where lawyers constantly apply precedents from different factual situations.",
      sections: [
        {
          title: "What Makes Things Analogous?",
          content: `Two situations are ANALOGOUS when they share the same UNDERLYING STRUCTURE or RELATIONSHIP — even if they look completely different on the surface.

Analogy questions ask you to find a situation in a different domain that mirrors the same structural pattern as something described in the passage.

WHAT MATTERS:
• The RELATIONSHIP between elements (A caused B; X is a subset of Y; P and Q have the same effect)
• The STRUCTURE of the situation (the roles each element plays)

WHAT DOESN'T MATTER:
• The topic or subject matter
• Surface-level similarities
• Whether both situations involve the same field

Example:
Passage: A species that dominates an ecosystem can paradoxically reduce overall biodiversity by outcompeting specialized species.
Analogy: A dominant market player driving out niche competitors, resulting in less overall variety of products.
Why: Same structure — dominant entity reduces diversity by outcompeting specialized alternatives.`,
        },
        {
          title: "Abstracting the Relationship",
          content: `STEP 1 — IDENTIFY THE RELATIONSHIP IN THE PASSAGE
Strip away specific content. What is the underlying relationship?

Example process:
Passage situation: "Antibiotics kill bacteria, but overuse leads to resistant strains that are harder to treat."
Abstract structure: "A tool designed to eliminate X becomes less effective against X over time due to overuse, because overuse selects for X variants that resist the tool."

STEP 2 — FIND THE ANSWER WITH THE SAME ABSTRACT STRUCTURE
Look for an answer where:
• There's a tool/method designed to eliminate/reduce X
• Overuse/overexposure creates variants of X that resist the tool
• The tool becomes less effective over time

Matching answer: "Pesticides kill insects, but widespread use leads to resistant populations that are harder to control." ✓
Same structure — different domain.

WRONG answer: "Medical researchers develop antibiotics faster than bacteria evolve resistance." ✗
Different structure — this is about the rate of development, not about use creating resistance.`,
        },
        {
          title: "Common Analogy Structures",
          content: `RECOGNIZING THESE PATTERNS SAVES TIME:

PARADOX STRUCTURES:
"Doing X to fix problem P actually makes P worse in the long run."
Look for: Any case where the solution exacerbates the problem.

FEEDBACK LOOP STRUCTURES:
"Success at X leads to conditions that make X harder/less likely."
Look for: Any self-undermining success cycle.

SUBSET/EXCEPTION STRUCTURES:
"General rule Y applies, except in case Z where the opposite is true."
Look for: Any case where a general principle has a notable exception.

TRADEOFF STRUCTURES:
"Optimizing for X unavoidably reduces Y."
Look for: Any case where improving one dimension sacrifices another.

EMERGENCE STRUCTURES:
"Individual elements have property A, but together they produce property B."
Look for: Any case where the whole has a property its parts don't.

THRESHOLD STRUCTURES:
"Below level L, X has one effect; above L, X has the opposite effect."
Look for: Any case where quantity or degree determines direction of effect.`,
        },
        {
          title: "Avoiding Analogy Traps",
          content: `TRAP 1 — SAME TOPIC, WRONG STRUCTURE
The most seductive wrong answer involves the SAME SUBJECT as the passage but a DIFFERENT structure.
If the passage discusses medicine, the most tempting wrong answer will also involve medicine — but with a different relationship.
LSAT analogy correct answers almost always use a DIFFERENT domain from the passage.

TRAP 2 — SAME STRUCTURE, WRONG DIRECTION
The relationship is mirrored — the cause and effect are reversed. Always verify you have the same directionality.

TRAP 3 — RELATED BUT INCOMPLETE
The answer captures PART of the structure but misses a key element.
If the passage has three key elements in a relationship, the correct answer must have three corresponding elements.

TRAP 4 — LITERAL SIMILARITY
An answer that's about the same subject/field as the passage — but the relationship is completely different.

VERIFICATION:
Draw a simple diagram of the passage relationship: [A] → [B] → [C]
Then diagram your chosen answer: [X] → [Y] → [Z]
Each arrow must represent the same type of relationship for the analogy to hold.`,
        },
      ],
      levels: [{level:1,desc:"Simple one-step structural analogies"},{level:2,desc:"Two-element relationship matching"},{level:3,desc:"Complex multi-element analogies"},{level:4,desc:"Full test difficulty — subtle structural matching"}]
    },
    {
      type: "Comparative Passage",
      tagline: "Compare and synthesize two related passages on the same topic.",
      why: "Comparative passages mirror real legal practice — lawyers constantly synthesize multiple sources with related but distinct perspectives. This question type rewards organized, systematic reading.",
      sections: [
        {
          title: "How Comparative Passages Work",
          content: `Comparative passages give you TWO shorter passages on related topics (Passage A and Passage B). They're always related — same topic, different perspectives, arguments, or emphases.

Questions will ask about:
• Where the passages AGREE
• Where they DISAGREE
• How one author would respond to the other
• What both authors would accept
• How the passages relate in structure or purpose

THE RELATIONSHIP TYPES:
Authors may DISAGREE on: facts, interpretations, the significance of evidence, or policy recommendations.
Authors may AGREE on: background facts, the importance of the topic, or certain principles — while disagreeing on the conclusion.

Note: They rarely completely agree or completely disagree. The interesting questions are about the NUANCES of agreement and disagreement.`,
        },
        {
          title: "The Relationship Map Strategy",
          content: `As you read, build a RELATIONSHIP MAP in your mind:

FOR EACH PASSAGE, NOTE:
• Main argument: What does this author ultimately claim?
• Key evidence: What do they use to support it?
• Stance: How strong/confident is this author?

COMPARE:
• Where are they talking about the same things?
• Do they reach the same or different conclusions about those things?
• Does one author's argument address (or fail to address) the other's claims?

RELATIONSHIP MAP TEMPLATE:
Passage A argues: ___________
Passage B argues: ___________
They both accept: ___________
They disagree about: ___________
A would say about B's argument: ___________
B would say about A's argument: ___________

Filling this in (even mentally) before answering questions saves time and prevents errors.`,
        },
        {
          title: "Agreement and Disagreement Questions",
          content: `AGREEMENT QUESTIONS: "Both authors would agree that...?"

PROCESS:
1. Find the answer choice
2. Ask: "Does Passage A support this?" Find the evidence.
3. Ask: "Does Passage B support this?" Find the evidence.
4. Only if BOTH support it → likely correct

TRAP: An answer supported by Passage A but contradicted or ignored by Passage B. The LSAT deliberately includes these tempting half-answers.

DISAGREEMENT QUESTIONS: "The authors disagree about...?"

PROCESS:
1. Find the answer choice
2. Ask: "What does Passage A say about this?" (Position X)
3. Ask: "What does Passage B say about this?" (Position Y)
4. Do X and Y CONFLICT? If yes → correct

TRAP: A topic both authors discuss but from which no clear disagreement emerges — they talk around the same issue but don't directly contradict each other.

KEY INSIGHT: For a genuine disagreement, both authors must address the SAME SPECIFIC CLAIM and take OPPOSITE SIDES. It's not enough that they reach different conclusions — they must directly contradict each other on a particular point.`,
        },
        {
          title: "Cross-Passage Response Questions",
          content: `These questions ask how one author would respond to something in the other passage.

Example: "How would the author of Passage B most likely respond to the argument made in paragraph 2 of Passage A?"

PROCESS:
1. UNDERSTAND what Passage A's paragraph 2 argues
2. UNDERSTAND Passage B's position and how it relates
3. Apply Passage B's logic to Passage A's argument

This requires holding both arguments in mind simultaneously.

TYPES OF RESPONSES:
"The author of B would argue that A overstates the significance of X." (challenges the weight given to evidence)
"The author of B would point out that A's argument fails to account for Y." (identifies a gap)
"The author of B would accept A's premise but dispute the conclusion." (concedes and challenges)
"The author of B would cite Z as evidence that undermines A's conclusion." (provides counterevidence)

TRAP: Applying Passage A's position to evaluate Passage B, or vice versa — mixing up the authors.

FINAL TIP: On comparative passage questions, always re-check which author the question is asking about. Mixing up Passage A and Passage B is the most common error.`,
        },
      ],
      levels: [{level:1,desc:"Clearly contrasting passages with obvious agreement/disagreement"},{level:2,desc:"Subtler differences in emphasis and conclusion"},{level:3,desc:"Complex synthesis across multiple question types"},{level:4,desc:"Full test difficulty — nuanced cross-passage analysis"}]
    },
  ],
};


// ─── DESIGN ───────────────────────────────────────────────────────────────────
const LIGHT={
  bg:"#f0f4fc",surface:"#ffffff",surfaceHigh:"#e8eef8",border:"#d0daea",
  text:"#0d1526",textMuted:"#7a8aaa",textSub:"#3a4d70",
  accent:"#3a6bff",accentSoft:"#dce8ff",
  gold:"#c09000",goldSoft:"#fff8dc",
  success:"#0f9e72",danger:"#e03a3a",purple:"#7c3aed",pink:"#db2777",
  teal:"#0891b2",orange:"#ea580c",
};
const DARK={
  bg:"#06080f",surface:"#0c1220",surfaceHigh:"#131c30",border:"#1c2744",
  text:"#edf2ff",textMuted:"#4a5c80",textSub:"#7a90bb",
  accent:"#4f7fff",accentSoft:"#162448",
  gold:"#f5c842",goldSoft:"#241d08",
  success:"#2dd4a0",danger:"#f87171",purple:"#a78bfa",pink:"#f472b6",
  teal:"#22d3ee",orange:"#fb923c",
};
let C=DARK;
let FONT_SCALE=1;
const T={serif:"'Georgia','Times New Roman',serif",sans:"'Inter',system-ui,-apple-system,sans-serif"};

const AVATAR_COLORS=["#4f7fff","#a78bfa","#f472b6","#22d3ee","#2dd4a0","#fb923c","#f5c842","#f87171"];

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Tag({children,color=C.accent}){
  return <span style={{display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 10px",borderRadius:20,background:color+"1a",color,border:`1px solid ${color}33`,marginRight:5,marginBottom:4}}>{children}</span>;
}
function Pill({children,active,onClick,color=C.accent}){
  return <button onClick={onClick} aria-pressed={active} style={{background:active?color+"20":"transparent",border:`1.5px solid ${active?color:C.border}`,borderRadius:10,padding:"10px 16px",cursor:"pointer",color:active?color:C.textMuted,fontSize:14,textAlign:"left",transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.4,fontWeight:active?600:400,outline:"none"}}>{children}</button>;
}
function Btn({children,onClick,disabled,ghost,danger:isDanger,style={},small,type="button",ariaLabel}){
  if(ghost)return <button type={type} onClick={onClick} aria-label={ariaLabel} style={{background:"transparent",border:`1px solid ${isDanger?C.danger+"66":C.border}`,borderRadius:10,color:isDanger?C.danger:C.textSub,fontSize:small?12:13,padding:small?"6px 14px":"9px 18px",cursor:"pointer",fontFamily:T.sans,outline:"none",transition:"all 0.15s",...style}}>{children}</button>;
  return <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} style={{background:disabled?C.surfaceHigh:"linear-gradient(135deg,#3a6bff,#6a9fff)",color:disabled?C.textMuted:"#fff",border:"none",borderRadius:12,padding:small?"9px 20px":"14px 28px",fontSize:small?13:15,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:T.sans,opacity:disabled?0.5:1,boxShadow:disabled?"none":"0 4px 24px #3a6bff55",transition:"all 0.2s",outline:"none",...style}}>{children}</button>;
}
function Card({children,style={},onClick,role,ariaLabel}){
  return <div onClick={onClick} role={role} aria-label={ariaLabel} tabIndex={onClick?0:undefined}
    onKeyDown={onClick?(e)=>{if(e.key==="Enter"||e.key===" ")onClick();}:undefined}
    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:24,cursor:onClick?"pointer":"default",transition:"all 0.2s",outline:"none",...style}}>{children}</div>;
}
function Finput({label,type="text",value,onChange,placeholder,id,autoFocus,required}){
  return(
    <div style={{marginBottom:14}}>
      {label&&<label htmlFor={id} style={{display:"block",fontSize:13,color:C.textSub,marginBottom:6,fontWeight:600}}>{label}{required&&<span style={{color:C.danger,marginLeft:3}}>*</span>}</label>}
      <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} required={required}
        style={{width:"100%",background:C.surfaceHigh,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.text,fontSize:15,fontFamily:T.sans,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
        onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
    </div>
  );
}
function XPBar({xp,level}){
  const p=(xp%XP_PER_LEVEL)/XP_PER_LEVEL;
  return <div style={{display:"flex",alignItems:"center",gap:10}} role="progressbar" aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${level}`}>
    <span style={{fontSize:12,fontWeight:700,color:C.gold,whiteSpace:"nowrap"}}>Lv {level}</span>
    <div style={{flex:1,background:C.surfaceHigh,borderRadius:4,height:6,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${p*100}%`,background:`linear-gradient(90deg,${C.gold},#ffad42)`,borderRadius:4,transition:"width 0.6s ease"}}/>
    </div>
    <span style={{fontSize:11,color:C.textMuted,whiteSpace:"nowrap"}}>{xp%XP_PER_LEVEL}/{XP_PER_LEVEL}</span>
  </div>;
}
function Spinner({label="Lumora is thinking…"}){
  return <div role="status" aria-live="polite" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18,padding:"44px 0"}}>
    <div style={{position:"relative",width:50,height:50}} aria-hidden="true">
      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${C.border}`}}/>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${C.accent}`,borderTopColor:"transparent",animation:"spin 0.9s linear infinite"}}/>
    </div>
    <span style={{color:C.textMuted,fontSize:14}}>{label}</span>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} *:focus-visible{outline:2px solid ${C.accent}!important;outline-offset:2px!important;}`}</style>
  </div>;
}
function Arc({pct,size=100,color=C.accent,label=""}){
  const r=size/2-9;const circ=2*Math.PI*r;
  return <svg width={size} height={size} role="img" aria-label={label||`${pct}%`}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surfaceHigh} strokeWidth={8}/>
    {pct!==null&&<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 0.7s ease"}}/>}
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill={C.text} fontSize={size*0.2} fontWeight="700" fontFamily={T.sans}>{pct!==null?pct+"%":"—"}</text>
  </svg>;
}
function ErrBanner({message,onDismiss}){
  if(!message)return null;
  return <div role="alert" style={{background:"#2d0a0a",border:`1px solid ${C.danger}44`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"flex-start",gap:10}}>
    <span style={{color:C.danger,fontSize:16,flexShrink:0}}>⚠</span>
    <span style={{color:"#fca5a5",fontSize:14,flex:1,lineHeight:1.6}}>{message}</span>
    {onDismiss&&<button onClick={onDismiss} aria-label="Dismiss" style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:16,padding:0}}>×</button>}
  </div>;
}
function Avatar({user,size=40}){
  const color=AVATAR_COLORS[(user.avatarColor||0)%AVATAR_COLORS.length];
  if(user.avatarEmoji)return <div style={{width:size,height:size,borderRadius:"50%",background:color+"22",border:`2px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.45,flexShrink:0}}>{user.avatarEmoji}</div>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}99)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:size*0.38,flexShrink:0,fontFamily:T.sans}}>{user.name?.[0]?.toUpperCase()||"L"}</div>;
}

// ─── WRITING PROMPTS (seed templates — AI generates fresh variations) ──────────
const WRITING_SEEDS=[
  {topic:"AI in Criminal Sentencing",keyQuestion:"To what extent should AI-driven risk assessment tools inform criminal sentencing decisions?",context:"Courts are considering AI tools that analyze defendant data to predict recidivism risk.",perspectiveThemes:["Efficiency & Consistency","Due Process & Transparency","Structural Bias","Human Dignity & Individualization"]},
  {topic:"Mandatory Pro Bono for Attorneys",keyQuestion:"Should bar associations require licensed attorneys to complete minimum pro bono hours as a condition of licensure?",context:"Millions face civil legal matters without counsel.",perspectiveThemes:["Access to Justice","Professional Autonomy","Systemic Reform","Market Equity"]},
  {topic:"Social Media Liability",keyQuestion:"Should social media companies be held legally liable for harms caused by user-generated content?",context:"Section 230 currently shields platforms from liability for user content.",perspectiveThemes:["Corporate Accountability","Free Expression","Innovation & Competition","Public Health"]},
  {topic:"Predictive Policing",keyQuestion:"Should law enforcement agencies be permitted to use predictive policing algorithms to allocate resources?",context:"Police departments use data analytics to predict where crimes are likely to occur.",perspectiveThemes:["Crime Prevention","Civil Liberties","Racial Equity","Democratic Oversight"]},
  {topic:"Mandatory Vaccination Policy",keyQuestion:"Under what conditions, if any, should governments mandate vaccinations for communicable diseases?",context:"Public health authorities debate the limits of government power to require vaccination.",perspectiveThemes:["Public Health Necessity","Individual Liberty","Medical Ethics","Democratic Legitimacy"]},
];

// ─── FLAW LAB SEEDS (AI generates fresh arguments in these styles) ─────────────
const FLAW_SEEDS=[
  {style:"Statistical Fallacy",description:"An argument that misuses statistics — small samples, false extrapolation, or cherry-picked data.",legalContext:"Legislative testimony or policy advocacy"},
  {style:"False Causation",description:"An argument that confuses correlation with causation, or assumes one event caused another simply because it preceded it.",legalContext:"Expert witness testimony or regulatory justification"},
  {style:"Appeal to Authority / Ad Hominem",description:"An argument that relies improperly on the credibility (or lack thereof) of a person rather than the merits of the argument.",legalContext:"Legal brief or courtroom argument"},
  {style:"False Dilemma",description:"An argument that presents only two options when more exist, forcing a choice between extremes.",legalContext:"Policy debate or legislative hearing"},
  {style:"Hasty Generalization",description:"An argument that draws a broad conclusion from insufficient or unrepresentative evidence.",legalContext:"Law enforcement testimony or judicial opinion"},
  {style:"Circular Reasoning",description:"An argument where the conclusion is smuggled into the premises — the argument assumes what it is trying to prove.",legalContext:"Legal opinion or academic argument"},
];

// ─── PRACTICE SYSTEM PROMPT ───────────────────────────────────────────────────
// Session-level question history to prevent duplicates
const sessionQHistory = [];

// LSAT-calibrated domain pool based on actual PrepTest analysis
// Real LSAT uses: economics, law, philosophy, sociology, psychology, history,
// biology (sparingly), literary criticism, science policy, linguistics, ethics
const DOMAIN_WHEEL = [
  "an economic policy debate — interest rates, inflation, or trade agreements",
  "a legal or judicial proceeding — sentencing, evidence rules, or judicial appointments",
  "a philosophical argument about ethics, consciousness, or moral responsibility",
  "a sociological study of human behavior — workplace dynamics, crime, or social norms",
  "a psychological experiment or cognitive research finding",
  "a medical or public health policy — drug trials, treatment protocols, or epidemiology",
  "an environmental science debate — climate policy, conservation, or resource management",
  "a historical claim about ancient or medieval civilizations",
  "a literary or artistic criticism dispute — aesthetic value, authorship, or interpretation",
  "a political science argument — democracy, international relations, or governance",
  "a business ethics scenario — corporate policy, advertising, or labor practices",
  "a linguistics or language acquisition research finding",
  "a technology policy debate — intellectual property, regulation, or innovation",
  "a nutrition or health behavior study — diet, exercise, or lifestyle choices",
  "a criminal justice policy argument — deterrence, rehabilitation, or sentencing",
  "an education policy debate — curriculum, assessment, or institutional reform",
  "an anthropological or archaeological research finding",
  "a financial regulation or economics argument — market behavior, investment, or banking",
  "a media ethics debate — journalism standards, press freedom, or public perception",
  "a scientific philosophy argument — methodology, peer review, or research integrity",
  "a demographics or population study — migration, birth rates, or social change",
  "an organizational behavior scenario — management, productivity, or workplace culture",
  "a constitutional law or civil rights argument",
  "a public administration policy — urban planning, infrastructure, or taxation",
  "a bioethics debate — medical consent, research ethics, or life sciences policy",
];
let domainWheelIdx = Math.floor(Math.random() * DOMAIN_WHEEL.length);

const PRACTICE_SYSTEM=(function(){
  var s="You are an expert LSAT question author. Generate original Logical Reasoning questions.";

  s+=" YOUR CORE OBLIGATION: Every question must be 100% original. Do NOT reproduce, closely paraphrase,";
  s+=" or structurally mirror any question from any published LSAT PrepTest. Do not use scenarios,";
  s+=" argument structures, or specific factual claims that appear in any official LSAT question.";
  s+=" Invent entirely new scenarios, new entities, new causal claims, new statistics.";
  s+=" A test-taker who has studied every PrepTest should find your question completely unfamiliar.";

  s+=" QUESTION ARCHITECTURE:";
  s+=" Stimulus: 2-4 sentences, 40-80 words. Start with a fact, observation, statistic, policy claim,";
  s+=" or a labeled professional (Economist:, Biologist:, Historian:). Never open with";
  s+=" '[Name] believes' or 'Many people think.' One clear conclusion marked by 'therefore,' 'thus,' or 'so.'";
  s+=" The logical gap between evidence and conclusion is the heart of the question.";

  s+=" STIMULUS TYPES — rotate through these:";
  s+=" (1) Factual claim + conclusion with an unstated assumption";
  s+=" (2) Correlation presented as causation";
  s+=" (3) Policy or principle argument citing a comparison or precedent";
  s+=" (4) Conditional logic chain using quantifiers (all, some, most, no, only)";
  s+=" (5) Paradox — two facts that appear contradictory, question asks for resolution";
  s+=" (6) Labeled professional (Economist:, Engineer:, Historian:) making a specific argument";
  s+=" (7) Two-speaker dialogue — ONLY for Point at Issue or Method of Reasoning questions";
  s+=" (8) Editorial or normative claim with cost-benefit reasoning";

  s+=" ANSWER CHOICES:";
  s+=" One correct answer. Four wrong answers, each failing for a precise, nameable reason:";
  s+=" Too Broad (overclaims), Reverses Logic (wrong direction), Irrelevant (different gap),";
  s+=" Too Extreme (uses always/never where stimulus only supports some/most),";
  s+=" or Restatement (paraphrases a premise instead of supplying the missing link).";
  s+=" Each choice: 10-25 words. Abstract and general, not loaded with proper nouns.";

  s+=" DOMAIN ROTATION — use fresh, original scenarios from varied fields:";
  s+=" Economics, environmental science, medicine, criminal justice, philosophy, linguistics,";
  s+=" urban planning, technology policy, archaeology, nutrition science, labor economics,";
  s+=" constitutional law, marine biology, education policy, media ethics. Never repeat the";
  s+=" same domain twice in a row. Never use animal predator/prey as the primary argument structure.";

  s+=" LEVEL CALIBRATION:";
  s+=" Level 1: Simple gap, obvious correct answer, everyday scenario.";
  s+=" Level 2: Two-step reasoning, moderate vocabulary.";
  s+=" Level 3: Subtle gap, plausible distractors, academic vocabulary.";
  s+=" Level 4: Precisely calibrated distractors, conditional logic, maximum subtlety — still under 80 words.";

  s+=" ABSOLUTE BANS:";
  s+=" No placeholder city names: Millbrook, Westville, Eastbrook, Riverside, Springfield, Greenfield.";
  s+=" No opening: 'Many people believe,' 'It is widely thought,' 'Most experts agree.'";
  s+=" No reproducing or closely mirroring any published LSAT stimulus, scenario, or argument.";

  s+=' Distribute correct answers evenly across A, B, C, D, E — not always B.';
  s+=' Respond ONLY with valid JSON, no markdown:';
  s+=' {"stimulus":"...","question":"...","choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct":"C","explanation":"CORRECT (C): [precise reason]. WRONG (A): [trap type + reason]. WRONG (B): [trap type + reason]. WRONG (D): [trap type + reason]. WRONG (E): [trap type + reason].","key_concept":"One sentence naming the precise logical skill tested.","level":2}';
  return s;
})();


function buildQ(sec,level,qType,profile,recentTopics=[]){
  domainWheelIdx=(domainWheelIdx+1)%DOMAIN_WHEEL.length;
  const domain=DOMAIN_WHEEL[domainWheelIdx];
  const domainBlock=recentTopics.length>0?" Do NOT use these recent domains/structures: "+recentTopics.filter(t=>t.startsWith("DOM:")).map(t=>t.slice(4)).join(", ")+".":"";
  const topicBlock=recentTopics.filter(t=>!t.startsWith("DOM:")).length>0?" Avoid these recent topics: "+recentTopics.filter(t=>!t.startsWith("DOM:")).join(" | ")+".":"";

  // Rotate correct answer letter to prevent B-always bias
  const ANSWER_LETTERS=["A","B","C","D","E"];
  const correctLetter=ANSWER_LETTERS[Math.floor(Math.random()*5)];

    // Pick stimulus type based on question type — dialogues only when appropriate
  var stimType;
  if(qType==="Method of Reasoning"||qType==="Parallel Reasoning"){
    const dialogTypes=["TYPE 6 — NAMED PROFESSIONAL","TYPE 7 — TWO-SPEAKER DIALOGUE","TYPE 8 — EDITORIAL"];
    stimType=dialogTypes[Math.floor(Math.random()*dialogTypes.length)];
  } else if(qType==="Paradox"){
    stimType="TYPE 5 — PARADOX";
  } else if(qType==="Inference"||qType==="Assumption"){
    const inferTypes=["TYPE 1 — REPORTED OBSERVATION","TYPE 2 — CAUSAL ARGUMENT","TYPE 4 — CONDITIONAL LOGIC CHAIN","TYPE 6 — NAMED PROFESSIONAL"];
    stimType=inferTypes[Math.floor(Math.random()*inferTypes.length)];
  } else {
    const allTypes=["TYPE 1 — REPORTED OBSERVATION","TYPE 2 — CAUSAL ARGUMENT","TYPE 3 — POLICY ARGUMENT","TYPE 4 — CONDITIONAL LOGIC CHAIN","TYPE 6 — NAMED PROFESSIONAL","TYPE 8 — EDITORIAL"];
    stimType=allTypes[Math.floor(Math.random()*allTypes.length)];
  }

  // Word count targets by level
  var wcTarget=level===1?"35-55":level===2?"45-65":level===3?"55-75":"65-90";
  return "Generate a Level "+level+" (1=simplest, 4=official LSAT difficulty) LSAT "+sec+" question of type: "+qType+" — IMPORTANT: Make answer choice "+correctLetter+" the correct answer. Write the question so that "+correctLetter+" is correct, then write four wrong answer choices for the other letters."+
    ". SET THE SCENARIO IN: "+domain+". USE STIMULUS STRUCTURE: "+stimType+"."+domainBlock+topicBlock+
    " WORD COUNT REQUIREMENT: The LR stimulus must be "+wcTarget+" words total. Count words before outputting. Never exceed the upper limit."+
    " Higher difficulty means subtler logic and trickier distractors, NOT more words. Level 4 is still under 90 words."+
    " Student's target score: "+(profile?.target_score||"165+")+"."+
    (sec==="Reading Comprehension"?" For RC: write a passage of 430-500 words on '"+domain+"'. Open with a specific claim or observation (not 'In recent years...'), develop a clear author stance, include one nuance or complication. Then write a single "+qType+" question with 5 answer choices each 10-25 words.":" CRITICAL FOR LR: Open with a fact, observation, statistic, or labeled professional — NEVER a named person's belief. Include a clear conclusion signaled by 'thus,' 'therefore,' 'so,' or 'hence.' The logical gap between evidence and conclusion is the entire point of the question.");}





// ════════════════════════════════════════════════════════════════════════════
// LEX — THE LUMORA LSAT MONKEY
// ════════════════════════════════════════════════════════════════════════════

// ─── MONKEY CONSTANTS ────────────────────────────────────────────────────────
const LEX_NAME_KEY="lumora_lex_name";
const LEX_POINTS_KEY="lumora_lex_points";
const LEX_OUTFIT_KEY="lumora_lex_outfit";
const LEX_INTRO_KEY="lumora_lex_intro_done";

const LEX_IDLE_MS=90000; // 90s idle before Lex pops up

const LEX_OUTFITS={
  none:{label:"Classic Vest",cost:0,color:"#1e3a5f",accent:"#4f7fff"},
  lawyer:{label:"Lawyer Suit",cost:200,color:"#1a1a2e",accent:"#c0a060"},
  graduate:{label:"Grad Gown",cost:150,color:"#2d0057",accent:"#a78bfa"},
  casual:{label:"Casual Tee",cost:100,color:"#1a3a1a",accent:"#2dd4a0"},
  champion:{label:"Gold Champion",cost:500,color:"#4a3000",accent:"#f5c842"},
};

const LEX_HATS={
  none:{label:"No Hat",cost:0},
  mortarboard:{label:"Mortarboard",cost:75},
  tophat:{label:"Top Hat",cost:150},
  beanie:{label:"Study Beanie",cost:50},
  crown:{label:"Crown",cost:400},
};

const LEX_GLASSES={
  none:{label:"No Glasses",cost:0},
  round:{label:"Round Specs",cost:60},
  cool:{label:"Cool Shades",cost:80},
  monocle:{label:"Monocle",cost:120},
};

const LEX_IDLE_QUIPS=[
  "Quit monkeying around! 🐵",
  "Still here? Your practice questions are lonely.",
  "A watched LSAT question never answers itself…",
  "I'm not saying you're procrastinating, but… you're procrastinating.",
  "The LSAT waits for no one. Neither does Lex.",
  "Fun fact: staring at the screen burns zero brain calories.",
  "Go bananas on a practice question!",
  "Your future law school self is watching. 👀",
  "Even monkeys know when to get back to work.",
  "Ready when you are, counselor.",
];

const LEX_MISS_QUIPS=[
  "I missed you! Your streak needs you back.",
  "The LSAT doesn't take days off. Just saying. 🍌",
  "I've been here the whole time. Have you?",
  "A rusty LSAT brain is a sad Lex. Please come back.",
  "Your goals texted. They want to know where you've been.",
];

const LEX_WIN_QUIPS=[
  "That's what I'm talking about! 🎉",
  "Counselor material RIGHT THERE.",
  "You're making me proud over here!",
  "The LSAT doesn't know what's coming for it.",
  "Keep it up and we'll be celebrating law school together!",
  "Boom! Another step closer to that acceptance letter.",
];

const LEX_LOSE_QUIPS=[
  "Hey — every wrong answer is a right lesson. Let's review it.",
  "The best lawyers learned from their mistakes. This is yours.",
  "Don't sweat it. Even Lex gets things wrong sometimes. 🐵",
  "Wrong now. Right later. That's how this works.",
  "The only real mistake is not trying again. You've got this.",
];

function getLexPoints(email){
  try{return parseInt(localStorage.getItem(LEX_POINTS_KEY+(email||""))||"0");}
  catch{return 0;}
}
function setLexPoints(email,pts){
  try{localStorage.setItem(LEX_POINTS_KEY+(email||""),String(Math.max(0,pts)));}
  catch{}
}
function getLexOutfit(email){
  try{return JSON.parse(localStorage.getItem(LEX_OUTFIT_KEY+(email||""))||
    '{"outfit":"none","hat":"none","glasses":"none"}');}
  catch{return{outfit:"none",hat:"none",glasses:"none"};}
}
function setLexOutfit(email,o){
  try{localStorage.setItem(LEX_OUTFIT_KEY+(email||""),JSON.stringify(o));}
  catch{}
}

// ─── LEX SVG CHARACTER ───────────────────────────────────────────────────────
// pose: idle | happy | celebrate | sad | think | excited | sleep
// outfit, hat, glasses from customizer
const LEX_IMG="data:image/png;base64,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";

function LexSVG({pose="idle",size=120,outfit="none",hat="none",glasses="none",animate=true}){
  const poseStyles={
    idle:     {rot:0,  flipX:false,bright:1,   sat:1,  hue:0,  speed:3,  jump:false},
    happy:    {rot:0,  flipX:false,bright:1.05,sat:1.1,hue:0,  speed:2,  jump:false},
    celebrate:{rot:4,  flipX:false,bright:1.1, sat:1.2,hue:0,  speed:0.5,jump:true},
    sad:      {rot:-5, flipX:false,bright:0.82,sat:0.5,hue:210,speed:4.5,jump:false},
    think:    {rot:-2, flipX:true, bright:0.95,sat:0.9,hue:0,  speed:3.5,jump:false},
    excited:  {rot:6,  flipX:false,bright:1.12,sat:1.3,hue:0,  speed:0.4,jump:true},
    sleep:    {rot:-10,flipX:false,bright:0.65,sat:0.4,hue:220,speed:5.5,jump:false},
  };
  const P=poseStyles[pose]||poseStyles.idle;
  const flip=P.flipX?"scaleX(-1)":"scaleX(1)";
  const rot="rotate("+P.rot+"deg)";
  const filt="brightness("+P.bright+") saturate("+P.sat+") hue-rotate("+P.hue+"deg)";
  const wrapAnim=animate?{animation:(P.jump?"lexJump":"lexBob")+" "+P.speed+"s ease-in-out infinite "+(P.jump?"alternate":""),transformOrigin:"center bottom"}:{};
  return(
    <div style={{width:size,height:size,display:"inline-flex",alignItems:"flex-end",
      justifyContent:"center",flexShrink:0,...wrapAnim}}>
      <style>{`
        @keyframes lexBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes lexJump{from{transform:translateY(0)}to{transform:translateY(-16px)}}
      `}</style>
      <img src={LEX_IMG} alt={"Lex "+pose}
        style={{width:size,height:size,objectFit:"contain",
          transform:flip+" "+rot,filter:filt,display:"block"}}/>
    </div>
  );
}


// ─── MONKEY BUBBLE (floating popup) ──────────────────────────────────────────
function MonkeyBubble({pose="happy",message,onDismiss,size=70,outfit,hat,glasses,position="bottom-right",autoClose=4000}){
  const [visible,setVisible]=useState(true);
  const lexOutfit=outfit||"none";
  const lexHat=hat||"none";
  const lexGlasses=glasses||"none";

  useEffect(()=>{
    if(!autoClose)return;
    const t=setTimeout(()=>{setVisible(false);if(onDismiss)onDismiss();},autoClose);
    return()=>clearTimeout(t);
  },[autoClose,onDismiss]);

  if(!visible)return null;

  const posStyles={
    "bottom-right":{position:"fixed",bottom:80,right:20,zIndex:500},
    "bottom-left":{position:"fixed",bottom:80,left:20,zIndex:500},
    "bottom-center":{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:500},
    "inline":{position:"relative",display:"inline-flex"},
  };

  return(
    <div style={{...posStyles[position],display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,
      animation:"lexSlideUp 0.3s ease"}}>
      <style>{`
        @keyframes lexSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      {/* Speech bubble */}
      {message&&(
        <div style={{background:"white",borderRadius:16,padding:"10px 14px",maxWidth:220,
          boxShadow:"0 4px 20px #00000033",position:"relative",marginBottom:4}}>
          <p style={{margin:0,fontSize:13,color:"#1a1a2e",lineHeight:1.5,fontFamily:T.sans,fontWeight:500}}>
            {message}
          </p>
          {/* Bubble tail pointing down-right */}
          <div style={{position:"absolute",bottom:-8,right:28,width:0,height:0,
            borderLeft:"8px solid transparent",borderRight:"8px solid transparent",
            borderTop:"8px solid white"}}/>
          {onDismiss&&(
            <button onClick={()=>{setVisible(false);onDismiss();}}
              style={{position:"absolute",top:4,right:6,background:"none",border:"none",
                color:"#999",fontSize:14,cursor:"pointer",lineHeight:1}}>×</button>
          )}
        </div>
      )}
      {/* Lex */}
      <div style={{cursor:onDismiss?"pointer":"default"}} onClick={onDismiss?()=>{setVisible(false);onDismiss();}:undefined}>
        <LexSVG pose={pose} size={90} outfit={lexOutfit} hat={lexHat} glasses={lexGlasses}/>
      </div>
    </div>
  );
}

// ─── MONKEY CHAT INTERFACE ────────────────────────────────────────────────────
function MonkeyChat({user,onUpdateUser,onClose,onNavigate}){
  const [input,setInput]=useState("");
  const [msgs,setMsgs]=useState([
    {role:"lex",text:"Hey! I'm Lex 🐵 Ask me anything about the app or the LSAT. I can guide you anywhere!"}
  ]);
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const lexO=getLexOutfit(user?.email);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const NAVIGATION_KEYWORDS={
    practice:["practice","question","drill","adaptive","train"],
    learn:["learn","lesson","tutorial","teach","explain","understand"],
    quick5:["quick","five","5","fast","quick5","timed question"],
    flaw:["flaw","fallacy","flaw lab","argument","logical error"],
    writing:["writing","essay","write","argument writing"],
    fullsection:["full section","full test","timed test","section"],
    mistakes:["mistake","wrong","error","journal","review wrong"],
    srs:["srs","spaced","review","repetition"],
    plan:["plan","study plan","schedule","roadmap"],
    dashboard:["progress","score","analytics","dashboard","stats","predictor"],
    daily:["daily","challenge","daily challenge"],
    profile:["profile","avatar","customize","outfit","settings"],
  };

  const detectNav=(text)=>{
    const lower=text.toLowerCase();
    for(const[screen,keywords]of Object.entries(NAVIGATION_KEYWORDS)){
      if(keywords.some(k=>lower.includes(k)))return screen;
    }
    return null;
  };

  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg=input.trim();
    setInput("");
    const newMsgs=[...msgs,{role:"user",text:userMsg}];
    setMsgs(newMsgs);
    setLoading(true);

    // Check for navigation intent first
    const navTarget=detectNav(userMsg);

    try{
      const sys="You are Lex, a friendly, witty monkey mascot for Lumora LSAT — an AI-powered LSAT prep app. "+
        "You are helpful, encouraging, and occasionally make light monkey puns (never overdo it). "+
        "You guide students through the app and answer LSAT questions. Keep responses SHORT — 1-3 sentences max. "+
        "If the user asks about a feature, explain it briefly. If they ask an LSAT question, answer it directly. "+
        "App sections: Practice (adaptive LR/RC questions), Learn (17 question type lessons), Quick 5 (5 timed LR questions), "+
        "Daily Challenge (1 question per day, 2x XP), Flaw Lab (identify logical flaws), Writing (LSAC-format essays), "+
        "Full Section (35-min simulation), Mistake Journal (review wrong answers + Teach It Back), "+
        "SRS Review (spaced repetition), Study Plan, Progress (score predictor + analytics). "+
        "The LSAT has Logical Reasoning (argument analysis) and Reading Comprehension sections. "+
        "Be warm, brief, and always end with encouragement. Sign off as Lex.";
      const raw=await callClaude(sys,userMsg,300);
      const lexMsg={role:"lex",text:raw};
      if(navTarget){
        lexMsg.nav=navTarget;
        lexMsg.navLabel="Take me there →";
      }
      setMsgs(m=>[...m,lexMsg]);
    }catch{
      setMsgs(m=>[...m,{role:"lex",text:"Oops — my banana phone dropped the call! Try again in a sec. 🐵"}]);
    }
    setLoading(false);
  };

  return(
    <div style={{position:"fixed",bottom:72,right:16,width:300,
      background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,
      boxShadow:"0 8px 40px #00000055",zIndex:490,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#3a6bff,#a78bfa)",padding:"12px 16px",
        display:"flex",alignItems:"center",gap:10}}>
        <LexSVG pose="happy" size={60} outfit={lexO.outfit} hat={lexO.hat} glasses={lexO.glasses} animate={false}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,color:"white",fontSize:14}}>Lex</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>Your LSAT Guide</div>
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",color:"rgba(255,255,255,0.8)",
            fontSize:20,cursor:"pointer",lineHeight:1,padding:"2px 6px"}}>×</button>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:12,maxHeight:280,
        display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(
          <div key={i}>
            <div style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              {m.role==="lex"&&<div style={{marginRight:6,flexShrink:0}}>
                <LexSVG pose="idle" size={40} outfit={lexO.outfit} hat={lexO.hat} glasses={lexO.glasses} animate={false}/>
              </div>}
              <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:14,fontSize:13,lineHeight:1.55,
                background:m.role==="user"?"linear-gradient(135deg,#3a6bff,#6a9fff)":"#1e2d4e",
                color:m.role==="user"?"white":C.text,
                borderBottomRightRadius:m.role==="user"?4:14,
                borderBottomLeftRadius:m.role==="lex"?4:14}}>
                {m.text}
              </div>
            </div>
            {m.nav&&onNavigate&&(
              <div style={{display:"flex",justifyContent:"flex-start",marginTop:4,marginLeft:34}}>
                <button onClick={()=>{onNavigate(m.nav);onClose();}}
                  style={{background:C.accentSoft,border:`1px solid ${C.accent}44`,borderRadius:10,
                    padding:"4px 12px",fontSize:12,color:C.accent,cursor:"pointer",
                    fontFamily:T.sans,fontWeight:600}}>
                  {m.navLabel||"Take me there →"}
                </button>
              </div>
            )}
          </div>
        ))}
        {loading&&<div style={{display:"flex",alignItems:"center",gap:6}}>
          <LexSVG pose="think" size={40} outfit={lexO.outfit} animate={false}/>
          <div style={{fontSize:13,color:C.textMuted}}>Thinking…</div>
        </div>}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Ask Lex anything…"
          style={{flex:1,background:C.surfaceHigh,border:`1px solid ${C.border}`,
            borderRadius:10,padding:"8px 12px",color:C.text,fontSize:13,
            fontFamily:T.sans,outline:"none"}}/>
        <button onClick={send} disabled={!input.trim()||loading}
          style={{background:"linear-gradient(135deg,#3a6bff,#a78bfa)",border:"none",
            borderRadius:10,padding:"8px 14px",color:"white",cursor:"pointer",
            fontSize:13,fontWeight:700,opacity:!input.trim()||loading?0.5:1}}>↑</button>
      </div>
    </div>
  );
}

// ─── MONKEY BAR (always-visible bottom bar) ───────────────────────────────────
function MonkeyBar({user,onNavigate,onUpdateUser,currentPose,currentMsg}){
  const [chatOpen,setChatOpen]=useState(false);
  const [points,setPoints]=useState(getLexPoints(user?.email));
  const lexO=getLexOutfit(user?.email);

  useEffect(()=>{setPoints(getLexPoints(user?.email));},[user?.email,user?.stats?.xp]);

  return(
    <>
      {chatOpen&&<MonkeyChat user={user} onUpdateUser={onUpdateUser}
        onClose={()=>setChatOpen(false)} onNavigate={onNavigate}/>}

      <div style={{position:"fixed",bottom:0,left:0,right:0,height:60,
        background:C.surface+"f8",borderTop:`1px solid ${C.border}`,
        backdropFilter:"blur(12px)",zIndex:400,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 20px",height:70}}>

        {/* Left: points display */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:16}}>🍌</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.gold}}>{points.toLocaleString()}</div>
            <div style={{fontSize:9,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Lex Points</div>
          </div>
        </div>

        {/* Center: Lex button */}
        <button onClick={()=>setChatOpen(o=>!o)}
          aria-label="Open Lex assistant"
          style={{background:"transparent",border:"none",
            cursor:"pointer",padding:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            transition:"all 0.2s",transform:"translateY(-16px)",
            filter:chatOpen?"drop-shadow(0 0 12px #4f7fff)":"drop-shadow(0 2px 4px #00000044)"}}>
          <LexSVG pose={chatOpen?"happy":currentPose||"idle"} size={72}
            outfit={lexO.outfit} hat={lexO.hat} glasses={lexO.glasses}/>
        </button>

        {/* Right: shop link */}
        <button onClick={()=>onNavigate("lexshop")}
          style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,
            padding:"5px 10px",color:C.textMuted,fontSize:12,cursor:"pointer",fontFamily:T.sans}}>
          🎨 Dress Lex
        </button>
      </div>
    </>
  );
}

// ─── LEX SHOP (customizer) ────────────────────────────────────────────────────
function LexShop({user,onBack}){
  const [outfit,setOutfit]=useState(getLexOutfit(user?.email));
  const [points,setPoints]=useState(getLexPoints(user?.email));
  const [tab,setTab]=useState("outfits");
  const [saved,setSaved]=useState(false);
  const [msg,setMsg]=useState("");

  const purchase=(type,key,cost)=>{
    if(points<cost){setMsg("Not enough Lex Points! Earn more by answering questions correctly.");return;}
    const newPts=points-cost;
    setPoints(newPts);
    setLexPoints(user?.email,newPts);
    const newOutfit={...outfit,[type]:key};
    setOutfit(newOutfit);
    setLexOutfit(user?.email,newOutfit);
    setMsg("Unlocked! Looking good, Lex 🎉");
    setTimeout(()=>setMsg(""),2500);
  };

  const select=(type,key)=>{
    const newOutfit={...outfit,[type]:key};
    setOutfit(newOutfit);
    setLexOutfit(user?.email,newOutfit);
  };

  const TABS=[{id:"outfits",label:"Outfits",icon:"👔"},
    {id:"hats",label:"Hats",icon:"🎩"},{id:"glasses",label:"Glasses",icon:"👓"}];

  return(
    <main style={{maxWidth:600,margin:"0 auto",padding:"24px 20px 90px"}}>
      <button onClick={onBack}
        style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",
          fontSize:13,fontFamily:T.sans,marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
        ← Back
      </button>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text}}>Lex's Wardrobe</h1>
        <div style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,
          padding:"6px 14px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:16}}>🍌</span>
          <span style={{fontWeight:700,color:C.gold}}>{points.toLocaleString()} pts</span>
        </div>
      </div>

      {msg&&<div style={{background:C.success+"15",border:`1px solid ${C.success}33`,borderRadius:12,
        padding:"10px 14px",marginBottom:14,fontSize:13,color:C.success}}>{msg}</div>}

      {/* Preview */}
      <Card style={{marginBottom:16,textAlign:"center",padding:"24px",background:"linear-gradient(135deg,#0d1225,#1a2340)"}}>
        <div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>
          Current Look
        </div>
        <LexSVG pose="happy" size={160} outfit={outfit.outfit} hat={outfit.hat} glasses={outfit.glasses}/>
        <div style={{marginTop:10,fontSize:12,color:C.textMuted}}>
          {LEX_OUTFITS[outfit.outfit]?.label} · {LEX_HATS[outfit.hat]?.label} · {LEX_GLASSES[outfit.glasses]?.label}
        </div>
      </Card>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"9px 0",borderRadius:10,border:`1.5px solid ${tab===t.id?C.accent:C.border}`,
              background:tab===t.id?C.accentSoft:"transparent",
              color:tab===t.id?C.accent:C.textMuted,fontSize:13,cursor:"pointer",
              fontFamily:T.sans,fontWeight:tab===t.id?700:400}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {tab==="outfits"&&Object.entries(LEX_OUTFITS).map(([key,o])=>{
          const isSelected=outfit.outfit===key;
          const owned=o.cost===0||points>=0; // all already purchased if free
          return(
            <Card key={key} style={{borderColor:isSelected?C.accent:C.border,cursor:"pointer",textAlign:"center"}}
              onClick={()=>o.cost===0?select("outfit",key):purchase("outfit",key,o.cost)}>
              <LexSVG pose="idle" size={90} outfit={key} hat="none" glasses="none" animate={false}/>
              <div style={{fontSize:13,fontWeight:700,color:isSelected?C.accent:C.text,marginTop:6}}>{o.label}</div>
              {o.cost>0
                ?<div style={{fontSize:11,color:C.gold,marginTop:2}}>🍌 {o.cost} pts</div>
                :<div style={{fontSize:11,color:C.success,marginTop:2}}>✓ Free</div>}
              {isSelected&&<div style={{fontSize:10,color:C.accent,marginTop:2,fontWeight:700}}>WEARING</div>}
            </Card>
          );
        })}
        {tab==="hats"&&Object.entries(LEX_HATS).map(([key,h])=>{
          const isSelected=outfit.hat===key;
          return(
            <Card key={key} style={{borderColor:isSelected?C.accent:C.border,cursor:"pointer",textAlign:"center"}}
              onClick={()=>h.cost===0?select("hat",key):purchase("hat",key,h.cost)}>
              <LexSVG pose="idle" size={90} outfit={outfit.outfit} hat={key} glasses="none" animate={false}/>
              <div style={{fontSize:13,fontWeight:700,color:isSelected?C.accent:C.text,marginTop:6}}>{h.label}</div>
              {h.cost>0
                ?<div style={{fontSize:11,color:C.gold,marginTop:2}}>🍌 {h.cost} pts</div>
                :<div style={{fontSize:11,color:C.success,marginTop:2}}>✓ Free</div>}
              {isSelected&&<div style={{fontSize:10,color:C.accent,marginTop:2,fontWeight:700}}>WEARING</div>}
            </Card>
          );
        })}
        {tab==="glasses"&&Object.entries(LEX_GLASSES).map(([key,g])=>{
          const isSelected=outfit.glasses===key;
          return(
            <Card key={key} style={{borderColor:isSelected?C.accent:C.border,cursor:"pointer",textAlign:"center"}}
              onClick={()=>g.cost===0?select("glasses",key):purchase("glasses",key,g.cost)}>
              <LexSVG pose="idle" size={90} outfit={outfit.outfit} hat="none" glasses={key} animate={false}/>
              <div style={{fontSize:13,fontWeight:700,color:isSelected?C.accent:C.text,marginTop:6}}>{g.label}</div>
              {g.cost>0
                ?<div style={{fontSize:11,color:C.gold,marginTop:2}}>🍌 {g.cost} pts</div>
                :<div style={{fontSize:11,color:C.success,marginTop:2}}>✓ Free</div>}
              {isSelected&&<div style={{fontSize:10,color:C.accent,marginTop:2,fontWeight:700}}>WEARING</div>}
            </Card>
          );
        })}
      </div>

      <div style={{marginTop:20,background:C.accentSoft,border:`1px solid ${C.accent}33`,borderRadius:14,padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:6}}>🍌 How to Earn Lex Points</div>
        <div style={{fontSize:12,color:C.textSub,lineHeight:1.7}}>
          +5 pts — Each correct practice answer<br/>
          +10 pts — Each Quick 5 question correct<br/>
          +20 pts — Daily Challenge completed<br/>
          +50 pts — Full Section completed<br/>
          +15 pts — Flaw Lab or Writing submitted<br/>
          +10 pts — SRS Review session completed<br/>
          +25 pts — 7-day streak maintained
        </div>
      </div>
    </main>
  );
}

// ─── LEX INTRO (first time naming Lex) ───────────────────────────────────────
function LexIntro({user,onDone}){
  const [step,setStep]=useState(0);
  const [lexName,setLexName]=useState("Lex");
  const [nameInput,setNameInput]=useState("");

  const steps=[
    {pose:"excited",msg:null}, // intro animation step
    {pose:"happy",msg:"Hello! I'm your LSAT study buddy. I'll guide you through the app, cheer you on, and answer any questions you have along the way 🐵"},
    {pose:"think",msg:"One thing though — 'Lex' is just my default name. You can call me whatever you like. What's it going to be?"},
    {pose:"celebrate",msg:null}, // name confirmation step
  ];

  const saveName=()=>{
    const name=(nameInput.trim()||"Lex").slice(0,20);
    setLexName(name);
    try{localStorage.setItem(LEX_NAME_KEY+(user?.email||""),name);}catch{}
    setStep(3);
  };

  if(step===0)return(
    <div style={{position:"fixed",inset:0,background:C.bg+"f8",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:500,padding:20}}>
      <div style={{textAlign:"center",maxWidth:360}}>
        <div style={{animation:"lexCelebrate 0.8s ease both"}}>
          <LexSVG pose="celebrate" size={200} outfit="none" hat="none" glasses="none"/>
        </div>
        <h2 style={{fontFamily:T.serif,fontSize:28,color:C.text,marginTop:16,marginBottom:8}}>
          Meet Your Study Buddy!
        </h2>
        <p style={{color:C.textSub,fontSize:15,lineHeight:1.7,marginBottom:28}}>
          I'll be with you every step of your LSAT prep. Let's get acquainted!
        </p>
        <Btn onClick={()=>setStep(1)} style={{minWidth:160}}>Say Hello →</Btn>
      </div>
    </div>
  );

  if(step===1||step===2)return(
    <div style={{position:"fixed",inset:0,background:C.bg+"f8",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:500,padding:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,
        padding:36,maxWidth:420,width:"100%",textAlign:"center"}}>
        <LexSVG pose={steps[step].pose} size={160} outfit="none" hat="none" glasses="none"/>
        <div style={{background:"white",borderRadius:16,padding:"14px 18px",
          margin:"16px 0 20px",textAlign:"left"}}>
          <p style={{margin:0,fontSize:14,color:"#1a1a2e",lineHeight:1.65,fontFamily:T.sans}}>
            {steps[step].msg}
          </p>
        </div>
        {step===2?(
          <div>
            <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveName()}
              placeholder='e.g. "Lex", "Max", "Counselor"…'
              maxLength={20}
              autoFocus
              style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.accent}`,
                borderRadius:10,padding:"11px 14px",color:C.text,fontSize:15,
                fontFamily:T.sans,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            <Btn onClick={saveName} style={{width:"100%"}}>
              {nameInput.trim()?"That's the one! →":"Keep 'Lex' →"}
            </Btn>
          </div>
        ):(
          <Btn onClick={()=>setStep(2)} style={{width:"100%"}}>Next →</Btn>
        )}
      </div>
    </div>
  );

  if(step===3)return(
    <div style={{position:"fixed",inset:0,background:C.bg+"f8",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:500,padding:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,
        padding:36,maxWidth:420,width:"100%",textAlign:"center"}}>
        <LexSVG pose="celebrate" size={170} outfit="none" hat="none" glasses="none"/>
        <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginTop:16,marginBottom:10}}>
          Nice to meet you!
        </h2>
        <div style={{background:"white",borderRadius:16,padding:"14px 18px",
          margin:"0 0 20px",textAlign:"left"}}>
          <p style={{margin:0,fontSize:14,color:"#1a1a2e",lineHeight:1.65,fontFamily:T.sans}}>
            From now on I'm <strong>{lexName}</strong>! No matter where you are in the app, I'll always be right there at the bottom of your screen — just look for me down there and give me a tap! 👇
            Ask me anything about the LSAT or the app, and I'll point you in the right direction.
            You can even dress me up in the wardrobe — I've heard the top hat is very distinguished. 🎩
          </p>
        </div>
        <Btn onClick={onDone} style={{width:"100%"}}>Let's start studying! 🐵</Btn>
      </div>
    </div>
  );

  return null;
}


// ─── STREAK CELEBRATION ───────────────────────────────────────────────────────
function StreakCelebration({streak,onDismiss}){
  useEffect(()=>{const t=setTimeout(onDismiss,3500);return()=>clearTimeout(t);},[onDismiss]);
  const msg=streak>=30?"30 days straight. You're unstoppable.":streak>=14?"Two weeks of consistent prep. Impressive.":streak>=7?"One week strong. This is how scores improve.":streak>=3?"3 days in a row. The habit is forming.":"Keep this going every day.";
  return(
    <div onClick={onDismiss} style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,background:"#00000088",cursor:"pointer"}}>
      <div style={{background:`linear-gradient(135deg,${C.surface},${C.surfaceHigh})`,border:`2px solid ${C.gold}66`,borderRadius:28,padding:"40px 48px",textAlign:"center",maxWidth:340,animation:"fadeUp 0.4s ease both"}}>
        <div style={{fontSize:64,marginBottom:8,animation:"pulse 0.8s ease infinite"}}>🔥</div>
        <div style={{fontFamily:T.serif,fontSize:36,fontWeight:900,color:C.gold,marginBottom:6}}>{streak} Day Streak!</div>
        <p style={{color:C.textSub,fontSize:15,lineHeight:1.6,marginBottom:16}}>{msg}</p>
        <div style={{fontSize:12,color:C.textMuted}}>Tap to continue</div>
      </div>
    </div>
  );
}

// ─── ANSWER RESULT CELEBRATION ────────────────────────────────────────────────
function AnswerFlash({correct}){
  const [show,setShow]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setShow(false),600);return()=>clearTimeout(t);},[]);
  if(!show)return null;
  return(
    <div style={{position:"fixed",top:72,right:20,zIndex:500,pointerEvents:"none",animation:"fadeUp 0.15s ease both"}}>
      <div style={{
        background:correct?"#052e16":"#2d0a0a",
        border:`2px solid ${correct?"#2dd4a0":"#f87171"}`,
        borderRadius:14,
        padding:"10px 18px",
        display:"flex",
        alignItems:"center",
        gap:8,
        boxShadow:`0 4px 20px ${correct?"#2dd4a044":"#f8717144"}`
      }}>
        <span style={{fontSize:20}}>{correct?"✅":"❌"}</span>
        <span style={{fontSize:14,fontWeight:700,color:correct?"#86efac":"#fca5a5"}}>{correct?"Correct!":"Incorrect"}</span>
      </div>
    </div>
  );
}

// ─── QUICK 5 MODE ─────────────────────────────────────────────────────────────
function Quick5({user,onUpdateUser,onDone}){
  const TOTAL=5;
  const BASE_TIME=90; // matches real LSAT pacing (~1:25-1:30 per LR question)
  const LR_TYPES=QUESTION_TYPES["Logical Reasoning"];

  const [phase,setPhase]=useState("loading");
  const [questions,setQuestions]=useState([]);    // all 5 slots, some may be null initially
  const [idx,setIdx]=useState(0);
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [results,setResults]=useState([]);
  const [flash,setFlash]=useState(null);
  const [timer,setTimer]=useState(BASE_TIME);
  const [extraTimeUsed,setExtraTimeUsed]=useState(false);

  // Refs to avoid stale closure in timer
  const timerRef=useRef(null);
  const submittedRef=useRef(false);
  const selectedRef=useRef(null);

  // Keep refs in sync
  useEffect(()=>{submittedRef.current=submitted;},[submitted]);
  useEffect(()=>{selectedRef.current=selected;},[selected]);

  useEffect(()=>{startSession();},[]);
  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const genOne=async(i)=>{
    const lv=i<2?2:i<4?3:4;
    const qt=LR_TYPES[i%LR_TYPES.length];
    const raw=await callClaude(PRACTICE_SYSTEM,buildQ("Logical Reasoning",lv,qt,user.diagnostic,[]),1200);
    const parsed=parseJSON(raw);
    // Validate — must have stimulus, question, and choices
    if(!parsed.stimulus||!parsed.question||!parsed.choices)throw new Error("Incomplete question");
    return{...parsed,section:"Logical Reasoning",qType:qt,assignedLevel:lv};
  };

  const startSession=async()=>{
    setPhase("loading");
    setQuestions(new Array(TOTAL).fill(null));
    setIdx(0);setResults([]);setSelected(null);setSubmitted(false);
    submittedRef.current=false;selectedRef.current=null;
    clearInterval(timerRef.current);

    // Generate all 5 in parallel — much faster than sequential
    const promises=Array.from({length:TOTAL},(_,i)=>genOne(i).catch(()=>null));
    
    // Show first question as soon as it arrives
    let firstShown=false;
    promises[0].then(q=>{
      if(q){
        setQuestions(prev=>{const a=[...prev];a[0]=q;return a;});
        if(!firstShown){firstShown=true;setPhase("active");startTimer();}
      }
    });

    // Fill in the rest as they arrive
    const all=await Promise.allSettled(promises);
    const loaded=all.map(r=>r.status==="fulfilled"?r.value:null);
    setQuestions(loaded);
    if(!firstShown){
      const first=loaded.find(q=>q!=null);
      if(first){setPhase("active");startTimer();}
      else{onDone();}
    }
  };

  const startTimer=()=>{
    clearInterval(timerRef.current);
    setTimer(BASE_TIME);
    setExtraTimeUsed(false);
    timerRef.current=setInterval(()=>{
      setTimer(t=>{
        if(t<=1){
          clearInterval(timerRef.current);
          // Use refs — not stale closures
          if(!submittedRef.current){
            submittedRef.current=true;
            setSubmitted(true);
            setFlash("wrong");
            setTimeout(()=>setFlash(null),700);
          }
          return 0;
        }
        return t-1;
      });
    },1000);
  };

  const addTime=()=>{
    if(extraTimeUsed||submittedRef.current)return;
    setExtraTimeUsed(true);
    setTimer(t=>t+30);
  };

  const doSubmit=()=>{
    if(submittedRef.current||!selectedRef.current)return;
    clearInterval(timerRef.current);
    const q=questions[idx];
    if(!q)return;
    const correct=selectedRef.current===q.correct;
    submittedRef.current=true;
    setSubmitted(true);
    setFlash(correct?"correct":"wrong");
    setTimeout(()=>setFlash(null),700);
    const record={section:q.section,qType:q.qType,level:q.assignedLevel,correct,
      xp:correct?XP_PER_CORRECT[q.assignedLevel||2]:0,timestamp:Date.now()};
    setResults(prev=>[...prev,record]);
    onUpdateUser({history:[...(user.history||[]),record],
      stats:{...user.stats,xp:(user.stats?.xp||0)+record.xp}});
    if(user.email)awardLexPoints(user.email,correct?10:0);
  };

  const next=()=>{
    // Record time-out miss
    if(submittedRef.current&&!selectedRef.current){
      const q=questions[idx];
      if(q){
        const record={section:q.section,qType:q.qType,level:q.assignedLevel,
          correct:false,xp:0,timestamp:Date.now()};
        setResults(prev=>[...prev,record]);
        onUpdateUser({history:[...(user.history||[]),record]});
      }
    }
    const nextIdx=idx+1;
    if(nextIdx>=TOTAL){setPhase("done");return;}
    submittedRef.current=false;selectedRef.current=null;
    setIdx(nextIdx);setSelected(null);setSubmitted(false);
    // Start timer for next question (it should already be loaded since parallel)
    startTimer();
  };

  // If we advanced to a question slot that finished loading after we got there, start timer
  useEffect(()=>{
    if(phase==="active"&&!submittedRef.current&&questions[idx]&&timer===BASE_TIME){
      // already started
    }
  },[questions[idx]?.stimulus]);

  const q=questions[idx];
  const correct_count=results.filter(r=>r.correct).length;

  const cs=(l)=>{
    if(!submitted)return selected===l?"sel":"def";
    if(l===q?.correct)return"ok";
    if(l===selected)return"bad";
    return"def";
  };
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",
    borderRadius:12,padding:"12px 16px",cursor:submitted?"default":"pointer",fontSize:"14px",
    marginBottom:9,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,
    boxSizing:"border-box",outline:"none",
    ...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}
      :s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}
      :s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}
      :{background:"transparent",borderColor:C.border,color:C.textSub})});

  if(phase==="loading")return(
    <div style={{position:"fixed",inset:0,background:C.bg+"f2",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",zIndex:300}}>
      <Spinner label="Generating 5 questions in parallel…"/>
      <p style={{color:C.textMuted,fontSize:13,marginTop:8}}>LR only · adaptive difficulty · starting soon</p>
    </div>
  );

  if(phase==="done"){
    const total=Math.max(results.length,1);
    const pct=Math.round(correct_count/total*100);
    const totalXP=results.reduce((s,r)=>s+r.xp,0);
    return(
      <div style={{position:"fixed",inset:0,background:C.bg+"f2",display:"flex",alignItems:"center",
        justifyContent:"center",zIndex:300,padding:20}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,
          padding:36,maxWidth:400,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:12}}>{pct>=80?"🏆":pct>=60?"🎯":"📈"}</div>
          <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:8}}>Quick 5 Done!</h2>
          <div style={{fontSize:44,fontWeight:900,
            color:pct>=70?C.success:pct>=50?C.gold:C.danger,
            fontFamily:T.serif,marginBottom:4}}>{pct}%</div>
          <p style={{color:C.textSub,fontSize:14,marginBottom:8}}>{correct_count} of {results.length} correct</p>
          {totalXP>0&&<div style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,
            borderRadius:10,padding:"8px 14px",marginBottom:16,display:"inline-block"}}>
            <span style={{color:C.gold,fontWeight:700}}>+{totalXP} XP earned</span>
          </div>}
          <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:24}}>
            {results.map((r,i)=>(
              <div key={i} style={{width:32,height:32,borderRadius:"50%",
                background:r.correct?C.success+"22":C.danger+"22",
                border:`2px solid ${r.correct?C.success:C.danger}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                {r.correct?"✓":"✗"}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn ghost onClick={onDone}>Back to Home</Btn>
            <Btn onClick={startSession}>Play Again ⚡</Btn>
          </div>
        </div>
      </div>
    );
  }

  // Question loading mid-session (parallel gen still catching up)
  if(!q||!q.stimulus)return(
    <div style={{position:"fixed",inset:0,background:C.bg+"f2",display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <Spinner label={`Loading question ${idx+1}…`}/>
    </div>
  );

  const isTimedOut=submitted&&!selected;
  const timerColor=timer<=10?C.danger:timer<=25?C.gold:C.accent;

  return(
    <div style={{position:"fixed",inset:0,background:C.bg,overflowY:"auto",zIndex:300}}>
      {flash&&<AnswerFlash correct={flash==="correct"}/>}
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 20px 40px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontWeight:800,color:C.purple,fontSize:15}}>⚡ Quick 5</span>
            <div style={{display:"flex",gap:4}}>
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{width:26,height:6,borderRadius:3,
                  background:i<results.length
                    ?(results[i]?.correct?C.success:C.danger)
                    :i===idx?C.accent:C.surfaceHigh,
                  transition:"background 0.3s"}}/>
              ))}
            </div>
            <span style={{color:C.textMuted,fontSize:12}}>{idx+1}/5</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!submitted&&(
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {!extraTimeUsed&&(
                  <button onClick={addTime} title="Add 30 seconds"
                    style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                      padding:"3px 8px",color:C.textMuted,fontSize:11,cursor:"pointer",
                      fontFamily:T.sans,fontWeight:600}}>
                    +30s
                  </button>
                )}
                <div style={{width:32,height:32,position:"relative"}}>
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke={C.surfaceHigh} strokeWidth="3"/>
                    <circle cx="16" cy="16" r="13" fill="none" stroke={timerColor} strokeWidth="3"
                      strokeDasharray={2*Math.PI*13}
                      strokeDashoffset={2*Math.PI*13*(1-Math.min(1,timer/BASE_TIME))}
                      strokeLinecap="round"
                      style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1s linear,stroke 0.3s"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:9,fontWeight:700,color:timerColor}}>{timer}</div>
                </div>
              </div>
            )}
            <button onClick={onDone} style={{background:"none",border:`1px solid ${C.border}`,
              borderRadius:8,padding:"4px 10px",color:C.textMuted,fontSize:12,cursor:"pointer"}}>
              Exit
            </button>
          </div>
        </div>

        {/* Timer bar */}
        {!submitted&&(
          <div style={{background:C.surfaceHigh,borderRadius:4,height:3,marginBottom:14,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(100,timer/BASE_TIME*100)}%`,background:timerColor,
              borderRadius:4,transition:"width 1s linear,background 0.3s"}}/>
          </div>
        )}

        {/* Question */}
        <Card style={{marginBottom:12}}>
          <div style={{marginBottom:10}}>
            <Tag color={LEVEL_COLORS[q.assignedLevel]}>Level {q.assignedLevel}</Tag>
            <Tag color={C.accent}>{q.qType}</Tag>
          </div>
          <p style={{lineHeight:1.85,fontSize:"15px",color:"#c8d4e8",marginBottom:16,
            whiteSpace:"pre-wrap"}}>{q.stimulus}</p>
          <p style={{fontWeight:600,fontSize:"15px",color:C.text,
            borderTop:`1px solid ${C.border}`,paddingTop:14,marginBottom:14}}>{q.question}</p>
          <div role="radiogroup">
            {Object.entries(q.choices||{}).map(([l,t])=>(
              <button key={l} style={cStyle(cs(l))}
                onClick={()=>{if(submitted)return;setSelected(l);}}
                role="radio" aria-checked={selected===l}>
                <span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}
              </button>
            ))}
          </div>
          {!submitted&&(
            <Btn onClick={doSubmit} disabled={!selected} style={{width:"100%",marginTop:8}}>
              Submit →
            </Btn>
          )}
        </Card>

        {/* Feedback */}
        {submitted&&(
          <div>
            {isTimedOut&&(
              <div style={{background:C.danger+"18",border:`1px solid ${C.danger}44`,
                borderRadius:12,padding:"12px 16px",marginBottom:12,fontSize:14,
                color:C.danger,fontWeight:600}}>
                ⏱ Time's up — correct answer: <strong>{q.correct}</strong>
              </div>
            )}
            <Card style={{borderColor:(!isTimedOut&&selected===q.correct)?C.success:C.danger,marginBottom:12}}>
              {!isTimedOut&&(
                <div style={{fontSize:15,fontWeight:700,
                  color:selected===q.correct?C.success:C.danger,marginBottom:10}}>
                  {selected===q.correct?"✓ Correct!":"✗ Incorrect — correct answer: "+q.correct}
                </div>
              )}
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,
                padding:14,fontSize:13,color:C.textSub,lineHeight:1.85}}>
                {(q.explanation||"").split(/WRONG\s*\([A-E]\)/)[0]
                  .replace(/CORRECT\s*\([A-E]\):\s*/,"").trim()||q.explanation}
              </div>
              {q.key_concept&&(
                <div style={{marginTop:10,fontSize:13,color:C.purple,fontStyle:"italic"}}>
                  🔑 {q.key_concept}
                </div>
              )}
            </Card>
            {idx<TOTAL-1
              ?<Btn onClick={next} style={{width:"100%"}}>
                  Next Question ({idx+2}/{TOTAL}) →
                </Btn>
              :<Btn onClick={()=>setPhase("done")}
                  style={{width:"100%",background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>
                  See Results ✓
                </Btn>
            }
          </div>
        )}
      </div>
    </div>
  );
}


// ─── ACCESSIBILITY BAR ────────────────────────────────────────────────────────
function AccessibilityBar({darkMode,setDarkMode,fontScale,setFontScale}){
  return(
    <div style={{position:"fixed",bottom:16,right:16,zIndex:400,display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"8px 10px",display:"flex",gap:8,alignItems:"center",boxShadow:"0 4px 24px #00000044"}}>
        {/* Font size */}
        <button onClick={()=>setFontScale(f=>Math.max(0.85,f-0.1))} title="Smaller text" style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,width:28,height:28,color:C.textMuted,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>A-</button>
        <button onClick={()=>setFontScale(1)} title="Reset text size" style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,width:28,height:28,color:C.textMuted,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>A</button>
        <button onClick={()=>setFontScale(f=>Math.min(1.3,f+0.1))} title="Larger text" style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,width:28,height:28,color:C.textMuted,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>A+</button>
        {/* Divider */}
        <div style={{width:1,height:20,background:C.border}}/>
        {/* Dark/light */}
        <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Switch to light mode":"Switch to dark mode"} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,width:28,height:28,color:C.textMuted,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>{darkMode?"☀️":"🌙"}</button>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({screen,setScreen,user,onLogout}){
  const [menuOpen,setMenuOpen]=useState(false);

  const PAGES=[
    {id:"home",label:"Home",icon:"⌂",group:"main"},
    {id:"quick5",label:"Quick 5",icon:"⚡",group:"main"},
    {id:"practice",label:"Practice",icon:"🎯",group:"main"},
    {id:"learn",label:"Learn",icon:"📖",group:"main"},
    {id:"daily",label:"Daily Challenge",icon:"📅",group:"study"},
    {id:"writing",label:"Writing",icon:"✍",group:"study"},
    {id:"flaw",label:"Flaw Lab",icon:"⚖",group:"study"},
    {id:"fullsection",label:"Full Section",icon:"⏱",group:"study"},
    {id:"mistakes",label:"Mistake Journal",icon:"❌",group:"tools"},
    {id:"srs",label:"SRS Review",icon:"🔁",group:"tools"},
    {id:"plan",label:"Study Plan",icon:"📋",group:"tools"},
    {id:"dashboard",label:"Progress",icon:"📊",group:"tools"},
  ];

  const close=()=>setMenuOpen(false);

  return(
    <>
      <nav role="navigation" aria-label="Main navigation"
        style={{background:C.surface+"f0",backdropFilter:"blur(16px)",
          borderBottom:`1px solid ${C.border}`,padding:"0 20px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          height:56,position:"sticky",top:0,zIndex:100}}>

        {/* Logo */}
        <button onClick={()=>{setScreen("home");close();}} aria-label="Home"
          style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:"none",border:"none",padding:0,flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:15,fontWeight:900,color:"#fff",fontFamily:T.serif,
            boxShadow:"0 0 16px #3a6bff44"}}>L</div>
          <span style={{fontFamily:T.serif,fontSize:17,color:C.text,fontWeight:700,letterSpacing:"0.03em"}}>
            <span style={{color:C.accent}}>Lumora</span> LSAT
          </span>
        </button>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Streak badge */}
          {user&&(user.stats?.streak||0)>0&&(
            <div style={{display:"flex",alignItems:"center",gap:4,
              background:"#ff6b0018",border:"1px solid #ff6b0033",
              borderRadius:20,padding:"3px 10px"}}>
              <span>🔥</span>
              <span style={{fontSize:12,fontWeight:700,color:"#ff8c42"}}>{user.stats.streak}</span>
            </div>
          )}

          {/* Avatar */}
          {user&&(
            <button onClick={()=>{setScreen("profile");close();}}
              style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
              <Avatar user={user} size={34}/>
            </button>
          )}

          {/* Hamburger */}
          <button onClick={()=>setMenuOpen(o=>!o)}
            aria-label={menuOpen?"Close menu":"Open menu"}
            aria-expanded={menuOpen}
            style={{background:menuOpen?C.accentSoft:"none",
              border:`1px solid ${menuOpen?C.accent+"44":C.border}`,
              borderRadius:10,padding:"7px 10px",cursor:"pointer",
              display:"flex",flexDirection:"column",gap:4,transition:"all 0.2s"}}>
            <div style={{width:18,height:2,borderRadius:1,
              background:menuOpen?C.accent:C.textMuted,
              transform:menuOpen?"rotate(45deg) translate(4px,4px)":"none",
              transition:"all 0.25s"}}/>
            <div style={{width:18,height:2,borderRadius:1,
              background:menuOpen?C.accent:C.textMuted,
              opacity:menuOpen?0:1,transition:"all 0.2s"}}/>
            <div style={{width:18,height:2,borderRadius:1,
              background:menuOpen?C.accent:C.textMuted,
              transform:menuOpen?"rotate(-45deg) translate(4px,-4px)":"none",
              transition:"all 0.25s"}}/>
          </button>
        </div>
      </nav>

      {/* Side drawer */}
      {menuOpen&&(
        <>
          {/* Backdrop */}
          <div onClick={close}
            style={{position:"fixed",inset:0,background:"#00000066",
              zIndex:198,backdropFilter:"blur(2px)"}}/>

          {/* Drawer panel */}
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:280,
            background:C.surface,borderLeft:`1px solid ${C.border}`,
            zIndex:199,overflowY:"auto",
            boxShadow:"-8px 0 32px #00000044",
            display:"flex",flexDirection:"column"}}>

            {/* Drawer header */}
            <div style={{padding:"18px 20px 12px",borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontFamily:T.serif,fontSize:16,color:C.text,fontWeight:700}}>
                <span style={{color:C.accent}}>Lumora</span> LSAT
              </span>
              <button onClick={close}
                style={{background:"none",border:"none",color:C.textMuted,
                  fontSize:22,cursor:"pointer",lineHeight:1,padding:"2px 6px"}}>×</button>
            </div>

            {/* Nav groups */}
            {[
              {label:"Practice",pages:PAGES.filter(p=>p.group==="main")},
              {label:"Study Modes",pages:PAGES.filter(p=>p.group==="study")},
              {label:"Tools",pages:PAGES.filter(p=>p.group==="tools")},
            ].map(group=>(
              <div key={group.label} style={{padding:"12px 12px 4px"}}>
                <div style={{fontSize:10,color:C.textMuted,textTransform:"uppercase",
                  letterSpacing:"0.12em",fontWeight:700,padding:"0 8px",marginBottom:4}}>
                  {group.label}
                </div>
                {group.pages.map(p=>(
                  <button key={p.id}
                    onClick={()=>{setScreen(p.id);close();}}
                    style={{display:"flex",alignItems:"center",gap:12,width:"100%",
                      textAlign:"left",padding:"10px 12px",borderRadius:12,border:"none",
                      background:screen===p.id?C.accentSoft:"transparent",
                      color:screen===p.id?C.accent:C.text,
                      fontSize:14,fontFamily:T.sans,cursor:"pointer",
                      fontWeight:screen===p.id?600:400,
                      transition:"all 0.15s",marginBottom:2,
                      outline:"none"}}>
                    <span style={{fontSize:16,width:22,textAlign:"center",flexShrink:0}}>{p.icon}</span>
                    {p.label}
                    {screen===p.id&&<div style={{marginLeft:"auto",width:6,height:6,
                      borderRadius:"50%",background:C.accent,flexShrink:0}}/>}
                  </button>
                ))}
              </div>
            ))}

            {/* Bottom: profile + signout */}
            <div style={{marginTop:"auto",borderTop:`1px solid ${C.border}`,padding:12}}>
              {user&&(
                <>
                  <button onClick={()=>{setScreen("profile");close();}}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",
                      padding:"10px 12px",borderRadius:12,border:"none",
                      background:"transparent",cursor:"pointer",marginBottom:6,
                      fontFamily:T.sans}}>
                    <Avatar user={user} size={28}/>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:13,color:C.text,fontWeight:600}}>{user.name}</div>
                      <div style={{fontSize:11,color:C.textMuted}}>View Profile</div>
                    </div>
                  </button>
                  <button onClick={()=>{onLogout();close();}}
                    style={{width:"100%",padding:"9px 12px",borderRadius:10,
                      border:`1px solid ${C.border}`,background:"transparent",
                      color:C.textMuted,fontSize:13,cursor:"pointer",
                      fontFamily:T.sans,textAlign:"left"}}>
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function Landing({onGetStarted}){
  const [tick,setTick]=useState(0);
  useEffect(()=>{const i=setInterval(()=>setTick(t=>t+1),2800);return()=>clearInterval(i);},[]);
  const taglines=[{l1:"Think Like",l2:"a Lawyer."},{l1:"Argue Like",l2:"a Pro."},{l1:"Score What",l2:"You Deserve."},{l1:"Built to Help You",l2:"Ace the LSAT."}];
  const tag=taglines[tick%taglines.length];
  const features=[{icon:"🎯",title:"Infinite Practice",desc:"Lumora generates a completely fresh question every session — no question bank, no repeats, ever."},{icon:"📖",title:"Interactive Lessons",desc:"Learn every question type from first principles with 4 difficulty levels and Lumora tutoring."},{icon:"⚖",title:"Flaw Lab",desc:"Spot hidden flaws in Lumora-generated legal arguments and get scored on your reasoning."},{icon:"🧠",title:"Score Predictor",desc:"Real-time Lumora analysis projects your LSAT score range as you practice."},{icon:"✍",title:"2026 Writing",desc:"Full LSAC argumentative writing with guided prewriting and detailed Lumora feedback."},{icon:"⏱",title:"Full Sections",desc:"35-minute timed simulations that ramp from Level 1 to Level 4, starting instantly."}];
  return(
    <div style={{minHeight:"100vh",background:C.bg,overflow:"hidden",position:"relative"}}>
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,#3a6bff18 0%,transparent 70%)",top:-100,left:-100,animation:"float1 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,#a78bfa14 0%,transparent 70%)",top:"30%",right:-150,animation:"float2 10s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,#f5c84210 0%,transparent 70%)",bottom:-50,left:"30%",animation:"float3 12s ease-in-out infinite"}}/>
        <style>{`@keyframes float1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,30px)}} @keyframes float2{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,40px)}} @keyframes float3{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}} @keyframes tagSwitch{0%{opacity:0;transform:translateY(10px)}15%,85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}} @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} *:focus-visible{outline:2px solid #4f7fff!important;outline-offset:2px!important;}`}</style>
      </div>
      <div style={{position:"relative",zIndex:1,maxWidth:1000,margin:"0 auto",padding:"0 24px"}}>
        <div style={{textAlign:"center",paddingTop:"clamp(60px,10vh,120px)",paddingBottom:80,animation:"fadeUp 0.8s ease both"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:8}}>
              <svg width="24" height="70" viewBox="0 0 24 70" style={{opacity:0.75}}>
                <path d="M 12 0 Q 16 18 12 35 Q 8 52 12 70" stroke="#2dd4a0" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                <circle cx="7" cy="22" r="6" fill="#16a34a" opacity="0.8"/>
                <circle cx="17" cy="46" r="5" fill="#16a34a" opacity="0.7"/>
              </svg>
              <div style={{animation:"lexSwingIn 1.1s cubic-bezier(.22,1,.36,1) both",marginTop:-8}}>
                <LexSVG pose="excited" size={180} outfit="none" hat="none" glasses="none"/>
              </div>
            </div>
            <style>{`@keyframes lexSwingIn{0%{transform:rotate(-22deg) translateX(-20px);opacity:0}55%{transform:rotate(7deg);opacity:1}75%{transform:rotate(-3deg)}100%{transform:rotate(0deg);opacity:1}}`}</style>
          <div style={{display:"inline-flex",alignItems:"center",gap:12,marginBottom:40,padding:"8px 20px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:40}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff",fontFamily:T.serif,boxShadow:"0 0 20px #3a6bff55"}}>L</div>
            <span style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:C.text}}><span style={{color:C.accent}}>Lumora</span> LSAT</span>
            <span style={{fontSize:11,fontWeight:700,color:C.accent,background:C.accentSoft,padding:"2px 8px",borderRadius:20,letterSpacing:"0.08em",textTransform:"uppercase"}}>Beta</span>
          </div>
          <h1 style={{fontFamily:T.serif,fontSize:"clamp(38px,7vw,80px)",fontWeight:700,color:C.text,lineHeight:1.1,marginBottom:20}}>
            <span key={tick} style={{display:"block",animation:"tagSwitch 2.8s ease both"}}>
              <span style={{display:"block",background:"linear-gradient(135deg,#4f7fff,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{tag.l1}</span>
              <span style={{display:"block",background:"linear-gradient(135deg,#a78bfa,#f472b6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{tag.l2}</span>
            </span>
          </h1>
          <p style={{fontSize:"clamp(16px,2.5vw,20px)",color:C.textSub,maxWidth:560,margin:"0 auto 48px",lineHeight:1.8}}>Adaptive learning, infinite Lumora-generated questions, interactive lessons for every question type, and real-time score prediction. Built for students who want to win.</p>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={onGetStarted} style={{background:"linear-gradient(135deg,#3a6bff,#6a9fff)",color:"#fff",border:"none",borderRadius:14,padding:"18px 44px",fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:T.sans,boxShadow:"0 8px 32px #3a6bff55"}}>Start for Free →</button>
            <button onClick={onGetStarted} style={{background:"transparent",color:C.textSub,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 32px",fontSize:16,cursor:"pointer",fontFamily:T.sans}}>Sign In</button>
          </div>
          <div style={{marginTop:40,display:"flex",alignItems:"center",justifyContent:"center",gap:24,flexWrap:"wrap"}}>
            {[["∞","Unique Questions"],["17","Question Types"],["2026","LSAC Format"],["🎯","Score Predictor"]].map(([v,l])=><div key={l} style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:C.accent,fontFamily:T.serif}}>{v}</div><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>{l}</div></div>)}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:80}}>
          {features.map((f,i)=><div key={f.title} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent+"66";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";}}><div style={{fontSize:32,marginBottom:14}}>{f.icon}</div><div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:8}}>{f.title}</div><div style={{fontSize:14,color:C.textMuted,lineHeight:1.65}}>{f.desc}</div></div>)}
        </div>
        <div style={{textAlign:"center",paddingBottom:80}}>
          <div style={{background:`linear-gradient(135deg,${C.accentSoft},#1a1230)`,border:`1px solid ${C.accent}33`,borderRadius:24,padding:"48px 32px",maxWidth:600,margin:"0 auto"}}>
            <div style={{fontSize:32,marginBottom:16}}>⚖</div>
            <h2 style={{fontFamily:T.serif,fontSize:28,color:C.text,marginBottom:12,fontWeight:700}}>Ready to dominate the LSAT?</h2>
            <p style={{color:C.textSub,fontSize:15,marginBottom:28,lineHeight:1.7}}>Create your free account and start your personalized prep today. No credit card required.</p>
            <button onClick={onGetStarted} style={{background:"linear-gradient(135deg,#3a6bff,#6a9fff)",color:"#fff",border:"none",borderRadius:14,padding:"16px 40px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:T.sans,boxShadow:"0 8px 32px #3a6bff55"}}>Get Started Free →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function Auth({onLogin}){
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const submit=(e)=>{
    e.preventDefault();setError("");setLoading(true);
    const users=DB.getUsers();
    if(mode==="signup"){
      if(!name.trim()||name.trim().length<2){setError("Please enter your full name.");setLoading(false);return;}
      if(!email.includes("@")){setError("Please enter a valid email.");setLoading(false);return;}
      if(password.length<6){setError("Password must be at least 6 characters.");setLoading(false);return;}
      if(users[email.toLowerCase()]){setError("An account already exists with this email.");setLoading(false);return;}
      const u={name:name.trim(),email:email.toLowerCase(),password,avatarColor:Math.floor(Math.random()*8),avatarEmoji:"",diagnosticDone:false,diagnostic:{},history:[],notes:[],studyPlan:null,learnProgress:{},earnedBadges:[],stats:{xp:0,streak:0,lastDay:null}};
      DB.saveUser(email.toLowerCase(),u);DB.saveSession(email.toLowerCase());onLogin(u);
    }else{
      const u=users[email.toLowerCase()];
      if(!u){setError("No account found with this email.");setLoading(false);return;}
      if(u.password!==password){setError("Incorrect password.");setLoading(false);return;}
      DB.saveSession(email.toLowerCase());onLogin(u);
    }
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:900,color:"#fff",fontFamily:T.serif,margin:"0 auto 16px",boxShadow:"0 0 32px #3a6bff44"}}>L</div>
          <div style={{fontFamily:T.serif,fontSize:26,color:C.text,fontWeight:700}}><span style={{color:C.accent}}>Lumora</span> LSAT</div>
        </div>
        <Card>
          <h1 style={{fontFamily:T.serif,fontSize:22,color:C.text,marginBottom:6,fontWeight:700}}>{mode==="login"?"Welcome back":"Create your account"}</h1>
          <p style={{color:C.textSub,fontSize:14,marginBottom:22,lineHeight:1.6}}>{mode==="login"?"All your progress is saved and waiting.":"Your progress saves automatically every session."}</p>
          <ErrBanner message={error} onDismiss={()=>setError("")}/>
          <form onSubmit={submit} noValidate>
            {mode==="signup"&&<Finput id="name" label="Full Name" value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith" required autoFocus/>}
            <Finput id="email" label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@example.com" required autoFocus={mode==="login"}/>
            <Finput id="pw" label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"At least 6 characters":"Your password"} required/>
            <Btn type="submit" disabled={loading} style={{width:"100%",marginTop:8}}>{loading?"Please wait…":mode==="login"?"Sign In →":"Create Account →"}</Btn>
          </form>
          <div style={{textAlign:"center",marginTop:18,fontSize:14,color:C.textMuted}}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontWeight:600,fontSize:14,fontFamily:T.sans}}>{mode==="login"?"Sign up free":"Sign in"}</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── DIAGNOSTIC ───────────────────────────────────────────────────────────────
function Diagnostic({user,onComplete,onCancel}){
  const isRetake=!!(user.diagnostic&&Object.keys(user.diagnostic).length>0);
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState(isRetake?{...user.diagnostic}:{});
  const q=DIAGNOSTIC_QUESTIONS[step];
  const toggleMulti=(id,val)=>{const cur=answers[id]||[];setAnswers(a=>({...a,[id]:cur.includes(val)?cur.filter(x=>x!==val):[...cur,val]}));};
  const canNext=()=>{if(!q)return false;if(q.type==="multi")return(answers[q.id]||[]).length>0;return answers[q.id]!==undefined;};
  const next=()=>{if(step<DIAGNOSTIC_QUESTIONS.length-1)setStep(s=>s+1);else onComplete(answers);};
  const back=()=>{if(step>0)setStep(s=>s-1);};
  const progress=Math.round(((step+1)/DIAGNOSTIC_QUESTIONS.length)*100);
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:520}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontFamily:T.serif,fontSize:22,color:C.text,fontWeight:700}}>
            {isRetake?"Update your study profile":"Welcome, "+user.name.split(" ")[0]+"!"}
          </div>
          <p style={{color:C.textSub,fontSize:14,marginTop:6,lineHeight:1.6}}>
            {isRetake
              ?"Your answers are pre-filled. Update anything that's changed, then regenerate your study plan."
              :"Quick 2-minute profile setup. Happens just once — then Lumora LSAT personalizes everything for you."}
          </p>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12,color:C.textMuted}}>
            <span>Building your profile</span><span>{progress}%</span>
          </div>
          <div style={{background:C.surfaceHigh,borderRadius:6,height:5}} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#4f7fff,#a78bfa)",borderRadius:6,transition:"width 0.4s ease"}}/>
          </div>
        </div>
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700}}>
              Question {step+1} of {DIAGNOSTIC_QUESTIONS.length}
            </div>
            {isRetake&&onCancel&&(
              <button onClick={onCancel} style={{background:"none",border:"none",color:C.textMuted,fontSize:12,cursor:"pointer",fontFamily:T.sans}}>
                Cancel
              </button>
            )}
          </div>
          <h2 style={{fontSize:17,color:C.text,marginBottom:20,lineHeight:1.45,fontWeight:600}}>{q.q}</h2>
          {q.type==="single"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{q.options.map(opt=><Pill key={opt} active={answers[q.id]===opt} onClick={()=>setAnswers(a=>({...a,[q.id]:opt}))}>{opt}</Pill>)}</div>}
          {q.type==="multi"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{q.options.map(opt=><Pill key={opt} active={(answers[q.id]||[]).includes(opt)} onClick={()=>toggleMulti(q.id,opt)}>{opt}</Pill>)}</div>}
          {q.type==="scale"&&<div><div style={{display:"flex",gap:10,marginBottom:8}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setAnswers(a=>({...a,[q.id]:n}))} aria-pressed={answers[q.id]===n} style={{flex:1,aspectRatio:"1",borderRadius:12,border:`2px solid ${answers[q.id]===n?C.accent:C.border}`,background:answers[q.id]===n?C.accentSoft:"transparent",color:answers[q.id]===n?C.accent:C.textMuted,fontSize:18,fontWeight:700,cursor:"pointer",transition:"all 0.15s",outline:"none"}}>{n}</button>)}</div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textMuted}}><span>Not comfortable</span><span>Very comfortable</span></div></div>}
          <div style={{display:"flex",gap:10,marginTop:22}}>
            {step>0&&<Btn ghost onClick={back}>← Back</Btn>}
            <Btn onClick={next} disabled={!canNext()} style={{flex:1}}>
              {step===DIAGNOSTIC_QUESTIONS.length-1?(isRetake?"Save & Update Plan →":"Finish & Enter Lumora LSAT →"):"Continue →"}
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Profile({user,onUpdateUser,onLogout,setScreen,onRetakeDiagnostic}){
  const [name,setName]=useState(user.name);
  const [saved,setSaved]=useState(false);
  const history=user.history||[];
  const overall=history.length>0?Math.round(history.filter(h=>h.correct).length/history.length*100):null;
  const EMOJIS=["","🦁","🐯","🦊","🐺","🦅","🦋","⚡","🔥","🌟","💎","🏆","⚖️","🎯","🧠","🎓"];
  const saveName=()=>{
    if(!name.trim()||name.trim().length<2)return;
    onUpdateUser({name:name.trim()});setSaved(true);setTimeout(()=>setSaved(false),2000);
  };
  return(
    <main style={{maxWidth:640,margin:"0 auto",padding:"32px 20px"}}>
      <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:13,fontFamily:T.sans,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Back to Home</button>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:24}}>Your Profile</h1>

      {/* Avatar section */}
      <Card style={{marginBottom:14,textAlign:"center",padding:"32px 24px"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
          <Avatar user={user} size={80}/>
        </div>
        <div style={{fontSize:13,color:C.textMuted,marginBottom:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Choose an Emoji Avatar</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:16}}>
          {EMOJIS.map(e=><button key={e} onClick={()=>onUpdateUser({avatarEmoji:e})} style={{width:40,height:40,borderRadius:10,border:`2px solid ${user.avatarEmoji===e?C.accent:C.border}`,background:user.avatarEmoji===e?C.accentSoft:"transparent",fontSize:e?20:13,cursor:"pointer",color:e?"inherit":C.textMuted,transition:"all 0.15s"}}>{e||"Aa"}</button>)}
        </div>
        <div style={{fontSize:13,color:C.textMuted,marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Avatar Color</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {AVATAR_COLORS.map((col,i)=><button key={col} onClick={()=>onUpdateUser({avatarColor:i})} style={{width:32,height:32,borderRadius:"50%",background:col,border:`3px solid ${user.avatarColor===i?"#fff":"transparent"}`,cursor:"pointer",boxShadow:user.avatarColor===i?`0 0 0 2px ${col}`:"none",transition:"all 0.15s"}}/>)}
        </div>
      </Card>

      {/* Name edit */}
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14,fontWeight:600}}>Display Name</div>
        <div style={{display:"flex",gap:10}}>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveName()}
            style={{flex:1,background:C.surfaceHigh,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:15,fontFamily:T.sans,outline:"none"}}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <Btn onClick={saveName} small>{saved?"✓ Saved":"Save"}</Btn>
        </div>
      </Card>

      {/* Stats */}
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:16,fontWeight:600}}>Your Stats</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:12}}>
          {[
            {label:"Questions",value:history.length,color:C.accent},
            {label:"Accuracy",value:overall!==null?overall+"%":"—",color:overall>=70?C.success:overall>=50?C.gold:C.danger},
            {label:"Streak",value:(user.stats?.streak||0)+"🔥",color:"#ff8c42"},
            {label:"Total XP",value:user.stats?.xp||0,color:C.gold},
            {label:"Level",value:Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1,color:C.purple},
            {label:"Notes",value:(user.notes||[]).length,color:C.teal},
          ].map(s=><div key={s.label} style={{textAlign:"center",padding:"12px 8px",background:C.surfaceHigh,borderRadius:12}}>
            <div style={{fontSize:20,fontWeight:800,color:s.color,marginBottom:2}}>{s.value}</div>
            <div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
          </div>)}
        </div>
      </Card>

      {/* XP Bar */}
      <Card style={{marginBottom:14,padding:"16px 20px"}}><XPBar xp={user.stats?.xp||0} level={Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1}/></Card>

      {/* Badges */}
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14,fontWeight:600}}>Badges Earned</div>
        {(user.earnedBadges||[]).length===0&&<p style={{color:C.textMuted,fontSize:14}}>No badges yet — keep studying to unlock them!</p>}
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {BADGES.map(b=>{const earned=(user.earnedBadges||[]).includes(b.id);return(
            <div key={b.id} title={b.desc} style={{width:64,textAlign:"center",opacity:earned?1:0.25,transition:"opacity 0.2s"}}>
              <div style={{fontSize:28,marginBottom:4}}>{b.icon}</div>
              <div style={{fontSize:10,color:earned?C.text:C.textMuted,fontWeight:earned?600:400,lineHeight:1.3}}>{b.name}</div>
            </div>
          );})}
        </div>
      </Card>

      {/* Streak Freeze */}
      <Card style={{marginBottom:14,borderColor:C.teal+"44"}}>
        <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:"0.08em",color:C.teal,marginBottom:12,fontWeight:600}}>Streak Freeze</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:32}}>🧊</div>
          <div>
            <div style={{fontSize:14,color:C.text,fontWeight:600,marginBottom:2}}>
              {(()=>{try{return parseInt(localStorage.getItem("lumora_freezes")||"1");}catch{return 1;}})()}  freeze{(()=>{try{return parseInt(localStorage.getItem("lumora_freezes")||"1");}catch{return 1;}})()!==1?"s":""} remaining
            </div>
            <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>If you miss a day, a freeze automatically saves your streak. You get 1 free freeze. Earn more by maintaining long streaks.</div>
          </div>
        </div>
      </Card>

      {/* Study Profile / Diagnostic */}
      <Card style={{marginBottom:14,borderColor:C.purple+"44"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:"0.08em",color:C.purple,fontWeight:600}}>Study Profile</div>
          <Btn ghost onClick={onRetakeDiagnostic} small>
            {user.diagnostic&&Object.keys(user.diagnostic).length>0?"Retake Diagnostic":"Take Diagnostic"}
          </Btn>
        </div>
        {user.diagnostic&&Object.keys(user.diagnostic).length>0?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            {[
              ["Target Score",user.diagnostic.target_score],
              ["Test Date",user.diagnostic.test_date],
              ["Study Hours/Wk",user.diagnostic.study_hours],
              ["Biggest Challenge",user.diagnostic.biggest_challenge],
            ].filter(([,v])=>v).map(([label,val])=>(
              <div key={label} style={{background:C.surfaceHigh,borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{label}</div>
                <div style={{fontSize:13,color:C.text,fontWeight:600}}>{val}</div>
              </div>
            ))}
          </div>
        ):(
          <p style={{color:C.textMuted,fontSize:13,lineHeight:1.7}}>
            You haven't completed a diagnostic yet. This 2-minute questionnaire helps Lumora build a study plan tailored to your target score, timeline, and weak areas. Without it, your study plan uses general defaults.
          </p>
        )}
      </Card>

      {/* Account info */}
      <Card style={{marginBottom:24}}>
        <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12,fontWeight:600}}>Account</div>
        <div style={{fontSize:14,color:C.textSub,marginBottom:4}}>Email: <span style={{color:C.text}}>{user.email}</span></div>
        <div style={{fontSize:12,color:C.textMuted,marginTop:8}}>Progress is stored locally in your browser. Clear browser data with caution.</div>
      </Card>

      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <Btn ghost danger onClick={()=>{if(window.confirm("Reset all progress? This cannot be undone."))onUpdateUser({history:[],notes:[],studyPlan:null,learnProgress:{},stats:{xp:0,streak:0,lastDay:null}});}}>Reset Progress</Btn>
        <Btn ghost onClick={onLogout}>Sign Out</Btn>
      </div>
    </main>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
// ─── DAILY CHALLENGE ─────────────────────────────────────────────────────────

// ─── DAILY CHALLENGE HELPERS ─────────────────────────────────────────────────
function getDailyKey(){
  // Reset at 2am — use date string offset by 2 hours
  const d=new Date(Date.now()-2*60*60*1000);
  return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
}
function getDailySeed(){
  const d=new Date(Date.now()-2*60*60*1000);
  return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
}

// Home card — just the teaser button
function DailyChallenge({onStart}){
  const saved=DB.getDailyChallenge();
  const todayKey=getDailyKey();
  const isToday=saved&&saved.dateKey===todayKey;
  const done=isToday&&saved.completed;
  const userAnswer=saved?.userAnswer;
  const correct=done&&userAnswer===saved?.correct;
  return(
    <div
      onClick={done?undefined:onStart}
      style={{background:"linear-gradient(135deg,"+C.surface+",#1a1230)",border:"1px solid "+(done?C.success+"44":C.gold+"44"),borderRadius:20,padding:20,marginBottom:16,cursor:done?"default":"pointer",transition:"all 0.2s"}}
      onMouseEnter={e=>{if(!done){e.currentTarget.style.borderColor=C.gold+"88";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=done?C.success+"44":C.gold+"44";e.currentTarget.style.transform="translateY(0)";}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#f5c842,#ffad42)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>⚡</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,color:C.gold,marginBottom:2}}>Daily Challenge</div>
          {done
            ?<div style={{fontSize:13,color:correct?C.success:C.danger,fontWeight:600}}>{correct?"✓ Correct today! Come back tomorrow.":"✗ Missed it today. Try again tomorrow."}</div>
            :<div style={{fontSize:13,color:C.textMuted}}>Today's Lumora Challenge — same for everyone · 2× XP · Resets at 2am</div>
          }
        </div>
        {!done&&<div style={{background:"linear-gradient(135deg,#d97706,#f59e0b)",border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontSize:13,fontWeight:700}}>Start →</div>}
        {done&&<div style={{fontSize:12,fontWeight:700,color:done?C.success:C.textMuted,background:(done?C.success:C.textMuted)+"15",border:"1px solid "+(done?C.success:C.textMuted)+"33",padding:"3px 10px",borderRadius:10}}>Done ✓</div>}
      </div>
    </div>
  );
}

// Full-screen daily challenge view
function DailyChallengeScreen({user,onUpdateUser,onBack}){
  const [challenge,setChallenge]=useState(null);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [error,setError]=useState(null);
  const todayKey=getDailyKey();

  useEffect(()=>{load();},[]);

  const load=async()=>{
    setLoading(true);setError(null);
    const saved=DB.getDailyChallenge();
    if(saved&&saved.dateKey===todayKey){
      setChallenge(saved);
      if(saved.completed){setSubmitted(true);setSelected(saved.userAnswer);}
      setLoading(false);
      return;
    }
    // Generate new question — same seed for everyone today
    const seed=getDailySeed();
    const secIdx=seed%2;
    const sec=SECTIONS[secIdx];
    const types=QUESTION_TYPES[sec];
    const typeIdx=(seed*7)%types.length;
    const qt=types[typeIdx];
    const lv=(seed%3)+2; // levels 2-4
    try{
      const sys=PRACTICE_SYSTEM;
      const prompt="Generate a Level "+lv+" LSAT "+sec+" question of type: "+qt+". This is today's Daily Challenge — make it high quality and engaging. Avoid any placeholder names.";
      const raw=await callClaude(sys,prompt);
      const parsed=parseJSON(raw);
      const choices={};
      ["A","B","C","D","E"].forEach(l=>{if(parsed.choices&&parsed.choices[l])choices[l]=parsed.choices[l];});
      const correctAnswer=typeof parsed.correct==="string"&&parsed.correct.length===1?parsed.correct.toUpperCase():"";
      const q={stimulus:parsed.stimulus,question:parsed.question,choices,correct:correctAnswer,explanation:parsed.explanation,key_concept:parsed.key_concept,level:parsed.level,section:sec,qType:qt,assignedLevel:lv,dateKey:todayKey,completed:false};
      DB.saveDailyChallenge(q);
      setChallenge(q);
    }catch(e){setError("Could not load today's challenge: "+(e.message||"Please try again."));}
    setLoading(false);
  };

  const submit=()=>{
    if(!selected||!challenge)return;
    setSubmitted(true);
    const correct=selected===challenge.correct;
    const xp=correct?XP_PER_CORRECT[challenge.assignedLevel||2]*2:0;
    const updated={...challenge,completed:true,userAnswer:selected};
    DB.saveDailyChallenge(updated);
    setChallenge(updated);
    const newCount=(user.stats?.dailyChallengesCompleted||0)+1;
    onUpdateUser({
      history:[...(user.history||[]),{section:challenge.section,qType:challenge.qType,level:challenge.assignedLevel,correct,xp,timestamp:Date.now(),source:"daily"}],
      stats:{...user.stats,xp:(user.stats?.xp||0)+xp,dailyChallengesCompleted:newCount},
    });
  };

  const cs=(l)=>{if(!submitted)return selected===l?"sel":"def";if(l===challenge?.correct)return"ok";if(l===selected)return"bad";return"def";};
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:12,padding:"13px 18px",cursor:submitted?"default":"pointer",fontSize:14,marginBottom:10,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,boxSizing:"border-box",...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}:s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}:s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}:{background:"transparent",borderColor:C.border,color:C.textSub})});

  return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"24px 20px"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:13,fontFamily:T.sans,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Back to Home</button>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#f5c842,#ffad42)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚡</div>
        <div>
          <h1 style={{fontFamily:T.serif,fontSize:24,color:C.gold,marginBottom:2,fontWeight:700}}>Daily Challenge</h1>
          <div style={{fontSize:13,color:C.textMuted}}>Same question for everyone today · 2× XP · Resets at 2am</div>
        </div>
      </div>

      {loading&&<Spinner label="Loading today's challenge…"/>}
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>

      {challenge&&!loading&&(
        <div>
          <div style={{marginBottom:12}}>
            <Tag color={C.gold}>Daily</Tag>
            <Tag color={LEVEL_COLORS[challenge.assignedLevel]}>Level {challenge.assignedLevel}</Tag>
            <Tag color={C.accent}>{challenge.section}</Tag>
            <Tag color={C.purple}>{challenge.qType}</Tag>
          </div>
          <Card style={{marginBottom:12}}>
            <p style={{lineHeight:1.9,fontSize:15,color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{challenge.stimulus}</p>
            <p style={{fontWeight:600,fontSize:15,color:C.text,borderTop:"1px solid "+C.border,paddingTop:16,marginBottom:16}}>{challenge.question}</p>
            <div role="radiogroup">
              {Object.entries(challenge.choices||{}).map(([l,t])=>(
                <button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}>
                  <span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}
                </button>
              ))}
            </div>
            {!submitted&&<Btn onClick={submit} disabled={!selected} style={{width:"100%",marginTop:8,background:"linear-gradient(135deg,#d97706,#f59e0b)"}}>Submit for 2× XP ⚡</Btn>}
          </Card>

          {submitted&&(
            <div>
              <Card style={{borderColor:selected===challenge.correct?C.success:C.danger,marginBottom:12}}>
                <div style={{fontSize:18,fontWeight:700,color:selected===challenge.correct?C.success:C.danger,marginBottom:10}}>
                  {selected===challenge.correct?"✓ Correct! Well done.":"✗ Incorrect — Correct answer: "+challenge.correct}
                </div>
                {challenge.key_concept&&<div style={{fontSize:13,color:C.purple,marginBottom:10}}>🔑 {challenge.key_concept}</div>}
                <div style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:14,fontSize:14,color:C.textSub,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{challenge.explanation}</div>
              </Card>
              <div style={{background:C.goldSoft,border:"1px solid "+C.gold+"33",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.textSub,lineHeight:1.6}}>
                <strong style={{color:C.gold}}>+{selected===challenge.correct?XP_PER_CORRECT[challenge.assignedLevel||2]*2:0} XP earned.</strong> Come back tomorrow at 2am for a new challenge.
              </div>
              <Btn onClick={onBack} style={{width:"100%"}}>Back to Home</Btn>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Home({user,setScreen,onUpdateUser}){
  const history=user.history||[];
  const overall=history.length>0?Math.round(history.filter(h=>h.correct).length/history.length*100):null;
  const todayCount=history.filter(h=>new Date(h.timestamp).toDateString()===new Date().toDateString()).length;
  const xp=user.stats?.xp||0;
  const level=Math.floor(xp/XP_PER_LEVEL)+1;
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const learnProgress=user.learnProgress||{};
  const totalTypes=LEARN_CURRICULUM["Logical Reasoning"].length+LEARN_CURRICULUM["Reading Comprehension"].length;
  const learnedTypes=Object.keys(learnProgress).filter(k=>learnProgress[k]>=4).length;
  const earnedBadges=BADGES.filter(b=>(user.earnedBadges||[]).includes(b.id));
  const nextBadge=BADGES.find(b=>!(user.earnedBadges||[]).includes(b.id));

  // Smart suggestion
  const getSuggestion=()=>{
    if(history.length===0)return{text:"Start with the Learn section to build your foundation.",action:"learn",cta:"Go to Learn"};
    const typeStats={};
    history.filter(h=>!h.source).forEach(h=>{if(!typeStats[h.qType])typeStats[h.qType]={c:0,t:0};typeStats[h.qType].t++;if(h.correct)typeStats[h.qType].c++;});
    const sorted=Object.entries(typeStats).filter(([,v])=>v.t>=2).map(([k,v])=>({type:k,pct:Math.round(v.c/v.t*100)})).sort((a,b)=>a.pct-b.pct);
    if(sorted.length>0&&sorted[0].pct<60)return{text:`Your ${sorted[0].type} accuracy is ${sorted[0].pct}% — that's your highest-priority weakness right now.`,action:"practice",cta:"Drill It Now"};
    if(todayCount===0&&history.length>0)return{text:"You haven't studied today yet. Consistency is the key to a higher score.",action:"practice",cta:"Start Practicing"};
    if(learnedTypes<totalTypes)return{text:`You've mastered ${learnedTypes} of ${totalTypes} question types. Keep going in Learn.`,action:"learn",cta:"Continue Learning"};
    return{text:"You're on track. Keep the momentum going.",action:"practice",cta:"Keep Practicing"};
  };
  const suggestion=getSuggestion();

  const quickActions=[
    {id:"practice",icon:"🎯",label:"Practice",desc:"Lumora questions, no repeats, adapts to you",color:C.accent},
    {id:"learn",icon:"📖",label:"Learn",desc:`${learnedTypes}/${totalTypes} types mastered`,color:C.purple,badge:learnedTypes<totalTypes?{label:"Continue",color:C.purple}:null},
    {id:"flaw",icon:"⚖️",label:"Flaw Lab",desc:"Find hidden flaws in legal arguments",color:C.teal,badge:{label:"Infinite",color:C.teal}},
    {id:"writing",icon:"✍️",label:"Writing",desc:"2026 LSAC format, Lumora feedback",color:C.success,badge:{label:"2026",color:C.success}},
    {id:"fullsection",icon:"⏱",label:"Full Section",desc:"35-min timed simulation",color:C.gold,badge:{label:"Instant Start",color:C.gold}},
    {id:"dashboard",icon:"📊",label:"Progress",desc:"Lumora score predictor + analytics",color:C.pink},
    {id:"plan",icon:"📋",label:"Study Plan",desc:"Your personalized roadmap",color:C.orange},
    {id:"notes",icon:"📝",label:"Notes",desc:`${(user.notes||[]).length} notes saved`,color:C.textSub},
    {id:"mistakes",icon:"❌",label:"Mistakes",desc:`Review wrong answers · Teach It Back`,color:C.danger},
    {id:"srs",icon:"🔁",label:"SRS Review",desc:"Spaced repetition — due today",color:C.gold},
  ];

  // Today's goal
  const dailyGoal=5;
  const goalPct=Math.min(100,Math.round(todayCount/dailyGoal*100));
  const goalDone=todayCount>=dailyGoal;

  return(
    <main style={{maxWidth:820,margin:"0 auto",padding:"32px 20px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,gap:16,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:13,color:C.textSub,marginBottom:4}}>{greeting}</div>
          <h1 style={{fontFamily:T.serif,fontSize:"clamp(24px,4vw,34px)",color:C.text,lineHeight:1.15,marginBottom:6}}>{user.name.split(" ")[0]}.</h1>
          <p style={{color:C.textSub,fontSize:14,lineHeight:1.6}}>
            {history.length===0?"Your LSAT journey starts here.":todayCount===0?"Pick up where you left off.":`${todayCount} question${todayCount!==1?"s":""} answered today.`}
          </p>
        </div>
        <button onClick={()=>setScreen("profile")} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:12,padding:"8px 14px",color:C.textSub,fontSize:13,cursor:"pointer",fontFamily:T.sans,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <Avatar user={user} size={22}/>Profile
        </button>
      </div>

      {/* Smart suggestion banner */}
      <div style={{background:`linear-gradient(135deg,${C.accentSoft},#1a1230)`,border:`1px solid ${C.accent}44`,borderRadius:16,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,color:C.textSub,lineHeight:1.6,flex:1}}>💡 {suggestion.text}</div>
        <button onClick={()=>setScreen(suggestion.action)} style={{background:"linear-gradient(135deg,#3a6bff,#6a9fff)",border:"none",borderRadius:10,padding:"8px 18px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.sans,flexShrink:0}}>{suggestion.cta} →</button>
      </div>

      {/* Daily Challenge */}
      <DailyChallenge onStart={()=>setScreen("daily")}/>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {[{label:"Questions",value:history.length,color:C.accent},{label:"Accuracy",value:overall!==null?overall+"%":"—",color:overall>=70?C.success:overall>=50?C.gold:C.danger},{label:"Streak",value:`${user.stats?.streak||0}🔥`,color:"#ff8c42"},{label:"XP",value:xp.toLocaleString(),color:C.gold}].map(s=><Card key={s.label} style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:s.color,marginBottom:2}}>{s.value}</div><div style={{fontSize:10,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div></Card>)}
      </div>
      <Card style={{marginBottom:12,padding:"12px 18px"}}><XPBar xp={xp} level={level}/></Card>

      {/* Badges row */}
      {earnedBadges.length>0&&<Card style={{marginBottom:12,padding:"12px 18px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:C.textMuted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Badges</span>
          {earnedBadges.map(b=><div key={b.id} title={b.name+": "+b.desc} style={{fontSize:20,cursor:"default"}}>{b.icon}</div>)}
          {nextBadge&&<div style={{fontSize:12,color:C.textMuted,marginLeft:4}}>Next: {nextBadge.icon} {nextBadge.name}</div>}
        </div>
      </Card>}

      {/* Learn progress */}
      {learnedTypes>0&&<Card style={{marginBottom:12,padding:"12px 18px",borderColor:C.purple+"44"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textMuted,marginBottom:5}}><span style={{fontWeight:600,color:C.purple}}>📖 Learn Progress</span><span>{learnedTypes}/{totalTypes} mastered</span></div>
        <div style={{background:C.surfaceHigh,borderRadius:4,height:5}}><div style={{height:"100%",width:`${learnedTypes/totalTypes*100}%`,background:`linear-gradient(90deg,${C.purple},#c084fc)`,borderRadius:4,transition:"width 0.6s"}}/></div>
      </Card>}

      {/* Quick 5 + Today's Goal row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div onClick={()=>setScreen("quick5")} style={{background:`linear-gradient(135deg,#7c3aed,#a78bfa)`,border:"none",borderRadius:18,padding:"18px 18px",cursor:"pointer",transition:"all 0.2s",display:"flex",flexDirection:"column",justifyContent:"space-between"}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px #7c3aed44";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
          <div style={{fontSize:28,marginBottom:8}}>⚡</div>
          <div style={{fontWeight:800,fontSize:15,color:"#fff",marginBottom:3}}>Quick 5</div>
          <div style={{fontSize:12,color:"#e0d4ff",lineHeight:1.55}}>5 questions · ~7 min · instant start</div>
          <div style={{marginTop:10,background:"#ffffff22",borderRadius:7,padding:"4px 10px",display:"inline-block",fontSize:11,fontWeight:700,color:"#fff",width:"fit-content"}}>Play Now →</div>
        </div>
        <Card style={{display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:11,color:goalDone?C.success:C.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:700}}>{goalDone?"✓ Today's Goal Done!":"Today's Goal"}</div>
            <div style={{fontSize:26,fontWeight:900,color:goalDone?C.success:C.text,fontFamily:T.serif}}>{todayCount}<span style={{fontSize:14,fontWeight:400,color:C.textMuted}}>/{dailyGoal}</span></div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:8}}>questions answered</div>
          </div>
          <div>
            <div style={{background:C.surfaceHigh,borderRadius:6,height:7,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${goalPct}%`,background:goalDone?`linear-gradient(90deg,${C.success},#4ade80)`:`linear-gradient(90deg,${C.accent},#a78bfa)`,borderRadius:6,transition:"width 0.6s"}}/>
            </div>
            {!goalDone&&<div style={{fontSize:11,color:C.textMuted,marginTop:4}}>{dailyGoal-todayCount} more to hit your goal</div>}
          </div>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {quickActions.map(c=>(
          <Card key={c.id} onClick={()=>setScreen(c.id)} role="button" ariaLabel={`Go to ${c.label}`}
            style={{cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color+"66";e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";}}>
            <div style={{fontSize:26,marginBottom:8}}>{c.icon}</div>
            <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:3}}>{c.label}</div>
            <div style={{fontSize:12,color:C.textMuted,lineHeight:1.55,marginBottom:c.badge?7:0}}>{c.desc}</div>
            {c.badge&&<Tag color={c.badge.color}>{c.badge.label}</Tag>}
          </Card>
        ))}
      </div>
    </main>
  );
}

// ─── LEARN SECTION ────────────────────────────────────────────────────────────

function Learn({user,onUpdateUser}){
  const [selected,setSelected]=useState(null); // {section, typeObj}
  const [activeSection,setActiveSection]=useState("Logical Reasoning");
  const learnProgress=user.learnProgress||{};

  if(selected)return <LearnLesson key={selected.typeObj.type} user={user} onUpdateUser={onUpdateUser} typeObj={selected.typeObj} section={selected.section} onBack={()=>setSelected(null)}/>;

  const sectionTypes=LEARN_CURRICULUM[activeSection];
  return(
    <main style={{maxWidth:760,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Learn</h1>
      <p style={{color:C.textSub,fontSize:14,marginBottom:22,lineHeight:1.6}}>Master every LSAT question type from first principles. Each lesson starts simple and builds to full test difficulty — guided by AI throughout.</p>

      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {SECTIONS.map(s=><button key={s} onClick={()=>setActiveSection(s)} style={{padding:"8px 18px",borderRadius:10,border:`1.5px solid ${activeSection===s?C.accent:C.border}`,background:activeSection===s?C.accentSoft:"transparent",color:activeSection===s?C.accent:C.textMuted,fontSize:13,fontWeight:activeSection===s?700:400,cursor:"pointer",fontFamily:T.sans,transition:"all 0.15s",outline:"none"}}>{s}</button>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {sectionTypes.map(t=>{
          const prog=learnProgress[t.type]||0;
          const mastered=prog>=4;
          const started=prog>0;
          const pct=Math.round(prog/4*100);
          return(
            <Card key={t.type} onClick={()=>setSelected({section:activeSection,typeObj:t})} role="button" ariaLabel={`Learn ${t.type}`}
              style={{cursor:"pointer",borderColor:mastered?C.success+"44":started?C.accent+"33":C.border,transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=mastered?C.success+"66":C.accent+"66";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=mastered?C.success+"44":started?C.accent+"33":C.border;}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:15,color:C.text}}>{t.type}</div>
                {mastered&&<span style={{fontSize:16}}>✅</span>}
                {!mastered&&started&&<span style={{fontSize:11,color:C.accent,fontWeight:700,background:C.accentSoft,padding:"2px 8px",borderRadius:10}}>In Progress</span>}
              </div>
              <div style={{fontSize:13,color:C.textMuted,lineHeight:1.55,marginBottom:12}}>{t.tagline}</div>
              {started&&!mastered&&<div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textMuted,marginBottom:4}}><span>Level {prog} of 4</span><span>{pct}%</span></div>
                <div style={{background:C.surfaceHigh,borderRadius:4,height:4}}><div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:4}}/></div>
              </div>}
              {!started&&<div style={{fontSize:12,color:C.textMuted}}>Not started</div>}
            </Card>
          );
        })}
      </div>
    </main>
  );
}

function LearnLesson({user,onUpdateUser,typeObj,section,onBack}){
  const [view,setView]=useState("lesson"); // lesson | practice | complete
  const [sectionIdx,setSectionIdx]=useState(0);
  const [levelIdx,setLevelIdx]=useState(0);
  const [question,setQuestion]=useState(null);
  const [loadingQ,setLoadingQ]=useState(false);
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [xpGained,setXpGained]=useState(0);
  const [error,setError]=useState(null);
  const learnSections=typeObj.sections||[];
  const currentSection=learnSections[sectionIdx];
  const currentLevel=typeObj.levels?.[levelIdx];
  const learnProgress=user.learnProgress||{};

  const genQuestion=async()=>{
    setLoadingQ(true);setError(null);setSelected(null);setSubmitted(false);setXpGained(0);
    const level=levelIdx+1;
    const sys=`You are an expert LSAT tutor generating a practice question for a student who just studied ${typeObj.type} questions. This is a Level ${level} question (1=simplest everyday language, 4=full LSAT difficulty).

Level guidelines:
- Level 1: Use simple everyday scenarios. Short, clear sentences. Very accessible. The correct answer should be clear once the student applies the ${typeObj.type} framework.
- Level 2: Moderate complexity. Realistic but accessible scenarios. Two-step reasoning.
- Level 3: LSAT-style language. Academic or legal content acceptable. 
- Level 4: Full official LSAT difficulty, style, and complexity.

Generate a ${typeObj.type} question for the ${section} section.

Respond ONLY with valid JSON (no markdown):
{"stimulus":"...","question":"...","choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct":"D","explanation":"CORRECT (D): [clear explanation of why D is right and directly connects to the ${typeObj.type} framework]. (A): [why wrong]. (B): [why wrong]. (C): [why wrong]. (E): [why wrong].","teaching_point":"One specific insight about ${typeObj.type} questions illustrated by this question.","level":${level}}` + " CRITICAL: The correct field must be whichever letter is actually correct — A, B, C, D, or E. Never always pick the same letter.";
    try{
      const raw=await callClaude(sys,`Generate a Level ${level} ${typeObj.type} question. Use a varied, original scenario — avoid placeholder names like Millbrook or Westview. Use diverse settings: universities, hospitals, companies, policy debates, scientific research. Keep the question type pure — this must be a clear ${typeObj.type} question.`,1200);
      setQuestion(parseJSON(raw));
    }catch(e){setError("Could not generate question: "+(e.message||"Please try again."));}
    setLoadingQ(false);
  };

  const submitAnswer=()=>{
    if(!selected||!question)return;
    setSubmitted(true);
    const correct=selected===question.correct;
    if(correct){
      const xp=XP_PER_CORRECT[levelIdx+1]||10;
      setXpGained(xp);
      onUpdateUser({
        history:[...(user.history||[]),{section,qType:typeObj.type,level:levelIdx+1,correct:true,xp,timestamp:Date.now(),source:"learn"}],
        stats:{...user.stats,xp:(user.stats?.xp||0)+xp},
      });
    }
  };

  const nextLevel=()=>{
    const newLevel=levelIdx+1;
    if(newLevel>=typeObj.levels.length){
      const newProgress={...(user.learnProgress||{}),[typeObj.type]:4};
      onUpdateUser({learnProgress:newProgress});
      setView("complete");
    }else{
      const newProgress={...(user.learnProgress||{}),[typeObj.type]:newLevel};
      onUpdateUser({learnProgress:newProgress});
      setLevelIdx(newLevel);
      setQuestion(null);setSelected(null);setSubmitted(false);setXpGained(0);
    }
  };

  const cs=(l)=>{if(!submitted)return selected===l?"sel":"def";if(l===question?.correct)return"ok";if(l===selected)return"bad";return"def";};
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:12,padding:"12px 18px",cursor:submitted?"default":"pointer",fontSize:14,marginBottom:10,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,boxSizing:"border-box",outline:"none",...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}:s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}:s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}:{background:"transparent",borderColor:C.border,color:C.textSub})});

  return(
    <main style={{maxWidth:760,margin:"0 auto",padding:"24px 20px"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:13,fontFamily:T.sans,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Back to Learn</button>

      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
          <Tag color={C.purple}>{section}</Tag>
          <Tag color={C.accent}>{typeObj.type}</Tag>
          {view==="practice"&&<Tag color={LEVEL_COLORS[levelIdx+1]}>Level {levelIdx+1} — {LEVEL_LABELS[levelIdx+1]}</Tag>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <button onClick={()=>setView("lesson")} style={{fontSize:13,padding:"5px 12px",borderRadius:8,border:`1px solid ${view==="lesson"?C.accent:C.border}`,background:view==="lesson"?C.accentSoft:"transparent",color:view==="lesson"?C.accent:C.textMuted,cursor:"pointer",fontFamily:T.sans}}>📖 Lesson</button>
          <button onClick={()=>{setView("practice");if(!question&&!loadingQ)genQuestion();}} style={{fontSize:13,padding:"5px 12px",borderRadius:8,border:`1px solid ${view==="practice"?C.accent:C.border}`,background:view==="practice"?C.accentSoft:"transparent",color:view==="practice"?C.accent:C.textMuted,cursor:"pointer",fontFamily:T.sans}}>🎯 Practice</button>
        </div>
        {/* Level progress */}
        <div style={{display:"flex",gap:6}}>
          {typeObj.levels?.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<levelIdx?C.success:i===levelIdx&&view==="practice"?C.accent:C.surfaceHigh,transition:"background 0.3s"}}/>)}
        </div>
      </div>

      {/* LESSON VIEW */}
      {view==="lesson"&&(
        <div>
          {/* Why this matters banner */}
          <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.accentSoft},${C.surface})`,borderColor:C.accent+"44"}}>
            <div style={{fontSize:13,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Why This Matters</div>
            <h2 style={{fontFamily:T.serif,fontSize:20,color:C.text,marginBottom:8,fontWeight:700}}>{typeObj.type}</h2>
            <p style={{fontSize:15,color:C.textSub,fontStyle:"italic",marginBottom:10,lineHeight:1.6}}>{typeObj.tagline}</p>
            <p style={{fontSize:14,color:C.textSub,lineHeight:1.75}}>{typeObj.why}</p>
          </Card>

          {/* Section navigation */}
          <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
            {learnSections.map((s,i)=>(
              <button key={i} onClick={()=>setSectionIdx(i)} style={{fontSize:12,padding:"5px 12px",borderRadius:8,border:`1px solid ${sectionIdx===i?C.accent:C.border}`,background:sectionIdx===i?C.accentSoft:"transparent",color:sectionIdx===i?C.accent:C.textMuted,cursor:"pointer",fontFamily:T.sans,fontWeight:sectionIdx===i?600:400,transition:"all 0.15s"}}>
                {i+1}. {s.title.split(":")[0].slice(0,22)}{s.title.length>22?"…":""}
              </button>
            ))}
          </div>

          {/* Current section content */}
          {currentSection&&(
            <Card style={{marginBottom:14}}>
              <h3 style={{fontFamily:T.serif,fontSize:18,color:C.text,marginBottom:16,fontWeight:700,borderBottom:`1px solid ${C.border}`,paddingBottom:12}}>{currentSection.title}</h3>
              <div style={{fontSize:15,color:C.text,lineHeight:1.95,whiteSpace:"pre-wrap"}}>{currentSection.content}</div>
            </Card>
          )}

          {/* Navigation */}
          <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
            {sectionIdx>0&&<Btn ghost onClick={()=>setSectionIdx(i=>i-1)}>← Previous Section</Btn>}
            {sectionIdx<learnSections.length-1
              ?<Btn onClick={()=>setSectionIdx(i=>i+1)} style={{marginLeft:"auto"}}>Next Section →</Btn>
              :<Btn onClick={()=>{setView("practice");genQuestion();}} style={{marginLeft:"auto",background:"linear-gradient(135deg,#7c3aed,#a78bfa)"}}>Start Practice Questions →</Btn>
            }
          </div>
        </div>
      )}

      {/* PRACTICE VIEW */}
      {view==="practice"&&(
        <div>
          <div style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.textSub}}>
            <strong style={{color:C.gold}}>Level {levelIdx+1} — {LEVEL_LABELS[levelIdx+1]}:</strong> {currentLevel?.desc}
          </div>

          {loadingQ&&<Spinner label="Lumora is generating your practice question…"/>}
          <ErrBanner message={error} onDismiss={()=>setError(null)}/>

          {question&&!loadingQ&&(
            <div>
              <Card style={{marginBottom:12}}>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>Apply your {typeObj.type} framework to this question:</div>
                <p style={{lineHeight:1.85,fontSize:15,color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{question.stimulus}</p>
                <p style={{fontWeight:600,fontSize:15,color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>{question.question}</p>
                <div role="radiogroup">{Object.entries(question.choices).map(([l,t])=><button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}><span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}</button>)}</div>
                {!submitted&&<Btn onClick={submitAnswer} disabled={!selected} style={{width:"100%",marginTop:8}}>Submit Answer</Btn>}
              </Card>

              {submitted&&(
                <div>
                  {xpGained>0&&<div role="status" style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"10px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}><span>⭐</span><span style={{color:C.gold,fontWeight:700}}>+{xpGained} XP!</span></div>}
                  <Card style={{borderColor:selected===question.correct?C.success:C.danger,marginBottom:12}}>
                    <div style={{fontSize:16,fontWeight:700,color:selected===question.correct?C.success:C.danger,marginBottom:10}}>
                      {selected===question.correct?"✓ Correct!":"✗ Not quite — here's why:"}
                    </div>
                    {question.teaching_point&&<div style={{background:C.accentSoft,border:`1px solid ${C.accent}33`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:14,color:C.accent}}>
                      💡 {question.teaching_point}
                    </div>}
                    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,fontSize:14,color:C.textSub,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{question.explanation}</div>
                  </Card>
                  {selected!==question.correct&&<Card style={{marginBottom:12,background:C.surfaceHigh,borderColor:C.purple+"44"}}>
                    <div style={{fontSize:13,color:C.purple,fontWeight:700,marginBottom:6}}>🤔 Don't worry — this is how mastery happens.</div>
                    <p style={{fontSize:14,color:C.textSub,lineHeight:1.7}}>Go back to the <button onClick={()=>setView("lesson")} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontWeight:600,fontSize:14,fontFamily:T.sans,padding:0}}>lesson sections</button> and re-read the framework. Then try another question. Each attempt builds intuition.</p>
                  </Card>}
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <Btn ghost onClick={genQuestion} style={{flex:1}}>Try Another Question</Btn>
                    {levelIdx<typeObj.levels.length-1
                      ?<Btn onClick={nextLevel} style={{flex:1}}>Next Level: {LEVEL_LABELS[levelIdx+2]} →</Btn>
                      :<Btn onClick={nextLevel} style={{flex:1,background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Complete Lesson ✓</Btn>
                    }
                  </div>
                </div>
              )}
            </div>
          )}
          {!question&&!loadingQ&&!error&&<div style={{textAlign:"center",padding:"32px 0"}}><Btn onClick={genQuestion}>Generate First Question</Btn></div>}
        </div>
      )}

      {/* COMPLETE VIEW */}
      {view==="complete"&&(
        <Card style={{textAlign:"center",padding:"48px 32px",borderColor:C.success+"44"}}>
          <div style={{fontSize:56,marginBottom:16}}>🎓</div>
          <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:10}}>Lesson Complete!</h2>
          <p style={{color:C.textSub,fontSize:15,lineHeight:1.7,marginBottom:8}}>You've worked through all 4 levels of <strong style={{color:C.text}}>{typeObj.type}</strong> questions.</p>
          <p style={{color:C.textSub,fontSize:13,lineHeight:1.7,marginBottom:28}}>Keep practicing in the Practice section to reinforce this skill. Spaced repetition is the key to making it automatic under test pressure.</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={onBack}>← Back to Learn</Btn>
            <Btn ghost onClick={()=>{setView("practice");setLevelIdx(0);setQuestion(null);setSubmitted(false);setSelected(null);genQuestion();}}>Practice More</Btn>
          </div>
        </Card>
      )}
    </main>
  );
}


// ─── QUEUE HOOK (with streaming delivery + duplicate prevention) ──────────────

function useQueue(user,section,level,qType,adaptive){
  const history=user.history||[];
  const [queue,setQueue]=useState([]);
  const [current,setCurrent]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const generating=useRef(false);
  const sessionTopics=useRef([]); // track topics this session to avoid repeats

  const getParams=useCallback(()=>{
    const sec=section||SECTIONS[Math.floor(Math.random()*SECTIONS.length)];
    let lv=level||2;
    if(adaptive&&history.length>=3){const recent=history.filter(h=>h.section===sec).slice(-8);if(recent.length>=3){const acc=recent.filter(h=>h.correct).length/recent.length;if(acc>0.8)lv=Math.min(4,lv+1);else if(acc<0.45)lv=Math.max(1,lv-1);}}
    let qt=qType||QUESTION_TYPES[sec][0];
    if(adaptive&&history.length>=4){
      const scored=QUESTION_TYPES[sec].map(t=>{const items=history.filter(h=>h.section===sec&&h.qType===t);return{t,s:items.length<2?0.6:items.filter(h=>h.correct).length/items.length};}).sort((a,b)=>a.s-b.s);
      qt=scored[0].t;
    }
    return{sec,lv,qt};
  },[section,level,qType,adaptive,history]);

  const genRaw=useCallback(async()=>{
    const{sec,lv,qt}=getParams();
    const recentTopics=sessionTopics.current.slice(-8);
    const raw=await callClaude(PRACTICE_SYSTEM,buildQ(sec,lv,qt,user.diagnostic,recentTopics),1200);
    const parsed=parseJSON(raw);
    const stim=(parsed.stimulus||"").toLowerCase();
    const words=stim.split(/\s+/).slice(0,10);
    const domain=stim.includes("animal")||stim.includes("species")||stim.includes("predator")||stim.includes("prey")?"DOM:BIOLOGY":
                 stim.includes("drug")||stim.includes("medication")||stim.includes("treatment")||stim.includes("patient")?"DOM:MEDICINE":
                 stim.includes("govern")||stim.includes("legislat")||stim.includes("senator")||stim.includes("congress")?"DOM:POLITICS":
                 stim.includes("company")||stim.includes("business")||stim.includes("market")||stim.includes("profit")||stim.includes("corporation")?"DOM:BUSINESS":
                 stim.includes("study")||stim.includes("research")||stim.includes("experiment")||stim.includes("survey")?"DOM:RESEARCH":
                 stim.includes("crime")||stim.includes("criminal")||stim.includes("prison")||stim.includes("sentence")?"DOM:CRIME":
                 stim.includes("environment")||stim.includes("climate")||stim.includes("pollution")||stim.includes("conservation")?"DOM:ENVIRONMENT":"DOM:OTHER";
    const topicKey=domain+":"+words.slice(0,5).join("_");
    sessionTopics.current=[...sessionTopics.current.slice(-9),topicKey];
    return{...parsed,section:sec,qType:qt,assignedLevel:lv};
  },[getParams,user]);

  // genOne: guards against concurrent background fills only
  const genOne=useCallback(async()=>{
    if(generating.current)return null;
    generating.current=true;
    try{const q=await genRaw();generating.current=false;return q;}
    catch(e){generating.current=false;throw e;}
  },[genRaw]);

  const fill=useCallback(async()=>{
    if(queue.length>=2||generating.current)return;
    try{const q=await genOne();if(q)setQueue(prev=>[...prev,q]);}catch{}
  },[queue.length,genOne]);

  const start=useCallback(async()=>{
    setLoading(true);setError(null);setCurrent(null);setQueue([]);
    sessionTopics.current=[];generating.current=false;
    try{const q=await genRaw();setCurrent(q);setLoading(false);setTimeout(fill,300);}
    catch(e){setError(e.message||"Failed to generate. Check your API key.");setLoading(false);}
  },[genRaw,fill]);

  // advance: ALWAYS generates — bypasses the generating lock so Next Question never hangs
  const advance=useCallback(async()=>{
    if(queue.length>0){
      const next=queue[0];
      setQueue(prev=>prev.slice(1));
      setCurrent(next);
      setTimeout(fill,200);
    }else{
      setLoading(true);setError(null);
      generating.current=false; // release any stale lock so genRaw can run
      try{const q=await genRaw();setCurrent(q);setLoading(false);setTimeout(fill,300);}
      catch(e){setError(e.message||"Failed to generate. Try again.");setLoading(false);}
    }
  },[queue,genRaw,fill]);

  useEffect(()=>{if(current&&queue.length<2&&!generating.current)fill();},[current,queue.length,fill]);
  return{current,loading,error,start,advance};
}

// ─── PRACTICE ─────────────────────────────────────────────────────────────────
// ─── WEAKNESS RADAR ───────────────────────────────────────────────────────────
function WeaknessRadar({user,onDrillWeakness}){
  const history=(user.history||[]).filter(h=>!h.source); // exclude learn questions
  if(history.length<5)return null;
  const typeStats={};
  history.forEach(h=>{
    if(!typeStats[h.qType])typeStats[h.qType]={c:0,t:0,section:h.section};
    typeStats[h.qType].t++;
    if(h.correct)typeStats[h.qType].c++;
  });
  const sorted=Object.entries(typeStats)
    .filter(([,v])=>v.t>=2)
    .map(([k,v])=>({type:k,section:v.section,pct:Math.round(v.c/v.t*100),total:v.t}))
    .sort((a,b)=>a.pct-b.pct);
  if(sorted.length===0)return null;
  const weakest=sorted.slice(0,3);
  const strongest=sorted.slice(-2).reverse();
  return(
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:20,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:8}}>
          <span>🎯</span> Weakness Radar
        </div>
        <button onClick={()=>onDrillWeakness(weakest[0])} style={{background:"linear-gradient(135deg,#f43f5e,#fb7185)",border:"none",borderRadius:10,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.sans}}>
          Drill Weakest Now →
        </button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {weakest.map((w,i)=>(
          <div key={w.type} style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:12,width:16,height:16,borderRadius:"50%",background:i===0?"#f43f5e":i===1?"#fb923c":"#f5c842",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,flexShrink:0}}>{i+1}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:13}}>
                <span style={{color:C.text,fontWeight:600}}>{w.type}</span>
                <span style={{color:w.pct<50?C.danger:w.pct<70?C.gold:C.success,fontWeight:700}}>{w.pct}%</span>
              </div>
              <div style={{background:C.surfaceHigh,borderRadius:3,height:5}}>
                <div style={{height:"100%",width:`${w.pct}%`,background:w.pct<50?C.danger:w.pct<70?C.gold:C.success,borderRadius:3,transition:"width 0.5s"}}/>
              </div>
            </div>
            <span style={{fontSize:11,color:C.textMuted,flexShrink:0}}>{w.total}q</span>
          </div>
        ))}
      </div>
      {strongest.length>0&&<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Strengths</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {strongest.map(s=><div key={s.type} style={{fontSize:12,padding:"3px 10px",borderRadius:10,background:C.success+"15",color:C.success,border:`1px solid ${C.success}33`,fontWeight:600}}>{s.type} {s.pct}% ✓</div>)}
        </div>
      </div>}
    </div>
  );
}

// ─── SESSION DEBRIEF ──────────────────────────────────────────────────────────
function SessionDebrief({sessionHistory,user,onDismiss,onRecord}){
  const [debrief,setDebrief]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{generate();},[]);
  const generate=async()=>{
    if(sessionHistory.length<3){setDebrief(null);setLoading(false);return;}
    const correct=sessionHistory.filter(h=>h.correct).length;
    const total=sessionHistory.length;
    const pct=Math.round(correct/total*100);
    const byType={};
    sessionHistory.forEach(h=>{if(!byType[h.qType])byType[h.qType]={c:0,t:0};byType[h.qType].t++;if(h.correct)byType[h.qType].c++;});
    const sorted=Object.entries(byType).map(([k,v])=>({type:k,pct:Math.round(v.c/v.t*100),t:v.t})).sort((a,b)=>a.pct-b.pct);
    try{
      const raw=await callClaude(
        `You are an encouraging LSAT tutor. Give a short, specific, personalized debrief of a student's practice session. Be warm, direct, and actionable. Respond ONLY with valid JSON:
{"headline":"One punchy sentence about this session (e.g. 'Strong session — your Assumption instincts are sharpening.')","insight":"One specific observation about what they did well or what pattern you notice.","tip":"One concrete, actionable technique they should apply next time for their weakest type.","emoji":"One relevant emoji"}`,
        `Session: ${correct}/${total} correct (${pct}%). Question types: ${sorted.map(s=>`${s.type} ${s.pct}% (${s.t}q)`).join(", ")}. Student's overall history: ${(user.history||[]).length} total questions, ${user.history?.length>0?Math.round(user.history.filter(h=>h.correct).length/user.history.length*100):0}% overall accuracy.`,
        400
      );
      setDebrief(parseJSON(raw));
    }catch{setDebrief({headline:`${pct>=70?"Strong":"Keep going"} — ${correct}/${total} correct this session.`,insight:sorted[0]?`Focus on ${sorted[0].type} — your lowest at ${sorted[0].pct}%.`:"Keep practicing consistently.",tip:"Review wrong answers carefully before moving on.",emoji:"📊"});}
    setLoading(false);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000bb",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,padding:32,maxWidth:420,width:"100%",textAlign:"center"}}>
        {loading?<Spinner label="Analyzing your session…"/>:<div>
          <div style={{fontSize:48,marginBottom:12}}>{debrief?.emoji||"📊"}</div>
          <div style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,fontWeight:700}}>Session Complete</div>
          <h3 style={{fontFamily:T.serif,fontSize:20,color:C.text,marginBottom:16,lineHeight:1.4}}>{debrief?.headline}</h3>
          {debrief?.insight&&<div style={{background:C.accentSoft,border:`1px solid ${C.accent}33`,borderRadius:12,padding:"12px 16px",marginBottom:12,fontSize:14,color:C.textSub,lineHeight:1.7,textAlign:"left"}}><span style={{color:C.accent,fontWeight:700}}>💡 </span>{debrief.insight}</div>}
          {debrief?.tip&&<div style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"12px 16px",marginBottom:20,fontSize:14,color:C.textSub,lineHeight:1.7,textAlign:"left"}}><span style={{color:C.gold,fontWeight:700}}>→ Next time: </span>{debrief.tip}</div>}
          <Btn onClick={onDismiss} style={{width:"100%"}}>Continue →</Btn>
        </div>}
      </div>
    </div>
  );
}

function Practice({user,onUpdateUser,initialWeakType}){
  // ── Config state ──
  const [section,setSection]=useState(initialWeakType?.section||null);
  const [level,setLevel]=useState(null);
  const [qType,setQType]=useState(initialWeakType?.type||null);
  const [adaptive,setAdaptive]=useState(true);
  const [timedMode,setTimedMode]=useState(false);
  const [configured,setConfigured]=useState(!!initialWeakType);

  // ── Question state — never null while a question is shown ──
  const [question,setQuestion]=useState(null);      // currently displayed question
  const [nextQuestion,setNextQuestion]=useState(null); // prefetched next question
  const [loadingQ,setLoadingQ]=useState(false);     // true only on initial load / hard retry
  const [prefetching,setPrefetching]=useState(false); // silent background fetch
  const [error,setError]=useState(null);

  // ── Answer state ──
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [ansFlash,setAnsFlash]=useState(null);
  const [xpEarned,setXpEarned]=useState(null);

  // ── Session state ──
  const [sessionCount,setSessionCount]=useState(0);
  const [sessionCorrect,setSessionCorrect]=useState(0);
  const [sessionHistory,setSessionHistory]=useState([]);
  const [showDebrief,setShowDebrief]=useState(false);

  // ── Extras ──
  const [sparring,setSparring]=useState(false);
  const [sparMsgs,setSparMsgs]=useState([]);
  const [sparInput,setSparInput]=useState("");
  const [sparLoading,setSparLoading]=useState(false);
  const [note,setNote]=useState("");
  const [noteOpen,setNoteOpen]=useState(false);
  const [questionTimer,setQuestionTimer]=useState(90);
  const questionTimerRef=useRef(null);
  const bottomRef=useRef(null);
  const domainWheelRef=useRef(0);
  const sessionTopics=useRef([]);

  // ── Build one question via API ──
  const fetchOne=useCallback(async()=>{
    domainWheelRef.current=(domainWheelRef.current+1)%DOMAIN_WHEEL.length;
    const sec=section||SECTIONS[Math.floor(Math.random()*SECTIONS.length)];
    let lv=level||2;
    if(adaptive){
      const h=user.history||[];
      if(h.length>=3){
        const recent=h.filter(x=>x.section===sec).slice(-8);
        if(recent.length>=3){
          const acc=recent.filter(x=>x.correct).length/recent.length;
          if(acc>0.8)lv=Math.min(4,lv+1);
          else if(acc<0.45)lv=Math.max(1,lv-1);
        }
      }
    }
    let qt=qType||QUESTION_TYPES[sec][Math.floor(Math.random()*QUESTION_TYPES[sec].length)];
    if(adaptive&&(user.history||[]).length>=4){
      const h=user.history||[];
      const scored=QUESTION_TYPES[sec].map(t=>{const items=h.filter(x=>x.section===sec&&x.qType===t);return{t,s:items.length<2?0.6:items.filter(x=>x.correct).length/items.length};}).sort((a,b)=>a.s-b.s);
      qt=scored[0].t;
    }
    const recentTopics=sessionTopics.current.slice(-6);
    const raw=await callClaude(PRACTICE_SYSTEM,buildQ(sec,lv,qt,user.diagnostic,recentTopics),1200);
    const parsed=parseJSON(raw);
    // track topic to avoid repeats
    const stim=(parsed.stimulus||"").toLowerCase();
    const topicKey=(stim.includes("animal")||stim.includes("species")?"BIO":stim.includes("drug")||stim.includes("patient")?"MED":stim.includes("govern")||stim.includes("legislat")?"POL":stim.includes("company")||stim.includes("market")?"BIZ":stim.includes("study")||stim.includes("research")?"RES":"GEN")+":"+stim.split(/\s+/).slice(0,4).join("_");
    sessionTopics.current=[...sessionTopics.current.slice(-8),topicKey];
    return{...parsed,section:sec,qType:qt,assignedLevel:lv};
  },[section,level,qType,adaptive,user]);

  // ── Start: load first question, then silently prefetch second ──
  const startPractice=useCallback(async()=>{
    setLoadingQ(true);setError(null);setQuestion(null);setNextQuestion(null);
    sessionTopics.current=[];
    try{
      const q=await fetchOne();
      setQuestion(q);setLoadingQ(false);
      // silently prefetch next
      setPrefetching(true);
      try{const nq=await fetchOne();setNextQuestion(nq);}catch{}
      setPrefetching(false);
    }catch(e){
      setError(e.message||"Failed to generate. Check your API key.");
      setLoadingQ(false);
    }
  },[fetchOne]);

  // ── Next question: swap in prefetched instantly, then prefetch again ──
  const nextQ=useCallback(async()=>{
    // Reset answer UI immediately
    setSelected(null);setSubmitted(false);setSparring(false);setSparMsgs([]);
    setXpEarned(null);setNote("");setNoteOpen(false);setAnsFlash(null);
    if(timedMode){
      clearInterval(questionTimerRef.current);
      setQuestionTimer(90);
      questionTimerRef.current=setInterval(()=>setQuestionTimer(t=>{if(t<=1){clearInterval(questionTimerRef.current);return 0;}return t-1;}),1000);
    }
    if(nextQuestion){
      // Instant swap — no loading state, no blank screen
      setQuestion(nextQuestion);
      setNextQuestion(null);
      // Silently prefetch the one after
      setPrefetching(true);
      try{const nq=await fetchOne();setNextQuestion(nq);}catch{}
      setPrefetching(false);
    }else{
      // No prefetch ready — show loading and fetch
      setLoadingQ(true);setQuestion(null);
      try{
        const q=await fetchOne();
        setQuestion(q);setLoadingQ(false);
        setPrefetching(true);
        try{const nq=await fetchOne();setNextQuestion(nq);}catch{}
        setPrefetching(false);
      }catch(e){
        setError(e.message||"Failed to generate.");setLoadingQ(false);
      }
    }
  },[nextQuestion,fetchOne,timedMode]);

  // ── Submit ──
  const submit=useCallback(()=>{
    if(!selected||!question)return;
    if(timedMode)clearInterval(questionTimerRef.current);
    setSubmitted(true);
    const correct=selected===question.correct;
    setAnsFlash(correct?"correct":"wrong");
    setTimeout(()=>setAnsFlash(null),600);
    const xp=correct?XP_PER_CORRECT[question.assignedLevel||2]:0;
    setXpEarned(xp);
    setSessionCount(c=>c+1);
    if(correct)setSessionCorrect(c=>c+1);
    const record={section:question.section,qType:question.qType,level:question.assignedLevel,correct,xp,timestamp:Date.now()};
    setSessionHistory(h=>[...h,record]);
    const newHistory=[...(user.history||[]),record];
    const newStats={...user.stats,xp:(user.stats?.xp||0)+xp};
    const newBadges=checkBadges(newHistory,newStats,user.earnedBadges||[]);
    onUpdateUser({history:newHistory,stats:newStats,earnedBadges:[...(user.earnedBadges||[]),...newBadges]});
    // Award Lex Points
    if(user.email){
      awardLexPoints(user.email,correct?5:0);
    }
    if(!correct&&question.stimulus&&user.email){
      const mistake={id:Date.now(),stimulus:question.stimulus,question:question.question,
        choices:question.choices,correct:question.correct,userAnswer:selected,
        explanation:question.explanation,key_concept:question.key_concept,
        section:question.section,qType:question.qType,level:question.assignedLevel,
        timestamp:Date.now(),reviewed:false};
      const existing=DB.getMistakes(user.email);
      DB.saveMistakes(user.email,[...existing,mistake]);
    }
    if(user.email){
      const srs=DB.getSRS(user.email);
      const updatedSRS={...srs,[question.qType]:srsUpdate(srs,question.qType,correct)};
      DB.saveSRS(user.email,updatedSRS);
    }
    if(newHistory.length>0&&newHistory.length%25===0&&user.email){
      const pred=computeScore(newHistory);
      if(pred){
        const sh=DB.getScoreHistory(user.email);
        DB.saveScoreHistory(user.email,[...sh,{date:Date.now(),score:pred.mid,total:newHistory.length}]);
      }
    }
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),150);
  },[selected,question,timedMode,user,onUpdateUser]);

  // Auto-submit on timer expire
  useEffect(()=>{
    if(timedMode&&questionTimer===0&&question&&!submitted){
      setSubmitted(true);
      const record={section:question.section,qType:question.qType,level:question.assignedLevel,correct:false,xp:0,timestamp:Date.now()};
      setSessionHistory(h=>[...h,record]);setSessionCount(c=>c+1);
      onUpdateUser({history:[...(user.history||[]),record]});
    }
  },[questionTimer,timedMode,question,submitted]);
  useEffect(()=>()=>clearInterval(questionTimerRef.current),[]);

  const endSession=()=>{if(sessionCount>=3)setShowDebrief(true);else setConfigured(false);};
  const startSpar=()=>{setSparring(true);setSparMsgs([{role:"assistant",text:`You chose ${selected} but the correct answer is ${question?.correct}. Make your case — why do you think ${selected} is right?`}]);};
  const sendSpar=async()=>{
    if(!sparInput.trim()||sparLoading)return;
    const msg=sparInput.trim();setSparInput("");
    const msgs=[...sparMsgs,{role:"user",text:msg}];
    setSparMsgs(msgs);setSparLoading(true);
    try{
      const sys="You are a Socratic LSAT tutor. Stimulus: "+question?.stimulus+" Correct: "+question?.correct+" Student chose: "+selected+" Explanation: "+question?.explanation+" Rules: Take their argument seriously. Ask ONE pointed Socratic question. Under 100 words.";
      const raw=await callClaude(sys,msgs.map(m=>`${m.role==="user"?"Student":"Tutor"}: ${m.text}`).join("\n"),300);
      setSparMsgs([...msgs,{role:"assistant",text:raw}]);
    }catch{setSparMsgs([...msgs,{role:"assistant",text:"Something went wrong. Try rephrasing."}]);}
    setSparLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  const saveNote=()=>{
    if(!note.trim())return;
    onUpdateUser({notes:[...(user.notes||[]),{id:Date.now(),text:note.trim(),source:`${question?.section||""} · ${question?.qType||""}`,timestamp:Date.now()}]});
    setNote("");setNoteOpen(false);
  };

  const cs=(l)=>{if(!submitted)return selected===l?"sel":"def";if(l===question?.correct)return"ok";if(l===selected)return"bad";return"def";};
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:12,padding:"12px 18px",cursor:submitted?"default":"pointer",fontSize:Math.round(14*FONT_SCALE)+"px",marginBottom:10,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,boxSizing:"border-box",outline:"none",...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}:s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}:s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}:{background:"transparent",borderColor:C.border,color:C.textSub})});

  // ── CONFIG SCREEN ──
  if(!configured)return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Practice</h1>
      <p style={{color:C.textSub,fontSize:14,marginBottom:16}}>Lumora generates a fresh question every time — infinite practice, no repeats.</p>
      <WeaknessRadar user={user} onDrillWeakness={(w)=>{setSection(w.section);setQType(w.type);setAdaptive(false);setConfigured(true);startPractice();}}/>
      <Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Section</div><div style={{display:"flex",flexWrap:"wrap",gap:9}}>{SECTIONS.map(s=><Pill key={s} active={section===s} onClick={()=>{setSection(s);setQType(null);}}>{s}</Pill>)}</div></Card>
      <Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Difficulty</div><div style={{display:"flex",gap:9,flexWrap:"wrap"}}>{[1,2,3,4].map(l=><Pill key={l} active={level===l} onClick={()=>setLevel(l)} color={LEVEL_COLORS[l]}>Level {l} — {LEVEL_LABELS[l]}</Pill>)}</div></Card>
      {section&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Question Type</div><div style={{display:"flex",flexWrap:"wrap",gap:9}}>{QUESTION_TYPES[section].map(t=><Pill key={t} active={qType===t} onClick={()=>setQType(t)}>{t}</Pill>)}</div></Card>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
        <Card style={{padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setAdaptive(v=>!v)} role="checkbox" aria-checked={adaptive} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setAdaptive(v=>!v);}}>
            <div style={{width:36,height:20,borderRadius:10,background:adaptive?C.accent:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:14,height:14,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:adaptive?19:3,transition:"left 0.2s"}}/></div>
            <div><div style={{fontWeight:600,fontSize:13,color:C.text}}>Adaptive</div><div style={{fontSize:11,color:C.textMuted}}>Targets weak areas</div></div>
          </div>
        </Card>
        <Card style={{padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setTimedMode(v=>!v)} role="checkbox" aria-checked={timedMode} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setTimedMode(v=>!v);}}>
            <div style={{width:36,height:20,borderRadius:10,background:timedMode?C.danger:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:14,height:14,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:timedMode?19:3,transition:"left 0.2s"}}/></div>
            <div><div style={{fontWeight:600,fontSize:13,color:C.text}}>⏱ Timed</div><div style={{fontSize:11,color:C.textMuted}}>90 sec per question</div></div>
          </div>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Btn onClick={()=>{setConfigured(true);startPractice();if(timedMode){setQuestionTimer(90);questionTimerRef.current=setInterval(()=>setQuestionTimer(t=>{if(t<=1){clearInterval(questionTimerRef.current);return 0;}return t-1;}),1000);}}} style={{padding:15}}>Start Practice →</Btn>
        <Btn onClick={()=>{
          const randSec=SECTIONS[Math.floor(Math.random()*SECTIONS.length)];
          const randType=QUESTION_TYPES[randSec][Math.floor(Math.random()*QUESTION_TYPES[randSec].length)];
          const randLevel=Math.ceil(Math.random()*4);
          setSection(randSec);setQType(randType);setLevel(randLevel);setAdaptive(false);
          setConfigured(true);
          setTimeout(startPractice,50);
          if(timedMode){setQuestionTimer(90);questionTimerRef.current=setInterval(()=>setQuestionTimer(t=>{if(t<=1){clearInterval(questionTimerRef.current);return 0;}return t-1;}),1000);}
        }} style={{padding:15,background:"linear-gradient(135deg,#7c3aed,#a78bfa)"}}>🎲 Random</Btn>
      </div>
    </main>
  );

  // ── ACTIVE PRACTICE SCREEN ──
  return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"22px 20px"}}>
      {ansFlash&&<AnswerFlash correct={ansFlash==="correct"}/>}
      {showDebrief&&<SessionDebrief sessionHistory={sessionHistory} user={user} onDismiss={()=>{setShowDebrief(false);setConfigured(false);setSessionHistory([]);setSessionCount(0);setSessionCorrect(0);}} onRecord={onUpdateUser}/>}

      {/* Header bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:8}}>
        <div>
          {question&&<><Tag color={C.accent}>{question.section}</Tag><Tag color={LEVEL_COLORS[question.assignedLevel]}>Level {question.assignedLevel}</Tag><Tag color={C.purple}>{question.qType}</Tag></>}
          {adaptive&&<Tag color={C.purple}>Adaptive</Tag>}
          {timedMode&&<Tag color={C.danger}>⏱ Timed</Tag>}
          {prefetching&&<span style={{fontSize:11,color:C.textMuted,marginLeft:6}}>⚡ loading next…</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {timedMode&&!submitted&&question&&<div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:questionTimer<=15?C.danger:questionTimer<=30?C.gold:C.text,minWidth:40,textAlign:"center"}}>{questionTimer}</div>}
          <span style={{color:C.textSub,fontSize:13}}>{sessionCount} done · {sessionCount>0?Math.round(sessionCorrect/sessionCount*100):"—"}%</span>
          {sessionCount>=3&&<Btn ghost onClick={endSession} small>End Session</Btn>}
          <Btn ghost onClick={()=>setConfigured(false)} small>Settings</Btn>
        </div>
      </div>

      {/* Loading state — only on first load or hard retry */}
      {loadingQ&&!question&&<Spinner label="Lumora is generating your question…"/>}
      {error&&!loadingQ&&<Card style={{borderColor:C.danger,marginBottom:12}}><ErrBanner message={error}/><Btn onClick={startPractice} style={{marginTop:8}}>Retry</Btn></Card>}

      {/* Question — stays visible while prefetching next */}
      {question&&(
        <div>
          <Card style={{marginBottom:12}}>
            <p style={{lineHeight:1.85,fontSize:Math.round(15*FONT_SCALE)+"px",color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{question.stimulus}</p>
            <p style={{fontWeight:600,fontSize:Math.round(15*FONT_SCALE)+"px",color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>{question.question}</p>
            <div role="radiogroup">{Object.entries(question.choices).map(([l,t])=><button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}><span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}</button>)}</div>
            {!submitted&&<Btn onClick={submit} disabled={!selected} style={{width:"100%",marginTop:8}}>Submit Answer</Btn>}
          </Card>

          {submitted&&(
            <div ref={bottomRef}>
              {xpEarned>0&&<div role="status" style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"10px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:10}}><span>⭐</span><span style={{color:C.gold,fontWeight:700}}>+{xpEarned} XP!</span></div>}
              <Card style={{borderColor:selected===question.correct?C.success:C.danger,marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:700,color:selected===question.correct?C.success:C.danger,marginBottom:8}}>
                  {selected===question.correct?"✓ Correct!":"✗ Incorrect — here's what happened"}
                </div>
                {question.key_concept&&<div style={{background:C.surfaceHigh,borderRadius:10,padding:"9px 13px",marginBottom:10,fontSize:13,color:C.purple,display:"flex",gap:8,alignItems:"flex-start"}}><span style={{flexShrink:0}}>🔑</span><span>{question.key_concept}</span></div>}
                {selected!==question.correct&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                  <div style={{background:"#052e16",border:`1px solid ${C.success}44`,borderRadius:10,padding:"11px 14px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.success,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Why {question.correct} is correct</div>
                    <div style={{fontSize:14,color:"#86efac",lineHeight:1.75}}>{question.explanation?.split("WRONG")[0]?.replace(/^CORRECT[^:]*:/i,"").trim()||question.explanation}</div>
                  </div>
                  <div style={{background:"#2d0a0a",border:`1px solid ${C.danger}44`,borderRadius:10,padding:"11px 14px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.danger,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Why {selected} misses the mark</div>
                    <div style={{fontSize:14,color:"#fca5a5",lineHeight:1.75}}>{question.explanation?.includes("WRONG ("+selected+")")?question.explanation.split("WRONG ("+selected+")")[1]?.split("WRONG")[0]?.replace(/^[^:]*:/,"").trim()||"Review the explanation above.":"Review the full explanation above."}</div>
                  </div>
                </div>}
                {selected===question.correct&&<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,fontSize:14,color:C.textSub,lineHeight:1.85}}>{question.explanation?.split("WRONG")[0]?.replace(/^CORRECT[^:]*:/i,"").trim()||question.explanation}</div>}
              </Card>

              {!sparring&&selected!==question.correct&&<Card style={{marginBottom:12,borderColor:C.purple+"44"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:24}}>🥊</span><div style={{flex:1}}><div style={{fontWeight:700,color:C.text,marginBottom:3}}>Think you're right? Argue your case.</div><div style={{fontSize:13,color:C.textMuted}}>Debate Lumora in Socratic dialogue.</div></div><Btn onClick={startSpar} small style={{background:"linear-gradient(135deg,#7c3aed,#a78bfa)",flexShrink:0}}>Spar →</Btn></div>
              </Card>}
              {sparring&&<Card style={{marginBottom:12,borderColor:C.purple+"44"}}>
                <h3 style={{fontWeight:700,color:C.purple,marginBottom:12,fontSize:15}}>🥊 Argument Sparring</h3>
                <div aria-live="polite" style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12,maxHeight:280,overflowY:"auto"}}>
                  {sparMsgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:12,fontSize:14,lineHeight:1.7,background:m.role==="user"?C.accentSoft:C.surfaceHigh,color:m.role==="user"?C.text:C.textSub}}>{m.text}</div></div>)}
                  {sparLoading&&<div style={{color:C.textMuted,fontSize:13}}>Thinking…</div>}
                  <div ref={bottomRef}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={sparInput} onChange={e=>setSparInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendSpar()} placeholder="Make your argument…" aria-label="Your argument" style={{flex:1,background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:14,fontFamily:T.sans,outline:"none"}}/>
                  <Btn onClick={sendSpar} disabled={sparLoading||!sparInput.trim()} small>Send</Btn>
                </div>
              </Card>}

              <Card style={{marginBottom:14}}>
                <button onClick={()=>setNoteOpen(v=>!v)} aria-expanded={noteOpen} style={{background:"none",border:"none",color:C.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.sans,padding:0}}>{noteOpen?"▾":"▸"} Add a study note</button>
                {noteOpen&&<div style={{marginTop:10}}><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Key insight, pattern, or strategy to remember…" rows={3} aria-label="Study note" style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:14,fontFamily:T.sans,resize:"vertical",boxSizing:"border-box",outline:"none"}}/><Btn ghost onClick={saveNote} small style={{marginTop:8}}>Save Note</Btn></div>}
              </Card>
              <Btn onClick={nextQ} style={{width:"100%",padding:16,fontSize:16}}>Next Question →</Btn>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

// ─── FLAW LAB (Lumora-generated fresh arguments) ──────────────────────────────────

function FlawLab({user,onUpdateUser}){
  const [phase,setPhase]=useState("config");
  const [seedIdx,setSeedIdx]=useState(0);
  const [timed,setTimed]=useState(true);
  const [timeLeft,setTimeLeft]=useState(20*60);
  const [argument,setArgument]=useState(null);
  const [loadingArg,setLoadingArg]=useState(false);
  const [response,setResponse]=useState("");
  const [feedback,setFeedback]=useState(null);
  const [loadingFb,setLoadingFb]=useState(false);
  const [error,setError]=useState(null);
  const timerRef=useRef(null);
  const seed=FLAW_SEEDS[seedIdx];
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const wc=response.trim()?response.trim().split(/\s+/).length:0;
  const sc=p=>p>=80?C.success:p>=60?C.gold:C.danger;

  const generateArgument=async()=>{
    setLoadingArg(true);setError(null);setArgument(null);
    const sys=`You are an expert at writing realistic legal arguments that contain specific logical flaws. Write a realistic, sophisticated-sounding argument of 300-450 words in the style of ${seed.legalContext}. The argument should contain the following type of flaw: ${seed.style} — ${seed.description}

The argument should sound CONVINCING on the surface. It should use real-sounding statistics, names, or cases. The flaw should be subtle enough to require careful reading to identify, but clearly present once spotted.

Respond ONLY with valid JSON:
{"title":"A specific, realistic title for this argument","context":"One sentence describing the setting (e.g. who is speaking, to whom, about what)","argument":"The full argument text, 300-450 words, written in formal legal/policy language"}`;
    try{
      const raw=await callClaude(sys,`Generate a fresh, unique flawed legal argument using the ${seed.style} pattern. Make it specific and realistic — not generic. Use a concrete scenario, real-sounding data, and a distinct setting. This must be completely different from any previous arguments on this topic.`);
      setArgument(parseJSON(raw));
    }catch(e){setError("Could not generate argument: "+(e.message||"Please try again."));}
    setLoadingArg(false);
  };

  const startWriting=()=>{
    setPhase("writing");setResponse("");setFeedback(null);setError(null);
    if(timed){
      setTimeLeft(20*60);
      timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);doSubmit();return 0;}return t-1;}),1000);
    }
  };
  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const doSubmit=async()=>{
    clearInterval(timerRef.current);
    setPhase("feedback");setLoadingFb(true);setError(null);
    const sys=`You are an expert LSAT logical reasoning instructor evaluating a student's ability to identify and rebut logical flaws in legal arguments.

First, analyze the argument and identify ALL logical flaws present (the argument was designed to contain a ${seed.style} flaw).
Then evaluate the student's response on four dimensions:
- Flaw Identification (25pts): Did they correctly name the specific flaw(s)?
- Argumentation (30pts): Is their counter-argument logically sound?
- Precision (25pts): Is the identification precise and accurate?
- Writing Quality (20pts): Clear, organized, professional?

Respond ONLY with valid JSON:
{"flaws_in_argument":["flaw 1","flaw 2"],"student_identified_correctly":true,"overall_score":78,"grade":"B","summary":"2-3 sentence assessment","scores":{"flaw_identification":{"score":20,"max":25,"comment":"..."},"argumentation":{"score":24,"max":30,"comment":"..."},"precision":{"score":18,"max":25,"comment":"..."},"writing":{"score":16,"max":20,"comment":"..."}},"strengths":["..."],"improvements":["..."],"model_response":"2-3 sentences showing how an excellent response would open."}`;
    try{
      const raw=await callClaude(sys,`Argument Title: ${argument?.title||seed.style}\nContext: ${argument?.context||seed.description}\n\nThe Argument:\n${argument?.argument||"[not generated]"}\n\nStudent Response:\n${response||"[No response]"}`,1800);
      setFeedback(parseJSON(raw));
    }catch(e){setError("Could not generate feedback: "+(e.message||"Please try again."));}
    setLoadingFb(false);
  };

  if(phase==="config")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Flaw Lab ⚖️</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:16,lineHeight:1.7}}>Each session, Lumora generates a fresh, unique flawed legal argument — you'll never see the same argument twice. Identify the flaw, explain the reasoning error, and argue against it.</p>
      <Card style={{marginBottom:14,background:C.accentSoft,borderColor:C.accent+"44"}}>
        <strong style={{color:C.text,display:"block",marginBottom:8,fontSize:13}}>How It Works</strong>
        {["Choose a flaw type — Lumora generates a unique argument in that style","Read the argument carefully — flaws may be subtle","Identify the specific logical flaw(s) by name","Explain precisely why the reasoning fails","Construct your counter-argument with sound logic","Lumora scores flaw identification, argumentation, precision, and writing"].map((s,i)=><div key={i} style={{display:"flex",gap:10,fontSize:13,marginBottom:5}}><span style={{color:C.accent,fontWeight:700,flexShrink:0}}>{i+1}.</span><span style={{color:C.textSub}}>{s}</span></div>)}
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>Choose a Flaw Type</div>
        {FLAW_SEEDS.map((s,i)=>(
          <div key={s.style} onClick={()=>setSeedIdx(i)} role="radio" aria-checked={seedIdx===i} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")setSeedIdx(i);}}
            style={{padding:"14px 16px",borderRadius:12,border:`1.5px solid ${seedIdx===i?C.accent:C.border}`,background:seedIdx===i?C.accentSoft:"transparent",cursor:"pointer",marginBottom:10,transition:"all 0.15s"}}>
            <div style={{fontWeight:600,fontSize:14,color:seedIdx===i?C.text:C.textSub,marginBottom:3}}>{s.style}</div>
            <div style={{fontSize:13,color:C.textMuted,lineHeight:1.5}}>{s.description}</div>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setTimed(v=>!v)} role="checkbox" aria-checked={timed} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setTimed(v=>!v);}}>
          <div style={{width:40,height:22,borderRadius:11,background:timed?C.accent:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:timed?21:3,transition:"left 0.2s"}}/></div>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>Timed Mode (20 minutes)</div><div style={{fontSize:12,color:C.textMuted}}>Auto-submits when time runs out.</div></div>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Btn onClick={async()=>{setPhase("loading");await generateArgument();setPhase("reading");}} style={{padding:15}}>Generate This Type →</Btn>
        <Btn onClick={async()=>{const ri=Math.floor(Math.random()*FLAW_SEEDS.length);setSeedIdx(ri);setPhase("loading");await generateArgument();setPhase("reading");}} style={{padding:15,background:"linear-gradient(135deg,#7c3aed,#a78bfa)"}}>🎲 Random Flaw →</Btn>
      </div>
    </main>
  );

  if(phase==="loading")return(
    <main style={{maxWidth:580,margin:"0 auto",padding:"32px 20px",textAlign:"center"}}>
      <Spinner label="Lumora is crafting a unique flawed argument…"/>
      <p style={{color:C.textMuted,fontSize:13,marginTop:8}}>This takes about 10 seconds. Each argument is completely unique to you.</p>
    </main>
  );

  if(phase==="reading")return(
    <main style={{maxWidth:760,margin:"0 auto",padding:"20px 20px"}}>
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>
      {argument&&<>
        <div style={{marginBottom:16}}><Tag color={C.purple}>Flaw Lab</Tag><Tag color={C.danger}>{seed.style}</Tag>
          <h2 style={{fontFamily:T.serif,fontSize:22,color:C.text,marginTop:10,marginBottom:4}}>{argument.title}</h2>
          <p style={{color:C.textMuted,fontSize:13}}>{argument.context}</p>
        </div>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>The Argument</div>
          <div style={{fontSize:15,color:"#c8d4e8",lineHeight:1.9,whiteSpace:"pre-wrap",fontFamily:T.serif}}>{argument.argument}</div>
        </Card>
        <div style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.textSub,lineHeight:1.7}}>
          <strong style={{color:C.gold}}>Your task:</strong> Identify the logical flaw(s), explain precisely why the reasoning fails, and argue against it. Be specific — precision is scored.
        </div>
        <Btn onClick={startWriting} style={{width:"100%",padding:15}}>I've Read It — Start Writing →</Btn>
      </>}
    </main>
  );

  if(phase==="writing"){
    const danger=timed&&timeLeft<180;
    return(
      <main style={{maxWidth:760,margin:"0 auto",padding:"20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Tag color={C.purple}>Flaw Lab — Writing</Tag>
            {timed&&<div style={{fontFamily:T.serif,fontSize:20,color:danger?C.danger:C.text,fontWeight:700}} aria-live="polite">{fmt(timeLeft)}</div>}
            <span style={{color:C.textMuted,fontSize:13}}>{wc} words</span>
          </div>
          <Btn onClick={doSubmit} small style={{background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Submit ✓</Btn>
        </div>
        <Card style={{marginBottom:12,padding:"14px 18px"}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>{argument?.title}</div>
          <div style={{fontSize:13,color:C.textMuted,fontStyle:"italic"}}>{seed.style} flaw</div>
        </Card>
        <textarea value={response} onChange={e=>setResponse(e.target.value)} aria-label="Your flaw identification and counter-argument"
          placeholder={"Identify the logical flaw(s) in this argument.\n\nExplain precisely why the reasoning is invalid.\n\nConstruct your counter-argument.\n\nAim for 300–500 words. Precision scores higher than length."}
          style={{width:"100%",minHeight:420,background:C.surface,border:`1.5px solid ${danger?C.danger:C.border}`,borderRadius:14,padding:"20px 22px",color:C.text,fontSize:15,fontFamily:T.sans,resize:"vertical",lineHeight:1.85,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,color:C.textMuted}}>
          <span>{wc} words · Aim for 300–500</span>
          {timed&&<span style={{color:danger?C.danger:C.textMuted}}>{danger?"⚠ ":""}{fmt(timeLeft)} remaining</span>}
        </div>
      </main>
    );
  }

  if(phase==="feedback")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:22}}>Flaw Lab Feedback</h2>
      {loadingFb&&<Spinner label="Evaluating your argument…"/>}
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>
      {feedback&&!loadingFb&&<div>
        <Card style={{marginBottom:14,padding:"24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
            <Arc pct={feedback.overall_score} size={110} color={sc(feedback.overall_score)} label={`Score: ${feedback.overall_score}%`}/>
            <div style={{flex:1}}><div style={{fontSize:30,fontWeight:900,color:C.text,fontFamily:T.serif,marginBottom:4}}>{feedback.grade}</div><div style={{fontSize:14,color:C.textSub,lineHeight:1.7}}>{feedback.summary}</div></div>
          </div>
        </Card>
        {feedback.flaws_in_argument?.length>0&&<Card style={{marginBottom:14,borderColor:C.danger+"44"}}>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.danger,marginBottom:12}}>Actual Flaws in the Argument</div>
          {feedback.flaws_in_argument.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.danger,fontWeight:700,flexShrink:0}}>{i+1}.</span>{f}</div>)}
          <div style={{marginTop:10,padding:"8px 12px",background:(feedback.student_identified_correctly?C.success:C.danger)+"15",borderRadius:8,fontSize:13,color:feedback.student_identified_correctly?C.success:C.danger,fontWeight:600}}>
            {feedback.student_identified_correctly?"✓ You correctly identified the core flaw.":"✗ Your identification missed or mischaracterized the key flaw."}
          </div>
        </Card>}
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:16}}>Score Breakdown</div>
          {feedback.scores&&Object.entries(feedback.scores).map(([key,val])=>{const pct=Math.round(val.score/val.max*100);const labels={flaw_identification:"Flaw Identification",argumentation:"Argumentation",precision:"Precision & Accuracy",writing:"Writing Quality"};return(<div key={key} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}><span style={{color:C.text,fontWeight:600}}>{labels[key]||key}</span><span style={{color:sc(pct),fontWeight:700}}>{val.score}/{val.max}</span></div><div style={{background:C.surfaceHigh,borderRadius:4,height:7,marginBottom:6}}><div style={{height:"100%",width:`${pct}%`,background:sc(pct),borderRadius:4,transition:"width 0.6s"}}/></div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{val.comment}</div></div>);})}
        </Card>
        {feedback.strengths?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.success,marginBottom:12}}>What You Did Well</div>{feedback.strengths.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.success}}>✓</span>{s}</div>)}</Card>}
        {feedback.improvements?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.gold,marginBottom:12}}>How to Improve</div>{feedback.improvements.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.gold}}>→</span>{s}</div>)}</Card>}
        {feedback.model_response&&<Card style={{marginBottom:14,borderColor:C.accent+"44"}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:10}}>Model Response — How a Top Answer Opens</div><p style={{color:C.text,fontSize:14,lineHeight:1.85,fontStyle:"italic"}}>{feedback.model_response}</p></Card>}
        <Btn onClick={()=>{setPhase("config");setFeedback(null);setArgument(null);setError(null);}} style={{width:"100%"}}>Try Another →</Btn>
      </div>}
    </main>
  );
  return null;
}

// ─── WRITING (Lumora-generated fresh prompt variations) ────────────────────────────

function Writing(){
  const [phase,setPhase]=useState("config");
  const [seedIdx,setSeedIdx]=useState(0);
  const [timed,setTimed]=useState(true);
  const [timeLeft,setTimeLeft]=useState(15*60);
  const [prompt,setPrompt]=useState(null);
  const [loadingPrompt,setLoadingPrompt]=useState(false);
  const [pre,setPre]=useState({position:"",strongest:"",weakest:"",counter:""});
  const [preNotes,setPreNotes]=useState("");
  const [essay,setEssay]=useState("");
  const [feedback,setFeedback]=useState(null);
  const [loadingFb,setLoadingFb]=useState(false);
  const [error,setError]=useState(null);
  const timerRef=useRef(null);
  const phaseRef=useRef("config");
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const wc=essay.trim()?essay.trim().split(/\s+/).length:0;
  const sc=p=>p>=80?C.success:p>=60?C.gold:C.danger;
  const setPhaseSync=(p)=>{phaseRef.current=p;setPhase(p);};
  const stopTimer=()=>{clearInterval(timerRef.current);timerRef.current=null;};

  const generatePrompt=async()=>{
    setLoadingPrompt(true);setError(null);
    const seed=WRITING_SEEDS[seedIdx];
    const sys=`You are an expert LSAT writing prompt designer. Generate a unique, fresh variation of an argumentative writing prompt on the theme of: ${seed.topic}.

The prompt must follow the 2026 LSAC format exactly:
- A specific debatable scenario (not the same as the seed — make it fresh and specific)
- A clear key question students must answer
- Exactly 4 perspectives representing: ${seed.perspectiveThemes.join(", ")}

Each perspective should be 2-3 sentences of substantive argument representing that viewpoint.

Make the scenario SPECIFIC and CONCRETE — not generic. Use real-world details, contemporary context, and a fresh angle each time.

Respond ONLY with valid JSON:
{"topic":"Specific topic title","keyQuestion":"The specific key question","context":"2-3 sentence context paragraph","perspectives":[{"label":"Perspective name","text":"2-3 sentence argument"},{"label":"...","text":"..."},{"label":"...","text":"..."},{"label":"...","text":"..."}]}`;
    try{
      const raw=await callClaude(sys,`Generate a completely fresh, unique writing prompt on the theme of ${seed.topic}. Be specific and original — use a novel angle, fresh statistics, or a specific contemporary scenario that hasn't been used before. This must feel new.`);
      setPrompt(parseJSON(raw));
    }catch(e){setError("Could not generate prompt: "+(e.message||"Please try again."));}
    setLoadingPrompt(false);
  };

  const goEssay=useCallback(()=>{
    stopTimer();setPhaseSync("essay");
    if(timed){setTimeLeft(35*60);timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){stopTimer();setPhaseSync("submitting");return 0;}return t-1;}),1000);}
  },[timed]);

  useEffect(()=>{if(phase==="submitting")doSubmit();},[phase]);
  useEffect(()=>()=>stopTimer(),[]);

  const startPre=()=>{
    stopTimer();setPhaseSync("prewriting");setEssay("");setFeedback(null);setError(null);
    setPre({position:"",strongest:"",weakest:"",counter:""});setPreNotes("");
    if(timed){setTimeLeft(15*60);timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){stopTimer();goEssay();return 0;}return t-1;}),1000);}
  };

  const doSubmit=async()=>{
    stopTimer();setPhaseSync("feedback");setLoadingFb(true);setError(null);
    const sys=`You are an expert LSAT Argumentative Writing evaluator using the 2026 LSAC rubric.
2026 format: debatable topic + key question + 4 perspectives. Students take their OWN position — not pick between two options.
Evaluate: Thesis (20pts), Perspective Engagement (25pts), Argumentation (25pts), Counterargument (20pts), Mechanics (10pts).
Respond ONLY with valid JSON:
{"thesis_position":"...","overall_score":82,"grade":"B+","summary":"...","scores":{"thesis":{"score":17,"max":20,"comment":"..."},"perspectives":{"score":20,"max":25,"comment":"..."},"argumentation":{"score":18,"max":25,"comment":"..."},"counterargument":{"score":14,"max":20,"comment":"..."},"mechanics":{"score":8,"max":10,"comment":"..."}},"strengths":["...","..."],"improvements":["...","..."],"perspective_engagement":"...","rewritten_intro":"..."}`;
    try{
      const persp=prompt?.perspectives?.map((p,i)=>`P${i+1} — ${p.label}: ${p.text}`).join("\n\n")||"";
      const raw=await callClaude(sys,`Topic: ${prompt?.topic}\nKey Question: ${prompt?.keyQuestion}\nContext: ${prompt?.context}\n\nPerspectives:\n${persp}\n\nStudent prewriting: ${pre.position||"[none]"}\nStudent notes: ${preNotes||"[none]"}\n\nStudent Essay:\n${essay||"[No essay submitted]"}`,1800);
      setFeedback(parseJSON(raw));
    }catch(e){setError("Could not generate feedback: "+(e.message||"Please try again."));setPhaseSync("essay");}
    setLoadingFb(false);
  };

  if(phase==="config")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Argumentative Writing</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:16}}>Choose a topic theme — Lumora generates a completely fresh, unique prompt every session. Infinite practice, never the same twice.</p>
      <Card style={{marginBottom:14,background:C.accentSoft,borderColor:C.accent+"44"}}>
        <strong style={{color:C.text,display:"block",marginBottom:8,fontSize:13}}>2026 LSAC Format</strong>
        <p style={{fontSize:13,color:C.textSub,lineHeight:1.8,margin:"0 0 12px"}}>A debatable issue + key question + 4 perspectives. Take your own position and engage with the perspectives. No single correct answer.</p>
        <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
          {[["15 min","Prewriting",C.gold],["35 min","Essay",C.accent],["50 min","Total",C.text]].map(([t,l,c])=><div key={l} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:c}}>{t}</div><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div></div>)}
        </div>
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>Choose a Topic Theme</div>
        {WRITING_SEEDS.map((s,i)=>(
          <div key={s.topic} onClick={()=>setSeedIdx(i)} role="radio" aria-checked={seedIdx===i} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")setSeedIdx(i);}}
            style={{padding:"14px 16px",borderRadius:12,border:`1.5px solid ${seedIdx===i?C.accent:C.border}`,background:seedIdx===i?C.accentSoft:"transparent",cursor:"pointer",marginBottom:10,transition:"all 0.15s"}}>
            <div style={{fontWeight:600,fontSize:14,color:seedIdx===i?C.text:C.textSub,marginBottom:3}}>{s.topic}</div>
            <div style={{fontSize:13,color:C.textMuted,lineHeight:1.5}}>{s.keyQuestion}</div>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setTimed(v=>!v)} role="checkbox" aria-checked={timed} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setTimed(v=>!v);}}>
          <div style={{width:40,height:22,borderRadius:11,background:timed?C.accent:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:timed?21:3,transition:"left 0.2s"}}/></div>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>Timed Mode (50 min total)</div><div style={{fontSize:12,color:C.textMuted}}>15 min prewriting auto-advances to 35 min essay.</div></div>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Btn onClick={async()=>{setPhaseSync("generating");await generatePrompt();if(phaseRef.current==="generating")setPhaseSync("prewriting_ready");}} style={{padding:15}}>Generate This Theme →</Btn>
        <Btn onClick={async()=>{const ri=Math.floor(Math.random()*WRITING_SEEDS.length);setSeedIdx(ri);setPhaseSync("generating");await generatePrompt();if(phaseRef.current==="generating")setPhaseSync("prewriting_ready");}} style={{padding:15,background:"linear-gradient(135deg,#7c3aed,#a78bfa)"}}>🎲 Random Theme →</Btn>
      </div>
    </main>
  );

  if(phase==="generating")return(
    <main style={{maxWidth:580,margin:"0 auto",padding:"32px 20px",textAlign:"center"}}>
      <Spinner label="Lumora is crafting your writing prompt…"/>
      <p style={{color:C.textMuted,fontSize:13,marginTop:8}}>About 10 seconds. Every prompt is completely original.</p>
    </main>
  );

  if(phase==="prewriting_ready"&&prompt){
    return(
      <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
        <Card style={{marginBottom:16,background:C.accentSoft,borderColor:C.accent+"44"}}>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:6,fontWeight:700}}>Your Prompt</div>
          <h2 style={{fontFamily:T.serif,fontSize:20,color:C.text,marginBottom:8}}>{prompt.topic}</h2>
          <p style={{fontSize:13,color:C.textSub,lineHeight:1.7,marginBottom:12}}>{prompt.context}</p>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>Key Question:</div>
          <p style={{fontSize:15,color:C.text,fontStyle:"italic",lineHeight:1.6,paddingLeft:12,borderLeft:`3px solid ${C.accent}`}}>{prompt.keyQuestion}</p>
        </Card>
        <Btn onClick={startPre} style={{width:"100%",padding:15}}>Begin Prewriting Phase →</Btn>
      </main>
    );
  }

  if(phase==="prewriting"){
    const danger=timed&&timeLeft<120;
    const canAdv=!timed||timeLeft<(15*60-5*60);
    return(
      <main style={{maxWidth:760,margin:"0 auto",padding:"20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:C.goldSoft,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"4px 12px",fontSize:12,color:C.gold,fontWeight:700,textTransform:"uppercase"}}>Phase 1 — Prewriting</div>
            {timed&&<div style={{fontFamily:T.serif,fontSize:20,color:danger?C.danger:C.gold,fontWeight:700}} aria-live="polite">{fmt(timeLeft)}</div>}
          </div>
          {canAdv&&<Btn onClick={goEssay} small>Begin Essay Phase →</Btn>}
        </div>
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:12,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Key Question</div>
          <div style={{fontSize:15,color:C.text,fontStyle:"italic",lineHeight:1.6,marginBottom:14,paddingLeft:12,borderLeft:`3px solid ${C.accent}`}}>{prompt?.keyQuestion}</div>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:10}}>Perspectives</div>
          {prompt?.perspectives?.map((p,i)=><div key={i} style={{background:C.surfaceHigh,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`,marginBottom:9}}><div style={{fontWeight:700,fontSize:12,color:[C.accent,C.purple,C.gold,C.success][i],marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>P{i+1} — {p.label}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.7}}>{p.text}</div></div>)}
        </Card>
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>Guided Prewriting</div>
          {[{k:"position",label:"What position will you argue?",ph:"I will argue that…"},{k:"strongest",label:"Which perspective best supports you?",ph:"Perspective ___ supports me because…"},{k:"weakest",label:"Which perspective most challenges you?",ph:"Perspective ___ challenges me because… However…"},{k:"counter",label:"Strongest objection to your argument?",ph:"Someone might argue… but this overlooks…"}].map(q=>(
            <div key={q.k} style={{marginBottom:14}}><label htmlFor={`pre-${q.k}`} style={{fontSize:13,color:C.text,fontWeight:600,display:"block",marginBottom:6}}>{q.label}</label><textarea id={`pre-${q.k}`} value={pre[q.k]} onChange={e=>setPre(a=>({...a,[q.k]:e.target.value}))} placeholder={q.ph} rows={2} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:T.sans,resize:"vertical",boxSizing:"border-box",lineHeight:1.6,outline:"none"}}/></div>
          ))}
          <textarea value={preNotes} onChange={e=>setPreNotes(e.target.value)} rows={3} placeholder="Additional notes / outline…" style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:T.sans,resize:"vertical",boxSizing:"border-box",lineHeight:1.6,outline:"none"}}/>
        </Card>
      </main>
    );
  }

  if(phase==="essay"||phase==="submitting"){
    const danger=timed&&timeLeft<300;
    return(
      <main style={{maxWidth:760,margin:"0 auto",padding:"20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:C.accentSoft,border:`1px solid ${C.accent}44`,borderRadius:8,padding:"4px 12px",fontSize:12,color:C.accent,fontWeight:700,textTransform:"uppercase"}}>Phase 2 — Essay</div>
            {timed&&<div style={{fontFamily:T.serif,fontSize:20,color:danger?C.danger:C.text,fontWeight:700}} aria-live="polite">{fmt(timeLeft)}</div>}
            <span style={{color:C.textMuted,fontSize:13}}>{wc} words</span>
          </div>
          <Btn onClick={doSubmit} small style={{background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Submit for Feedback ✓</Btn>
        </div>
        {pre.position&&<Card style={{marginBottom:12,padding:"12px 16px",background:C.goldSoft,borderColor:C.gold+"33"}}><div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,fontWeight:700}}>Your prewriting position</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{pre.position}</div></Card>}
        <textarea value={essay} onChange={e=>setEssay(e.target.value)} aria-label="Your essay"
          placeholder={"Begin your essay here.\n\nState your position clearly, answer the key question directly, engage with the perspectives, and build a well-reasoned argument.\n\nAim for 400–600 words."}
          style={{width:"100%",minHeight:440,background:C.surface,border:`1.5px solid ${danger?C.danger:C.border}`,borderRadius:14,padding:"20px 22px",color:C.text,fontSize:15,fontFamily:T.sans,resize:"vertical",lineHeight:1.9,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,color:C.textMuted}}><span>{wc} words · Aim for 400–600</span>{timed&&<span style={{color:danger?C.danger:C.textMuted}}>{danger?"⚠ ":""}{fmt(timeLeft)} remaining</span>}</div>
      </main>
    );
  }

  if(phase==="feedback")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:22}}>Writing Feedback</h2>
      {loadingFb&&<Spinner label="Evaluating your essay…"/>}
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>
      {feedback&&!loadingFb&&<div>
        <Card style={{marginBottom:14,padding:"24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
            <Arc pct={feedback.overall_score} size={110} color={sc(feedback.overall_score)} label={`Score: ${feedback.overall_score}%`}/>
            <div style={{flex:1}}><div style={{fontSize:30,fontWeight:900,color:C.text,fontFamily:T.serif,marginBottom:4}}>{feedback.grade}</div>{feedback.thesis_position&&<div style={{fontSize:13,color:C.textSub,fontStyle:"italic",lineHeight:1.6,marginBottom:8}}>"{feedback.thesis_position}"</div>}<div style={{fontSize:14,color:C.textSub,lineHeight:1.7}}>{feedback.summary}</div></div>
          </div>
        </Card>
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:16}}>Rubric Breakdown</div>
          {feedback.scores&&Object.entries(feedback.scores).map(([key,val])=>{const pct=Math.round(val.score/val.max*100);const labels={thesis:"Thesis & Position",perspectives:"Perspective Engagement",argumentation:"Argumentation",counterargument:"Counterargument",mechanics:"Organization & Mechanics"};return(<div key={key} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}><span style={{color:C.text,fontWeight:600}}>{labels[key]||key}</span><span style={{color:sc(pct),fontWeight:700}}>{val.score}/{val.max}</span></div><div style={{background:C.surfaceHigh,borderRadius:4,height:7,marginBottom:6}}><div style={{height:"100%",width:`${pct}%`,background:sc(pct),borderRadius:4,transition:"width 0.6s"}}/></div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{val.comment}</div></div>);})}
        </Card>
        {feedback.strengths?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.success,marginBottom:12}}>What You Did Well</div>{feedback.strengths.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.success}}>✓</span>{s}</div>)}</Card>}
        {feedback.improvements?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.gold,marginBottom:12}}>How to Improve</div>{feedback.improvements.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.gold}}>→</span>{s}</div>)}</Card>}
        {feedback.rewritten_intro&&<Card style={{marginBottom:14,borderColor:C.accent+"44"}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:10}}>Stronger Opening</div><p style={{color:C.text,fontSize:14,lineHeight:1.85,fontStyle:"italic"}}>{feedback.rewritten_intro}</p></Card>}
        <Btn onClick={()=>{setPhaseSync("config");setFeedback(null);setPrompt(null);}} style={{width:"100%"}}>Try Another Prompt →</Btn>
      </div>}
    </main>
  );
  return null;
}

// ─── FULL SECTION (streaming delivery) ────────────────────────────────────────

function FullSection({user,onUpdateUser}){
  const [phase,setPhase]=useState("config");
  const [sel,setSel]=useState("Logical Reasoning");
  const [questions,setQuestions]=useState([]);
  const [current,setCurrent]=useState(null);
  const [qIdx,setQIdx]=useState(0);
  const [answers,setAnswers]=useState({});
  const [timeLeft,setTimeLeft]=useState(SECTION_TIME);
  const [genCount,setGenCount]=useState(0);
  const [results,setResults]=useState(null);
  const [genError,setGenError]=useState(null);
  const timerRef=useRef(null);
  const queueRef=useRef([]);
  const generatingRef=useRef(false);
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const genOne=async(lv,qt)=>{
    const raw=await callClaude(PRACTICE_SYSTEM,buildQ(sel,lv,qt,user.diagnostic),1200);
    return{...parseJSON(raw),section:sel,qType:qt,assignedLevel:lv};
  };

  // Stream questions in background while student answers
  const streamGenerate=async()=>{
    const types=QUESTION_TYPES[sel];
    const allQ=[];
    for(let i=0;i<SECTION_Q_COUNT;i++){
      const lv=i<6?1:i<13?2:i<20?3:4;
      const qt=types[i%types.length];
      try{
        const q={...await genOne(lv,qt),qi:i};
        allQ.push(q);
        queueRef.current=[...allQ];
        setQuestions([...allQ]);
        setGenCount(i+1);
        // Once we have the first question, transition to active immediately
        if(allQ.length===1){
          setCurrent(allQ[0]);
          setQIdx(0);
          setPhase("active");
          setTimeLeft(SECTION_TIME);
          timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);return 0;}return t-1;}),1000);
        }
      }catch(e){console.warn(`Q${i+1} failed:`,e.message);setGenCount(i+1);}
    }
    generatingRef.current=false;
  };

  const startSection=async()=>{
    setPhase("loading");setGenCount(0);setQuestions([]);setCurrent(null);setQIdx(0);setAnswers({});setGenError(null);
    queueRef.current=[];generatingRef.current=true;
    try{streamGenerate();}catch(e){setGenError(e.message);setPhase("config");}
  };

  const calcResults=(qs,ans,tLeft)=>{
    const byLevel={1:{c:0,t:0},2:{c:0,t:0},3:{c:0,t:0},4:{c:0,t:0}};
    let correct=0;
    qs.forEach(q=>{const l=q.assignedLevel||2;byLevel[l].t++;if(ans[q.qi]===q.correct){correct++;byLevel[l].c++;}});
    const records=qs.map(q=>({section:q.section,qType:q.qType,level:q.assignedLevel,correct:ans[q.qi]===q.correct,xp:ans[q.qi]===q.correct?XP_PER_CORRECT[q.assignedLevel||2]:0,timestamp:Date.now()}));
    const totalXP=records.reduce((s,r)=>s+r.xp,0);
    onUpdateUser({history:[...(user.history||[]),...records],stats:{...user.stats,xp:(user.stats?.xp||0)+totalXP}});
    setResults({correct,total:qs.length,pct:Math.round(correct/qs.length*100),byLevel,timeUsed:SECTION_TIME-tLeft});
  };

  useEffect(()=>{if(timeLeft===0&&phase==="active"){clearInterval(timerRef.current);calcResults(queueRef.current,answers,0);setPhase("review");}},  [timeLeft,phase]);
  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const finish=()=>{clearInterval(timerRef.current);calcResults(queueRef.current,answers,timeLeft);setPhase("review");};

  const goToQ=(i)=>{
    const qs=queueRef.current;
    if(i<qs.length){setQIdx(i);setCurrent(qs[i]);}
  };

  const danger=timeLeft<300&&phase==="active";
  const q=current;

  if(phase==="config")return(
    <main style={{maxWidth:620,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Full Section</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:24}}>35 minutes · 25 Lumora-generated questions · Level 1→4 ramp. The first question appears immediately — the rest generate in the background as you work.</p>
      <ErrBanner message={genError} onDismiss={()=>setGenError(null)}/>
      <Card style={{marginBottom:16}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Choose Section</div><div style={{display:"flex",flexDirection:"column",gap:9}}>{SECTIONS.map(s=><Pill key={s} active={sel===s} onClick={()=>setSel(s)}>{s}</Pill>)}</div></Card>
      <Card style={{marginBottom:18,background:C.accentSoft,borderColor:C.accent+"44"}}><div style={{display:"flex",gap:20,flexWrap:"wrap",fontSize:14,color:C.textSub}}><span>⏱ <strong style={{color:C.text}}>35 min</strong></span><span>📝 <strong style={{color:C.text}}>25 questions</strong></span><span>📈 <strong style={{color:C.text}}>Levels 1→4</strong></span><span>⚡ <strong style={{color:C.text}}>Instant start</strong></span></div></Card>
      <Btn onClick={startSection} style={{width:"100%",padding:15}}>Start Section →</Btn>
    </main>
  );

  if(phase==="loading")return(
    <main style={{maxWidth:580,margin:"0 auto",padding:"32px 20px",textAlign:"center"}}>
      <Spinner label="Generating your first question…"/>
      <p style={{color:C.textMuted,fontSize:14,marginTop:8}}>You'll start immediately. Questions generate in the background as you work.</p>
    </main>
  );

  if(phase==="active"&&q)return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"16px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{fontFamily:T.serif,fontSize:22,color:danger?C.danger:C.text,fontWeight:700,minWidth:60}} aria-live="polite">{fmt(timeLeft)}</div>
        <div style={{flex:1,background:C.surfaceHigh,borderRadius:4,height:6,overflow:"hidden"}}><div style={{height:"100%",width:`${qIdx/SECTION_Q_COUNT*100}%`,background:C.accent,borderRadius:4,transition:"width 0.3s"}}/></div>
        <span style={{color:C.textMuted,fontSize:13}}>{qIdx+1}/{questions.length||"…"}</span>
        {genCount<SECTION_Q_COUNT&&<span style={{fontSize:11,color:C.textMuted,background:C.surfaceHigh,padding:"2px 8px",borderRadius:8}}>⚡ {genCount}/{SECTION_Q_COUNT}</span>}
        <Btn ghost onClick={finish} small>Submit</Btn>
      </div>
      <div style={{display:"flex",gap:3,marginBottom:14,flexWrap:"wrap"}}>
        {Array.from({length:Math.max(SECTION_Q_COUNT,questions.length)}).map((_,i)=>{
          const exists=i<questions.length;
          const answered=answers[i]!==undefined;
          return<button key={i} onClick={()=>exists&&goToQ(i)} aria-label={`Q${i+1}`} disabled={!exists}
            style={{width:24,height:24,borderRadius:5,border:"1px solid",cursor:exists?"pointer":"not-allowed",fontSize:10,fontWeight:600,outline:"none",opacity:exists?1:0.3,borderColor:i===qIdx?C.accent:answered?C.success+"66":exists?C.border:"#333",background:i===qIdx?C.accentSoft:answered?C.success+"11":"transparent",color:i===qIdx?C.accent:answered?C.success:C.textMuted}}>{i+1}</button>;
        })}
      </div>
      <Card style={{marginBottom:12}}>
        <div style={{marginBottom:10}}><Tag color={LEVEL_COLORS[q.assignedLevel]}>Level {q.assignedLevel}</Tag><Tag color={C.accent}>{q.qType}</Tag></div>
        <p style={{lineHeight:1.85,fontSize:15,color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{q.stimulus}</p>
        <p style={{fontWeight:600,fontSize:15,color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>{q.question}</p>
        <div role="radiogroup">{Object.entries(q.choices).map(([l,t])=><button key={l} onClick={()=>setAnswers(a=>({...a,[qIdx]:l}))} role="radio" aria-checked={answers[qIdx]===l} style={{display:"block",width:"100%",textAlign:"left",border:`1.5px solid ${answers[qIdx]===l?C.accent:C.border}`,borderRadius:12,padding:"12px 18px",cursor:"pointer",fontSize:14,marginBottom:10,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.55,boxSizing:"border-box",background:answers[qIdx]===l?C.accentSoft:"transparent",color:answers[qIdx]===l?C.text:C.textSub,outline:"none"}}><span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}</button>)}</div>
      </Card>
      <div style={{display:"flex",gap:10}}>
        {qIdx>0&&<Btn ghost onClick={()=>goToQ(qIdx-1)}>← Prev</Btn>}
        {qIdx<SECTION_Q_COUNT-1?<Btn onClick={()=>goToQ(qIdx+1)} style={{flex:1}}>Next →</Btn>:<Btn onClick={finish} style={{flex:1,background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Submit Section ✓</Btn>}
      </div>
    </main>
  );

  if(phase==="review"&&results)return(
    <main style={{maxWidth:640,margin:"0 auto",padding:"32px 20px"}}>
      <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:22}}>Section Complete</h2>
      <Card style={{marginBottom:14,textAlign:"center",padding:28}}><Arc pct={results.pct} size={120} color={results.pct>=70?C.success:results.pct>=50?C.gold:C.danger} label={`Score: ${results.pct}%`}/><div style={{marginTop:14,fontSize:17,fontWeight:700,color:C.text}}>{results.correct}/{results.total} correct</div><div style={{fontSize:13,color:C.textMuted,marginTop:3}}>Time: {fmt(results.timeUsed)}</div></Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>By Difficulty Level</div>
        {[1,2,3,4].map(l=>{const d=results.byLevel[l];if(!d.t)return null;const pct=Math.round(d.c/d.t*100);return<div key={l} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:LEVEL_COLORS[l],fontWeight:600}}>Level {l} — {LEVEL_LABELS[l]}</span><span style={{color:pct>=70?C.success:pct>=50?C.gold:C.danger,fontWeight:600}}>{pct}% ({d.c}/{d.t})</span></div><div style={{background:C.surfaceHigh,borderRadius:4,height:6}}><div style={{height:"100%",width:`${pct}%`,background:LEVEL_COLORS[l],borderRadius:4,transition:"width 0.5s"}}/></div></div>;})}
      </Card>
      <Btn onClick={()=>setPhase("config")} style={{width:"100%"}}>Try Another Section →</Btn>
    </main>
  );
  return <Spinner/>;
}

// ─── STUDY PLAN ───────────────────────────────────────────────────────────────

function StudyPlan({user,onUpdateUser,setScreen}){
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const plan=user.studyPlan;
  // Auto-generate on first visit if no plan exists
  useEffect(()=>{if(!plan&&!loading)gen();},[]);
  const gen=async()=>{
    setLoading(true);setError(null);
    const history=user.history||[];
    const d=user.diagnostic||{};
    const totalQ=history.length;
    const accuracy=totalQ>0?Math.round(history.filter(h=>h.correct).length/totalQ*100):null;
    const typeStats={};
    history.forEach(h=>{if(!typeStats[h.qType])typeStats[h.qType]={c:0,t:0};typeStats[h.qType].t++;if(h.correct)typeStats[h.qType].c++;});
    const weakTypes=Object.entries(typeStats).filter(([,v])=>v.t>=2&&v.c/v.t<0.6).map(([k])=>k).slice(0,4);
    const strongTypes=Object.entries(typeStats).filter(([,v])=>v.t>=2&&v.c/v.t>=0.8).map(([k])=>k).slice(0,3);
    const profile=[
      "Name: "+user.name,
      "Target Score: "+(d.target_score||"165+"),
      "Test Timeline: "+(d.test_date||"unknown"),
      "Weekly Study Hours: "+(d.study_hours||"unknown"),
      "Biggest Challenge: "+(d.biggest_challenge||"unknown"),
      "Learning Style: "+(d.learning_style||"unknown"),
      "LR Comfort: "+(d.lr_comfort||"?")+"/5",
      "RC Comfort: "+(d.rc_comfort||"?")+"/5",
      "Writing Comfort: "+(d.writing_comfort||"?")+"/5",
      "Questions Answered: "+totalQ,
      "Overall Accuracy: "+(accuracy!==null?accuracy+"%":"none yet"),
      "Weak Types: "+(weakTypes.join(", ")||"still assessing"),
      "Strong Types: "+(strongTypes.join(", ")||"still assessing"),
    ].join(", ");
    const sys="You are an expert LSAT tutor. Respond ONLY with a valid JSON object. No markdown, no explanation, no text before or after the JSON.";
    const prompt="Write a personalized LSAT study plan for: "+profile+". Return a JSON object with: summary, target_score, timeline, weekly_hours, phases (array with name/duration/focus/tasks), daily_routine (3 items), priority_areas (3 items), milestone. Be specific and concise.";
    try{
      const raw=await callClaude(sys,prompt,1800);
      const plan=parseJSON(raw);
      // Ensure required fields exist with fallbacks
      const safePlan={
        summary:plan.summary||"Personalized plan generated based on your profile.",
        target_score:plan.target_score||(d.target_score||"165+"),
        timeline:plan.timeline||(d.test_date||"flexible"),
        weekly_hours:plan.weekly_hours||(d.study_hours||"flexible"),
        phases:Array.isArray(plan.phases)?plan.phases:[{name:"Foundation",duration:"4 weeks",focus:"Build core LR and RC skills",tasks:["Practice 10 questions daily","Complete Learn lessons","Review all wrong answers","Take one full section weekly"]}],
        daily_routine:Array.isArray(plan.daily_routine)?plan.daily_routine:["Morning: 30 min Learn section","Afternoon: 20 min timed practice","Evening: Review notes"],
        priority_areas:Array.isArray(plan.priority_areas)?plan.priority_areas:["Weakest question types","Timed practice","Full section stamina"],
        milestone:plan.milestone||"Scoring consistently above 70% on Level 3 questions",
      };
      onUpdateUser({studyPlan:safePlan});
    }catch(e){setError("Could not generate: "+(e.message||"Please try again."));}
    setLoading(false);
  };
  return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div><h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:4}}>Study Plan</h1><p style={{color:C.textMuted,fontSize:14}}>Personalized roadmap to {user.diagnostic?.target_score||"your target score"}.</p></div>
        <Btn onClick={gen} small>{plan?"Regenerate":"Generate Plan"}</Btn>
      </div>
      {(!user.diagnostic||Object.keys(user.diagnostic).length===0)&&(
        <Card style={{marginBottom:16,borderColor:C.gold+"44",background:C.goldSoft}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <span style={{fontSize:22}}>💡</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:C.gold,marginBottom:4,fontSize:14}}>Take the diagnostic for a truly personalized plan</div>
              <p style={{color:C.textSub,fontSize:13,lineHeight:1.6,marginBottom:10}}>
                This plan is using general defaults because you haven't completed your study profile yet. Answering 10 quick questions about your target score, timeline, and weak areas lets Lumora build a plan specific to you.
              </p>
              {setScreen&&<Btn onClick={()=>setScreen("profile")} small>Go to Profile →</Btn>}
            </div>
          </div>
        </Card>
      )}
      {loading&&<Spinner label="Lumora is building your study plan…"/>}
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>
      {!plan&&!loading&&<Card style={{textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>📋</div><h2 style={{color:C.text,fontSize:18,marginBottom:8}}>No study plan yet</h2><p style={{color:C.textMuted,fontSize:14,marginBottom:20,lineHeight:1.7}}>Lumora LSAT builds a structured plan from your diagnostic and practice history.</p><Btn onClick={gen}>Generate My Plan</Btn></Card>}
      {plan&&!loading&&<div>
        <Card style={{marginBottom:12,background:C.accentSoft,borderColor:C.accent+"44"}}><p style={{color:C.text,fontSize:15,lineHeight:1.8}}>{plan.summary}</p><div style={{display:"flex",gap:20,marginTop:14,flexWrap:"wrap"}}>{[["Target",plan.target_score],["Timeline",plan.timeline],["Weekly Hours",plan.weekly_hours]].map(([l,v])=><div key={l}><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div><div style={{fontWeight:700,color:C.accent}}>{v}</div></div>)}</div></Card>
        {plan.priority_areas?.length>0&&<Card style={{marginBottom:12}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Priority Focus Areas</div>{plan.priority_areas.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:20,height:20,borderRadius:"50%",background:[C.danger,C.gold,C.accent][i%3]+"22",color:[C.danger,C.gold,C.accent][i%3],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><span style={{color:C.text,fontSize:14}}>{a}</span></div>)}</Card>}
        {plan.phases?.map((ph,i)=><Card key={i} style={{marginBottom:10}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontWeight:700,fontSize:15,color:C.text}}>{ph.name}</div><div style={{fontSize:13,color:C.textMuted}}>{ph.duration}</div></div><Tag color={[C.accent,C.purple,C.gold,C.success][i%4]}>Phase {i+1}</Tag></div><p style={{color:C.textSub,fontSize:14,marginBottom:10,lineHeight:1.6}}>{ph.focus}</p>{ph.tasks?.map((t,j)=><div key={j} style={{display:"flex",gap:8,marginBottom:6,fontSize:14,color:C.textSub}}><span style={{color:C.accent}}>→</span>{t}</div>)}</Card>)}
        {plan.milestone&&<Card style={{borderColor:C.gold+"44",background:C.goldSoft}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.gold,marginBottom:6}}>Halfway Milestone</div><p style={{color:C.text,fontSize:14,lineHeight:1.7}}>{plan.milestone}</p></Card>}
      </div>}
    </main>
  );
}

// ─── ASK LUMORA ───────────────────────────────────────────────────────────────
function Upload(){
  const [text,setText]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const analyze=async()=>{
    if(!text.trim())return;
    setLoading(true);setError(null);setResult(null);
    const sys=`You are an expert LSAT analyst. Determine the correct answer with absolute certainty. Respond ONLY with valid JSON:
{"correct_answer":"B","confidence":"High","question_type":"Assumption","section":"Logical Reasoning","level":3,"step_by_step":"Complete reasoning process.","why_correct":"Precisely why correct.","why_wrong":{"A":"...","C":"...","D":"...","E":"..."},"key_tip":"One actionable takeaway."}`;
    try{const raw=await callClaude(sys,`Analyze this LSAT question:\n\n${text}`,1600);setResult(parseJSON(raw));}
    catch(e){setError("Could not analyze: "+(e.message||"Paste the full question with all five answer choices."));}
    setLoading(false);
  };
  return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Ask Lumora LSAT</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22}}>Paste any LSAT question — correct answer identified with certainty, every choice explained.</p>
      <Card style={{marginBottom:14}}><label htmlFor="q-input" style={{display:"block",fontSize:13,color:C.textSub,marginBottom:8,fontWeight:600}}>Paste your question here</label><textarea id="q-input" value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the full question — stimulus, question stem, and all five answer choices (A–E)…" rows={8} style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 15px",color:C.text,fontSize:14,fontFamily:T.sans,resize:"vertical",lineHeight:1.75,boxSizing:"border-box",outline:"none"}}/><Btn onClick={analyze} disabled={!text.trim()||loading} style={{width:"100%",marginTop:12}}>{loading?"Analyzing…":"Analyze Question"}</Btn></Card>
      {loading&&<Spinner label="Working through the logic…"/>}
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>
      {result&&<div>
        <div style={{marginBottom:12}}><Tag color={LEVEL_COLORS[result.level]}>{LEVEL_LABELS[result.level]}</Tag><Tag color={C.accent}>{result.section}</Tag><Tag color={C.purple}>{result.question_type}</Tag><Tag color={result.confidence==="High"?C.success:C.gold}>Confidence: {result.confidence}</Tag></div>
        <Card style={{marginBottom:12,borderColor:C.success+"44"}}><div style={{fontSize:22,fontWeight:800,color:C.success,marginBottom:8}}>Correct Answer: {result.correct_answer}</div><p style={{color:C.text,fontSize:14,lineHeight:1.8}}>{result.why_correct}</p></Card>
        <Card style={{marginBottom:12}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Step-by-Step Reasoning</div><p style={{color:C.textSub,fontSize:14,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{result.step_by_step}</p></Card>
        {result.why_wrong&&<Card style={{marginBottom:12}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Why the Other Choices Fail</div>{Object.entries(result.why_wrong).map(([l,r])=><div key={l} style={{marginBottom:9}}><span style={{fontWeight:700,color:C.danger,marginRight:8}}>{l}.</span><span style={{color:C.textSub,fontSize:14}}>{r}</span></div>)}</Card>}
        {result.key_tip&&<Card style={{borderColor:C.gold+"44",background:C.goldSoft}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.gold,marginBottom:6}}>Pro Tip</div><p style={{color:C.text,fontSize:14,lineHeight:1.7}}>{result.key_tip}</p></Card>}
      </div>}
    </main>
  );
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function Notes({user,onUpdateUser}){
  const notes=user.notes||[];
  const [input,setInput]=useState("");
  const [editId,setEditId]=useState(null);
  const [search,setSearch]=useState("");
  const save=()=>{if(!input.trim())return;const u=editId?notes.map(n=>n.id===editId?{...n,text:input.trim(),edited:Date.now()}:n):[...notes,{id:Date.now(),text:input.trim(),source:"Manual",timestamp:Date.now()}];onUpdateUser({notes:u});setInput("");setEditId(null);};
  const del=(id)=>{if(window.confirm("Delete this note?"))onUpdateUser({notes:notes.filter(n=>n.id!==id)});};
  const filtered=notes.filter(n=>n.text.toLowerCase().includes(search.toLowerCase()));
  return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Study Notes</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22}}>Insights added during practice appear here automatically.</p>
      <Card style={{marginBottom:14}}><label htmlFor="note-area" style={{display:"block",fontSize:13,color:C.textSub,marginBottom:6,fontWeight:600}}>{editId?"Edit note":"Add a note"}</label><textarea id="note-area" value={input} onChange={e=>setInput(e.target.value)} placeholder="Pattern, strategy, concept to review…" rows={3} style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:14,fontFamily:T.sans,resize:"none",boxSizing:"border-box",outline:"none"}}/><div style={{display:"flex",gap:8,marginTop:10}}><Btn onClick={save} disabled={!input.trim()} small>{editId?"Update":"Save Note"}</Btn>{editId&&<Btn ghost onClick={()=>{setEditId(null);setInput("");}} small>Cancel</Btn>}</div></Card>
      {notes.length>3&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes…" aria-label="Search" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:14,fontFamily:T.sans,boxSizing:"border-box",outline:"none",marginBottom:12}}/>}
      {filtered.length===0&&<p style={{textAlign:"center",padding:"36px 0",color:C.textMuted}}>{notes.length===0?"No notes yet. Insights added during practice appear here automatically.":"No notes match."}</p>}
      {filtered.slice().reverse().map(n=><Card key={n.id} style={{marginBottom:10}}>
        <p style={{color:C.text,fontSize:14,lineHeight:1.75,marginBottom:10,whiteSpace:"pre-wrap"}}>{n.text}</p>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",gap:8,alignItems:"center"}}>{n.source&&n.source!=="Manual"&&<Tag color={C.purple}>{n.source}</Tag>}<span style={{fontSize:12,color:C.textMuted}}>{new Date(n.timestamp).toLocaleDateString()}</span></div><div style={{display:"flex",gap:8}}><Btn ghost onClick={()=>{setEditId(n.id);setInput(n.text);}} small>Edit</Btn><Btn ghost danger onClick={()=>del(n.id)} small>Delete</Btn></div></div>
      </Card>)}
    </main>
  );
}

// ─── DASHBOARD + SCORE PREDICTOR ─────────────────────────────────────────────
// ─── MISTAKE JOURNAL ─────────────────────────────────────────────────────────
function MistakeJournal({user,onUpdateUser}){
  const [mistakes,setMistakes]=useState([]);
  const [active,setActive]=useState(null); // index of expanded mistake
  const [filter,setFilter]=useState("all"); // all | unreviewed
  const [teachMode,setTeachMode]=useState(null); // mistake id
  const [teachInput,setTeachInput]=useState("");
  const [teachFeedback,setTeachFeedback]=useState(null);
  const [teachLoading,setTeachLoading]=useState(false);

  useEffect(()=>{
    if(user.email){
      const m=DB.getMistakes(user.email);
      setMistakes(m.slice().reverse()); // newest first
    }
  },[]);

  const markReviewed=(id)=>{
    if(!user.email)return;
    const all=DB.getMistakes(user.email);
    const updated=all.map(m=>m.id===id?{...m,reviewed:true}:m);
    DB.saveMistakes(user.email,updated);
    setMistakes(updated.slice().reverse());
  };

  const deleteMistake=(id)=>{
    if(!user.email)return;
    const all=DB.getMistakes(user.email);
    const updated=all.filter(m=>m.id!==id);
    DB.saveMistakes(user.email,updated);
    setMistakes(updated.slice().reverse());
    if(active===id)setActive(null);
  };

  const submitTeach=async()=>{
    if(!teachInput.trim()||teachLoading)return;
    setTeachLoading(true);setTeachFeedback(null);
    const m=mistakes.find(x=>x.id===teachMode);
    if(!m){setTeachLoading(false);return;}
    try{
      const sys="You are an expert LSAT tutor evaluating a student's understanding of why an answer is correct. "+
        "Be encouraging but precise. Respond ONLY with valid JSON: "+
        '{"correct":true,"score":85,"feedback":"Your explanation...","missing":"What they missed (or null if nothing)","tip":"One actionable improvement"}';
      const msg="Question type: "+m.qType+". Correct answer: "+m.correct+
        ". Official explanation: "+m.explanation+
        ". Student's explanation: "+teachInput.trim()+
        ". Does the student correctly explain WHY "+m.correct+" is right? Grade their understanding 0-100.";
      const raw=await callClaude(sys,msg,600);
      const fb=parseJSON(raw);
      setTeachFeedback(fb);
      if(fb.score>=70)markReviewed(teachMode);
    }catch(e){setTeachFeedback({correct:false,score:0,feedback:"Could not evaluate — try again.",missing:null,tip:null});}
    setTeachLoading(false);
  };

  const shown=filter==="unreviewed"?mistakes.filter(m=>!m.reviewed):mistakes;
  const unrevCount=mistakes.filter(m=>!m.reviewed).length;

  const cs=(l,m)=>{
    if(l===m.correct)return"ok";
    if(l===m.userAnswer)return"bad";
    return"def";
  };
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:10,
    padding:"10px 14px",fontSize:13,marginBottom:8,fontFamily:T.sans,lineHeight:1.5,boxSizing:"border-box",
    ...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}
      :s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}
      :{background:"transparent",borderColor:C.border,color:C.textSub})});

  return(
    <main style={{maxWidth:720,margin:"0 auto",padding:"32px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:10}}>
        <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text}}>Mistake Journal</h1>
        <div style={{display:"flex",gap:8}}>
          {["all","unreviewed"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${filter===f?C.accent:C.border}`,
                background:filter===f?C.accentSoft:"transparent",color:filter===f?C.accent:C.textMuted,
                fontSize:13,cursor:"pointer",fontFamily:T.sans,fontWeight:filter===f?700:400}}>
              {f==="all"?`All (${mistakes.length})`:`Unreviewed (${unrevCount})`}
            </button>
          ))}
        </div>
      </div>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:20,lineHeight:1.6}}>
        Every question you got wrong is saved here. Review each one, then test your understanding with "Teach It Back."
      </p>

      {shown.length===0&&(
        <Card style={{textAlign:"center",padding:48}}>
          <div style={{fontSize:48,marginBottom:12}}>{filter==="unreviewed"?"✅":"📖"}</div>
          <h3 style={{color:C.text,marginBottom:8}}>{filter==="unreviewed"?"All caught up!":"No mistakes yet"}</h3>
          <p style={{color:C.textMuted,fontSize:14}}>{filter==="unreviewed"?"Every mistake has been reviewed. Keep practicing.":"Mistakes from Practice and Quick 5 will appear here."}</p>
        </Card>
      )}

      {shown.map((m)=>(
        <Card key={m.id} style={{marginBottom:12,borderColor:m.reviewed?C.success+"33":C.border,
          transition:"all 0.2s"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                <Tag color={LEVEL_COLORS[m.level]||C.accent}>Level {m.level}</Tag>
                <Tag color={C.accent}>{m.qType}</Tag>
                {m.reviewed&&<Tag color={C.success}>✓ Reviewed</Tag>}
              </div>
              <p style={{color:C.text,fontSize:14,lineHeight:1.7,margin:0,
                display:active===m.id?"block":"-webkit-box",WebkitLineClamp:2,
                WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                {m.stimulus}
              </p>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>setActive(active===m.id?null:m.id)}
                style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                  padding:"4px 10px",color:C.textMuted,fontSize:12,cursor:"pointer"}}>
                {active===m.id?"Collapse":"Review"}
              </button>
              <button onClick={()=>deleteMistake(m.id)}
                style={{background:"none",border:`1px solid ${C.danger}44`,borderRadius:8,
                  padding:"4px 8px",color:C.danger,fontSize:12,cursor:"pointer"}}>✕</button>
            </div>
          </div>

          {active===m.id&&(
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
              <p style={{color:C.text,fontSize:14,lineHeight:1.8,marginBottom:14,whiteSpace:"pre-wrap"}}>{m.stimulus}</p>
              <p style={{fontWeight:600,fontSize:14,color:C.text,marginBottom:12}}>{m.question}</p>
              <div style={{marginBottom:14}}>
                {Object.entries(m.choices||{}).map(([l,t])=>(
                  <div key={l} style={cStyle(cs(l,m))}><span style={{fontWeight:700,marginRight:8}}>{l}.</span>{t}</div>
                ))}
              </div>
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:C.textSub,lineHeight:1.85}}>
                <strong style={{color:C.text,display:"block",marginBottom:4}}>Why {m.correct} is correct:</strong>
                {(m.explanation||"").split(/WRONG\s*\([A-E]\)/)[0].replace(/CORRECT\s*\([A-E]\):\s*/,"").trim()}
              </div>
              {m.key_concept&&<div style={{fontSize:13,color:C.purple,fontStyle:"italic",marginBottom:14}}>🔑 {m.key_concept}</div>}

              {teachMode===m.id?(
                <div style={{background:C.surfaceHigh,borderRadius:12,padding:16,marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>
                    ✍️ Teach It Back — explain why {m.correct} is correct in your own words:
                  </div>
                  <textarea value={teachInput} onChange={e=>setTeachInput(e.target.value)}
                    placeholder={"The correct answer is "+m.correct+" because…"}
                    rows={3} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,
                      borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,
                      fontFamily:T.sans,resize:"vertical",boxSizing:"border-box",outline:"none"}}/>
                  {teachFeedback&&(
                    <div style={{marginTop:10,padding:12,borderRadius:10,
                      background:teachFeedback.score>=70?C.success+"15":C.danger+"15",
                      border:`1px solid ${teachFeedback.score>=70?C.success:C.danger}33`}}>
                      <div style={{fontWeight:700,color:teachFeedback.score>=70?C.success:C.danger,marginBottom:6}}>
                        {teachFeedback.score>=70?"✓ Good understanding!":"✗ Keep working on this"}
                        {" "}({teachFeedback.score}/100)
                      </div>
                      <div style={{fontSize:13,color:C.textSub,lineHeight:1.7}}>{teachFeedback.feedback}</div>
                      {teachFeedback.missing&&<div style={{fontSize:13,color:C.gold,marginTop:6}}>Missing: {teachFeedback.missing}</div>}
                      {teachFeedback.tip&&<div style={{fontSize:13,color:C.accent,marginTop:6}}>→ {teachFeedback.tip}</div>}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,marginTop:10}}>
                    <Btn onClick={submitTeach} disabled={!teachInput.trim()||teachLoading} small>
                      {teachLoading?"Evaluating…":"Submit Explanation"}
                    </Btn>
                    <Btn ghost onClick={()=>{setTeachMode(null);setTeachInput("");setTeachFeedback(null);}} small>Cancel</Btn>
                  </div>
                </div>
              ):(
                <div style={{display:"flex",gap:8}}>
                  <Btn ghost onClick={()=>{setTeachMode(m.id);setTeachInput("");setTeachFeedback(null);}} small>
                    ✍️ Teach It Back
                  </Btn>
                  {!m.reviewed&&<Btn ghost onClick={()=>markReviewed(m.id)} small>Mark Reviewed ✓</Btn>}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </main>
  );
}

// ─── SRS REVIEW SCREEN ────────────────────────────────────────────────────────
function SRSReview({user,onUpdateUser,onDone}){
  const [dueTypes,setDueTypes]=useState([]);
  const [current,setCurrent]=useState(null);
  const [loading,setLoading]=useState(false);
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [doneCount,setDoneCount]=useState(0);
  const [error,setError]=useState(null);

  useEffect(()=>{
    if(!user.email)return;
    const srs=DB.getSRS(user.email);
    const due=srsDueTypes(srs);
    setDueTypes(due);
    if(due.length>0)fetchQuestion(due[0]);
    else setLoading(false);
  },[]);

  const fetchQuestion=async(qType)=>{
    setLoading(true);setError(null);setSelected(null);setSubmitted(false);
    const sec=QUESTION_TYPES["Logical Reasoning"].includes(qType)?"Logical Reasoning":"Reading Comprehension";
    try{
      const raw=await callClaude(PRACTICE_SYSTEM,buildQ(sec,3,qType,user.diagnostic,[]),1200);
      const parsed=parseJSON(raw);
      setCurrent({...parsed,section:sec,qType,assignedLevel:3});
    }catch(e){setError("Could not load question.");}
    setLoading(false);
  };

  const submit=()=>{
    if(!selected||!current||submitted)return;
    setSubmitted(true);
    const correct=selected===current.correct;
    if(user.email){
      const srs=DB.getSRS(user.email);
      DB.saveSRS(user.email,{...srs,[current.qType]:srsUpdate(srs,current.qType,correct)});
    }
    const record={section:current.section,qType:current.qType,level:3,correct,
      xp:correct?XP_PER_CORRECT[3]:0,timestamp:Date.now()};
    onUpdateUser({history:[...(user.history||[]),record],stats:{...user.stats,xp:(user.stats?.xp||0)+record.xp}});
  };

  const next=()=>{
    const newDone=doneCount+1;
    setDoneCount(newDone);
    const remaining=dueTypes.slice(newDone);
    if(remaining.length===0){onDone();return;}
    fetchQuestion(remaining[0]);
  };

  const cs=(l)=>{if(!submitted)return selected===l?"sel":"def";if(l===current?.correct)return"ok";if(l===selected)return"bad";return"def";};
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:12,
    padding:"12px 16px",cursor:submitted?"default":"pointer",fontSize:"14px",marginBottom:9,
    transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,boxSizing:"border-box",outline:"none",
    ...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}
      :s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}
      :s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}
      :{background:"transparent",borderColor:C.border,color:C.textSub})});

  if(dueTypes.length===0)return(
    <div style={{position:"fixed",inset:0,background:C.bg+"f2",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,padding:40,maxWidth:400,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>✅</div>
        <h2 style={{fontFamily:T.serif,fontSize:24,color:C.text,marginBottom:8}}>All Caught Up!</h2>
        <p style={{color:C.textSub,fontSize:14,lineHeight:1.7,marginBottom:24}}>No question types are due for review today. Keep practicing to build your SRS queue.</p>
        <Btn onClick={onDone}>Back to Home</Btn>
      </div>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:C.bg,overflowY:"auto",zIndex:300}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 20px 40px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <span style={{fontWeight:800,color:C.gold,fontSize:15}}>🔁 SRS Review</span>
            <span style={{color:C.textMuted,fontSize:13,marginLeft:10}}>{doneCount}/{dueTypes.length} done</span>
          </div>
          <button onClick={onDone} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:C.textMuted,fontSize:12,cursor:"pointer"}}>Exit</button>
        </div>
        <div style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.textSub}}>
          <strong style={{color:C.gold}}>Due for review: </strong>{dueTypes[doneCount]} — answer correctly to extend the interval.
        </div>
        {loading&&<Spinner label="Generating review question…"/>}
        <ErrBanner message={error} onDismiss={()=>setError(null)}/>
        {current&&!loading&&(
          <div>
            <Card style={{marginBottom:12}}>
              <p style={{lineHeight:1.85,fontSize:"15px",color:"#c8d4e8",marginBottom:16,whiteSpace:"pre-wrap"}}>{current.stimulus}</p>
              <p style={{fontWeight:600,fontSize:"15px",color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:14,marginBottom:14}}>{current.question}</p>
              <div role="radiogroup">
                {Object.entries(current.choices||{}).map(([l,t])=>(
                  <button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}>
                    <span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}
                  </button>
                ))}
              </div>
              {!submitted&&<Btn onClick={submit} disabled={!selected} style={{width:"100%",marginTop:8}}>Submit →</Btn>}
            </Card>
            {submitted&&(
              <div>
                <Card style={{borderColor:selected===current.correct?C.success:C.danger,marginBottom:12}}>
                  <div style={{fontSize:15,fontWeight:700,color:selected===current.correct?C.success:C.danger,marginBottom:10}}>
                    {selected===current.correct?"✓ Correct — interval extended!":"✗ Incorrect — back to tomorrow"}
                  </div>
                  <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,fontSize:13,color:C.textSub,lineHeight:1.85}}>
                    {(current.explanation||"").split(/WRONG\s*\([A-E]\)/)[0].replace(/CORRECT\s*\([A-E]\):\s*/,"").trim()}
                  </div>
                </Card>
                {doneCount+1<dueTypes.length
                  ?<Btn onClick={next} style={{width:"100%"}}>Next Review →</Btn>
                  :<Btn onClick={onDone} style={{width:"100%",background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>All Done ✓</Btn>
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCORE TRAJECTORY CHART ───────────────────────────────────────────────────
function ScoreTrajectory({user}){
  const history=user.history||[];
  if(!user.email||history.length<10)return null;

  const saved=DB.getScoreHistory(user.email);
  // Build trajectory from history in chunks of 25
  const points=[];
  const chunk=25;
  for(let i=chunk;i<=history.length;i+=chunk){
    const slice=history.slice(0,i);
    const pred=computeScore(slice);
    if(pred)points.push({n:i,score:pred.mid,low:pred.low,high:pred.high});
  }
  // Always include current
  const curPred=computeScore(history);
  if(curPred&&(points.length===0||points[points.length-1].n!==history.length)){
    points.push({n:history.length,score:curPred.mid,low:curPred.low,high:curPred.high});
  }
  if(points.length<2)return null;

  const minScore=Math.max(120,Math.min(...points.map(p=>p.low))-5);
  const maxScore=Math.min(180,Math.max(...points.map(p=>p.high))+5);
  const W=320,H=120,PAD=28;
  const xScale=(n)=>PAD+(n-points[0].n)/(points[points.length-1].n-points[0].n||1)*(W-PAD*2);
  const yScale=(s)=>H-PAD-(s-minScore)/(maxScore-minScore)*(H-PAD*2);

  const linePath=points.map((p,i)=>`${i===0?"M":"L"} ${xScale(p.n)} ${yScale(p.score)}`).join(" ");
  const areaPath=`M ${xScale(points[0].n)} ${yScale(points[0].high)} `+
    points.map(p=>`L ${xScale(p.n)} ${yScale(p.high)}`).join(" ")+
    ` L ${xScale(points[points.length-1].n)} ${yScale(points[points.length-1].low)} `+
    points.slice().reverse().map(p=>`L ${xScale(p.n)} ${yScale(p.low)}`).join(" ")+" Z";

  const trend=points.length>=2?points[points.length-1].score-points[0].score:0;

  return(
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,fontWeight:700}}>
          📈 Score Trajectory
        </div>
        <div style={{fontSize:13,color:trend>=0?C.success:C.danger,fontWeight:700}}>
          {trend>=0?"+":""}{trend} pts since start
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        {/* Grid lines */}
        {[130,140,150,160,170].filter(s=>s>=minScore&&s<=maxScore).map(s=>(
          <g key={s}>
            <line x1={PAD} y1={yScale(s)} x2={W-PAD} y2={yScale(s)} stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
            <text x={PAD-4} y={yScale(s)+4} textAnchor="end" fontSize="8" fill={C.textMuted}>{s}</text>
          </g>
        ))}
        {/* Confidence band */}
        <path d={areaPath} fill={C.accent} fillOpacity="0.08"/>
        {/* Score line */}
        <path d={linePath} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Data points */}
        {points.map((p,i)=>(
          <circle key={i} cx={xScale(p.n)} cy={yScale(p.score)} r="3"
            fill={C.accent} stroke={C.surface} strokeWidth="1.5"/>
        ))}
        {/* Current score label */}
        {points.length>0&&(
          <text x={xScale(points[points.length-1].n)} y={yScale(points[points.length-1].score)-8}
            textAnchor="middle" fontSize="10" fontWeight="700" fill={C.accent}>
            {points[points.length-1].score}
          </text>
        )}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textMuted,marginTop:4}}>
        <span>{points[0].n} questions</span>
        <span>{points[points.length-1].n} questions</span>
      </div>
    </Card>
  );
}

// ─── ONBOARDING WALKTHROUGH ───────────────────────────────────────────────────
function Onboarding({user,onUpdateUser,onDone}){
  // phase: "tour" | "practice"
  const [phase,setPhase]=useState("tour");
  const [tourStep,setTourStep]=useState(0);
  const [practiceStep,setPracticeStep]=useState(0); // 0-2 = three questions, 3 = done
  const [question,setQuestion]=useState(null);
  const [loading,setLoading]=useState(false);
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);

  const TOUR_CARDS=[
    {
      icon:"🎯",color:"#4f7fff",
      title:"Practice",
      desc:"Lumora generates fresh, unique LSAT questions every session — no question bank, no repeats. It adapts to your weak areas automatically and adjusts difficulty as you improve. Use Adaptive Mode for smart targeting, or pick a specific type to drill.",
    },
    {
      icon:"📖",color:"#a78bfa",
      title:"Learn",
      desc:"A comprehensive interactive textbook covering all 17 LSAT question types. Each lesson explains the concept, gives you a step-by-step framework, shows common traps, and then walks you through practice at four difficulty levels. Think of it as having a tutor explain each type from scratch.",
    },
    {
      icon:"⚡",color:"#f5c842",
      title:"Quick 5",
      desc:"Five timed LR questions — 75 seconds each — in a focused burst session. Great for warming up before a study session or squeezing in practice when you're short on time. Questions generate in parallel so there's almost no wait.",
    },
    {
      icon:"📅",color:"#f5c842",
      title:"Daily Challenge",
      desc:"One question per day, the same for every Lumora user. It resets at 2am and earns double XP. Building the habit of doing at least one question daily is one of the most reliable predictors of score improvement.",
    },
    {
      icon:"⚖",color:"#22d3ee",
      title:"Flaw Lab",
      desc:"Lumora generates a unique, realistic legal argument containing a hidden logical flaw. Your job: identify the flaw precisely, explain why the reasoning fails, and construct a counter-argument. Scored on four dimensions including precision and writing quality.",
    },
    {
      icon:"✍",color:"#2dd4a0",
      title:"Argumentative Writing",
      desc:"Full 2026 LSAC-format writing practice. A unique prompt is generated each session with four perspectives on a debatable issue. You have 15 minutes to prewrite, 35 minutes to write. Lumora scores your thesis, perspective engagement, argumentation, and mechanics.",
    },
    {
      icon:"⏱",color:"#f5c842",
      title:"Full Section",
      desc:"A 35-minute timed simulation of a full LSAT section — 25 questions ramping from Level 1 to Level 4. The first question appears instantly; the rest generate in the background while you work. Your pacing and level-by-level accuracy are tracked.",
    },
    {
      icon:"❌",color:"#f87171",
      title:"Mistake Journal",
      desc:"Every question you get wrong is automatically saved here with the full explanation. Review your mistakes, then use Teach It Back to write your own explanation of why the correct answer is right — Lumora evaluates your understanding and gives feedback.",
    },
    {
      icon:"🔁",color:"#f5c842",
      title:"SRS Review",
      desc:"Spaced Repetition System — the same technique used by Anki and medical schools worldwide. Lumora tracks which question types you struggle with and schedules them for review at optimal intervals: tomorrow if you got it wrong, longer if you got it right.",
    },
    {
      icon:"📊",color:"#f472b6",
      title:"Progress",
      desc:"Your Lumora Score Predictor projects your current LSAT score range based on your accuracy across difficulty levels. The score trajectory chart shows how your projected score has changed over time. Your weakness breakdown by question type shows exactly where to focus.",
    },
  ];

  const PRACTICE_STEPS=[
    {type:"Assumption",level:1,msg:"Let's try three quick questions to get you started. First: an Assumption question — the most common type on the LSAT. Find the gap between the evidence and the conclusion. The correct answer bridges that gap."},
    {type:"Weaken",level:1,msg:"Now a Weaken question. Your job is to find the answer that most damages this argument. Think about what the argument silently assumes, then find an answer that attacks that assumption."},
    {type:"Flaw",level:1,msg:"Finally, a Flaw question. The argument contains a specific logical error. Name it precisely — don't just say it 'seems wrong.' Look for the exact moment where the reasoning makes an illegitimate jump."},
  ];

  useEffect(()=>{
    if(phase==="practice"&&practiceStep<3)fetchQ(PRACTICE_STEPS[practiceStep]);
  },[phase,practiceStep]);

  const fetchQ=async(s)=>{
    setLoading(true);setSelected(null);setSubmitted(false);setQuestion(null);
    try{
      const raw=await callClaude(PRACTICE_SYSTEM,buildQ("Logical Reasoning",s.level,s.type,user.diagnostic,[]),1200);
      setQuestion({...parseJSON(raw),section:"Logical Reasoning",qType:s.type,assignedLevel:s.level});
    }catch(e){console.warn(e);}
    setLoading(false);
  };


  const skip=()=>{onUpdateUser({onboardingDone:true});onDone();};

  const submitPractice=()=>{
    if(!selected||!question||submitted)return;
    setSubmitted(true);
    const correct=selected===question.correct;
    const record={section:"Logical Reasoning",qType:question.qType,level:1,correct,
      xp:correct?XP_PER_CORRECT[1]:0,timestamp:Date.now(),source:"onboarding"};
    onUpdateUser({history:[...(user.history||[]),record],stats:{...user.stats,xp:(user.stats?.xp||0)+record.xp}});
  };

  const cs=(l)=>{if(!submitted)return selected===l?"sel":"def";if(l===question?.correct)return"ok";if(l===selected)return"bad";return"def";};
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:12,
    padding:"12px 16px",cursor:submitted?"default":"pointer",fontSize:"14px",marginBottom:9,
    transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,boxSizing:"border-box",outline:"none",
    ...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}
      :s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}
      :s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}
      :{background:"transparent",borderColor:C.border,color:C.textSub})});

  // ── FEATURE TOUR ─────────────────────────────────────────────────────────
  if(phase==="tour"){
    const card=TOUR_CARDS[tourStep];
    const isLast=tourStep===TOUR_CARDS.length-1;
    return(
      <div style={{position:"fixed",inset:0,background:C.bg+"fa",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        {/* Skip button top-right */}
        <button onClick={skip} style={{position:"absolute",top:20,right:20,background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 14px",color:C.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.sans}}>
          Skip tour
        </button>

        {/* Welcome header (only on first card) */}
        {tourStep===0&&(
          <div style={{textAlign:"center",marginBottom:24,maxWidth:480}}>
            <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:900,color:"#fff",fontFamily:T.serif,margin:"0 auto 14px",boxShadow:"0 0 28px #3a6bff44"}}>L</div>
            <h2 style={{fontFamily:T.serif,fontSize:24,color:C.text,marginBottom:6}}>Welcome to Lumora LSAT</h2>
            <p style={{color:C.textMuted,fontSize:14,lineHeight:1.6}}>Here's a quick tour of what's available. You can skip any time.</p>
          </div>
        )}

        {/* Feature card */}
        <div style={{background:C.surface,border:`2px solid ${card.color}33`,borderRadius:24,padding:32,maxWidth:480,width:"100%",textAlign:"center",boxShadow:`0 8px 40px ${card.color}18`}}>
          <div style={{width:64,height:64,borderRadius:18,background:`${card.color}20`,border:`2px solid ${card.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 16px"}}>
            {card.icon}
          </div>
          <h3 style={{fontFamily:T.serif,fontSize:22,color:C.text,marginBottom:10,fontWeight:700}}>{card.title}</h3>
          <p style={{color:C.textSub,fontSize:14,lineHeight:1.8,marginBottom:24}}>{card.desc}</p>

          {/* Dot indicators */}
          <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>
            {TOUR_CARDS.map((_,i)=>(
              <button key={i} onClick={()=>setTourStep(i)}
                style={{width:i===tourStep?20:8,height:8,borderRadius:4,background:i===tourStep?card.color:C.surfaceHigh,border:"none",cursor:"pointer",transition:"all 0.3s",padding:0}}/>
            ))}
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            {tourStep>0&&(
              <Btn ghost onClick={()=>setTourStep(t=>t-1)} small>← Back</Btn>
            )}
            {!isLast?(
              <Btn onClick={()=>setTourStep(t=>t+1)} style={{minWidth:140}}>Next →</Btn>
            ):(
              <Btn onClick={()=>setPhase("practice")} style={{minWidth:180,background:"linear-gradient(135deg,#a78bfa,#7c3aed)"}}>
                Try 3 Practice Questions →
              </Btn>
            )}
            {isLast&&(
              <Btn ghost onClick={skip} small>Skip practice</Btn>
            )}
          </div>
        </div>

        {/* Counter */}
        <div style={{marginTop:16,color:C.textMuted,fontSize:13}}>{tourStep+1} of {TOUR_CARDS.length}</div>
      </div>
    );
  }

  // ── PRACTICE DONE ─────────────────────────────────────────────────────────
  if(phase==="practice"&&practiceStep===3){
    return(
      <div style={{position:"fixed",inset:0,background:C.bg+"f8",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,padding:40,maxWidth:440,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:16}}>🎯</div>
          <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:12}}>You're ready.</h2>
          <p style={{color:C.textSub,fontSize:15,lineHeight:1.8,marginBottom:24}}>
            You've seen the three most important question types. Lumora adapts to your weaknesses as you practice — the more you do, the smarter it gets.
          </p>
          <Btn onClick={()=>{onUpdateUser({onboardingDone:true});onDone();}} style={{width:"100%"}}>
            Enter Lumora LSAT →
          </Btn>
        </div>
      </div>
    );
  }

  // ── PRACTICE QUESTIONS ────────────────────────────────────────────────────
  const stepInfo=PRACTICE_STEPS[practiceStep];
  return(
    <div style={{position:"fixed",inset:0,background:C.bg,overflowY:"auto",zIndex:400}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"24px 20px 40px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{display:"flex",gap:5}}>{[0,1,2].map(i=>(
              <div key={i} style={{width:28,height:6,borderRadius:3,
                background:i<practiceStep?C.success:i===practiceStep?C.accent:C.surfaceHigh,
                transition:"background 0.3s"}}/>
            ))}</div>
            <span style={{color:C.textMuted,fontSize:13}}>Question {practiceStep+1} of 3</span>
          </div>
          <button onClick={skip} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:C.textMuted,fontSize:12,cursor:"pointer"}}>Skip</button>
        </div>
        <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.accentSoft},${C.surface})`,borderColor:C.accent+"44"}}>
          <div style={{fontSize:12,color:C.accent,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Lumora says</div>
          <p style={{color:C.text,fontSize:14,lineHeight:1.75,margin:0}}>{stepInfo.msg}</p>
        </Card>
        {loading&&<Spinner label="Generating your question…"/>}
        {question&&!loading&&(
          <div>
            <Card style={{marginBottom:12}}>
              <div style={{marginBottom:10}}><Tag color={C.purple}>Walkthrough</Tag><Tag color={C.accent}>{question.qType}</Tag></div>
              <p style={{lineHeight:1.85,fontSize:"15px",color:"#c8d4e8",marginBottom:16,whiteSpace:"pre-wrap"}}>{question.stimulus}</p>
              <p style={{fontWeight:600,fontSize:"15px",color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:14,marginBottom:14}}>{question.question}</p>
              <div role="radiogroup">
                {Object.entries(question.choices||{}).map(([l,t])=>(
                  <button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}>
                    <span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}
                  </button>
                ))}
              </div>
              {!submitted&&<Btn onClick={submitPractice} disabled={!selected} style={{width:"100%",marginTop:8}}>Submit →</Btn>}
            </Card>
            {submitted&&(
              <div>
                <Card style={{borderColor:selected===question.correct?C.success:C.danger,marginBottom:12}}>
                  <div style={{fontSize:15,fontWeight:700,color:selected===question.correct?C.success:C.danger,marginBottom:10}}>
                    {selected===question.correct?"✓ Correct!":"✗ Not quite — here's why:"}
                  </div>
                  <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,fontSize:13,color:C.textSub,lineHeight:1.85}}>
                    {(question.explanation||"").split(/WRONG\s*\([A-E]\)/)[0].replace(/CORRECT\s*\([A-E]\):\s*/,"").trim()}
                  </div>
                  {question.key_concept&&<div style={{marginTop:10,fontSize:13,color:C.purple,fontStyle:"italic"}}>🔑 {question.key_concept}</div>}
                </Card>
                <Btn onClick={()=>{if(practiceStep<2){setPracticeStep(s=>s+1);setQuestion(null);}else{setPracticeStep(3);}}} style={{width:"100%"}}>
                  {practiceStep<2?"Next Question →":"See Results →"}
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STREAK FREEZE ────────────────────────────────────────────────────────────
// Handled in root App — see handleStreakFreeze

function computeScore(history){
  if(!history||history.length<10)return null;
  const weights={1:0.1,2:0.25,3:0.35,4:0.3};
  const ov=history.filter(h=>h.correct).length/history.length;
  let wa=0;[1,2,3,4].forEach(l=>{const items=history.filter(h=>h.level===l);wa+=(items.length>0?items.filter(h=>h.correct).length/items.length:ov)*weights[l];});
  const base=120+Math.round(wa*60);
  const v=Math.max(3,Math.round(8-history.length/10));
  return{low:Math.max(120,base-v),mid:Math.min(180,base),high:Math.min(180,base+v),
    confidence:history.length>=40?"High":history.length>=20?"Moderate":"Low",
    needed:Math.max(0,40-history.length)};
}

function Dashboard({user,onUpdateUser}){
  const history=user.history||[];
  const overall=history.length>0?Math.round(history.filter(h=>h.correct).length/history.length*100):null;
  const sData=SECTIONS.map(s=>{const items=history.filter(h=>h.section===s);return{s,score:items.length>0?Math.round(items.filter(h=>h.correct).length/items.length*100):null,total:items.length};});
  const tStats={};history.forEach(h=>{if(!tStats[h.qType])tStats[h.qType]={c:0,t:0};tStats[h.qType].t++;if(h.correct)tStats[h.qType].c++;});
  const sorted=Object.entries(tStats).sort((a,b)=>(a[1].c/a[1].t)-(b[1].c/b[1].t));
  const lvData=[1,2,3,4].map(l=>{const items=history.filter(h=>h.level===l);return{l,t:items.length,c:items.filter(h=>h.correct).length};});
  const sc=p=>p>=70?C.success:p>=50?C.gold:C.danger;

  const pred=computeScore(history);

  const srsData=user.email?DB.getSRS(user.email):{};
  const srsDue=srsDueTypes(srsData);

  return(
    <main style={{maxWidth:720,margin:"0 auto",padding:"32px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:10}}>
        <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text}}>Progress</h1>
        {srsDue.length>0&&<div style={{background:C.gold+"20",border:`1px solid ${C.gold}44`,borderRadius:12,padding:"6px 14px",fontSize:13,color:C.gold,fontWeight:600}}>
          🔁 {srsDue.length} type{srsDue.length!==1?"s":""} due for review
        </div>}
      </div>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:14}}>{history.length} total questions answered.</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:14}}>
        <Card style={{textAlign:"center",padding:"16px 10px"}}><Arc pct={overall} size={86} color={overall>=70?C.success:overall>=50?C.gold:C.danger} label={`Overall: ${overall}%`}/><div style={{fontSize:12,color:C.textMuted,marginTop:8}}>Overall</div></Card>
        {sData.map(({s,score,total})=><Card key={s} style={{textAlign:"center",padding:"16px 10px"}}><Arc pct={score} size={72} color={score>=70?C.success:score>=50?C.gold:C.danger} label={`${s}: ${score}%`}/><div style={{fontSize:12,color:C.textMuted,marginTop:8}}>{s.split(" ")[0]}</div><div style={{fontSize:11,color:C.textMuted}}>{total} q's</div></Card>)}
      </div>

      <ScoreTrajectory user={user}/>

      {/* Score Predictor */}
      <Card style={{marginBottom:14,borderColor:C.accent+"44"}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:14,fontWeight:700}}>🎯 Lumora Score Predictor</div>
        {pred?(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:14,flexWrap:"wrap"}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:48,fontWeight:900,color:C.accent,fontFamily:T.serif,lineHeight:1}}>{pred.mid}</div><div style={{fontSize:12,color:C.textMuted,marginTop:4}}>Projected Score</div></div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:C.textSub,marginBottom:6}}>Range: <strong style={{color:C.text}}>{pred.low} – {pred.high}</strong></div>
                <div style={{fontSize:13,color:C.textMuted,marginBottom:10}}>Confidence: <Tag color={pred.confidence==="High"?C.success:pred.confidence==="Moderate"?C.gold:C.textMuted}>{pred.confidence}</Tag></div>
                <div style={{background:C.surfaceHigh,borderRadius:10,height:10,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",left:`${(pred.low-120)/60*100}%`,width:`${(pred.high-pred.low)/60*100}%`,height:"100%",background:`linear-gradient(90deg,${C.accentSoft},${C.accent})`,borderRadius:10}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textMuted,marginTop:4}}><span>120</span><span>150</span><span>180</span></div>
              </div>
            </div>
            {pred.needed>0&&<div style={{fontSize:13,color:C.textMuted,background:C.surfaceHigh,borderRadius:8,padding:"10px 12px"}}>📊 Answer {pred.needed} more questions for <strong style={{color:C.text}}>High</strong> confidence prediction.</div>}
          </div>
        ):(
          <div>
            <p style={{color:C.textMuted,fontSize:14,lineHeight:1.7,marginBottom:10}}>Answer at least <strong style={{color:C.text}}>10 questions</strong> to unlock your Lumora score prediction. You've answered {history.length} so far.</p>
            <div style={{background:C.surfaceHigh,borderRadius:6,height:6}}><div style={{height:"100%",width:`${Math.min(100,history.length/10*100)}%`,background:C.accent,borderRadius:6,transition:"width 0.5s"}}/></div>
            <div style={{fontSize:12,marginTop:4,color:C.textMuted}}>{history.length}/10</div>
          </div>
        )}
      </Card>

      <Card style={{marginBottom:12}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>By Difficulty Level</div>
        {lvData.filter(d=>d.t>0).map(({l,t,c})=>{const pct=Math.round(c/t*100);return<div key={l} style={{marginBottom:11}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:LEVEL_COLORS[l],fontWeight:600}}>Level {l} — {LEVEL_LABELS[l]}</span><span style={{color:sc(pct),fontWeight:600}}>{pct}% ({c}/{t})</span></div><div style={{background:C.surfaceHigh,borderRadius:4,height:7}}><div style={{height:"100%",width:`${pct}%`,background:LEVEL_COLORS[l],borderRadius:4,transition:"width 0.5s"}}/></div></div>;})}
        {lvData.every(d=>d.t===0)&&<p style={{color:C.textMuted,fontSize:14}}>Answer questions to see your level breakdown.</p>}
      </Card>

      {sorted.length>0&&<Card style={{marginBottom:12}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>By Question Type</div>
        {sorted.map(([k,v])=>{const pct=Math.round(v.c/v.t*100);return<div key={k} style={{marginBottom:11}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:C.text}}>{k}</span><span style={{color:sc(pct),fontWeight:600}}>{pct}% ({v.c}/{v.t})</span></div><div style={{background:C.surfaceHigh,borderRadius:4,height:6}}><div style={{height:"100%",width:`${pct}%`,background:sc(pct),borderRadius:4,transition:"width 0.5s"}}/></div></div>;})}
      </Card>}

      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Lumora LSAT Level</div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:54,height:54,borderRadius:13,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff"}}>{Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1}</div>
          <div style={{flex:1}}><XPBar xp={user.stats?.xp||0} level={Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1}/><div style={{fontSize:12,color:C.textMuted,marginTop:5}}>{user.stats?.xp||0} total XP earned</div></div>
        </div>
      </Card>

      <div style={{textAlign:"center",marginTop:20}}>
        <Btn ghost danger onClick={()=>{if(window.confirm("Reset all progress? Cannot be undone."))onUpdateUser({history:[],notes:[],studyPlan:null,learnProgress:{},stats:{xp:0,streak:0,lastDay:null}});}}>Reset All Progress</Btn>
      </div>
    </main>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

// ─── LEX MANAGER (root-level orchestrator) ────────────────────────────────────
function LexManager({user,screen,sessionResult,onNavigate,onUpdateUser}){
  const [lexPose,setLexPose]=useState("idle");
  const [lexMsg,setLexMsg]=useState(null);
  const [showBubble,setShowBubble]=useState(false);
  const [lexIntroShown,setLexIntroShown]=useState(true);
  const idleTimer=useRef(null);
  const lexO=getLexOutfit(user?.email);

  // Check if Lex intro has been done
  useEffect(()=>{
    try{
      const done=localStorage.getItem(LEX_INTRO_KEY+(user?.email||""));
      if(!done)setLexIntroShown(false);
    }catch{}
  },[user?.email]);

  // Check for missed days on mount
  useEffect(()=>{
    if(!user?.email)return;
    const lastDay=user.stats?.lastDay;
    if(!lastDay)return;
    const yesterday=new Date(Date.now()-86400000).toDateString();
    const twoDays=new Date(Date.now()-172800000).toDateString();
    const lastDate=new Date(lastDay).toDateString();
    if(lastDate===twoDays||(!user.stats?.lastDay)){
      // Missed at least one day
      const quip=LEX_MISS_QUIPS[Math.floor(Math.random()*LEX_MISS_QUIPS.length)];
      setTimeout(()=>{
        setLexPose("sad");
        setLexMsg(quip);
        setShowBubble(true);
      },2000);
    }
  },[]);

  // Idle timer
  useEffect(()=>{
    const resetIdle=()=>{
      clearTimeout(idleTimer.current);
      idleTimer.current=setTimeout(()=>{
        const quip=LEX_IDLE_QUIPS[Math.floor(Math.random()*LEX_IDLE_QUIPS.length)];
        setLexPose("think");
        setLexMsg(quip);
        setShowBubble(true);
      },LEX_IDLE_MS);
    };
    const events=["mousemove","keydown","touchstart","click","scroll"];
    events.forEach(e=>window.addEventListener(e,resetIdle,{passive:true}));
    resetIdle();
    return()=>{
      clearTimeout(idleTimer.current);
      events.forEach(e=>window.removeEventListener(e,resetIdle));
    };
  },[]);

  // React to screen changes and session results
  useEffect(()=>{
    if(screen==="practice"||screen==="quick5"){
      setLexPose("excited");
    }else if(screen==="learn"){
      setLexPose("think");
    }else if(screen==="home"){
      setLexPose("idle");
    }
  },[screen]);

  // Session result celebrations
  useEffect(()=>{
    if(!sessionResult)return;
    if(sessionResult.pct>=80){
      const quip=LEX_WIN_QUIPS[Math.floor(Math.random()*LEX_WIN_QUIPS.length)];
      setLexPose("celebrate");
      setLexMsg(quip);
      setShowBubble(true);
    }else if(sessionResult.pct<50){
      const quip=LEX_LOSE_QUIPS[Math.floor(Math.random()*LEX_LOSE_QUIPS.length)];
      setLexPose("sad");
      setLexMsg(quip);
      setShowBubble(true);
    }
  },[sessionResult]);

  const handleLexIntroDone=()=>{
    try{localStorage.setItem(LEX_INTRO_KEY+(user?.email||""),"1");}catch{}
    setLexIntroShown(true);
  };

  if(!user)return null;

  return(
    <>
      {!lexIntroShown&&(
        <LexIntro user={user} onDone={handleLexIntroDone}/>
      )}
      {showBubble&&lexMsg&&(
        <MonkeyBubble
          pose={lexPose}
          message={lexMsg}
          outfit={lexO.outfit} hat={lexO.hat} glasses={lexO.glasses}
          onDismiss={()=>{setShowBubble(false);setLexMsg(null);}}
          autoClose={5000}
          position="bottom-right"
        />
      )}
      <MonkeyBar
        user={user}
        onNavigate={onNavigate}
        onUpdateUser={onUpdateUser}
        currentPose={lexPose}
        currentMsg={lexMsg}
      />
    </>
  );
}

// ─── LEX POINTS UTILITY ───────────────────────────────────────────────────────
// Called from various screens to award Lex Points
function awardLexPoints(email,pts){
  if(!email)return;
  const current=getLexPoints(email);
  setLexPoints(email,current+pts);
}


export default function App(){
  const [user,setUser]=useState(null);
  const [screen,setScreen]=useState("landing");
  const [ready,setReady]=useState(false);
  const [darkMode,setDarkMode]=useState(true);
  const [fontScale,setFontScale]=useState(1);
  const [streakCelebrate,setStreakCelebrate]=useState(false);
  const [showQuick5,setShowQuick5]=useState(false);
  const [quick5Key,setQuick5Key]=useState(0);
  const [showSRS,setShowSRS]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [retakingDiagnostic,setRetakingDiagnostic]=useState(false);
  const [lexSessionResult,setLexSessionResult]=useState(null);
  const [streakFreezes,setStreakFreezes]=useState(()=>{try{return parseInt(localStorage.getItem("lumora_freezes")||"1");}catch{return 1;}});
  
  // Apply theme globally
  useEffect(()=>{
    C=darkMode?DARK:LIGHT;
    FONT_SCALE=fontScale;
  },[darkMode,fontScale]);

  useEffect(()=>{
    try{const email=DB.getSession();if(email){const u=DB.getUser(email);if(u){setUser(u);setScreen("home");}}}catch{}
    setReady(true);
  },[]);

  useEffect(()=>{
    if(!user)return;
    const today=new Date().toDateString();
    if(user.stats?.lastDay===today)return;
    const yesterday=new Date(Date.now()-86400000).toDateString();
    const wasMissed=user.stats?.lastDay&&user.stats.lastDay!==yesterday&&user.stats.lastDay!==today;
    let streak;
    if(user.stats?.lastDay===yesterday){
      streak=(user.stats?.streak||0)+1;
    }else if(wasMissed&&streakFreezes>0){
      // Use a streak freeze to preserve the streak
      streak=user.stats?.streak||1;
      const newFreezes=streakFreezes-1;
      setStreakFreezes(newFreezes);
      try{localStorage.setItem("lumora_freezes",String(newFreezes));}catch{}
    }else{
      streak=1;
    }
    const updated={...user,stats:{...user.stats,streak,lastDay:today}};
    setUser(updated);
    try{DB.saveUser(updated.email,updated);}catch{}
    // Celebrate milestones
    if([3,7,14,30,60,100].includes(streak))setStreakCelebrate(true);
  },[user?.email]);

  const handleLogin=(u)=>{
    setUser(u);setScreen("home");
    if(!u.onboardingDone&&(!u.history||u.history.length===0))setShowOnboarding(true);
  };
  const handleLogout=()=>{DB.clearSession();setUser(null);setScreen("landing");};

  const handleUpdateUser=useCallback((updates)=>{
    setUser(prev=>{
      if(!prev)return prev;
      const next={...prev,...updates};
      if(updates.stats)next.stats={...prev.stats,...updates.stats};
      try{DB.saveUser(next.email,next);}catch{}
      return next;
    });
  },[]);

  const autoGenerateStudyPlan=async(u)=>{
    try{
      const d=u.diagnostic||{};
      const weakTypes=(d.weak_types||[]).join(",");
      const sys="You are an expert LSAT tutor. Respond ONLY with valid JSON — no markdown, no text outside the JSON.";
      const msg="Create a personalized LSAT study plan. Return ONLY this JSON: {\"summary\":\"3-4 sentence personalized assessment\",\"target_score\":\""+
        (d.target_score||"165+")+"\",\"timeline\":\""+
        (d.test_date||"flexible")+"\",\"weekly_hours\":\""+
        (d.study_hours||"flexible")+"\",\"phases\":[{\"name\":\"Phase 1\",\"duration\":\"2 weeks\",\"focus\":\"Foundation building\",\"tasks\":[\"Complete Learn lessons for weakest types\",\"10 practice questions daily\",\"Review all wrong answers carefully\"]}],\"daily_routine\":[\"Morning: 30 min Learn section\",\"Afternoon: 20 min Practice\",\"Evening: Review notes and wrong answers\"],\"priority_areas\":[\""+
        (weakTypes||"Identify weak areas through practice")+"\",\"Timed practice under test conditions\",\"Full section simulations\"],\"milestone\":\"At the halfway point you should be consistently scoring above 70% on Level 3 questions\"}. Student: name="+
        u.name+", target="+(d.target_score||"165+")+", hrs/wk="+(d.study_hours||"unknown")+", challenge="+(d.biggest_challenge||"unknown")+".";
      const raw=await callClaude(sys,msg,1200);
      const plan=parseJSON(raw);
      const updated={...u,studyPlan:plan};
      try{DB.saveUser(updated.email,updated);}catch{}
      setUser(updated);
    }catch(e){console.warn("Auto study plan:",e.message);}
  };

  if(!ready)return <div style={{background:"#06080f",minHeight:"100vh"}}/>;

  if(!user){
    if(screen==="auth")return <Auth onLogin={handleLogin}/>;
    return <Landing onGetStarted={()=>setScreen("auth")}/>;
  }

  if(!user.diagnosticDone||retakingDiagnostic){
    return <Diagnostic user={user}
      onCancel={retakingDiagnostic?()=>setRetakingDiagnostic(false):undefined}
      onComplete={(answers)=>{
        const wasRetake=retakingDiagnostic;
        const u={...user,diagnostic:answers,diagnosticDone:true};
        try{DB.saveUser(u.email,u);}catch{}
        setUser(u);
        setRetakingDiagnostic(false);
        setScreen(wasRetake?"plan":"home");
        autoGenerateStudyPlan(u);
        // Show onboarding only for brand new accounts, never on retake
        if(!wasRetake&&!u.onboardingDone)setShowOnboarding(true);
    // Lex intro fires after onboarding (or immediately on first login without onboarding)
    try{if(!localStorage.getItem(LEX_INTRO_KEY+(u.email||""))){}/* handled by LexManager */}catch{}
      }}/>;
  }

  const handleSetScreen=(s)=>{
    if(s==="quick5"){setQuick5Key(k=>k+1);setShowQuick5(true);return;}
    if(s==="srs"){setShowSRS(true);return;}
    setScreen(s);
  };

  const pages={
    home:<Home user={user} setScreen={handleSetScreen} onUpdateUser={handleUpdateUser}/>,
    daily:<DailyChallengeScreen user={user} onUpdateUser={handleUpdateUser} onBack={()=>setScreen("home")}/>,
    mistakes:<MistakeJournal user={user} onUpdateUser={handleUpdateUser}/>,
    learn:<Learn user={user} onUpdateUser={handleUpdateUser}/>,
    practice:<Practice user={user} onUpdateUser={handleUpdateUser}/>,
    writing:<Writing/>,
    flaw:<FlawLab user={user} onUpdateUser={handleUpdateUser}/>,
    fullsection:<FullSection user={user} onUpdateUser={handleUpdateUser}/>,
    plan:<StudyPlan user={user} onUpdateUser={handleUpdateUser} setScreen={handleSetScreen}/>,
    upload:<Upload/>,
    notes:<Notes user={user} onUpdateUser={handleUpdateUser}/>,
    dashboard:<Dashboard user={user} onUpdateUser={handleUpdateUser}/>,
    lexshop:<LexShop user={user} onBack={()=>setScreen("home")}/>,
    profile:<Profile user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} setScreen={handleSetScreen} onRetakeDiagnostic={()=>setRetakingDiagnostic(true)}/>,
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:T.sans,fontSize:Math.round(16*fontScale)+"px",paddingBottom:user?90:0}}>
      <style>{`*{box-sizing:border-box;}body{margin:0;background:${C.bg};}button,input,textarea,select{font-family:inherit;}@media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}}`}</style>
      {user&&streakCelebrate&&<StreakCelebration streak={user.stats?.streak||0} onDismiss={()=>setStreakCelebrate(false)}/>}
      {showQuick5&&user&&<Quick5 key={quick5Key} user={user} onUpdateUser={handleUpdateUser} onDone={()=>setShowQuick5(false)}/>}
      {showSRS&&user&&<SRSReview user={user} onUpdateUser={handleUpdateUser} onDone={()=>setShowSRS(false)}/>}
      {showOnboarding&&user&&!user.onboardingDone&&<Onboarding user={user} onUpdateUser={handleUpdateUser} onDone={()=>setShowOnboarding(false)}/>}
      {screen!=="profile"&&<Nav screen={screen} setScreen={handleSetScreen} user={user} onLogout={handleLogout}/>}
      {pages[screen]||pages.home}
      {user&&<AccessibilityBar darkMode={darkMode} setDarkMode={setDarkMode} fontScale={fontScale} setFontScale={(f)=>{setFontScale(f);FONT_SCALE=f;}}/>}
      <LexManager user={user} screen={screen} sessionResult={lexSessionResult}
        onNavigate={handleSetScreen} onUpdateUser={handleUpdateUser}/>
    </div>
  );
}
