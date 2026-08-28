/* Follow cursor for the work cards (ported from the original portfolio): a soft
   circular "Discover" label eases toward the pointer while over a card, scaling
   in on enter and out on leave. GSAP-based (quickTo); only on hover-capable,
   fine-pointer, non-reduced-motion devices. */
(function () {
  if (!window.gsap) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = document.querySelectorAll('.work__card');
  if (!items.length) return;

  var LABEL = '<span>Discover</span>';
  var FOLLOW = 0.4, SCALE_IN = 0.4, SCALE_OUT = 0.3;

  var el = document.createElement('div');
  el.className = 'work-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = LABEL;
  document.body.appendChild(el);

  gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
  var xTo = gsap.quickTo(el, 'x', { duration: FOLLOW, ease: 'power3' });
  var yTo = gsap.quickTo(el, 'y', { duration: FOLLOW, ease: 'power3' });

  var over = false;

  function enter(e) {
    if (over) return;
    over = true;
    gsap.set(el, { x: e.clientX, y: e.clientY });
    gsap.to(el, { scale: 1, autoAlpha: 1, duration: SCALE_IN, ease: 'back.out(1.7)', overwrite: 'auto' });
  }

  function move(e) {
    xTo(e.clientX);
    yTo(e.clientY);
  }

  function leave(e) {
    if (e.relatedTarget && e.relatedTarget.closest('.work__card')) return; // moving between cards
    over = false;
    gsap.to(el, { scale: 0, autoAlpha: 0, duration: SCALE_OUT, ease: 'power2.in', overwrite: 'auto' });
  }

  items.forEach(function (it) {
    it.addEventListener('mouseenter', enter);
    it.addEventListener('mousemove', move);
    it.addEventListener('mouseleave', leave);
  });
})();
