"""MedSystem V2 mutation routes.
Adds production CRUD operations without disturbing the existing V1/TFT routes.
Imported by run_api_8080.py after src.api.routes initializes the Flask app.
"""
from flask import jsonify, request
from sqlalchemy.exc import IntegrityError
from src.api.routes import app, get_engine, socketio
from src.core.database import get_session, Patient, Medication, Schedule, DispenseLog


def _json_error(message, status=400):
    return jsonify({"error": message}), status


@app.route('/api/patients/<int:patient_id>', methods=['PATCH'])
def v2_update_patient(patient_id):
    data = request.get_json() or {}
    with get_session(get_engine()) as s:
        patient = s.get(Patient, patient_id)
        if not patient:
            return _json_error('Patient not found', 404)
        if 'name' in data:
            name = str(data['name']).strip()
            if not name:
                return _json_error('Patient name cannot be empty')
            patient.name = name
        if 'rfid_uid' in data:
            uid = str(data['rfid_uid'] or '').strip()
            if uid:
                patient.rfid_uid = uid
        if 'active' in data:
            patient.active = bool(data['active'])
        try:
            s.commit()
        except IntegrityError:
            s.rollback()
            return _json_error('RFID UID already belongs to another patient', 409)
        socketio.emit('patient_updated', {'id': patient.id, 'name': patient.name, 'active': patient.active})
        return jsonify({'success': True, 'id': patient.id, 'name': patient.name, 'rfid': patient.rfid_uid, 'active': patient.active})


@app.route('/api/patients/<int:patient_id>', methods=['DELETE'])
def v2_delete_patient(patient_id):
    force = request.args.get('force', '0') in ('1', 'true', 'yes')
    with get_session(get_engine()) as s:
        patient = s.get(Patient, patient_id)
        if not patient:
            return _json_error('Patient not found', 404)
        schedule_count = s.query(Schedule).filter_by(patient_id=patient_id).count()
        log_count = s.query(DispenseLog).filter_by(patient_id=patient_id).count()
        if (schedule_count or log_count) and not force:
            return jsonify({'error': 'Patient has related records', 'schedules': schedule_count, 'logs': log_count}), 409
        if force:
            schedules = s.query(Schedule).filter_by(patient_id=patient_id).all()
            schedule_ids = [x.id for x in schedules]
            for log in s.query(DispenseLog).filter_by(patient_id=patient_id).all():
                s.delete(log)
            if schedule_ids:
                for log in s.query(DispenseLog).filter(DispenseLog.schedule_id.in_(schedule_ids)).all():
                    s.delete(log)
            for schedule in schedules:
                s.delete(schedule)
        s.delete(patient)
        s.commit()
        socketio.emit('patient_updated', {'id': patient_id, 'action': 'deleted'})
        return jsonify({'success': True})


@app.route('/api/medications/<int:medication_id>', methods=['PATCH'])
def v2_update_medication(medication_id):
    data = request.get_json() or {}
    with get_session(get_engine()) as s:
        med = s.get(Medication, medication_id)
        if not med:
            return _json_error('Medication not found', 404)
        for field in ('name', 'ai_class_name'):
            if field in data:
                setattr(med, field, str(data[field]).strip())
        for field in ('dose_mg', 'weight_per_pill'):
            if field in data:
                setattr(med, field, float(data[field]))
        for field in ('compartment', 'stock_count', 'low_stock_alert'):
            if field in data:
                setattr(med, field, int(data[field]))
        if not med.name:
            return _json_error('Medication name cannot be empty')
        s.commit()
        socketio.emit('medication_updated', {'id': med.id, 'name': med.name})
        return jsonify({'success': True, 'id': med.id, 'name': med.name, 'stock': med.stock_count, 'compartment': med.compartment})


@app.route('/api/medications/<int:medication_id>/archive', methods=['POST'])
def v2_archive_medication(medication_id):
    with get_session(get_engine()) as s:
        med = s.get(Medication, medication_id)
        if not med:
            return _json_error('Medication not found', 404)
        changed = 0
        for sch in s.query(Schedule).filter_by(medication_id=medication_id, active=True).all():
            sch.active = False
            changed += 1
        s.commit()
        socketio.emit('schedule_updated', {'action': 'medication_archived', 'medication_id': medication_id})
        return jsonify({'success': True, 'disabled_schedules': changed})


@app.route('/api/schedule/<int:schedule_id>', methods=['PATCH'])
def v2_update_schedule(schedule_id):
    data = request.get_json() or {}
    with get_session(get_engine()) as s:
        sch = s.get(Schedule, schedule_id)
        if not sch:
            return _json_error('Schedule not found', 404)
        if 'patient_id' in data:
            if not s.get(Patient, int(data['patient_id'])):
                return _json_error('Patient not found', 404)
            sch.patient_id = int(data['patient_id'])
        if 'medication_id' in data:
            if not s.get(Medication, int(data['medication_id'])):
                return _json_error('Medication not found', 404)
            sch.medication_id = int(data['medication_id'])
        if 'dose_time' in data:
            sch.dose_time = str(data['dose_time'])[:5]
        if 'dose_quantity' in data:
            sch.dose_quantity = max(1, int(data['dose_quantity']))
        if 'days_of_week' in data:
            sch.days_of_week = str(data['days_of_week'])
        if 'active' in data:
            sch.active = bool(data['active'])
        s.commit()
        socketio.emit('schedule_updated', {'action': 'updated', 'id': sch.id})
        return jsonify({'success': True, 'id': sch.id, 'active': sch.active})
