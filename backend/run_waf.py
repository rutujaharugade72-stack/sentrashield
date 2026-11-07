import os
import re
import uuid
from datetime import datetime, timezone
from flask import Flask, request, Response
import requests

from app.database import SessionLocal
from app import models

# --- Configuration ---
TARGET_HOST = os.getenv("TARGET_HOST", "http://127.0.0.1:5000")
WAF_PORT = int(os.getenv("WAF_PORT", 8080))
BLOCK_THRESHOLD = int(os.getenv("BLOCK_THRESHOLD", 20))

# --- Attack Signatures ---
SQLI_PATTERNS = [
    r"(\%27)|(\')|(\-\-)|(\%23)|(#)",
    r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))",
    r"\w*((\%27)|(\'))(\s)*((\%6F)|o|(\%4F))((\%72)|r|(\%52))",
    r"(union|select|insert|update|delete|drop|truncate|alter|exec|load_file|outfile)",
]

XSS_PATTERNS = [
    r"((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)",
    r"((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)",
    r"javascript\s*:",
    r"onerror\s*=",
    r"onload\s*=",
    r"<script[^>]*>",
]

def inspect_request(full_path: str, body: bytes) -> tuple[int, str]:
    """Inspect query string and payload body for SQLi and XSS patterns."""
    score = 0
    triggered = []

    content = full_path
    if body:
        try:
            content += " " + body.decode("utf-8", errors="ignore")
        except Exception:
            pass

    for pattern in SQLI_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            score += 25
            triggered.append("SQL Injection Pattern Detected")
            break

    for pattern in XSS_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            score += 25
            triggered.append("Cross-Site Scripting (XSS) Pattern Detected")
            break

    rule_name = " | ".join(triggered) if triggered else "Clean Request"
    return score, rule_name

def log_event(client_ip: str, method: str, path: str, rule: str, score: int, action: str):
    """Persist telemetry record to Neon attached to tenant_id and site_id."""
    db = SessionLocal()
    try:
        # 1. Fetch user to obtain tenant_id
        user = db.query(models.User).filter(models.User.email == "local@sentrashield.dev").first()
        tenant_id = user.tenant_id if user else None

        # 2. Fetch or auto-provision default site under this tenant
        site = db.query(models.Site).first()
        if not site and tenant_id:
            site = models.Site(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                name="Local Mock Target",
                target_url=TARGET_HOST
            )
            db.add(site)
            db.commit()
            db.refresh(site)

        site_id = site.id if site else None

        record = models.WAFLog(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            site_id=site_id,
            client_ip=client_ip,
            method=method,
            path=path,
            rule_triggered=rule,
            anomaly_score=score,
            action=action,
            created_at=datetime.now(timezone.utc)
        )
        db.add(record)
        db.commit()
        print(f"[WAF TELEMETRY LOGGED] Tenant: {tenant_id} | Site: {site_id} | Action: {action.upper()}")
    except Exception as e:
        db.rollback()
        print(f"[WAF DB ERROR] Failed to log telemetry to Neon: {e}")
    finally:
        db.close()

# --- Reverse Proxy Application ---
app = Flask(__name__)

@app.route("/", defaults={"path": ""}, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
def proxy_gateway(path):
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    full_path = request.full_path if request.query_string else request.path

    score, rule = inspect_request(full_path, request.get_data())

    # Inline blocking enforcement
    if score >= BLOCK_THRESHOLD:
        log_event(client_ip, request.method, full_path, rule, score, "block")
        return Response(
            "403 Forbidden - Blocked by SentraShield WAF\n",
            status=403,
            mimetype="text/plain"
        )

    # Log clean requests
    log_event(client_ip, request.method, full_path, rule, score, "allow")

    # Forward downstream to upstream target
    target_url = f"{TARGET_HOST.rstrip('/')}/{path}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"

    try:
        headers = {k: v for k, v in request.headers if k.lower() != "host"}
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False,
            timeout=5
        )
        excluded_headers = ["content-encoding", "content-length", "transfer-encoding", "connection"]
        resp_headers = [(k, v) for k, v in resp.raw.headers.items() if k.lower() not in excluded_headers]
        return Response(resp.content, resp.status_code, resp_headers)
    except requests.exceptions.RequestException as e:
        return Response(
            f"502 Bad Gateway - Could not reach target: {e}\n",
            status=502,
            mimetype="text/plain"
        )

if __name__ == "__main__":
    print(f"[*] SentraShield Reverse Proxy WAF running on port {WAF_PORT}")
    print(f"[*] Upstream Target: {TARGET_HOST}")
    print(f"[*] Block Threshold: {BLOCK_THRESHOLD}")
    app.run(host="0.0.0.0", port=WAF_PORT, debug=False)