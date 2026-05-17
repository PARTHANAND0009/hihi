# studynook 🎧

okay so basically i made this because i kept having like 50 tabs open  one for lofi, one for a timer, my notes in some random google doc i'd never find again, and it was just a mess. so i built this little app that does all of that in one place. it's not perfect but it works and i use it literally every day now

---

## what it does

- **pomodoro timer**  you know the thing where you study for 25 mins then take a 5 min break? yeah that. it has a little ring that goes around and everything. the timer also shows in your browser tab which is genuinely so useful i don't know why more apps don't do that
- **notes**  just a text box but it saves automatically so you literally cannot lose your notes. it saves to your browser (localStorage) so it's there when you come back. there's a word count too if you care about that
- **music player**  i put in 5 lofi/study streams that i actually listen to. you can also paste any youtube link and it'll play that. by default it hides the video so it's basically just audio, but you can toggle the video on if you want
- **ambient sounds**  rain, fire, café noise, forest, white noise, ocean waves. made with the Web Audio API so no audio files needed which is kinda cool. you can layer them together and adjust the volume

---

## how to use it

literally just:

1. download the 3 files (`index.html`, `style.css`, `app.js`)
2. put them all in the same folder (important!!)
3. open `index.html` in your browser
4. that's it. no install, no npm, no nothing

> if the sounds don't work at first try clicking somewhere on the page first  browsers are weird about audio autoplay, it's not a bug i promise

---

## keyboard shortcuts

| key | what it does |
|-----|-------------|
| `space` | start / pause the timer |
| `r` | reset the timer |

(doesn't work if you're typing in the notes box obviously)

---

## stuff i should probably mention

- the notes save to **your browser only**  so if you clear your browser data they're gone. copy them somewhere safe if they're important
- the ambient sounds are fake/generated  they're not real recordings. they sound okay though imo
- the youtube player is just an embed so all the normal youtube stuff applies (some videos can't be embedded, etc)
- it works best on desktop. i did add some basic responsive stuff but like... it's a study app, you're probably on a laptop

---

## known issues / things i'm too lazy to fix rn

- the café ambient sound is not very convincing lol it's more like... a hum. i tried my best with oscillators okay
- if you resize the window while the timer ring is animating it might look weird for a sec
- no dark/light mode toggle because it's already dark and dark mode is better for studying anyway so
- sometimes the youtube autoplay gets blocked by the browser and you have to click play manually. not my fault, that's a browser security thing

---

## tech stuff (if you care)

just plain HTML, CSS and vanilla JS. no frameworks, no build steps, no dependencies. the only external thing is google fonts which loads from the internet so you need wifi for the fonts to look right (it still works without wifi but the fonts will be different)

used:
- `Web Audio API` for the ambient sounds
- `localStorage` for saving notes and session count
- youtube's embed iframe for the music player
- CSS animations for the visualizer bars and timer ring

---

## why i made it

honestly i have really bad focus and i was spending more time setting up my study environment than actually studying. like i'd spend 20 minutes finding the right lofi playlist and then my pomodoro timer would be in another tab and my notes were scattered everywhere. this just... puts it all in one place. 

also i wanted to try making something with Web Audio API because i thought it was cool that you could generate sounds in the browser without any files

---

## if something's broken

lmk!! just open an issue or whatever. i'm not like a professional developer i'm just a person who made a thing they wanted to exist. i'll try to fix it when i have time

---

*made with way too much coffee and lofi music, late at night, when i should've been studying*
