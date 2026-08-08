/* Reveal letter groups (.js-letters) when they scroll into view — adds
   `is-revealed`, which triggers the staggered scaleY animation defined in CSS
   (each group sets its own origin/direction). Groups already in view on load
   (e.g. a page-top word) reveal immediately. Reduced-motion / no
   IntersectionObserver -> reveal instantly. */
(function () {
  var els = document.querySelectorAll('.js-letters, .js-reveal');
  if (!els.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('is-revealed'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); }
    });
  }, { threshold: 0.2 });
  els.forEach(function (el) { io.observe(el); });
})();
