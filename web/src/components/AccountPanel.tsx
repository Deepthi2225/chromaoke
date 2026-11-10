import { useState, type FormEvent } from 'react'
import { ApiError } from '../engine/api'

interface Props {
  username: string | null
  onSignIn: (mode: 'login' | 'register', username: string, password: string) => Promise<void>
  onSignOut: () => void
  onDeleteAccount: () => Promise<void>
  onClose: () => void
}

export function AccountPanel({ username, onSignIn, onSignOut, onDeleteAccount, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSignIn(mode, name.trim(), password)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (username) {
    return (
      <div className="account holo-panel" role="dialog" aria-label="Account">
        <p className="eyebrow cyan">SIGNED IN</p>
        <strong className="account-name">{username}</strong>
        <p className="muted small">Your repairs, XP and typing profile are saved to your account.</p>
        <div className="account-actions">
          <button className="ghost-btn" onClick={onSignOut}>Sign out</button>
          <button className="ghost-btn" onClick={onClose}>Close</button>
        </div>
        <div className="danger-zone">
          {confirmDelete ? (
            <>
              <span>Delete the account and all its data?</span>
              <button className="danger-btn" onClick={() => onDeleteAccount().catch((e) => setError(e.message))}>Delete</button>
              <button className="ghost-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button className="link-btn" onClick={() => setConfirmDelete(true)}>Delete account</button>
          )}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <form className="account holo-panel" role="dialog" aria-label={mode === 'login' ? 'Sign in' : 'Create account'} onSubmit={submit}>
      <div className="account-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
      </div>
      <label className="field">
        <span>Technician name</span>
        <input autoFocus autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} pattern="[A-Za-z0-9_]{3,24}" title="3-24 letters, digits or underscores" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-btn" disabled={busy}>{busy ? 'CONNECTING…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</button>
      <p className="muted small">
        {mode === 'register' ? 'A new account starts fresh. Guest progress stays on this device.' : 'Playing as a guest saves progress on this device only.'}
      </p>
      <button type="button" className="link-btn" onClick={onClose}>Keep playing as guest</button>
    </form>
  )
}
