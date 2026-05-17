// app.js — StudyNook
// okay so this is the main brain of the app
// i tried to keep things readable but also... it got a lil long lol
// organised into sections: clock, pomodoro, notes, music, ambient


// ============================================================
// UTILITIES — just a few helpers i'll use throughout
// ============================================================

function $(id) {
  return document.getElementById(id)
}

function showToast(msg, duration = 2200) {
  const toast = $('toast')
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toast._timer) // cancel any previous one
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration)
}

// pad a number to 2 digits — for the timer display
function pad(n) {
  return String(n).padStart(2, '0')
}


// ============================================================
// LIVE CLOCK — top right corner
// ============================================================

function updateClock() {
  const now = new Date()
  const h = pad(now.getHours())
  const m = pad(now.getMinutes())
  $('current-time').textContent = `${h}:${m}`
}

updateClock()
setInterval(updateClock, 10000) // every 10s is fine, no need to go crazy


// ============================================================
// POMODORO TIMER
// ============================================================

const MODES = {
  focus: { label: 'focus',       time: 25 * 60, breakType: 'short' },
  short: { label: 'short break', time: 5 * 60,  breakType: 'focus' },
  long:  { label: 'long break',  time: 15 * 60, breakType: 'focus' },
}

let pomo = {
  mode: 'focus',
  totalSecs: 25 * 60,
  secsLeft: 25 * 60,
  running: false,
  interval: null,
  sessionsCompleted: 0,
  // cycle: focus -> short -> focus -> short -> focus -> short -> focus -> long -> repeat
}

const pomoCard   = document.querySelector('.pomo-card')
const startBtn   = $('pomo-start')
const resetBtn   = $('pomo-reset')
const skipBtn    = $('pomo-skip')
const timerMin   = $('timer-min')
const timerSec   = $('timer-sec')
const ringEl     = $('ring-progress')
const dotsEl     = $('session-dots')
const sessionTxt = $('sessions-done-text')
const sessionLbl = $('session-label')

function setTimerDisplay(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  timerMin.textContent = pad(m)
  timerSec.textContent = pad(s)

  // update the ring
  // dashoffset = full - (full * progress)
  const pct = secs / pomo.totalSecs
  const offset = MODES[pomo.mode] ? pomo.totalSecs : 25 * 60  // i know this is a bit weird
  const dashOffset = 553 * (1 - pct) // 553 = circumference baked into CSS variable
  ringEl.style.strokeDashoffset = dashOffset
}

function switchMode(mode, customTime) {
  clearInterval(pomo.interval)
  pomo.running = false
  pomo.mode = mode

  const secs = customTime !== undefined
    ? customTime * 60
    : MODES[mode].time

  pomo.totalSecs = secs
  pomo.secsLeft  = secs

  startBtn.textContent = 'start'
  pomoCard.classList.remove('running', 'break-mode')

  if (mode === 'short' || mode === 'long') {
    pomoCard.classList.add('break-mode')
    sessionLbl.textContent = mode === 'long' ? 'long break 🍵' : 'short break ☕'
  } else {
    sessionLbl.textContent = 'focus time 🎯'
  }

  setTimerDisplay(secs)

  // update the active button
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode)
  })
}

function updateDots() {
  const dots = dotsEl.querySelectorAll('.sdot')
  // cycle resets every 4 focus sessions
  const cyclePos = pomo.sessionsCompleted % 4
  dots.forEach((dot, i) => {
    dot.classList.toggle('done', i < cyclePos)
  })

  const total = pomo.sessionsCompleted
  sessionTxt.textContent = `${total} session${total === 1 ? '' : 's'} done today`
}

function timerTick() {
  pomo.secsLeft--
  setTimerDisplay(pomo.secsLeft)

  if (pomo.secsLeft <= 0) {
    // session ended!
    clearInterval(pomo.interval)
    pomo.running = false
    pomoCard.classList.remove('running')
    startBtn.textContent = 'start'

    if (pomo.mode === 'focus') {
      pomo.sessionsCompleted++
      updateDots()

      // every 4 sessions do a long break, otherwise short break
      const nextBreak = pomo.sessionsCompleted % 4 === 0 ? 'long' : 'short'
      showToast(`nice work! time for a ${nextBreak === 'long' ? 'long' : 'short'} break 🎉`, 3500)

      // auto switch to break (don't auto-start it though)
      setTimeout(() => switchMode(nextBreak), 800)
    } else {
      showToast('break over — back to it! 💪', 3000)
      setTimeout(() => switchMode('focus'), 800)
    }
  }
}

