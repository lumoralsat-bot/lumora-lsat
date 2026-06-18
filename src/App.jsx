import { useState, useEffect, useRef, useCallback } from "react";

const SECTIONS = ["Logical Reasoning", "Reading Comprehension"];
const QUESTION_TYPES = {
  "Logical Reasoning": ["Assumption","Weaken","Strengthen","Flaw","Inference","Main Point","Paradox","Method of Reasoning","Parallel Reasoning","Evaluate"],
  "Reading Comprehension": ["Main Idea","Author's Tone","Detail","Inference","Purpose","Analogy","Comparative Passage"],
};
const LEVEL_LABELS = {1:"Foundations",2:"Developing",3:"Proficient",4:"Expert"};
const LEVEL_COLORS = {1:"#38bdf8",2:"#a78bfa",3:"#fb923c",4:"#f43f5e"};
const DIAGNOSTIC_QUESTIONS = [
  {id:"experience",q:"How long have you been studying for the LSAT?",type:"single",options:["Haven't started yet","Less than 1 month","1–3 months","3–6 months","6+ months"]},
  {id:"target_score",q:"What is your target LSAT score?",type:"single",options:["140–149","150–154","155–159","160–164","165–170","171–180"]},
  {id:"test_date",q:"When are you planning to take the LSAT?",type:"single",options:["Less than 1 month","1–2 months","3–4 months","5–6 months","6+ months","Not sure yet"]},
  {id:"lr_comfort",q:"How comfortable are you with Logical Reasoning? (1=not at all, 5=very)",type:"scale"},
  {id:"rc_comfort",q:"How comfortable are you with Reading Comprehension? (1=not at all, 5=very)",type:"scale"},
  {id:"writing_comfort",q:"How comfortable are you with argumentative writing? (1=not at all, 5=very)",type:"scale"},
  {id:"weak_types",q:"Which question types do you find hardest? (Select all that apply)",type:"multi",options:["Assumption","Flaw","Weaken/Strengthen","Parallel Reasoning","Reading Inference","Main Point","Argumentative Writing","Not sure yet"]},
  {id:"study_hours",q:"How many hours per week can you dedicate to LSAT prep?",type:"single",options:["Less than 5 hrs","5–10 hrs","10–15 hrs","15–20 hrs","20+ hrs"]},
  {id:"biggest_challenge",q:"What's your biggest challenge right now?",type:"single",options:["Time pressure during sections","Understanding question types","Writing coherent arguments","Reading dense passages","Careless mistakes","Staying motivated"]},
  {id:"learning_style",q:"How do you learn best?",type:"single",options:["Step-by-step explanations","Learning from mistakes","Lots of practice questions","Understanding the big picture first","A mix of everything"]},
];
const XP_PER_CORRECT={1:10,2:20,3:35,4:55};
const XP_PER_LEVEL=200;
const SECTION_TIME=35*60;
const SECTION_Q_COUNT=25;

// ── USER STORE ────────────────────────────────────────────────────────────────
const DB = {
  getUsers:()=>{try{return JSON.parse(localStorage.getItem("lumora_users")||"{}")}catch{return{}}},
  saveUsers:(u)=>{try{localStorage.setItem("lumora_users",JSON.stringify(u))}catch{}},
  getSession:()=>{try{return localStorage.getItem("lumora_session")||null}catch{return null}},
  saveSession:(e)=>{try{localStorage.setItem("lumora_session",e)}catch{}},
  clearSession:()=>{try{localStorage.removeItem("lumora_session")}catch{}},
  getUser:(e)=>{const u=DB.getUsers();return u[e]||null},
  saveUser:(e,d)=>{const u=DB.getUsers();u[e]=d;DB.saveUsers(u)},
};

// ── API ───────────────────────────────────────────────────────────────────────
let API_KEY = "";
try { API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ""; } catch { API_KEY = ""; }

async function callClaude(system, userMsg, maxTokens=1200) {
  if (!API_KEY) throw new Error("No API key configured. Add VITE_ANTHROPIC_API_KEY to Vercel environment variables.");
  const res = await fetch("https://api.anthropic.com/v1/messages",{
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
  const clean=raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
  return JSON.parse(clean);
}

// ── DESIGN ───────────────────────────────────────────────────────────────────
const C={bg:"#07090f",surface:"#0e1420",surfaceHigh:"#151d2e",border:"#1a2540",text:"#e8edf5",textMuted:"#5a6a88",textSub:"#8899bb",accent:"#4f7fff",accentSoft:"#1a2d5e",gold:"#f5c842",goldSoft:"#2a2108",success:"#34d399",danger:"#f87171",purple:"#a78bfa"};
const T={serif:"'Georgia','Times New Roman',serif",sans:"'Inter',system-ui,-apple-system,sans-serif"};

// ── UI ATOMS ─────────────────────────────────────────────────────────────────
function Tag({children,color=C.accent}){return <span style={{display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 10px",borderRadius:20,background:color+"1a",color,border:`1px solid ${color}33`,marginRight:5,marginBottom:4}}>{children}</span>;}

function Pill({children,active,onClick,color=C.accent}){
  return <button onClick={onClick} aria-pressed={active} style={{background:active?color+"18":"transparent",border:`1.5px solid ${active?color:C.border}`,borderRadius:10,padding:"10px 16px",cursor:"pointer",color:active?color:C.textMuted,fontSize:14,textAlign:"left",transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.4,fontWeight:active?600:400,outline:"none"}}>{children}</button>;
}

function Btn({children,onClick,disabled,ghost,danger:isDanger,style={},small,type="button",ariaLabel}){
  if(ghost)return <button type={type} onClick={onClick} aria-label={ariaLabel} style={{background:"transparent",border:`1px solid ${isDanger?C.danger+"66":C.border}`,borderRadius:10,color:isDanger?C.danger:C.textSub,fontSize:small?12:13,padding:small?"6px 12px":"8px 16px",cursor:"pointer",fontFamily:T.sans,outline:"none",...style}}>{children}</button>;
  return <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} style={{background:disabled?C.surfaceHigh:"linear-gradient(135deg,#3a6bff,#6a9fff)",color:disabled?C.textMuted:"#fff",border:"none",borderRadius:12,padding:small?"9px 20px":"14px 28px",fontSize:small?13:15,fontWeight:600,cursor:disabled?"not-allowed":"pointer",fontFamily:T.sans,opacity:disabled?0.5:1,boxShadow:disabled?"none":"0 0 20px #3a6bff44",transition:"opacity 0.15s",outline:"none",...style}}>{children}</button>;
}

function Card({children,style={},onClick,role,ariaLabel}){
  return <div onClick={onClick} role={role} aria-label={ariaLabel} tabIndex={onClick?0:undefined} onKeyDown={onClick?(e)=>{if(e.key==="Enter"||e.key===" ")onClick();}:undefined} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:24,cursor:onClick?"pointer":"default",transition:onClick?"border-color 0.15s":"none",outline:"none",...style}}>{children}</div>;
}

function Finput({label,type="text",value,onChange,placeholder,id,autoFocus,required}){
  return (
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
  return <div style={{display:"flex",alignItems:"center",gap:10}} role="progressbar" aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${level}`}><span style={{fontSize:12,fontWeight:700,color:C.gold,whiteSpace:"nowrap"}}>Lv {level}</span><div style={{flex:1,background:C.surfaceHigh,borderRadius:4,height:6,overflow:"hidden"}}><div style={{height:"100%",width:`${p*100}%`,background:`linear-gradient(90deg,${C.gold},#ffad42)`,borderRadius:4,transition:"width 0.5s"}}/></div><span style={{fontSize:11,color:C.textMuted,whiteSpace:"nowrap"}}>{xp%XP_PER_LEVEL}/{XP_PER_LEVEL} XP</span></div>;
}

function Spinner({label="Lumora LSAT is thinking…"}){
  return <div role="status" aria-live="polite" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18,padding:"44px 0"}}><div style={{position:"relative",width:50,height:50}} aria-hidden="true"><div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${C.border}`}}/><div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${C.accent}`,borderTopColor:"transparent",animation:"spin 0.9s linear infinite"}}/></div><span style={{color:C.textMuted,fontSize:14}}>{label}</span><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

function Arc({pct,size=100,color=C.accent,label=""}){
  const r=size/2-9;const circ=2*Math.PI*r;
  return <svg width={size} height={size} role="img" aria-label={label||`${pct}%`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surfaceHigh} strokeWidth={8}/>{pct!==null&&<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 0.7s ease"}}/>}<text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill={C.text} fontSize={size*0.2} fontWeight="700" fontFamily={T.sans}>{pct!==null?pct+"%":"—"}</text></svg>;
}

function ErrBanner({message,onDismiss}){
  if(!message)return null;
  return <div role="alert" style={{background:"#2d0a0a",border:`1px solid ${C.danger}44`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"flex-start",gap:10}}><span style={{color:C.danger,fontSize:16,flexShrink:0}}>⚠</span><span style={{color:"#fca5a5",fontSize:14,flex:1,lineHeight:1.6}}>{message}</span>{onDismiss&&<button onClick={onDismiss} aria-label="Dismiss" style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:16,padding:0}}>×</button>}</div>;
}

// ── WRITING PROMPTS ───────────────────────────────────────────────────────────
const WRITING_PROMPTS=[
  {id:1,topic:"AI in Criminal Sentencing",keyQuestion:"To what extent should AI-driven risk assessment tools inform criminal sentencing decisions?",context:"Courts are considering AI tools that analyze defendant data to predict recidivism risk. Proponents argue they increase consistency; critics raise concerns about bias and due process.",perspectives:[{label:"Efficiency",text:"AI reduces sentencing disparities caused by judge bias. Algorithmic consistency ensures similarly situated defendants receive similar sentences."},{label:"Due Process",text:"Defendants have a right to challenge the basis of their sentence. Proprietary algorithm trade secrets make meaningful challenge impossible."},{label:"Structural Bias",text:"AI tools trained on historical data reproduce existing racial and socioeconomic disparities, laundering human bias through algorithmic objectivity."},{label:"Human Dignity",text:"Sentencing requires weighing individual circumstances and capacity for redemption. Reducing a person to a risk score strips away their individuality."}]},
  {id:2,topic:"Mandatory Pro Bono for Attorneys",keyQuestion:"Should bar associations require licensed attorneys to complete minimum pro bono hours as a condition of licensure?",context:"Millions of low-income individuals face civil legal matters without counsel. Mandatory pro bono has been proposed as a solution but raises ethical concerns.",perspectives:[{label:"Access to Justice",text:"Without counsel, low-income litigants consistently lose winnable cases. Mandatory pro bono directly fulfills the profession's commitment to justice for all."},{label:"Professional Autonomy",text:"Compelling unpaid work violates voluntary service principles and transforms service into conscripted labor."},{label:"Systemic Solutions",text:"Adequate public funding for legal aid organizations is the real solution — not asking private attorneys to subsidize the state's obligation."},{label:"Market Distortion",text:"Mandatory pro bono imposes unequal burdens on solo practitioners versus large firms, creating competitive inequity."}]},
  {id:3,topic:"Social Media Liability for User Content",keyQuestion:"Should social media companies be held legally liable for harms caused by user-generated content on their platforms?",context:"Section 230 shields platforms from liability for user content. Critics argue this enables profit from harm without accountability.",perspectives:[{label:"Accountability",text:"Platforms actively curate and amplify content to maximize engagement. Companies whose design choices cause foreseeable harm should bear legal responsibility."},{label:"Free Expression",text:"Liability causes platforms to over-censor lawful speech, chilling democratic discourse and the internet's value as a forum for diverse viewpoints."},{label:"Innovation",text:"Start-ups cannot absorb litigation costs, entrenching incumbents and crushing competition."},{label:"Public Health",text:"Research links social media use to depression and self-harm in adolescents. Platforms possess this data yet continue harmful design practices."}]},
];

