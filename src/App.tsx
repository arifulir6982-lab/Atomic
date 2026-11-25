import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, CircleHelp, Flame, Leaf, LogOut, Menu, MoreHorizontal, Plus, Sparkles, Target, X } from 'lucide-react'

type Habit = { id:string; user_id:string; name:string; description:string; minimum_version:string; category:string; identity_goal:string; schedule_days:number[]; archived_at:string|null; created_at:string }
type Completion = { id:string; habit_id:string; user_id:string; completed_on:string; note:string }
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

export default function App() {
  const [session,setSession] = useState<Session|null>(null)
  const [loading,setLoading] = useState(true)
  const [authMode,setAuthMode] = useState<'login'|'signup'>('login')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [displayName,setDisplayName] = useState('')
  const [authError,setAuthError] = useState('')
  const [notice,setNotice] = useState('')
  const [habits,setHabits] = useState<Habit[]>([])
  const [completions,setCompletions] = useState<Completion[]>([])
  const [dataLoading,setDataLoading] = useState(false)
  const [showForm,setShowForm] = useState(false)
  const [editing,setEditing] = useState<Habit|null>(null)
  const [selectedDay,setSelectedDay] = useState(today())
  const [mobileNav,setMobileNav] = useState(false)
  const [activeTab,setActiveTab] = useState<'today'|'habits'|'insights'>('today')
  const [form,setForm] = useState({name:'',description:'',minimum_version:'',category:'Personal',identity_goal:'',schedule_days:[0,1,2,3,4,5,6] as number[]})

  useEffect(()=>{
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,next)=>setSession(next))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(session) void loadData(); else {setHabits([]);setCompletions([])} },[session])

  async function loadData() {
    if(!supabase) return
    setDataLoading(true)
    const [habitResult,completionResult] = await Promise.all([
      supabase.from('habits').select('*').is('archived_at',null).order('created_at',{ascending:true}),
      supabase.from('habit_completions').select('*').order('completed_on',{ascending:false})
    ])
    if(habitResult.error) setNotice(habitResult.error.message); else setHabits((habitResult.data??[]) as Habit[])
    if(completionResult.error) setNotice(completionResult.error.message); else setCompletions((completionResult.data??[]) as Completion[])
    setDataLoading(false)
  }

  async function handleAuth(e:FormEvent) {
    e.preventDefault(); setAuthError('')
    if(!supabase) return
    const result = authMode==='signup'
      ? await supabase.auth.signUp({email,password,options:{data:{display_name:displayName}}})
      : await supabase.auth.signInWithPassword({email,password})
    if(result.error) setAuthError(result.error.message)
    else if(authMode==='signup' && !result.data.session) setNotice('Account created. Check your email to confirm your address, then log in.')
  }
  async function logout(){ if(supabase) await supabase.auth.signOut() }
  function openCreate(){setEditing(null);setForm({name:'',description:'',minimum_version:'',category:'Personal',identity_goal:'',schedule_days:[0,1,2,3,4,5,6]});setShowForm(true)}
  function openEdit(h:Habit){setEditing(h);setForm({name:h.name,description:h.description,minimum_version:h.minimum_version,category:h.category,identity_goal:h.identity_goal,schedule_days:h.schedule_days});setShowForm(true)}
  async function saveHabit(e:FormEvent){
    e.preventDefault(); if(!supabase || !session) return
    const payload={...form,user_id:session.user.id,updated_at:new Date().toISOString()}
    const result=editing
      ? await supabase.from('habits').update(payload).eq('id',editing.id).select().single()
      : await supabase.from('habits').insert(payload).select().single()
    if(result.error){setNotice(result.error.message);return}
    setShowForm(false);setNotice(editing?'Habit updated':'Habit created');await loadData()
  }
  async function toggleCompletion(habit:Habit){
    if(!supabase || !session) return
    const existing=completions.find(c=>c.habit_id===habit.id && c.completed_on===selectedDay)
    const result=existing
      ? await supabase.from('habit_completions').delete().eq('id',existing.id)
      : await supabase.from('habit_completions').insert({habit_id:habit.id,user_id:session.user.id,completed_on:selectedDay})
    if(result.error){setNotice(result.error.message);return}
    await loadData()
  }
  async function archiveHabit(h:Habit){if(!supabase || !confirm(`Archive “${h.name}”? Its history will be kept.`))return;const {error}=await supabase.from('habits').update({archived_at:new Date().toISOString()}).eq('id',h.id);if(error)setNotice(error.message);else{setNotice('Habit archived');await loadData()}}

  const scheduledHabits=useMemo(()=>habits.filter(h=>h.schedule_days.includes(new Date(`${selectedDay}T12:00:00`).getDay())),[habits,selectedDay])
  const doneIds=new Set(completions.filter(c=>c.completed_on===selectedDay).map(c=>c.habit_id))
  const doneCount=scheduledHabits.filter(h=>doneIds.has(h.id)).length
  const percent=scheduledHabits.length?Math.round(doneCount/scheduledHabits.length*100):0
  const displayNameValue=session?.user.user_metadata?.display_name || session?.user.email?.split('@')[0] || 'there'
  const streakFor=(habit:Habit)=>{let count=0;const cursor=new Date(`${today()}T12:00:00`);for(let i=0;i<370;i++){const day=cursor.getDay();if(habit.schedule_days.includes(day)){const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;if(completions.some(c=>c.habit_id===habit.id&&c.completed_on===key))count++;else if(i!==0)break;}cursor.setDate(cursor.getDate()-1)}return count}
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+i);return d})

  if(loading) return <div className="screen-center"><div className="loader"/><span>Preparing your space…</span></div>
  if(!isSupabaseConfigured) return <SetupScreen />
  if(!session) return <main className="auth-page"><div className="auth-visual"><div className="brand"><span className="brand-mark"><Leaf size={19}/></span> atomic</div><div className="auth-message"><span className="eyebrow">SMALL STEPS. REAL CHANGE.</span><h1>Become who you<br/><em>choose to be.</em></h1><p>Build a system that makes showing up feel natural. One small action at a time.</p><div className="auth-quote">“You do not rise to the level of your goals. You fall to the level of your systems.”<small>— A principle to build around</small></div></div><div className="auth-bottom">A little better, consistently.</div></div><section className="auth-form-wrap"><form className="auth-card" onSubmit={handleAuth}><span className="eyebrow">YOUR PERSONAL GROWTH SPACE</span><h2>{authMode==='login'?'Welcome back':'Start your journey'}</h2><p className="muted">{authMode==='login'?'Sign in to continue building your system.':'Create an account to start tracking your habits.'}</p>{authMode==='signup'&&<label>Your name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="How should we call you?" required/></label>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required autoComplete={authMode==='login'?'current-password':'new-password'}/></label>{authError&&<div className="error-text">{authError}</div>}<button className="primary-button full" type="submit">{authMode==='login'?'Sign in':'Create account'} <ArrowUpRight size={17}/></button><div className="auth-switch">{authMode==='login'?"New to Atomic?":"Already have an account?"} <button type="button" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('')}}>{authMode==='login'?'Create an account':'Sign in'}</button></div><div className="secure-note"><span/> Your habits are private to your account</div></form></section></main>

  return <div className="app-shell"><aside className={`sidebar ${mobileNav?'open':''}`}><div className="brand"><span className="brand-mark"><Leaf size={19}/></span> atomic</div><div className="workspace-label">WORKSPACE</div><nav><button className={activeTab==='today'?'nav-item active':'nav-item'} onClick={()=>{setActiveTab('today');setMobileNav(false)}}><CalendarDays size={18}/> Today <span className="nav-count">{scheduledHabits.length}</span></button><button className={activeTab==='habits'?'nav-item active':'nav-item'} onClick={()=>{setActiveTab('habits');setMobileNav(false)}}><Target size={18}/> My habits</button><button className={activeTab==='insights'?'nav-item active':'nav-item'} onClick={()=>{setActiveTab('insights');setMobileNav(false)}}><Activity size={18}/> Insights <span className="soon-label">BETA</span></button></nav><div className="sidebar-bottom"><div className="sidebar-tip"><Sparkles size={17}/><strong>Keep it small.</strong><p>Make your habit so easy you can't say no.</p></div><div className="profile-row"><div className="avatar">{displayNameValue.slice(0,1).toUpperCase()}</div><div className="profile-copy"><strong>{displayNameValue}</strong><span>Personal space</span></div><button className="icon-button" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div></aside>
  {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}<main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open navigation"><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{activeTab==='today'?'Today':activeTab==='habits'?'My habits':'Insights'}</strong></div><div className="topbar-right"><span className="date-label">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span><div className="avatar small">{displayNameValue.slice(0,1).toUpperCase()}</div></div></header>
  <div className="content-wrap">{notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
  {activeTab==='today'&&<><div className="page-heading"><div><span className="eyebrow">YOUR DAILY RESET</span><h1>Make today <em>count.</em></h1><p className="muted">Small actions, repeated daily, become extraordinary results.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18}/> New habit</button></div>
  <section className="week-strip">{weekDays.map(d=>{const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return <button key={key} className={`week-day ${selectedDay===key?'selected':''} ${key===today()?'is-today':''}`} onClick={()=>setSelectedDay(key)}><span>{dayNames[d.getDay()]}</span><strong>{d.getDate()}</strong><i/></button>})}</section>
  <section className="overview-grid"><div className="overview-card progress-card"><div className="card-top"><span>DAILY PROGRESS</span><span className="soft-icon"><Activity size={17}/></span></div><div className="progress-content"><div className="progress-ring" style={{'--progress':`${percent}%`} as React.CSSProperties}><div><strong>{percent}%</strong><small>complete</small></div></div><div className="progress-copy"><h3>{doneCount===scheduledHabits.length&&scheduledHabits.length?'All done.':doneCount?'Good momentum.':'Start with one.'}</h3><p>{doneCount} of {scheduledHabits.length} habits completed</p><div className="progress-track"><span style={{width:`${percent}%`}}/></div></div></div></div><div className="overview-card"><div className="card-top"><span>ACTIVE HABITS</span><span className="soft-icon"><Target size={17}/></span></div><div className="metric-number">{habits.length.toString().padStart(2,'0')}</div><p className="metric-caption">Systems you're building</p><span className="metric-foot"><span className="green-dot"/> Keep your focus narrow</span></div><div className="overview-card"><div className="card-top"><span>CONSISTENCY</span><span className="soft-icon"><Flame size={17}/></span></div><div className="metric-number">{completions.length}</div><p className="metric-caption">Completions recorded</p><span className="metric-foot">Every check-in counts</span></div></section>
  <section className="section-block"><div className="section-heading"><div><h2>{selectedDay===today()?"Today's habits":new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric'})+' habits'}</h2><p className="muted">Focus on the action, not the outcome.</p></div><button className="text-button" onClick={()=>setActiveTab('habits')}>Manage habits <ArrowUpRight size={15}/></button></div>
  {dataLoading?<div className="empty-state">Loading your habits…</div>:scheduledHabits.length===0?<div className="empty-state"><div className="empty-icon"><Target size={23}/></div><h3>Your next chapter starts small.</h3><p>Add one habit you'd like to become consistent with.</p><button className="primary-button" onClick={openCreate}><Plus size={17}/> Create your first habit</button></div>:<div className="habit-list">{scheduledHabits.map((h,i)=>{const done=doneIds.has(h.id);return <article className={`habit-row ${done?'completed':''}`} key={h.id}><button className={`completion-check ${done?'checked':''}`} onClick={()=>toggleCompletion(h)} aria-label={done?`Undo ${h.name}`:`Complete ${h.name}`}>{done&&<Check size={17}/>}</button><div className="habit-symbol">{h.category==='Learning'?'✳':h.category==='Health'?'◌':h.category==='Work'?'⌘':'✧'}</div><div className="habit-info"><div className="habit-title-line"><h3>{h.name}</h3>{done&&<span className="done-label">DONE</span>}</div><p>{h.description||h.minimum_version||'A small step toward your goal'}</p><div className="habit-meta"><span>{h.category}</span>{h.minimum_version&&<><i/> <span>Minimum: {h.minimum_version}</span></>}</div></div><div className="habit-streak"><Flame size={15}/><strong>{streakFor(h)}</strong><span>day streak</span></div><button className="icon-button more-button" title="Edit habit" onClick={()=>openEdit(h)}><MoreHorizontal size={19}/></button></article>})}</div>}</section></>}
  {activeTab==='habits'&&<><div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL SYSTEMS</span><h1>My <em>habits.</em></h1><p className="muted">Design the routines that shape who you're becoming.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18}/> New habit</button></div><div className="habit-list management-list">{habits.length===0?<div className="empty-state">No habits yet. Start with one small action.</div>:habits.map(h=><article className="habit-row" key={h.id}><div className="habit-symbol">✧</div><div className="habit-info"><h3>{h.name}</h3><p>{h.description||'No description yet'}</p><div className="habit-meta"><span>{h.category}</span><i/><span>{h.schedule_days.map(d=>dayNames[d]).join(' · ')}</span></div></div><button className="secondary-button compact" onClick={()=>openEdit(h)}>Edit</button><button className="icon-button" title="Archive habit" onClick={()=>archiveHabit(h)}><ArrowDownRight size={17}/></button></article>)}</div></>}
  {activeTab==='insights'&&<><div className="page-heading"><div><span className="eyebrow">PROGRESS, NOT PERFECTION</span><h1>Your <em>journey.</em></h1><p className="muted">A simple look at the actions you've recorded.</p></div></div><section className="overview-grid insight-grid"><div className="overview-card"><div className="card-top"><span>TOTAL CHECK-INS</span><CheckCircle2 size={18}/></div><div className="metric-number">{completions.length}</div><p className="metric-caption">Completions across all active habits</p></div><div className="overview-card"><div className="card-top"><span>ACTIVE SYSTEMS</span><Target size={18}/></div><div className="metric-number">{habits.length}</div><p className="metric-caption">Habits currently in your routine</p></div><div className="overview-card"><div className="card-top"><span>THIS YEAR</span><CalendarDays size={18}/></div><div className="metric-number">{completions.filter(c=>c.completed_on.startsWith(String(new Date().getFullYear()))).length}</div><p className="metric-caption">Actions completed this year</p></div></section><div className="insight-note"><Sparkles size={19}/><div><strong>Consistency is built one repetition at a time.</strong><p>More detailed trends, calendar heatmaps, and weekly completion rates will be added in the analytics milestone.</p></div></div></>}
  <footer className="footer-note">Designed for progress, not perfection <span>·</span> Project Atomic v0.1</footer></div></main>
  {showForm&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><form className="habit-modal" onSubmit={saveHabit}><div className="modal-heading"><div><span className="eyebrow">MAKE IT OBVIOUS. MAKE IT EASY.</span><h2>{editing?'Edit habit':'Create a habit'}</h2></div><button type="button" className="icon-button" onClick={()=>setShowForm(false)} aria-label="Close"><X/></button></div><label>Habit name<input maxLength={80} required autoFocus placeholder="e.g. Practice C++" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Description <span className="optional">OPTIONAL</span><textarea maxLength={300} rows={2} placeholder="What will you do?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Minimum version <span className="optional">YOUR TWO-MINUTE VERSION</span><input maxLength={120} placeholder="e.g. Solve one problem" value={form.minimum_version} onChange={e=>setForm({...form,minimum_version:e.target.value})}/></label><div className="form-row"><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Personal</option><option>Learning</option><option>Health</option><option>Work</option><option>Mindfulness</option></select></label><label>Identity goal<input placeholder="e.g. Become a programmer" value={form.identity_goal} onChange={e=>setForm({...form,identity_goal:e.target.value})}/></label></div><fieldset><legend>Repeat on</legend><div className="day-picker">{dayNames.map((day,i)=><button type="button" key={day} className={form.schedule_days.includes(i)?'day-choice chosen':'day-choice'} onClick={()=>setForm({...form,schedule_days:form.schedule_days.includes(i)?form.schedule_days.filter(d=>d!==i):[...form.schedule_days,i].sort()})}>{day}</button>)}</div>{form.schedule_days.length===0&&<small className="error-text">Choose at least one day.</small>}</fieldset><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-button" type="submit" disabled={!form.schedule_days.length}>{editing?'Save changes':'Create habit'} <ArrowUpRight size={16}/></button></div></form></div>}
  </div>
}

function SetupScreen(){return <div className="setup-page"><div className="setup-card"><div className="brand"><span className="brand-mark"><Leaf size={19}/></span> atomic</div><span className="eyebrow">ONE-TIME SETUP</span><h1>Connect your <em>workspace.</em></h1><p>Project Atomic is ready for its Supabase connection. Follow these steps to enable secure accounts and cloud sync.</p><ol><li>Create a Supabase project.</li><li>Copy <code>.env.example</code> to <code>.env.local</code>.</li><li>Add your project URL and publishable anon key.</li><li>Run <code>supabase/migrations/0001_initial_schema.sql</code> in the Supabase SQL Editor.</li><li>Restart the development server.</li></ol><div className="setup-warning"><CircleHelp size={18}/><span>No demo-only storage is used. Habits are saved to your private cloud database after configuration.</span></div></div></div>}
