/* headline text reveal: split [data-reveal] elements into lines and
   individual characters (GSAP SplitText). Each character fades and
   rises softly into place, staggered letter by letter, with every
   line starting slightly after the one before it.

   No line mask is used on purpose: a mask box (line-height: 1) clips
   glyph descenders. Instead the letters fade in as they rise. Kerning
   is disabled in CSS on [data-reveal] so the per-char split state and
   the reverted plain-text state share identical letter metrics — with
   kerning on, revert would snap every letter and shift the headline.

   Coordinated with the veil: when the page loads covered by the curtain,
   the reveal waits for the veil to start clearing so the letters emerge
   as the curtain lifts. On plain loads it plays right away. */

(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.SplitText) return;

  gsap.registerPlugin(SplitText);

  /* hold the headline while a cover is in front of it: either the page-
     transition curtain (.veil.is-covered) or the first-load preloader
     (html.is-preloading). Both fire `veil:reveal` as they clear. */
  var veil = document.querySelector('.veil');
  var preloading = document.documentElement.classList.contains('is-preloading');
  var covered = preloading || (!!veil && veil.classList.contains('is-covered'));
  var revealed = false;
  document.addEventListener('veil:reveal', function () { revealed = true; }, { once: true });

  var DELAY_AFTER_VEIL = 0.35; /* headline area is uncovered mid-sweep */
  var FALLBACK_MS = preloading ? 6500 : 2500; /* preloader lifts later than the curtain */

  function fontsReady() {
    return (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  }

  fontsReady().then(function () {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var split = SplitText.create(el, {
        type: 'lines, words, chars',
        linesClass: 'tr-line',
        charsClass: 'tr-char'
      });
      gsap.set(split.chars, { yPercent: 60, autoAlpha: 0 });

      /* one timeline: chars of each line rise & fade in with a small
         per-letter stagger; each line starts a beat after the previous */
      var tl = gsap.timeline({
        paused: true,
        onComplete: function () { split.revert(); } /* restore clean markup; resize-safe */
      });
      split.lines.forEach(function (line, i) {
        tl.to(line.querySelectorAll('.tr-char'), {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.016
        }, i * 0.14);
      });

      var played = false;
      function play(delay) {
        if (played) return;
        played = true;
        setTimeout(function () { tl.play(); }, (delay || 0) * 1000);
      }

      if (!covered) {
        play(0.1);
      } else if (revealed) {
        play(DELAY_AFTER_VEIL);
      } else {
        document.addEventListener('veil:reveal', function () { play(DELAY_AFTER_VEIL); }, { once: true });
        setTimeout(function () { play(0); }, FALLBACK_MS); /* never leave a headline hidden */
      }
    });
  });
})();
