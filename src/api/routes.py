from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from src.core.database import init_db, get_session, Patient, Medication, Schedule, DispenseLog
from config import APIConfig
from pathlib import Path

app = Flask(__name__, template_folder='../../templates', static_folder='../../static')
app.config['SECRET_KEY'] = APIConfig.SECRET_KEY
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')
_engine = None

def get_engine():
    global _engine
    if _engine is None: _engine = init_db()
    return _engine

@app.route('/')
def index(): return render_template('dashboard.html')

@app.route('/api/summary')
def summary():
    with get_session(get_engine()) as s:
        total = s.query(DispenseLog).count()
        ok    = s.query(DispenseLog).filter_by(outcome='success').count()
        miss  = s.query(DispenseLog).filter_by(outcome='missed').count()
        err   = s.query(DispenseLog).filter_by(outcome='wrong_pill').count()
        cust  = s.query(DispenseLog).filter_by(outcome='custom_named').count()
        pat   = s.query(Patient).filter_by(active=True).count()
        return jsonify(dict(total=total, success=ok+cust, missed=miss,
                            errors=err, active_patients=pat,
                            success_rate=round((ok+cust)/total*100,1) if total else 0))

@app.route('/api/logs')
def logs():
    n = int(request.args.get('limit', 20))
    with get_session(get_engine()) as s:
        rows = s.query(DispenseLog).order_by(DispenseLog.timestamp.desc()).limit(n).all()
        return jsonify([dict(
            id=r.id,
            timestamp=r.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            patient=r.patient.name if r.patient else '-',
            expected_med=r.expected_med,
            detected_med=r.detected_med or '-',
            confidence=round(r.confidence*100,1) if r.confidence else None,
            outcome=r.outcome,
            notes=r.notes or '') for r in rows])

@app.route('/api/patients')
def patients():
    with get_session(get_engine()) as s:
        return jsonify([dict(id=p.id, name=p.name, rfid=p.rfid_uid, schedules=[dict(med=sch.medication.name,time=sch.dose_time) for sch in p.schedules if sch.active]) for p in s.query(Patient).filter_by(active=True).all()])

@app.route('/api/medications')
def medications():
    with get_session(get_engine()) as s:
        return jsonify([dict(
            id=m.id, name=m.name,
            ai_class=m.ai_class_name or 'custom',
            compartment=m.compartment,
            stock=m.stock_count,
            custom=not m.ai_class_name or m.ai_class_name == 'custom')
            for m in s.query(Medication).all()])

@app.route('/api/schedule/today')
def schedule_today():
    dow = str(datetime.now().weekday())
    with get_session(get_engine()) as s:
        rows = sorted([r for r in s.query(Schedule).filter_by(active=True).all()
                       if dow in r.days_of_week], key=lambda r: r.dose_time)
        return jsonify([dict(
            id=r.id, patient=r.patient.name, med=r.medication.name,
            ai_class=r.medication.ai_class_name or 'custom',
            custom_name=r.medication.name if (not r.medication.ai_class_name
                        or r.medication.ai_class_name == 'custom') else None,
            time=r.dose_time, qty=r.dose_quantity,
            compartment=r.medication.compartment) for r in rows])

@app.route('/api/schedules')
def schedules():
    with get_session(get_engine()) as s:
        rows = s.query(Schedule).filter_by(active=True).order_by(Schedule.dose_time).all()
        return jsonify([dict(
            id=r.id, patient=r.patient.name, med=r.medication.name,
            time=r.dose_time, qty=r.dose_quantity,
            days=r.days_of_week, comp=r.medication.compartment) for r in rows])

@app.route('/api/schedule', methods=['POST'])
def create_schedule():
    d = request.get_json()
    for k in ['patient_id','dose_time','dose_quantity','compartment','days_of_week']:
        if k not in d: return jsonify(dict(error=f'Missing {k}')), 400
    if 'medication_id' not in d and 'drug_name' not in d:
        return jsonify(dict(error='Provide medication_id or drug_name')), 400
    with get_session(get_engine()) as s:
        if 'medication_id' in d:
            med = s.get(Medication, d['medication_id'])
            if not med: return jsonify(dict(error='Medication not found')), 404
        else:
            med = Medication(
                name=d['drug_name'].strip(),
                ai_class_name='custom',
                dose_mg=d.get('dose_mg', 0),
                compartment=d['compartment'],
                stock_count=d.get('stock_count', 30),
                weight_per_pill=d.get('weight_per_pill', 0.5))
            s.add(med); s.flush()
        sch = Schedule(
            patient_id=d['patient_id'], medication_id=med.id,
            dose_time=d['dose_time'], dose_quantity=int(d['dose_quantity']),
            days_of_week=d['days_of_week'], active=True)
        s.add(sch); s.commit()
        socketio.emit('schedule_updated', dict(action='created', time=d['dose_time'], med=med.name))
        return jsonify(dict(success=True, schedule_id=sch.id, medication=med.name,
                            is_custom=med.ai_class_name == 'custom', time=sch.dose_time)), 201

