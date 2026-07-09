import { MASTERY_LEVELS, MASTERY_LABELS, suggestNext, overallStats } from '../lib/progress.js'

function timeAgo(ts) {
  if (!ts) return 'never reviewed'
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days === 0) return 'reviewed today'
  if (days === 1) return 'reviewed yesterday'
  return `reviewed ${days} days ago`
}

export default function Home({ poses, sections, progress, audioMeta, onOpenPose }) {
  const stats = overallStats(poses, progress)
  const suggestion = suggestNext(poses, progress)
  const audioCount = Object.keys(audioMeta).length

  return (
    <div>
      <h1 className="app-title">Bikram Dialogue Trainer</h1>
      <p className="subtitle">90-minute class · {poses.length} postures</p>

      <div className="card">
        <div className="stat-row">
          <strong style={{ color: 'var(--text)', fontSize: 15 }}>Overall progress</strong>
          <span>{stats.percent}%</span>
        </div>
        <div className="progress-bar">
          <div style={{ width: `${stats.percent}%` }} />
        </div>
        <div className="stat-row">
          {MASTERY_LEVELS.map((m) => (
            <span key={m}>
              {MASTERY_LABELS[m]}: {stats.counts[m]}
            </span>
          ))}
        </div>
        <div className="stat-row" style={{ marginTop: 8 }}>
          <span>🎙 {audioCount} / {poses.length} poses have audio</span>
        </div>
      </div>

      {suggestion && (
        <button className="suggest-card" onClick={() => onOpenPose(suggestion.id)}>
          <span className="label">Review next</span>
          <div className="pose-name">{suggestion.name}</div>
          <div className="muted">
            {MASTERY_LABELS[(progress[suggestion.id] || {}).mastery || 'not-started']} ·{' '}
            {timeAgo((progress[suggestion.id] || {}).lastReviewed)}
          </div>
        </button>
      )}

      {sections.map((section) => {
        const sectionPoses = poses.filter((p) => p.section === section.id)
        let num = poses.findIndex((p) => p.section === section.id)
        return (
          <div key={section.id}>
            <div className="section-title">{section.label}</div>
            <div className="pose-list">
              {sectionPoses.map((pose, i) => {
                const entry = progress[pose.id] || {}
                const mIdx = MASTERY_LEVELS.indexOf(entry.mastery || 'not-started')
                return (
                  <button key={pose.id} className="pose-row" onClick={() => onOpenPose(pose.id)}>
                    <span className="num">{num + i + 1}</span>
                    <span className="names">
                      <div className="name">{pose.name}</div>
                      {pose.sanskrit && <div className="sanskrit">{pose.sanskrit}</div>}
                    </span>
                    <span className="badges">
                      {audioMeta[pose.id] && (
                        <span className="audio-badge" title="Audio saved">🎙</span>
                      )}
                      <span
                        className={`mastery-dot m${mIdx}`}
                        title={MASTERY_LABELS[entry.mastery || 'not-started']}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <p className="muted" style={{ textAlign: 'center', marginTop: 28 }}>
        Add to Home Screen for the full offline app.
      </p>
    </div>
  )
}
