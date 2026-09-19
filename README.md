# A birthday surprise for Devva

A small static site. Plain HTML, CSS and JavaScript — no build step.

```
birthday-site/
├── index.html            the six screens + music button
├── css/styles.css        the whole design system
├── js/
│   ├── config.js         ← every message and asset path lives here
│   ├── music.js           background song
│   ├── video.js            opening video
│   ├── messages.js         the friendship-messages card
│   ├── infinite-zoom.js    your zoom engine, untouched
│   └── app.js              screen flow
└── assets/
    ├── audio/song.mp3
    ├── video/opening.mp4
    └── zoom/1.png … 4.png   ← replace with your real zoom layers
```

## The flow

1. **Opening** — "Hey Devva…" / "I made a tiny birthday surprise for you." / **Open it**
2. **Video** — your file plays full screen, with a Skip button after a few seconds
3. **Birthday** — "Happy Birthday, Devva" + a short message + a Kannada line
4. **Messages** — a card with a friendship-style line; tapping it swaps in another
5. **One more thing** — **Look Closer** opens the infinite zoom
6. **Final** — "Happy Birthday again, Devva!" and **Start Again**

No romantic language, no hearts, no character stickers anywhere — just the
two names (Devva, Annu), the video, the song, the messages, and the zoom.

## Editing the messages

Open `js/config.js`. Every line on the site is in there:

- `OPENING` — the two intro lines and the button
- `BIRTHDAY` — the title, the short message, the Kannada line
- `MESSAGES` — the pool the messages card draws from, shuffled so nothing
  repeats until the whole list has been seen once
- `MORE` and `FINAL` — the last two screens

Add, remove or reword any line freely.

Kannada renders in Baloo Tamma 2 (from Google Fonts) with Noto Sans Kannada as
a fallback, so mixed Kannada/English lines sit on the same baseline.

## Swapping assets

- **Video** — overwrite `assets/video/opening.mp4`.
- **Song** — overwrite `assets/audio/song.mp3`. It loops, so a short track is fine.
- **Zoom layers** — drop your real `1.png`–`4.png` into `assets/zoom/`. The
  nested target positions in `js/infinite-zoom.js` already match your latest
  Infinite Zoom HTML exactly (the ones from the file you last uploaded); the
  placeholders there now just prove the layout lines up until you drop your
  real images in.

## The infinite zoom

The engine itself is untouched: `computeWorldMatrices()`, the easing model,
`zoomAround()` / `rotateAround()`, wheel zoom, Shift+wheel rotate, Q/E/0,
mouse panning, pinch with its clamp, two-finger rotation with the ±π unwrap,
the double-tap guards, DPR handling and circular clipping are all the same
code as your source file. Only `LAYERS_CONFIG`'s three target positions were
updated, to match the newer HTML you sent:

- layer 1 → 2: `{ cx: 810, cy: 280, d: 406 }`
- layer 2 → 3: `{ cx: 760, cy: 475, d: 380 }`
- layer 3 → 4: `{ cx: 701, cy: 231, d: 330 }`

Around the engine sits a small lifecycle: `mount()`, `preload()` (starts
fetching the layers as soon as she reaches the "one more thing" screen), and
`open()` / `close()`, which attach and release every listener and start and
stop the render loop so it costs nothing while closed. The overlay is
`position: fixed` with `touch-action: none` and `<body>` is `overflow: hidden`,
so the page can never scroll behind her fingers. **Back to Birthday** or
Escape closes it.

## Running it

Double-click `index.html`, or serve the folder if your browser is fussy about
local media:

```bash
cd birthday-site
python3 -m http.server 8000     # http://localhost:8000
```

## Browser notes

- **Autoplay** — nothing plays until she presses *Open it*. That click unlocks
  audio: the song starts silent, stays silent under the video, fades in on the
  birthday screen and keeps playing through everything after, including the
  zoom. If a browser still refuses, the button at the bottom right starts it.
- **iOS** — the video is `playsinline`, and if sound is refused it retries
  muted rather than skipping.
- **Failures** — if the video can't start within six seconds, or errors, the
  site moves on to the birthday screen by itself.
- Fonts come from Google Fonts, so the first load wants a connection. Reduced
  motion settings are respected.