// ── FLAW SCENARIOS ────────────────────────────────────────────────────────────
const FLAW_SCENARIOS=[
  {id:1,title:"The Case for Mandatory Drug Testing",context:"A state legislature debates mandatory drug testing for all public assistance recipients.",argument:`Members of the legislature, I urge you to support mandatory drug testing for all public assistance recipients. The evidence is overwhelming and the logic is clear.

Last year, a single county in our state found that 8% of welfare recipients who were tested had traces of illegal substances in their systems. This demonstrates that drug use is rampant among those receiving public funds. If we extrapolate this figure statewide, we are effectively subsidizing drug addiction with taxpayer dollars on a massive scale.

Furthermore, private sector employees are routinely subject to drug testing as a condition of employment. If hardworking taxpayers must submit to such testing to earn the money that funds these programs, it is only fair that recipients must do the same to receive those funds.

We already know that drug addiction leads to unemployment. Since the vast majority of public assistance recipients are unemployed, this demonstrates that drug addiction is likely a primary driver of their need for assistance. Addressing drug use among this population will therefore reduce the need for public assistance over time.

For these reasons, mandatory testing is fiscally responsible, fair, and essential to restoring the integrity of our public assistance system.`},
  {id:2,title:"Closing the Public Library System",context:"A city council debates defunding public library branches in favor of digital alternatives.",argument:`Council members, the evidence clearly supports transitioning to a fully digital model and closing our physical branches.

Library attendance has declined 23% over the past decade as residents increasingly turn to online resources. This trend is unmistakable: people no longer need or want physical libraries. The data shows our most frequent library visitors are those over 65 — a demographic that will naturally decrease in size. Planning our infrastructure around this shrinking user base is poor stewardship.

The city of Millbrook eliminated its library branches five years ago and redirected funds to digital literacy programs. Since then, Millbrook has seen a 15% increase in residents with high-speed internet access. This proves that closing libraries improves digital access for all residents.

The annual cost of maintaining our three library branches is $2.3 million. If we close these branches, we can provide every household with a tablet computer and subsidized internet access, saving $400,000 annually.

Books, periodicals, and research materials are all available online. There is no service that our physical libraries provide that cannot be replicated digitally at lower cost. The logical conclusion is clear.`},
  {id:3,title:"Against Eyewitness Testimony Reform",context:"A state bar association debates recommending reforms to eyewitness identification procedures in criminal trials.",argument:`Distinguished colleagues, I oppose the proposed eyewitness identification reforms. The argument for reform rests on flawed premises.

Proponents cite psychological studies showing eyewitness memory is unreliable. However, these studies were conducted in artificial laboratory settings. The emotional reality of witnessing an actual crime creates heightened awareness that dramatically improves memory retention. Laboratory simulations cannot replicate this, so conclusions about eyewitness reliability from such studies are inapplicable to actual trials.

Moreover, juries are not naive. Twelve ordinary citizens applying common sense can evaluate testimony more reliably than any expert. Jurors hear witnesses testify, observe their demeanor, assess credibility, and weigh testimony against all evidence. Any weakness in eyewitness testimony is thus caught and corrected by the jury system itself.

Finally, I have practiced criminal law for 22 years and have never personally witnessed a wrongful conviction resulting from mistaken eyewitness identification. If such misidentifications were truly a systemic problem, I would have encountered such cases in my extensive practice. The absence of such cases in my experience confirms this is not the widespread crisis that reformers claim.

The current system has served justice well. These reforms are a solution in search of a problem.`},
];

// ── PRACTICE SYSTEM PROMPT ────────────────────────────────────────────────────
const PRACTICE_SYSTEM=`You are an expert LSAT question author with 20+ years of experience writing official LSAT questions. Your questions are indistinguishable from official LSAT content in quality, structure, and reasoning rigor.

CRITICAL REQUIREMENTS:
1. The correct answer MUST be logically airtight. Verify it independently three times before finalizing.
2. Wrong answers must be plausible surface-level distractors but clearly eliminable with careful analysis.
3. The explanation must explain why each answer choice is right or wrong.
4. Match official LSAT format exactly for the given question type.

Respond ONLY with valid JSON — no markdown fences, no text outside the JSON:
{"stimulus":"the passage or scenario","question":"the question stem","choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct":"B","explanation":"CORRECT (B): [detailed reason]. (A): [wrong because]. (C): [wrong because]. (D): [wrong because]. (E): [wrong because].","key_concept":"One sentence naming the specific LSAT skill tested.","level":2}`;

function buildQ(sec,level,qType,profile){
  return `Generate a Level ${level} (1=easiest, 4=hardest) LSAT ${sec} question of type: ${qType}. Student targets ${profile?.target_score||"165+"}. Make it realistic and match real LSAT difficulty for Level ${level}.`;
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav({screen,setScreen,user,onLogout}){
  const pages=[{id:"home",label:"Home"},{id:"practice",label:"Practice"},{id:"writing",label:"Writing"},{id:"flaw",label:"Flaw Lab"},{id:"fullsection",label:"Full Section"},{id:"plan",label:"Study Plan"},{id:"notes",label:"Notes"},{id:"dashboard",label:"Progress"}];
  return(
    <nav role="navigation" aria-label="Main navigation" style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54,position:"sticky",top:0,zIndex:100,gap:8}}>
      <button onClick={()=>setScreen("home")} aria-label="Go to home" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",background:"none",border:"none",padding:0,flexShrink:0}}>
        <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#3a6bff,#6a9fff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff",fontFamily:T.serif}} aria-hidden="true">L</div>
        <span style={{fontFamily:T.serif,fontSize:16,color:C.text,fontWeight:700,letterSpacing:"0.04em"}}><span style={{color:C.accent}}>Lumora</span> LSAT</span>
      </button>
      <div style={{display:"flex",gap:2,alignItems:"center",flexWrap:"wrap"}}>
        {pages.map(p=><button key={p.id} onClick={()=>setScreen(p.id)} aria-current={screen===p.id?"page":undefined} style={{background:screen===p.id?C.accentSoft:"transparent",border:"none",borderRadius:8,padding:"5px 10px",color:screen===p.id?C.accent:C.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.sans,fontWeight:screen===p.id?600:400,transition:"all 0.15s",outline:"none"}}>{p.label}</button>)}
      </div>
      {user&&<div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        {(user.stats?.streak||0)>0&&<div aria-label={`${user.stats.streak} day streak`} style={{display:"flex",alignItems:"center",gap:4,background:"#ff6b0018",border:"1px solid #ff6b0033",borderRadius:20,padding:"3px 10px"}}><span aria-hidden="true">🔥</span><span style={{fontSize:12,fontWeight:700,color:"#ff8c42"}}>{user.stats.streak}</span></div>}
        <button onClick={onLogout} aria-label="Sign out" style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}>{user.name?.[0]?.toUpperCase()||"L"}</button>
      </div>}
    </nav>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function Auth({onLogin}){
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=(e)=>{
    e.preventDefault(); setError(""); setLoading(true);
    const users=DB.getUsers();
    if(mode==="signup"){
      if(!name.trim()||name.trim().length<2){setError("Please enter your full name.");setLoading(false);return;}
      if(!email.includes("@")){setError("Please enter a valid email address.");setLoading(false);return;}
      if(password.length<6){setError("Password must be at least 6 characters.");setLoading(false);return;}
      if(users[email.toLowerCase()]){setError("An account with this email already exists. Please log in.");setLoading(false);return;}
      const newUser={name:name.trim(),email:email.toLowerCase(),password,diagnosticDone:false,diagnostic:{},history:[],notes:[],studyPlan:null,stats:{xp:0,streak:0,lastDay:null}};
      DB.saveUser(email.toLowerCase(),newUser); DB.saveSession(email.toLowerCase()); onLogin(newUser);
    } else {
      const user=users[email.toLowerCase()];
      if(!user){setError("No account found with this email.");setLoading(false);return;}
      if(user.password!==password){setError("Incorrect password.");setLoading(false);return;}
      DB.saveSession(email.toLowerCase()); onLogin(user);
    }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontFamily:T.serif,fontSize:28,color:C.text,fontWeight:700}}><span style={{color:C.accent}}>Lumora</span> LSAT</div>
          <div style={{color:C.textMuted,fontSize:12,marginTop:4,letterSpacing:"0.12em",textTransform:"uppercase"}}>AI-Powered LSAT Mastery</div>
        </div>
        <Card>
          <h1 style={{fontFamily:T.serif,fontSize:22,color:C.text,marginBottom:6,fontWeight:700}}>{mode==="login"?"Welcome back":"Create your account"}</h1>
          <p style={{color:C.textMuted,fontSize:14,marginBottom:22,lineHeight:1.6}}>{mode==="login"?"Sign in to continue your LSAT prep — all your progress is saved.":"Your progress saves automatically every session."}</p>
          <ErrBanner message={error} onDismiss={()=>setError("")}/>
          <form onSubmit={submit} noValidate>
            {mode==="signup"&&<Finput id="name" label="Full Name" value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith" required autoFocus/>}
            <Finput id="email" label="Email Address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@example.com" required autoFocus={mode==="login"}/>
            <Finput id="password" label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"At least 6 characters":"Your password"} required/>
            <Btn type="submit" disabled={loading} style={{width:"100%",marginTop:8}}>{loading?"Please wait…":mode==="login"?"Sign In →":"Create Account →"}</Btn>
          </form>
          <div style={{textAlign:"center",marginTop:18,fontSize:14,color:C.textMuted}}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontWeight:600,fontSize:14,fontFamily:T.sans}}>{mode==="login"?"Sign up free":"Sign in"}</button>
          </div>
        </Card>
        <p style={{textAlign:"center",marginTop:16,fontSize:12,color:C.textMuted,lineHeight:1.6}}>Progress is stored locally in your browser and synced per device.</p>
      </div>
    </div>
  );
}

