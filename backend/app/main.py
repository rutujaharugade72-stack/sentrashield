from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from . import models
from .scanner import run_security_scan

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SentraShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SiteCreate(BaseModel):
    name: str
    target_url: str
    block_threshold: int = 20

@app.on_event("startup")
def setup_seed_user():
    db = next(get_db())
    tenant = db.query(models.Tenant).first()
    if not tenant:
        tenant = models.Tenant(name="Local Workspace")
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    
    user = db.query(models.User).filter_by(email="local@sentrashield.dev").first()
    if not user:
        user = models.User(email="local@sentrashield.dev", tenant_id=tenant.id)
        db.add(user)
        db.commit()

@app.get("/api/sites")
def list_sites(db: Session = Depends(get_db)):
    return db.query(models.Site).order_by(models.Site.created_at.desc()).all()

@app.post("/api/sites")
def add_site(payload: SiteCreate, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).first()
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
    db.delete(site)
    db.commit()
    return {"status": "deleted"}

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

@app.get("/api/waf-logs")
def list_waf_logs(db: Session = Depends(get_db)):
    return db.query(models.WAFLog).order_by(models.WAFLog.created_at.desc()).limit(100).all()
