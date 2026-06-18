import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SECTIONS = ["Logical Reasoning", "Reading Comprehension"];
const QUESTION_TYPES = {
  "Logical Reasoning": ["Assumption","Weaken","Strengthen","Flaw","Inference","Main Point","Paradox","Method of Reasoning","Parallel Reasoning","Evaluate"],
  "Reading Comprehension": ["Main Idea","Author's Tone","Detail","Inference","Purpose","Analogy","Comparative Passage"],
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

// ─── LEARN CURRICULUM ─────────────────────────────────────────────────────────
const LEARN_CURRICULUM = {
  "Logical Reasoning": [
    {
      type:"Assumption",
      tagline:"Find the missing link the argument depends on.",
      why:"Assumption questions are the most common on the LSAT. Master this and every other LR type becomes easier.",
      concept:`Every LSAT argument has a GAP between the evidence and the conclusion. The assumption is the unstated bridge the author MUST believe for the argument to work. Your job: find that hidden bridge.\n\nKey signal words in the question stem: "assumes," "depends on," "takes for granted," "required assumption."`,
      framework:["1. Find the CONCLUSION (what the author is trying to prove)", "2. Find the EVIDENCE (what they use to prove it)", "3. Identify the GAP between them", "4. The correct answer fills that gap — it must be TRUE for the argument to work", "5. Test with the Negation Test: negate each answer choice. If negating it destroys the argument, that's your assumption."],
      levels:[
        {level:1,desc:"Simple everyday arguments"},
        {level:2,desc:"More complex reasoning gaps"},
        {level:3,desc:"LSAT-style arguments"},
        {level:4,desc:"Full test difficulty"},
      ]
    },
    {type:"Weaken",tagline:"Find the answer that most damages the argument.",why:"Weaken questions test your ability to attack reasoning — a core skill for law school.",concept:`To weaken an argument, you must understand it first. Find the conclusion and the reasoning gap, then look for an answer that makes the conclusion LESS likely to be true. You're not destroying the argument — just damaging it.\n\nKey signal words: "weakens," "undermines," "calls into question," "most damages."`,framework:["1. Identify the conclusion","2. Identify the reasoning gap (the assumption)","3. Look for an answer that attacks that assumption","4. The answer makes the conclusion less probable — not impossible","5. Beware of answers that strengthen or are irrelevant"],levels:[{level:1,desc:"Clear, simple arguments"},{level:2,desc:"Two-step reasoning"},{level:3,desc:"LSAT-style complexity"},{level:4,desc:"Full test difficulty"}]},
    {type:"Strengthen",tagline:"Find the answer that best supports the argument.",why:"The mirror of Weaken — understanding both makes you a complete logical reasoner.",concept:`To strengthen an argument, find its weak point (the gap/assumption) and look for an answer that supports or validates that assumption. The correct answer makes the conclusion MORE likely to be true.\n\nKey signal words: "strengthens," "supports," "most helps," "provides additional support."`,framework:["1. Find the conclusion and evidence","2. Identify the assumption/gap","3. Look for an answer that supports or validates the assumption","4. The answer makes the conclusion more probable","5. Eliminate answers that are irrelevant or weaken the argument"],levels:[{level:1,desc:"Direct support questions"},{level:2,desc:"Indirect support"},{level:3,desc:"Complex causal arguments"},{level:4,desc:"Full test difficulty"}]},
    {type:"Flaw",tagline:"Name the logical error in the argument.",why:"Flaw questions build the critical thinking skills you'll use every day in law school.",concept:`The argument contains a specific logical error. Your job is to identify it precisely. Common LSAT flaws:\n• Circular reasoning (conclusion restates evidence)\n• Confusing correlation with causation\n• Hasty generalization (small sample → big conclusion)\n• False dilemma (only two options when more exist)\n• Ad hominem (attacking the person, not the argument)\n• Equivocation (same word used with different meanings)\n\nKey signal words: "flaw," "error in reasoning," "vulnerable to criticism."`,framework:["1. Read the argument carefully","2. Find the conclusion and evidence","3. Ask: what's wrong with this reasoning?","4. Match the error to an answer choice that describes it accurately","5. Correct answers describe the flaw in general terms — not specific to the content"],levels:[{level:1,desc:"Named, obvious fallacies"},{level:2,desc:"Subtler reasoning errors"},{level:3,desc:"LSAT-style flawed arguments"},{level:4,desc:"Full test difficulty"}]},
    {type:"Inference",tagline:"Find what must be true based on the statements given.",why:"Tests pure logical deduction — a foundational skill for legal analysis.",concept:`Inference questions give you a set of statements and ask what MUST follow. Unlike other question types, you're not analyzing an argument — you're drawing a logical conclusion from facts.\n\nKey signal words: "must be true," "can be properly inferred," "conclusion follows logically."\n\nCritical rule: The correct answer must be TRUE given the statements. It cannot go beyond what's stated.`,framework:["1. Read all statements carefully","2. Look for connections between statements","3. The correct answer follows necessarily — it CANNOT be false","4. Eliminate answers that are merely possible or probable","5. Be wary of answers that go further than the evidence supports"],levels:[{level:1,desc:"Direct, obvious inferences"},{level:2,desc:"Combining two statements"},{level:3,desc:"Conditional logic chains"},{level:4,desc:"Full test difficulty"}]},
    {type:"Main Point",tagline:"Identify the author's central conclusion.",why:"If you can't find the main point, you can't analyze any argument correctly.",concept:`Main Point questions ask you to identify the primary conclusion the author is arguing for. This is different from a detail or a sub-conclusion.\n\nKey signal words: "main point," "main conclusion," "primarily arguing," "overall conclusion."\n\nTip: The main conclusion is what the entire argument is trying to establish. Everything else is evidence FOR it.`,framework:["1. Read the whole argument","2. Ask: what is the author ultimately trying to prove?","3. Use conclusion indicator words: therefore, thus, so, hence, consequently","4. The main point is supported by everything else — it doesn't support anything else","5. Eliminate answers that are evidence, sub-conclusions, or background"],levels:[{level:1,desc:"Simple arguments"},{level:2,desc:"Multi-premise arguments"},{level:3,desc:"Complex nested reasoning"},{level:4,desc:"Full test difficulty"}]},
    {type:"Paradox",tagline:"Find the answer that resolves the apparent contradiction.",why:"Tests your ability to reconcile conflicting information — key in legal reasoning.",concept:`Paradox questions present two facts that seem to contradict each other and ask you to resolve the tension. The correct answer explains HOW both facts can be true simultaneously.\n\nKey signal words: "explains," "resolves the apparent discrepancy," "reconciles," "most helps to explain."`,framework:["1. Identify the two contradictory facts","2. Understand exactly why they seem to conflict","3. Look for an answer that makes BOTH facts true at the same time","4. The answer doesn't prove one fact wrong — it explains the coexistence","5. Eliminate answers that explain only one fact or make the paradox worse"],levels:[{level:1,desc:"Simple contradictions"},{level:2,desc:"Statistical paradoxes"},{level:3,desc:"LSAT-style paradoxes"},{level:4,desc:"Full test difficulty"}]},
    {type:"Method of Reasoning",tagline:"Describe HOW the argument makes its case.",why:"Forces you to think about argument structure — essential for advanced LSAT performance.",concept:`Method of Reasoning questions ask you to describe the logical technique the author uses. You're not evaluating the argument — you're describing its structure.\n\nKey signal words: "argues by," "method of reasoning," "the argument proceeds by," "responds by."\n\nCommon methods: analogy, counterexample, appealing to authority, eliminating alternatives, providing evidence.`,framework:["1. Read the argument for structure, not just content","2. Ask: HOW does the author make their point?","3. Look for the logical technique used (analogy, evidence, elimination, etc.)","4. The correct answer describes the method accurately and abstractly","5. Eliminate answers that describe what the argument concludes, not how"],levels:[{level:1,desc:"Simple argument structures"},{level:2,desc:"Two-step reasoning methods"},{level:3,desc:"Complex rhetorical strategies"},{level:4,desc:"Full test difficulty"}]},
    {type:"Parallel Reasoning",tagline:"Find the argument with identical logical structure.",why:"The hardest LR type — but consistent practice makes it very learnable.",concept:`Parallel Reasoning questions ask you to find another argument with the EXACT SAME logical structure as the original. The content is completely different — only the structure matters.\n\nKey signal words: "parallel in its reasoning," "most similar in logical structure."\n\nStrategy: Abstract the original argument into a formula (If A → B; A; therefore B) and find the answer that matches.`,framework:["1. Strip the original argument down to its logical structure","2. Identify the type of reasoning (conditional, causal, analogical)","3. Check if the conclusion type matches (definite vs. probable)","4. Find the answer with identical structure — not just similar topic","5. Eliminate answers that are similar in content but different in structure"],levels:[{level:1,desc:"Simple conditional arguments"},{level:2,desc:"Causal and analogical structures"},{level:3,desc:"Complex multi-step reasoning"},{level:4,desc:"Full test difficulty"}]},
    {type:"Evaluate",tagline:"Find the question whose answer would most help assess the argument.",why:"Tests sophisticated understanding of what makes arguments stronger or weaker.",concept:`Evaluate questions ask you to find the question that, when answered, would most help determine whether the argument is strong or weak. The correct answer identifies a crucial piece of missing information.\n\nKey signal words: "would be most useful to know," "most helps to evaluate," "most relevant to assessing."`,framework:["1. Find the argument's assumption/gap","2. Ask: what information would tell us if this assumption holds?","3. The correct answer is a question whose YES answer strengthens and NO answer weakens (or vice versa)","4. Apply the Yes/No test to each answer choice","5. Eliminate questions whose answers wouldn't affect the argument's strength"],levels:[{level:1,desc:"Simple causal arguments"},{level:2,desc:"Policy and prediction arguments"},{level:3,desc:"Complex multi-variable arguments"},{level:4,desc:"Full test difficulty"}]},
  ],
  "Reading Comprehension": [
    {type:"Main Idea",tagline:"Identify the central point of the entire passage.",why:"Every RC question becomes easier when you know exactly what the passage is about.",concept:`Main Idea questions ask for the author's primary purpose or central argument across the entire passage. One common mistake: choosing an answer that's true but too narrow (covers only one paragraph) or too broad (goes beyond the passage).\n\nKey signal words: "main point," "primary purpose," "best describes the passage," "central argument."`,framework:["1. Read actively — ask 'what is this passage ultimately arguing?'","2. The main idea encompasses the whole passage — not just one section","3. Note the author's tone and stance throughout","4. Eliminate answers that are too narrow, too broad, or contradict the passage","5. The correct answer should make every paragraph feel relevant"],levels:[{level:1,desc:"Short, direct passages"},{level:2,desc:"Multi-paragraph passages"},{level:3,desc:"Complex academic passages"},{level:4,desc:"Full test difficulty"}]},
    {type:"Author's Tone",tagline:"Identify the author's attitude toward the subject.",why:"Tone questions reward careful attention to word choice and rhetorical stance.",concept:`Author's Tone questions ask you to characterize the author's attitude. LSAT passages are rarely neutral — authors have a stance. Look for charged language, evaluative words, and how the author treats different viewpoints.\n\nCommon tones: critical, skeptical, supportive, cautious, enthusiastic, ambivalent, objective.`,framework:["1. Look for evaluative language (words that judge or assess)","2. Note how the author treats opposing views","3. Check if the author uses qualifiers (somewhat, largely, arguably)","4. Eliminate extreme answers (never 'enraged' or 'ecstatic' on LSAT)","5. The tone should be consistent with the passage's overall argument"],levels:[{level:1,desc:"Clearly positive or negative tone"},{level:2,desc:"Nuanced or mixed tone"},{level:3,desc:"Subtle academic tone"},{level:4,desc:"Full test difficulty"}]},
    {type:"Detail",tagline:"Find information explicitly stated in the passage.",why:"Tests careful reading — the answer is always in the text.",concept:`Detail questions ask about specific information stated in the passage. The answer is always directly supported by text — no inference required. The challenge is locating the right part of the passage quickly.\n\nKey signal words: "according to the passage," "the author states," "mentioned in the passage."`,framework:["1. Identify the key terms in the question","2. Locate those terms in the passage (use your passage map)","3. Read the surrounding sentences carefully","4. The correct answer paraphrases what the passage explicitly says","5. Eliminate answers that require you to go beyond what's stated"],levels:[{level:1,desc:"Obvious, easy-to-find details"},{level:2,desc:"Details requiring careful location"},{level:3,desc:"Details in complex passages"},{level:4,desc:"Full test difficulty"}]},
    {type:"Inference",tagline:"Find what must be true based on the passage.",why:"Tests your ability to draw logical conclusions from text — core legal reading skill.",concept:`RC Inference questions ask what must be true based on the passage — not what's explicitly stated, but what necessarily follows. The answer goes slightly beyond the text but is fully supported by it.\n\nKey signal words: "can be inferred," "most strongly supported," "passage suggests," "author would most likely agree."`,framework:["1. Find the relevant part of the passage","2. Ask what necessarily follows from what's stated","3. The answer cannot contradict the passage or go far beyond it","4. Eliminate answers that are merely possible but not necessarily true","5. Eliminate answers that directly contradict the passage"],levels:[{level:1,desc:"Direct, obvious inferences"},{level:2,desc:"Combining information from two paragraphs"},{level:3,desc:"Nuanced inferences from complex text"},{level:4,desc:"Full test difficulty"}]},
    {type:"Purpose",tagline:"Explain why the author included a specific part of the passage.",why:"Tests structural understanding of how passages are built — crucial for high scores.",concept:`Purpose questions ask WHY the author included a specific paragraph, example, or detail. You're not describing the content — you're explaining its function within the larger argument.\n\nKey signal words: "purpose of the second paragraph," "why does the author mention," "function of the example."`,framework:["1. Identify exactly what you're being asked about (paragraph, sentence, example)","2. Ask: why is this here? What job does it do for the larger argument?","3. Common purposes: illustrate a point, introduce a counterargument, provide evidence, qualify a claim","4. The correct answer describes the function, not the content","5. Eliminate answers that describe what the section says rather than why it's there"],levels:[{level:1,desc:"Clear illustrative examples"},{level:2,desc:"Counterarguments and qualifications"},{level:3,desc:"Complex rhetorical functions"},{level:4,desc:"Full test difficulty"}]},
    {type:"Analogy",tagline:"Find the situation most analogous to something in the passage.",why:"Tests abstract thinking — the ability to see structural similarity across different contexts.",concept:`Analogy questions ask you to find a real-world situation that is structurally similar to something described in the passage. The content will be completely different — only the underlying relationship or structure matters.\n\nKey signal words: "most analogous to," "most similar to the situation described," "best parallels."`,framework:["1. Clearly identify the structure or relationship in the passage","2. Abstract it away from the specific content","3. Find the answer with the identical structure in a different context","4. Ignore surface-level content similarity — focus on structure","5. Eliminate answers that are similar in topic but different in structure"],levels:[{level:1,desc:"Simple structural analogies"},{level:2,desc:"Complex relational analogies"},{level:3,desc:"Abstract structural matching"},{level:4,desc:"Full test difficulty"}]},
    {type:"Comparative Passage",tagline:"Compare and contrast two related passages.",why:"Tests your ability to synthesize multiple perspectives — essential for legal analysis.",concept:`Comparative Passage questions give you two shorter passages on related topics. Questions ask about relationships between them: where they agree, disagree, how one author would respond to the other.\n\nStrategy: As you read, actively note where the passages agree, disagree, and where one addresses something the other doesn't.`,framework:["1. Read Passage A and note its main argument and stance","2. Read Passage B noting where it agrees and disagrees with A","3. Build a mental 'relationship map' between the two passages","4. Agreement questions: find claims both authors would accept","5. Disagreement questions: find claims where they take opposing sides"],levels:[{level:1,desc:"Clear agreement/disagreement"},{level:2,desc:"Subtle differences in emphasis"},{level:3,desc:"Complex comparative analysis"},{level:4,desc:"Full test difficulty"}]},
  ],
};

// ─── USER STORE ───────────────────────────────────────────────────────────────
const DB = {
  getUsers:()=>{try{return JSON.parse(localStorage.getItem("lumora_users")||"{}")}catch{return{}}},
  saveUsers:(u)=>{try{localStorage.setItem("lumora_users",JSON.stringify(u))}catch{}},
  getSession:()=>{try{return localStorage.getItem("lumora_session")||null}catch{return null}},
  saveSession:(e)=>{try{localStorage.setItem("lumora_session",e)}catch{}},
  clearSession:()=>{try{localStorage.removeItem("lumora_session")}catch{}},
  getUser:(e)=>{const u=DB.getUsers();return u[e]||null},
  saveUser:(e,d)=>{const u=DB.getUsers();u[e]=d;DB.saveUsers(u)},
};

// ─── API ──────────────────────────────────────────────────────────────────────
let API_KEY="";
try{API_KEY=import.meta.env.VITE_ANTHROPIC_API_KEY||"";}catch{API_KEY="";}

async function callClaude(system,userMsg,maxTokens=1200){
  if(!API_KEY)throw new Error("No API key configured. Add VITE_ANTHROPIC_API_KEY in Vercel environment variables.");
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:maxTokens,system,messages:[{role:"user",content:userMsg}]}),
  });
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`API error ${res.status}`);}
  const data=await res.json();
  const text=data.content?.map(i=>i.text||"").join("").trim();
  if(!text)throw new Error("Empty response from API");
  return text;
}
function parseJSON(raw){
  return JSON.parse(raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim());
}

