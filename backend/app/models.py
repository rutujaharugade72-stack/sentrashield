import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from .database import Base

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, default="Default Tenant")
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    tenant_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Site(Base):
    __tablename__ = "sites"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, index=True)
    name = Column(String)
    target_url = Column(String)
    waf_enabled = Column(Boolean, default=True)
    block_threshold = Column(Integer, default=20)
    created_at = Column(DateTime, default=datetime.utcnow)

class Scan(Base):
    __tablename__ = "scans"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    site_id = Column(String, index=True)
    status = Column(String, default="completed")
    risk_score = Column(Integer, default=0)
    findings_summary = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class WAFLog(Base):
    __tablename__ = "waf_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, index=True, nullable=True)
    site_id = Column(String, nullable=True)
    client_ip = Column(String)
    method = Column(String)
    path = Column(String)
    rule_triggered = Column(String, default="Anomaly Inspection")
    anomaly_score = Column(Integer, default=0)
    action = Column(String, default="allow")
    created_at = Column(DateTime, default=datetime.utcnow)