startBtn.addEventListener('click', () => {
  if (pomo.running) {
    // pause it
    clearInterval(pomo.interval)
    pomo.running = false
    pomoCard.classList.remove('running')
    startBtn.textContent = 'resume'
  } else {
    // start/resume
    pomo.interval = setInterval(timerTick, 1000)
    pomo.running = true
    pomoCard.classList.add('running')
    startBtn.textContent = 'pause'
  }
})

resetBtn.addEventListener('click', () => {
  switchMode(pomo.mode)
  showToast('timer reset')
})

skipBtn.addEventListener('click', () => {
  clearInterval(pomo.interval)
  pomo.running = false

  if (pomo.mode === 'focus') {
    // skipping focus means skip to break
    pomo.sessionsCompleted++
    updateDots()
    const nextBreak = pomo.sessionsCompleted % 4 === 0 ? 'long' : 'short'
    switchMode(nextBreak)
  } else {
    switchMode('focus')
  }

  showToast('skipped ⏭')
})

// clicking the mode buttons manually
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (pomo.running) {
      // ask before switching mid-session... nah just do it honestly
      clearInterval(pomo.interval)
    }
    switchMode(btn.dataset.mode, parseInt(btn.dataset.time))
  })
})

// init
setTimerDisplay(pomo.secsLeft)
updateDots()


// ============================================================
// NOTES — auto save to localStorage
// ============================================================

const notesArea   = $('notes-area')
const wordCount   = $('word-count')
const saveStatus  = $('save-status')

let saveTimer = null

// load saved notes on page open
;(function loadNotes() {
  const saved = localStorage.getItem('studynook_notes')
  if (saved) notesArea.value = saved
  updateWordCount()
})()

function updateWordCount() {
  const words = notesArea.value.trim().split(/\s+/).filter(Boolean).length
  wordCount.textContent = `${words} word${words === 1 ? '' : 's'}`
}

notesArea.addEventListener('input', () => {
  updateWordCount()

  // debounce the save — don't write every single keystroke
  clearTimeout(saveTimer)
  saveStatus.classList.remove('visible')

  saveTimer = setTimeout(() => {
    localStorage.setItem('studynook_notes', notesArea.value)
    saveStatus.classList.add('visible')
    // hide the 'saved' indicator after a bit
    setTimeout(() => saveStatus.classList.remove('visible'), 2000)
  }, 800)
})

$('notes-clear').addEventListener('click', () => {
  if (!notesArea.value.trim()) return // nothing to clear
  if (!confirm('clear all notes? this can\'t be undone')) return
  notesArea.value = ''
  localStorage.removeItem('studynook_notes')
  updateWordCount()
  showToast('notes cleared')
})

$('notes-copy').addEventListener('click', () => {
  if (!notesArea.value.trim()) {
    showToast('nothing to copy yet!')
    return
  }
  navigator.clipboard.writeText(notesArea.value).then(() => {
    showToast('copied to clipboard ✓')
  }).catch(() => {
    // fallback for older browsers — select then execCommand
    notesArea.select()
    document.execCommand('copy')
    showToast('copied ✓')
  })
})


// ============================================================
// MUSIC PLAYER — youtube embed stuff
// ============================================================

const playerEmbed   = $('player-embed')
const ytWrapper     = $('yt-wrapper')
const ytIframe      = $('yt-iframe')
const videoToggle   = $('show-video-toggle')
const nowPlayingLbl = $('now-playing-label')
const visualizer    = $('visualizer')

let currentVid = null
let isPlaying  = false

// extract video id from various youtube url formats
// handles: youtu.be/xxx, youtube.com/watch?v=xxx, youtube.com/live/xxx, shorts, etc.
function extractYtId(url) {
  url = url.trim()

  // if it's already just an ID (11 chars, no spaces)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url

  // try the various url patterns
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const pat of patterns) {
    const m = url.match(pat)
    if (m) return m[1]
  }

  return null
}

