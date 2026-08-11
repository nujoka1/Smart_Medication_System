import fs from 'node:fs';

const file = new URL('../src/main-prod.jsx', import.meta.url);
let text = fs.readFileSync(file, 'utf8');

// Keep this patch repeat-safe.
if (text.includes('Save medication & create schedule')) {
  console.log('Patient-aware medication workflow already applied.');
  process.exit(0);
}

text = text.replace(
  "{active==='patients'&&<Patients patients={data.patients} schedules={data.schedules} refresh={refresh} choosePatient={choosePatient} now={now}/>}",
  "{active==='patients'&&<Patients patients={data.patients} schedules={data.schedules} refresh={refresh} choosePatient={choosePatient} go={go} now={now}/>}",
);

text = text.replace(
  "{active==='medications'&&<Medications meds={data.meds} ai={data.ai} refresh={refresh} now={now}/>}",
  "{active==='medications'&&<Medications meds={data.meds} ai={data.ai} patients={data.patients} schedules={data.schedules} activePatient={activePatient} refresh={refresh} go={go} now={now}/>}",
);

text = text.replace(
  'function Patients({patients=[],schedules=[],refresh,choosePatient,now})',
  'function Patients({patients=[],schedules=[],refresh,choosePatient,go,now})',
);

text = text.replace(
  "{label:'Set as active patient',icon:CircleCheckBig,onClick:()=>choosePatient(p.id)},{label:'Deactivate patient'",
  "{label:'Set as active patient',icon:CircleCheckBig,onClick:()=>choosePatient(p.id)},{label:'Assign medication',icon:Pill,onClick:()=>{choosePatient(p.id);go?.('medications')}},{label:'Deactivate patient'",
);

const start = text.indexOf('function Medications(');
const end = text.indexOf('\n\nfunction Schedule(', start);
if (start < 0 || end < 0) {
  throw new Error('Could not locate Medications component boundaries.');
}