// ── DIAGNOSTIC ────────────────────────────────────────────────────────────────
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
          <div style={{fontFamily:T.serif,fontSize:24,color:C.text,fontWeight:700}}>Welcome, {user.name.split(" ")[0]}!</div>
          <p style={{color:C.textMuted,fontSize:14,marginTop:6,lineHeight:1.6}}>Let's build your personalized LSAT profile. This takes 2 minutes and happens just once.</p>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12,color:C.textMuted}}><span>Diagnostic Profile</span><span>{progress}%</span></div>
          <div style={{background:C.surfaceHigh,borderRadius:4,height:4}} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${C.accent},${C.purple})`,borderRadius:4,transition:"width 0.4s ease"}}/></div>
        </div>
        <Card>
          <div style={{fontSize:12,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Question {step+1} of {DIAGNOSTIC_QUESTIONS.length}</div>
          <h2 style={{fontSize:17,color:C.text,marginBottom:20,lineHeight:1.45,fontWeight:600}}>{q.q}</h2>
          {q.type==="single"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{q.options.map(opt=><Pill key={opt} active={answers[q.id]===opt} onClick={()=>setAnswers(a=>({...a,[q.id]:opt}))}>{opt}</Pill>)}</div>}
          {q.type==="multi"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{q.options.map(opt=><Pill key={opt} active={(answers[q.id]||[]).includes(opt)} onClick={()=>toggleMulti(q.id,opt)}>{opt}</Pill>)}</div>}
          {q.type==="scale"&&<div><div style={{display:"flex",gap:10,marginBottom:8}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setAnswers(a=>({...a,[q.id]:n}))} aria-label={`${n} of 5`} aria-pressed={answers[q.id]===n} style={{flex:1,aspectRatio:"1",borderRadius:12,border:`2px solid ${answers[q.id]===n?C.accent:C.border}`,background:answers[q.id]===n?C.accentSoft:"transparent",color:answers[q.id]===n?C.accent:C.textMuted,fontSize:18,fontWeight:700,cursor:"pointer",transition:"all 0.15s",outline:"none"}}>{n}</button>)}</div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textMuted}}><span>Not comfortable</span><span>Very comfortable</span></div></div>}
          <div style={{marginTop:22}}><Btn onClick={next} disabled={!canNext()} style={{width:"100%"}}>{step===DIAGNOSTIC_QUESTIONS.length-1?"Finish & Enter Lumora LSAT →":"Continue →"}</Btn></div>
        </Card>
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function Home({user,setScreen}){
  const history=user.history||[];
  const overall=history.length>0?Math.round(history.filter(h=>h.correct).length/history.length*100):null;
  const todayCount=history.filter(h=>new Date(h.timestamp).toDateString()===new Date().toDateString()).length;
  const weakSection=(()=>{const s=SECTIONS.map(sec=>{const items=history.filter(h=>h.section===sec);return{sec,score:items.length<2?1:items.filter(h=>h.correct).length/items.length};}).sort((a,b)=>a.score-b.score);return s[0]?.score<0.75?s[0].sec:null;})();
  const cards=[
    {id:"practice",icon:"🎯",label:"Practice",desc:"AI-generated questions targeting your exact weak spots.",badge:weakSection?{label:"Focus: "+weakSection.split(" ")[0],color:C.danger}:null},
    {id:"writing",icon:"✍️",label:"Argumentative Writing",desc:"2026 LSAC format — 15 min prewriting + 35 min essay with AI feedback.",badge:{label:"2026 Format",color:C.success}},
    {id:"flaw",icon:"⚖️",label:"Flaw Lab",desc:"Identify hidden flaws in AI-generated legal arguments. Get scored on reasoning and writing.",badge:{label:"Unique",color:C.purple}},
    {id:"fullsection",icon:"⏱️",label:"Full Section",desc:"35-minute timed simulation under real test conditions.",badge:{label:"Timed",color:C.gold}},
    {id:"plan",icon:"📋",label:"Study Plan",desc:"Your personalized roadmap to your target score."},
    {id:"upload",icon:"🔍",label:"Ask Lumora LSAT",desc:"Paste any question — explained with full certainty."},
    {id:"notes",icon:"📝",label:"My Notes",desc:"Capture insights and strategies as you study."},
    {id:"dashboard",icon:"📊",label:"Progress & Score Predictor",desc:"Track accuracy, XP, and see your AI-projected LSAT score range.",badge:{label:"AI Predictor",color:C.accent}},
  ];
  return(
    <main style={{maxWidth:760,margin:"0 auto",padding:"32px 20px"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:T.serif,fontSize:"clamp(22px,4vw,34px)",color:C.text,marginBottom:6,lineHeight:1.2}}>Good {new Date().getHours()<12?"morning":new Date().getHours()<18?"afternoon":"evening"}, {user.name.split(" ")[0]}.</h1>
        <p style={{color:C.textMuted,fontSize:14}}>{history.length===0?"Your LSAT journey starts here.":`${todayCount} question${todayCount!==1?"s":""} answered today.`}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
        {[{label:"Questions",value:history.length,color:C.accent},{label:"Accuracy",value:overall!==null?overall+"%":"—",color:overall>=70?C.success:overall>=50?C.gold:C.danger},{label:"Streak",value:(user.stats?.streak||0)+" 🔥",color:"#ff8c42"},{label:"XP",value:user.stats?.xp||0,color:C.gold}].map(s=><Card key={s.label} style={{padding:"14px 16px"}}><div style={{fontSize:20,fontWeight:800,color:s.color,marginBottom:3}}>{s.value}</div><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div></Card>)}
      </div>
      <Card style={{marginBottom:16,padding:"13px 18px"}}><XPBar xp={user.stats?.xp||0} level={Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1}/></Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {cards.map(c=><Card key={c.id} onClick={()=>setScreen(c.id)} role="button" ariaLabel={`Go to ${c.label}`} style={{cursor:"pointer"}}><div style={{fontSize:26,marginBottom:8}} aria-hidden="true">{c.icon}</div><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:4}}>{c.label}</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.55}}>{c.desc}</div>{c.badge&&<div style={{marginTop:8}}><Tag color={c.badge.color}>{c.badge.label}</Tag></div>}</Card>)}
      </div>
    </main>
  );
}

// ── QUEUE HOOK ────────────────────────────────────────────────────────────────
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
    try{const q=await genOne();setCurrent(q);setLoading(false);setTimeout(fill,500);}
    catch(e){setError(e.message||"Failed to generate question. Please check your API key.");setLoading(false);}
  },[genOne,fill]);

  const advance=useCallback(async()=>{
    if(queue.length>0){setCurrent(queue[0]);setQueue(prev=>prev.slice(1));setTimeout(fill,200);}
    else{setLoading(true);try{const q=await genOne();setCurrent(q);setLoading(false);setTimeout(fill,300);}catch(e){setError(e.message||"Failed to generate.");setLoading(false);}}
  },[queue,genOne,fill]);

  useEffect(()=>{if(current&&queue.length<2&&!generating.current)fill();},[current,queue.length,fill]);
  return{current,loading,error,start,advance};
}

// ── PRACTICE ──────────────────────────────────────────────────────────────────
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

  const startSpar=()=>{
    setSparring(true);
    setSparMsgs([{role:"assistant",text:`You chose ${selected} but the correct answer is ${q.correct}. Make your case — why do you think ${selected} is right?`}]);
  };

  const sendSpar=async()=>{
    if(!sparInput.trim()||sparLoading)return;
    const msg=sparInput.trim();setSparInput("");
    const msgs=[...sparMsgs,{role:"user",text:msg}];
    setSparMsgs(msgs);setSparLoading(true);
    try{
      const sys=`You are a Socratic LSAT tutor in an Argument Sparring session. The student answered incorrectly and is defending their answer.
