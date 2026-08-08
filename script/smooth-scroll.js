/* smooth scrolling via Lenis.

   Lenis smooths the *native* scroll position (it doesn't transform the
   page), so position: fixed / sticky, IntersectionObserver, and anchor
   links all keep working normally.

   Disabled under prefers-reduced-motion. Same-page anchor links are
   eased to their target. */

(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof Lenis === 'undefined') return;

  var lenis = new Lenis({
    duration: 1.1,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, // easeOutExpo
    smoothWheel: true
  });
  window.lenis = lenis;

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  /* ease same-page hash links (#work, #about, …) */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest('a[href]');
    if (!link || (link.target && link.target !== '_self')) return;

    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }
    if (url.pathname !== location.pathname || url.search !== location.search) return;
    if (!url.hash || url.hash === '#') return;

    var target = document.querySelector(url.hash);
    if (!target) return;

    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY;
    lenis.scrollTo(top);
    history.pushState(null, '', url.hash);
  });
})();
