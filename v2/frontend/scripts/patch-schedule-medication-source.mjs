import fs from 'node:fs';

const file = new URL('../src/main-prod.jsx', import.meta.url);
let text = fs.readFileSync(file, 'utf8');

if (text.includes('AI-supported medication') && text.includes('Use registered medication') && text.includes('Medication not listed')) {
  console.log('Schedule medication source workflow already applied.');
  process.exit(0);
}

text = text.replace(
  "{active==='schedule'&&<Schedule meds={data.meds} patients={data.patients} schedules={data.schedules} today={data.today} refresh={refresh} activePatient={activePatient} now={now}/>} ",
  "{active==='schedule'&&<Schedule meds={data.meds} ai={data.ai} patients={data.patients} schedules={data.schedules} today={data.today} refresh={refresh} activePatient={activePatient} now={now}/>} "
);

const start = text.indexOf('function Schedule(');
const end = text.indexOf('\n\nfunction Adherence(', start);
if (start < 0 || end < 0) throw new Error('Could not locate Schedule component block.');

const replacement = String.raw`function Schedule({meds=[],ai=[],patients=[],schedules=[],today=[],refresh,activePatient,now}){
  const [addOpen,setAddOpen]=useState(false);const [edit,setEdit]=useState(null);const [confirm,setConfirm]=useState(null);const [msg,setMsg]=useState('');
  const [f,setF]=useState({patient_id:activePatient?.id||patients[0]?.id||'',source:'registered',medication_id:'',ai_class_name:'',custom_name:'',compartment:'1',stock_count:'30',dose_time:'08:00',dose_quantity:1,days_of_week:'0123456'});
  useEffect(()=>{if(activePatient)setF(x=>({...x,patient_id:activePatient.id}))},[activePatient]);
  async function add(e){e.preventDefault();try{
    if(!f.patient_id){setMsg('Select a patient.');return}
    let medicationId=f.medication_id;
    let compartment=1;
    if(f.source==='registered'){
      const med=meds.find(m=>String(m.id)===String(f.medication_id));
      if(!med){setMsg('Select a registered medication.');return}
      medicationId=med.id;compartment=Number(med.compartment||1);
    }else{
      const isAi=f.source==='ai';
      const aiItem=ai.find(x=>String(x.ai_class)===String(f.ai_class_name));
      const name=isAi?(aiItem?.label||f.ai_class_name):f.custom_name.trim();
      if(!name){setMsg(isAi?'Select an AI-supported medication.':'Enter the medication name.');return}
      const created=await api.post('/api/medications',{name,ai_class_name:isAi?f.ai_class_name:'custom',compartment:Number(f.compartment),stock_count:Number(f.stock_count),low_stock_alert:5,dose_mg:0,weight_per_pill:.5});
      medicationId=created.id;compartment=Number(f.compartment);
    }
    await api.post('/api/schedule',{patient_id:Number(f.patient_id),medication_id:Number(medicationId),dose_time:f.dose_time,dose_quantity:Number(f.dose_quantity),days_of_week:f.days_of_week,compartment});
    setAddOpen(false);setMsg('Medication schedule created.');await refresh();
  }catch(e){setMsg(e.message)}}
  async function save(e){e.preventDefault();try{await api.patch(\`/api/schedule/\${edit.id}\`,{patient_id:Number(edit.patient_id),medication_id:Number(edit.medication_id),dose_time:edit.time||edit.dose_time,dose_quantity:Number(edit.qty||edit.dose_quantity),days_of_week:edit.days||edit.days_of_week,active:edit.active!==false});setEdit(null);setMsg('Schedule updated.');await refresh()}catch(e){setMsg(e.message)}}
  async function toggle(s){try{await api.patch(\`/api/schedule/\${s.id}\`,{active:s.active===false?true:false});setMsg(\`Schedule \${s.active===false?'enabled':'disabled'}.\`);await refresh()}catch(e){setMsg(e.message)}}
  async function remove(s){try{await api.del(\`/api/schedule/\${s.id}\`);setConfirm(null);setMsg('Schedule deleted.');await refresh()}catch(e){setMsg(e.message)}}
  return <><Header kicker="Dose planning" title="Schedule" sub="Set when each medication should be prepared and how many pills are required." now={now} action={<button className="primary" onClick={()=>setAddOpen(true)}><Plus size={16}/> New schedule</button>}/>{msg&&<div className="alert"><span>{msg}</span></div>}
  <Card><SectionTitle icon={Clock3} title="Today's doses"/><div className="timeline">{today.map(s=><div className="timeline-row" key={s.id}><span className="time">{s.time}</span><div><b>{s.med}</b><p>{s.patient||'Patient'} · Qty {s.qty||1}</p></div><Badge>Comp {s.compartment??s.comp??'—'}</Badge></div>)}{!today.length&&<Empty text="No doses scheduled today."/>}</div></Card>
  <Card><SectionTitle icon={AlarmClock} title="Medication schedules"/><div className="list">{schedules.map(s=><div className="list-row schedule-row" key={s.id}><div><b>{s.time} · {s.med}</b><span>{s.patient||'Patient'} · Qty {s.qty||1}</span></div><div className="row-actions"><Badge tone={s.active===false?'neutral':'success'}>{s.active===false?'Paused':'Active'}</Badge><button onClick={()=>setEdit({...s})}>Edit</button><ActionMenu items={[{label:s.active===false?'Resume schedule':'Pause schedule',icon:Power,onClick:()=>toggle(s)},{label:'Delete schedule',icon:Trash2,danger:true,onClick:()=>setConfirm(s)}]}/></div></div>)}{!schedules.length&&<Empty text="No medication schedules yet."/>}</div></Card>
  <MedicationScheduleModal open={addOpen} form={f} setForm={setF} meds={meds} ai={ai} patients={patients} onClose={()=>setAddOpen(false)} onSubmit={add}/>
  <RegisteredScheduleEditModal open={!!edit} form={edit} setForm={setEdit} meds={meds} patients={patients} onClose={()=>setEdit(null)} onSubmit={save}/>
  <ConfirmDialog open={!!confirm} danger title="Delete schedule?" body={confirm?\`The \${confirm.med||'medication'} schedule will be removed.\`:''} confirmLabel="Delete schedule" onClose={()=>setConfirm(null)} onConfirm={()=>remove(confirm)}/></>;
}

function MedicationScheduleModal({open,form,setForm,meds=[],ai=[],patients=[],onClose,onSubmit}){
  if(!open)return null;
  const source=form.source||'registered';
  return <div className="modal-backdrop"><div className="modal edit-modal schedule-source-modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><h3>Create medication schedule</h3><p className="modal-sub">Choose the medication the same way you would on the MedSystem screen.</p><form className="form" onSubmit={onSubmit}>
    <label>Patient<select value={form.patient_id||''} onChange={e=>setForm({...form,patient_id:e.target.value})}><option value="">Select patient</option>{patients.filter(p=>p.active!==false).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="med-source-options">
      <button type="button" className={source==='ai'?'med-source-card selected':'med-source-card'} onClick={()=>setForm({...form,source:'ai',medication_id:'',custom_name:''})}><b>AI-supported medication</b><span>Choose from medications MedSystem can visually verify.</span></button>
      <button type="button" className={source==='registered'?'med-source-card selected':'med-source-card'} onClick={()=>setForm({...form,source:'registered',ai_class_name:'',custom_name:''})}><b>Use registered medication</b><span>Choose a medication already saved in MedSystem.</span></button>
      <button type="button" className={source==='custom'?'med-source-card selected':'med-source-card'} onClick={()=>setForm({...form,source:'custom',medication_id:'',ai_class_name:''})}><b>Medication not listed</b><span>Add a medication that will use pill counting and camera records.</span></button>
    </div>
    {source==='ai'&&<><label>Medication<select value={form.ai_class_name||''} onChange={e=>setForm({...form,ai_class_name:e.target.value})}><option value="">Select AI-supported medication</option>{ai.map(x=><option key={x.ai_class} value={x.ai_class}>{x.label||nice(x.ai_class)}</option>)}</select></label><NewMedicationFields form={form} setForm={setForm}/></>}
    {source==='registered'&&<label>Medication<select value={form.medication_id||''} onChange={e=>setForm({...form,medication_id:e.target.value})}><option value="">Select registered medication</option>{meds.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
    {source==='custom'&&<><label>Medication name<input value={form.custom_name||''} onChange={e=>setForm({...form,custom_name:e.target.value})} placeholder="Enter medication name"/></label><NewMedicationFields form={form} setForm={setForm}/></>}
    <div className="form-grid"><label>Time<input type="time" value={form.dose_time||'08:00'} onChange={e=>setForm({...form,dose_time:e.target.value})}/></label><label>Quantity<input type="number" min="1" max="5" value={form.dose_quantity||1} onChange={e=>setForm({...form,dose_quantity:e.target.value})}/></label></div>
    <label>Repeat<select value={form.days_of_week||'0123456'} onChange={e=>setForm({...form,days_of_week:e.target.value})}><option value="0123456">Every day</option><option value="01234">Weekdays</option><option value="56">Weekends</option></select></label>
    <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">Save schedule</button></div>
  </form></div></div>;
}

function NewMedicationFields({form,setForm}){return <div className="form-grid"><label>Compartment<select value={form.compartment||'1'} onChange={e=>setForm({...form,compartment:e.target.value})}><option value="1">Compartment 1</option><option value="3">Compartment 3</option><option value="5">Compartment 5</option></select></label><label>Starting stock<input type="number" min="0" value={form.stock_count||30} onChange={e=>setForm({...form,stock_count:e.target.value})}/></label></div>}

function RegisteredScheduleEditModal({open,form,setForm,meds=[],patients=[],onClose,onSubmit}){if(!open)return null;return <div className="modal-backdrop"><div className="modal edit-modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><h3>Edit schedule</h3><form className="form" onSubmit={onSubmit}><label>Patient<select value={form.patient_id||''} onChange={e=>setForm({...form,patient_id:e.target.value})}>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Medication<select value={form.medication_id||''} onChange={e=>setForm({...form,medication_id:e.target.value})}>{meds.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><div className="form-grid"><label>Time<input type="time" value={form.time||form.dose_time||'08:00'} onChange={e=>setForm({...form,time:e.target.value})}/></label><label>Quantity<input type="number" min="1" max="5" value={form.qty||form.dose_quantity||1} onChange={e=>setForm({...form,qty:e.target.value})}/></label></div><label>Repeat<select value={form.days||form.days_of_week||'0123456'} onChange={e=>setForm({...form,days:e.target.value})}><option value="0123456">Every day</option><option value="01234">Weekdays</option><option value="56">Weekends</option></select></label><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">Update schedule</button></div></form></div></div>}
`;

text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync(file, text);
console.log('Aligned schedule medication selection with TFT workflow.');
