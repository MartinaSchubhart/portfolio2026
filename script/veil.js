/* veil: black page-transition curtain.
 *
 * A solid dark panel animates via clip-path (Web Animations API):
 *   - cover  : swipes up from the bottom to fill the screen, then navigates
 *   - reveal : continues up and off the top to uncover the new page
 *
 * The next page is told to open already covered via a `?pt=1` query param;
 * an inline <head> script on each page adds `.is-covered` pre-paint so there
 * is no flash before this (deferred) script runs. The handoff travels via
 * URL param, not sessionStorage, so it also works under file:// where every
 * document is its own storage origin. The landing page starts `.is-covered`
 * in its markup so it plays a short intro on cold load.
 *
 * On reveal we dispatch a `veil:reveal` event so the headline text-reveal
 * can start in sync as the curtain clears. */
(function () {
  var veil = document.querySelector('.veil');
  if (!veil) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PARAM = 'pt';
  var DURATION = 650;
  var EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

  var BOTTOM = 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'; // collapsed at bottom (hidden)
  var FULL   = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';     // covering the screen
  var TOP    = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';         // collapsed at top (hidden)

  // did we arrive mid-transition? strip the param so refreshes are clean
  var params = new URLSearchParams(location.search);
  var arrived = params.has(PARAM);
  if (arrived) {
    params.delete(PARAM);
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  // pre-paint covered state comes from the .is-covered class (landing intro,
  // or added by the inline script when ?pt=1). From here JS drives clip-path
  // via inline styles, which override the class's clip-path. We keep the
  // class on the element because text-reveal.js reads it to sync the headline.
  var startCovered = veil.classList.contains('is-covered');
  veil.style.clipPath = startCovered ? FULL : BOTTOM;

  function hide() {
    veil.getAnimations().forEach(function (a) { a.cancel(); });
    veil.style.clipPath = BOTTOM;
    veil.style.pointerEvents = '';
  }

  // restore idle state if the page is served from the bfcache
  window.addEventListener('pageshow', function (e) { if (e.persisted) hide(); });

  if (reduced) return; // CSS hides the veil entirely; use native navigation

  // ---- reveal (uncover on arrival / landing intro) ----------------------
  if (startCovered) {
    var HOLD = arrived ? 60 : 350; // brief hold; a touch longer for the intro
    setTimeout(function () {
      document.dispatchEvent(new CustomEvent('veil:reveal'));
      var anim = veil.animate(
        [{ clipPath: FULL }, { clipPath: TOP }],
        { duration: DURATION, easing: EASE, fill: 'forwards' }
      );
      var done = false;
      function finish() { if (done) return; done = true; hide(); }
      anim.onfinish = finish;
      anim.oncancel = finish;
      setTimeout(finish, DURATION + 200); // safety net if the frame never fires
    }, HOLD);
  }

  // ---- cover (intercept same-origin link clicks) ------------------------
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var link = e.target.closest('a[href]');
    if (!link) return;
    if (link.hasAttribute('download')) return;
    if (link.target && link.target !== '_self') return;

    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }

    // only intercept in-site navigations
    if (location.protocol === 'file:') {
      if (url.protocol !== 'file:') return;
    } else {
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      if (url.origin !== location.origin) return;
    }
    // ignore same-page links (anchors on the current document)
    if (url.pathname === location.pathname && url.search === location.search) return;

    e.preventDefault();
    veil.style.pointerEvents = 'auto';

    var anim = veil.animate(
      [{ clipPath: BOTTOM }, { clipPath: FULL }],
      { duration: DURATION, easing: EASE, fill: 'forwards' }
    );

    var navigated = false;
    function go() {
      if (navigated) return;
      navigated = true;
      url.searchParams.set(PARAM, '1');
      window.location.href = url.toString();
    }
    anim.onfinish = go;
    anim.oncancel = go;
    setTimeout(go, DURATION + 200); // safety net if the frame never fires
  });
})();
