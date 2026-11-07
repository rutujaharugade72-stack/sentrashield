import React, { useState, useEffect } from 'react';
import { 
  Shield, Globe, Activity, Terminal, Trash2, Play, 
  CheckCircle, AlertTriangle, LogOut, Radio, Server, Lock 
} from 'lucide-react';
import Login from './Login';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://sentrashield-api.onrender.com') + '/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('overview');
  const [sites, setSites] = useState([]);
  const [scans, setScans] = useState([]);
  const [wafLogs, setWafLogs] = useState([]);
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [threshold, setThreshold] = useState(20);
  const [selectedSite, setSelectedSite] = useState('');
  const [scanning, setScanning] = useState(false);

  // Check login state
  useEffect(() => {
    const token = localStorage.getItem('sentra_token');
    const savedUser = localStorage.getItem('sentra_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser({ email: 'operator@sentrashield.dev' });
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('sentra_token');
    localStorage.removeItem('sentra_user');
    setUser(null);
  };

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
    if (user) {
      fetchSites();
      fetchScans();
      fetchWafLogs();
      const interval = setInterval(() => {
        fetchWafLogs();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [user]);

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
    setScanning(true);
    try {
      await fetch(`${API_BASE}/scans/${selectedSite}`, { method: 'POST' });
      await fetchScans();
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} apiBase={API_BASE.replace('/api', '')} />;
  }

  const blockedCount = wafLogs.filter(l => l.action?.toLowerCase() === 'block').length;
  const avgScore = scans.length > 0 
    ? Math.round(scans.reduce((a, b) => a + (b.risk_score || 0), 0) / scans.length) 
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#070a13',
      backgroundImage: 'radial-gradient(circle at 50% 0%, #0d172e 0%, #070a13 70%)',
      color: '#f8fafc',
      fontFamily: '"JetBrains Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace'
    }}>
      {/* Top Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
        background: 'rgba(10, 16, 31, 0.7)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(37, 99, 235, 0.2))',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
          }}>
            <Shield size={22} color="#00f0ff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '1px' }}>
              SENTRA<span style={{ color: '#00f0ff' }}>SHIELD</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.5px' }}>
              SOC CYBERSECURITY OPERATIONS PLATFORM
            </div>
          </div>
        </div>

        {/* Tab Controls & Operator Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <nav style={{ display: 'flex', background: 'rgba(7, 11, 20, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            {[
              { id: 'overview', label: 'SOC Overview', icon: Activity },
              { id: 'sites', label: 'Target Sites', icon: Globe },
              { id: 'scans', label: 'Vuln Engine', icon: Terminal },
              { id: 'waf', label: 'WAF Telemetry', icon: Radio },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: tab === id ? 'linear-gradient(135deg, #0284c7, #00f0ff)' : 'transparent',
                  color: tab === id ? '#050811' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #1e293b', paddingLeft: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{user.email}</span>
            <button
              onClick={handleLogout}
              title="Logout Session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: '600'
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main SOC Content Canvas */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* Metric Pulse Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'MONITORED TARGETS', val: sites.length, sub: 'Active Endpoints', color: '#00f0ff', icon: Globe },
            { label: 'INLINE THREAT BLOCKS', val: blockedCount, sub: 'SQLi / XSS Neutralized', color: '#ef4444', icon: Shield },
            { label: 'AVG VULN RISK INDEX', val: `${avgScore}/100`, sub: 'Automated Header Reflection', color: avgScore > 40 ? '#f59e0b' : '#10b981', icon: Terminal },
            { label: 'WAF ENGINE STATUS', val: 'ONLINE', sub: 'Reverse Proxy 0.0.0.0:8080', color: '#10b981', icon: Radio },
          ].map((m, idx) => (
            <div key={idx} style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: `1px solid rgba(255, 255, 255, 0.07)`,
              borderTop: `3px solid ${m.color}`,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 24px -10px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '1px' }}>{m.label}</span>
                <m.icon size={16} color={m.color} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '8px' }}>{m.val}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* TAB 1: SOC OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(0, 240, 255, 0.15)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={18} /> Live Security Telemetry Feed
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Live 3.5s Polling
                </span>
              </div>

              {wafLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                  No attack telemetry recorded yet. Trigger attacks via port 8080 proxy to inspect.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {wafLogs.slice(0, 6).map((log, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(7, 11, 20, 0.7)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      borderLeft: log.action?.toLowerCase() === 'block' ? '3px solid #ef4444' : '3px solid #10b981',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{log.client_ip}</span>
                        <span style={{ color: '#94a3b8' }}>{log.path}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>{log.rule_triggered}</span>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: log.action?.toLowerCase() === 'block' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: log.action?.toLowerCase() === 'block' ? '#ef4444' : '#10b981',
                          fontWeight: 'bold',
                          fontSize: '0.75rem'
                        }}>
                          {log.action?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} color="#00f0ff" /> Target Systems
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sites.map(s => (
                  <div key={s.id} style={{ background: 'rgba(7, 11, 20, 0.7)', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.88rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{s.target_url}</div>
                    <div style={{ fontSize: '0.72rem', color: '#00f0ff', marginTop: '6px' }}>Threshold: {s.block_threshold} pts</div>
                  </div>
                ))}
                {sites.length === 0 && (
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No targets registered.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TARGET SITES */}
        {tab === 'sites' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#00f0ff', marginBottom: '18px' }}>Register Target Endpoint</h3>
              <form onSubmit={handleAddSite}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>Target Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Production API"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>Target URL</label>
                  <input
                    type="text"
                    placeholder="http://127.0.0.1:5000"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>WAF Block Threshold</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #0284c7, #00f0ff)', border: 'none', borderRadius: '6px', color: '#050811', fontWeight: '800', cursor: 'pointer' }}
                >
                  ADD ENDPOINT TO MESH
                </button>
              </form>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '18px' }}>Configured Target Network</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '10px' }}>NAME</th>
                    <th style={{ padding: '10px' }}>TARGET DESTINATION</th>
                    <th style={{ padding: '10px' }}>THRESHOLD</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{s.name}</td>
                      <td style={{ padding: '12px 10px', color: '#38bdf8' }}>{s.target_url}</td>
                      <td style={{ padding: '12px 10px' }}>{s.block_threshold} pts</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteSite(s.id)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sites.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No endpoints registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SCANS */}
        {tab === 'scans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                style={{ flex: 1, padding: '12px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff', fontSize: '0.88rem' }}
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.target_url})</option>
                ))}
              </select>
              <button
                onClick={handleRunScan}
                disabled={scanning || sites.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #0284c7, #00f0ff)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#050811',
                  fontWeight: '800',
                  cursor: scanning ? 'not-allowed' : 'pointer'
                }}
              >
                <Play size={16} />
                {scanning ? 'SCANNING HEADERS & INPUT REFLECTION...' : 'RUN SECURITY SCAN'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scans.map(sc => (
                <div key={sc.id} style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '18px 22px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>SCAN AUDIT #{sc.id.slice(0, 8)}</span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: sc.risk_score > 50 ? 'rgba(239, 68, 68, 0.2)' : sc.risk_score > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: sc.risk_score > 50 ? '#ef4444' : sc.risk_score > 0 ? '#f59e0b' : '#10b981',
                      fontWeight: '800',
                      fontSize: '0.78rem'
                    }}>
                      RISK SCORE: {sc.risk_score}/100
                    </span>
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {sc.findings_summary || 'Target verified clean. No header or reflection anomalies detected.'}
                  </div>
                </div>
              ))}
              {scans.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No vulnerability scans performed yet.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WAF LOGS */}
        {tab === 'waf' && (
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#00f0ff' }}>WAF Reverse Proxy Audit Log</h3>
              <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>● Auto-polling Active (3.5s)</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '10px' }}>TIMESTAMP</th>
                  <th style={{ padding: '10px' }}>SOURCE IP</th>
                  <th style={{ padding: '10px' }}>METHOD</th>
                  <th style={{ padding: '10px' }}>INCOMING PATH</th>
                  <th style={{ padding: '10px' }}>TRIGGERED RULE</th>
                  <th style={{ padding: '10px' }}>SCORE</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {wafLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px', color: '#64748b' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                    <td style={{ padding: '10px', color: '#38bdf8' }}>{log.client_ip}</td>
                    <td style={{ padding: '10px' }}>{log.method}</td>
                    <td style={{ padding: '10px' }}>{log.path}</td>
                    <td style={{ padding: '10px', color: '#f59e0b' }}>{log.rule_triggered}</td>
                    <td style={{ padding: '10px' }}>{log.anomaly_score}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: log.action?.toLowerCase() === 'block' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: log.action?.toLowerCase() === 'block' ? '#ef4444' : '#10b981',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        {log.action?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {wafLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No WAF telemetry recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}