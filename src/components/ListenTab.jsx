import { useState, useEffect, useRef, useCallback } from 'react'
import { getAudio, saveAudio, deleteAudio, requestPersistence } from '../lib/db.js'
import { speakLines, stopSpeech, pauseSpeech, resumeSpeech, speechAvailable } from '../lib/speech.js'

function fmtSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

export default function ListenTab({ pose, poses, audioMeta, refreshAudio, setToast }) {
  const [record, setRecord] = useState(null)
  const [url, setUrl] = useState(null)
  const [loop, setLoop] = useState(false)
  const [playState, setPlayState] = useState('idle') // idle | playing | paused
  const [sectionPlaying, setSectionPlaying] = useState(null) // pose id during section autoplay
  const [ttsLine, setTtsLine] = useState(-1)

  const audioRef = useRef(null)
  const fileRef = useRef(null)
  const loopRef = useRef(loop)
  const activeRef = useRef(0) // bumped to cancel any running playback chain
  loopRef.current = loop

  const spokenLines = pose.lines.filter((l) => l !== '---')

  const stopAll = useCallback(() => {
    activeRef.current++
    stopSpeech()
    const el = audioRef.current
    if (el) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    setPlayState('idle')
    setSectionPlaying(null)
    setTtsLine(-1)
  }, [])

  // Load this pose's audio record; stop playback when the pose changes.
  useEffect(() => {
    let alive = true
    stopAll()
    getAudio(pose.id).then((rec) => {
      if (alive) setRecord(rec)
    })
    return () => {
      alive = false
      stopAll()
    }
  }, [pose.id, stopAll])

  // Keep a blob URL for the current record.
  useEffect(() => {
    if (!record) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(record.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [record])

  const playBlobOnce = (blob, token) =>
    new Promise((resolve) => {
      const el = audioRef.current
      if (!el) return resolve()
      const u = URL.createObjectURL(blob)
      el.src = u
      el.loop = false
      const done = () => {
        el.removeEventListener('ended', done)
        URL.revokeObjectURL(u)
        resolve()
      }
      el.addEventListener('ended', done)
      const guard = setInterval(() => {
        if (activeRef.current !== token) {
          clearInterval(guard)
          done()
        }
        if (el.ended || el.paused) {
          if (el.ended) clearInterval(guard)
        }
      }, 300)
      el.play().catch(() => done())
    })

  // ---- single-pose playback ----

  const playSingle = async () => {
    const token = ++activeRef.current
    setPlayState('playing')
    if (record && url) {
      const el = audioRef.current
      el.src = url
      el.loop = loopRef.current
      try {
        await el.play()
      } catch {
        setPlayState('idle')
      }
      return
    }
    // TTS fallback, honoring loop
    do {
      setTtsLine(-1)
      await speakLines(spokenLines, { onLine: (i) => setTtsLine(i) })
      if (activeRef.current !== token) return
    } while (loopRef.current && activeRef.current === token)
    if (activeRef.current === token) {
      setPlayState('idle')
      setTtsLine(-1)
    }
  }

  const togglePause = () => {
    if (record && url) {
      const el = audioRef.current
      if (el.paused) {
        el.play()
        setPlayState('playing')
      } else {
        el.pause()
        setPlayState('paused')
      }
    } else if (playState === 'playing') {
      pauseSpeech()
      setPlayState('paused')
    } else {
      resumeSpeech()
      setPlayState('playing')
    }
  }

  // ---- section autoplay ----

  const playSection = async () => {
    const token = ++activeRef.current
    stopSpeech()
    const sectionPoses = poses.filter((p) => p.section === pose.section)
    const startIdx = sectionPoses.findIndex((p) => p.id === pose.id)
    setPlayState('playing')
    for (let i = startIdx; i < sectionPoses.length; i++) {
      if (activeRef.current !== token) return
      const p = sectionPoses[i]
      setSectionPlaying(p.id)
      const rec = await getAudio(p.id)
      if (activeRef.current !== token) return
      if (rec) {
        await playBlobOnce(rec.blob, token)
      } else {
        const lines = p.lines.filter((l) => l !== '---')
        setTtsLine(-1)
        await speakLines(p.id === pose.id ? spokenLines : lines, {
          onLine: p.id === pose.id ? (idx) => setTtsLine(idx) : undefined,
        })
      }
    }
    if (activeRef.current === token) {
      setSectionPlaying(null)
      setPlayState('idle')
      setTtsLine(-1)
    }
  }

  // ---- audio file management ----

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const rec = await saveAudio(pose.id, file)
      requestPersistence()
      setRecord(rec)
      refreshAudio()
      setToast('Audio saved')
    } catch {
      setToast('Could not save audio')
    }
  }

  const onDelete = async () => {
    if (!window.confirm(`Delete the audio for ${pose.name}?`)) return
    stopAll()
    await deleteAudio(pose.id)
    setRecord(null)
    refreshAudio()
    setToast('Audio deleted')
  }

  const sectionPoseName =
    sectionPlaying && sectionPlaying !== pose.id
      ? (poses.find((p) => p.id === sectionPlaying) || {}).name
      : null

  return (
    <div>
      <div className="card">
        <strong>Playback</strong>
        {record ? (
          <div className="file-meta">
            🎙 Your recording · {fmtSize(record.size)} ·{' '}
            {new Date(record.savedAt).toLocaleDateString()}
          </div>
        ) : (
          <div className="file-meta">
            No audio uploaded yet —{' '}
            {speechAvailable()
              ? 'the browser voice will read the text.'
              : 'this browser has no speech voice; upload audio below.'}
          </div>
        )}

        <audio
          ref={audioRef}
          controls={!!record}
          playsInline
          onPlay={() => setPlayState('playing')}
          onPause={() => {
            const el = audioRef.current
            if (el && !el.ended) setPlayState('paused')
          }}
          onEnded={() => {
            if (!sectionPlaying) setPlayState('idle')
          }}
        />

        {sectionPoseName && <div className="now-playing">Now playing: {sectionPoseName}</div>}

        <div className="row" style={{ marginTop: 8 }}>
          {playState === 'idle' ? (
            <button className="big-btn" onClick={playSingle}>▶ Play</button>
          ) : (
            <button className="big-btn" onClick={togglePause}>
              {playState === 'playing' ? '⏸ Pause' : '▶ Resume'}
            </button>
          )}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className={`ghost-btn ${loop ? 'on' : ''}`}
            onClick={() => {
              setLoop(!loop)
              const el = audioRef.current
              if (el && record) el.loop = !loop
            }}
          >
            🔁 Loop pose {loop ? 'on' : 'off'}
          </button>
          <button className="ghost-btn" onClick={playSection}>
            ⏭ Autoplay section
          </button>
        </div>
        {playState !== 'idle' && (
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost-btn" onClick={stopAll}>⏹ Stop</button>
          </div>
        )}
      </div>

      <div className="card">
        <strong>Your audio for this pose</strong>
        <div className="muted" style={{ marginBottom: 10 }}>
          Upload a voice memo (m4a, mp3, wav). It is stored on this device and
          works offline.
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.aac,.mp4"
          style={{ display: 'none' }}
          onChange={onFile}
        />
        <div className="row">
          <button className="big-btn" onClick={() => fileRef.current.click()}>
            {record ? 'Replace audio' : 'Upload audio'}
          </button>
        </div>
        {record && (
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost-btn danger" onClick={onDelete}>
              Delete audio
            </button>
          </div>
        )}
      </div>

      <div className="card dialogue">
        {(() => {
          let spokenIdx = -1
          return pose.lines.map((line, i) => {
            if (line === '---') return <hr key={i} />
            spokenIdx++
            const isCurrent =
              ttsLine >= 0 &&
              spokenIdx === ttsLine &&
              (!sectionPlaying || sectionPlaying === pose.id)
            return (
              <p key={i} className={isCurrent ? 'current' : ''}>
                {line}
              </p>
            )
          })
        })()}
      </div>
    </div>
  )
}
