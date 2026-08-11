import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlarmClock, Bell, Camera, ChevronRight, Clock3, Database,
  FileCheck2, HeartPulse, Home, Menu, PackageSearch, Pill, Plus,
  RefreshCcw, Settings, ShieldCheck, Smartphone, Users, Wifi, X,
  Volume2, UserRound, Radio, CircleUserRound
} from 'lucide-react';
import { api, getServer, resolveAsset, setServer } from './api';
import './styles.css';
import './enhancements.css';

const NAV = [
  ['dashboard', 'Dashboard', Home],
  ['patients', 'Patients', Users],
  ['medications', 'Medication', Pill],
  ['schedule', 'Schedule', AlarmClock],
  ['adherence', 'Adherence', HeartPulse],
  ['evidence', 'Evidence', FileCheck2],
  ['caregiver', 'Caregiver', UserRound],
  ['device', 'Device', Smartphone],
  ['settings', 'Settings', Settings]
];

const ALARM_TONES = ['Classic Ding','Double Beep','Chime Sequence','Gentle Pulse','Urgent Alert','Hospital Tone'];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatClock(now) {
  return now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
function formatDate(now) {
  return now.toLocaleDateString([], { weekday:'short', day:'2-digit', month:'short' });
}

function App() {
  const [active, setActive] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('medsystem_v2_theme') || 'light');
  const [data, setData] = useState({ status:null, auto:null, meds:[], patients:[], today:[], schedules:[], logs:[], evidence:[], ai:[] });
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState('checking');
  const [error, setError] = useState('');
  const now = useClock();

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
      <header className="topbar production-topbar">
        <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21}/></button>
        <div className="brand"><div className="brand-mark">M</div><div><b>MedSystem</b><span>Smart medication care</span></div></div>
        <div className="top-actions">
          <div className="live-clock"><b>{formatClock(now)}</b><span>{formatDate(now)}</span></div>
          <span className={`connection ${connection}`}><i></i>{connection === 'online' ? 'Connected' : connection === 'checking' ? 'Checking' : 'Offline'}</span>
          <button className="icon-button" onClick={refresh} aria-label="Sync"><RefreshCcw size={18} className={loading ? 'spin' : ''}/></button>
        </div>
      </header>

      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-head"><div className="brand-mark">M</div><div><b>MedSystem V2</b><span>Hardware Revision 1</span></div><button onClick={() => setMenuOpen(false)}><X size={18}/></button></div>
        <nav>{NAV.map(([id,label,Icon]) => <button key={id} className={active===id?'active':''} onClick={()=>go(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
        <div className="sidebar-foot coming-soon"><div><Radio size={16}/><span>RFID identification</span></div><b>Coming Soon</b></div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Close menu"/>}

      <main className="content">
        {error && <div className="alert danger"><b>Device connection issue</b><span>{error}</span></div>}
        {active==='dashboard' && <Dashboard data={data} nextDose={nextDose} adherence={adherence} lowStock={lowStock} now={now}/>} 
        {active==='patients' && <Patients patients={data.patients} schedules={data.schedules} refresh={refresh} now={now}/>} 
        {active==='medications' && <Medications meds={data.meds} ai={data.ai} refresh={refresh} now={now}/>} 
        {active==='schedule' && <Schedule meds={data.meds} patients={data.patients} schedules={data.schedules} today={data.today} refresh={refresh} now={now}/>} 
        {active==='adherence' && <Adherence logs={data.logs} adherence={adherence} now={now}/>} 
        {active==='evidence' && <Evidence rows={data.evidence} refresh={refresh} now={now}/>} 
        {active==='caregiver' && <Caregiver now={now}/>} 
        {active==='device' && <Device status={data.status} auto={data.auto} now={now}/>} 
        {active==='settings' && <SettingsPage theme={theme} changeTheme={changeTheme} status={data.status} refresh={refresh} now={now}/>} 
      </main>
    </div>
  );
}

function Header({kicker,title,sub,action,now}) {
  return <div className="page-head production-page-head"><div><span>{kicker}</span><h1>{title}</h1><p>{sub}</p></div><div className="page-head-right">{now&&<div className="page-clock"><b>{formatClock(now)}</b><span>{formatDate(now)}</span></div>}{action}</div></div>;
}
function Card({children,className=''}) { return <section className={`card ${className}`}>{children}</section>; }
function Badge({children,tone='neutral'}) { return <span className={`badge ${tone}`}>{children}</span>; }
function SectionTitle({icon:Icon,title,aside}) { return <div className="section-title"><div>{Icon&&<Icon size={18}/>}<b>{title}</b></div>{aside}</div>; }
function Empty({text}) { return <div className="empty">{text}</div>; }
function Metric({icon:Icon,label,value,sub}) { return <Card className="metric"><div className="metric-icon"><Icon size={19}/></div><span>{label}</span><b>{value}</b><p>{sub}</p></Card>; }

function Dashboard({data,nextDose,adherence,lowStock,now}) {
  const auto = data.auto || {};
  const last = data.logs?.[0];
  return <>
    <Header kicker="Overview" title="Medication care at a glance" sub="Live dispenser state, dose schedule, adherence and attention items." now={now}/>
    <Card className="hero-card"><div><span className="eyebrow">Dispenser</span><h2>{friendlyState(auto.state || 'Ready')}</h2><p>{auto.message || 'System is ready for the next scheduled medication.'}</p></div><div className="hero-status"><ShieldCheck size={26}/><Badge tone={auto.alarm_active?'warning':'success'}>{auto.alarm_active?'Action needed':'Ready'}</Badge></div></Card>
    <div className="metrics">
      <Metric icon={Clock3} label="Next dose" value={nextDose?.med || 'No dose'} sub={nextDose ? `${nextDose.time} · Qty ${nextDose.qty || 1} · Comp ${nextDose.compartment ?? nextDose.comp ?? '-'}` : 'Nothing scheduled today'}/>
      <Metric icon={HeartPulse} label="Adherence" value={`${adherence.percent}%`} sub={`${adherence.verified} verified of ${adherence.total || 0} recorded events`}/>
      <Metric icon={PackageSearch} label="Low stock" value={String(lowStock.length)} sub={lowStock.length ? 'Medication needs attention' : 'Inventory healthy'}/>
      <Metric icon={Activity} label="Device" value={data.status ? 'Online' : 'Offline'} sub={data.status?.cpu_temp || 'No telemetry'}/>
    </div>
    <div className="two-col">
      <Card><SectionTitle icon={AlarmClock} title="Today’s schedule"/><div className="list">{(data.today||[]).slice(0,5).map(s=><div className="list-row" key={s.id}><div><b>{s.time} · {s.med}</b><span>{s.patient || 'Patient'} · Qty {s.qty || 1}</span></div><Badge>{`Comp ${s.compartment ?? s.comp ?? '-'}`}</Badge></div>)}{!data.today?.length&&<Empty text="No medication scheduled today."/>}</div></Card>
      <Card><SectionTitle icon={FileCheck2} title="Latest verification"/>{last?<div className="verification"><Badge tone={resultTone(last.outcome)}>{friendlyState(last.outcome)}</Badge><h3>{last.expected_med || 'Medication event'}</h3><p>{last.patient || 'Patient'} · {last.timestamp || ''}</p><div className="mini-grid"><div><span>Detected</span><b>{last.detected_med || '—'}</b></div><div><span>Confidence</span><b>{last.confidence ? `${last.confidence}%` : '—'}</b></div></div></div>:<Empty text="No dispense verification recorded yet."/>}</Card>
    </div>
  </>;
}

function Patients({patients=[],schedules=[],refresh,now}) {
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState('');
  const [form,setForm]=useState({name:'',rfid_uid:''});
  async function submit(e){
    e.preventDefault(); setMessage('');
    const name=form.name.trim();
    if(!name){setMessage('Patient name is required.');return;}
    const rfid=form.rfid_uid.trim() || `PENDING-${Date.now()}`;
    try{
      await api.post('/api/patient',{name,rfid_uid:rfid});
      setMessage('Patient added successfully.'); setOpen(false); setForm({name:'',rfid_uid:''}); await refresh();
    }catch(err){setMessage(`Could not add patient: ${err.message}`)}
  }
  return <>
    <Header kicker="Patient management" title="Patients" sub="Active patient profiles, schedule coverage and identification status." now={now} action={<button className="primary" onClick={()=>setOpen(v=>!v)}><Plus size={17}/> Add patient</button>}/>
    {message&&<div className="alert"><span>{message}</span></div>}
    {open&&<Card className="patient-form-card"><form className="form" onSubmit={submit}><label>Patient name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name" autoFocus/></label><label>RFID UID <span className="field-note">optional · hardware coming soon</span><input value={form.rfid_uid} onChange={e=>setForm({...form,rfid_uid:e.target.value})} placeholder="Leave blank until RFID is commissioned"/></label><div className="form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button className="primary" type="submit">Save patient</button></div></form></Card>}
    <Card><SectionTitle icon={Users} title="Active patients" aside={<Badge tone="success">{patients.length} active</Badge>}/>
      <div className="patient-table-wrap"><table className="patient-table"><thead><tr><th>Name</th><th>RFID UID</th><th>Schedules</th><th>Status</th></tr></thead><tbody>{patients.map(p=>{const count=Array.isArray(p.schedules)?p.schedules.length:schedules.filter(s=>String(s.patient_id)===String(p.id)||s.patient===p.name).length;return <tr key={p.id}><td><div className="patient-name"><span className="patient-avatar">{initials(p.name)}</span><b>{p.name}</b></div></td><td>{String(p.rfid||'').startsWith('PENDING-')?<Badge>Coming soon</Badge>:(p.rfid||'—')}</td><td>{count}</td><td><Badge tone="success">active</Badge></td></tr>})}</tbody></table>{!patients.length&&<Empty text="No active patient profile found."/>}</div>
    </Card>
    <Card className="rfid-roadmap"><div className="roadmap-icon"><Radio size={22}/></div><div><b>RFID Patient Identification</b><p>Automatic patient identification is planned for Hardware Revision 2. Current patient profiles remain fully usable without RFID.</p></div><Badge>Coming Soon</Badge></Card>
  </>;
}

function Medications({meds=[],ai=[],refresh,now}) {
  const [open,setOpen]=useState(false); const [message,setMessage]=useState('');
  const [form,setForm]=useState({name:'',ai_class_name:'custom',compartment:'1',stock_count:'30',low_stock_alert:'5'});
  async function submit(e){e.preventDefault();try{await api.post('/api/medications',{...form,compartment:Number(form.compartment),stock_count:Number(form.stock_count),low_stock_alert:Number(form.low_stock_alert),dose_mg:0,weight_per_pill:0.5});setMessage('Medication added.');setOpen(false);await refresh();}catch(err){setMessage(err.message)}}
  return <><Header kicker="Inventory" title="Medication" sub="Medication records, compartments, verification mode and stock." now={now} action={<button className="primary" onClick={()=>setOpen(!open)}>Add medication</button>}/>
  {message&&<div className="alert"><span>{message}</span></div>}
  {open&&<Card><form onSubmit={submit} className="form"><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><div className="form-grid"><label>Compartment<select value={form.compartment} onChange={e=>setForm({...form,compartment:e.target.value})}><option>1</option><option>3</option><option>5</option></select></label><label>Initial stock<input type="number" min="0" value={form.stock_count} onChange={e=>setForm({...form,stock_count:e.target.value})}/></label></div><label>Verification<select value={form.ai_class_name} onChange={e=>setForm({...form,ai_class_name:e.target.value})}><option value="custom">IR + Camera</option>{ai.map(x=><option key={x.ai_class} value={x.ai_class}>{x.label || x.ai_class} · AI + IR + Camera</option>)}</select></label><button className="primary" type="submit">Save medication</button></form></Card>}
  <div className="cards-list">{meds.map(m=><Card key={m.id}><div className="med-card"><div className="med-icon"><Pill/></div><div className="med-copy"><h3>{m.name}</h3><p>Compartment {m.compartment ?? '—'} · {m.ai_class && m.ai_class!=='custom' ? 'AI + IR + Camera' : 'IR + Camera'}</p><div className="med-meta"><Badge tone={Number(m.stock??0)<=5?'warning':'success'}>Stock {m.stock ?? 0}</Badge><Badge>{m.ai_class || 'custom'}</Badge></div></div></div></Card>)}{!meds.length&&<Card><Empty text="No medication has been registered."/></Card>}</div></>;
}

function Schedule({meds=[],patients=[],schedules=[],today=[],refresh,now}) {
  const [open,setOpen]=useState(false); const [msg,setMsg]=useState('');
  const [f,setF]=useState({patient_id:'1',medication_id:'',dose_time:'08:00',dose_quantity:'1',days_of_week:'0123456'});
  async function submit(e){e.preventDefault();const med=meds.find(m=>String(m.id)===String(f.medication_id));if(!med){setMsg('Select a medication.');return;}try{await api.post('/api/schedule',{patient_id:Number(f.patient_id),medication_id:Number(f.medication_id),dose_time:f.dose_time,dose_quantity:Number(f.dose_quantity),days_of_week:f.days_of_week,compartment:Number(med.compartment)});setMsg('Schedule saved.');setOpen(false);await refresh();}catch(err){setMsg(err.message)}}
  return <><Header kicker="Dose planning" title="Schedule" sub="Create and review recurring medication times." now={now} action={<button className="primary" onClick={()=>setOpen(!open)}>New schedule</button>}/>{msg&&<div className="alert"><span>{msg}</span></div>}
  {open&&<Card><form className="form" onSubmit={submit}><label>Patient<select value={f.patient_id} onChange={e=>setF({...f,patient_id:e.target.value})}>{patients.length?patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>):<option value="1">Default Patient</option>}</select></label><label>Medication<select value={f.medication_id} onChange={e=>setF({...f,medication_id:e.target.value})}><option value="">Select medication</option>{meds.map(m=><option key={m.id} value={m.id}>{m.name} · Comp {m.compartment}</option>)}</select></label><div className="form-grid"><label>Time<input type="time" value={f.dose_time} onChange={e=>setF({...f,dose_time:e.target.value})}/></label><label>Quantity<input type="number" min="1" value={f.dose_quantity} onChange={e=>setF({...f,dose_quantity:e.target.value})}/></label></div><label>Days<select value={f.days_of_week} onChange={e=>setF({...f,days_of_week:e.target.value})}><option value="0123456">Every day</option><option value="01234">Weekdays</option><option value="56">Weekend</option></select></label><button className="primary">Save schedule</button></form></Card>}
  <Card><SectionTitle icon={Clock3} title="Today"/><div className="timeline">{today.map(s=><div className="timeline-row" key={s.id}><span className="time">{s.time}</span><div><b>{s.med}</b><p>{s.patient || 'Patient'} · Qty {s.qty || 1}</p></div><Badge>Comp {s.compartment ?? s.comp ?? '—'}</Badge></div>)}{!today.length&&<Empty text="No doses scheduled today."/>}</div></Card>
  <Card><SectionTitle icon={Database} title="Active schedules"/><div className="list">{schedules.map(s=><div className="list-row" key={s.id}><div><b>{s.time} · {s.med}</b><span>{s.patient || 'Patient'} · Days {s.days || '—'}</span></div><Badge>Comp {s.compartment ?? s.comp ?? '—'}</Badge></div>)}{!schedules.length&&<Empty text="No active schedules."/>}</div></Card></>;
}

function Adherence({logs=[],adherence,now}) {
  const misses=logs.filter(x=>String(x.outcome).toLowerCase().includes('miss'));
  return <><Header kicker="Medication behaviour" title="Adherence" sub="Understand verified doses, missed doses and exceptions." now={now}/><div className="metrics"><Metric icon={HeartPulse} label="Adherence" value={`${adherence.percent}%`} sub="Based on recorded dispense outcomes"/><Metric icon={ShieldCheck} label="Verified" value={String(adherence.verified)} sub="Successful medication events"/><Metric icon={Bell} label="Missed" value={String(misses.length)} sub="Events requiring review"/></div><Card><SectionTitle icon={Activity} title="Activity history"/><div className="list">{logs.map(l=><div className="list-row" key={l.id}><div><b>{l.expected_med || 'Medication event'}</b><span>{l.patient || 'Patient'} · {l.timestamp || ''}</span></div><Badge tone={resultTone(l.outcome)}>{friendlyState(l.outcome)}</Badge></div>)}{!logs.length&&<Empty text="No adherence records yet."/>}</div></Card></>;
}

function Evidence({rows=[],refresh,now}) {
  return <><Header kicker="Verification audit" title="Evidence" sub="Camera evidence and dose verification records." now={now} action={<button onClick={refresh}><RefreshCcw size={16}/> Refresh</button>}/><div className="evidence-feed">{rows.map((e,i)=>{const img=resolveAsset(e.annotated_url||e.raw_url||e.image_url||e.preview_url||e.annotated_image_path||e.raw_image_path);const decision=e.decision||e.outcome||'Recorded';return <Card className="evidence-card-next" key={e.evidence_id||e.id||i}>{img?<img src={img} alt="Medication evidence"/>:<div className="evidence-placeholder"><Camera/><span>No image</span></div>}<div className="evidence-copy"><div><Badge tone={resultTone(decision)}>{friendlyState(decision)}</Badge><h3>{e.expected_name||e.medication||e.med||'Medication'}</h3><p>{e.created_at||e.dose_time||''}</p></div><div className="mini-grid three"><div><span>Compartment</span><b>{e.compartment??'—'}</b></div><div><span>Count</span><b>{e.ir_actual_count??'—'}/{e.ir_target_count??e.dose_quantity??'—'}</b></div><div><span>Mode</span><b>{friendlyState(e.verification_mode||'verification')}</b></div></div></div></Card>})}{!rows.length&&<Card><Empty text="No evidence record found yet."/></Card>}</div></>;
}

function Caregiver({now}) { return <><Header kicker="Care network" title="Caregiver" sub="Escalations, caregiver access and remote care workflows." now={now}/><Card><SectionTitle icon={Users} title="Caregiver access"/><Empty text="No caregiver has been configured yet."/><button className="primary" disabled>Invite caregiver · Coming soon</button></Card><Card><SectionTitle icon={Bell} title="Escalation policy"/><div className="setting-list"><SettingToggle label="Missed medication" sub="Escalate when a dose is not confirmed."/><SettingToggle label="Verification failure" sub="Alert when dose count or AI verification fails."/><SettingToggle label="Low stock" sub="Alert before medication inventory is exhausted."/></div></Card></>; }

function Device({status,auto,now}) { return <><Header kicker="Hardware" title="Device" sub="Live dispenser health and Hardware Revision 1 capabilities." now={now}/><div className="metrics"><Metric icon={Wifi} label="Connection" value={status?'Online':'Offline'} sub="Raspberry Pi dispenser"/><Metric icon={Activity} label="CPU temperature" value={status?.cpu_temp||'—'} sub="Live system telemetry"/><Metric icon={AlarmClock} label="Auto dispense" value={friendlyState(auto?.state||'Unknown')} sub={auto?.message||'Scheduler status'}/></div><Card><SectionTitle icon={Smartphone} title="Dispensing channels"/><div className="channel-grid">{[1,3,5].map(n=><div className="channel ready" key={n}><b>Compartment {n}</b><span>Ready · Revision 1</span></div>)}{[2,4,6].map(n=><div className="channel future" key={n}><b>Compartment {n}</b><span>Hardware Revision 2</span></div>)}</div></Card><Card className="rfid-roadmap"><div className="roadmap-icon"><Radio size={22}/></div><div><b>RFID Patient Identification</b><p>Not fitted in Hardware Revision 1. Planned as a future patient-identification module.</p></div><Badge>Coming Soon</Badge></Card></>; }

function SettingsPage({theme,changeTheme,status,refresh,now}) {
  const [serverDraft,setServerDraft]=useState(getServer());
  const [tone,setTone]=useState(localStorage.getItem('medsystem_alarm_tone')||'Classic Ding');
  const [volume,setVolume]=useState(Number(localStorage.getItem('medsystem_alarm_volume')||75));
  const [flags,setFlags]=useState({missed:true,lowStock:true,wrongPill:true,snooze:true});
  const [message,setMessage]=useState('');
  function saveTone(v){setTone(v);localStorage.setItem('medsystem_alarm_tone',v)}
  function saveVolume(v){setVolume(v);localStorage.setItem('medsystem_alarm_volume',String(v))}
  function testTone(){try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();const o=c.createOscillator();const g=c.createGain();o.frequency.value=tone.includes('Urgent')?1040:tone.includes('Gentle')?620:880;g.gain.value=Math.max(.02,volume/500);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.35);setMessage(`Playing ${tone}`)}catch(e){setMessage('Audio preview unavailable')}}
  function saveServer(){setServer(serverDraft);setMessage('Server saved. Refresh the page if the address changed.');refresh();}
  return <><Header kicker="System preferences" title="Settings" sub="Alarm, notification, display, connection and system information." now={now}/>
    <Card><SectionTitle icon={Volume2} title="Alarm & sound settings"/><div className="setting-block"><div><b>Default alarm tone</b><span>Used for all new alarms unless overridden</span></div><select value={tone} onChange={e=>saveTone(e.target.value)}>{ALARM_TONES.map(x=><option key={x}>{x}</option>)}</select></div><div className="setting-block"><div><b>Alert volume</b><span>Speaker output level</span></div><div className="range-row"><input type="range" min="0" max="100" value={volume} onChange={e=>saveVolume(Number(e.target.value))}/><b>{volume}%</b></div></div><div className="setting-block inline"><div><b>Test alarm tone</b><span>Preview currently selected tone</span></div><button onClick={testTone}>▶ Play</button></div>{message&&<p className="setting-message">{message}</p>}</Card>
    <Card><SectionTitle icon={Bell} title="Notification settings"/><div className="setting-list"><SettingToggle label="Missed dose alert" sub="Alert on dashboard when dose not confirmed" checked={flags.missed} onChange={v=>setFlags({...flags,missed:v})}/><SettingToggle label="Low stock warning" sub="Banner when pills drop below 5" checked={flags.lowStock} onChange={v=>setFlags({...flags,lowStock:v})}/><SettingToggle label="Wrong pill alert" sub="Red LED + urgent tone on AI mismatch" checked={flags.wrongPill} onChange={v=>setFlags({...flags,wrongPill:v})}/><SettingToggle label="Auto-snooze" sub="Repeat alarm if not confirmed in 5 minutes" checked={flags.snooze} onChange={v=>setFlags({...flags,snooze:v})}/></div></Card>
    <Card><SectionTitle icon={Activity} title="System info"/><div className="info-grid"><Info label="Device" value="Raspberry Pi 4B"/><Info label="AI model" value="YOLOv8n ONNX · 112 classes"/><Info label="Firmware" value="MedSystem v2.0 UI · HW Rev 1"/><Info label="CPU temp" value={status?.cpu_temp||'Unavailable'}/></div></Card>
    <Card><SectionTitle icon={Settings} title="Display & connection"/><div className="setting-block"><div><b>Appearance</b><span>Choose the application theme</span></div><div className="segmented-next"><button className={theme==='light'?'active':''} onClick={()=>changeTheme('light')}>Light</button><button className={theme==='dark'?'active':''} onClick={()=>changeTheme('dark')}>Dark</button></div></div><div className="setting-block"><div><b>Dispenser server</b><span>Advanced connection address</span></div><div className="server-row"><input value={serverDraft} onChange={e=>setServerDraft(e.target.value)}/><button className="primary" onClick={saveServer}>Save</button></div></div></Card>
  </>;
}