@app.route('/api/schedule/<int:sid>', methods=['DELETE'])
def delete_schedule(sid):
    with get_session(get_engine()) as s:
        sch = s.get(Schedule, sid)
        if not sch: return jsonify(dict(error='Not found')), 404
        sch.active = False; s.commit()
        socketio.emit('schedule_updated', dict(action='deleted', id=sid))
        return jsonify(dict(success=True))

@app.route('/api/ir')
def ir_status():
    """Live IR sensor beam status for all 6 compartments."""
    try:
        import RPi.GPIO as GPIO
        from config import Pins
        status = {}
        for comp, pin in Pins.IR_SENSORS.items():
            try:
                state = GPIO.input(pin)
                status[comp] = "blocked" if state == GPIO.LOW else "clear"
            except Exception:
                status[comp] = "unknown"
        return jsonify(status)
    except Exception as e:
        return jsonify({i: "unknown" for i in range(6)})

@app.route('/api/status')
def api_status():
    import subprocess
    try: temp = subprocess.check_output(['vcgencmd','measure_temp']).decode().strip()
    except: temp = 'N/A'
    return jsonify(dict(
        time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        cpu_temp=temp,
        uptime=open('/proc/uptime').read().split()[0]+'s'))

def push_log_event(data): socketio.emit('new_log', data)

@socketio.on('connect')
def on_connect(): emit('connected', {'msg': 'MedSystem live'})

def start_api():
    socketio.run(app, host=APIConfig.HOST, port=APIConfig.PORT,
                 debug=False, use_reloader=False, allow_unsafe_werkzeug=True)


@app.route('/tft')
def tft_dashboard():
    return render_template('tft.html')



@app.route('/api/ai/classes')
def ai_supported_classes():
    class_file = Path('data/ai_classes.txt')
    if not class_file.exists():
        return jsonify([])

    classes = []
    for raw in class_file.read_text().splitlines():
        c = raw.strip()
        if not c:
            continue
        classes.append(dict(
            ai_class=c,
            label=c.replace('_', ' ').title()
        ))

    return jsonify(classes)


@app.route('/api/medications', methods=['POST'])
def create_medication_from_tft():
    d = request.get_json() or {}

    name = (d.get('name') or '').strip()
    if not name:
        return jsonify(dict(error='Medication name required')), 400

    ai_class_name = (d.get('ai_class_name') or 'custom').strip()

    try:
        compartment = int(d.get('compartment', 0))
        stock_count = int(d.get('stock_count', 30))
        low_stock_alert = int(d.get('low_stock_alert', 5))
        dose_mg = float(d.get('dose_mg', 0))
        weight_per_pill = float(d.get('weight_per_pill', 0.5))
    except Exception:
        return jsonify(dict(error='Invalid numeric medication field')), 400

    with get_session(get_engine()) as s:
        med = Medication(
            name=name,
            ai_class_name=ai_class_name,
            dose_mg=dose_mg,
            weight_per_pill=weight_per_pill,
            compartment=compartment,
            stock_count=stock_count,
            low_stock_alert=low_stock_alert
        )
        s.add(med)
        s.commit()

        return jsonify(dict(
            success=True,
            id=med.id,
            name=med.name,
            ai_class=med.ai_class_name,
            compartment=med.compartment,
            stock=med.stock_count,
            mode='ai_supported' if med.ai_class_name != 'custom' else 'custom_count_camera'
        )), 201




@app.route('/api/medications/<int:mid>/stock', methods=['POST'])
def update_medication_stock(mid):
    d = request.get_json() or {}

    if 'stock_count' not in d:
        return jsonify(dict(error='stock_count required')), 400

    try:
        stock_count = int(d.get('stock_count'))
    except Exception:
        return jsonify(dict(error='Invalid stock_count')), 400

    if stock_count < 0:
        return jsonify(dict(error='stock_count cannot be negative')), 400

    with get_session(get_engine()) as s:
        med = s.get(Medication, mid)
        if not med:
            return jsonify(dict(error='Medication not found')), 404

        med.stock_count = stock_count
        s.commit()

        socketio.emit('stock_updated', dict(
            medication_id=med.id,
            name=med.name,
            stock=med.stock_count
        ))

        return jsonify(dict(
            success=True,
            id=med.id,
            name=med.name,
            stock=med.stock_count,
            compartment=med.compartment
        ))


if __name__ == '__main__': start_api()

@app.route('/api/patient', methods=['POST'])
def add_patient():
    d = request.get_json()
    if not d.get('name') or not d.get('rfid_uid'):
        return jsonify(dict(error='name and rfid_uid required')), 400
    with get_session(get_engine()) as s:
        p = Patient(name=d['name'].strip(), rfid_uid=d['rfid_uid'].strip())
        s.add(p); s.commit()
        return jsonify(dict(success=True, id=p.id)), 201

@app.route('/api/patients/full')
def patients_full():
    with get_session(get_engine()) as s:
        rows = s.query(Patient).filter_by(active=True).all()
        return jsonify([dict(
            id=p.id, name=p.name, rfid=p.rfid_uid,
            schedules=[dict(med=sch.medication.name,time=sch.dose_time,qty=sch.dose_quantity)
                       for sch in p.schedules if sch.active])
            for p in rows])
