"""
Database models — SQLite via SQLAlchemy
Tables: patients, medications, schedules, dispense_logs
"""

from sqlalchemy import (create_engine, Column, Integer, String,
                        Float, Boolean, DateTime, ForeignKey, Text)
from sqlalchemy.orm import declarative_base, relationship, Session
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from config import DBConfig

Base = declarative_base()

# ── MODELS ────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"
    id          = Column(Integer, primary_key=True)
    name        = Column(String(100), nullable=False)
    rfid_uid    = Column(String(50), unique=True, nullable=False)
    qr_code     = Column(String(100), unique=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    active      = Column(Boolean, default=True)

    schedules   = relationship("Schedule", back_populates="patient")
    logs        = relationship("DispenseLog", back_populates="patient")

    def __repr__(self):
        return f"<Patient {self.name} RFID={self.rfid_uid}>"


class Medication(Base):
    __tablename__ = "medications"
    id              = Column(Integer, primary_key=True)
    name            = Column(String(100), nullable=False)
    ai_class_name   = Column(String(100))   # YOLOv8 class label
    dose_mg         = Column(Float)
    weight_per_pill = Column(Float)          # grams — for load cell verification
    compartment     = Column(Integer)        # 0-3 physical compartment
    stock_count     = Column(Integer, default=0)
    low_stock_alert = Column(Integer, default=5)

    schedules       = relationship("Schedule", back_populates="medication")


class Schedule(Base):
    __tablename__ = "schedules"
    id              = Column(Integer, primary_key=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"))
    medication_id   = Column(Integer, ForeignKey("medications.id"))
    dose_time       = Column(String(5))     # "HH:MM" format
    dose_quantity   = Column(Integer, default=1)
    active          = Column(Boolean, default=True)
    days_of_week    = Column(String(20), default="0123456")  # "0"=Mon

    patient         = relationship("Patient", back_populates="schedules")
    medication      = relationship("Medication", back_populates="schedules")


class DispenseLog(Base):
    __tablename__ = "dispense_logs"
    id              = Column(Integer, primary_key=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"))
    schedule_id     = Column(Integer, ForeignKey("schedules.id"))
    timestamp       = Column(DateTime, default=datetime.utcnow)
    expected_med    = Column(String(100))
    detected_med    = Column(String(100))
    confidence      = Column(Float)
    weight_g        = Column(Float)
    outcome         = Column(String(20))    # "success"|"wrong_pill"|"missed"|"error"
    notes           = Column(Text)

    patient         = relationship("Patient", back_populates="logs")


# ── DATABASE INIT ─────────────────────────────────────────

def init_db():
    """Create all tables and return engine."""
    engine = create_engine(
        f"sqlite:///{DBConfig.PATH}",
        echo=DBConfig.ECHO,
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    return engine


def get_session(engine):
    return Session(engine)


def seed_demo_data(engine):
    """Insert demo patient + medication for testing."""
    with Session(engine) as s:
        # Skip if already seeded
        if s.query(Patient).count() > 0:
            print("Database already seeded — skipping.")
            return

        patient = Patient(
            name="Demo Patient",
            rfid_uid="DEMO-0001",
            qr_code="QR-DEMO-0001"
        )
        med = Medication(
            name="Aspirin 500mg",
            ai_class_name="aspirin_ultra_500_mg",
            dose_mg=500,
            weight_per_pill=0.65,
            compartment=0,
            stock_count=30
        )
        s.add_all([patient, med])
        s.flush()

        schedule = Schedule(
            patient_id=patient.id,
            medication_id=med.id,
            dose_time="08:00",
            dose_quantity=1,
            days_of_week="0123456"
        )
        s.add(schedule)
        s.commit()
        print("✓ Demo data seeded: Demo Patient / Aspirin 08:00 daily")


if __name__ == "__main__":
    engine = init_db()
    seed_demo_data(engine)
    print(f"✓ Database ready at {DBConfig.PATH}")