function loadVideo(videoId, trackName) {
  if (!videoId) {
    showToast('hmm, couldn\'t find a video ID in that URL')
    return
  }

  currentVid = videoId
  isPlaying = true

  // autoplay=1, mute=0 — browser might block audio autoplay, but usually ok in iframes
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
  ytIframe.src = embedUrl

  // show the player panel
  playerEmbed.classList.add('visible')
  visualizer.classList.remove('paused')

  if (trackName) {
    nowPlayingLbl.textContent = `♫  ${trackName}`
  } else {
    nowPlayingLbl.textContent = 'now playing'
  }

  // if video was already visible keep it visible
  if (videoToggle.checked) {
    ytWrapper.classList.add('show')
  }
}

// clicking a track in the playlist
document.querySelectorAll('.track').forEach(track => {
  track.addEventListener('click', () => {
    const vid  = track.dataset.vid
    const name = track.querySelector('.track-name').textContent

    // update active styles
    document.querySelectorAll('.track').forEach(t => t.classList.remove('active'))
    track.classList.add('active')

    loadVideo(vid, name)
  })
})

// video toggle switch
videoToggle.addEventListener('change', () => {
  ytWrapper.classList.toggle('show', videoToggle.checked)
})

// close the player
$('close-player').addEventListener('click', () => {
  playerEmbed.classList.remove('visible')
  ytIframe.src = '' // stops playback
  isPlaying = false
  currentVid = null
  visualizer.classList.add('paused')

  // deselect all tracks
  document.querySelectorAll('.track').forEach(t => t.classList.remove('active'))
  showToast('player closed')
})

// custom URL loading
$('yt-url-load').addEventListener('click', () => {
  const raw = $('yt-url-input').value.trim()
  if (!raw) {
    showToast('paste a url first!')
    return
  }

  const id = extractYtId(raw)
  if (!id) {
    showToast('couldn\'t parse that URL, try a different format?')
    return
  }

  loadVideo(id, 'custom video')
  $('yt-url-input').value = ''
  showToast('loading your video...')
})

// also support pressing enter in the url input
$('yt-url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('yt-url-load').click()
})


// ============================================================
// MUSIC TABS — lofi / custom url switcher
// ============================================================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))

    btn.classList.add('active')
    $(`tab-${tab}`).classList.add('active')
  })
})


// ============================================================
// AMBIENT SOUNDS — using Web Audio API oscillators to fake sounds
// it's not perfect but it gives a vibe without needing actual audio files
// ============================================================

let ambientCtx = null
let activeAmbient = {} // map of sound -> { nodes, gainNode }

// volume from slider
let ambVol = 0.4

$('amb-vol').addEventListener('input', function() {
  ambVol = this.value / 100
  $('amb-vol-label').textContent = `${this.value}%`

  // update all active ambient gains
  Object.values(activeAmbient).forEach(({ gainNode }) => {
    if (gainNode) gainNode.gain.setTargetAtTime(ambVol, ambientCtx.currentTime, 0.1)
  })
})

function getAudioCtx() {
  if (!ambientCtx) {
    ambientCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return ambientCtx
}

// each sound type creates different oscillator / noise combos
// honestly this is pretty rough but it works as a proof of concept

function createNoise(ctx, type, vol) {
  const master = ctx.createGain()
  master.gain.value = vol
  master.connect(ctx.destination)

  const nodes = []

  if (type === 'white' || type === 'rain') {
    // white noise via buffer
    const bufferSize = 4096
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true

    const filter = ctx.createBiquadFilter()

    if (type === 'rain') {
      // rain sounds a bit more high-frequency filtered
      filter.type = 'bandpass'
      filter.frequency.value = 3000
      filter.Q.value = 0.5
    } else {
      filter.type = 'highpass'
      filter.frequency.value = 1000
    }

    src.connect(filter)
    filter.connect(master)
    src.start()
    nodes.push(src, filter)

  } else if (type === 'fire') {
    // fire: low rumble + some crackle
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 60

    const gain = ctx.createGain()
    gain.gain.value = 0.3

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 200

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    osc.start()
    nodes.push(osc, filter, gain)

    // add some random crackle using LFO
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 8
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 20
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start()
    nodes.push(lfo, lfoGain)

  } else if (type === 'cafe') {
    // cafe: layered mid-range pink-ish noise — simulates chatter
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 200 + i * 150 + Math.random() * 100
      const g = ctx.createGain()
      g.gain.value = 0.05
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 600 + i * 200
      f.Q.value = 0.8
      osc.connect(f)
      f.connect(g)
      g.connect(master)
      osc.start()
      nodes.push(osc, g, f)
    }

  } else if (type === 'forest') {
    // forest: gentle high freq + some movement
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 800

    const g = ctx.createGain()
    g.gain.value = 0.15

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.3
    const lfoG = ctx.createGain()
    lfoG.gain.value = 200
    lfo.connect(lfoG)
    lfoG.connect(osc.frequency)

    osc.connect(g)
    g.connect(master)
    osc.start()
    lfo.start()
    nodes.push(osc, g, lfo, lfoG)

  } else if (type === 'waves') {
    // ocean waves: low frequency swooshing
    const bufferSize = 4096
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400

    // LFO to make it swell like waves
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.15 // slow wave rhythm
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 300
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    src.connect(filter)
    filter.connect(master)
    src.start()
    lfo.start()
    nodes.push(src, filter, lfo, lfoGain)
  }

  return { nodes, gainNode: master }
}

