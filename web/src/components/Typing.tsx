import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { estimateWordTimes } from '../engine/wordTimes'
import { audioCredit, type AudioCandidate, type Mode, type Song } from '../engine/api'
import { formatTime } from '../engine/format'
import { LyricSession, type SessionResult } from '../engine/session'
import { MODE_LABEL } from '../engine/storage'
import { AudioPlayer, type PlayerHandle } from './AudioPlayer'
import { LyricsPane } from './LyricsPane'

interface Props {
  song: Song
  mode: Mode
  audio: AudioCandidate | null
  /** Sing as I type: each word is sung as it is typed, and the song never runs ahead of the typist. */
  follow: boolean
  artUrl: string | null
  /** The song began playing, or the first key was typed in Text only. */
  onStarted: () => void
  onFinish: (result: SessionResult) => void
  onExit: () => void
  onAudioFailed: () => void
}

const REWIND_SECONDS = 5
const SYNC_STEP = 0.5
const GATE_TICK_MS = 40
/** Sing-as-I-type: start a touch before a word, and jump forward if the song has fallen this far behind the typing. */
const WORD_LEAD_IN_SECONDS = 0.15
const CATCH_UP_SECONDS = 2.5

export function Typing({ song, mode, audio, follow, artUrl, onStarted, onFinish, onExit, onAudioFailed }: Props) {
  const [session] = useState(() => new LyricSession(song.lines, mode))
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const hasAudio = mode !== 'text'

  const player = useRef<PlayerHandle>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [sung, setSung] = useState(-1)
  const [offset, setOffset] = useState(0)
  const [songTime, setSongTime] = useState(0)
  const [now, setNow] = useState(0)

  // Paused time doesn't count toward typing speed.
  const pausedTotal = useRef(0)
  const pausedAt = useRef<number | null>(null)
  const clock = useCallback(() => (pausedAt.current ?? performance.now()) - pausedTotal.current, [])

  const ended = useRef(false)
  const finish = useCallback(() => {
    if (ended.current) return
    ended.current = true
    player.current?.pause()
    const result = session.finish(clock())
    if (result) onFinish(result)
    else onExit()
  }, [clock, onExit, onFinish, session])

  // Sing as I type: the song may play only up to the end of the word being typed, then waits.
  // Waiting is not a user pause, so typing stays live.
  const waitingForTypist = useRef(false)
  const kickedOff = useRef(false)
  const wordTimes = useMemo(() => (follow ? estimateWordTimes(song.lines, session.words) : null), [follow, session, song.lines])

  /** The word whose singing the typist has earned: the one being typed, or the last one finished. */
  const earnedWord = useCallback(() => {
    const index = session.typed[session.cursor] ? session.cursor : session.cursor - 1
    return Math.min(index, session.words.length - 1)
  }, [session])

  /** How far into the recording the song may play right now. */
  const singUntil = useCallback(() => {
    if (!wordTimes) return Infinity
    const index = earnedWord()
    return (index < 0 ? wordTimes[0].start : wordTimes[index].end) - offset
  }, [earnedWord, offset, wordTimes])

  const togglePause = useCallback(() => {
    if (waitingForTypist.current) {
      waitingForTypist.current = false
      pausedAt.current = performance.now()
      setPaused(true)
    } else if (pausedAt.current === null) player.current?.pause()
    else player.current?.play()
  }, [])

  const announced = useRef(false)
  const announce = useCallback(() => {
    if (announced.current) return
    announced.current = true
    onStarted()
  }, [onStarted])

  const onPlaying = useCallback(() => {
    setStarted(true)
    announce()
    waitingForTypist.current = false
    if (pausedAt.current !== null) pausedTotal.current += performance.now() - pausedAt.current
    pausedAt.current = null
    setPaused(false)
  }, [announce])

  const onPaused = useCallback(() => {
    if (ended.current || waitingForTypist.current) return
    pausedAt.current ??= performance.now()
    setPaused(true)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (ended.current) return
      if (event.key === 'Escape') return finish()
      if (event.ctrlKey && event.code === 'Space' && hasAudio) {
        event.preventDefault()
        return togglePause()
      }
      const altGr = event.getModifierState('AltGraph')
      if ((event.ctrlKey || event.altKey || event.metaKey) && !altGr) return
      if (event.key === 'Tab') {
        event.preventDefault()
        if (hasAudio && started) player.current?.seekBy(-REWIND_SECONDS)
        return
      }
      if (hasAudio && !started) {
        if (!playerReady) return
        if (!follow) {
          if (event.key === 'Enter') {
            event.preventDefault()
            player.current?.play()
          }
          return
        }
        // Sing as I type starts on the first typed character, at the first sung word.
        if (event.key.length !== 1 || !wordTimes) return
        if (!kickedOff.current) {
          kickedOff.current = true
          player.current?.seekTo(Math.max(0, wordTimes[0].start - offset - WORD_LEAD_IN_SECONDS))
          player.current?.play()
        }
      }
      if (paused) return

      const t = clock()
      if (event.key === 'Backspace') session.backspace(t)
      else if (event.key === 'Enter' && session.relaxed && sung >= 0) session.jumpToLine(sung)
      else if (event.key === ' ' || event.key === 'Enter') session.space(t)
      else if (event.key.length === 1) session.type(event.key, t)
      else return
      event.preventDefault()
      if (session.startedAt !== null) announce()
      if (wordTimes && player.current && earnedWord() >= 0) {
        // A fast typist can get ahead of the recording: skip it forward so the word just typed is the one sung.
        const wordStart = wordTimes[earnedWord()].start - offset
        if (player.current.currentTime() < wordStart - CATCH_UP_SECONDS) player.current.seekTo(Math.max(0, wordStart - WORD_LEAD_IN_SECONDS))
        if (waitingForTypist.current && player.current.currentTime() < singUntil()) player.current.play()
      }
      refresh()
      if (session.done) finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [announce, clock, earnedWord, finish, follow, hasAudio, offset, paused, playerReady, session, singUntil, started, sung, togglePause, wordTimes])

  // The gate: stop the song the moment it reaches the end of the last word the typist has earned.
  useEffect(() => {
    if (!wordTimes || !started) return
    const id = window.setInterval(() => {
      if (!player.current || pausedAt.current !== null || waitingForTypist.current || ended.current) return
      if (player.current.currentTime() >= singUntil()) {
        waitingForTypist.current = true
        player.current.pause()
      }
    }, GATE_TICK_MS)
    return () => window.clearInterval(id)
  }, [singUntil, started, wordTimes])

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(clock())
      if (!hasAudio || !player.current) return
      const time = player.current.currentTime()
      setSongTime(Math.floor(time))
      let line = -1
      song.lines.forEach((entry, index) => {
        if (entry.t !== null && entry.t <= time + offset) line = index
      })
      setSung(line)
    }, 200)
    return () => window.clearInterval(id)
  }, [clock, hasAudio, offset, song.lines])

  const live = session.live(now)
  const elapsed = session.startedAt === null ? 0 : Math.max(0, (now - session.startedAt) / 1000)
  const behind = sung >= 0 && started ? sung - session.currentLine : 0
  const waiting = hasAudio && !started
  const trackLength = audio?.duration || song.duration

  return (
    <section className="typing">
      <header className="typing-head">
        <div>
          <h1>{song.title}</h1>
          <p>{song.artist} · {MODE_LABEL[mode]}{follow && ' · sings as you type'}</p>
        </div>
        <button className="ghost" onClick={finish}>Finish <kbd>Esc</kbd></button>
      </header>

      <div className="typing-body">
        <div className="lyrics-frame">
          <LyricsPane session={session} sung={sung} />
          {waiting && (
            <div className="overlay">
              {!playerReady ? (
                <p>Loading the audio…</p>
              ) : follow ? (
                <p>Start typing. Each word is sung as you type it</p>
              ) : (
                <button className="primary" onClick={() => player.current?.play()}>Start the song <kbd>Enter</kbd></button>
              )}
            </div>
          )}
          {!waiting && paused && (
            <div className="overlay">
              <p>Paused</p>
              <button className="primary" onClick={togglePause}>Resume <kbd>Ctrl</kbd>+<kbd>Space</kbd></button>
            </div>
          )}
        </div>

        <aside className="typing-side">
          {hasAudio && audio && (
            <div className="now-playing">
              <AudioPlayer
                ref={player}
                src={audio.streamUrl}
                onReady={() => setPlayerReady(true)}
                onPlaying={onPlaying}
                onPaused={onPaused}
                onEnded={finish}
                onFailed={onAudioFailed}
              />
              <div className="now-playing-row">
                {artUrl && <img className="art small" src={artUrl} alt="" />}
                <div>
                  <p className="song-clock">{formatTime(songTime)} / {formatTime(trackLength)}</p>
                  <p className="song-source">{audioCredit(audio)}</p>
                </div>
              </div>
              <div className="meter" aria-hidden><i style={{ width: `${Math.min(100, (songTime / trackLength) * 100)}%` }} /></div>
              {/* Buttons give focus straight back, so the next key is typed into the song, not the button. */}
              <div className="transport">
                <button className="ghost" disabled={!started} onClick={(e) => { player.current?.seekBy(-REWIND_SECONDS); e.currentTarget.blur() }}>Back {REWIND_SECONDS}s</button>
                <button className="ghost" disabled={!started} onClick={(e) => { togglePause(); e.currentTarget.blur() }}>{paused ? 'Resume' : 'Pause'}</button>
              </div>
            </div>
          )}

          <dl className="live">
            <div><dt>WPM</dt><dd>{live.wpm}</dd></div>
            <div><dt>Accuracy</dt><dd>{live.accuracy}%</dd></div>
            <div><dt>Song</dt><dd>{live.progress}%</dd></div>
            <div><dt>Time</dt><dd>{formatTime(elapsed)}</dd></div>
          </dl>
          <div className="meter" aria-hidden><i style={{ width: `${live.progress}%` }} /></div>

          {behind > 0 && <p className="behind">{behind} {behind === 1 ? 'line' : 'lines'} behind the song</p>}

          <ul className="keys">
            <li><kbd>Space</kbd> next word</li>
            <li><kbd>Backspace</kbd> {session.relaxed ? 'fix this word' : 'fix a mistake'}</li>
            {hasAudio && <li><kbd>Tab</kbd> back {REWIND_SECONDS} seconds</li>}
            {hasAudio && <li><kbd>Ctrl</kbd>+<kbd>Space</kbd> pause</li>}
            {session.relaxed && song.synced && <li><kbd>Enter</kbd> jump to the current line</li>}
            {session.relaxed && <li>Capitals and punctuation are ignored</li>}
          </ul>

          {mode === 'both' && song.synced && (
            <div className="sync" role="group" aria-label="Adjust lyric timing">
              <span>Lyric timing {offset > 0 ? '+' : ''}{offset.toFixed(1)}s</span>
              <button className="ghost small" aria-label="Lyrics later" onClick={(e) => { setOffset((v) => v - SYNC_STEP); e.currentTarget.blur() }}>−</button>
              <button className="ghost small" aria-label="Lyrics earlier" onClick={(e) => { setOffset((v) => v + SYNC_STEP); e.currentTarget.blur() }}>+</button>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
