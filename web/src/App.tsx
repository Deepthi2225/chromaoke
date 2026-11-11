import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { AccountPanel } from './components/AccountPanel'
import { History } from './components/History'
import { Logo } from './components/Logo'
import { Home, type SearchState } from './components/Home'
import { Results, type ResultsData } from './components/Results'
import { Setup } from './components/Setup'
import { Typing } from './components/Typing'
import { api, ApiError, getToken, type AudioCandidate, type Mode, type Song } from './engine/api'
import type { SessionResult } from './engine/session'
import { useSongTheme } from './engine/theme'
import { DEFAULT_SPEED, speedFromHistory } from './engine/catalog'
import { emptyKeyStats, mergeKeyStats, sessionKeyStats, type KeyStats } from './engine/keys'
import { loadChosenSpeed, loadHistory, loadKeyStats, writeChosenSpeed, writeHistory, writeKeyStats, type ResultRecord } from './engine/storage'
import { Practice } from './components/Practice'
import { Leaderboards } from './components/Leaderboards'
import { streakDays } from './engine/streak'

interface Run {
  song: Song
  mode: Mode
  audio: AudioCandidate | null
  /** Audio + text only: the song plays only while the typist is typing. */
  follow: boolean
  /** A short practice drill: it updates key statistics but is not saved to history or leaderboards. */
  drill: boolean
  skip: string[]
}

type Screen =
  | { name: 'home' }
  | { name: 'practice' }
  | { name: 'leaderboards' }
  | { name: 'history' }
  | { name: 'account' }
  | { name: 'setup'; songId: number; skip: string[] }
  | ({ name: 'typing'; started: number } & Run)
  | { name: 'results'; data: ResultsData; replay: Run }

