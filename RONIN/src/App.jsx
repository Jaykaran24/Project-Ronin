import { useState } from 'react'
import './App.css'

const initialForm = { fullName: '', email: '', password: '', confirmPassword: '' }

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <path d="M5 12h13m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a18.4 18.4 0 0 1-3.1 3.7M6.2 6.8C3.5 8.4 2 12 2 12s3.5 6 10 6a10.8 10.8 0 0 0 3.4-.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    sparkle: <path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Zm6.5 12 .5 2.2 2.2.5-2.2.5-.5 2.2-.5-2.2-2.2-.5 2.2-.5.5-2.2Z" />,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
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

async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function App() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const switchMode = (nextMode) => {
    setMode(nextMode); setForm(initialForm); setErrors({}); setNotice(null)
    setShowPassword(false); setShowConfirm(false)
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }))
    if (notice) setNotice(null)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validate(form, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setLoading(true)
    window.setTimeout(async () => {
      const savedUser = JSON.parse(localStorage.getItem('roninUser') || 'null')
      const email = form.email.trim().toLowerCase()
      const passwordHash = await hashPassword(form.password)
      if (mode === 'signup') {
        if (savedUser?.email === email) setNotice({ type: 'error', text: 'An account with this email already exists.' })
        else {
          localStorage.setItem('roninUser', JSON.stringify({ name: form.fullName.trim(), email, passwordHash }))
          setNotice({ type: 'success', text: 'Account created. You can now log in.' })
          setTimeout(() => switchMode('login'), 700)
        }
      } else if (!savedUser || savedUser.email !== email || savedUser.passwordHash !== passwordHash) {
        setNotice({ type: 'error', text: 'The email or password is incorrect.' })
      } else {
        if (remember) localStorage.setItem('roninRemembered', 'true')
        setNotice({ type: 'success', text: `Welcome back, ${savedUser.name.split(' ')[0]}.` })
        setAuthenticated(true)
      }
      setLoading(false)
    }, 650)
  }

  const handleForgotPassword = (event) => {
    event.preventDefault()
    setNotice({ type: 'info', text: 'Password reset instructions will be sent if an account exists.' })
  }

  if (authenticated) {
    return <main className="dashboard"><div className="dashboard-top"><div className="brand-mark"><Icon name="sparkle" size={22} /><span>RONIN</span></div><button type="button" onClick={() => setAuthenticated(false)}>Sign out</button></div><div className="dashboard-content"><p className="eyebrow">Your workspace</p><h1>Good to have you back.</h1><p>Your Ronin workspace is ready for what comes next.</p><button className="submit-button" type="button"><Icon name="sparkle" size={18} /> Open workspace</button></div></main>
  }

  return (
    <main className="auth-page">
      <section className="brand-panel" aria-label="About Ronin">
        <div className="brand-mark"><Icon name="sparkle" size={22} /><span>RONIN</span></div>
        <div className="brand-copy"><p className="eyebrow">Your focused workspace</p><h1>Move with<br /><em>intention.</em></h1><p className="brand-description">A quiet place to think clearly, make progress, and keep your work moving forward.</p></div>
        <div className="brand-footer"><span className="status-dot" /> Ronin is ready when you are</div>
      </section>
      <section className="form-panel">
        <div className="form-wrap">
          <div className="mobile-brand"><div className="brand-mark"><Icon name="sparkle" size={20} /><span>RONIN</span></div></div>
          <div className="form-heading"><p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</p><h2>{mode === 'login' ? 'Sign in to Ronin' : 'Create your account'}</h2><p>{mode === 'login' ? 'Enter your details to continue to your workspace.' : 'Set up your account and begin with a clear mind.'}</p></div>
          <form onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && <div className="field-group"><label htmlFor="fullName">Full name</label><div className={`input-shell ${errors.fullName ? 'has-error' : ''}`}><Icon name="user" size={18} /><input id="fullName" name="fullName" value={form.fullName} onChange={updateField} placeholder="Alex Morgan" autoComplete="name" /></div>{errors.fullName && <span className="field-error">{errors.fullName}</span>}</div>}
            <div className="field-group"><label htmlFor="email">Email address</label><div className={`input-shell ${errors.email ? 'has-error' : ''}`}><Icon name="mail" size={18} /><input id="email" name="email" type="email" value={form.email} onChange={updateField} placeholder="you@example.com" autoComplete="email" /></div>{errors.email && <span className="field-error">{errors.email}</span>}</div>
            <div className="field-group"><div className="label-row"><label htmlFor="password">Password</label>{mode === 'login' && <a href="#forgot" onClick={handleForgotPassword}>Forgot password?</a>}</div><div className={`input-shell ${errors.password ? 'has-error' : ''}`}><Icon name="lock" size={18} /><input id="password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button className="icon-button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} /></button></div>{errors.password && <span className="field-error">{errors.password}</span>}</div>
            {mode === 'signup' && <div className="field-group"><label htmlFor="confirmPassword">Confirm password</label><div className={`input-shell ${errors.confirmPassword ? 'has-error' : ''}`}><Icon name="lock" size={18} /><input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={updateField} placeholder="••••••••" autoComplete="new-password" /><button className="icon-button" type="button" onClick={() => setShowConfirm((visible) => !visible)} aria-label={showConfirm ? 'Hide password' : 'Show password'}><Icon name={showConfirm ? 'eyeOff' : 'eye'} size={18} /></button></div>{errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}</div>}
            {mode === 'login' && <label className="remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span className="checkbox-mark"><Icon name="check" size={13} /></span> Remember me</label>}
            {notice && <div className={`notice ${notice.type}`} role="alert">{notice.type === 'success' && <Icon name="check" size={17} />}{notice.text}</div>}
            <button className="submit-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={18} /></>}</button>
          </form>
          <p className="switch-copy">{mode === 'login' ? 'New to Ronin?' : 'Already have an account?'} <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          <p className="legal-copy">By continuing, you agree to Ronin's <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p>
        </div>
      </section>
    </main>
  )
}

export default App
