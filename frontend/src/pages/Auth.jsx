import { useEffect, useState } from 'react'
import '../App.css'
import { LogoMark } from '../components/Logo.jsx'
import { useTheme } from '../components/Shell.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const initialForm = { fullName: '', email: '', password: '', confirmPassword: '' }

function Icon({ name, size = 20 }) {
  const paths = {
    arrow:   <path d="M5 12h13m-6-6 6 6-6 6" />,
    check:   <path d="m5 12 4 4L19 6" />,
    eye:     <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff:  <><path d="m3 3 18 18M10.6 6.2A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a18.4 18.4 0 0 1-3.1 3.7M6.2 6.8C3.5 8.4 2 12 2 12s3.5 6 10 6a10.8 10.8 0 0 0 3.4-.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    lock:    <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    mail:    <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    user:    <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    sparkle: <path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Zm6.5 12 .5 2.2 2.2.5-2.2.5-.5 2.2-.5-2.2-2.2-.5 2.2-.5.5-2.2Z" />,
    sun:     <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon:    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
  }
  return (
    <svg
      aria-hidden="true"
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function validate(form, mode) {
  const errors = {}
  if (mode === 'signup' && !form.fullName.trim()) errors.fullName = 'Enter your full name.'
  if (!form.email.trim()) errors.email = 'Enter your email address.'
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Enter your password.'
  else if (form.password.length < 8) errors.password = 'Use at least 8 characters.'
  if (mode === 'signup' && form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)

  // Theme toggle — shared with the dashboard
  const { theme, toggle: toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('roninRemembered')
    if (rememberedEmail && rememberedEmail !== 'true' && rememberedEmail !== 'false') {
      setForm((current) => ({ ...current, email: rememberedEmail }))
      setRemember(true)
    }
  }, [])

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setForm(initialForm)
    setErrors({})
    setNotice(null)
    setShowPassword(false)
    setShowConfirm(false)
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }))
    if (notice) setNotice(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    setNotice(null)

    try {
      const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login'
      const payload = mode === 'signup'
        ? { fullName: form.fullName.trim(), email: form.email.trim(), password: form.password }
        : { email: form.email.trim(), password: form.password }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setNotice({ type: 'error', text: data.message || 'Something went wrong.' })
        setLoading(false)
        return
      }

      if (mode === 'signup') {
        setNotice({ type: 'success', text: 'Account created. You can now sign in.' })
        setTimeout(() => {
          setMode('login')
          setForm((current) => ({ ...current, email: form.email, password: '', confirmPassword: '' }))
          setNotice(null)
        }, 800)
      } else {
        localStorage.setItem('roninToken', data.token)
        localStorage.setItem('roninUser', JSON.stringify(data.user))
        if (remember) localStorage.setItem('roninRemembered', form.email)
        else localStorage.removeItem('roninRemembered')
        if (onAuth) onAuth(data.user)
      }
    } catch {
      setNotice({ type: 'error', text: 'Could not reach backend API. Is the backend server running?' })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = (event) => {
    event.preventDefault()
    setNotice({ type: 'info', text: 'Password reset instructions will be sent if an account exists.' })
  }

  // Submit button colors — explicit so they're readable in both themes
  const btnBg    = isDark ? '#2DD4BF' : '#002FA7'
  const btnColor = isDark ? '#090D16' : '#ffffff'
  const btnHover = isDark ? '#5EEAD4' : '#002488'

  return (
    <main className="auth-page" style={{ position: 'relative' }}>

      {/* ── Floating theme toggle ─────────────────────────── */}
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Icon name={isDark ? 'sun' : 'moon'} size={17} />
      </button>

      {/* ── Brand panel (left) ───────────────────────────── */}
      <section className="brand-panel" aria-label="About Ronin">
        <div className="brand-mark"><LogoMark size={28} /><span>RONIN</span></div>
        <div className="brand-copy">
          <p className="eyebrow">Autonomous API Security Platform</p>
          <h1>Map. Exploit. Validate.</h1>
          <p className="brand-description">
            Simulate human penetration tester workflows locally. Discover BOLA, broken auth,
            and critical API flaws with zero data leakage.
          </p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" aria-hidden="true" />
          Local AI Engine: Ready (Ollama / Qwen 2.5 Coder)
        </div>
      </section>

      {/* ── Form panel (right) ───────────────────────────── */}
      <section className="form-panel">
        <div className="form-wrap">
          {/* Mobile brand */}
          <div className="mobile-brand">
            <div className="brand-mark"><LogoMark size={26} /><span>RONIN</span></div>
          </div>

          <div className="form-heading">
            <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</p>
            <h2>{mode === 'login' ? 'Sign in to Ronin' : 'Create your account'}</h2>
            <p>{mode === 'login'
              ? 'Enter your details to continue to your workspace.'
              : 'Create your local Ronin credentials to access the security testing console.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Full name — signup only */}
            {mode === 'signup' && (
              <div className="field-group">
                <label htmlFor="fullName">Full name</label>
                <div className={`input-shell ${errors.fullName ? 'has-error' : ''}`}>
                  <Icon name="user" size={18} />
                  <input id="fullName" name="fullName" value={form.fullName} onChange={updateField} placeholder="Alex Morgan" autoComplete="name" />
                </div>
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>
            )}

            {/* Email */}
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <div className={`input-shell ${errors.email ? 'has-error' : ''}`}>
                <Icon name="mail" size={18} />
                <input id="email" name="email" type="email" value={form.email} onChange={updateField} placeholder="you@example.com" autoComplete="email" />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="field-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                {mode === 'login' && <a href="#forgot" onClick={handleForgotPassword}>Forgot password?</a>}
              </div>
              <div className={`input-shell ${errors.password ? 'has-error' : ''}`}>
                <Icon name="lock" size={18} />
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={updateField}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button className="icon-button" type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {/* Confirm password — signup only */}
            {mode === 'signup' && (
              <div className="field-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className={`input-shell ${errors.confirmPassword ? 'has-error' : ''}`}>
                  <Icon name="lock" size={18} />
                  <input
                    id="confirmPassword" name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword} onChange={updateField}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button className="icon-button" type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                    <Icon name={showConfirm ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </div>
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
            )}

            {/* Remember me — login only */}
            {mode === 'login' && (
              <label className="remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="checkbox-mark"><Icon name="check" size={13} /></span>
                Remember me
              </label>
            )}

            {/* Notice */}
            {notice && (
              <div className={`notice ${notice.type}`} role="alert">
                {notice.type === 'success' && <Icon name="check" size={17} />}
                {notice.text}
              </div>
            )}

            {/* Submit */}
            <button
              className="submit-button"
              type="submit"
              disabled={loading}
              style={{ background: btnBg, color: btnColor, '--btn-hover-bg': btnHover }}
            >
              {loading
                ? <><span className="spinner" style={{ borderTopColor: btnColor, borderColor: `${btnColor}55` }} />{mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                : <>{mode === 'login' ? 'Sign in' : 'Create account'}<Icon name="arrow" size={18} /></>
              }
            </button>
          </form>

          <p className="switch-copy">
            {mode === 'login' ? 'New to Ronin?' : 'Already have an account?'}{' '}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          <p className="legal-copy">
            By continuing, you agree to Ronin's <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </main>
  )
}
