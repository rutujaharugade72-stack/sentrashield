import httpx

async def run_security_scan(target_url: str):
    findings = []
    risk_score = 0
    client = httpx.AsyncClient(timeout=10.0, follow_redirects=True)
    
    try:
        response = await client.get(target_url)
        headers = response.headers
        
        # Header Inspections
        if "content-security-policy" not in headers:
            findings.append("Missing Content-Security-Policy (CSP)")
            risk_score += 20
        if "x-frame-options" not in headers:
            findings.append("Missing X-Frame-Options (Clickjacking vulnerability)")
            risk_score += 15
        if "x-content-type-options" not in headers:
            findings.append("Missing X-Content-Type-Options header")
            risk_score += 10
            
        # Passive payload reflection audit
        test_param = "sentra_test_token"
        audit_url = f"{target_url}{'&' if '?' in target_url else '?'}q={test_param}"
        probe_res = await client.get(audit_url)
        if test_param in probe_res.text:
            findings.append("Input reflection detected on query parameter 'q' (Potential Reflected XSS)")
            risk_score += 35

        return min(risk_score, 100), "; ".join(findings) if findings else "No immediate issues found."

    except httpx.ConnectError:
        return 100, "Target unreachable (Connection Failed)"
    except Exception as e:
        return 100, f"Target unreachable ({str(e)})"
    finally:
        await client.aclose()