Stimulus: ${q.stimulus}
Question: ${q.question}
Choices: ${JSON.stringify(q.choices)}
Correct: ${q.correct} | Student chose: ${selected}
Explanation: ${q.explanation}
Rules: Take their argument seriously. Identify the specific logical flaw in their reasoning. Ask ONE pointed Socratic follow-up. Never just repeat the explanation. Under 100 words. If they've genuinely understood, confirm it warmly.`;
      const raw=await callClaude(sys,msgs.map(m=>`${m.role==="user"?"Student":"Tutor"}: ${m.text}`).join("\n"),300);
      setSparMsgs([...msgs,{role:"assistant",text:raw}]);
    }catch{setSparMsgs([...msgs,{role:"assistant",text:"Something went wrong. Try rephrasing your argument."}]);}
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
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22}}>Every question is AI-generated fresh — no question bank, no repeats. The next question pre-loads in the background.</p>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Section</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:9}}>{SECTIONS.map(s=><Pill key={s} active={section===s} onClick={()=>{setSection(s);setQType(null);}}>{s}</Pill>)}</div>
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Difficulty Level</div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>{[1,2,3,4].map(l=><Pill key={l} active={level===l} onClick={()=>setLevel(l)} color={LEVEL_COLORS[l]}>Level {l} — {LEVEL_LABELS[l]}</Pill>)}</div>
      </Card>
      {section&&<Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Question Type</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:9}}>{QUESTION_TYPES[section].map(t=><Pill key={t} active={qType===t} onClick={()=>setQType(t)}>{t}</Pill>)}</div>
      </Card>}
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setAdaptive(v=>!v)} role="checkbox" aria-checked={adaptive} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setAdaptive(v=>!v);}}>
          <div style={{width:40,height:22,borderRadius:11,background:adaptive?C.accent:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:adaptive?21:3,transition:"left 0.2s"}}/></div>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>Adaptive Mode</div><div style={{fontSize:12,color:C.textMuted}}>Targets your weakest areas and adjusts difficulty automatically</div></div>
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
      {loading&&<Spinner label="Generating your question…"/>}
      {error&&!loading&&<Card style={{borderColor:C.danger}}><ErrBanner message={error}/><Btn onClick={start} style={{marginTop:8}}>Retry</Btn></Card>}
      {q&&!loading&&(
        <div>
          <Card style={{marginBottom:12}}>
            <p style={{lineHeight:1.85,fontSize:15,color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{q.stimulus}</p>
            <p style={{fontWeight:600,fontSize:15,color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>{q.question}</p>
            <div role="radiogroup" aria-label="Answer choices">
              {Object.entries(q.choices).map(([l,t])=><button key={l} style={cStyle(cs(l))} onClick={()=>!submitted&&setSelected(l)} role="radio" aria-checked={selected===l}><span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}</button>)}
            </div>
            {!submitted&&<Btn onClick={submit} disabled={!selected} style={{width:"100%",marginTop:8}}>Submit Answer</Btn>}
          </Card>
          {submitted&&(
            <div ref={bottomRef}>
              {xpEarned>0&&<div role="status" style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"10px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:10}}><span aria-hidden="true">⭐</span><span style={{color:C.gold,fontWeight:700}}>+{xpEarned} XP earned!</span></div>}
              <Card style={{borderColor:selected===q.correct?C.success:C.danger,marginBottom:12}}>
                <div role="status" style={{fontSize:16,fontWeight:700,color:selected===q.correct?C.success:C.danger,marginBottom:6}}>{selected===q.correct?"✓ Correct!":`✗ Incorrect — Correct answer: ${q.correct}`}</div>
                {q.key_concept&&<div style={{fontSize:13,color:C.purple,marginBottom:10}}>🔑 {q.key_concept}</div>}
                <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,fontSize:14,color:C.textSub,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{q.explanation}</div>
              </Card>
              {!sparring&&selected!==q.correct&&(
                <Card style={{marginBottom:12,borderColor:C.purple+"44"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:24}} aria-hidden="true">🥊</span>
                    <div style={{flex:1}}><div style={{fontWeight:700,color:C.text,marginBottom:3}}>Think you're right? Argue your case.</div><div style={{fontSize:13,color:C.textMuted}}>Debate Lumora LSAT in Socratic dialogue.</div></div>
                    <Btn onClick={startSpar} small style={{background:"linear-gradient(135deg,#7c3aed,#a78bfa)",flexShrink:0}}>Spar →</Btn>
                  </div>
                </Card>
              )}
              {sparring&&(
                <Card style={{marginBottom:12,borderColor:C.purple+"44"}}>
                  <h3 style={{fontWeight:700,color:C.purple,marginBottom:12,fontSize:15}}>🥊 Argument Sparring</h3>
                  <div aria-live="polite" style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12,maxHeight:280,overflowY:"auto"}}>
                    {sparMsgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:12,fontSize:14,lineHeight:1.7,background:m.role==="user"?C.accentSoft:C.surfaceHigh,color:m.role==="user"?C.text:C.textSub}}>{m.text}</div></div>)}
                    {sparLoading&&<div style={{color:C.textMuted,fontSize:13}}>Lumora LSAT is thinking…</div>}
                    <div ref={bottomRef}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input value={sparInput} onChange={e=>setSparInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendSpar()} placeholder="Make your argument…" aria-label="Your argument" style={{flex:1,background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:14,fontFamily:T.sans,outline:"none"}}/>
                    <Btn onClick={sendSpar} disabled={sparLoading||!sparInput.trim()} small>Send</Btn>
                  </div>
                </Card>
              )}
              <Card style={{marginBottom:14}}>
                <button onClick={()=>setNoteOpen(v=>!v)} aria-expanded={noteOpen} style={{background:"none",border:"none",color:C.textMuted,fontSize:13,cursor:"pointer",fontFamily:T.sans,padding:0}}>{noteOpen?"▾":"▸"} Add a study note</button>
                {noteOpen&&<div style={{marginTop:10}}>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What did you learn? Key pattern, strategy, or insight…" rows={3} aria-label="Study note" style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:14,fontFamily:T.sans,resize:"vertical",boxSizing:"border-box",outline:"none"}}/>
                  <Btn ghost onClick={saveNote} small style={{marginTop:8}}>Save Note</Btn>
                </div>}
              </Card>
              <Btn onClick={nextQ} style={{width:"100%"}}>Next Question →</Btn>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

// ── FLAW LAB ──────────────────────────────────────────────────────────────────
function FlawLab({user,onUpdateUser}){
  const [phase,setPhase]=useState("config");
  const [idx,setIdx]=useState(0);
  const [timed,setTimed]=useState(true);
  const [timeLeft,setTimeLeft]=useState(20*60);
  const [response,setResponse]=useState("");
  const [feedback,setFeedback]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const timerRef=useRef(null);
  const scenario=FLAW_SCENARIOS[idx];
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const wordCount=response.trim()?response.trim().split(/\s+/).length:0;
  const scoreColor=p=>p>=80?C.success:p>=60?C.gold:C.danger;

  const startWriting=()=>{
    setPhase("writing");setResponse("");setFeedback(null);setError(null);
    if(timed){
      setTimeLeft(20*60);
      timerRef.current=setInterval(()=>setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);doSubmit();return 0;}
        return t-1;
      }),1000);
    }
  };
  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const doSubmit=async()=>{
    clearInterval(timerRef.current);
    setPhase("feedback");setLoading(true);setError(null);
    const sys=`You are an expert LSAT logical reasoning instructor evaluating a student's ability to identify and rebut logical flaws in legal arguments.

First, independently analyze the argument to identify ALL logical flaws present.
Then evaluate the student's response on four dimensions:
- Flaw Identification (25 pts): Did they correctly name the specific flaw(s)?
- Argumentation (30 pts): Is their counter-argument logically sound?
- Precision (25 pts): Is the identification precise and legally/logically accurate?
- Writing Quality (20 pts): Is the writing clear, organized, and professional?

Respond ONLY with valid JSON (no markdown):
{"flaws_in_argument":["flaw 1","flaw 2"],"student_identified_correctly":true,"overall_score":78,"grade":"B","summary":"2-3 sentence overall assessment","scores":{"flaw_identification":{"score":20,"max":25,"comment":"..."},"argumentation":{"score":24,"max":30,"comment":"..."},"precision":{"score":18,"max":25,"comment":"..."},"writing":{"score":16,"max":20,"comment":"..."}},"strengths":["...","..."],"improvements":["...","..."],"model_response":"A 2-3 sentence example of how an excellent response would open."}`;
    try{
      const raw=await callClaude(sys,`Argument Title: ${scenario.title}\nContext: ${scenario.context}\n\nThe Argument:\n${scenario.argument}\n\nStudent Response:\n${response||"[No response — time expired]"}`,1800);
      setFeedback(parseJSON(raw));
    }catch(e){setError("Could not generate feedback: "+(e.message||"Please try again."));}
    setLoading(false);
  };

  if(phase==="config")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Flaw Lab ⚖️</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:16,lineHeight:1.7}}>Read a flawed legal argument — the kind that might appear in a real courtroom. Identify the logical flaw(s), explain precisely why the reasoning fails, and construct a counter-argument. AI scores your reasoning, logic, and writing.</p>
      <Card style={{marginBottom:14,background:C.accentSoft,borderColor:C.accent+"44"}}>
        <strong style={{color:C.text,display:"block",marginBottom:8,fontSize:13}}>How It Works</strong>
        {["Read the argument carefully — there may be multiple flaws","Identify the specific logical flaw(s) by name","Explain precisely why the reasoning is invalid","Construct your counter-argument with sound logic","AI scores flaw identification, argumentation, precision, and writing"].map((s,i)=><div key={i} style={{display:"flex",gap:10,fontSize:13,marginBottom:5}}><span style={{color:C.accent,fontWeight:700,flexShrink:0}}>{i+1}.</span><span style={{color:C.textSub}}>{s}</span></div>)}
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>Choose a Scenario</div>
        {FLAW_SCENARIOS.map((s,i)=>(
          <div key={s.id} onClick={()=>setIdx(i)} role="radio" aria-checked={idx===i} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")setIdx(i);}}
            style={{padding:"14px 16px",borderRadius:12,border:`1.5px solid ${idx===i?C.accent:C.border}`,background:idx===i?C.accentSoft:"transparent",cursor:"pointer",marginBottom:10,transition:"all 0.15s"}}>
            <div style={{fontWeight:600,fontSize:14,color:idx===i?C.text:C.textSub,marginBottom:4}}>Scenario {s.id}: {s.title}</div>
            <div style={{fontSize:13,color:C.textMuted}}>{s.context}</div>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setTimed(v=>!v)} role="checkbox" aria-checked={timed} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setTimed(v=>!v);}}>
          <div style={{width:40,height:22,borderRadius:11,background:timed?C.accent:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:timed?21:3,transition:"left 0.2s"}}/></div>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>Timed Mode (20 minutes)</div><div style={{fontSize:12,color:C.textMuted}}>Adds real pressure. Auto-submits when time runs out.</div></div>
        </div>
      </Card>
      <Btn onClick={()=>setPhase("reading")} style={{width:"100%",padding:15}}>Read the Argument →</Btn>
    </main>
  );

  if(phase==="reading")return(
    <main style={{maxWidth:760,margin:"0 auto",padding:"20px 20px"}}>
      <div style={{marginBottom:16}}><Tag color={C.purple}>Flaw Lab</Tag><h2 style={{fontFamily:T.serif,fontSize:22,color:C.text,marginTop:10,marginBottom:6}}>{scenario.title}</h2><p style={{color:C.textMuted,fontSize:13}}>{scenario.context}</p></div>
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>The Argument</div>
        <div style={{fontSize:15,color:"#c8d4e8",lineHeight:1.9,whiteSpace:"pre-wrap",fontFamily:T.serif}}>{scenario.argument}</div>
      </Card>
      <div style={{background:C.goldSoft,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.textSub,lineHeight:1.7}}>
        <strong style={{color:C.gold}}>Your task:</strong> Identify the logical flaw(s) in this argument, explain precisely why the reasoning fails, and argue against it. Be specific — there may be more than one flaw.
      </div>
      <Btn onClick={startWriting} style={{width:"100%",padding:15}}>I've Read It — Start Writing →</Btn>
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
            <span style={{color:C.textMuted,fontSize:13}}>{wordCount} words</span>
          </div>
          <Btn onClick={doSubmit} small style={{background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Submit for Feedback ✓</Btn>
        </div>
        <Card style={{marginBottom:12,padding:"14px 18px"}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>{scenario.title}</div>
          <div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",lineHeight:1.6,maxHeight:70,overflow:"hidden"}}>"{scenario.argument.slice(0,200)}…"</div>
        </Card>
        <textarea value={response} onChange={e=>setResponse(e.target.value)} aria-label="Your flaw identification and counter-argument"
          placeholder={"Identify the logical flaw(s) in this argument.\n\nExplain precisely why the reasoning is invalid.\n\nConstruct your counter-argument.\n\nAim for 300–500 words. Precision scores higher than length."}
          style={{width:"100%",minHeight:420,background:C.surface,border:`1.5px solid ${danger?C.danger:C.border}`,borderRadius:14,padding:"20px 22px",color:C.text,fontSize:15,fontFamily:T.sans,resize:"vertical",lineHeight:1.85,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,color:C.textMuted}}>
          <span>{wordCount} words · Aim for 300–500</span>
          {timed&&<span style={{color:danger?C.danger:C.textMuted}}>{danger?"⚠ ":""}{fmt(timeLeft)} remaining</span>}
        </div>
      </main>
    );
  }

  if(phase==="feedback")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:22}}>Flaw Lab Feedback</h2>
      {loading&&<Spinner label="Evaluating your argument…"/>}
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>
      {feedback&&!loading&&(
        <div>
          <Card style={{marginBottom:14,padding:"24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
              <Arc pct={feedback.overall_score} size={110} color={scoreColor(feedback.overall_score)} label={`Score: ${feedback.overall_score}%`}/>
              <div style={{flex:1}}><div style={{fontSize:30,fontWeight:900,color:C.text,fontFamily:T.serif,marginBottom:4}}>{feedback.grade}</div><div style={{fontSize:14,color:C.textSub,lineHeight:1.7}}>{feedback.summary}</div></div>
            </div>
          </Card>
          {feedback.flaws_in_argument?.length>0&&(
            <Card style={{marginBottom:14,borderColor:C.danger+"44"}}>
              <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.danger,marginBottom:12}}>Actual Flaws in the Argument</div>
              {feedback.flaws_in_argument.map((f,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.danger,fontWeight:700,flexShrink:0}}>{i+1}.</span>{f}</div>)}
              <div style={{marginTop:10,padding:"8px 12px",background:(feedback.student_identified_correctly?C.success:C.danger)+"15",borderRadius:8,fontSize:13,color:feedback.student_identified_correctly?C.success:C.danger,fontWeight:600}}>
                {feedback.student_identified_correctly?"✓ You correctly identified the core flaw.":"✗ Your identification missed or mischaracterized the key flaw."}
              </div>
            </Card>
          )}
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:16}}>Score Breakdown</div>
            {feedback.scores&&Object.entries(feedback.scores).map(([key,val])=>{
              const pct=Math.round(val.score/val.max*100);
              const labels={flaw_identification:"Flaw Identification",argumentation:"Argumentation",precision:"Precision & Accuracy",writing:"Writing Quality"};
              return(<div key={key} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}><span style={{color:C.text,fontWeight:600}}>{labels[key]||key}</span><span style={{color:scoreColor(pct),fontWeight:700}}>{val.score}/{val.max}</span></div><div style={{background:C.surfaceHigh,borderRadius:4,height:7,marginBottom:6}}><div style={{height:"100%",width:`${pct}%`,background:scoreColor(pct),borderRadius:4,transition:"width 0.6s"}}/></div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{val.comment}</div></div>);
            })}
          </Card>
          {feedback.strengths?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.success,marginBottom:12}}>What You Did Well</div>{feedback.strengths.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.success}}>✓</span>{s}</div>)}</Card>}
          {feedback.improvements?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.gold,marginBottom:12}}>How to Improve</div>{feedback.improvements.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.gold}}>→</span>{s}</div>)}</Card>}
          {feedback.model_response&&<Card style={{marginBottom:14,borderColor:C.accent+"44"}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:10}}>Model Response — How a Top Answer Opens</div><p style={{color:C.text,fontSize:14,lineHeight:1.85,fontStyle:"italic"}}>{feedback.model_response}</p></Card>}
          <Card style={{marginBottom:18}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Your Submitted Response</div><p style={{color:C.textSub,fontSize:14,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{response||"[No response submitted]"}</p></Card>
          <Btn onClick={()=>{setPhase("config");setFeedback(null);setError(null);}} style={{width:"100%"}}>Try Another Scenario →</Btn>
        </div>
      )}
    </main>
  );
  return null;
}

