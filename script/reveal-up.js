/* Move-up reveal: every element marked [data-reveal-up] starts slightly lower
   and transparent, then eases up into place as it scrolls into view. Once per
   element (IntersectionObserver, no ScrollTrigger). Degrades to fully-visible
   elements without GSAP / IO or under prefers-reduced-motion. */
(function () {
  var els = document.querySelectorAll('[data-reveal-up]');
  if (!els.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !('IntersectionObserver' in window)) return;

  gsap.set(els, { y: 30, autoAlpha: 0 });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      gsap.to(entry.target, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' });
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  els.forEach(function (el) { io.observe(el); });
})();
