// Web Speech API fallback when a pose has no uploaded audio.

let currentUtterances = []

export function speechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeech() {
  if (!speechAvailable()) return
  currentUtterances = []
  window.speechSynthesis.cancel()
}

export function pauseSpeech() {
  if (speechAvailable()) window.speechSynthesis.pause()
}

export function resumeSpeech() {
  if (speechAvailable()) window.speechSynthesis.resume()
}

// Speaks lines in order; resolves when finished, rejects never (errors resolve
// too, so playlists keep moving). onLine fires as each line starts.
export function speakLines(lines, { rate = 0.95, onLine } = {}) {
  if (!speechAvailable()) return Promise.resolve()
  stopSpeech()
  return new Promise((resolve) => {
    const spoken = lines.filter((l) => l !== '---')
    if (spoken.length === 0) return resolve()
    let finished = 0
    const utterances = spoken.map((text, i) => {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = rate
      u.onstart = () => onLine && onLine(i)
      u.onend = u.onerror = () => {
        finished++
        if (finished === spoken.length && currentUtterances === utterances) {
          resolve()
        }
      }
      return u
    })
    currentUtterances = utterances
    // Chain-cancel guard: if stopSpeech() replaced the batch, resolve early.
    const watchdog = setInterval(() => {
      if (currentUtterances !== utterances) {
        clearInterval(watchdog)
        resolve()
      }
      if (finished === spoken.length) clearInterval(watchdog)
    }, 500)
    utterances.forEach((u) => window.speechSynthesis.speak(u))
  })
}
