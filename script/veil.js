/* veil: page-transition curtain.
 *
 * A solid --canvas-light panel fades via opacity (Web Animations API):
 *   - cover  : fades in to fill the screen, then navigates
 *   - reveal : fades back out on the new page to uncover it
 *
 * The next page is told to open already covered via a `?pt=1` query param;
 * an inline <head> script on each page adds `.is-covered` pre-paint so there
 * is no flash before this (deferred) script runs. The handoff travels via
 * URL param, not sessionStorage, so it also works under file:// where every
 * document is its own storage origin. */
(function () {
  var veil = document.querySelector('.veil');
  if (!veil) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PARAM = 'pt';
  var DURATION = 500;
  var EASE = 'ease';

  // did we arrive mid-transition? strip the param so refreshes are clean
  var params = new URLSearchParams(location.search);
  var arrived = params.has(PARAM);
  if (arrived) {
    params.delete(PARAM);
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  // pre-paint covered state comes from the .is-covered class (added by the inline
  // script when ?pt=1). From here JS drives opacity via inline styles, which
  // override the class. We keep the class on the element because text-reveal.js
  // reads it to sync the headline.
  var startCovered = veil.classList.contains('is-covered');
  veil.style.opacity = startCovered ? '1' : '0';

  function hide() {
    veil.getAnimations().forEach(function (a) { a.cancel(); });
    veil.style.opacity = '0';
    veil.style.pointerEvents = '';
  }

  // restore idle state if the page is served from the bfcache
  window.addEventListener('pageshow', function (e) { if (e.persisted) hide(); });

  if (reduced) return; // CSS hides the veil entirely; use native navigation

  // ---- reveal (uncover on arrival / landing intro) ----------------------
  if (startCovered) {
    var HOLD = arrived ? 60 : 350; // brief hold; a touch longer for the intro
    setTimeout(function () {
      var anim = veil.animate(
        [{ opacity: 1 }, { opacity: 0 }],
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
      [{ opacity: 0 }, { opacity: 1 }],
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
