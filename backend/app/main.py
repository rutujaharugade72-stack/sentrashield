import hashlib
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from . import models
from .scanner import run_security_scan

# Ensure tables exist in Neon
Base.metadata.create_all(bind=engine)

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure default workspace and baseline user exist
    db_gen = get_db()
    db = next(db_gen)
    try:
        tenant = db.query(models.Tenant).first()
        if not tenant:
            tenant = models.Tenant(name="Primary Workspace")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

        user = db.query(models.User).filter_by(email="local@sentrashield.dev").first()
        if not user:
            user = models.User(
                email="local@sentrashield.dev",
                hashed_password=hash_pw("admin123"),
                tenant_id=tenant.id
            )
            db.add(user)
            db.commit()
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

    yield

app = FastAPI(title="SentraShield API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas (using standard str to avoid extra external dependencies)
class AuthRequest(BaseModel):
    email: str
    password: str

class SiteCreate(BaseModel):
    name: str
    target_url: str
    block_threshold: int = 20

# Health Check
@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "SentraShield API"}

# Authentication Endpoints
@app.post("/api/auth/register")
def register(payload: AuthRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter_by(email=payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already registered with this email")
    
    tenant = models.Tenant(name=f"{payload.email.split('@')[0].capitalize()}'s Workspace")
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    user = models.User(
        email=payload.email,
        hashed_password=hash_pw(payload.password),
        tenant_id=tenant.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "token": f"sentra-token-{user.id}",
        "user": {"id": user.id, "email": user.email, "tenant_id": user.tenant_id}
    }

@app.post("/api/auth/login")
def login(payload: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=payload.email).first()
    if not user or user.hashed_password != hash_pw(payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "status": "success",
        "token": f"sentra-token-{user.id}",
        "user": {"id": user.id, "email": user.email, "tenant_id": user.tenant_id}
    }

# Sites Management
@app.get("/api/sites")
def list_sites(db: Session = Depends(get_db)):
    return db.query(models.Site).order_by(models.Site.created_at.desc()).all()

@app.post("/api/sites")
def add_site(payload: SiteCreate, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).first()
    if not tenant:
        raise HTTPException(status_code=500, detail="Default tenant not initialized")
    
    site = models.Site(
        tenant_id=tenant.id,
        name=payload.name,
        target_url=payload.target_url,
        block_threshold=payload.block_threshold,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site

@app.delete("/api/sites/{site_id}")
def delete_site(site_id: str, db: Session = Depends(get_db)):
    site = db.query(models.Site).filter_by(id=site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    db.query(models.Scan).filter_by(site_id=site.id).delete()
    db.delete(site)
    db.commit()
    return {"status": "deleted"}

# Scans
@app.get("/api/scans")
def list_scans(db: Session = Depends(get_db)):
    return db.query(models.Scan).order_by(models.Scan.created_at.desc()).all()

@app.post("/api/scans/{site_id}")
async def trigger_scan(site_id: str, db: Session = Depends(get_db)):
    site = db.query(models.Site).filter_by(id=site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    score, summary = await run_security_scan(site.target_url)
    scan = models.Scan(
        site_id=site.id,
        risk_score=score,
        findings_summary=summary,
        status="completed"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan

# WAF Logs
@app.get("/api/waf-logs")
def list_waf_logs(db: Session = Depends(get_db)):
    return db.query(models.WAFLog).order_by(models.WAFLog.created_at.desc()).limit(100).all()