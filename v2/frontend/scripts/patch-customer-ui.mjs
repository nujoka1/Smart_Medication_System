import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main-prod.jsx');
let text = fs.readFileSync(file, 'utf8');

const replacements = [
  ['Smart medication care', 'Medication care'],
  ['Medication management · Hardware Revision 1', 'Personal medication management'],
  ['Medication care with verification built in.', 'Medication care, made simple.'],
  ['Manage patients, schedules, dispensing, adherence and evidence from one focused interface connected directly to the MedSystem dispenser.', 'Manage medications, schedules, dose history and verification records in one clear, secure place.'],
  ['IR pill counting', 'Dose counting'],
  ['Camera evidence', 'Dose verification'],
  ['AI-assisted verification', 'Smart verification'],
  ['Offline-first dispenser', 'Reliable local operation'],
  ['Local MedSystem device access', 'Secure MedSystem access'],
  ['Sign in to manage the dispenser, patient medication schedules and verification records.', 'Sign in to manage medications, schedules, reminders and verification records.'],
  ['Administrator access', 'Secure access'],
  ['This login currently protects access to the dashboard/app interface. Backend role-based authentication remains a separate security layer for the production cloud release.', 'Your sign-in helps protect access to medication information and MedSystem controls.'],
  ['Hardware Revision 1', 'Medication system'],
  ['Coming Soon · Rev 2', 'Coming soon'],
  ['Planned for Hardware Revision 2. Patient profiles are fully functional without RFID.', 'Planned for a future MedSystem update. Patient profiles work normally without RFID.'],
  ['Live dispenser state, dose schedule, adherence and attention items.', 'See upcoming doses, adherence, medication stock and important alerts.'],
  ['System is ready for the next scheduled medication.', 'Everything is ready for the next scheduled dose.'],
  ['Smart Medication Companion · Hardware Revision 1', 'Smart medication management, built around safer daily routines.'],
  ['Sound, notifications, appearance, connection and system information.', 'Choose how MedSystem looks, sounds and notifies you.'],
  ['Appearance & connection', 'Appearance'],
  ['Neutral clinical interface', 'Clear, comfortable interface'],
  ['Medication records, verification method, compartment and stock lifecycle.', 'Manage medications, compartments, stock levels and verification preferences.'],
  ['AI + IR + Camera', 'Smart verification'],
  ['IR + Camera', 'Dose verification']
];

for (const [from, to] of replacements) {
  text = text.split(from).join(to);
}

// Remove customer-irrelevant server configuration from Settings.
text = text.replace(
  /<label className="setting-field"><span><b>Dispenser server<\/b><small>Current Raspberry Pi API address<\/small><\/span><div className="inline-input"><input value=\{serverDraft\} onChange=\{e=>setServerDraft\(e\.target\.value\)\}\/><button className="primary" onClick=\{saveServer\}>Save<\/button><\/div><\/label>/g,
  ''
);

// Remove internal implementation details such as board/model/CPU temperature from customer Settings.
text = text.replace(
  /<Card><SectionTitle icon=\{Activity\} title="System info"\/><div className="detail-grid">.*?<\/div><\/Card>/g,
  ''
);

// Replace the engineering-oriented Device page with a customer-facing System page.
text = text.replace(
  /function Device\(\{status,auto,now\}\)\{return .*?\}\n\nfunction SettingsPage/s,
  `function Device({status,auto,now}){return <><Header kicker="My MedSystem" title="System" sub="Connection, readiness and available medication compartments." now={now}/><div className="metrics"><Metric icon={Wifi} label="Connection" value={status?'Online':'Offline'} sub={status?'MedSystem is connected':'Check your MedSystem connection'}/><Metric icon={ShieldCheck} label="Medication status" value={nice(auto?.state||'Ready')} sub={auto?.message||'Ready for scheduled medication'}/><Metric icon={Pill} label="Available compartments" value="3 ready" sub="Compartments 1, 3 and 5"/></div><Card><SectionTitle icon={Pill} title="Medication compartments"/><div className="capability-grid">{[1,3,5].map(x=><div key={x}><CircleCheckBig size={18}/><span>Compartment {x}</span><Badge tone="success">Ready</Badge></div>)}{[2,4,6].map(x=><div key={x}><Radio size={18}/><span>Compartment {x}</span><Badge>Coming soon</Badge></div>)}</div></Card><Card className="brand-about"><img src={APP_ICON} alt="MedSystem app icon"/><div><b>MedSystem</b><p>Smart medication management with dose verification and adherence support.</p></div></Card></>}\n\nfunction SettingsPage`
);

// Rename the customer navigation item.
text = text.replace("['device','Device',Smartphone]", "['device','System',Smartphone]");

// Hide CPU temperature from the dashboard metric.
text = text.replace(
  `sub={data.status?.cpu_temp||'No telemetry'}`,
  `sub={data.status?'Medication system connected':'Connection unavailable'}`
);

// Replace technical medication verification class badge with customer-facing language.
text = text.replace(
  `<Badge>{m.ai_class||'custom'}</Badge>`,
  `<Badge>{m.ai_class&&m.ai_class!=='custom'?'Smart verification':'Standard verification'}</Badge>`
);

fs.writeFileSync(file, text);
console.log('Customer-facing MedSystem language and settings applied.');