function stopAmbient(type) {
  if (activeAmbient[type]) {
    const { nodes, gainNode } = activeAmbient[type]
    // fade out smoothly instead of cutting
    gainNode.gain.setTargetAtTime(0, ambientCtx.currentTime, 0.3)
    setTimeout(() => {
      nodes.forEach(n => {
        try { n.stop && n.stop() } catch(e) { /* already stopped, nbd */ }
        try { n.disconnect() } catch(e) {}
      })
      try { gainNode.disconnect() } catch(e) {}
    }, 600)
    delete activeAmbient[type]
  }
}

document.querySelectorAll('.amb-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sound = btn.dataset.sound

    if (btn.classList.contains('active')) {
      // turn it off
      btn.classList.remove('active')
      stopAmbient(sound)
      showToast(`${sound} off`)
    } else {
      // turn it on
      btn.classList.add('active')
      const ctx = getAudioCtx()

      // resume if browser suspended the context (autoplay policy thing)
      if (ctx.state === 'suspended') ctx.resume()

      activeAmbient[sound] = createNoise(ctx, sound, ambVol)
      showToast(`${sound} on 🎶`)
    }
  })
})


// ============================================================
// KEYBOARD SHORTCUTS — because why not
// ============================================================

document.addEventListener('keydown', e => {
  // don't fire if user is typing in an input/textarea
  const tag = e.target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return

  if (e.code === 'Space') {
    e.preventDefault()
    startBtn.click()
  }

  if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
    resetBtn.click()
  }
})


// ============================================================
// PAGE TITLE TRICK — show timer in tab title when running
// (so you can check it without switching tabs)
// ============================================================

function updatePageTitle() {
  if (pomo.running) {
    const m = pad(Math.floor(pomo.secsLeft / 60))
    const s = pad(pomo.secsLeft % 60)
    document.title = `${m}:${s} — studynook 🎧`
  } else {
    document.title = 'studynook 🎧'
  }
}

// hook into the timer tick — call after the existing timerTick
const _origTick = timerTick
// actually just do it in a separate interval, simpler
setInterval(updatePageTitle, 1000)


// ============================================================
// SESSION PERSISTENCE — save sessions count across reloads
// ============================================================

;(function restoreSession() {
  const stored = localStorage.getItem('studynook_sessions')
  if (stored) {
    const data = JSON.parse(stored)
    // only restore if it's the same calendar day
    const today = new Date().toDateString()
    if (data.date === today) {
      pomo.sessionsCompleted = data.count || 0
      updateDots()
    }
  }
})()

// save whenever sessions update — a bit hacky but it works
const _origUpdateDots = updateDots
function updateDots() {
  _origUpdateDots.call(this)
  const today = new Date().toDateString()
  localStorage.setItem('studynook_sessions', JSON.stringify({
    date: today,
    count: pomo.sessionsCompleted
  }))
}
// NOTE: this re-declares updateDots, which overrides the earlier one
// javascript hoisting means the earlier references still work, this just patches it
// yeah it's a lil messy, i know


// ============================================================
// INIT LOG — just so we know everything loaded ok
// ============================================================

console.log('%c studynook loaded ✓ ', 'background: #d4874a; color: #13110f; padding: 4px 10px; border-radius: 4px; font-weight: bold;')
console.log('shortcuts: [space] = start/pause timer | [r] = reset')