function SettingToggle({label,sub,checked=true,onChange=()=>{}}){return <label className="setting-toggle"><div><b>{label}</b><span>{sub}</span></div><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i></i></label>}
function Info({label,value}){return <div><span>{label}</span><b>{value}</b></div>}
function initials(name=''){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'P'}
function friendlyState(v){return String(v||'—').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function resultTone(v){const s=String(v||'').toLowerCase();if(s.includes('success')||s.includes('verif'))return 'success';if(s.includes('miss')||s.includes('wrong')||s.includes('error')||s.includes('fail'))return 'danger';return 'neutral'}
function getNextDose(schedule=[]){if(!schedule.length)return null;const now=new Date();const mins=now.getHours()*60+now.getMinutes();return schedule.map(s=>{const [h,m]=String(s.time||'00:00').split(':').map(Number);const x=h*60+m;return {...s,_delta:x>=mins?x-mins:1440-mins+x}}).sort((a,b)=>a._delta-b._delta)[0]}
function getAdherence(logs=[]){const total=logs.length;const verified=logs.filter(l=>{const s=String(l.outcome||'').toLowerCase();return s.includes('success')||s.includes('verified')||s.includes('custom_named')}).length;return {total,verified,percent:total?Math.round(verified/total*100):0}}

createRoot(document.getElementById('root')).render(<App/>);
