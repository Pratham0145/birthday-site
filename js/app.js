/* ============================================================================
   app.js — wires the six screens together.

      intro → video → birthday → messages → "one more thing" → final
                                                    ↕
                                              infinite zoom
   ========================================================================= */

(function () {
  const C = window.CONFIG;
  const scenes = {};
  const ORDER = ['intro', 'video', 'birthday', 'messages', 'more', 'surprise2', 'kids', 'final'];
  let currentScene = null;
  let zoomOpen = false;
  let booted = false;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };

  /* --- navigation -------------------------------------------------------- */

  function navigateToSection(id) {
    const next = scenes[id];
    if (!next || next === currentScene) return;

    if (currentScene) {
      currentScene.classList.remove('is-active');
      currentScene.setAttribute('aria-hidden', 'true');
    }
    next.classList.add('is-active');
    next.setAttribute('aria-hidden', 'false');
    currentScene = next;
    document.body.dataset.scene = id;

    $('#backBtn').classList.toggle('is-visible', ['messages', 'more', 'surprise2', 'final'].includes(id));

    if (id === 'more') window.InfiniteZoom.preload();
    if (id === 'surprise2') { const kv = $('#kidsVideo'); if (kv) kv.load(); }

    next.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function goBack() {
    const i = ORDER.indexOf(document.body.dataset.scene);
    if (i > 2) navigateToSection(ORDER[i - 1]);
  }

  /* --- opening ----------------------------------------------------------- */

  function initOpening() {
    const intro = scenes.intro;
    const openBtn = $('#openBtn');

    setText('[data-open-1]', C.OPENING.line1);
    setText('[data-open-2]', C.OPENING.line2);
    openBtn.textContent = C.OPENING.button;

    requestAnimationFrame(() => intro.classList.add('is-ready'));

    openBtn.addEventListener('click', () => {
      openBtn.disabled = true;
      // this click is what unlocks audio for the rest of the session
      window.Music.unlock().then(() => window.Music.duck());
      intro.classList.add('is-leaving');

      setTimeout(() => {
        navigateToSection('video');
        window.OpeningVideo.play(() => {
          navigateToSection('birthday');
          window.Music.showControl();
          window.Music.fadeIn(2200);
          startBirthday();
        });
      }, 650);
    });
  }

  /* --- birthday ------------------------------------------------------------ */

  function initBirthday() {
    setText('[data-bd-title]', C.BIRTHDAY.title);
    setText('[data-bd-name]', C.BIRTHDAY.name);
    setText('[data-bd-message]', C.BIRTHDAY.message);
    setText('[data-bd-kannada]', C.BIRTHDAY.kannada);
  }

  function startBirthday() {
    requestAnimationFrame(() => scenes.birthday.classList.add('is-ready'));
  }

  /* --- friendship messages -------------------------------------------------- */

  function initMessages() {
    window.Messages.init($('#msgCard'), $('[data-msg-text]'), $('.msg-card__hint'));
  }

  /* --- one more thing + infinite zoom ------------------------------------ */

  function initMore() {
    setText('[data-more-kicker]', C.MORE.kicker);
    setText('[data-more-title]', C.MORE.title);
    setText('[data-more-line]', C.MORE.line);
    $('#exploreBtn').textContent = C.MORE.button;

    const overlay = $('#zoomOverlay');
    const closeBtn = $('#zoomBack');
    const loading = $('#zoomLoading');

    window.InfiniteZoom.mount($('#zoomCanvas'), $('#zoomHint'));

    function open() {
      zoomOpen = true;
      overlay.hidden = false;
      document.body.classList.add('zoom-open');
      loading.hidden = window.InfiniteZoom.isReady();
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      window.InfiniteZoom.open(() => { loading.hidden = true; });
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      if (!zoomOpen) return;
      zoomOpen = false;
      window.InfiniteZoom.close();
      overlay.classList.remove('is-open');
      document.body.classList.remove('zoom-open');
      setTimeout(() => { overlay.hidden = true; }, 420);
      scenes.more.classList.add('has-returned');
      $('#toFinal').focus({ preventScroll: true });
    }

    $('#exploreBtn').addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && zoomOpen) close();
    });
  }


  function initKidsSurprise() {
    const kidsBtn = $('#kidsBtn');
    const kidsVideo = $('#kidsVideo');
    const kidsSkip = $('#kidsSkip');
    const kidsStage = $('#kidsStage');
    let finished = false;

    function finishKids() {
      if (finished) return;
      finished = true;
      window.Music.unduck();
      navigateToSection('final');
    }

    kidsBtn.addEventListener('click', () => {
      finished = false;
      navigateToSection('kids');
      window.Music.duck();
      kidsSkip.classList.remove('is-visible');
      kidsStage.classList.remove('is-playing');

      kidsVideo.currentTime = 0;
      const attempt = kidsVideo.play();
      if (attempt && attempt.catch) attempt.catch(() => {});

      setTimeout(() => kidsSkip.classList.add('is-visible'), 2600);
    });

    kidsVideo.addEventListener('playing', () => kidsStage.classList.add('is-playing'));
    kidsVideo.addEventListener('ended', finishKids);
    kidsVideo.addEventListener('error', finishKids);
    kidsSkip.addEventListener('click', () => { kidsVideo.pause(); finishKids(); });
  }

  /* --- final ------------------------------------------------------------- */

  function initFinal() {
    setText('[data-final-kicker]', C.FINAL.kicker);
    setText('[data-final-title]', C.FINAL.title);
    setText('[data-final-line]', C.FINAL.line);
    setText('[data-final-kannada]', C.FINAL.kannada);
    $('#restartBtn').textContent = C.FINAL.button;

    $('#restartBtn').addEventListener('click', () => {
      window.OpeningVideo.stop();
      window.Messages.reset();
      scenes.intro.classList.remove('is-leaving');
      scenes.birthday.classList.remove('is-ready');
      scenes.more.classList.remove('has-returned');
      $('#openBtn').disabled = false;
      const kidsVideo = $('#kidsVideo');
      kidsVideo.pause();
      kidsVideo.currentTime = 0;
      $('#kidsStage').classList.remove('is-playing');
      $('#kidsSkip').classList.remove('is-visible');
      navigateToSection('intro');
      window.Music.restart();   // the song keeps playing, just from the top
    });
  }

  /* --- boot -------------------------------------------------------------- */

  function initBirthdaySite() {
    if (booted) return;
    booted = true;

    $$('.scene').forEach((s) => { scenes[s.dataset.scene] = s; });
    currentScene = scenes.intro;
    document.body.dataset.scene = 'intro';

    window.Music.init($('#bgm'), $('#musicToggle'));
    window.OpeningVideo.init($('#openingVideo'), $('#videoStage'), $('#videoSkip'));

    initOpening();
    initBirthday();
    initMessages();
    initMore();
    initKidsSurprise();
    initFinal();

    $('#backBtn').addEventListener('click', goBack);
    $('#toMessages').addEventListener('click', () => navigateToSection('messages'));
    $('#toMore').addEventListener('click', () => navigateToSection('more'));
    $('#toFinal').addEventListener('click', () => navigateToSection('surprise2'));

    setTimeout(() => window.OpeningVideo.preload(), 900);
    window.navigateToSection = navigateToSection;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBirthdaySite);
  } else {
    initBirthdaySite();
  }
})();