const replacement = String.raw`function Medications({meds=[],ai=[],patients=[],schedules=[],activePatient,refresh,go,now}){
  const [addOpen,setAddOpen]=useState(false);const [edit,setEdit]=useState(null);const [refill,setRefill]=useState(null);const [confirm,setConfirm]=useState(null);const [msg,setMsg]=useState('');
  const [form,setForm]=useState({name:'',ai_class_name:'custom',compartment:'1',stock_count:'30',low_stock_alert:'5',patient_id:activePatient?.id||patients[0]?.id||'',create_schedule:true,dose_time:'08:00',dose_quantity:1,days_of_week:'0123456'});
  useEffect(()=>{if(activePatient)setForm(x=>({...x,patient_id:activePatient.id}))},[activePatient]);
  async function add(e){e.preventDefault();if(!form.patient_id){setMsg('Select the patient who will use this medication.');return}try{
    const med=await api.post('/api/medications',{name:form.name,ai_class_name:form.ai_class_name,compartment:Number(form.compartment),stock_count:Number(form.stock_count),low_stock_alert:Number(form.low_stock_alert),dose_mg:0,weight_per_pill:.5});
    if(form.create_schedule){await api.post('/api/schedule',{patient_id:Number(form.patient_id),medication_id:Number(med.id),dose_time:form.dose_time,dose_quantity:Number(form.dose_quantity),compartment:Number(form.compartment),days_of_week:form.days_of_week})}
    setAddOpen(false);setMsg(form.create_schedule?'Medication saved and schedule created.':'Medication saved for the selected patient.');await refresh();
  }catch(e){setMsg(e.message)}}
  async function save(e){e.preventDefault();try{await api.patch(\`/api/medications/\${edit.id}\`,{name:edit.name,ai_class_name:edit.ai_class||edit.ai_class_name||'custom',compartment:Number(edit.compartment),stock_count:Number(edit.stock??edit.stock_count??0),low_stock_alert:Number(edit.low_stock_alert??5)});setEdit(null);setMsg('Medication updated.');await refresh()}catch(e){setMsg(e.message)}}
  async function doRefill(e){e.preventDefault();try{await api.patch(\`/api/medications/\${refill.id}\`,{stock_count:Number(refill.newStock)});setRefill(null);setMsg('Stock updated.');await refresh()}catch(e){setMsg(e.message)}}
  async function reset(m){try{await api.patch(\`/api/medications/\${m.id}\`,{stock_count:0});setMsg('Stock reset to 0.');await refresh()}catch(e){setMsg(e.message)}}
  async function archive(m){try{await api.post(\`/api/medications/\${m.id}/archive\`,{});setMsg(\`\${m.name} archived from active schedules.\`);await refresh()}catch(e){setMsg(e.message)}}
  async function remove(m){try{await api.del(\`/api/medications/\${m.id}\`);setConfirm(null);setMsg('Medication deleted.');await refresh()}catch(e){setMsg(e.message)}}
  const assignedPatients=(m)=>patients.filter(p=>schedules.some(s=>(String(s.medication_id)===String(m.id)||s.med===m.name)&&(String(s.patient_id)===String(p.id)||s.patient===p.name)));
  return <><Header kicker="Inventory" title="Medication" sub="Assign medication to a patient, configure the dispenser compartment and optionally create the first dose schedule in one workflow." now={now} action={<button className="primary" onClick={()=>setAddOpen(true)}><Plus size={16}/> Add medication</button>}/>{msg&&<div className="alert"><span>{msg}</span></div>}
  <div className="cards-list med-grid">{meds.map(m=>{const owners=assignedPatients(m);return <Card key={m.id} className="med-product-card"><div className="med-card"><div className="med-icon"><Pill/></div><div className="med-copy"><h3>{m.name}</h3><p>Compartment {m.compartment??'—'} · {m.ai_class&&m.ai_class!=='custom'?'AI + IR + Camera':'IR + Camera'}</p><div className="med-meta"><Badge tone={Number(m.stock??0)<=5?'warning':'success'}>{m.stock??0} in stock</Badge><Badge>{owners.length?owners.map(p=>p.name).join(', '):'Not scheduled to a patient'}</Badge></div></div><div className="med-actions"><button onClick={()=>setEdit({...m})}>Edit</button><button className="primary ghost-primary" onClick={()=>setRefill({...m,newStock:m.stock??0})}>Refill</button><ActionMenu items={[{label:'Create / assign schedule',icon:CalendarClock,onClick:()=>go?.('schedule')},{label:'Reset stock',icon:RotateCcw,onClick:()=>reset(m)},{label:'Archive schedules',icon:Archive,onClick:()=>archive(m)},{label:'Delete permanently',icon:Trash2,danger:true,onClick:()=>setConfirm(m)}]}/></div></div></Card>})}{!meds.length&&<Card><Empty text="No medication registered."/></Card>}</div>
  <EditModal open={addOpen} title="Add medication" onClose={()=>setAddOpen(false)}><form className="form" onSubmit={add}>
    <label>Patient<select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})}><option value="">Select patient</option>{patients.filter(p=>p.active!==false).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Medication name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="e.g. Paracetamol 500 mg"/></label>
    <div className="form-grid"><label>Compartment<select value={form.compartment} onChange={e=>setForm({...form,compartment:e.target.value})}><option value="1">1 · Available</option><option value="2" disabled>2 · Hardware Rev 2</option><option value="3">3 · Available</option><option value="4" disabled>4 · Hardware Rev 2</option><option value="5">5 · Available</option><option value="6" disabled>6 · Hardware Rev 2</option></select></label><label>Initial stock<input type="number" min="0" value={form.stock_count} onChange={e=>setForm({...form,stock_count:e.target.value})}/></label></div>
    <div className="form-grid"><label>Low-stock warning<input type="number" min="0" value={form.low_stock_alert} onChange={e=>setForm({...form,low_stock_alert:e.target.value})}/></label><label>Verification<select value={form.ai_class_name} onChange={e=>setForm({...form,ai_class_name:e.target.value})}><option value="custom">IR + Camera</option>{ai.map(x=><option key={x.ai_class} value={x.ai_class}>{x.label||x.ai_class}</option>)}</select></label></div>
    <label className="schedule-choice"><span><b>Create first schedule now</b><small>Recommended — completes patient setup in one step.</small></span><input type="checkbox" checked={form.create_schedule} onChange={e=>setForm({...form,create_schedule:e.target.checked})}/></label>
    {form.create_schedule&&<div className="embedded-schedule"><div className="form-grid"><label>First dose time<input type="time" value={form.dose_time} onChange={e=>setForm({...form,dose_time:e.target.value})}/></label><label>Quantity<input type="number" min="1" value={form.dose_quantity} onChange={e=>setForm({...form,dose_quantity:e.target.value})}/></label></div><label>Repeat<select value={form.days_of_week} onChange={e=>setForm({...form,days_of_week:e.target.value})}><option value="0123456">Every day</option><option value="01234">Weekdays</option><option value="56">Weekend</option></select></label></div>}
    <div className="modal-actions"><button type="button" onClick={()=>setAddOpen(false)}>Cancel</button><button className="primary">{form.create_schedule?'Save medication & create schedule':'Save medication'}</button></div>
  </form></EditModal>
  <EditModal open={!!edit} title="Edit medication" onClose={()=>setEdit(null)}>{edit&&<form className="form" onSubmit={save}><label>Name<input value={edit.name||''} onChange={e=>setEdit({...edit,name:e.target.value})}/></label><div className="form-grid"><label>Compartment<select value={String(edit.compartment)} onChange={e=>setEdit({...edit,compartment:e.target.value})}><option>1</option><option>3</option><option>5</option></select></label><label>Stock<input type="number" min="0" value={edit.stock??edit.stock_count??0} onChange={e=>setEdit({...edit,stock:e.target.value})}/></label></div><label>Verification<select value={edit.ai_class||edit.ai_class_name||'custom'} onChange={e=>setEdit({...edit,ai_class:e.target.value})}><option value="custom">IR + Camera</option>{ai.map(x=><option key={x.ai_class} value={x.ai_class}>{x.label||x.ai_class}</option>)}</select></label><div className="modal-actions"><button type="button" onClick={()=>setEdit(null)}>Cancel</button><button className="primary">Update medication</button></div></form>}</EditModal>
  <EditModal open={!!refill} title={\`Refill \${refill?.name||''}\`} onClose={()=>setRefill(null)}>{refill&&<form className="form" onSubmit={doRefill}><label>New stock count<input type="number" min="0" value={refill.newStock} onChange={e=>setRefill({...refill,newStock:e.target.value})}/></label><div className="modal-actions"><button type="button" onClick={()=>setRefill(null)}>Cancel</button><button className="primary">Update stock</button></div></form>}</EditModal>
  <ConfirmDialog open={!!confirm} danger title="Delete medication permanently?" body={confirm?\`\${confirm.name} will be removed. Active schedules may also be affected.\`:''} confirmLabel="Delete medication" onClose={()=>setConfirm(null)} onConfirm={()=>remove(confirm)}/></>;
}`;

text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync(file, text);
console.log('Applied patient-aware medication setup workflow.');
