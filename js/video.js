/* ============================================================================
   video.js — the opening surprise video.

   The video carries its own sound, so the background song is ducked to
   silence while it plays and faded back in afterwards. If the file is
   missing, stalls on a slow connection, or the browser refuses to play it,
   the site moves on by itself instead of getting stuck on a black screen.
   ========================================================================= */

window.OpeningVideo = (function () {
  let video, wrap, skipBtn, onDone;
  let finished = false;
  let stallTimer = null;

  function init(videoEl, wrapEl, skipEl) {
    video = videoEl;
    wrap = wrapEl;
    skipBtn = skipEl;

    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';

    video.addEventListener('ended', finish);
    video.addEventListener('error', () => finish(true));
    video.addEventListener('playing', () => {
      wrap.classList.add('is-playing');
      clearTimeout(stallTimer);
    });

    skipBtn.addEventListener('click', () => finish());
  }

  /** Warm the file up while she is still reading the intro screen. */
  function preload() {
    if (video) video.load();
  }

  function play(done) {
    onDone = done;
    finished = false;
    wrap.classList.remove('is-playing');
    skipBtn.classList.remove('is-visible');

    // If nothing has started within 6s (missing file, very slow network),
    // don't leave her staring at nothing.
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => finish(true), 6000);

    const attempt = video.play();
    if (attempt && attempt.catch) {
      attempt.catch(() => {
        // Sound was refused — try again muted rather than dropping the video.
        video.muted = true;
        video.play().catch(() => finish(true));
      });
    }

    setTimeout(() => skipBtn.classList.add('is-visible'), 2600);
  }

  function finish(failed) {
    if (finished) return;
    finished = true;
    clearTimeout(stallTimer);
    try { video.pause(); } catch (e) {}
    if (onDone) onDone(!!failed);
  }

  function stop() {
    finished = true;
    clearTimeout(stallTimer);
    try { video.pause(); video.currentTime = 0; } catch (e) {}
  }

  return { init, preload, play, stop };
})();
