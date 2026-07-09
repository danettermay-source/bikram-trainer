import { useEffect, useState, useCallback } from 'react'
import poses from './data/dialogue.json'
import { listAudioMeta } from './lib/db.js'
import { loadProgress } from './lib/progress.js'
import Home from './components/Home.jsx'
import PosePage from './components/PosePage.jsx'

export const SECTIONS = [
  { id: 'pranayama', label: 'Pranayama' },
  { id: 'standing', label: 'Standing Series' },
  { id: 'floor', label: 'Floor Series' },
  { id: 'kapalbhati', label: 'Kapalbhati' },
]

export default function App() {
  const [view, setView] = useState({ name: 'home' })
  const [progress, setProgress] = useState(() => loadProgress())
  const [audioMeta, setAudioMeta] = useState({})

  const refreshAudio = useCallback(() => {
    listAudioMeta().then(setAudioMeta).catch(() => {})
  }, [])

  useEffect(() => {
    refreshAudio()
  }, [refreshAudio])

  const openPose = useCallback((id) => {
    setView({ name: 'pose', id })
    window.scrollTo(0, 0)
  }, [])

  const goHome = useCallback(() => {
    setView({ name: 'home' })
  }, [])

  if (view.name === 'pose') {
    const index = poses.findIndex((p) => p.id === view.id)
    const pose = poses[index]
    if (pose) {
      return (
        <PosePage
          pose={pose}
          poses={poses}
          index={index}
          progress={progress}
          setProgress={setProgress}
          audioMeta={audioMeta}
          refreshAudio={refreshAudio}
          onBack={goHome}
          onOpenPose={openPose}
        />
      )
    }
  }

  return (
    <Home
      poses={poses}
      sections={SECTIONS}
      progress={progress}
      audioMeta={audioMeta}
      onOpenPose={openPose}
    />
  )
}