// ─── DESIGN ───────────────────────────────────────────────────────────────────
const C={
  bg:"#06080f",surface:"#0c1220",surfaceHigh:"#131c30",border:"#1c2744",
  text:"#edf2ff",textMuted:"#4a5c80",textSub:"#7a90bb",
  accent:"#4f7fff",accentSoft:"#162448",
  gold:"#f5c842",goldSoft:"#241d08",
  success:"#2dd4a0",danger:"#f87171",purple:"#a78bfa",pink:"#f472b6",
  teal:"#22d3ee",orange:"#fb923c",
};
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
function Spinner({label="Lumora LSAT is thinking…"}){
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
const PRACTICE_SYSTEM=`You are an expert LSAT question author with 20+ years experience. Write questions indistinguishable from official LSAT content in quality, structure, and rigor.

CRITICAL: The correct answer must be logically airtight — verify it three times. Wrong answers must be plausible but eliminable.

Respond ONLY with valid JSON (no markdown fences):
{"stimulus":"...","question":"...","choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct":"B","explanation":"CORRECT (B): [why correct]. (A): [why wrong]. (C): [why wrong]. (D): [why wrong]. (E): [why wrong].","key_concept":"One sentence naming the specific skill tested.","level":2}`;

function buildQ(sec,level,qType,profile){
  return `Generate a Level ${level} (1=easiest,4=hardest) LSAT ${sec} question of type: ${qType}. Student targets ${profile?.target_score||"165+"}. Match real LSAT difficulty for Level ${level} exactly.`;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({screen,setScreen,user,onLogout}){
  const pages=[
    {id:"home",label:"Home",icon:"⌂"},
    {id:"learn",label:"Learn",icon:"📖"},
    {id:"practice",label:"Practice",icon:"🎯"},
    {id:"writing",label:"Writing",icon:"✍️"},
    {id:"flaw",label:"Flaw Lab",icon:"⚖️"},
    {id:"fullsection",label:"Full Section",icon:"⏱"},
    {id:"plan",label:"Plan",icon:"📋"},
    {id:"dashboard",label:"Progress",icon:"📊"},
  ];
  return(
    <nav role="navigation" aria-label="Main navigation" style={{background:C.surface+"ee",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:100,gap:8}}>
      <button onClick={()=>setScreen("home")} aria-label="Home" style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",background:"none",border:"none",padding:0,flexShrink:0}}>
        <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#fff",fontFamily:T.serif,boxShadow:"0 0 16px #3a6bff44"}} aria-hidden="true">L</div>
        <span style={{fontFamily:T.serif,fontSize:17,color:C.text,fontWeight:700,letterSpacing:"0.03em",display:"flex",gap:4}}><span style={{color:C.accent}}>Lumora</span><span>LSAT</span></span>
      </button>
      <div style={{display:"flex",gap:1,alignItems:"center",flexWrap:"wrap"}}>
        {pages.map(p=><button key={p.id} onClick={()=>setScreen(p.id)} aria-current={screen===p.id?"page":undefined}
          style={{background:screen===p.id?"linear-gradient(135deg,#3a6bff22,#a78bfa11)":"transparent",border:`1px solid ${screen===p.id?C.accent+"44":"transparent"}`,borderRadius:9,padding:"5px 11px",color:screen===p.id?C.accent:C.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.sans,fontWeight:screen===p.id?700:400,transition:"all 0.15s",outline:"none",display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:12}}>{p.icon}</span>{p.label}
        </button>)}
      </div>
      {user&&<div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        {(user.stats?.streak||0)>0&&<div aria-label={`${user.stats.streak} day streak`} style={{display:"flex",alignItems:"center",gap:4,background:"#ff6b0018",border:"1px solid #ff6b0033",borderRadius:20,padding:"3px 10px"}}><span>🔥</span><span style={{fontSize:12,fontWeight:700,color:"#ff8c42"}}>{user.stats.streak}</span></div>}
        <button onClick={()=>setScreen("profile")} aria-label="Profile" style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
          <Avatar user={user} size={34}/>
        </button>
        <button onClick={onLogout} aria-label="Sign out" style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",color:C.textMuted,fontSize:12,cursor:"pointer",fontFamily:T.sans}}>Out</button>
      </div>}
    </nav>
  );
}

// ─── LANDING SCREEN ───────────────────────────────────────────────────────────
function Landing({onGetStarted}){
  const [tick,setTick]=useState(0);
  useEffect(()=>{const i=setInterval(()=>setTick(t=>t+1),2800);return()=>clearInterval(i);},[]);
  const taglines=["Think Like a Lawyer.","Argue Like a Pro.","Score What You Deserve.","Ace the LSAT."];
  const currentTag=taglines[tick%taglines.length];
  const features=[
    {icon:"🎯",title:"Infinite Practice",desc:"AI generates fresh questions every session — no question bank, no repeats, ever."},
    {icon:"📖",title:"Interactive Lessons",desc:"Learn every question type from first principles with guided AI tutoring."},
    {icon:"⚖️",title:"Flaw Lab",desc:"Spot hidden flaws in AI-generated legal arguments and get scored on your reasoning."},
    {icon:"🧠",title:"Score Predictor",desc:"Real-time AI analysis projects your LSAT score range as you practice."},
    {icon:"✍️",title:"2026 Writing",desc:"Full LSAC argumentative writing with guided prewriting and detailed AI feedback."},
    {icon:"⏱",title:"Full Sections",desc:"35-minute timed simulations that ramp from Level 1 to Level 4."},
  ];
  return(
    <div style={{minHeight:"100vh",background:C.bg,overflow:"hidden",position:"relative"}}>
      {/* Animated background orbs */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,#3a6bff18 0%,transparent 70%)",top:-100,left:-100,animation:"float1 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,#a78bfa14 0%,transparent 70%)",top:"30%",right:-150,animation:"float2 10s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,#f5c84210 0%,transparent 70%)",bottom:-50,left:"30%",animation:"float3 12s ease-in-out infinite"}}/>
        <style>{`
          @keyframes float1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,30px) scale(1.05)}}
          @keyframes float2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-30px,40px) scale(0.97)}}
          @keyframes float3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-30px) scale(1.03)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
          @keyframes tagSwitch{0%{opacity:0;transform:translateY(10px)}15%,85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
          *:focus-visible{outline:2px solid ${C.accent}!important;outline-offset:2px!important;}
        `}</style>
      </div>

      <div style={{position:"relative",zIndex:1,maxWidth:1000,margin:"0 auto",padding:"0 24px"}}>
        {/* Hero */}
        <div style={{textAlign:"center",paddingTop:"clamp(60px,10vh,120px)",paddingBottom:80,animation:"fadeUp 0.8s ease both"}}>
          {/* Logo mark */}
          <div style={{display:"inline-flex",alignItems:"center",gap:12,marginBottom:40,padding:"8px 20px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:40}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff",fontFamily:T.serif,boxShadow:"0 0 20px #3a6bff55"}}>L</div>
            <span style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:C.text,letterSpacing:"0.03em"}}><span style={{color:C.accent}}>Lumora</span> LSAT</span>
            <span style={{fontSize:11,fontWeight:700,color:C.accent,background:C.accentSoft,padding:"2px 8px",borderRadius:20,letterSpacing:"0.08em",textTransform:"uppercase"}}>Beta</span>
          </div>

          {/* Headline */}
          <h1 style={{fontFamily:T.serif,fontSize:"clamp(38px,7vw,80px)",fontWeight:700,color:C.text,lineHeight:1.1,marginBottom:20}}>
            The LSAT Prep That<br/>
            <span style={{display:"inline-block",minWidth:400,textAlign:"center"}}>
              <span key={tick} style={{display:"inline-block",background:"linear-gradient(135deg,#4f7fff,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"tagSwitch 2.8s ease both"}}>{currentTag}</span>
            </span>
          </h1>

          <p style={{fontSize:"clamp(16px,2.5vw,20px)",color:C.textSub,maxWidth:560,margin:"0 auto 48px",lineHeight:1.8}}>
            AI-powered adaptive learning, infinite practice questions, interactive lessons for every question type, and real-time score prediction. Built for students who want to win.
          </p>

          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={onGetStarted} style={{background:"linear-gradient(135deg,#3a6bff,#6a9fff)",color:"#fff",border:"none",borderRadius:14,padding:"18px 44px",fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:T.sans,boxShadow:"0 8px 32px #3a6bff55",transition:"all 0.2s",letterSpacing:"0.02em"}}>
              Start for Free →
            </button>
            <button onClick={onGetStarted} style={{background:"transparent",color:C.textSub,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 32px",fontSize:16,cursor:"pointer",fontFamily:T.sans,transition:"all 0.2s"}}>
              Sign In
            </button>
          </div>

          {/* Social proof */}
          <div style={{marginTop:40,display:"flex",alignItems:"center",justifyContent:"center",gap:24,flexWrap:"wrap"}}>
            {[["∞","Unique Questions"],["17","Question Types"],["2026","LSAC Format"],["AI","Score Predictor"]].map(([v,l])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:C.accent,fontFamily:T.serif}}>{v}</div>
                <div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:80,animation:"fadeUp 0.8s ease 0.2s both",opacity:0,animationFillMode:"forwards"}}>
          {features.map((f,i)=>(
            <div key={f.title} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",transition:"all 0.2s",animationDelay:`${i*0.05}s`}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent+"66";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{fontSize:32,marginBottom:14}}>{f.icon}</div>
              <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:8}}>{f.title}</div>
              <div style={{fontSize:14,color:C.textMuted,lineHeight:1.65}}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{textAlign:"center",paddingBottom:80,animation:"fadeUp 0.8s ease 0.4s both",opacity:0,animationFillMode:"forwards"}}>
          <div style={{background:`linear-gradient(135deg,${C.accentSoft},#1a1230)`,border:`1px solid ${C.accent}33`,borderRadius:24,padding:"48px 32px",maxWidth:600,margin:"0 auto"}}>
            <div style={{fontSize:32,marginBottom:16}}>⚖️</div>
            <h2 style={{fontFamily:T.serif,fontSize:28,color:C.text,marginBottom:12,fontWeight:700}}>Ready to dominate the LSAT?</h2>
            <p style={{color:C.textSub,fontSize:15,marginBottom:28,lineHeight:1.7}}>Create your free account and start your personalized prep today. No credit card required.</p>
            <button onClick={onGetStarted} style={{background:"linear-gradient(135deg,#3a6bff,#6a9fff)",color:"#fff",border:"none",borderRadius:14,padding:"16px 40px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:T.sans,boxShadow:"0 8px 32px #3a6bff55"}}>
              Get Started Free →
            </button>
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
      const u={name:name.trim(),email:email.toLowerCase(),password,avatarColor:Math.floor(Math.random()*8),avatarEmoji:"",diagnosticDone:false,diagnostic:{},history:[],notes:[],studyPlan:null,learnProgress:{},stats:{xp:0,streak:0,lastDay:null}};
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
          <p style={{color:C.textMuted,fontSize:14,marginBottom:22,lineHeight:1.6}}>{mode==="login"?"All your progress is saved and waiting.":"Your progress saves automatically every session."}</p>
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
function Diagnostic({user,onComplete}){
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState({});
  const q=DIAGNOSTIC_QUESTIONS[step];
  const toggleMulti=(id,val)=>{const cur=answers[id]||[];setAnswers(a=>({...a,[id]:cur.includes(val)?cur.filter(x=>x!==val):[...cur,val]}));};
  const canNext=()=>{if(!q)return false;if(q.type==="multi")return(answers[q.id]||[]).length>0;return answers[q.id]!==undefined;};
  const next=()=>{if(step<DIAGNOSTIC_QUESTIONS.length-1)setStep(s=>s+1);else onComplete(answers);};
  const progress=Math.round(((step+1)/DIAGNOSTIC_QUESTIONS.length)*100);
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:520}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontFamily:T.serif,fontSize:22,color:C.text,fontWeight:700}}>Welcome, {user.name.split(" ")[0]}! 👋</div>
          <p style={{color:C.textMuted,fontSize:14,marginTop:6,lineHeight:1.6}}>Quick 2-minute profile setup. Happens just once — then Lumora LSAT personalizes everything for you.</p>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12,color:C.textMuted}}><span>Building your profile</span><span>{progress}%</span></div>
          <div style={{background:C.surfaceHigh,borderRadius:6,height:5}} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${C.accent},${C.purple})`,borderRadius:6,transition:"width 0.4s ease"}}/>
          </div>
        </div>
        <Card>
          <div style={{fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,fontWeight:700}}>Question {step+1} of {DIAGNOSTIC_QUESTIONS.length}</div>
          <h2 style={{fontSize:17,color:C.text,marginBottom:20,lineHeight:1.45,fontWeight:600}}>{q.q}</h2>
          {q.type==="single"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{q.options.map(opt=><Pill key={opt} active={answers[q.id]===opt} onClick={()=>setAnswers(a=>({...a,[q.id]:opt}))}>{opt}</Pill>)}</div>}
          {q.type==="multi"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{q.options.map(opt=><Pill key={opt} active={(answers[q.id]||[]).includes(opt)} onClick={()=>toggleMulti(q.id,opt)}>{opt}</Pill>)}</div>}
          {q.type==="scale"&&<div>
            <div style={{display:"flex",gap:10,marginBottom:8}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setAnswers(a=>({...a,[q.id]:n}))} aria-label={`${n} of 5`} aria-pressed={answers[q.id]===n} style={{flex:1,aspectRatio:"1",borderRadius:12,border:`2px solid ${answers[q.id]===n?C.accent:C.border}`,background:answers[q.id]===n?C.accentSoft:"transparent",color:answers[q.id]===n?C.accent:C.textMuted,fontSize:18,fontWeight:700,cursor:"pointer",transition:"all 0.15s",outline:"none"}}>{n}</button>)}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textMuted}}><span>Not comfortable</span><span>Very comfortable</span></div>
          </div>}
          <div style={{marginTop:22}}><Btn onClick={next} disabled={!canNext()} style={{width:"100%"}}>{step===DIAGNOSTIC_QUESTIONS.length-1?"Finish & Start Learning →":"Continue →"}</Btn></div>
        </Card>
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function Profile({user,onUpdateUser,onLogout,setScreen}){
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
function Home({user,setScreen}){
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

  const quickActions=[
    {id:"practice",icon:"🎯",label:"Practice",desc:"AI questions targeting your weak spots",color:C.accent,badge:null},
    {id:"learn",icon:"📖",label:"Learn",desc:`${learnedTypes}/${totalTypes} types mastered`,color:C.purple,badge:learnedTypes<totalTypes?{label:"New lessons",color:C.purple}:null},
    {id:"flaw",icon:"⚖️",label:"Flaw Lab",desc:"Spot flaws in legal arguments",color:C.teal,badge:{label:"AI Generated",color:C.teal}},
    {id:"writing",icon:"✍️",label:"Writing",desc:"2026 LSAC format with AI feedback",color:C.success,badge:{label:"2026 Format",color:C.success}},
    {id:"fullsection",icon:"⏱",label:"Full Section",desc:"35-min timed simulation",color:C.gold,badge:{label:"Timed",color:C.gold}},
    {id:"dashboard",icon:"📊",label:"Progress",desc:"Score predictor + full analytics",color:C.pink,badge:history.length>=10?{label:"Predictor Active",color:C.pink}:null},
    {id:"plan",icon:"📋",label:"Study Plan",desc:"Your personalized roadmap",color:C.orange},
    {id:"notes",icon:"📝",label:"Notes",desc:`${(user.notes||[]).length} notes saved`,color:C.textSub},
  ];

  return(
    <main style={{maxWidth:820,margin:"0 auto",padding:"32px 20px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,gap:16,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:13,color:C.textMuted,marginBottom:4}}>{greeting}</div>
          <h1 style={{fontFamily:T.serif,fontSize:"clamp(24px,4vw,36px)",color:C.text,lineHeight:1.15,marginBottom:6}}>{user.name.split(" ")[0]}.</h1>
          <p style={{color:C.textMuted,fontSize:14,lineHeight:1.6}}>
            {history.length===0?"Start your LSAT journey below.":todayCount===0?"Pick up where you left off.":
            `${todayCount} question${todayCount!==1?"s":""} answered today. Keep going.`}
          </p>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={()=>setScreen("profile")} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:12,padding:"8px 16px",color:C.textSub,fontSize:13,cursor:"pointer",fontFamily:T.sans,display:"flex",alignItems:"center",gap:8}}>
            <Avatar user={user} size={22}/>
            Profile
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {label:"Questions",value:history.length,color:C.accent,icon:"📝"},
          {label:"Accuracy",value:overall!==null?overall+"%":"—",color:overall>=70?C.success:overall>=50?C.gold:C.danger,icon:"🎯"},
          {label:"Streak",value:`${user.stats?.streak||0}🔥`,color:"#ff8c42",icon:null},
          {label:"XP",value:xp.toLocaleString(),color:C.gold,icon:"⭐"},
        ].map(s=><Card key={s.label} style={{padding:"14px 16px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,color:s.color,marginBottom:2}}>{s.value}</div>
          <div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
        </Card>)}
      </div>

      {/* XP Bar */}
      <Card style={{marginBottom:16,padding:"13px 18px"}}>
        <XPBar xp={xp} level={level}/>
      </Card>

      {/* Learn progress bar */}
      {learnedTypes>0&&<Card style={{marginBottom:16,padding:"13px 18px",borderColor:C.purple+"44"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textMuted,marginBottom:6}}>
          <span style={{fontWeight:600,color:C.purple}}>📖 Learn Progress</span>
          <span>{learnedTypes}/{totalTypes} question types mastered</span>
        </div>
        <div style={{background:C.surfaceHigh,borderRadius:4,height:6}}>
          <div style={{height:"100%",width:`${learnedTypes/totalTypes*100}%`,background:`linear-gradient(90deg,${C.purple},#c084fc)`,borderRadius:4,transition:"width 0.6s"}}/>
        </div>
      </Card>}

      {/* Quick action grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {quickActions.map(c=>(
          <Card key={c.id} onClick={()=>setScreen(c.id)} role="button" ariaLabel={`Go to ${c.label}`}
            style={{cursor:"pointer",transition:"all 0.2s",borderColor:C.border}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color+"66";e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";}}>
            <div style={{fontSize:28,marginBottom:10}} aria-hidden="true">{c.icon}</div>
            <div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:13,color:C.textMuted,lineHeight:1.55,marginBottom:c.badge?8:0}}>{c.desc}</div>
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
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22,lineHeight:1.6}}>Master every LSAT question type from first principles. Each lesson starts simple and builds to full test difficulty — guided by AI throughout.</p>

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
  const [phase,setPhase]=useState("intro"); // intro | lesson | practice | complete
  const [levelIdx,setLevelIdx]=useState(0);
  const [question,setQuestion]=useState(null);
  const [loadingQ,setLoadingQ]=useState(false);
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [feedback,setFeedback]=useState(null);
  const [loadingFeedback,setLoadingFeedback]=useState(false);
  const [error,setError]=useState(null);
  const [xpGained,setXpGained]=useState(0);
  const learnProgress=user.learnProgress||{};
  const currentLevel=typeObj.levels[levelIdx];

  const genQuestion=async()=>{
    setLoadingQ(true);setError(null);setSelected(null);setSubmitted(false);setFeedback(null);
    const level=levelIdx+1;
    const sys=`You are an expert LSAT tutor creating a Level ${level} ${typeObj.type} question for a student who is LEARNING this question type for the first time. Level 1 means extremely simple, everyday language — NOT legal jargon. Level 4 means full official LSAT difficulty.

For Level 1: Use simple everyday scenarios (coffee shops, weather, pets, sports). Short sentences. The correct answer should be very clear once you understand the question type.
For Level 2: Slightly more complex scenarios but still accessible. Two-step reasoning.
For Level 3: LSAT-style complexity. Legal or academic content acceptable.
For Level 4: Full official LSAT difficulty and style.

The student is learning ${typeObj.type} questions. Your question must be a perfect example of this type.

Respond ONLY with valid JSON (no markdown):
{"stimulus":"...","question":"...","choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct":"B","explanation":"CORRECT (B): [clear, simple explanation]. (A): [why wrong]. (C): [why wrong]. (D): [why wrong]. (E): [why wrong].","teaching_point":"One key insight about ${typeObj.type} questions this question illustrates.","level":${level}}`;
    try{
      const raw=await callClaude(sys,`Generate a Level ${level} ${typeObj.type} question for a student learning this type. Section: ${section}. Keep it appropriate for this difficulty level.`);
      setQuestion(parseJSON(raw));
    }catch(e){setError("Could not generate question: "+(e.message||"Please try again."));}
    setLoadingQ(false);
  };

  const submitAnswer=async()=>{
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
      // Completed all levels
      const newProgress={...(user.learnProgress||{}),[typeObj.type]:4};
      onUpdateUser({learnProgress:newProgress});
      setPhase("complete");
    }else{
      const newProgress={...(user.learnProgress||{}),[typeObj.type]:newLevel};
      onUpdateUser({learnProgress:newProgress});
      setLevelIdx(newLevel);
      setQuestion(null);setSelected(null);setSubmitted(false);setFeedback(null);setXpGained(0);
      setPhase("practice");
    }
  };

  const cs=(l)=>{if(!submitted)return selected===l?"sel":"def";if(l===question?.correct)return"ok";if(l===selected)return"bad";return"def";};
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:12,padding:"12px 18px",cursor:submitted?"default":"pointer",fontSize:14,marginBottom:10,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,boxSizing:"border-box",outline:"none",...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}:s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}:s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}:{background:"transparent",borderColor:C.border,color:C.textSub})});

  return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"24px 20px"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:13,fontFamily:T.sans,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Back to Learn</button>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
          <Tag color={C.purple}>{section}</Tag>
          <Tag color={C.accent}>{typeObj.type}</Tag>
          {phase==="practice"&&<Tag color={LEVEL_COLORS[levelIdx+1]}>Level {levelIdx+1} — {LEVEL_LABELS[levelIdx+1]}</Tag>}
        </div>
        {/* Progress bar through 4 levels */}
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {typeObj.levels.map((l,i)=>(
            <div key={i} style={{flex:1,height:5,borderRadius:3,background:i<levelIdx?C.success:i===levelIdx?C.accent:C.surfaceHigh,transition:"background 0.3s"}}/>
          ))}
        </div>
      </div>

      {/* INTRO PHASE */}
      {phase==="intro"&&(
        <div>
          <Card style={{marginBottom:14,borderColor:C.accent+"44",background:`linear-gradient(135deg,${C.accentSoft},${C.surface})`}}>
            <div style={{fontSize:13,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Why This Matters</div>
            <h2 style={{fontFamily:T.serif,fontSize:22,color:C.text,marginBottom:10,fontWeight:700}}>{typeObj.type}</h2>
            <p style={{fontSize:16,color:C.textSub,fontStyle:"italic",marginBottom:16,lineHeight:1.6}}>{typeObj.tagline}</p>
            <p style={{fontSize:14,color:C.textSub,lineHeight:1.8}}>{typeObj.why}</p>
          </Card>

          <Card style={{marginBottom:14}}>
            <div style={{fontSize:13,color:C.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Core Concept</div>
            <p style={{fontSize:14,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap",marginBottom:16}}>{typeObj.concept}</p>
            <div style={{fontSize:13,color:C.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Your Framework</div>
            {typeObj.framework.map((f,i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:C.accentSoft,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:14,color:C.textSub,lineHeight:1.65}}>{f}</div>
              </div>
            ))}
          </Card>

          <Card style={{marginBottom:18,background:C.goldSoft,borderColor:C.gold+"44"}}>
            <div style={{fontSize:13,color:C.gold,fontWeight:700,marginBottom:8}}>📚 How This Lesson Works</div>
            <p style={{fontSize:14,color:C.textSub,lineHeight:1.7}}>You'll practice {typeObj.type} questions across 4 levels — from simple everyday examples to full LSAT difficulty. Answer each question, get instant AI feedback, and earn XP as you go. Take your time with Level 1 — the goal is to truly understand the concept before things get harder.</p>
          </Card>

          <Btn onClick={()=>{setPhase("practice");genQuestion();}} style={{width:"100%",padding:15}}>
            Start Level 1 — {LEVEL_LABELS[1]} →
          </Btn>
        </div>
      )}

      {/* PRACTICE PHASE */}
      {phase==="practice"&&(
        <div>
          {loadingQ&&<Spinner label="Generating your question…"/>}
          <ErrBanner message={error} onDismiss={()=>setError(null)}/>
          {!loadingQ&&!question&&!error&&<div style={{textAlign:"center",padding:"32px 0"}}><Btn onClick={genQuestion}>Generate Question</Btn></div>}

          {question&&!loadingQ&&(
            <div>
              <Card style={{marginBottom:12}}>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>Read carefully and apply your framework:</div>
                <p style={{lineHeight:1.85,fontSize:15,color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{question.stimulus}</p>
                <p style={{fontWeight:600,fontSize:15,color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>{question.question}</p>
                <div role="radiogroup" aria-label="Answer choices">
                  {Object.entries(question.choices).map(([l,t])=>(
                    <button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}>
                      <span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}
                    </button>
                  ))}
                </div>
                {!submitted&&<Btn onClick={submitAnswer} disabled={!selected} style={{width:"100%",marginTop:8}}>Submit Answer</Btn>}
              </Card>

              {submitted&&(
                <div>
                  {xpGained>0&&<div role="status" style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"10px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                    <span>⭐</span><span style={{color:C.gold,fontWeight:700}}>+{xpGained} XP earned!</span>
                  </div>}

                  <Card style={{borderColor:selected===question.correct?C.success:C.danger,marginBottom:12}}>
                    <div style={{fontSize:16,fontWeight:700,color:selected===question.correct?C.success:C.danger,marginBottom:10}}>
                      {selected===question.correct?"✓ Correct! Well done.":"✗ Not quite — let's understand why."}
                    </div>
                    {question.teaching_point&&<div style={{background:C.accentSoft,border:`1px solid ${C.accent}33`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:14,color:C.accent}}>
                      💡 Key insight: {question.teaching_point}
                    </div>}
                    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,fontSize:14,color:C.textSub,lineHeight:1.85,whiteSpace:"pre-wrap"}}>
                      {question.explanation}
                    </div>
                  </Card>

                  {selected!==question.correct&&(
                    <Card style={{marginBottom:12,borderColor:C.purple+"44",background:C.surfaceHigh}}>
                      <div style={{fontSize:13,color:C.purple,fontWeight:700,marginBottom:8}}>🤔 Don't worry — this is how you learn.</div>
                      <p style={{fontSize:14,color:C.textSub,lineHeight:1.7}}>Re-read the framework, look at the explanation above, and try again on the next question. {typeObj.type} questions become intuitive with practice.</p>
                    </Card>
                  )}

                  <div style={{display:"flex",gap:10}}>
                    <Btn ghost onClick={genQuestion} style={{flex:1}}>Try Another →</Btn>
                    {levelIdx<typeObj.levels.length-1
                      ?<Btn onClick={nextLevel} style={{flex:1}}>Next Level: {LEVEL_LABELS[levelIdx+2]} →</Btn>
                      :<Btn onClick={nextLevel} style={{flex:1,background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Complete Lesson ✓</Btn>
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* COMPLETE PHASE */}
      {phase==="complete"&&(
        <Card style={{textAlign:"center",padding:"48px 32px",borderColor:C.success+"44"}}>
          <div style={{fontSize:56,marginBottom:16}}>🎓</div>
          <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:10}}>Lesson Complete!</h2>
          <p style={{color:C.textSub,fontSize:15,lineHeight:1.7,marginBottom:8}}>You've mastered all 4 levels of <strong style={{color:C.text}}>{typeObj.type}</strong> questions.</p>
          <p style={{color:C.textMuted,fontSize:13,lineHeight:1.7,marginBottom:28}}>Keep practicing in the Practice section to reinforce this skill. The more you see it, the more automatic it becomes.</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={onBack}>← Back to Learn</Btn>
            <Btn ghost onClick={()=>{setPhase("practice");setLevelIdx(0);genQuestion();}}>Practice More</Btn>
          </div>
        </Card>
      )}
    </main>
  );
}

// ─── QUEUE HOOK (with streaming delivery) ─────────────────────────────────────
function useQueue(user,section,level,qType,adaptive){
  const history=user.history||[];
  const [queue,setQueue]=useState([]);
  const [current,setCurrent]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const generating=useRef(false);

  const getParams=useCallback(()=>{
    const sec=section||SECTIONS[Math.floor(Math.random()*SECTIONS.length)];
    let lv=level||2;
    if(adaptive&&history.length>=3){const recent=history.filter(h=>h.section===sec).slice(-8);if(recent.length>=3){const acc=recent.filter(h=>h.correct).length/recent.length;if(acc>0.8)lv=Math.min(4,lv+1);else if(acc<0.45)lv=Math.max(1,lv-1);}}
    let qt=qType||QUESTION_TYPES[sec][0];
    if(adaptive&&history.length>=4){const scored=QUESTION_TYPES[sec].map(t=>{const items=history.filter(h=>h.section===sec&&h.qType===t);return{t,s:items.length<2?0.6:items.filter(h=>h.correct).length/items.length};}).sort((a,b)=>a.s-b.s);qt=scored[0].t;}
    return{sec,lv,qt};
  },[section,level,qType,adaptive,history]);

  const genOne=useCallback(async()=>{
    if(generating.current)return null;
    generating.current=true;
    const{sec,lv,qt}=getParams();
    try{
      const raw=await callClaude(PRACTICE_SYSTEM,buildQ(sec,lv,qt,user.diagnostic));
      generating.current=false;
      return{...parseJSON(raw),section:sec,qType:qt,assignedLevel:lv};
    }catch(e){generating.current=false;throw e;}
  },[getParams,user]);

  const fill=useCallback(async()=>{
    if(queue.length>=2||generating.current)return;
    try{const q=await genOne();if(q)setQueue(prev=>[...prev,q]);}catch{}
  },[queue.length,genOne]);

  const start=useCallback(async()=>{
    setLoading(true);setError(null);setCurrent(null);setQueue([]);
    try{const q=await genOne();setCurrent(q);setLoading(false);setTimeout(fill,300);}
    catch(e){setError(e.message||"Failed to generate. Check your API key.");setLoading(false);}
  },[genOne,fill]);

  const advance=useCallback(async()=>{
    if(queue.length>0){
      setCurrent(queue[0]);setQueue(prev=>prev.slice(1));
      setTimeout(fill,200);
    }else{
      setLoading(true);
      try{const q=await genOne();setCurrent(q);setLoading(false);setTimeout(fill,300);}
      catch(e){setError(e.message||"Failed to generate.");setLoading(false);}
    }
  },[queue,genOne,fill]);

  useEffect(()=>{if(current&&queue.length<2&&!generating.current)fill();},[current,queue.length,fill]);
  return{current,loading,error,start,advance};
}

// ─── PRACTICE ─────────────────────────────────────────────────────────────────
function Practice({user,onUpdateUser}){
  const [section,setSection]=useState(null);
  const [level,setLevel]=useState(null);
  const [qType,setQType]=useState(null);
  const [adaptive,setAdaptive]=useState(true);
  const [configured,setConfigured]=useState(false);
  const [selected,setSelected]=useState(null);
  const [submitted,setSubmitted]=useState(false);
  const [sparring,setSparring]=useState(false);
  const [sparMsgs,setSparMsgs]=useState([]);
  const [sparInput,setSparInput]=useState("");
  const [sparLoading,setSparLoading]=useState(false);
  const [note,setNote]=useState("");
  const [noteOpen,setNoteOpen]=useState(false);
  const [xpEarned,setXpEarned]=useState(null);
  const [sessionCount,setSessionCount]=useState(0);
  const [sessionCorrect,setSessionCorrect]=useState(0);
  const bottomRef=useRef(null);
  const {current:q,loading,error,start,advance}=useQueue(user,section,level,qType,adaptive);

  const submit=()=>{
    if(!selected||!q)return;
    setSubmitted(true);
    const correct=selected===q.correct;
    const xp=correct?XP_PER_CORRECT[q.assignedLevel||2]:0;
    setXpEarned(xp);
    setSessionCount(c=>c+1);
    if(correct)setSessionCorrect(c=>c+1);
    onUpdateUser({
      history:[...(user.history||[]),{section:q.section,qType:q.qType,level:q.assignedLevel,correct,xp,timestamp:Date.now()}],
      stats:{...user.stats,xp:(user.stats?.xp||0)+xp},
    });
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),150);
  };

  const nextQ=()=>{setSelected(null);setSubmitted(false);setSparring(false);setSparMsgs([]);setXpEarned(null);setNote("");setNoteOpen(false);advance();};

  const startSpar=()=>{setSparring(true);setSparMsgs([{role:"assistant",text:`You chose ${selected} but the correct answer is ${q.correct}. Make your case — why do you think ${selected} is right?`}]);};

  const sendSpar=async()=>{
    if(!sparInput.trim()||sparLoading)return;
    const msg=sparInput.trim();setSparInput("");
    const msgs=[...sparMsgs,{role:"user",text:msg}];
    setSparMsgs(msgs);setSparLoading(true);
    try{
      const sys=`You are a Socratic LSAT tutor in Argument Sparring. Student answered incorrectly and is defending their answer.
Stimulus: ${q.stimulus}
Question: ${q.question}
Correct: ${q.correct} | Student chose: ${selected}
Explanation: ${q.explanation}
Rules: Take their argument seriously. Identify the specific logical flaw. Ask ONE pointed Socratic question. Under 100 words. If they've understood, confirm warmly.`;
      const raw=await callClaude(sys,msgs.map(m=>`${m.role==="user"?"Student":"Tutor"}: ${m.text}`).join("\n"),300);
      setSparMsgs([...msgs,{role:"assistant",text:raw}]);
    }catch{setSparMsgs([...msgs,{role:"assistant",text:"Something went wrong. Try rephrasing."}]);}
    setSparLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };

  const saveNote=()=>{
    if(!note.trim())return;
    onUpdateUser({notes:[...(user.notes||[]),{id:Date.now(),text:note.trim(),source:`${q?.section||""} · ${q?.qType||""}`,timestamp:Date.now()}]});
    setNote("");setNoteOpen(false);
  };

  const cs=(l)=>{if(!submitted)return selected===l?"sel":"def";if(l===q?.correct)return"ok";if(l===selected)return"bad";return"def";};
  const cStyle=(s)=>({display:"block",width:"100%",textAlign:"left",border:"1.5px solid",borderRadius:12,padding:"12px 18px",cursor:submitted?"default":"pointer",fontSize:14,marginBottom:10,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.6,boxSizing:"border-box",outline:"none",...(s==="ok"?{background:"#052e16",borderColor:C.success,color:"#86efac"}:s==="bad"?{background:"#2d0a0a",borderColor:C.danger,color:"#fca5a5"}:s==="sel"?{background:C.accentSoft,borderColor:C.accent,color:C.text}:{background:"transparent",borderColor:C.border,color:C.textSub})});

  if(!configured)return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Practice</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22}}>AI-generated questions, every session. The next question loads in the background while you read this one.</p>
      <Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Section</div><div style={{display:"flex",flexWrap:"wrap",gap:9}}>{SECTIONS.map(s=><Pill key={s} active={section===s} onClick={()=>{setSection(s);setQType(null);}}>{s}</Pill>)}</div></Card>
      <Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Difficulty</div><div style={{display:"flex",gap:9,flexWrap:"wrap"}}>{[1,2,3,4].map(l=><Pill key={l} active={level===l} onClick={()=>setLevel(l)} color={LEVEL_COLORS[l]}>Level {l} — {LEVEL_LABELS[l]}</Pill>)}</div></Card>
      {section&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Question Type</div><div style={{display:"flex",flexWrap:"wrap",gap:9}}>{QUESTION_TYPES[section].map(t=><Pill key={t} active={qType===t} onClick={()=>setQType(t)}>{t}</Pill>)}</div></Card>}
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setAdaptive(v=>!v)} role="checkbox" aria-checked={adaptive} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setAdaptive(v=>!v);}}>
          <div style={{width:40,height:22,borderRadius:11,background:adaptive?C.accent:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:adaptive?21:3,transition:"left 0.2s"}}/></div>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>Adaptive Mode</div><div style={{fontSize:12,color:C.textMuted}}>Targets weak areas, auto-adjusts difficulty</div></div>
        </div>
      </Card>
      <Btn onClick={()=>{setConfigured(true);start();}} style={{width:"100%",padding:15}}>Start Practice →</Btn>
    </main>
  );

  return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"22px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:8}}>
        <div>{q&&<><Tag color={C.accent}>{q.section}</Tag><Tag color={LEVEL_COLORS[q.assignedLevel]}>Level {q.assignedLevel}</Tag></>}{adaptive&&<Tag color={C.purple}>Adaptive</Tag>}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:C.textMuted,fontSize:13}}>{sessionCount} done · {sessionCount>0?Math.round(sessionCorrect/sessionCount*100):"—"}%</span><Btn ghost onClick={()=>setConfigured(false)} small>Settings</Btn></div>
      </div>
      {loading&&<Spinner label="Generating question…"/>}
      {error&&!loading&&<Card style={{borderColor:C.danger}}><ErrBanner message={error}/><Btn onClick={start} style={{marginTop:8}}>Retry</Btn></Card>}
      {q&&!loading&&(
        <div>
          <Card style={{marginBottom:12}}>
            <p style={{lineHeight:1.85,fontSize:15,color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{q.stimulus}</p>
            <p style={{fontWeight:600,fontSize:15,color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>{q.question}</p>
            <div role="radiogroup">{Object.entries(q.choices).map(([l,t])=><button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}><span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}</button>)}</div>
            {!submitted&&<Btn onClick={submit} disabled={!selected} style={{width:"100%",marginTop:8}}>Submit Answer</Btn>}
          </Card>
          {submitted&&(
            <div ref={bottomRef}>
              {xpEarned>0&&<div role="status" style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"10px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:10}}><span>⭐</span><span style={{color:C.gold,fontWeight:700}}>+{xpEarned} XP!</span></div>}
              <Card style={{borderColor:selected===q.correct?C.success:C.danger,marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:700,color:selected===q.correct?C.success:C.danger,marginBottom:6}}>{selected===q.correct?"✓ Correct!":`✗ Incorrect — Answer: ${q.correct}`}</div>
                {q.key_concept&&<div style={{fontSize:13,color:C.purple,marginBottom:10}}>🔑 {q.key_concept}</div>}
                <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,fontSize:14,color:C.textSub,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{q.explanation}</div>
              </Card>
              {!sparring&&selected!==q.correct&&<Card style={{marginBottom:12,borderColor:C.purple+"44"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:24}}>🥊</span><div style={{flex:1}}><div style={{fontWeight:700,color:C.text,marginBottom:3}}>Think you're right? Argue your case.</div><div style={{fontSize:13,color:C.textMuted}}>Debate Lumora LSAT in Socratic dialogue.</div></div><Btn onClick={startSpar} small style={{background:"linear-gradient(135deg,#7c3aed,#a78bfa)",flexShrink:0}}>Spar →</Btn></div>
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
              <Btn onClick={nextQ} style={{width:"100%"}}>Next Question →</Btn>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

// ─── FLAW LAB (AI-generated fresh arguments) ──────────────────────────────────
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
      <p style={{color:C.textMuted,fontSize:14,marginBottom:16,lineHeight:1.7}}>Each session, AI generates a fresh, unique flawed legal argument — you'll never see the same argument twice. Identify the flaw, explain the reasoning error, and argue against it.</p>
      <Card style={{marginBottom:14,background:C.accentSoft,borderColor:C.accent+"44"}}>
        <strong style={{color:C.text,display:"block",marginBottom:8,fontSize:13}}>How It Works</strong>
        {["Choose a flaw type — AI generates a unique argument in that style","Read the argument carefully — flaws may be subtle","Identify the specific logical flaw(s) by name","Explain precisely why the reasoning fails","Construct your counter-argument with sound logic","AI scores flaw identification, argumentation, precision, and writing"].map((s,i)=><div key={i} style={{display:"flex",gap:10,fontSize:13,marginBottom:5}}><span style={{color:C.accent,fontWeight:700,flexShrink:0}}>{i+1}.</span><span style={{color:C.textSub}}>{s}</span></div>)}
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
      <Btn onClick={async()=>{setPhase("loading");await generateArgument();setPhase("reading");}} style={{width:"100%",padding:15}}>Generate Argument →</Btn>
    </main>
  );

  if(phase==="loading")return(
    <main style={{maxWidth:580,margin:"0 auto",padding:"32px 20px",textAlign:"center"}}>
      <Spinner label="AI is crafting a unique flawed argument…"/>
      <p style={{color:C.textMuted,fontSize:13,marginTop:8}}>This takes about 10 seconds. Each argument is completely unique.</p>
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

// ─── WRITING (AI-generated fresh prompt variations) ────────────────────────────
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
      <p style={{color:C.textMuted,fontSize:14,marginBottom:16}}>Choose a topic theme — AI generates a completely fresh, unique prompt every session. Infinite practice, never the same twice.</p>
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
      <Btn onClick={async()=>{setPhase("generating");await generatePrompt();if(phaseRef.current==="generating")setPhaseSync("prewriting_ready");}} style={{width:"100%",padding:15}}>Generate Fresh Prompt →</Btn>
    </main>
  );

  if(phase==="generating")return(
    <main style={{maxWidth:580,margin:"0 auto",padding:"32px 20px",textAlign:"center"}}>
      <Spinner label="AI is crafting your unique writing prompt…"/>
      <p style={{color:C.textMuted,fontSize:13,marginTop:8}}>About 10 seconds. Each prompt is completely original.</p>
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
    const raw=await callClaude(PRACTICE_SYSTEM,buildQ(sel,lv,qt,user.diagnostic));
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
      <p style={{color:C.textMuted,fontSize:14,marginBottom:24}}>35 minutes · 25 AI-generated questions · Level 1→4 ramp. The first question appears immediately — the rest generate in the background as you work.</p>
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
        {qIdx<questions.length-1?<Btn onClick={()=>goToQ(qIdx+1)} style={{flex:1}}>Next →</Btn>:<Btn onClick={finish} style={{flex:1,background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Submit Section ✓</Btn>}
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
function StudyPlan({user,onUpdateUser}){
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const plan=user.studyPlan;
  const gen=async()=>{
    setLoading(true);setError(null);
    const history=user.history||[];
    const wt=(()=>{const t={};history.forEach(h=>{if(!t[h.qType])t[h.qType]={c:0,total:0};t[h.qType].total++;if(h.correct)t[h.qType].c++;});return Object.entries(t).filter(([,v])=>v.total>1&&v.c/v.total<0.6).map(([k])=>k);})();
    const d=user.diagnostic||{};
    try{
      const raw=await callClaude(`You are an expert LSAT tutor. Respond ONLY with valid JSON — no markdown.`,
        `Create a personalized LSAT study plan. Profile: name=${user.name}, target=${d.target_score||"165+"}, timeline=${d.test_date||"unknown"}, hrs/wk=${d.study_hours||"unknown"}, challenge=${d.biggest_challenge||"unknown"}, style=${d.learning_style||"unknown"}, LR=${d.lr_comfort||"?"}/5, RC=${d.rc_comfort||"?"}/5, Writing=${d.writing_comfort||"?"}/5, weak=${wt.join(",")||"assessing"}, total q=${history.length}, accuracy=${history.length>0?Math.round(history.filter(h=>h.correct).length/history.length*100)+"%":"none"}.

Return ONLY this JSON:
{"summary":"3-4 sentence personalized assessment","target_score":"${d.target_score||"165+"}","timeline":"${d.test_date||"flexible"}","weekly_hours":"${d.study_hours||"flexible"}","phases":[{"name":"...","duration":"X weeks","focus":"...","tasks":["...","...","...","..."]}],"daily_routine":["Morning: ...","Afternoon: ...","Evening: ..."],"priority_areas":["most important","second","third"],"milestone":"Specific measurable halfway success description"}`,1600);
      onUpdateUser({studyPlan:parseJSON(raw)});
    }catch(e){setError("Could not generate: "+(e.message||"Please try again."));}
    setLoading(false);
  };
  return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div><h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:4}}>Study Plan</h1><p style={{color:C.textMuted,fontSize:14}}>Personalized roadmap to {user.diagnostic?.target_score||"your target score"}.</p></div>
        <Btn onClick={gen} small>{plan?"Regenerate":"Generate Plan"}</Btn>
      </div>
      {loading&&<Spinner label="Building your personalized study plan…"/>}
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
function Dashboard({user,onUpdateUser}){
  const history=user.history||[];
  const overall=history.length>0?Math.round(history.filter(h=>h.correct).length/history.length*100):null;
  const sData=SECTIONS.map(s=>{const items=history.filter(h=>h.section===s);return{s,score:items.length>0?Math.round(items.filter(h=>h.correct).length/items.length*100):null,total:items.length};});
  const tStats={};history.forEach(h=>{if(!tStats[h.qType])tStats[h.qType]={c:0,t:0};tStats[h.qType].t++;if(h.correct)tStats[h.qType].c++;});
  const sorted=Object.entries(tStats).sort((a,b)=>(a[1].c/a[1].t)-(b[1].c/b[1].t));
  const lvData=[1,2,3,4].map(l=>{const items=history.filter(h=>h.level===l);return{l,t:items.length,c:items.filter(h=>h.correct).length};});
  const sc=p=>p>=70?C.success:p>=50?C.gold:C.danger;

  const predictScore=()=>{
    if(history.length<10)return null;
    const weights={1:0.1,2:0.25,3:0.35,4:0.3};
    const ov=history.filter(h=>h.correct).length/history.length;
    let wa=0;[1,2,3,4].forEach(l=>{const items=history.filter(h=>h.level===l);wa+=(items.length>0?items.filter(h=>h.correct).length/items.length:ov)*weights[l];});
    const base=120+Math.round(wa*60);
    const v=Math.max(3,Math.round(8-history.length/10));
    return{low:Math.max(120,base-v),mid:Math.min(180,base),high:Math.min(180,base+v),confidence:history.length>=40?"High":history.length>=20?"Moderate":"Low",needed:Math.max(0,40-history.length)};
  };
  const pred=predictScore();

  return(
    <main style={{maxWidth:720,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Progress</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22}}>{history.length} total questions answered.</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:14}}>
        <Card style={{textAlign:"center",padding:"16px 10px"}}><Arc pct={overall} size={86} color={overall>=70?C.success:overall>=50?C.gold:C.danger} label={`Overall: ${overall}%`}/><div style={{fontSize:12,color:C.textMuted,marginTop:8}}>Overall</div></Card>
        {sData.map(({s,score,total})=><Card key={s} style={{textAlign:"center",padding:"16px 10px"}}><Arc pct={score} size={72} color={score>=70?C.success:score>=50?C.gold:C.danger} label={`${s}: ${score}%`}/><div style={{fontSize:12,color:C.textMuted,marginTop:8}}>{s.split(" ")[0]}</div><div style={{fontSize:11,color:C.textMuted}}>{total} q's</div></Card>)}
      </div>

      {/* Score Predictor */}
      <Card style={{marginBottom:14,borderColor:C.accent+"44"}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:14,fontWeight:700}}>🎯 AI Score Predictor</div>
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
            <p style={{color:C.textMuted,fontSize:14,lineHeight:1.7,marginBottom:10}}>Answer at least <strong style={{color:C.text}}>10 questions</strong> to unlock your AI score prediction. You've answered {history.length} so far.</p>
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

  useEffect(()=>{
    try{const email=DB.getSession();if(email){const u=DB.getUser(email);if(u){setUser(u);setScreen("home");}}}catch{}
    setReady(true);
  },[]);

  useEffect(()=>{
    if(!user)return;
    const today=new Date().toDateString();
    if(user.stats?.lastDay===today)return;
    const yesterday=new Date(Date.now()-86400000).toDateString();
    const streak=user.stats?.lastDay===yesterday?(user.stats?.streak||0)+1:1;
    const updated={...user,stats:{...user.stats,streak,lastDay:today}};
    setUser(updated);
    try{DB.saveUser(updated.email,updated);}catch{}
  },[user?.email]);

  const handleLogin=(u)=>{setUser(u);setScreen("home");};
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

  if(!ready)return <div style={{background:C.bg,minHeight:"100vh"}}/>;

  // Not logged in
  if(!user){
    if(screen==="auth")return <Auth onLogin={handleLogin}/>;
    return <Landing onGetStarted={()=>setScreen("auth")}/>;
  }

  // Diagnostic
  if(!user.diagnosticDone){
    return <Diagnostic user={user} onComplete={(answers)=>{
      const u={...user,diagnostic:answers,diagnosticDone:true};
      try{DB.saveUser(u.email,u);}catch{}
      setUser(u);setScreen("home");
    }}/>;
  }

  const pages={
    home:<Home user={user} setScreen={setScreen}/>,
    learn:<Learn user={user} onUpdateUser={handleUpdateUser}/>,
    practice:<Practice user={user} onUpdateUser={handleUpdateUser}/>,
    writing:<Writing/>,
    flaw:<FlawLab user={user} onUpdateUser={handleUpdateUser}/>,
    fullsection:<FullSection user={user} onUpdateUser={handleUpdateUser}/>,
    plan:<StudyPlan user={user} onUpdateUser={handleUpdateUser}/>,
    upload:<Upload/>,
    notes:<Notes user={user} onUpdateUser={handleUpdateUser}/>,
    dashboard:<Dashboard user={user} onUpdateUser={handleUpdateUser}/>,
    profile:<Profile user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} setScreen={setScreen}/>,
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:T.sans}}>
      <style>{`
        *{box-sizing:border-box;}
        body{margin:0;}
        *:focus-visible{outline:2px solid ${C.accent}!important;outline-offset:2px!important;}
        button,input,textarea,select{font-family:${T.sans};}
        @media(max-width:640px){
          nav{height:auto!important;flex-wrap:wrap!important;padding:8px 12px!important;}
        }
      `}</style>
      {screen!=="profile"&&<Nav screen={screen} setScreen={setScreen} user={user} onLogout={handleLogout}/>}
      {pages[screen]||pages.home}
    </div>
  );
}
