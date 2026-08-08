/* Sticky header behaviour (landing + case-study pages).
   1. Publishes the header's height as --header-h so the hero can pad below it.
   2. Recolours the header to match the background behind it.

   The header has a per-page base colour (white on dark-topped pages, Ink on the
   light-topped case study). Sections that differ from that base are tagged
   `data-nav="light"` or `data-nav="dark"`; whichever tagged section crosses a
   line at the header's vertical midpoint sets the header to `.is-light`
   (-> Ink) or `.is-dark` (-> white). Over untagged regions the header falls
   back to its base colour.

   Lenis smooths the native scroll position (no transform), so plain scroll +
   getBoundingClientRect track correctly. */
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;

  function setHeaderH() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));

  function update() {
    var line = header.offsetHeight / 2; // detection line, viewport px from top
    var theme = null;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { theme = sections[i].getAttribute('data-nav'); break; }
    }
    header.classList.toggle('is-light', theme === 'light');
    header.classList.toggle('is-dark', theme === 'dark');
  }

  function refresh() { setHeaderH(); update(); }

  refresh();

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
  }, { passive: true });

  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
