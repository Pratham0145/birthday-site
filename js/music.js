/* ============================================================================
   music.js — one <audio> element, created once, never recreated.

   Because the element is never touched again after setup, the song keeps
   playing straight through every section change, the infinite zoom, and the
   finale. Nothing here tries to defeat autoplay policy: playback only ever
   starts from a real click.
   ========================================================================= */

window.Music = (function () {
  let audio = null;
  let toggleBtn = null;
  let wanted = false;        // does the user want music on?
  let fadeTimer = null;
  const FULL_VOLUME = 0.7;

  function init(audioEl, buttonEl) {
    audio = audioEl;
    toggleBtn = buttonEl;
    audio.loop = true;
    audio.volume = 0;

    toggleBtn.addEventListener('click', () => {
      if (wanted) pause(); else play();
    });

    audio.addEventListener('error', () => {
      toggleBtn.hidden = true;
      console.warn('Background music could not be loaded from', audio.currentSrc || audio.src);
    });

    updateButton();
  }

  /* Called from inside the "Open your surprise" click, so the browser counts
     it as user-initiated. We start silent and fade up later. */
  function unlock() {
    if (!audio) return Promise.resolve();
    return audio.play().then(() => {
      wanted = true;
      updateButton();
    }).catch(() => {
      // Some browsers still refuse; the music button remains available.
      wanted = false;
      updateButton();
    });
  }

  function fadeTo(target, ms, done) {
    if (!audio) return;
    clearInterval(fadeTimer);
    const start = audio.volume;
    const steps = Math.max(1, Math.round(ms / 40));
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      audio.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
      if (i >= steps) {
        clearInterval(fadeTimer);
        if (done) done();
      }
    }, 40);
  }

  function fadeIn(ms) {
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    }
    wanted = true;
    updateButton();
    fadeTo(FULL_VOLUME, ms == null ? 1800 : ms);
  }

  function fadeOut(ms) { fadeTo(0, ms == null ? 600 : ms); }

  /** Quieten under the video, without stopping the track. */
  function duck() { fadeTo(0.0, 400); }
  function unduck() { fadeTo(FULL_VOLUME, 1600); }

  function play() {
    if (!audio) return;
    wanted = true;
    audio.play().catch(() => {});
    fadeTo(FULL_VOLUME, 500);
    updateButton();
  }

  function pause() {
    if (!audio) return;
    wanted = false;
    fadeTo(0, 350, () => { if (!wanted) audio.pause(); });
    updateButton();
  }

  function updateButton() {
    if (!toggleBtn) return;
    toggleBtn.classList.toggle('is-playing', wanted);
    toggleBtn.setAttribute('aria-pressed', String(wanted));
    toggleBtn.setAttribute('aria-label', wanted ? 'Pause the music' : 'Play the music');
  }

  function showControl() {
    if (toggleBtn) toggleBtn.classList.add('is-visible');
  }

  function restart() {
    if (!audio) return;
    audio.currentTime = 0;
  }

  return { init, unlock, fadeIn, fadeOut, duck, unduck, play, pause, showControl, restart };
})();
