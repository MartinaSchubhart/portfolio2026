/* Sticky header behaviour.
   1. If there's a .site-header (legal pages), publishes its height as --header-h
      and recolours it (.is-light / .is-dark) to match the section behind it.
   2. Always toggles .is-header-light / .is-header-dark on <html>, so pages
      without a .site-header (the case study, whose nav is .lp__nav / .lp__brand)
      can recolour their header from CSS.

   Sections that differ from the base are tagged data-nav="light" / "dark";
   whichever tagged section crosses the header line sets the theme. Lenis smooths
   the native scroll position, so getBoundingClientRect tracks correctly. */
(function () {
  var header = document.querySelector('.site-header');
  var html = document.documentElement;
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  if (!header && !sections.length) return;

  function setHeaderH() {
    if (header) html.style.setProperty('--header-h', header.offsetHeight + 'px');
  }

  function update() {
    var line = header ? header.offsetHeight / 2 : 44; // detection line, viewport px from top
    var theme = null;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { theme = sections[i].getAttribute('data-nav'); break; }
    }
    if (header) {
      header.classList.toggle('is-light', theme === 'light');
      header.classList.toggle('is-dark', theme === 'dark');
    }
    html.classList.toggle('is-header-light', theme === 'light');
    html.classList.toggle('is-header-dark', theme === 'dark');
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