// ── WRITING ───────────────────────────────────────────────────────────────────
function Writing(){
  const [phase,setPhase]=useState("config");
  const [pIdx,setPIdx]=useState(0);
  const [timed,setTimed]=useState(true);
  const [timeLeft,setTimeLeft]=useState(15*60);
  const [pre,setPre]=useState({position:"",strongest:"",weakest:"",counter:""});
  const [preNotes,setPreNotes]=useState("");
  const [essay,setEssay]=useState("");
  const [feedback,setFeedback]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const timerRef=useRef(null);
  const phaseRef=useRef("config");
  const prompt=WRITING_PROMPTS[pIdx];
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const wc=essay.trim()?essay.trim().split(/\s+/).length:0;
  const sc=p=>p>=80?C.success:p>=60?C.gold:C.danger;
  const setPhaseSync=(p)=>{phaseRef.current=p;setPhase(p);};
  const stopTimer=()=>{clearInterval(timerRef.current);timerRef.current=null;};

  const goEssay=useCallback(()=>{
    stopTimer();setPhaseSync("essay");
    if(timed){
      setTimeLeft(35*60);
      timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){stopTimer();setPhaseSync("submitting");return 0;}return t-1;}),1000);
    }
  },[timed]);

  useEffect(()=>{if(phase==="submitting")doSubmit();},[phase]);
  useEffect(()=>()=>stopTimer(),[]);

  const startPre=()=>{
    stopTimer();setPhaseSync("prewriting");setEssay("");setFeedback(null);setError(null);
    setPre({position:"",strongest:"",weakest:"",counter:""});setPreNotes("");
    if(timed){
      setTimeLeft(15*60);
      timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){stopTimer();goEssay();return 0;}return t-1;}),1000);
    }
  };

  const doSubmit=async()=>{
    stopTimer();setPhaseSync("feedback");setLoading(true);setError(null);
    const sys=`You are an expert LSAT Argumentative Writing evaluator using the 2026 LSAC rubric.
Format: debatable topic + key question + 3-4 perspectives. Students take their OWN position — not pick between two options.
Evaluate: Thesis (20pts), Perspective Engagement (25pts), Argumentation (25pts), Counterargument (20pts), Mechanics (10pts).
Respond ONLY with valid JSON (no markdown):
{"thesis_position":"...","overall_score":82,"grade":"B+","summary":"...","scores":{"thesis":{"score":17,"max":20,"comment":"..."},"perspectives":{"score":20,"max":25,"comment":"..."},"argumentation":{"score":18,"max":25,"comment":"..."},"counterargument":{"score":14,"max":20,"comment":"..."},"mechanics":{"score":8,"max":10,"comment":"..."}},"strengths":["...","..."],"improvements":["...","..."],"perspective_engagement":"...","rewritten_intro":"..."}`;
    try{
      const persp=prompt.perspectives.map((p,i)=>`P${i+1} — ${p.label}: ${p.text}`).join("\n\n");
      const raw=await callClaude(sys,`Topic: ${prompt.topic}\nKey Question: ${prompt.keyQuestion}\nContext: ${prompt.context}\n\nPerspectives:\n${persp}\n\nStudent prewriting position: ${pre.position||"[none]"}\nStudent notes: ${preNotes||"[none]"}\n\nStudent Essay:\n${essay||"[No essay submitted]"}`,1800);
      setFeedback(parseJSON(raw));
    }catch(e){setError("Could not generate feedback: "+(e.message||"Please try again."));setPhaseSync("essay");}
    setLoading(false);
  };

  if(phase==="config")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Argumentative Writing</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:16}}>Practice the 2026 LSAT Argumentative Writing section under real LSAC conditions.</p>
      <Card style={{marginBottom:14,background:C.accentSoft,borderColor:C.accent+"44"}}>
        <strong style={{color:C.text,display:"block",marginBottom:8,fontSize:13}}>2026 LSAC Format</strong>
        <p style={{fontSize:13,color:C.textSub,lineHeight:1.8,margin:0}}>You receive a <strong style={{color:C.text}}>debatable issue</strong>, a <strong style={{color:C.text}}>key question</strong>, and <strong style={{color:C.text}}>3–4 perspectives</strong>. Construct your own argument — no single correct answer.</p>
        <div style={{display:"flex",gap:24,marginTop:12,flexWrap:"wrap"}}>
          {[["15 min","Prewriting",C.gold],["35 min","Essay",C.accent],["50 min","Total",C.text]].map(([t,l,c])=><div key={l} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:c}}>{t}</div><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div></div>)}
        </div>
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>Choose a Prompt</div>
        {WRITING_PROMPTS.map((p,i)=><div key={p.id} onClick={()=>setPIdx(i)} role="radio" aria-checked={pIdx===i} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")setPIdx(i);}} style={{padding:"14px 16px",borderRadius:12,border:`1.5px solid ${pIdx===i?C.accent:C.border}`,background:pIdx===i?C.accentSoft:"transparent",cursor:"pointer",marginBottom:10,transition:"all 0.15s"}}><div style={{fontWeight:600,fontSize:14,color:pIdx===i?C.text:C.textSub,marginBottom:4}}>Prompt {p.id} — {p.topic}</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.5}}>{p.keyQuestion}</div></div>)}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setTimed(v=>!v)} role="checkbox" aria-checked={timed} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setTimed(v=>!v);}}>
          <div style={{width:40,height:22,borderRadius:11,background:timed?C.accent:C.surfaceHigh,position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:3,left:timed?21:3,transition:"left 0.2s"}}/></div>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>Timed Mode (50 min total)</div><div style={{fontSize:12,color:C.textMuted}}>15 min prewriting auto-advances to 35 min essay.</div></div>
        </div>
      </Card>
      <Btn onClick={startPre} style={{width:"100%",padding:15}}>Begin Prewriting Phase →</Btn>
    </main>
  );

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
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:6}}>Topic</div>
          <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:8}}>{prompt.topic}</div>
          <div style={{fontSize:13,color:C.textSub,lineHeight:1.7,marginBottom:14}}>{prompt.context}</div>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:8,fontWeight:700}}>Key Question</div>
          <div style={{fontSize:15,color:C.text,fontStyle:"italic",lineHeight:1.6,marginBottom:14,paddingLeft:12,borderLeft:`3px solid ${C.accent}`}}>{prompt.keyQuestion}</div>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:10}}>Perspectives</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {prompt.perspectives.map((p,i)=><div key={i} style={{background:C.surfaceHigh,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{fontWeight:700,fontSize:12,color:[C.accent,C.purple,C.gold,C.success][i],marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>P{i+1} — {p.label}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.7}}>{p.text}</div></div>)}
          </div>
        </Card>
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>Guided Prewriting</div>
          {[{k:"position",label:"What position will you argue? (One sentence)",ph:"I will argue that…"},{k:"strongest",label:"Which perspective best supports your position?",ph:"Perspective ___ supports me because…"},{k:"weakest",label:"Which perspective most challenges you? How will you respond?",ph:"Perspective ___ challenges me because… However…"},{k:"counter",label:"What is the strongest objection to your argument?",ph:"Someone might argue… but this overlooks…"}].map(q=>(
            <div key={q.k} style={{marginBottom:14}}>
              <label htmlFor={`pre-${q.k}`} style={{fontSize:13,color:C.text,fontWeight:600,display:"block",marginBottom:6}}>{q.label}</label>
              <textarea id={`pre-${q.k}`} value={pre[q.k]} onChange={e=>setPre(a=>({...a,[q.k]:e.target.value}))} placeholder={q.ph} rows={2} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:T.sans,resize:"vertical",boxSizing:"border-box",lineHeight:1.6,outline:"none"}}/>
            </div>
          ))}
          <label htmlFor="pre-notes" style={{fontSize:12,color:C.textMuted,fontWeight:600,display:"block",marginBottom:6}}>Additional notes / outline</label>
          <textarea id="pre-notes" value={preNotes} onChange={e=>setPreNotes(e.target.value)} rows={3} placeholder="Jot notes, outline structure, list key points…" style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:T.sans,resize:"vertical",boxSizing:"border-box",lineHeight:1.6,outline:"none"}}/>
        </Card>
        <p style={{fontSize:13,color:C.textMuted,textAlign:"center"}}>{timed?"You may advance after 5 minutes. Timer auto-advances at 0:00.":"Take as long as needed, then click Begin Essay Phase."}</p>
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
        <Card style={{marginBottom:12,padding:"14px 18px"}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>Key Question</div>
          <div style={{fontSize:14,color:C.text,fontStyle:"italic",lineHeight:1.6,marginBottom:10}}>{prompt.keyQuestion}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{prompt.perspectives.map((p,i)=><div key={i} style={{fontSize:11,fontWeight:600,color:[C.accent,C.purple,C.gold,C.success][i],background:[C.accent,C.purple,C.gold,C.success][i]+"15",border:`1px solid ${[C.accent,C.purple,C.gold,C.success][i]}33`,borderRadius:6,padding:"3px 8px"}}>P{i+1}: {p.label}</div>)}</div>
        </Card>
        {pre.position&&<Card style={{marginBottom:12,padding:"12px 16px",background:C.goldSoft,borderColor:C.gold+"33"}}><div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,fontWeight:700}}>Your prewriting position</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{pre.position}</div></Card>}
        <textarea value={essay} onChange={e=>setEssay(e.target.value)} aria-label="Your essay" placeholder={"Begin your essay here.\n\nState your position clearly, answer the key question directly, engage with the perspectives, and build a well-reasoned argument.\n\nAim for 400–600 words."} style={{width:"100%",minHeight:440,background:C.surface,border:`1.5px solid ${danger?C.danger:C.border}`,borderRadius:14,padding:"20px 22px",color:C.text,fontSize:15,fontFamily:T.sans,resize:"vertical",lineHeight:1.9,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,color:C.textMuted}}><span>{wc} words · Aim for 400–600</span>{timed&&<span style={{color:danger?C.danger:C.textMuted}}>{danger?"⚠ ":""}{fmt(timeLeft)} remaining</span>}</div>
      </main>
    );
  }

  if(phase==="feedback")return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"32px 20px"}}>
      <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:22}}>Writing Feedback</h2>
      {loading&&<Spinner label="Evaluating your essay…"/>}
      <ErrBanner message={error} onDismiss={()=>setError(null)}/>
      {feedback&&!loading&&(
        <div>
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
          {feedback.perspective_engagement&&<Card style={{marginBottom:14,borderColor:C.purple+"44"}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.purple,marginBottom:8}}>Perspective Engagement</div><p style={{color:C.textSub,fontSize:14,lineHeight:1.75}}>{feedback.perspective_engagement}</p></Card>}
          {feedback.strengths?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.success,marginBottom:12}}>What You Did Well</div>{feedback.strengths.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.success}}>✓</span>{s}</div>)}</Card>}
          {feedback.improvements?.length>0&&<Card style={{marginBottom:14}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.gold,marginBottom:12}}>How to Improve</div>{feedback.improvements.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:14,color:C.textSub}}><span style={{color:C.gold}}>→</span>{s}</div>)}</Card>}
          {feedback.rewritten_intro&&<Card style={{marginBottom:14,borderColor:C.accent+"44"}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:10}}>Stronger Opening</div><p style={{color:C.text,fontSize:14,lineHeight:1.85,fontStyle:"italic"}}>{feedback.rewritten_intro}</p></Card>}
          <Card style={{marginBottom:18}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Your Essay</div><p style={{color:C.textSub,fontSize:14,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{essay||"[No essay submitted]"}</p></Card>
          <Btn onClick={()=>{setPhaseSync("config");setFeedback(null);}} style={{width:"100%"}}>Try Another Prompt →</Btn>
        </div>
      )}
    </main>
  );
  return null;
}

