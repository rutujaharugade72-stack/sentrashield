# SentraShield — Native Local Setup Guide (No AWS & No Docker)

SentraShield is a multi-tier web application security platform featuring an API backend, a custom rule-based Web Application Firewall (WAF) reverse proxy, a vulnerability scanner engine, an administrative React dashboard, and a local vulnerable test target application.

---

## 1. System Architecture & Port Map

| Component | Technology | Default Port | Description |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | PostgreSQL 14+ | `5432` | Relational storage for tenants, users, sites, scans, and WAF logs |
| **Backend API** | FastAPI + Uvicorn | `8000` | Core REST API for site management, scan executions, and analytics |
| **WAF Reverse Proxy** | Python HTTP Proxy | `8080` | Traffic inspection, anomaly scoring, blocking, and logging engine |
| **Web Dashboard** | React + Vite | `3000` | Management UI for registered sites, scans, and real-time WAF telemetry |
| **Custom Vuln App** | Python Flask | `5000` | Intentionally vulnerable local mock application for WAF testing |

---

## 2. Prerequisites & Environment Setup

Ensure the following tools are installed directly on your machine:
- **Python 3.10+** (with `pip` and `venv`)
- **Node.js 18+** & **npm**
- **PostgreSQL 14+** (running natively as a system service)

---

## 3. Database Initialization

1. Start your local PostgreSQL service:
   - **Linux (Ubuntu/Debian):** `sudo systemctl start postgresql`
   - **macOS:** `brew services start postgresql@14`
   - **Windows:** Ensure the PostgreSQL service is started in `services.msc`.

2. Create the project user and database:
   ```bash
   sudo -u postgres psql -c "CREATE USER sentra WITH PASSWORD 'sentra_password';"
   sudo -u postgres psql -c "CREATE DATABASE sentrashield OWNER sentra;"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sentrashield TO sentra;"
   ```

---

## 4. Backend & WAF Setup

### Step A: Configure Backend Environment
Navigate into the backend directory and configure your Python environment:
```bash
cd backend
python3 -m venv .venv

# Activate Virtual Environment:
source .venv/bin/activate       # On Linux/macOS
# .venv\Scripts\activate      # On Windows (PowerShell/CMD)

pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

Ensure `.env` matches your local database credentials:
```env
DATABASE_URL=postgresql://sentra:sentra_password@localhost:5432/sentrashield
WAF_PORT=8080
API_PORT=8000
```

### Step B: Start Backend API (Terminal 1)
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation will be available at:* `http://localhost:8000/docs`

### Step C: Start WAF Proxy Engine (Terminal 2)
```bash
cd backend
source .venv/bin/activate
python run_waf.py
```
*The proxy will output:* `[*] SentraShield WAF Proxy listening on 0.0.0.0:8080`

---

## 5. Local Vulnerable Target Setup (Terminal 3)

The custom vulnerable app runs on port `5000` and acts as the destination target for scanner probes and WAF proxy forwarding.

```bash
cd custom_vuln_app
python3 -m venv .venv

# Activate Virtual Environment:
source .venv/bin/activate       # On Linux/macOS
# .venv\Scripts\activate      # On Windows

pip install -r requirements.txt
python app.py
```
*Accessible directly at:* `http://127.0.0.1:5000`

---

## 6. Frontend Dashboard Setup (Terminal 4)

```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to: `http://localhost:3000`

---

## 7. How to Test Scans and WAF Logging

### A. Register Target in Dashboard
1. Go to `http://localhost:3000` and click the **Sites** tab.
2. In the registration form:
   - **Site Name:** `Local Mock Target`
   - **Target URL:** `http://127.0.0.1:5000`
   - **WAF Threshold:** `20`
3. Click **Add Site**.

### B. Run a Vulnerability Scan
1. Switch to the **Scans** tab.
2. Select `Local Mock Target` from the dropdown list.
3. Click **Run Scan**.
4. The scanner checks for missing security headers (CSP, X-Frame-Options, X-Content-Type-Options) and query parameter reflection, returning an itemized audit report and risk score.

### C. Test WAF Detection & Rule Blocking
Send synthetic requests through the WAF reverse proxy on port `8080`:

1. **Legitimate Clean Request (Expected: Allowed 200 OK):**
   ```bash
   curl -i "http://127.0.0.1:8080/?q=hello_world"
   ```

2. **Trigger Anomaly Rule (Expected: Blocked 403 Forbidden):**
   ```bash
   curl -i "http://127.0.0.1:8080/?q=1'%20OR%201=1--"
   ```

3. **Verify Telemetry:**
   - Go to the **WAF Logs** tab in the dashboard (`http://localhost:3000`).
   - The table auto-polls every 4 seconds and displays the timestamp, client IP, method, incoming path, matched rule signature, calculated score, and final action (`ALLOW` or `BLOCK`).
