import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api';

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
      body: JSON.stringify({ name: siteName, target_url: siteUrl, block_threshold: parseInt(threshold) })
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
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ color: '#38bdf8', fontSize: '24px', fontWeight: 'bold' }}>SentraShield (Local)</h1>
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
      </header>

      {tab === 'sites' && (
        <section>
          <div style={{ background: '#111827', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #1f2937' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Register New Target Site</h2>
            <form onSubmit={handleAddSite} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Site Name (e.g. Test Target)"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #374151', background: '#1f2937', color: '#fff' }}
              />
              <input
                type="text"
                placeholder="Target URL (e.g. http://127.0.0.1:5000)"
                value={siteUrl}
                onChange={e => setSiteUrl(e.target.value)}
                style={{ flex: 2, minWidth: '280px', padding: '10px', borderRadius: '6px', border: '1px solid #374151', background: '#1f2937', color: '#fff' }}
              />
              <input
                type="number"
                placeholder="WAF Threshold"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                style={{ width: '130px', padding: '10px', borderRadius: '6px', border: '1px solid #374151', background: '#1f2937', color: '#fff' }}
              />
              <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}>
                Add Site
              </button>
            </form>
          </div>

          <h3 style={{ marginBottom: '12px' }}>Configured Sites</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111827', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#1e293b', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Target URL</th>
                <th style={{ padding: '12px' }}>WAF Threshold</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '12px' }}>{s.name}</td>
                  <td style={{ padding: '12px', color: '#38bdf8' }}>{s.target_url}</td>
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
                  <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No sites registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'scans' && (
        <section>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <select
              value={selectedSite}
              onChange={e => setSelectedSite(e.target.value)}
              style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.target_url})</option>
              ))}
            </select>
            <button
              onClick={handleRunScan}
              disabled={loading || sites.length === 0}
              style={{ padding: '10px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
            >
              {loading ? 'Scanning...' : 'Run Scan'}
            </button>
          </div>

          <h3 style={{ marginBottom: '12px' }}>Scan History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scans.map(sc => (
              <div key={sc.id} style={{ background: '#111827', padding: '16px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>Scan {sc.id.slice(0, 8)}</span>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: sc.risk_score > 50 ? '#7f1d1d' : sc.risk_score > 0 ? '#78350f' : '#14532d',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}>
                    Risk Score: {sc.risk_score}/100
                  </span>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '14px' }}>{sc.findings_summary || 'No issues detected.'}</p>
              </div>
            ))}
            {scans.length === 0 && (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No scan history found.</p>
            )}
          </div>
        </section>
      )}

      {tab === 'waf' && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3>WAF Live Event Logs</h3>
            <span style={{ fontSize: '12px', color: '#10b981' }}>● Auto-polling active</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111827', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#1e293b', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '12px' }}>Time</th>
                <th style={{ padding: '12px' }}>IP</th>
                <th style={{ padding: '12px' }}>Method</th>
                <th style={{ padding: '12px' }}>Path</th>
                <th style={{ padding: '12px' }}>Rule</th>
                <th style={{ padding: '12px' }}>Score</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {wafLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td style={{ padding: '12px' }}>{log.client_ip}</td>
                  <td style={{ padding: '12px' }}>{log.method}</td>
                  <td style={{ padding: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.path}</td>
                  <td style={{ padding: '12px', color: '#f59e0b' }}>{log.rule_triggered}</td>
                  <td style={{ padding: '12px' }}>{log.anomaly_score}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: log.action === 'block' ? '#ef4444' : '#10b981',
                      color: '#fff'
                    }}>
                      {log.action.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {wafLogs.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No WAF events recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
