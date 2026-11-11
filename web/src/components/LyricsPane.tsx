import { memo, useEffect, useRef, type Ref } from 'react'
import type { LineGroup, LyricSession, WordState } from '../engine/session'

interface Props {
  session: LyricSession
  /** Index of the lyric line being sung, or -1. */
  sung: number
}

function StrictWord({ text, typed, state }: { text: string; typed: string; state: WordState }) {
  const length = Math.max(text.length, typed.length)
  const active = state === 'active'
  return (
    <span className={`word ${state === 'wrong' ? 'has-error' : ''}`}>
      {Array.from({ length }, (_, i) => {
        const tone = i >= typed.length ? 'todo' : i >= text.length ? 'extra' : typed[i] === text[i] ? 'ok' : 'bad'
        return <span key={i} className={`ch ${tone} ${active && i === typed.length ? 'caret' : ''}`}>{text[i] ?? typed[i]}</span>
      })}
      <span className={`ch gap ${active && typed.length === length ? 'caret' : ''}`}> </span>
    </span>
  )
}

function HiddenWord({ text, typed, state }: { text: string; typed: string; state: WordState }) {
  if (state === 'correct' || state === 'wrong' || state === 'missed') {
    return <span className="word heard" title={typed && state === 'wrong' ? `You typed: ${typed}` : undefined}><span className={state}>{text}</span><span className="ch gap"> </span></span>
  }
  const active = state === 'active'
  const length = Math.max(text.length, typed.length)
  return (
    <span className="word">
      {Array.from({ length }, (_, i) => (
        <span key={i} className={`ch ${i < typed.length ? 'typed' : 'blank'} ${active && i === typed.length ? 'caret' : ''}`}>{typed[i] ?? '·'}</span>
      ))}
      <span className={`ch gap ${active && typed.length === length ? 'caret' : ''}`}> </span>
    </span>
  )
}

interface LineProps {
  session: LyricSession
  group: LineGroup
  isCurrent: boolean
  isSung: boolean
  /** Changes only when this line's content can have changed, so the other lines skip rendering. */
  stamp: string
  lineRef?: Ref<HTMLParagraphElement>
}

const Line = memo(function Line({ session, group, isCurrent, isSung, lineRef }: LineProps) {
  const View = session.relaxed ? HiddenWord : StrictWord
  return (
    <p ref={lineRef} className={`line ${isCurrent ? 'current' : ''} ${isSung ? 'sung' : ''}`}>
      {group.words.map((index) => (
        <View key={index} text={session.words[index].text} typed={session.typed[index]} state={session.wordState(index)} />
      ))}
    </p>
  )
})

export function LyricsPane({ session, sung }: Props) {
  const pane = useRef<HTMLDivElement>(null)
  const activeLine = useRef<HTMLParagraphElement>(null)
  const current = session.currentLine
  const relaxed = session.relaxed
  const position = `${session.cursor}:${session.typed[session.cursor] ?? ''}`

  useEffect(() => {
    const container = pane.current
    const line = activeLine.current
    if (!container || !line) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    container.scrollTo({ top: line.offsetTop - container.clientHeight * 0.32, behavior: calm ? 'auto' : 'smooth' })
  }, [current])

  return (
    <div className="lyrics" ref={pane} aria-label={relaxed ? 'Your transcription' : 'Lyrics to type'}>
      {session.groups.map((group) => {
        // Audio-only never shows a line before its turn.
        if (relaxed && group.line > current) return null
        const isCurrent = group.line === current
        return (
          <Line
            key={group.line}
            session={session}
            group={group}
            isCurrent={isCurrent}
            isSung={group.line === sung && !relaxed}
            stamp={isCurrent ? position : group.line < current ? 'typed' : 'upcoming'}
            lineRef={isCurrent ? activeLine : undefined}
          />
        )
      })}
    </div>
  )
}
