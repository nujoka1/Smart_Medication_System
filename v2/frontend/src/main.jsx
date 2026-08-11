import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlarmClock, Bell, Camera, ChevronRight, CircleUserRound, Clock3,
  Database, FileCheck2, HeartPulse, Home, Menu, PackageSearch, Pill,
  RefreshCcw, Settings, ShieldCheck, Smartphone, Users, Wifi, X
} from 'lucide-react';
import { api, getServer, resolveAsset, setServer } from './api';
import './styles.css';

const NAV = [
  ['dashboard', 'Dashboard', Home],
  ['medications', 'Medication', Pill],
  ['schedule', 'Schedule', AlarmClock],
  ['adherence', 'Adherence', HeartPulse],
  ['evidence', 'Evidence', FileCheck2],
  ['caregiver', 'Caregiver', Users],
  ['device', 'Device', Smartphone],
  ['settings', 'Settings', Settings]
];

function App() {
  const [active, setActive] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('medsystem_v2_theme') || 'light');
  const [data, setData] = useState({ status:null, auto:null, meds:[], patients:[], today:[], schedules:[], logs:[], evidence:[], ai:[] });
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState('checking');
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true); setError('');
    const requests = [
      ['/api/status','status'], ['/api/autodispense/status','auto'], ['/api/medications','meds'],
      ['/api/patients','patients'], ['/api/schedule/today','today'], ['/api/schedules','schedules'],
      ['/api/logs?limit=100','logs'], ['/api/evidence/latest','evidence'], ['/api/ai/classes','ai']
    ];
    const next = { ...data };
    const results = await Promise.allSettled(requests.map(([p]) => api.get(p)));
    results.forEach((r, i) => { if (r.status === 'fulfilled') next[requests[i][1]] = r.value; });
    const statusOk = results[0].status === 'fulfilled';
    setData(next);
    setConnection(statusOk ? 'online' : 'offline');
    if (!statusOk) setError(results[0].reason?.message || 'Device unavailable');
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);

  const nextDose = useMemo(() => getNextDose(data.today), [data.today]);
  const adherence = useMemo(() => getAdherence(data.logs), [data.logs]);
  const lowStock = useMemo(() => (data.meds || []).filter(m => Number(m.stock ?? m.stock_count ?? 999) <= 5), [data.meds]);

  function go(id) { setActive(id); setMenuOpen(false); }
  function changeTheme(v) { localStorage.setItem('medsystem_v2_theme', v); setTheme(v); }

  return (
    <div className={`app theme-${theme}`}>
      <header className="topbar">
        <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21}/></button>
        <div className="brand"><div className="brand-mark">M</div><div><b>MedSystem</b><span>Smart medication care</span></div></div>
        <div className="top-actions">
          <span className={`connection ${connection}`}><i></i>{connection === 'online' ? 'Connected' : connection === 'checking' ? 'Checking' : 'Offline'}</span>
          <button className="icon-button" onClick={refresh} aria-label="Sync"><RefreshCcw size={18} className={loading ? 'spin' : ''}/></button>
        </div>
      </header>

      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-head"><div className="brand-mark">M</div><div><b>MedSystem V2</b><span>Hardware Revision 1</span></div><button onClick={() => setMenuOpen(false)}><X size={18}/></button></div>
        <nav>{NAV.map(([id,label,Icon]) => <button key={id} className={active===id?'active':''} onClick={()=>go(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
        <div className="sidebar-foot"><span>RFID identification</span><b>Coming Soon</b></div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Close menu"/>}

      <main className="content">
        {error && <div className="alert danger"><b>Device connection issue</b><span>{error}</span></div>}
        {active==='dashboard' && <Dashboard data={data} nextDose={nextDose} adherence={adherence} lowStock={lowStock}/>} 
        {active==='medications' && <Medications meds={data.meds} ai={data.ai} refresh={refresh}/>} 
        {active==='schedule' && <Schedule meds={data.meds} patients={data.patients} schedules={data.schedules} today={data.today} refresh={refresh}/>} 
        {active==='adherence' && <Adherence logs={data.logs} adherence={adherence}/>} 
        {active==='evidence' && <Evidence rows={data.evidence} refresh={refresh}/>} 
        {active==='caregiver' && <Caregiver/>} 
        {active==='device' && <Device status={data.status} auto={data.auto}/>} 
        {active==='settings' && <SettingsPage theme={theme} changeTheme={changeTheme} refresh={refresh}/>} 
      </main>
    </div>
  );
}

function Header({kicker,title,sub,action}) { return <div className="page-head"><div><span>{kicker}</span><h1>{title}</h1><p>{sub}</p></div>{action}</div>; }
function Card({children,className=''}) { return <section className={`card ${className}`}>{children}</section>; }
function Badge({children,tone='neutral'}) { return <span className={`badge ${tone}`}>{children}</span>; }

function Dashboard({data,nextDose,adherence,lowStock}) {
  const auto = data.auto || {};
  const last = data.logs?.[0];
  return <>
    <Header kicker="Overview" title="Medication care at a glance" sub="Live dispenser state, dose schedule, adherence and attention items."/>
    <Card className="hero-card">
      <div><span className="eyebrow">Dispenser</span><h2>{friendlyState(auto.state || 'Ready')}</h2><p>{auto.message || 'System is ready for the next scheduled medication.'}</p></div>
      <div className="hero-status"><ShieldCheck size={26}/><Badge tone={auto.alarm_active?'warning':'success'}>{auto.alarm_active?'Action needed':'Ready'}</Badge></div>
    </Card>
    <div className="metrics">
      <Metric icon={Clock3} label="Next dose" value={nextDose?.med || 'No dose'} sub={nextDose ? `${nextDose.time} · Qty ${nextDose.qty || 1} · Comp ${nextDose.compartment ?? nextDose.comp ?? '-'}` : 'Nothing scheduled today'}/>
      <Metric icon={HeartPulse} label="7-day adherence" value={`${adherence.percent}%`} sub={`${adherence.verified} verified of ${adherence.total || 0} recorded events`}/>
      <Metric icon={PackageSearch} label="Low stock" value={String(lowStock.length)} sub={lowStock.length ? 'Medication needs attention' : 'Inventory healthy'}/>
      <Metric icon={Activity} label="Device" value={data.status ? 'Online' : 'Offline'} sub={data.status?.cpu_temp || 'No telemetry'}/>
    </div>
    <div className="two-col">
      <Card><SectionTitle icon={AlarmClock} title="Today’s schedule"/><div className="list">{(data.today||[]).slice(0,5).map(s=><div className="list-row" key={s.id}><div><b>{s.time} · {s.med}</b><span>{s.patient || 'Patient'} · Qty {s.qty || 1}</span></div><Badge>{`Comp ${s.compartment ?? s.comp ?? '-'}`}</Badge></div>)}{!data.today?.length&&<Empty text="No medication scheduled today."/>}</div></Card>
      <Card><SectionTitle icon={FileCheck2} title="Latest verification"/>{last?<div className="verification"><Badge tone={resultTone(last.outcome)}>{friendlyState(last.outcome)}</Badge><h3>{last.expected_med || 'Medication event'}</h3><p>{last.patient || 'Patient'} · {last.timestamp || ''}</p><div className="mini-grid"><div><span>Detected</span><b>{last.detected_med || '—'}</b></div><div><span>Confidence</span><b>{last.confidence ? `${last.confidence}%` : '—'}</b></div></div></div>:<Empty text="No dispense verification recorded yet."/>}</Card>
    </div>
  </>;
}

function Metric({icon:Icon,label,value,sub}) { return <Card className="metric"><div className="metric-icon"><Icon size={19}/></div><span>{label}</span><b>{value}</b><p>{sub}</p></Card>; }
function SectionTitle({icon:Icon,title,aside}) { return <div className="section-title"><div>{Icon&&<Icon size={18}/>}<b>{title}</b></div>{aside}</div>; }
function Empty({text}) { return <div className="empty">{text}</div>; }

function Medications({meds=[],ai=[],refresh}) {
  const [open,setOpen]=useState(false); const [message,setMessage]=useState('');
  const [form,setForm]=useState({name:'',ai_class_name:'custom',compartment:'1',stock_count:'30',low_stock_alert:'5'});
  async function submit(e){e.preventDefault();try{await api.post('/api/medications',{...form,compartment:Number(form.compartment),stock_count:Number(form.stock_count),low_stock_alert:Number(form.low_stock_alert),dose_mg:0,weight_per_pill:0.5});setMessage('Medication added.');setOpen(false);await refresh();}catch(err){setMessage(err.message)}}
  return <><Header kicker="Inventory" title="Medication" sub="Medication records, compartments, verification mode and stock." action={<button className="primary" onClick={()=>setOpen(!open)}>Add medication</button>}/>
  {message&&<div className="alert"><span>{message}</span></div>}
  {open&&<Card><form onSubmit={submit} className="form"><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><div className="form-grid"><label>Compartment<select value={form.compartment} onChange={e=>setForm({...form,compartment:e.target.value})}><option>1</option><option>3</option><option>5</option></select></label><label>Initial stock<input type="number" min="0" value={form.stock_count} onChange={e=>setForm({...form,stock_count:e.target.value})}/></label></div><label>Verification<select value={form.ai_class_name} onChange={e=>setForm({...form,ai_class_name:e.target.value})}><option value="custom">IR + Camera</option>{ai.map(x=><option key={x.ai_class} value={x.ai_class}>{x.label || x.ai_class} · AI + IR + Camera</option>)}</select></label><button className="primary" type="submit">Save medication</button></form></Card>}
  <div className="cards-list">{meds.map(m=><Card key={m.id}><div className="med-card"><div className="med-icon"><Pill/></div><div className="med-copy"><h3>{m.name}</h3><p>Compartment {m.compartment ?? '—'} · {m.ai_class && m.ai_class!=='custom' ? 'AI + IR + Camera' : 'IR + Camera'}</p><div className="med-meta"><Badge tone={Number(m.stock??0)<=5?'warning':'success'}>Stock {m.stock ?? 0}</Badge><Badge>{m.ai_class || 'custom'}</Badge></div></div></div></Card>)}{!meds.length&&<Card><Empty text="No medication has been registered."/></Card>}</div></>;
}

function Schedule({meds=[],patients=[],schedules=[],today=[],refresh}) {
  const [open,setOpen]=useState(false); const [msg,setMsg]=useState('');
  const [f,setF]=useState({patient_id:'1',medication_id:'',dose_time:'08:00',dose_quantity:'1',days_of_week:'0123456'});
  async function submit(e){e.preventDefault();const med=meds.find(m=>String(m.id)===String(f.medication_id));if(!med){setMsg('Select a medication.');return;}try{await api.post('/api/schedule',{patient_id:Number(f.patient_id),medication_id:Number(f.medication_id),dose_time:f.dose_time,dose_quantity:Number(f.dose_quantity),days_of_week:f.days_of_week,compartment:Number(med.compartment)});setMsg('Schedule saved.');setOpen(false);await refresh();}catch(err){setMsg(err.message)}}
  return <><Header kicker="Dose planning" title="Schedule" sub="Create and review recurring medication times." action={<button className="primary" onClick={()=>setOpen(!open)}>New schedule</button>}/>{msg&&<div className="alert"><span>{msg}</span></div>}
  {open&&<Card><form className="form" onSubmit={submit}><label>Patient<select value={f.patient_id} onChange={e=>setF({...f,patient_id:e.target.value})}>{patients.length?patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>):<option value="1">Default Patient</option>}</select></label><label>Medication<select value={f.medication_id} onChange={e=>setF({...f,medication_id:e.target.value})}><option value="">Select medication</option>{meds.map(m=><option key={m.id} value={m.id}>{m.name} · Comp {m.compartment}</option>)}</select></label><div className="form-grid"><label>Time<input type="time" value={f.dose_time} onChange={e=>setF({...f,dose_time:e.target.value})}/></label><label>Quantity<input type="number" min="1" value={f.dose_quantity} onChange={e=>setF({...f,dose_quantity:e.target.value})}/></label></div><label>Days<select value={f.days_of_week} onChange={e=>setF({...f,days_of_week:e.target.value})}><option value="0123456">Every day</option><option value="01234">Weekdays</option><option value="56">Weekend</option></select></label><button className="primary">Save schedule</button></form></Card>}
  <Card><SectionTitle icon={Clock3} title="Today"/><div className="timeline">{today.map(s=><div className="timeline-row" key={s.id}><span className="time">{s.time}</span><div><b>{s.med}</b><p>{s.patient || 'Patient'} · Qty {s.qty || 1}</p></div><Badge>Comp {s.compartment ?? s.comp ?? '—'}</Badge></div>)}{!today.length&&<Empty text="No doses scheduled today."/>}</div></Card>
  <Card><SectionTitle icon={Database} title="Active schedules"/><div className="list">{schedules.map(s=><div className="list-row" key={s.id}><div><b>{s.time} · {s.med}</b><span>{s.patient || 'Patient'} · Days {s.days || '—'}</span></div><Badge>Comp {s.compartment ?? s.comp ?? '—'}</Badge></div>)}{!schedules.length&&<Empty text="No active schedules."/>}</div></Card></>;
}

function Adherence({logs=[],adherence}) {
  const misses=logs.filter(x=>String(x.outcome).toLowerCase().includes('miss'));
  return <><Header kicker="Medication behaviour" title="Adherence" sub="Understand verified doses, missed doses and exceptions."/>
  <div className="metrics"><Metric icon={HeartPulse} label="Adherence" value={`${adherence.percent}%`} sub="Based on recorded dispense outcomes"/><Metric icon={ShieldCheck} label="Verified" value={String(adherence.verified)} sub="Successful medication events"/><Metric icon={Bell} label="Missed" value={String(misses.length)} sub="Events requiring review"/></div>
  <Card><SectionTitle icon={Activity} title="Activity history"/><div className="list">{logs.slice(0,30).map(l=><div className="list-row" key={l.id}><div><b>{l.expected_med || 'Medication'}</b><span>{l.patient || 'Patient'} · {l.timestamp}</span></div><Badge tone={resultTone(l.outcome)}>{friendlyState(l.outcome)}</Badge></div>)}{!logs.length&&<Empty text="No adherence history yet."/>}</div></Card></>;
}

function Evidence({rows=[],refresh}) {
  async function remove(id){if(!id||!confirm('Delete this evidence record?'))return;try{await api.del(`/api/evidence/${id}`);await refresh();}catch(e){alert(e.message)}}
  return <><Header kicker="Audit trail" title="Evidence" sub="Camera and count verification for medication events."/>
  <div className="evidence-feed">{rows.map((item,i)=>{const img=resolveAsset(item.annotated_url||item.raw_url||item.image_url||item.preview_url||item.annotated_image_path||item.raw_image_path);const decision=item.decision||'UNVERIFIED';return <Card className="evidence-card" key={item.evidence_id||item.id||i}><div className="evidence-image">{img?<img src={img} alt="Medication evidence"/>:<div className="image-empty"><Camera size={28}/><span>No image</span></div>}<Badge tone={resultTone(decision)}>{friendlyState(decision)}</Badge></div><div className="evidence-body"><div><h3>{item.expected_name||item.medication||item.med||'Medication'}</h3><p>{formatDate(item.created_at||item.dose_time)}</p></div><div className="mini-grid three"><div><span>Compartment</span><b>{item.compartment??'—'}</b></div><div><span>Count</span><b>{item.ir_actual_count??'—'}/{item.ir_target_count??item.dose_quantity??'—'}</b></div><div><span>Mode</span><b>{friendlyState(item.verification_mode||'verification')}</b></div></div><details><summary>Verification details</summary><pre>{JSON.stringify(item,null,2)}</pre></details><button className="text-danger" onClick={()=>remove(item.evidence_id||item.id)}>Delete record</button></div></Card>})}{!rows.length&&<Card><Empty text="No evidence records available."/></Card>}</div></>;
}

function Caregiver(){return <><Header kicker="Shared care" title="Caregiver" sub="Escalation, monitoring and shared medication management."/><Card className="coming"><Users size={28}/><div><Badge tone="info">V2 roadmap</Badge><h2>Caregiver workspace</h2><p>Local caregiver roles, missed-dose escalation, low-stock alerts and adherence review are part of the V2 product architecture. Secure remote caregiver sync will be enabled after authentication is hardened.</p></div></Card><Card><SectionTitle icon={Bell} title="Planned alerts"/><div className="check-list"><span>Missed medication</span><span>Verification failure</span><span>Low medication stock</span><span>Device offline or degraded</span></div></Card></>}

function Device({status,auto}) {
  return <><Header kicker="Hardware Revision 1" title="Device" sub="System telemetry, capabilities and diagnostics."/>
  <div className="metrics"><Metric icon={Wifi} label="Connection" value={status?'Online':'Offline'} sub={status?.time||'No heartbeat'}/><Metric icon={Activity} label="CPU temperature" value={status?.cpu_temp||'—'} sub="Raspberry Pi telemetry"/><Metric icon={Database} label="Auto dispense" value={friendlyState(auto?.state||'unknown')} sub={auto?.message||'Service status'}/></div>
  <Card><SectionTitle icon={ShieldCheck} title="Capabilities"/><div className="capability-grid"><Capability name="Compartment 1" status="Ready"/><Capability name="Compartment 3" status="Ready"/><Capability name="Compartment 5" status="Ready"/><Capability name="Compartment 2" status="Hardware Rev 2" soon/><Capability name="Compartment 4" status="Hardware Rev 2" soon/><Capability name="Compartment 6" status="Hardware Rev 2" soon/><Capability name="RFID patient ID" status="Coming Soon" soon/><Capability name="Camera evidence" status="Available"/><Capability name="IR verification" status="Available"/></div></Card></>;
}
function Capability({name,status,soon}){return <div className="capability"><div><b>{name}</b><span>{status}</span></div><Badge tone={soon?'info':'success'}>{soon?'Coming soon':'Available'}</Badge></div>}

function SettingsPage({theme,changeTheme,refresh}){
  const [url,setUrl]=useState(getServer()); const [msg,setMsg]=useState('');
  async function test(){try{const r=await fetch(url.replace(/\/$/,'')+'/api/status');if(!r.ok)throw new Error(`${r.status}`);setMsg('Connection successful.');}catch(e){setMsg(`Connection failed: ${e.message}`)}}
  function save(){setServer(url);setMsg('Server saved. Reloading data…');refresh();}
  return <><Header kicker="Application" title="Settings" sub="Appearance, connection, privacy and product information."/><Card><SectionTitle icon={CircleUserRound} title="Display"/><div className="segmented"><button className={theme==='light'?'active':''} onClick={()=>changeTheme('light')}>Light</button><button className={theme==='dark'?'active':''} onClick={()=>changeTheme('dark')}>Dark</button></div></Card><Card><SectionTitle icon={Wifi} title="Device connection"/><div className="form"><label>Raspberry Pi server<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="http://100.x.x.x:8080"/></label><div className="button-row"><button onClick={test}>Test</button><button className="primary" onClick={save}>Save</button></div>{msg&&<p>{msg}</p>}</div></Card><Card><SectionTitle icon={ShieldCheck} title="Care & support"/><div className="support-block"><b>Medication safety</b><p>MedSystem assists scheduling, dispensing and verification. Medication labels and instructions from licensed healthcare professionals remain authoritative.</p></div><div className="support-block"><b>Data design</b><p>Revision 1 keeps medication schedules, logs and evidence on the dispenser. Secure remote synchronization is a planned V2 capability.</p></div></Card><Card><SectionTitle icon={Activity} title="About"/><div className="about-grid"><div><span>Application</span><b>MedSystem V2</b></div><div><span>Hardware</span><b>Revision 1</b></div><div><span>RFID</span><b>Coming Soon</b></div><div><span>Team</span><b>MedSystem Development Team</b></div></div></Card></>;
}

function getNextDose(schedule=[]){if(!schedule.length)return null;const now=new Date();const n=now.getHours()*60+now.getMinutes();return schedule.map(s=>{const [h,m]=String(s.time||'00:00').split(':').map(Number);const t=h*60+m;return {...s,_d:t>=n?0:1,_t:t}}).sort((a,b)=>a._d-b._d||a._t-b._t)[0]}
function getAdherence(logs=[]){const total=logs.length;const verified=logs.filter(l=>['success','verified','custom_named'].some(x=>String(l.outcome||'').toLowerCase().includes(x))).length;return {total,verified,percent:total?Math.round(verified/total*100):0}}
function resultTone(v){const s=String(v||'').toLowerCase();if(s.includes('success')||s.includes('verified')||s.includes('custom_named'))return 'success';if(s.includes('miss')||s.includes('mismatch')||s.includes('wrong')||s.includes('error')||s.includes('fail'))return 'danger';return 'neutral'}
function friendlyState(v){return String(v||'Unknown').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function formatDate(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString()}

createRoot(document.getElementById('root')).render(<App/>);
