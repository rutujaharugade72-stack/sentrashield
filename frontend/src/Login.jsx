import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Mail, Terminal, AlertTriangle, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess, apiBase }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('local@sentrashield.dev');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);

  // Dynamic Cyber Terminal / Matrix Rain Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '01ABCDEF9876543210SENTRASHIELD_WAF_INSPECT_PACKET_ANOMALY';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(7, 11, 20, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00f0ff';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('sentra_token', data.token);
      localStorage.setItem('sentra_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: '#050811',
      fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace'
    }}>
      {/* Background Matrix/SOC Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.28,
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Cyber Grid Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        zIndex: 2,
        pointerEvents: 'none'
      }} />

      {/* Glassmorphism SOC Login Modal */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(10, 16, 31, 0.85)',
        border: '1px solid rgba(0, 240, 255, 0.35)',
        borderRadius: '16px',
        padding: '38px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 50px rgba(0, 240, 255, 0.2), inset 0 0 20px rgba(0, 240, 255, 0.05)'
      }}>
        {/* Terminal Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#00f0ff', letterSpacing: '1px', textTransform: 'uppercase' }}>
            NODE: SENTRASHIELD-SEC-GATE
          </div>
        </div>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(37, 99, 235, 0.2))',
            border: '1px solid rgba(0, 240, 255, 0.5)',
            boxShadow: '0 0 25px rgba(0, 240, 255, 0.35)',
            marginBottom: '14px'
          }}>
            <Shield size={32} color="#00f0ff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '1px', color: '#fff', margin: 0 }}>
            SENTRA<span style={{ color: '#00f0ff' }}>SHIELD</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '6px', letterSpacing: '0.5px' }}>
            AI-DEFENSE & CYBERSECURITY TELEMETRY CONSOLE
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: '0.82rem',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#00f0ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ACCESS IDENTITY (EMAIL)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '8px',
                  background: 'rgba(7, 11, 20, 0.85)',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#00f0ff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              SECURE CIPHER (PASSWORD)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '8px',
                  background: 'rgba(7, 11, 20, 0.85)',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(90deg, #0284c7, #00f0ff)',
              color: '#050811',
              fontWeight: '800',
              fontSize: '0.9rem',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'AUTHENTICATING ENCRYPTED SESSION...' : (
              <>
                {isRegister ? 'INITIALIZE OPERATOR ACCOUNT' : 'ENTER SOC CONSOLE'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          {isRegister ? 'OPERATOR ALREADY ENROLLED?' : 'NEW THREAT OPERATOR?'}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#00f0ff',
              marginLeft: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'SIGN IN' : 'REGISTER WORKSPACE'}
          </button>
        </div>
      </div>
    </div>
  );
}