import { useState, useMemo, useCallback } from 'react'
import { recordBlankScore } from '../lib/progress.js'

const LEVELS = [
  { id: '20', label: '20% hidden' },
  { id: '50', label: '50% hidden' },
  { id: 'first', label: 'First letter' },
]

// A word is blankable if it contains at least one letter.
const hasLetter = (w) => /[a-zA-ZÀ-ɏ’']/.test(w)

function buildTokens(lines) {
  // tokens: { key, line, text, blankable }
  const tokens = []
  lines.forEach((line, li) => {
    if (line === '---') {
      tokens.push({ key: `hr-${li}`, line: li, hr: true })
      return
    }
    line.split(/\s+/).forEach((w, wi) => {
      tokens.push({ key: `${li}-${wi}`, line: li, text: w, blankable: hasLetter(w) })
    })
  })
  return tokens
}

function pickHidden(tokens, level, seed) {
  const blankable = tokens.filter((t) => t.blankable)
  const hidden = new Set()
  if (level === 'first') {
    blankable.forEach((t) => hidden.add(t.key))
    return hidden
  }
  const fraction = level === '50' ? 0.5 : 0.2
  // Simple seeded PRNG (mulberry32) so each attempt differs but is stable in-render.
  let s = seed >>> 0
  const rand = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const target = Math.max(1, Math.round(blankable.length * fraction))
  const shuffled = [...blankable].sort(() => rand() - 0.5)
  shuffled.slice(0, target).forEach((t) => hidden.add(t.key))
  return hidden
}

// What a hidden token shows before reveal.
function blankFace(text, level) {
  const first = text.match(/[a-zA-ZÀ-ɏ]/)
  const firstLetter = first ? first[0] : ''
  if (level === 'first') return `${firstLetter}…`
  return '•'.repeat(Math.min(Math.max(text.length, 2), 10))
}

export default function BlanksTab({ pose, setProgress }) {
  const [level, setLevel] = useState('20')
  const [seed, setSeed] = useState(() => Date.now())
  const [revealed, setRevealed] = useState(() => new Set())
  const [finished, setFinished] = useState(false)

  const tokens = useMemo(() => buildTokens(pose.lines), [pose.lines])
  const hidden = useMemo(() => pickHidden(tokens, level, seed), [tokens, level, seed])

  const reset = useCallback((newLevel) => {
    if (newLevel) setLevel(newLevel)
    setSeed(Date.now())
    setRevealed(new Set())
    setFinished(false)
  }, [])

  const reveal = (key) => {
    if (finished) return
    setRevealed((prev) => {
      if (prev.has(key)) return prev
      const nextSet = new Set(prev)
      nextSet.add(key)
      return nextSet
    })
  }

  const totalHidden = hidden.size
  const reveals = [...revealed].filter((k) => hidden.has(k)).length
  const score = totalHidden ? Math.round(((totalHidden - reveals) / totalHidden) * 100) : 100

  const finish = () => {
    setFinished(true)
    setProgress(recordBlankScore(pose.id, level, score))
  }

  // Group tokens back into lines for rendering.
  const lineGroups = useMemo(() => {
    const groups = []
    let cur = null
    tokens.forEach((t) => {
      if (t.hr) {
        groups.push({ hr: true, key: t.key })
        cur = null
        return
      }
      if (!cur || cur.line !== t.line) {
        cur = { line: t.line, tokens: [], key: `line-${t.line}` }
        groups.push(cur)
      }
      cur.tokens.push(t)
    })
    return groups
  }, [tokens])

  return (
    <div>
      <div className="level-row">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            className={level === l.id ? 'active' : ''}
            onClick={() => reset(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="score-pill">
        <span>Revealed {reveals} / {totalHidden}</span>
        <span>Score {score}%</span>
      </div>

      <div className="card blank-text">
        {lineGroups.map((g) =>
          g.hr ? (
            <hr key={g.key} />
          ) : (
            <p className="line" key={g.key}>
              {g.tokens.map((t, i) => {
                const isHidden = hidden.has(t.key) && !revealed.has(t.key) && !finished
                return (
                  <span key={t.key} className="word">
                    {isHidden ? (
                      <button
                        className={`blank ${level === 'first' ? 'first-letter' : ''}`}
                        onClick={() => reveal(t.key)}
                      >
                        {blankFace(t.text, level)}
                      </button>
                    ) : hidden.has(t.key) && revealed.has(t.key) ? (
                      <span className="blank revealed">{t.text}</span>
                    ) : (
                      t.text
                    )}
                    {i < g.tokens.length - 1 ? ' ' : ''}
                  </span>
                )
              })}
            </p>
          )
        )}
      </div>

      <div className="row">
        {!finished ? (
          <button className="big-btn" onClick={finish}>Finish attempt</button>
        ) : (
          <button className="big-btn" onClick={() => reset()}>New attempt</button>
        )}
      </div>
      {finished && (
        <p className="muted" style={{ textAlign: 'center', marginTop: 10 }}>
          Attempt saved: {score}% with {reveals} reveal{reveals === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  )
}
