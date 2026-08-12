import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/main-prod.jsx');
let text = fs.readFileSync(file, 'utf8');

if (!text.includes("import './login.css';")) {
  text = text.replace("import './prod.css';", "import './prod.css';\nimport './login.css';");
}

if (!text.includes('function LoginScreen(')) {
  const anchor = "function App(){";
  const login = `function LoginScreen({onLogin}){\n  const [username,setUsername]=useState('admin');\n  const [password,setPassword]=useState('');\n  const [showPassword,setShowPassword]=useState(false);\n  const [remember,setRemember]=useState(true);\n  const [error,setError]=useState('');\n\n  function submit(e){\n    e.preventDefault();\n    const savedUser=localStorage.getItem('medsystem_login_user')||'admin';\n    const savedPassword=localStorage.getItem('medsystem_login_password')||'1234';\n    if(username.trim()===savedUser && password===savedPassword){\n      setError('');\n      onLogin({remember});\n      return;\n    }\n    setError('Incorrect username or password.');\n  }\n\n  return <div className=\"login-shell\">\n    <section className=\"login-brand-panel\">\n      <div className=\"login-brand-top\"><img src={APP_MARK} alt=\"MedSystem\"/><span><b>MedSystem</b><small>Smart medication care</small></span></div>\n      <div className=\"login-brand-copy\">\n        <span className=\"login-kicker\">Medication management · Hardware Revision 1</span>\n        <h1>Medication care with verification built in.</h1>\n        <p>Manage patients, schedules, dispensing, adherence and evidence from one focused interface connected directly to the MedSystem dispenser.</p>\n        <div className=\"login-feature-row\"><span>IR pill counting</span><span>Camera evidence</span><span>AI-assisted verification</span><span>Offline-first dispenser</span></div>\n      </div>\n      <div className=\"login-brand-foot\"><ShieldCheck size={16}/> Local MedSystem device access</div>\n    </section>\n    <section className=\"login-panel\">\n      <div className=\"login-card\">\n        <div className=\"login-mobile-brand\"><img src={APP_MARK} alt=\"MedSystem\"/><span><b>MedSystem</b><small>Smart medication care</small></span></div>\n        <span>Secure access</span>\n        <h2>Welcome back</h2>\n        <p>Sign in to manage the dispenser, patient medication schedules and verification records.</p>\n        <form className=\"login-form\" onSubmit={submit}>\n          {error&&<div className=\"login-error\"><CircleAlert size={16}/><span>{error}</span></div>}\n          <div className=\"login-field\"><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete=\"username\" placeholder=\"Enter username\"/></div>\n          <div className=\"login-field\"><label>Password</label><div className=\"login-password\"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete=\"current-password\" placeholder=\"Enter password\" autoFocus/><button type=\"button\" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<Eye size={17}/>:<Eye size={17}/>}</button></div></div>\n          <div className=\"login-options\"><label className=\"login-remember\"><input type=\"checkbox\" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Keep me signed in on this device</label><span className=\"login-help\">Administrator access</span></div>\n          <button className=\"login-submit\" type=\"submit\"><ShieldCheck size={17}/> Sign in to MedSystem</button>\n        </form>\n        <div className=\"login-security-note\"><ShieldCheck size={16}/><span>This login currently protects access to the dashboard/app interface. Backend role-based authentication remains a separate security layer for the production cloud release.</span></div>\n      </div>\n    </section>\n  </div>\n}\n\n`;
  text = text.replace(anchor, login + anchor);
}

if (!text.includes("medsystem_v2_authenticated")) {
  text = text.replace(
    "function App(){\n  const [active,setActive]=useState('dashboard');",
    "function App(){\n  const [authenticated,setAuthenticated]=useState(()=>localStorage.getItem('medsystem_v2_authenticated')==='true'||sessionStorage.getItem('medsystem_v2_authenticated')==='true');\n  const [active,setActive]=useState('dashboard');"
  );

  text = text.replace(
    "  const now=useClock();",
    "  const now=useClock();\n  function handleLogin({remember}){const store=remember?localStorage:sessionStorage;const other=remember?sessionStorage:localStorage;store.setItem('medsystem_v2_authenticated','true');other.removeItem('medsystem_v2_authenticated');setAuthenticated(true)}\n  function handleLogout(){localStorage.removeItem('medsystem_v2_authenticated');sessionStorage.removeItem('medsystem_v2_authenticated');setAuthenticated(false);setMenuOpen(false)}"
  );

  text = text.replace(
    "  return <div className={`app theme-${theme}`}>",
    "  if(!authenticated)return <LoginScreen onLogin={handleLogin}/>;\n  return <div className={`app theme-${theme}`}>"
  );

  text = text.replace(
    '<button className="icon-button" onClick={refresh} title="Refresh"><RefreshCcw size={18} className={loading?\'spin\':\'\'}/></button>',
    '<button className="icon-button" onClick={refresh} title="Refresh"><RefreshCcw size={18} className={loading?\'spin\':\'\'}/></button><button className="icon-button logout-button" onClick={handleLogout} title="Sign out" aria-label="Sign out"><Power size={18}/></button>'
  );
}

fs.writeFileSync(file, text);
console.log('MedSystem login screen applied.');
