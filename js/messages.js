/* ============================================================================
   messages.js — the friendship-messages card.

   A single card that cycles through CONFIG.MESSAGES one at a time. Tapping
   the card (or the "Another one" button) swaps in the next line; there is
   no separate popup and nothing is clickable except the card itself, so the
   screen stays simple.
   ========================================================================= */

window.Messages = (function () {
  const lines = window.CONFIG.MESSAGES.slice();
  let bag = [];
  let textEl, countEl, total;

  function nextLine() {
    if (!bag.length) bag = lines.slice().sort(() => Math.random() - 0.5);
    return bag.pop();
  }

  function swap() {
    textEl.classList.remove('is-in');
    setTimeout(() => {
      textEl.textContent = nextLine();
      textEl.classList.add('is-in');
      seen++;
      if (countEl) countEl.textContent = 'tap for another';
    }, 260);
  }

  let seen = 0;

  /**
   * @param {HTMLElement} card   the whole message card, click target
   * @param {HTMLElement} text   the element the line is written into
   * @param {HTMLElement} hint   small "tap for another" hint (optional)
   */
  function init(card, text, hint) {
    textEl = text;
    countEl = hint || null;
    total = lines.length;

    textEl.textContent = nextLine();
    seen = 1;
    requestAnimationFrame(() => textEl.classList.add('is-in'));

    card.addEventListener('click', swap);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); swap(); }
    });
  }

  /** Reset so a restart shows a fresh shuffled order. */
  function reset() { bag = []; seen = 0; }

  return { init, reset };
})();
