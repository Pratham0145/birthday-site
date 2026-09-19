/* ============================================================================
   config.js — every message and asset path lives in this one file.
   Edit this whenever you want to change what the site says.
   ========================================================================= */

window.CONFIG = (function () {

  /* --- assets ------------------------------------------------------------ */
  const ASSETS = {
    audio: 'assets/audio/song.mp3',     // background song, loops
    video: 'assets/video/opening.mp4'   // the surprise video
  };

  /* --- opening screen ------------------------------------------------------ */
  const OPENING = {
    line1: 'Hey Devva...',
    line2: 'I made a tiny birthday surprise for you.',
    button: 'Open it'
  };

  /* --- birthday screen ------------------------------------------------------ */
  const BIRTHDAY = {
    title: 'Happy Birthday,',
    name: 'Devva',
    message: 'Another year older, but still the same mad girl.',
    kannada: 'ಹುಟ್ಟುಹಬ್ಬದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು ದೇವ್ವಾ!'
  };

  /* --- friendship messages screen --------------------------------------- *
   * A stack of short, casual lines. Some use a pet name, most don't — the
   * site never forces one into every line. Mixes plain English with the
   * casual Kannada-English style a close friend would actually text.
   * ------------------------------------------------------------------- */
  const MESSAGES = [
    'Keep smiling, keep enjoying, and keep being you.',
    'ಹೀಗೆ ಯಾವಾಗಲೂ ನಗ್ತಾ ಇರು.',
    'Hope this year brings lots of happiness, good memories and crazy plans.',
    'Stay awesome, Annu.',
    'ಇನ್ನೊಂದು ವರ್ಷ complete ಆಯ್ತು!',
    'Good friends make life brighter. You make it louder.',
    'ಅನ್ನೂ, ನಿನ್ನ ಎಲ್ಲಾ dreams ಈ ವರ್ಷ ನನಸಾಗಲಿ.',
    'Same mad girl, different stories.',
    'More trips, more fun loading...',
    'ಇವತ್ತು full enjoy ಮಾಡು.',
    'Cheers to another amazing year ahead, Devva.',
    'ಯಾವಾಗಲೂ happy ಆಗಿ ಇರು ದೇವ್ವಾ.',
    'May your day be full of the things you actually like doing.',
    'ನಿನ್ನ ಎಲ್ಲಾ plans successful ಆಗಲಿ.',
    'Keep shining. Stay awesome always.',
    'ಇನ್ನೂ ತುಂಬಾ trips, ತುಂಬಾ fun ಬರಬೇಕು.'
  ];

  /* --- "one more thing" screen ------------------------------------------- */
  const MORE = {
    kicker: 'Okay, birthday message done...',
    title: 'But wait, one more thing.',
    line: 'ಇನ್ನೂ ಒಂದು ಸಣ್ಣ surprise ಇದೆ.',
    button: 'Look Closer'
  };

  /* --- final screen -------------------------------------------------------- */
  const FINAL = {
    kicker: "Okay, that's it",
    title: 'Happy Birthday again, Devva!',
    line: 'Keep smiling. Keep shining. Keep being you.',
    kannada: 'ಎಲ್ಲಾ ಚೆನ್ನಾಗಿ ಆಗಲಿ ದೇವ್ವಾ.',
    button: 'Start Again'
  };

  return { ASSETS, OPENING, BIRTHDAY, MESSAGES, MORE, FINAL };
})();
