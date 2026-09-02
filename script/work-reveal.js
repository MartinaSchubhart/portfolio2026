/* Reveal for the index2 work cards (.work__card): as each card scrolls into
   view it scales from 80% up to its final size + position, with the corner
   radius easing from 30px down to its resting 10px. IntersectionObserver-
   driven (no ScrollTrigger dependency); runs once per card. Respects
   prefers-reduced-motion and degrades to fully-visible cards without GSAP / IO. */
(function () {
  var cards = document.querySelectorAll('.work__card');
  if (!cards.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !('IntersectionObserver' in window)) return;

  gsap.set(cards, { scale: 0.8, borderRadius: 40, transformOrigin: '50% 50%' });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      gsap.to(entry.target, { scale: 1, borderRadius: 8, duration: 1.1, ease: 'power3.out' });
      io.unobserve(entry.target);
    });
  }, { threshold: 0 });

  cards.forEach(function (c) { io.observe(c); });
})();
