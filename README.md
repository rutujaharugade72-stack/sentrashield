# SentraShield — Cloud SOC & Web Application Firewall Platform

SentraShield is a full-stack, cloud-integrated Web Application Firewall (WAF) reverse proxy, vulnerability assessment engine, and Security Operations Center (SOC) dashboard. It intercepts incoming HTTP traffic in real time, scores anomalies, neutralizes injection vectors (SQLi, XSS), forwards safe traffic downstream, and streams threat telemetry to an operations console.

---

## 🌐 Live Deployments

| Component | Platform | URL / Endpoint |
| :--- | :--- | :--- |
| **SOC Dashboard (Frontend)** | Vercel | https://sentrashield-gray.vercel.app |
| **Core API Backend** | Render | https://sentrashield-api.onrender.com |
| **Relational Database** | Neon DB | Serverless PostgreSQL (`neondb`) |
| **WAF Reverse Proxy** | Local / Edge | http://localhost:8080 |
| **Mock Target Application** | Local Testbed | http://localhost:5000 |

---

## 🚀 Key Features

* **Real-Time Signature & Heuristic WAF:** Inline inspection of HTTP query strings, headers, and request bodies for SQL Injection (`UNION SELECT`, `' OR 1=1--`), Cross-Site Scripting (`<script>`, inline event handlers), and path anomalies.
* **Automated Threat Neutralization:** Blocks malicious payloads with `403 Forbidden` and a real-time event log; transparently proxies legitimate requests to downstream targets with `200 OK`.
* **Live SOC Telemetry Stream:** Dynamic 3.5s polling displaying real-time security events, anomaly scores, client IP tags, and action triggers.
* **Integrated Vulnerability Engine:** On-demand target auditing for missing security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`) with risk score reflection.
* **Multi-Tenant Architecture:** Target site isolation with scoped API keys and tokenized telemetry ingestion.

---

## 🛠 Tech Stack

* **Backend & API:** Python 3, FastAPI, SQLAlchemy 2.0, Uvicorn, Requests
* **Database & ORM:** Neon Serverless PostgreSQL (`psycopg2-binary` driver)
* **Frontend:** React (Vite), Tailwind CSS, Lucide Icons, Axios
* **Proxy Engine:** Python HTTP Reverse Proxy (`run_waf.py`)
* **Deployment & CI/CD:** Render (Web Service), Vercel (SPA Frontend), Git

---

## ⚡ Quickstart & Local Reproduction

### 1. Prerequisites
* Python 3.10+
* Node.js 18+ (for local frontend dev)

### 2. Environment Setup
Create `backend/.env` with the following configuration:
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<neon-host>/neondb?sslmode=require
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256

### 3. Run the Target Mock App (Port 5000)
Command: python custom_vuln_app/app.py

### 4. Run the WAF Reverse Proxy (Port 8080)
Command: python backend/run_waf.py

### 5. Run the Backend API (Port 8000)
Command: uvicorn backend.app.main:app --reload --port 8000

---

## 🧪 Threat Verification & Testing

### Test 1: SQL Injection Block (403 Forbidden)
curl -i "http://localhost:8080/products?cat=1%20UNION%20SELECT%20null,username,password%20FROM%20users--"

### Test 2: Cross-Site Scripting Block (403 Forbidden)
curl -i "http://localhost:8080/?comment=%3Cscript%3Ealert(document.cookie)%3C/script%3E"

### Test 3: Legitimate Pass-Through (200 OK)
curl -i "http://localhost:8080/"

All actions reflect immediately inside the Live SOC Dashboard: https://sentrashield-gray.vercel.app