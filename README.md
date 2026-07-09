# Bikram Dialogue Trainer

A mobile-first React (Vite) PWA for memorizing the 90-minute hot yoga class
dialogue, word-perfect. Built for iPhone Safari; installable to the home
screen and fully offline-capable.

## The dialogue

The full class dialogue was parsed from the PYI dialogue PDF into 28 postures
in class order — Pranayama first, then the standing series, the floor series,
and Blowing in Firm (Kapalbhati) last.

- `dialogue/*.txt` — one verbatim text file per posture (reference copies)
- `src/data/dialogue.json` — the same text, used by the app

The wording is untouched from the PDF; only page numbers, repeating page
headers, and PDF line-wrap artifacts were removed.

## Features

- **Pose library** — all postures in class order; tap one for its full
  dialogue, line by line, verbatim.
- **Audio upload** — upload your own recording per pose (m4a / mp3 / wav,
  e.g. iOS voice memos). Audio is stored in IndexedDB on the device, so it
  persists offline. Replace or delete any pose's audio; poses with audio show
  a 🎙 badge.
- **Listen mode** — plays your uploaded audio, or falls back to the browser's
  speech synthesis reading the text. Play/pause, loop a single pose, and
  autoplay through a whole section.
- **Fill-in-the-blank** — 20% hidden, 50% hidden, or first-letter-only.
  Tap a blank to reveal it; reveals are counted and the attempt is scored.
- **Recite mode** — shows only the posture name and Sanskrit title;
  "peek next line" reveals one line at a time to self-check.
- **Progress** — self-rated mastery per pose (not started / learning / solid /
  word-perfect) in localStorage. The home screen shows overall progress and
  suggests what to review next (lowest mastery, longest since review;
  Pranayama and Kapalbhati are deprioritized).

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Deploying to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (the GitHub
   login is easiest).
2. Import this GitHub repository (`danettermay-source/bikram-trainer`).
3. Vercel auto-detects Vite. Keep the defaults (build command
   `npm run build`, output directory `dist`) and pick the branch to deploy.
4. Click **Deploy**. Every push to the selected branch redeploys
   automatically.

Then on your iPhone: open the Vercel URL in Safari → Share → **Add to Home
Screen**. Uploaded audio and progress live on the device (IndexedDB /
localStorage), so they survive offline use — they are per-device, not synced.