// ── FULL SECTION ──────────────────────────────────────────────────────────────
function FullSection({user,onUpdateUser}){
  const [phase,setPhase]=useState("config");
  const [sel,setSel]=useState("Logical Reasoning");
  const [questions,setQuestions]=useState([]);
  const [answers,setAnswers]=useState({});
  const [idx,setIdx]=useState(0);
  const [timeLeft,setTimeLeft]=useState(SECTION_TIME);
  const [genCount,setGenCount]=useState(0);
  const [results,setResults]=useState(null);
  const [genError,setGenError]=useState(null);
  const timerRef=useRef(null);
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const calcResults=(qs,ans,tLeft)=>{
    const byLevel={1:{c:0,t:0},2:{c:0,t:0},3:{c:0,t:0},4:{c:0,t:0}};
    let correct=0;
    qs.forEach(q=>{const l=q.assignedLevel||2;byLevel[l].t++;if(ans[q.qi]===q.correct){correct++;byLevel[l].c++;}});
    const records=qs.map(q=>({section:q.section,qType:q.qType,level:q.assignedLevel,correct:ans[q.qi]===q.correct,xp:ans[q.qi]===q.correct?XP_PER_CORRECT[q.assignedLevel||2]:0,timestamp:Date.now()}));
    const totalXP=records.reduce((s,r)=>s+r.xp,0);
    onUpdateUser({history:[...(user.history||[]),...records],stats:{...user.stats,xp:(user.stats?.xp||0)+totalXP}});
    setResults({correct,total:qs.length,pct:Math.round(correct/qs.length*100),byLevel,timeUsed:SECTION_TIME-tLeft});
  };

  const generateAll=async()=>{
    setPhase("loading");setGenCount(0);setQuestions([]);setAnswers({});setGenError(null);
    const types=QUESTION_TYPES[sel];
    const generated=[];
    for(let i=0;i<SECTION_Q_COUNT;i++){
      const lv=i<6?1:i<13?2:i<20?3:4;
      const qt=types[i%types.length];
      try{
        const raw=await callClaude(PRACTICE_SYSTEM,buildQ(sel,lv,qt,user.diagnostic));
        const parsed=parseJSON(raw);
        generated.push({...parsed,section:sel,qType:qt,assignedLevel:lv,qi:i});
      }catch(e){console.warn(`Q${i+1} failed:`,e.message);}
      setGenCount(i+1);
      setQuestions([...generated]);
    }
    if(generated.length<10){setGenError(`Only ${generated.length} questions generated. Check your API key and try again.`);setPhase("config");return;}
    setPhase("active");setIdx(0);setTimeLeft(SECTION_TIME);
    timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);return 0;}return t-1;}),1000);
  };

  useEffect(()=>{if(timeLeft===0&&phase==="active"){calcResults(questions,answers,0);setPhase("review");}},[timeLeft,phase]);
  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const finish=()=>{clearInterval(timerRef.current);calcResults(questions,answers,timeLeft);setPhase("review");};
  const q=questions[idx];
  const danger=timeLeft<300&&phase==="active";

  if(phase==="config")return(
    <main style={{maxWidth:620,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Full Section</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:24}}>35 minutes · 25 AI-generated questions · Level 1→4 ramp. Real test conditions.</p>
      <ErrBanner message={genError} onDismiss={()=>setGenError(null)}/>
      <Card style={{marginBottom:16}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Choose Section</div><div style={{display:"flex",flexDirection:"column",gap:9}}>{SECTIONS.map(s=><Pill key={s} active={sel===s} onClick={()=>setSel(s)}>{s}</Pill>)}</div></Card>
      <Card style={{marginBottom:18,background:C.accentSoft,borderColor:C.accent+"44"}}><div style={{display:"flex",gap:20,flexWrap:"wrap",fontSize:14,color:C.textSub}}><span>⏱️ <strong style={{color:C.text}}>35 min</strong></span><span>📝 <strong style={{color:C.text}}>25 questions</strong></span><span>📈 <strong style={{color:C.text}}>Levels 1→4</strong></span><span>🤖 <strong style={{color:C.text}}>AI-generated</strong></span></div></Card>
      <Btn onClick={generateAll} style={{width:"100%",padding:15}}>Generate & Start Section →</Btn>
    </main>
  );

  if(phase==="loading")return(
    <main style={{maxWidth:580,margin:"0 auto",padding:"32px 20px",textAlign:"center"}}>
      <h2 style={{fontFamily:T.serif,fontSize:22,color:C.text,marginBottom:22}}>Generating your section…</h2>
      <div style={{position:"relative",width:110,height:110,margin:"0 auto 20px"}}>
        <svg width="110" height="110" role="img" aria-label={`${genCount} of ${SECTION_Q_COUNT} questions generated`}>
          <circle cx="55" cy="55" r="47" fill="none" stroke={C.surfaceHigh} strokeWidth={8}/>
          <circle cx="55" cy="55" r="47" fill="none" stroke={C.accent} strokeWidth={8} strokeDasharray={2*Math.PI*47} strokeDashoffset={2*Math.PI*47*(1-genCount/SECTION_Q_COUNT)} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 0.4s"}}/>
          <text x="50%" y="47%" dominantBaseline="middle" textAnchor="middle" fill={C.text} fontSize="20" fontWeight="700" fontFamily={T.sans}>{genCount}</text>
          <text x="50%" y="63%" dominantBaseline="middle" textAnchor="middle" fill={C.textMuted} fontSize="11" fontFamily={T.sans}>/{SECTION_Q_COUNT}</text>
        </svg>
      </div>
      <p style={{color:C.textMuted,fontSize:14}}>Crafting {SECTION_Q_COUNT} original questions — about 90 seconds.</p>
    </main>
  );

  if(phase==="active"&&q)return(
    <main style={{maxWidth:700,margin:"0 auto",padding:"16px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{fontFamily:T.serif,fontSize:22,color:danger?C.danger:C.text,fontWeight:700,minWidth:60}} aria-live="polite">{fmt(timeLeft)}</div>
        <div style={{flex:1,background:C.surfaceHigh,borderRadius:4,height:6,overflow:"hidden"}} role="progressbar" aria-valuenow={idx} aria-valuemax={questions.length}><div style={{height:"100%",width:`${idx/questions.length*100}%`,background:C.accent,borderRadius:4,transition:"width 0.3s"}}/></div>
        <span style={{color:C.textMuted,fontSize:13}}>{idx+1}/{questions.length}</span>
        <Btn ghost onClick={finish} small>Submit Section</Btn>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}} role="navigation" aria-label="Question navigation">
        {questions.map((_,i)=><button key={i} onClick={()=>setIdx(i)} aria-label={`Question ${i+1}${answers[i]?" (answered)":""}`} aria-current={i===idx?"true":undefined} style={{width:26,height:26,borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:600,outline:"none",borderColor:i===idx?C.accent:answers[i]?C.success+"66":C.border,background:i===idx?C.accentSoft:answers[i]?C.success+"11":"transparent",color:i===idx?C.accent:answers[i]?C.success:C.textMuted}}>{i+1}</button>)}
      </div>
      <Card style={{marginBottom:12}}>
        <div style={{marginBottom:10}}><Tag color={LEVEL_COLORS[q.assignedLevel]}>Level {q.assignedLevel}</Tag><Tag color={C.accent}>{q.qType}</Tag></div>
        <p style={{lineHeight:1.85,fontSize:15,color:"#c8d4e8",marginBottom:18,whiteSpace:"pre-wrap"}}>{q.stimulus}</p>
        <p style={{fontWeight:600,fontSize:15,color:C.text,borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>{q.question}</p>
        <div role="radiogroup" aria-label="Answer choices">
          {Object.entries(q.choices).map(([l,t])=><button key={l} onClick={()=>setAnswers(a=>({...a,[idx]:l}))} role="radio" aria-checked={answers[idx]===l} style={{display:"block",width:"100%",textAlign:"left",border:`1.5px solid ${answers[idx]===l?C.accent:C.border}`,borderRadius:12,padding:"12px 18px",cursor:"pointer",fontSize:14,marginBottom:10,transition:"all 0.15s",fontFamily:T.sans,lineHeight:1.55,boxSizing:"border-box",background:answers[idx]===l?C.accentSoft:"transparent",color:answers[idx]===l?C.text:C.textSub,outline:"none"}}><span style={{fontWeight:700,marginRight:10}}>{l}.</span>{t}</button>)}
        </div>
      </Card>
      <div style={{display:"flex",gap:10}}>
        {idx>0&&<Btn ghost onClick={()=>setIdx(i=>i-1)}>← Prev</Btn>}
        {idx<questions.length-1?<Btn onClick={()=>setIdx(i=>i+1)} style={{flex:1}}>Next →</Btn>:<Btn onClick={finish} style={{flex:1,background:"linear-gradient(135deg,#16a34a,#4ade80)"}}>Submit Section ✓</Btn>}
      </div>
    </main>
  );

  if(phase==="review"&&results)return(
    <main style={{maxWidth:640,margin:"0 auto",padding:"32px 20px"}}>
      <h2 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:22}}>Section Complete</h2>
      <Card style={{marginBottom:14,textAlign:"center",padding:28}}><Arc pct={results.pct} size={120} color={results.pct>=70?C.success:results.pct>=50?C.gold:C.danger} label={`Score: ${results.pct}%`}/><div style={{marginTop:14,fontSize:17,fontWeight:700,color:C.text}}>{results.correct}/{results.total} correct</div><div style={{fontSize:13,color:C.textMuted,marginTop:3}}>Time used: {fmt(results.timeUsed)} of 35:00</div></Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:14}}>By Difficulty Level</div>
        {[1,2,3,4].map(l=>{const d=results.byLevel[l];if(!d.t)return null;const pct=Math.round(d.c/d.t*100);return<div key={l} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}><span style={{color:LEVEL_COLORS[l],fontWeight:600}}>Level {l} — {LEVEL_LABELS[l]}</span><span style={{color:pct>=70?C.success:pct>=50?C.gold:C.danger,fontWeight:600}}>{pct}% ({d.c}/{d.t})</span></div><div style={{background:C.surfaceHigh,borderRadius:4,height:6}}><div style={{height:"100%",width:`${pct}%`,background:LEVEL_COLORS[l],borderRadius:4,transition:"width 0.5s"}}/></div></div>;})}
      </Card>
      <Card style={{marginBottom:18}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Question Review</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{questions.map((q,i)=>{const ok=answers[i]===q.correct;return<div key={i} title={`Q${i+1} · ${q.qType} · You: ${answers[i]||"—"} · Correct: ${q.correct}`} aria-label={`Q${i+1}: ${ok?"correct":"incorrect"}`} style={{width:30,height:30,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:ok?"#052e16":"#2d0a0a",color:ok?C.success:C.danger,border:`1px solid ${ok?C.success+"44":C.danger+"44"}`}}>{i+1}</div>;})}</div></Card>
      <Btn onClick={()=>setPhase("config")} style={{width:"100%"}}>Try Another Section →</Btn>
    </main>
  );
  return <Spinner/>;
}

