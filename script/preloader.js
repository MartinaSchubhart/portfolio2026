/* count-up preloader.
 *
 * Counts 0 → 100 while the page loads, but holds at 99 until everything
 * necessary is actually ready (window `load` = images/scripts/styles, plus
 * document.fonts = the Acid Grotesk webfont). Once ready and the count
 * reaches 100, the overlay fades out and <html> gets `is-loaded`, which
 * triggers the WELCOME letters to grow in (see styles/pages/home.scss). */
(function () {
  var pre = document.querySelector('.preloader');
  var countEl = pre && pre.querySelector('.preloader__count');
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // arriving mid page-transition (veil): the veil is handling the intro, so
  // skip the count-up and reveal immediately (see script/veil.js)
  var viaVeil = /[?&]pt=1(?:&|$)/.test(location.search);

  function reveal() { root.classList.add('is-loaded'); }

  // no preloader element, reduced motion, or veil transition: reveal immediately
  if (!pre || reduced || viaVeil) { reveal(); if (pre) pre.remove(); return; }

  // resolves when everything necessary has loaded
  var ready = false;
  Promise.all([
    new Promise(function (res) {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    }),
    (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve()
  ]).then(function () { ready = true; });

  var count = 0, startT = null, DURATION = 1800;

  function tick(now) {
    if (startT === null) startT = now;
    var progress = Math.min((now - startT) / DURATION, 1);
    var target = Math.floor(progress * 100);
    if (!ready) target = Math.min(target, 99); // wait for real load before hitting 100
    if (target > count) {
      count = target;
      if (countEl) countEl.textContent = count;
    }
    if (count >= 100) { finish(); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function finish() {
    pre.classList.add('is-done');          // fade the overlay out
    setTimeout(reveal, 200);               // start the letters growing as it clears

    var done = false;
    function cleanup() { if (done) return; done = true; if (pre.parentNode) pre.remove(); }
    pre.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 900);              // fallback if transitionend never fires
  }
})();
