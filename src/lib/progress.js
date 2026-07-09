// Per-pose mastery + review history in localStorage.

const KEY = 'bikram-trainer.progress.v1'

export const MASTERY_LEVELS = ['not-started', 'learning', 'solid', 'word-perfect']

export const MASTERY_LABELS = {
  'not-started': 'Not started',
  learning: 'Learning',
  solid: 'Solid',
  'word-perfect': 'Word-perfect',
}

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function save(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress))
}

export function setMastery(poseId, mastery) {
  const p = loadProgress()
  p[poseId] = { ...(p[poseId] || {}), mastery, lastReviewed: Date.now() }
  save(p)
  return p
}

export function touchReviewed(poseId) {
  const p = loadProgress()
  p[poseId] = { ...(p[poseId] || {}), lastReviewed: Date.now() }
  save(p)
  return p
}

export function recordBlankScore(poseId, level, score) {
  const p = loadProgress()
  const entry = p[poseId] || {}
  const scores = entry.blankScores || {}
  const prev = scores[level]
  if (prev == null || score > prev) scores[level] = score
  p[poseId] = { ...entry, blankScores: scores, lastReviewed: Date.now() }
  save(p)
  return p
}

// Suggest the next pose to review: lowest mastery first, then longest
// since last review. Pranayama and Kapalbhati are deprioritized — they
// only come up once every other pose beats their mastery+staleness rank.
export function suggestNext(poses, progress) {
  const rank = (pose) => {
    const entry = progress[pose.id] || {}
    const mastery = MASTERY_LEVELS.indexOf(entry.mastery || 'not-started')
    const last = entry.lastReviewed || 0
    const deprioritized = pose.section === 'pranayama' || pose.section === 'kapalbhati'
    return { mastery, last, deprioritized }
  }
  const sorted = [...poses].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra.deprioritized !== rb.deprioritized) return ra.deprioritized ? 1 : -1
    if (ra.mastery !== rb.mastery) return ra.mastery - rb.mastery
    return ra.last - rb.last
  })
  return sorted[0] || null
}

export function overallStats(poses, progress) {
  const counts = { 'not-started': 0, learning: 0, solid: 0, 'word-perfect': 0 }
  for (const pose of poses) {
    const m = (progress[pose.id] || {}).mastery || 'not-started'
    counts[m]++
  }
  const total = poses.length
  const points = poses.reduce((sum, pose) => {
    const m = (progress[pose.id] || {}).mastery || 'not-started'
    return sum + MASTERY_LEVELS.indexOf(m)
  }, 0)
  const percent = total ? Math.round((points / (total * 3)) * 100) : 0
  return { counts, total, percent }
}
