import React, { useState, useEffect } from 'react';

// Automatically uses your Render URL in production (Vercel) and localhost when running locally
const API_BASE = (import.meta.env.VITE_API_URL || 'https://sentrashield-api.onrender.com') + '/api';

export default function App() {
  const [tab, setTab] = useState('sites');
  const [sites, setSites] = useState([]);
  const [scans, setScans] = useState([]);
  const [wafLogs, setWafLogs] = useState([]);
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [threshold, setThreshold] = useState(20);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSites = async () => {
    try {
      const res = await fetch(`${API_BASE}/sites`);
      const data = await res.json();
      setSites(data);
      if (data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchScans = async () => {
    try {
      const res = await fetch(`${API_BASE}/scans`);
      setScans(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWafLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/waf-logs`);
      setWafLogs(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSites();
    fetchScans();
    fetchWafLogs();
    const interval = setInterval(() => {
      fetchWafLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAddSite = async (e) => {
    e.preventDefault();
    if (!siteName || !siteUrl) return;
    await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: siteName,
        target_url: siteUrl,
        block_threshold: parseInt(threshold)
      })
    });
    setSiteName('');
    setSiteUrl('');
    fetchSites();
  };

  const handleDeleteSite = async (id) => {
    await fetch(`${API_BASE}/sites/${id}`, { method: 'DELETE' });
    fetchSites();
  };

  const handleRunScan = async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/scans/${selectedSite}`, { method: 'POST' });
      await fetchScans();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      {/* Header with Student Project Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>SentraShield Dashboard</h1>
          <span style={{ fontSize: '12px', background: '#1e3a8a', color: '#93c5fd', padding: '3px 8px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
            BE IT Student Security Project
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['sites', 'scans', 'waf'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: tab === t ? '#2563eb' : '#1e293b',
                color: '#fff',
                fontWeight: 'bold',
                textTransform: 'capitalize'
              }}
            >
              {t === 'waf' ? 'WAF Logs' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Sites Tab */}
      {tab === 'sites' && (
        <div>
          <form onSubmit={handleAddSite} style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
            <input
              placeholder="Site Name (e.g. My API)"
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              style={{ flex: 1, minWidth: '180px', padding: '10px', borderRadius: '6px', border: '1px solid #374151', background: '#0f172a', color: '#fff' }}
            />
            <input
              placeholder="Target URL (e.g. https://target-app.com)"
              value={siteUrl}
              onChange={e => setSiteUrl(e.target.value)}
              style={{ flex: 2, minWidth: '240px', padding: '10px', borderRadius: '6px', border: '1px solid #374151', background: '#0f172a', color: '#fff' }}
            />
            <input
              type="number"
              placeholder="Threshold"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              style={{ width: '110px', padding: '10px', borderRadius: '6px', border: '1px solid #374151', background: '#0f172a', color: '#fff' }}
            />
            <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
              Add Site
            </button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Target URL</th>
                <th style={{ padding: '12px' }}>WAF Threshold</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px' }}>{s.name}</td>
                  <td style={{ padding: '12px' }}>{s.target_url}</td>
                  <td style={{ padding: '12px' }}>{s.block_threshold}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => handleDeleteSite(s.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    No sites registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Scans Tab */}
      {tab === 'scans' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <select
              value={selectedSite}
              onChange={e => setSelectedSite(e.target.value)}
              style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.target_url})
                </option>
              ))}
            </select>
            <button
              onClick={handleRunScan}
              disabled={loading || !selectedSite}
              style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
            >
              {loading ? 'Scanning...' : 'Run Scan'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scans.map(sc => (
              <div key={sc.id} style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold' }}>Scan ID: {sc.id.slice(0, 8)}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: sc.risk_score > 50 ? '#7f1d1d' : sc.risk_score > 0 ? '#78350f' : '#14532d',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}>
                    Risk Score: {sc.risk_score}/100
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.4' }}>
                  {sc.findings_summary || 'No issues detected.'}
                </p>
              </div>
            ))}
            {scans.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No scan history found.</p>
            )}
          </div>
        </div>
      )}

      {/* WAF Logs Tab */}
      {tab === 'waf' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#22c55e' }}>● Auto-polling live events every 4s</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Time</th>
                <th style={{ padding: '10px' }}>IP</th>
                <th style={{ padding: '10px' }}>Method</th>
                <th style={{ padding: '10px' }}>Path</th>
                <th style={{ padding: '10px' }}>Rule</th>
                <th style={{ padding: '10px' }}>Score</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {wafLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{log.client_ip}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{log.method}</td>
                  <td style={{ padding: '10px', fontSize: '13px', fontFamily: 'monospace' }}>{log.path}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{log.rule_triggered}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{log.anomaly_score}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: log.action === 'block' ? '#ef4444' : '#22c55e',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {log.action.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {wafLogs.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    No WAF events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '36px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
        SentraShield Security Platform &bull; Academic Project Showcase
      </div>
    </div>
  );
}