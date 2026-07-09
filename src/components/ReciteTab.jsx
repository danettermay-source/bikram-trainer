import { useState, useEffect } from 'react'
import { touchReviewed } from '../lib/progress.js'

export default function ReciteTab({ pose, setProgress }) {
  const [shown, setShown] = useState(0)
  const lines = pose.lines.filter((l) => l !== '---')
  const done = shown >= lines.length

  useEffect(() => {
    setShown(0)
  }, [pose.id])

  useEffect(() => {
    if (done && lines.length > 0) {
      setProgress(touchReviewed(pose.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  return (
    <div>
      <div className="card recite-stage">
        <h2>{pose.name}</h2>
        {pose.sanskrit && (
          <div className="muted" style={{ fontStyle: 'italic', marginTop: 4 }}>
            {pose.sanskrit}
          </div>
        )}
        <p className="muted recite-count">
          {shown} / {lines.length} lines revealed
        </p>
        <div className="row">
          <button
            className="big-btn"
            disabled={done}
            onClick={() => setShown((n) => Math.min(n + 1, lines.length))}
          >
            {done ? 'All lines revealed' : shown === 0 ? 'Peek first line' : 'Peek next line'}
          </button>
        </div>
        {shown > 0 && (
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost-btn" onClick={() => setShown(0)}>
              Start over
            </button>
          </div>
        )}
      </div>

      {shown > 0 && (
        <div className="card revealed-lines">
          {lines.slice(0, shown).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      <p className="muted" style={{ textAlign: 'center' }}>
        Recite from memory, then peek to self-check. Rate yourself below when done.
      </p>
    </div>
  )
}