// Pages have addresses, so links, reload and the browser's back button work.
function screenFromAddress(): Screen {
  const hash = window.location.hash
  const song = hash.match(/^#\/song\/(\d+)$/)
  if (song) return { name: 'setup', songId: Number(song[1]), skip: [] }
  if (hash === '#/practice') return { name: 'practice' }
  if (hash === '#/leaderboards') return { name: 'leaderboards' }
  if (hash === '#/history') return { name: 'history' }
  if (hash === '#/account') return { name: 'account' }
  return { name: 'home' }
}

function addressOf(screen: Screen): string {
  if (screen.name === 'setup') return `#/song/${screen.songId}`
  if (screen.name === 'typing') return screen.drill ? '#/practice' : `#/song/${screen.song.id}`
  if (screen.name === 'results') return screen.replay.drill ? '#/practice' : `#/song/${screen.data.song.id}`
  return screen.name === 'home' ? '#/' : `#/${screen.name}`
}

const currentAddress = () => window.location.hash || '#/'

const RECENT_SONGS = 3

/** The latest attempt at each of the last few songs, newest first. */
function recentSongs(history: ResultRecord[]): ResultRecord[] {
  const seen = new Map<number, ResultRecord>()
  for (let i = history.length - 1; i >= 0 && seen.size < RECENT_SONGS; i--) {
    if (!seen.has(history[i].songId)) seen.set(history[i].songId, history[i])
  }
  return [...seen.values()]
}

function App() {
  const [history, setHistory] = useState<ResultRecord[]>(loadHistory)
  const [account, setAccount] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(() => Boolean(getToken()))
  const [notice, setNotice] = useState('')
  const [screen, setScreen] = useState<Screen>(screenFromAddress)
  const [search, setSearch] = useState<SearchState>({ query: '', results: null })
  const [keyStats, setKeyStats] = useState<KeyStats>(loadKeyStats)
  const [chosenSpeed, setChosenSpeed] = useState<number | null>(loadChosenSpeed)
  const historySpeed = speedFromHistory(history)
  const speed = chosenSpeed ?? historySpeed ?? DEFAULT_SPEED

  const chooseSpeed = (value: number | null) => {
    setChosenSpeed(value)
    writeChosenSpeed(value)
  }

  useEffect(() => {
    if (currentAddress() !== addressOf(screen)) window.history.pushState(null, '', addressOf(screen))
  }, [screen])

  useEffect(() => {
    const onMove = () => setScreen((current) => (addressOf(current) === currentAddress() ? current : screenFromAddress()))
    window.addEventListener('popstate', onMove)
    return () => window.removeEventListener('popstate', onMove)
  }, [])

  useEffect(() => {
    if (!account && !connecting) writeHistory(history)
  }, [history, account, connecting])

  useEffect(() => {
    if (!account && !connecting) writeKeyStats(keyStats)
  }, [keyStats, account, connecting])

  const loadAccount = useCallback(async () => {
    const data = await api.me()
    setAccount(data.username)
    setHistory(data.history)
    setKeyStats(data.keyStats)
  }, [])

  useEffect(() => {
    if (!getToken()) return
    // State is only set after the server responds (async), so this is a genuine external sync.
    // oxlint-disable-next-line react/set-state-in-effect
    loadAccount()
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) api.forgetToken()
        setNotice(error instanceof ApiError && error.status === 401 ? 'Your session expired. You are not signed in.' : 'Server unreachable. History is saved in this browser for now.')
      })
      .finally(() => setConnecting(false))
  }, [loadAccount])

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])
  const openSong = useCallback((songId: number) => setScreen({ name: 'setup', songId, skip: [] }), [])

  const backToGuest = () => {
    setAccount(null)
    setHistory(loadHistory())
    setKeyStats(loadKeyStats())
    goHome()
  }

  const signIn = async (mode: 'login' | 'register', username: string, password: string) => {
    await (mode === 'login' ? api.login(username, password) : api.register(username, password))
    await loadAccount()
    setNotice('')
    goHome()
  }

  const signOut = async () => {
    await api.logout().catch(() => undefined)
    backToGuest()
  }

  const deleteAccount = async () => {
    await api.deleteAccount()
    backToGuest()
    setNotice('Account deleted.')
  }

  const clearHistory = async () => {
    if (!account) {
      setHistory([])
      setKeyStats(emptyKeyStats())
      return
    }
    try {
      await api.clearHistory()
      await loadAccount()
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'Could not clear history.')
    }
  }

  const finishTyping = useCallback(
    (result: SessionResult) => {
      if (screen.name !== 'typing') return
      const { song, mode, audio, follow, drill, skip } = screen
      const earlier = drill ? [] : history.filter((r) => r.songId === song.id && r.mode === mode).map((r) => r.wpm)
      const { wpm, accuracy, consistency } = result.metrics
      const typedKeys = sessionKeyStats(result.metrics)
      // Shown right away; for accounts, the server's own totals replace these below.
      setKeyStats((previous) => mergeKeyStats(previous, typedKeys))
      if (!drill) {
        setHistory((previous) => [
          ...previous,
          { at: Date.now(), songId: song.id, title: song.title, artist: song.artist, mode, wpm, accuracy, consistency, completion: result.completion },
        ])
      }
      if (account) {
        const saving = drill ? api.addKeyStats(typedKeys) : api.submitResult(song.id, mode, result, typedKeys)
        saving.then(loadAccount).catch((error) => {
          setNotice(`This result was not saved to your account: ${error instanceof ApiError ? error.message : 'unknown error'}`)
          loadAccount().catch(() => undefined)
        })
      }
      setScreen({
        name: 'results',
        data: { song, mode, result, previousBest: earlier.length ? Math.max(...earlier) : null },
        replay: { song, mode, audio, follow, drill, skip },
      })
    },
    [account, history, loadAccount, screen],
  )

  const exitTyping = useCallback(() => {
    if (screen.name === 'typing') setScreen(screen.drill ? { name: 'practice' } : { name: 'setup', songId: screen.song.id, skip: screen.skip })
  }, [screen])

  const audioFailed = useCallback(() => {
    if (screen.name !== 'typing' || !screen.audio) return
    setNotice("That recording wouldn't play, so it was removed from the list.")
    setScreen({ name: 'setup', songId: screen.song.id, skip: [...screen.skip, screen.audio.trackId] })
  }, [screen])

  const typeAgain = useCallback(() => {
    if (screen.name === 'results') setScreen({ name: 'typing', started: Date.now(), ...screen.replay })
  }, [screen])

  const typing = screen.name === 'typing'
  // Colour arrives with the music: the page stays monochrome until this run of the song has started.
  const [colouredRun, setColouredRun] = useState<number | null>(null)
  const inColour = screen.name === 'results' || (screen.name === 'typing' && colouredRun === screen.started)
  const playing = screen.name === 'typing' ? screen.song : screen.name === 'results' ? screen.data.song : null
  const artUrl = useSongTheme(screen.name === 'setup' ? screen.songId : playing?.id ?? null, inColour)

  useEffect(() => {
    document.title = playing ? `♫ ${playing.title} — ${playing.artist}` : 'Chromaoke'
  }, [playing])

  const tab = (name: Screen['name']) => (screen.name === name ? 'current' : '')

  return (
    <div className={inColour ? 'shell in-colour' : 'shell'}>
      <div className="atmosphere" aria-hidden />
      <header className="topbar">
        <button className="brand" onClick={goHome} disabled={typing}>
          <Logo />
          <span>Chromaoke</span>
        </button>
        {!typing && (
          <nav>
            <button className={tab('home')} onClick={goHome}>Home</button>
            <button className={tab('practice')} onClick={() => setScreen({ name: 'practice' })}>Practice</button>
            <button className={tab('leaderboards')} onClick={() => setScreen({ name: 'leaderboards' })}>Leaderboards</button>
            <button className={tab('history')} onClick={() => setScreen({ name: 'history' })}>Progress</button>
            <button className={tab('account')} onClick={() => setScreen({ name: 'account' })}>{account ?? 'Sign in'}</button>
          </nav>
        )}
      </header>

      <main>
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button className="link" onClick={() => setNotice('')} aria-label="Dismiss">✕</button>
          </div>
        )}
        {connecting ? (
          <p className="muted">Signing you in…</p>
        ) : (
          <>
            {screen.name === 'home' && <Home
                state={search}
                recent={recentSongs(history)}
                played={new Set(history.map((record) => record.songId))}
                speed={speed}
                speedSource={chosenSpeed !== null ? 'chosen' : historySpeed !== null ? 'history' : 'default'}
                canFollowHistory={historySpeed !== null}
                onChooseSpeed={chooseSpeed}
                streak={streakDays(history)}
                onLeaderboards={() => setScreen({ name: 'leaderboards' })}
                onChange={setSearch}
                onPick={openSong}
              />}
            {screen.name === 'practice' && (
              <Practice
                stats={keyStats}
                speed={speed}
                onPick={openSong}
                onHome={goHome}
                onDrill={(drill) => setScreen({ name: 'typing', started: Date.now(), song: drill, mode: 'text', audio: null, follow: false, drill: true, skip: [] })}
              />
            )}
            {screen.name === 'leaderboards' && <Leaderboards username={account} onPick={openSong} />}
            {screen.name === 'history' && <History history={history} keyStats={keyStats} signedIn={Boolean(account)} onPick={openSong} onClear={clearHistory} />}
            {screen.name === 'account' && (
              <AccountPanel username={account} onSignIn={signIn} onSignOut={signOut} onDeleteAccount={deleteAccount} onClose={goHome} />
            )}
            {screen.name === 'setup' && (
              <Setup
                key={`${screen.songId}-${screen.skip.length}`}
                songId={screen.songId}
                artUrl={artUrl}
                username={account}
                attempts={history.filter((record) => record.songId === screen.songId)}
                speed={speed}
                skip={screen.skip}
                onBack={goHome}
                onStart={(song, mode, audio, follow) => setScreen({ name: 'typing', started: Date.now(), song, mode, audio, follow, drill: false, skip: screen.skip })}
              />
            )}
            {screen.name === 'typing' && (
              <Typing
                key={screen.started}
                song={screen.song}
                mode={screen.mode}
                audio={screen.audio}
                follow={screen.follow}
                artUrl={artUrl}
                onStarted={() => setColouredRun(screen.started)}
                onFinish={finishTyping}
                onExit={exitTyping}
                onAudioFailed={audioFailed}
              />
            )}
            {screen.name === 'results' && (
              <Results
                data={screen.data}
                onAgain={typeAgain}
                onNewSong={screen.replay.drill ? () => setScreen({ name: 'practice' }) : goHome}
                onLeaderboard={screen.replay.drill ? null : () => openSong(screen.data.song.id)}
                onSignIn={account || screen.replay.drill ? null : () => setScreen({ name: 'account' })}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
