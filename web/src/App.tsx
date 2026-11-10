import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { AccountPanel } from './components/AccountPanel'
import { Briefing } from './components/Briefing'
import { Lab } from './components/Lab'
import { RepairStation, type RepairResult } from './components/RepairStation'
import { Report, type ReportData } from './components/Report'
import { Workshop } from './components/Workshop'
import { getMission, type MissionId } from './data/missions'
import { emptyProfile, updateProfile } from './engine/analyzer'
import { api, ApiError, getToken, type AccountData } from './engine/api'
import { sessionNotes } from './engine/coach'
import { nextLevel, pickPassage } from './engine/difficulty'
import { sfx } from './engine/sound'
import { defaultSave, loadSave, rankFor, writeSave, type SaveData, type Settings } from './engine/storage'
import { computeStars, computeXp } from './engine/typing'

type Screen =
  | { name: 'workshop' }
  | { name: 'lab' }
  | { name: 'briefing'; mission: MissionId }
  | { name: 'repair'; mission: MissionId; level: number; passage: string; run: number }
  | { name: 'report'; data: ReportData }

/** Signed-in players: progress comes from the server, settings stay per device. */
const fromAccount = (data: AccountData, settings: Settings): SaveData => ({
  xp: data.xp,
  missions: data.missions,
  history: data.history,
  profile: data.profile ?? emptyProfile(),
  settings,
})