// ── STUDY PLAN ────────────────────────────────────────────────────────────────
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
      const raw=await callClaude(`You are an expert LSAT tutor. Respond ONLY with valid JSON — no markdown, no text outside the JSON object.`,
        `Create a personalized LSAT study plan. Profile: name=${user.name}, experience=${d.experience||"unknown"}, target=${d.target_score||"165+"}, timeline=${d.test_date||"unknown"}, hrs/wk=${d.study_hours||"unknown"}, challenge=${d.biggest_challenge||"unknown"}, style=${d.learning_style||"unknown"}, LR=${d.lr_comfort||"?"}/5, RC=${d.rc_comfort||"?"}/5, Writing=${d.writing_comfort||"?"}/5, weak types=${wt.join(",")||"assessing"}, total questions=${history.length}, accuracy=${history.length>0?Math.round(history.filter(h=>h.correct).length/history.length*100)+"%":"none yet"}.

Return ONLY this JSON:
{"summary":"3-4 sentence personalized assessment","target_score":"${d.target_score||"165+"}","timeline":"${d.test_date||"flexible"}","weekly_hours":"${d.study_hours||"flexible"}","phases":[{"name":"...","duration":"X weeks","focus":"...","tasks":["...","...","...","..."]}],"daily_routine":["Morning: ...","Afternoon: ...","Evening: ..."],"priority_areas":["most important","second","third"],"milestone":"Specific measurable halfway success description"}`,1600);
      onUpdateUser({studyPlan:parseJSON(raw)});
    }catch(e){setError("Could not generate study plan: "+(e.message||"Please try again."));}
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
      {!plan&&!loading&&<Card style={{textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}} aria-hidden="true">📋</div><h2 style={{color:C.text,fontSize:18,marginBottom:8}}>No study plan yet</h2><p style={{color:C.textMuted,fontSize:14,marginBottom:20,lineHeight:1.7}}>Lumora LSAT builds a structured, phased plan from your diagnostic and progress so far.</p><Btn onClick={gen}>Generate My Plan</Btn></Card>}
      {plan&&!loading&&<div>
        <Card style={{marginBottom:12,background:C.accentSoft,borderColor:C.accent+"44"}}><p style={{color:C.text,fontSize:15,lineHeight:1.8}}>{plan.summary}</p><div style={{display:"flex",gap:20,marginTop:14,flexWrap:"wrap"}}>{[["Target",plan.target_score],["Timeline",plan.timeline],["Weekly Hours",plan.weekly_hours]].map(([l,v])=><div key={l}><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div><div style={{fontWeight:700,color:C.accent}}>{v}</div></div>)}</div></Card>
        {plan.priority_areas?.length>0&&<Card style={{marginBottom:12}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Priority Focus Areas</div>{plan.priority_areas.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:20,height:20,borderRadius:"50%",background:[C.danger,C.gold,C.accent][i%3]+"22",color:[C.danger,C.gold,C.accent][i%3],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><span style={{color:C.text,fontSize:14}}>{a}</span></div>)}</Card>}
        {plan.phases?.map((ph,i)=><Card key={i} style={{marginBottom:10}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontWeight:700,fontSize:15,color:C.text}}>{ph.name}</div><div style={{fontSize:13,color:C.textMuted}}>{ph.duration}</div></div><Tag color={[C.accent,C.purple,C.gold,C.success][i%4]}>Phase {i+1}</Tag></div><p style={{color:C.textSub,fontSize:14,marginBottom:10,lineHeight:1.6}}>{ph.focus}</p>{ph.tasks?.map((t,j)=><div key={j} style={{display:"flex",gap:8,marginBottom:6,fontSize:14,color:C.textSub}}><span style={{color:C.accent}}>→</span>{t}</div>)}</Card>)}
        {plan.daily_routine?.length>0&&<Card style={{marginBottom:12}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:12}}>Daily Routine</div>{plan.daily_routine.map((r,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:14,color:C.textSub,alignItems:"flex-start"}}><span style={{color:C.accent,marginTop:2,flexShrink:0}}>·</span>{r}</div>)}</Card>}
        {plan.milestone&&<Card style={{borderColor:C.gold+"44",background:C.goldSoft}}><div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.gold,marginBottom:6}}>Halfway Milestone</div><p style={{color:C.text,fontSize:14,lineHeight:1.7}}>{plan.milestone}</p></Card>}
      </div>}
    </main>
  );
}

