import { useState, useEffect } from 'react'
import { MASTERY_LEVELS, MASTERY_LABELS, setMastery } from '../lib/progress.js'
import ListenTab from './ListenTab.jsx'
import BlanksTab from './BlanksTab.jsx'
import ReciteTab from './ReciteTab.jsx'

const TABS = ['Read', 'Listen', 'Blanks', 'Recite']

export default function PosePage({
  pose, poses, index, progress, setProgress,
  audioMeta, refreshAudio, onBack, onOpenPose,
}) {
  const [tab, setTab] = useState('Read')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setTab('Read')
  }, [pose.id])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const entry = progress[pose.id] || {}
  const mastery = entry.mastery || 'not-started'

  const rate = (level) => {
    setProgress(setMastery(pose.id, level))
    setToast(`Rated: ${MASTERY_LABELS[level]}`)
  }

  const prev = poses[index - 1]
  const next = poses[index + 1]

  return (
    <div>
      <div className="screen-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">←</button>
        <div className="pose-header">
          <h1>{pose.name}</h1>
          {pose.sanskrit && <div className="sanskrit">{pose.sanskrit}</div>}
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Read' && (
        <div className="card dialogue">
          {pose.lines.map((line, i) =>
            line === '---' ? <hr key={i} /> : <p key={i}>{line}</p>
          )}
        </div>
      )}

      {tab === 'Listen' && (
        <ListenTab
          pose={pose}
          poses={poses}
          audioMeta={audioMeta}
          refreshAudio={refreshAudio}
          setToast={setToast}
        />
      )}

      {tab === 'Blanks' && (
        <BlanksTab pose={pose} setProgress={setProgress} />
      )}

      {tab === 'Recite' && (
        <ReciteTab pose={pose} setProgress={setProgress} />
      )}

      <div className="card">
        <strong>Rate yourself</strong>
        <div className="muted">How well do you know this dialogue?</div>
        <div className="mastery-row">
          {MASTERY_LEVELS.map((m) => (
            <button
              key={m}
              className={mastery === m ? 'active' : ''}
              onClick={() => rate(m)}
            >
              {MASTERY_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="pager">
        <button disabled={!prev} onClick={() => prev && onOpenPose(prev.id)}>
          {prev ? `← ${prev.name}` : '←'}
        </button>
        <button disabled={!next} onClick={() => next && onOpenPose(next.id)}>
          {next ? `${next.name} →` : '→'}
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
