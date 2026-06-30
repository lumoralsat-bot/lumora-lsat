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
  var s="You are an expert LSAT question author trained on official LSAC PrepTests. Your ONLY job is to produce Logical Reasoning questions that are indistinguishable in quality, structure, and style from questions on official LSAT PrepTests 60-80.";

  s+=" =====  HARD-BANNED STIMULUS PATTERNS (AI clichés that NEVER appear on real LSAT) =====";
  s+=" BANNED: '[Person] believes [X]. [Person] argues this by [Y].'";
  s+=" BANNED: '[Person A] claims [X]. [Person B] argues [Y].'";
  s+=" BANNED: 'According to [Person], [X]. [Person] supports this by saying [Y].'";
  s+=" BANNED: '[Person] thinks [X] because [Y]. Therefore [Z].'";
  s+=" BANNED: Opening with 'Many people believe...' or 'Some argue that...'";
  s+=" BANNED: Opening with a named person's belief or opinion as the first clause.";
  s+=" BANNED: Two characters debating unless the question type explicitly requires a dialogue (e.g., Point at Issue).";
  s+=" If you catch yourself starting with a name followed by 'believes,' 'thinks,' 'argues,' or 'claims' — STOP and rewrite.";

  s+=" ===== THE 8 AUTHENTIC LSAT STIMULUS STRUCTURES — use exactly one per question =====";

  s+=" TYPE 1 — REPORTED OBSERVATION / COUNTERINTUITIVE FINDING: Open with a factual observation or statistic, then draw a conclusion that creates a gap. Real PT examples: 'In a recent study, two groups of mice—one whose diet included ginkgo extract and one that had a normal diet—were taught to navigate a maze. The mice whose diet included ginkgo were more likely to remember how to navigate the maze the next day. However, the ginkgo may not have directly enhanced memory.' [PT76 S2 Q12, 62 words] | 'Shark teeth are among the most common vertebrate fossils; yet fossilized shark skeletons are much less common—indeed, comparatively rare among fossilized vertebrate skeletons.' [PT71 S2 Q12, 30 words] | 'The number of automobile thefts has declined steadily during the past five years, and it is more likely now than it was five years ago that someone who steals a car will be convicted of the crime.' [PT71 S4 Q14, 41 words]";

  s+=" TYPE 2 — CAUSAL ARGUMENT FROM CORRELATION: Present data showing X correlates with Y, then assert X causes Y. Real PT examples: 'A study showed that people who live on very busy streets have higher rates of heart disease than average. I conclude that this elevated rate of heart disease is caused by air pollution from automobile exhaust.' [PT76 S2 Q8, 44 words] | 'In polluted industrial English cities during the Industrial Revolution, two plant diseases—black spot, which infects roses, and tar spot, which infects sycamore trees—disappeared. It is likely that air pollution eradicated these diseases.' [PT71 S4 Q4, 37 words]";

  s+=" TYPE 3 — POLICY / PRINCIPLE ARGUMENT: Argue for or against a policy by citing a principle or comparison. Real PT examples: 'In addition to any other penalties, convicted criminals must now pay a victim surcharge of $30. The surcharge is used to fund services for victims of violent crimes, but this penalty is unfair to nonviolent criminals since the surcharge applies to all crimes, even nonviolent ones like petty theft.' [PT76 S2 Q6, 55 words] | 'Many nursing homes have prohibitions against having pets, and these should be lifted. The presence of an animal companion can yield health benefits by reducing a person's stress.' [PT71 S4 Q16, 35 words] | 'The legislature is considering a bill that would prohibit fishing in Eagle Bay. The bay has one of the highest water pollution levels in the nation, and a recent study found that 80 percent of its fish contained toxin levels that exceed governmental safety standards.' [PT71 S2 Q4, 50 words]";

  s+=" TYPE 4 — CONDITIONAL LOGIC CHAIN: Build a deductive argument using if-then statements and quantifiers. Real PT example: 'The Asian elephant walks with at least two, and sometimes three, feet on the ground at all times. Even though it can accelerate, it does so merely by taking quicker and longer steps. So the Asian elephant does not actually run.' [PT76 Section II Q10]";

  s+=" TYPE 5 — PARADOX / SURPRISING DISCREPANCY: State two facts that appear to contradict each other. The question asks what resolves or explains the discrepancy. Real PT examples: 'After the rush-hour speed limit on the British M25 motorway was lowered from 70 miles per hour to 50 miles per hour, rush-hour travel times decreased by approximately 15 percent.' [PT71 S4 Q12, 37 words — the paradox is implied: slower limit, faster travel] | 'Shark teeth are among the most common vertebrate fossils; yet fossilized shark skeletons are much less common.' [PT71 S2 Q12, 30 words] Use this structure for Paradox question types.";

  s+=" TYPE 6 — NAMED PROFESSIONAL MAKING A SPECIFIC CLAIM: A labeled professional (Economist:, Musicologist:, Librarian:, Engineer:, Herbalist:, Psychiatrist:) makes an argument with evidence and conclusion. Real PT examples: 'Economist: Owing to global economic forces since 1945, our country's economy is increasingly a service economy, in which manufacturing employs an ever smaller fraction of the workforce. Hence, we have engaged in less and less international trade.' [PT76 S2 Q7, 46 words] | 'Musicologist: Classification of a musical instrument depends on the mechanical action through which it produces music. So the piano is properly called a percussion instrument, not a stringed instrument. Even though the vibration of the piano's strings is what makes its sound, the strings are caused to vibrate by the impact of hammers.' [PT71 S2 Q9, 55 words] | 'Engineer: Thermophotovoltaic generators are devices that convert heat into electricity. The process of manufacturing steel produces huge amounts of heat that currently go to waste. So if steel-manufacturing plants could feed the heat they produce into thermophotovoltaic generators, they would greatly reduce their electric bills.' [PT71 S2 Q16, 51 words]";

  s+=" TYPE 7 — TWO-SPEAKER DIALOGUE (only for Point at Issue / Method of Reasoning): Two named speakers express positions, one responding to the other. Real PT examples: 'Vandenburg: This art museum is not adhering to its purpose. Its founders intended it to devote as much attention to contemporary art as to the art of earlier periods, but its collection of contemporary art is far smaller. Simpson: The relatively small size of the contemporary art collection is appropriate. Its curators believe that there is little high-quality contemporary art.' [PT71 S2 Q5, 68 words] | 'Wong: Although all countries are better off as democracies, a transitional autocratic stage is sometimes required before a country can become democratic. Tate: The freedom and autonomy that democracy provides are of genuine value, but the simple material needs of people are more important.' [PT71 S4 Q18, 51 words] ONLY use this type when the question type is Point at Issue, Flaw, or Method of Reasoning.";

  s+=" TYPE 8 — EDITORIAL / NORMATIVE CLAIM: An editorial or normative claim with supporting reasoning. Real PT examples: 'City leader: If our city adopts the new tourism plan, the amount of money that tourists spend here annually will increase by at least $2 billion, creating as many jobs as a new automobile manufacturing plant would. It would be reasonable for the city to spend the amount of money necessary to convince an automobile manufacturer to build a plant here, but adopting the tourism plan would cost less.' [PT76 S2 Q17, 76 words] | 'Columnist: Although much has been learned, we are still largely ignorant of the intricate interrelationships among species of living organisms. We should therefore try to preserve the maximum number of species if we have an interest in preserving any, since allowing species toward which we are indifferent to perish might undermine the viability of other species.' [PT71 S4 Q23, 60 words]";

  s+=" ===== STIMULUS WORD COUNT — HARD REQUIREMENT =====";
  s+=" LSAT LR stimuli have a precise, well-documented length range. You MUST stay within it.";
  s+=" Level 1: 35-55 words. Level 2: 45-65 words. Level 3: 55-75 words. Level 4: 65-90 words MAXIMUM.";
  s+=" The documented average across official LSAT LR stimuli is 50-70 words. Never exceed 90 words.";
  s+=" If your draft exceeds 90 words, cut it before responding. Long stimuli are the #1 sign of a fake LSAT question.";
  s+=" Real PT word counts for reference: 'In the bodies of reptiles...' = 67 words. 'The Asian elephant walks...' = 47 words. 'A study showed that people who live on very busy streets...' = 44 words. 'Owing to global economic forces since 1945...' = 52 words.";
  s+=" Each answer choice: 10-25 words. No answer choice exceeds 30 words.";
  s+=" Higher difficulty (Level 4) means subtler logic and trickier distractors — NOT longer text.";

  s+=" ===== STIMULUS CONSTRUCTION RULES =====";
  s+=" - Length: 2-4 sentences ONLY. Every word must earn its place. No filler.";
  s+=" - Opening: Begin with a FACT, STATISTIC, OBSERVATION, or LABELED PROFESSIONAL — NEVER with a named person's belief.";
  s+=" - Numbers: Use specific figures when they strengthen realism: '25 percent,' 'three times,' 'over the past decade,' '$30.'";
  s+=" - Quantifiers: Be precise — 'most,' 'some,' 'all,' 'no,' 'only,' 'few,' 'several.' Never vague.";
  s+=" - Conclusion markers: The conclusion follows 'thus,' 'therefore,' 'so,' 'hence,' 'this shows that,' 'consequently.'";
  s+=" - The LOGICAL GAP is the heart of the question. Evidence then Gap then Conclusion. Make the gap exploitable.";
  s+=" - Level calibration: Level 1 = simple everyday gap, obvious answer. Level 4 = subtle gap, tricky distractors — still under 90 words.";

  s+=" ===== ANSWER CHOICE CONSTRUCTION RULES =====";
  s+=" - Exactly one correct answer. Four wrong answers that are plausible but fail for precise, nameable reasons.";
  s+=" - Wrong answer trap types (use all five across the four wrong choices):";
  s+="   TRAP A — Too Broad: correct topic, but overclaims beyond the stimulus.";
  s+="   TRAP B — Reverses Logic: gets causation or direction backwards.";
  s+="   TRAP C — Irrelevant Precision: true-sounding but addresses a different gap.";
  s+="   TRAP D — Too Extreme: uses 'always,' 'never,' 'all,' 'none' where the stimulus only supports 'some' or 'most.'";
  s+="   TRAP E — Restatement: merely paraphrases a premise rather than supplying the missing link.";
  s+=" - The correct answer for Assumption questions should pass the Negation Test: negating it destroys the argument.";
  s+=" - The correct answer for Weaken questions should attack the gap, not be irrelevant.";
  s+=" - Answer choice wording: abstract and general, like real LSAT choices. Avoid overly specific proper nouns in choices.";

  s+=" ===== ABSOLUTE BANS =====";
  s+=" FORBIDDEN city names: Millbrook, Westville, Eastbrook, Riverside, Springfield, Greenfield, Lakewood, Maplewood.";
  s+=" FORBIDDEN opening phrases: 'Many people believe,' 'It is widely thought,' 'Most experts agree,' 'Society has long held.'";
  s+=" FORBIDDEN structure: Named person + 'believes/thinks/argues/claims' as the opening clause of the stimulus.";

  s+=' CRITICAL: The "correct" field must be whichever letter (A, B, C, D, or E) is actually the correct answer for the question you wrote. Do NOT default to B. Across questions, correct answers must be distributed across A, B, C, D, and E — roughly 20% each. Pick the correct answer first, then build wrong answers around it. Respond ONLY with valid JSON, no markdown: {"stimulus":"...","question":"...","choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct":"C","explanation":"CORRECT (C): [precise logical reason it fills the gap]. WRONG (A): [specific trap type and reason]. WRONG (B): [specific trap type and reason]. WRONG (D): [specific trap type and reason]. WRONG (E): [specific trap type and reason].","key_concept":"One sentence naming the precise logical skill tested.","level":2}';
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
  const pages=[{id:"home",label:"Home",icon:"⌂"},{id:"quick5",label:"Quick 5",icon:"⚡"},{id:"learn",label:"Learn",icon:"📖"},{id:"practice",label:"Practice",icon:"🎯"},{id:"writing",label:"Writing",icon:"✍"},{id:"flaw",label:"Flaw Lab",icon:"⚖"},{id:"fullsection",label:"Full Section",icon:"⏱"},{id:"mistakes",label:"Mistakes",icon:"❌"},{id:"srs",label:"SRS",icon:"🔁"},{id:"plan",label:"Plan",icon:"📋"},{id:"dashboard",label:"Progress",icon:"📊"}];
  return(
    <nav role="navigation" aria-label="Main navigation" style={{background:C.surface+"ee",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:100,gap:8}}>
      <button onClick={()=>setScreen("home")} aria-label="Home" style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",background:"none",border:"none",padding:0,flexShrink:0}}>
        <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#fff",fontFamily:T.serif,boxShadow:"0 0 16px #3a6bff44"}}>L</div>
        <span style={{fontFamily:T.serif,fontSize:17,color:C.text,fontWeight:700,letterSpacing:"0.03em"}}><span style={{color:C.accent}}>Lumora</span> LSAT</span>
      </button>
      <div style={{display:"flex",gap:1,alignItems:"center",flexWrap:"wrap"}}>
        {pages.map(p=><button key={p.id} onClick={()=>setScreen(p.id)} aria-current={screen===p.id?"page":undefined} style={{background:screen===p.id?"linear-gradient(135deg,#3a6bff22,#a78bfa11)":"transparent",border:`1px solid ${screen===p.id?C.accent+"44":"transparent"}`,borderRadius:9,padding:"5px 11px",color:screen===p.id?C.accent:C.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.sans,fontWeight:screen===p.id?700:400,transition:"all 0.15s",outline:"none",display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:12}}>{p.icon}</span>{p.label}</button>)}
      </div>
      {user&&<div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        {(user.stats?.streak||0)>0&&<div style={{display:"flex",alignItems:"center",gap:4,background:"#ff6b0018",border:"1px solid #ff6b0033",borderRadius:20,padding:"3px 10px"}}><span>🔥</span><span style={{fontSize:12,fontWeight:700,color:"#ff8c42"}}>{user.stats.streak}</span></div>}
        <button onClick={()=>setScreen("profile")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><Avatar user={user} size={34}/></button>
        <button onClick={onLogout} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",color:C.textMuted,fontSize:12,cursor:"pointer",fontFamily:T.sans}}>Out</button>
      </div>}
    </nav>
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
    profile:<Profile user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} setScreen={handleSetScreen} onRetakeDiagnostic={()=>setRetakingDiagnostic(true)}/>,
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:T.sans,fontSize:Math.round(16*fontScale)+"px"}}>
      <style>{`*{box-sizing:border-box;}body{margin:0;background:${C.bg};}button,input,textarea,select{font-family:inherit;}@media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}}`}</style>
      {user&&streakCelebrate&&<StreakCelebration streak={user.stats?.streak||0} onDismiss={()=>setStreakCelebrate(false)}/>}
      {showQuick5&&user&&<Quick5 key={quick5Key} user={user} onUpdateUser={handleUpdateUser} onDone={()=>setShowQuick5(false)}/>}
      {showSRS&&user&&<SRSReview user={user} onUpdateUser={handleUpdateUser} onDone={()=>setShowSRS(false)}/>}
      {showOnboarding&&user&&!user.onboardingDone&&<Onboarding user={user} onUpdateUser={handleUpdateUser} onDone={()=>setShowOnboarding(false)}/>}
      {screen!=="profile"&&<Nav screen={screen} setScreen={handleSetScreen} user={user} onLogout={handleLogout}/>}
      {pages[screen]||pages.home}
      {user&&<AccessibilityBar darkMode={darkMode} setDarkMode={setDarkMode} fontScale={fontScale} setFontScale={(f)=>{setFontScale(f);FONT_SCALE=f;}}/>}
    </div>
  );
}