// ── ASK LUMORA ────────────────────────────────────────────────────────────────
function Upload(){
  const [text,setText]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);

  const analyze=async()=>{
    if(!text.trim())return;
    setLoading(true);setError(null);setResult(null);
    const sys=`You are an expert LSAT analyst. Determine the correct answer with absolute certainty — work through all five choices independently before declaring a final answer.
Respond ONLY with valid JSON (no markdown):
{"correct_answer":"B","confidence":"High","question_type":"Assumption","section":"Logical Reasoning","level":3,"step_by_step":"Complete reasoning process step by step.","why_correct":"Precisely why the correct answer is right.","why_wrong":{"A":"...","C":"...","D":"...","E":"..."},"key_tip":"One actionable takeaway for this question type."}`;
    try{
      const raw=await callClaude(sys,`Analyze this LSAT question:\n\n${text}`,1600);
      setResult(parseJSON(raw));
    }catch(e){setError("Could not analyze: "+(e.message||"Paste the full question with all five answer choices (A–E)."));}
    setLoading(false);
  };

  return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Ask Lumora LSAT</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22}}>Paste any LSAT question. Lumora LSAT identifies the correct answer with certainty and explains every choice.</p>
      <Card style={{marginBottom:14}}>
        <label htmlFor="q-input" style={{display:"block",fontSize:13,color:C.textSub,marginBottom:8,fontWeight:600}}>Paste your question here</label>
        <textarea id="q-input" value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the full question — stimulus, question stem, and all five answer choices (A–E)…" rows={8} style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 15px",color:C.text,fontSize:14,fontFamily:T.sans,resize:"vertical",lineHeight:1.75,boxSizing:"border-box",outline:"none"}}/>
        <Btn onClick={analyze} disabled={!text.trim()||loading} style={{width:"100%",marginTop:12}}>{loading?"Analyzing…":"Analyze Question"}</Btn>
      </Card>
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

// ── NOTES ─────────────────────────────────────────────────────────────────────
function Notes({user,onUpdateUser}){
  const notes=user.notes||[];
  const [input,setInput]=useState("");
  const [editId,setEditId]=useState(null);
  const [search,setSearch]=useState("");

  const save=()=>{
    if(!input.trim())return;
    const u=editId?notes.map(n=>n.id===editId?{...n,text:input.trim(),edited:Date.now()}:n):[...notes,{id:Date.now(),text:input.trim(),source:"Manual",timestamp:Date.now()}];
    onUpdateUser({notes:u});setInput("");setEditId(null);
  };
  const del=(id)=>{if(window.confirm("Delete this note?"))onUpdateUser({notes:notes.filter(n=>n.id!==id)});};
  const filtered=notes.filter(n=>n.text.toLowerCase().includes(search.toLowerCase()));

  return(
    <main style={{maxWidth:660,margin:"0 auto",padding:"32px 20px"}}>
      <h1 style={{fontFamily:T.serif,fontSize:26,color:C.text,marginBottom:6}}>Study Notes</h1>
      <p style={{color:C.textMuted,fontSize:14,marginBottom:22}}>Capture insights as you study. Notes added during practice appear here automatically.</p>
      <Card style={{marginBottom:14}}>
        <label htmlFor="note-area" style={{display:"block",fontSize:13,color:C.textSub,marginBottom:6,fontWeight:600}}>{editId?"Edit note":"Add a note"}</label>
        <textarea id="note-area" value={input} onChange={e=>setInput(e.target.value)} placeholder="Pattern, strategy, concept to review…" rows={3} style={{width:"100%",background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:14,fontFamily:T.sans,resize:"none",boxSizing:"border-box",outline:"none"}}/>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Btn onClick={save} disabled={!input.trim()} small>{editId?"Update Note":"Save Note"}</Btn>
          {editId&&<Btn ghost onClick={()=>{setEditId(null);setInput("");}} small>Cancel</Btn>}
        </div>
      </Card>
      {notes.length>3&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes…" aria-label="Search notes" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:14,fontFamily:T.sans,boxSizing:"border-box",outline:"none",marginBottom:12}}/>}
      {filtered.length===0&&<p style={{textAlign:"center",padding:"36px 0",color:C.textMuted}}>{notes.length===0?"No notes yet. Insights you add during practice appear here automatically.":"No notes match your search."}</p>}
      <div role="list" aria-label="Study notes">
        {filtered.slice().reverse().map(n=>(
          <Card key={n.id} style={{marginBottom:10}} role="listitem">
            <p style={{color:C.text,fontSize:14,lineHeight:1.75,marginBottom:10,whiteSpace:"pre-wrap"}}>{n.text}</p>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>{n.source&&n.source!=="Manual"&&<Tag color={C.purple}>{n.source}</Tag>}<span style={{fontSize:12,color:C.textMuted}}>{new Date(n.timestamp).toLocaleDateString()}</span></div>
              <div style={{display:"flex",gap:8}}><Btn ghost onClick={()=>{setEditId(n.id);setInput(n.text);}} small>Edit</Btn><Btn ghost danger onClick={()=>del(n.id)} small>Delete</Btn></div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

// ── DASHBOARD + SCORE PREDICTOR ───────────────────────────────────────────────
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
    const overall=history.filter(h=>h.correct).length/history.length;
    let wa=0;
    [1,2,3,4].forEach(l=>{const items=history.filter(h=>h.level===l);wa+=(items.length>0?items.filter(h=>h.correct).length/items.length:overall)*weights[l];});
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

      <Card style={{marginBottom:14,borderColor:C.accent+"44"}}>
        <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.08em",color:C.accent,marginBottom:14,fontWeight:700}}>🎯 AI Score Predictor</div>
        {pred?(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:14,flexWrap:"wrap"}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:42,fontWeight:900,color:C.accent,fontFamily:T.serif,lineHeight:1}}>{pred.mid}</div><div style={{fontSize:12,color:C.textMuted,marginTop:4}}>Projected Score</div></div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:C.textSub,marginBottom:6}}>Range: <strong style={{color:C.text}}>{pred.low} – {pred.high}</strong></div>
                <div style={{fontSize:13,color:C.textMuted,marginBottom:8}}>Confidence: <Tag color={pred.confidence==="High"?C.success:pred.confidence==="Moderate"?C.gold:C.textMuted}>{pred.confidence}</Tag></div>
                <div style={{background:C.surfaceHigh,borderRadius:10,height:10,position:"relative"}}><div style={{position:"absolute",left:`${(pred.low-120)/60*100}%`,width:`${(pred.high-pred.low)/60*100}%`,height:"100%",background:`linear-gradient(90deg,${C.accentSoft},${C.accent})`,borderRadius:10}}/></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textMuted,marginTop:4}}><span>120</span><span>150</span><span>180</span></div>
              </div>
            </div>
            {pred.needed>0&&<div style={{fontSize:13,color:C.textMuted,background:C.surfaceHigh,borderRadius:8,padding:"10px 12px"}}>📊 Answer {pred.needed} more questions for a <strong style={{color:C.text}}>High confidence</strong> prediction.</div>}
          </div>
        ):(
          <div>
            <p style={{color:C.textMuted,fontSize:14,lineHeight:1.7,marginBottom:10}}>Answer at least <strong style={{color:C.text}}>10 questions</strong> to unlock your AI score prediction. You've answered {history.length} so far.</p>
            <div style={{background:C.surfaceHigh,borderRadius:6,height:6}}><div style={{height:"100%",width:`${Math.min(100,history.length/10*100)}%`,background:C.accent,borderRadius:6,transition:"width 0.5s"}}/></div>
            <div style={{fontSize:12,marginTop:4,color:C.textMuted}}>{history.length}/10 questions</div>
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
          <div style={{width:54,height:54,borderRadius:13,background:"linear-gradient(135deg,#3a6bff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff"}} aria-label={`Level ${Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1}`}>{Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1}</div>
          <div style={{flex:1}}><XPBar xp={user.stats?.xp||0} level={Math.floor((user.stats?.xp||0)/XP_PER_LEVEL)+1}/><div style={{fontSize:12,color:C.textMuted,marginTop:5}}>{user.stats?.xp||0} total XP earned</div></div>
        </div>
      </Card>

      <div style={{textAlign:"center",marginTop:20}}>
        <Btn ghost danger onClick={()=>{if(window.confirm("Reset all your progress? This cannot be undone."))onUpdateUser({history:[],notes:[],studyPlan:null,stats:{xp:0,streak:0,lastDay:null}});}}>Reset All Progress</Btn>
      </div>
    </main>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [screen,setScreen]=useState("home");
  const [ready,setReady]=useState(false);

  // Restore session on mount
  useEffect(()=>{
    try{
      const email=DB.getSession();
      if(email){const u=DB.getUser(email);if(u)setUser(u);}
    }catch{}
    setReady(true);
  },[]);

  // Update streak once per login
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
  const handleLogout=()=>{DB.clearSession();setUser(null);setScreen("home");};

  const handleUpdateUser=useCallback((updates)=>{
    setUser(prev=>{
      if(!prev)return prev;
      const next={...prev,...updates};
      // Deep merge stats only
      if(updates.stats)next.stats={...prev.stats,...updates.stats};
      try{DB.saveUser(next.email,next);}catch{}
      return next;
    });
  },[]);

  if(!ready)return <div style={{background:C.bg,minHeight:"100vh"}}/>;
  if(!user)return <Auth onLogin={handleLogin}/>;
  if(!user.diagnosticDone){
    return <Diagnostic user={user} onComplete={(answers)=>{
      const u={...user,diagnostic:answers,diagnosticDone:true};
      try{DB.saveUser(u.email,u);}catch{}
      setUser(u);setScreen("home");
    }}/>;
  }

  const pages={
    home:<Home user={user} setScreen={setScreen}/>,
    practice:<Practice user={user} onUpdateUser={handleUpdateUser}/>,
    spar:<Practice user={user} onUpdateUser={handleUpdateUser}/>,
    writing:<Writing/>,
    flaw:<FlawLab user={user} onUpdateUser={handleUpdateUser}/>,
    fullsection:<FullSection user={user} onUpdateUser={handleUpdateUser}/>,
    plan:<StudyPlan user={user} onUpdateUser={handleUpdateUser}/>,
    upload:<Upload/>,
    notes:<Notes user={user} onUpdateUser={handleUpdateUser}/>,
    dashboard:<Dashboard user={user} onUpdateUser={handleUpdateUser}/>,
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:T.sans}}>
      <style>{`
        *{box-sizing:border-box;}
        body{margin:0;}
        *:focus-visible{outline:2px solid ${C.accent}!important;outline-offset:2px!important;}
        button{font-family:${T.sans};}
        textarea,input{font-family:${T.sans};}
        @media(max-width:640px){
          nav{height:auto!important;flex-wrap:wrap;padding:8px 12px!important;}
        }
      `}</style>
      <Nav screen={screen} setScreen={setScreen} user={user} onLogout={handleLogout}/>
      {pages[screen]||pages.home}
    </div>
  );
}