function App() {
  const [save, setSave] = useState<SaveData>(loadSave)
  const [account, setAccount] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(() => Boolean(getToken()))
  const [notice, setNotice] = useState('')
  const [screen, setScreen] = useState<Screen>({ name: 'workshop' })
  const [panel, setPanel] = useState<null | 'settings' | 'account'>(null)

  // The guest save lives in localStorage; an account's save lives on the server.
  useEffect(() => {
    if (!account && !connecting) writeSave(save)
  }, [save, account, connecting])

  const loadAccount = useCallback(async () => {
    const data = await api.me()
    setAccount(data.username)
    setSave((prev) => fromAccount(data, prev.settings))
  }, [])

  // Resume a stored session on start-up.
  useEffect(() => {
    if (!getToken()) return
    // State is only set after the server responds (async), so this is a genuine external sync.
    // oxlint-disable-next-line react/set-state-in-effect
    loadAccount()
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) api.forgetToken()
        setNotice(error instanceof ApiError && error.status === 401 ? 'Your session expired. Playing as guest.' : 'Server unreachable. Playing as guest on this device.')
      })
      .finally(() => setConnecting(false))
  }, [loadAccount])

  const backToGuest = useCallback(() => {
    setAccount(null)
    setSave((prev) => ({ ...loadSave(), settings: prev.settings }))
  }, [])

  const signIn = async (mode: 'login' | 'register', username: string, password: string) => {
    await (mode === 'login' ? api.login(username, password) : api.register(username, password))
    await loadAccount()
    setPanel(null)
    setNotice('')
    setScreen({ name: 'workshop' })
  }

  const signOut = async () => {
    await api.logout().catch(() => undefined)
    backToGuest()
    setPanel(null)
    setScreen({ name: 'workshop' })
  }

  const startRepair = useCallback(
    (mission: MissionId, level: number, avoid?: string) => {
      const passage = pickPassage(getMission(mission).levels[level - 1], save.profile, avoid)
      setScreen({ name: 'repair', mission, level, passage, run: Date.now() })
    },
    [save.profile],
  )

  const finishRepair = useCallback(
    (result: RepairResult) => {
      if (screen.name !== 'repair') return
      const mission = getMission(screen.mission)
      const level = mission.levels[screen.level - 1]
      const { metrics, repaired, timeLeft, passage, correctCharacters } = result
      const xp = computeXp(metrics, repaired, screen.level, timeLeft)
      const stars = computeStars(metrics, repaired, level.targetWpm)
      const progress = save.missions[mission.id] ?? { level: 1, bestStars: 0, bestWpm: 0, repairs: 0 }
      // The adaptive engine works from the player's current recommended level for this mission.
      const decision = nextLevel(Math.max(progress.level, screen.level), mission.levels.length, metrics, level, repaired)
      const profile = updateProfile(save.profile, metrics)
      const rankUp = rankFor(save.xp + xp).rank > rankFor(save.xp).rank

      // Optimistic update; for accounts the server's recomputed result replaces it below.
      setSave((prev) => ({
        ...prev,
        xp: prev.xp + xp,
        profile,
        missions: {
          ...prev.missions,
          [mission.id]: {
            level: decision.level,
            bestStars: Math.max(progress.bestStars, stars),
            bestWpm: repaired ? Math.max(progress.bestWpm, metrics.wpm) : progress.bestWpm,
            repairs: progress.repairs + (repaired ? 1 : 0),
          },
        },
        history: [
          ...prev.history,
          { at: Date.now(), mission: mission.id, level: screen.level, wpm: metrics.wpm, accuracy: metrics.accuracy, consistency: metrics.consistency, repaired, xp, stars },
        ],
      }))
      if (account) {
        api
          .submitSession({ mission: mission.id, level: screen.level, passage, repaired, timeLeft, correctCharacters, metrics, profile })
          .then(loadAccount)
          .catch((error) => {
            setNotice(`This repair was not saved to your account: ${error instanceof ApiError ? error.message : 'unknown error'}`)
            loadAccount().catch(() => undefined)
          })
      }
      if (rankUp && save.settings.sound) window.setTimeout(sfx.levelUp, 700)
      setScreen({
        name: 'report',
        data: { mission, level: screen.level, metrics, repaired, xp, stars, decision, notes: sessionNotes(metrics, profile), rankUp },
      })
    },
    [account, loadAccount, save, screen],
  )

  const clearHistory = async () => {
    if (!account) return setSave((prev) => ({ ...defaultSave(), settings: prev.settings }))
    try {
      await api.clearHistory()
      await loadAccount()
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'Could not clear history.')
    }
  }

  const deleteAccount = async () => {
    await api.deleteAccount()
    backToGuest()
    setPanel(null)
    setScreen({ name: 'workshop' })
    setNotice('Account deleted.')
  }

  const updateSettings = (patch: Partial<Settings>) => {
    const settings = { ...save.settings, ...patch }
    setSave((prev) => ({ ...prev, settings }))
    // Settings are per device, so keep the guest save's copy in sync even while signed in.
    if (account) writeSave({ ...loadSave(), settings })
  }
  const goHome = useCallback(() => setScreen({ name: 'workshop' }), [])
  const togglePanel = (name: 'settings' | 'account') => setPanel((open) => (open === name ? null : name))
  const rank = rankFor(save.xp)
  const inRepair = screen.name === 'repair'

  return (
    <div className={`app-shell ${save.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <div className="backdrop" aria-hidden><div className="orb one" /><div className="orb two" /><div className="grid-floor" /></div>

      <header className="topbar">
        <button className="brand" onClick={goHome} disabled={inRepair}>
          <img src="/favicon.svg" width="30" height="30" alt="" className="brand-icon" />
          <span>ROBOT REPAIR</span>
        </button>
        {!inRepair && (
          <nav className="tabs">
            <button className={screen.name === 'workshop' || screen.name === 'briefing' ? 'active' : ''} onClick={goHome}>Workshop</button>
            <button className={screen.name === 'lab' ? 'active' : ''} onClick={() => setScreen({ name: 'lab' })}>Performance Lab</button>
          </nav>
        )}
        <div className="technician">
          <div className="rank-chip">
            <span className={`status-dot ${account ? '' : 'guest'}`} />
            <span>{account ? account.toUpperCase() : 'GUEST'} · RANK {rank.rank}</span>
          </div>
          <div className="xp-bar" title={`${rank.into} / ${rank.need} XP to next rank`}>
            <i style={{ width: `${(rank.into / rank.need) * 100}%` }} />
          </div>
          <span className="xp">{save.xp.toLocaleString()} XP</span>
          {!inRepair && (
            <button className="account-btn" aria-expanded={panel === 'account'} onClick={() => togglePanel('account')}>
              {account ? 'Account' : 'Sign in'}
            </button>
          )}
          <button className="icon-btn" aria-label="Settings" aria-expanded={panel === 'settings'} onClick={() => togglePanel('settings')}>⚙</button>
        </div>
      </header>

      {panel === 'settings' && (
        <div className="settings holo-panel" role="dialog" aria-label="Settings">
          <Toggle label="Sound effects" checked={save.settings.sound} onChange={(v) => updateSettings({ sound: v })} />
          <Toggle label="Glitch effects on mistakes" checked={save.settings.glitchEffects} onChange={(v) => updateSettings({ glitchEffects: v })} />
          <Toggle label="Reduce motion" checked={save.settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />
          <button className="ghost-btn" onClick={() => setPanel(null)}>Done</button>
        </div>
      )}
      {panel === 'account' && !inRepair && (
        <AccountPanel username={account} onSignIn={signIn} onSignOut={signOut} onDeleteAccount={deleteAccount} onClose={() => setPanel(null)} />
      )}

      <main className="content">
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button className="link-btn" onClick={() => setNotice('')} aria-label="Dismiss">✕</button>
          </div>
        )}
        {connecting ? (
          <div className="connecting">Connecting to the repair facility…</div>
        ) : (
          <>
            {screen.name === 'workshop' && <Workshop save={save} onSelect={(mission) => setScreen({ name: 'briefing', mission })} />}
            {screen.name === 'lab' && <Lab save={save} signedIn={Boolean(account)} onClear={clearHistory} />}
            {screen.name === 'briefing' && (
              <Briefing
                mission={getMission(screen.mission)}
                progress={save.missions[screen.mission]}
                onStart={(level) => startRepair(screen.mission, level)}
                onBack={goHome}
              />
            )}
            {screen.name === 'repair' && (
              <RepairStation
                key={screen.run}
                mission={getMission(screen.mission)}
                level={getMission(screen.mission).levels[screen.level - 1]}
                passage={screen.passage}
                settings={save.settings}
                onFinish={finishRepair}
                onAbort={() => setScreen({ name: 'briefing', mission: screen.mission })}
              />
            )}
            {screen.name === 'report' && (
              <Report
                data={screen.data}
                onRetry={() => startRepair(screen.data.mission.id, save.missions[screen.data.mission.id]?.level ?? screen.data.decision.level)}
                onHome={goHome}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  )
}

export default App
