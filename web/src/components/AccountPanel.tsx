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
      <div className="account" role="dialog" aria-label="Account">
        <strong className="account-name">{username}</strong>
        <p className="muted">Your results are saved to this account, and your full runs appear on song leaderboards.</p>
        <div className="actions">
          <button className="ghost" onClick={onSignOut}>Sign out</button>
          <button className="ghost" onClick={onClose}>Back to home</button>
        </div>
        <div className="danger-zone">
          {confirmDelete ? (
            <>
              <span>Delete the account and all its data?</span>
              <button className="danger" onClick={() => onDeleteAccount().catch((e) => setError(e.message))}>Delete</button>
              <button className="ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button className="link" onClick={() => setConfirmDelete(true)}>Delete account</button>
          )}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <form className="account" role="dialog" aria-label={mode === 'login' ? 'Sign in' : 'Create account'} onSubmit={submit}>
      <div className="account-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
      </div>
      <label className="field">
        <span>Username</span>
        <input autoFocus autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} pattern="[A-Za-z0-9_]{3,24}" title="3-24 letters, digits or underscores" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <p className="muted">
        {mode === 'register' ? 'A new account starts fresh. Guest history stays on this device.' : 'Without an account, history stays in this browser.'}
      </p>
      <button type="button" className="link" onClick={onClose}>Continue without signing in</button>
    </form>
  )
}
