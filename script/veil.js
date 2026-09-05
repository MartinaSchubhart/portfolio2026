/* veil: page-transition curtain.
 *
 * A solid --accent panel wipes vertically (Web Animations API on transform):
 *   - cover  : rises up from below to fill the screen, then navigates
 *   - reveal : continues up and off the top on the new page to uncover it
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
  var DURATION = 600;
  var EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';

  var COVERED = 'translateY(0)';
  var BELOW = 'translateY(calc(100% + 200px))';    // parked well below (start of a cover); the +200px clears the mobile URL-bar resize so no edge peeks in
  var ABOVE = 'translateY(-100%)';   // exited off the top (end of a reveal)

  // did we arrive mid-transition? strip the param so refreshes are clean
  var params = new URLSearchParams(location.search);
  var arrived = params.has(PARAM);
  if (arrived) {
    params.delete(PARAM);
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  // pre-paint covered state comes from the .is-covered class (added by the inline
  // script when ?pt=1). From here JS drives transform via inline styles.
  var startCovered = veil.classList.contains('is-covered');
  veil.style.transform = startCovered ? COVERED : BELOW;

  function park() {
    veil.getAnimations().forEach(function (a) { a.cancel(); });
    veil.style.transform = BELOW;
    veil.style.pointerEvents = '';
  }

  // restore idle state if the page is served from the bfcache
  window.addEventListener('pageshow', function (e) { if (e.persisted) park(); });

  if (reduced) return; // CSS hides the veil entirely; use native navigation

  // ---- reveal (uncover on arrival) --------------------------------------
  if (startCovered) {
    var HOLD = arrived ? 60 : 350;
    setTimeout(function () {
      var anim = veil.animate(
        [{ transform: COVERED }, { transform: ABOVE }],
        { duration: DURATION, easing: EASE, fill: 'forwards' }
      );
      var done = false;
      function finish() { if (done) return; done = true; park(); }
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
      [{ transform: BELOW }, { transform: COVERED }],
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
