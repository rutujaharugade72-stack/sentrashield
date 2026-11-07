import os
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests
from dotenv import load_dotenv

from app.database import SessionLocal, engine, Base
from app.models import WAFLog, Site

# Ensure SQLite tables exist
Base.metadata.create_all(bind=engine)

load_dotenv()

TARGET_URL = os.getenv("TARGET_URL", "http://127.0.0.1:5000")
WAF_PORT = int(os.getenv("WAF_PORT", "8080"))

SIGNATURES = [
    (r"(?:--|\b(?:select|union|insert|update|delete|drop|alter)\b|'|--|\bOR\b\s+\d+=\d+)", "SQL Injection Syntax Detected", 30),
    (r"(?:<script.*?>|javascript:|onload=|onerror=)", "Cross-Site Scripting (XSS) Vector", 25),
    (r"(?:\.\./|\.\.\\)", "Path Traversal Detected", 20),
    (r"(?:etc/passwd|windows/system32|cmd\.exe|/bin/sh)", "Sensitive File Access", 30),
]


class WAFProxyHandler(BaseHTTPRequestHandler):
    def inspect_request(self, raw_path: str):
        total_score = 0
        triggered_rules = []
        for pattern, rule_name, score in SIGNATURES:
            try:
                matched = bool(re.search(pattern, raw_path, re.IGNORECASE))
            except Exception:
                matched = pattern.lower() in raw_path.lower()
            if matched:
                total_score += score
                triggered_rules.append(rule_name)
        return total_score, (", ".join(triggered_rules) if triggered_rules else "Clean")

    def log_event(self, method: str, score: int, rule_desc: str, action: str, site_id: str = None, tenant_id: str = None):
        try:
            db = SessionLocal()
            log_entry = WAFLog(
                client_ip=self.client_address[0],
                method=method,
                path=self.path,
                rule_triggered=rule_desc,
                anomaly_score=score,
                action=action,
                site_id=site_id,
                tenant_id=tenant_id
            )
            db.add(log_entry)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[!] Error logging event: {e}")

    def do_GET(self):
        self.handle_proxy("GET")

    def do_POST(self):
        self.handle_proxy("POST")

    def handle_proxy(self, method: str):
        total_score, rule_desc = self.inspect_request(self.path)

        # Get site threshold if registered
        threshold = 20
        site_id = None
        tenant_id = None
        try:
            db = SessionLocal()
            site = db.query(Site).first()
            if site:
                threshold = site.block_threshold
                site_id = site.id
                tenant_id = site.tenant_id
            db.close()
        except Exception:
            pass

        if total_score >= threshold:
            self.log_event(method, total_score, rule_desc, "BLOCK", site_id, tenant_id)
            self.send_response(403)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"403 Forbidden - Blocked by SentraShield WAF")
            return

        self.log_event(method, total_score, rule_desc, "ALLOW", site_id, tenant_id)

        target_endpoint = f"{TARGET_URL}{self.path}"
        try:
            headers = {key: val for key, val in self.headers.items() if key.lower() != 'host'}
            if method == "GET":
                resp = requests.get(target_endpoint, headers=headers, timeout=5)
            else:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length) if length > 0 else None
                resp = requests.post(target_endpoint, data=body, headers=headers, timeout=5)

            self.send_response(resp.status_code)
            for key, val in resp.headers.items():
                if key.lower() not in ['content-encoding', 'transfer-encoding', 'content-length']:
                    self.send_header(key, val)
            self.end_headers()
            self.wfile.write(resp.content)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(f"502 Bad Gateway - Could not reach target: {e}".encode())


def run(server_class=HTTPServer, handler_class=WAFProxyHandler, port=WAF_PORT):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"[*] SentraShield WAF Proxy listening on 0.0.0.0:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()


if __name__ == "__main__":
    run()