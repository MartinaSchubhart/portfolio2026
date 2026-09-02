/* "Scroll" follow-cursor over any element marked [data-scroll-cursor] (e.g. a
   case-study hero image). Same visual + behaviour as the landing hero cursor: a
   soft circular label offset so its top-left corner sits at the pointer, shown
   only while the whole circle fits inside the area. GSAP-based (quickTo); only
   on hover-capable, fine-pointer, non-reduced-motion devices. */
(function () {
  if (!window.gsap) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var areas = document.querySelectorAll('[data-scroll-cursor]');
  if (!areas.length) return;

  var FOLLOW = 0.4, SCALE_IN = 0.4, SCALE_OUT = 0.3;
  var OFFSET_X = 60, OFFSET_Y = 60;                // +60 = half the 120px circle → top-left corner at the pointer

  var el = document.createElement('div');
  el.className = 'work-cursor scroll-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span>Scroll</span>';
  document.body.appendChild(el);

  gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
  var xTo = gsap.quickTo(el, 'x', { duration: FOLLOW, ease: 'power3' });
  var yTo = gsap.quickTo(el, 'y', { duration: FOLLOW, ease: 'power3' });

  var current = null, shown = false;

  function fits(e) {
    if (!current) return false;
    var r = current.getBoundingClientRect();
    var half = (el.offsetWidth || 120) / 2;
    var cx = e.clientX + OFFSET_X, cy = e.clientY + OFFSET_Y;
    return cx - half >= r.left && cx + half <= r.right &&
           cy - half >= r.top  && cy + half <= r.bottom;
  }
  function reveal() {
    shown = true;
    gsap.to(el, { scale: 1, autoAlpha: 1, duration: SCALE_IN, ease: 'back.out(1.7)', overwrite: 'auto' });
  }
  function conceal() {
    shown = false;
    gsap.to(el, { scale: 0, autoAlpha: 0, duration: SCALE_OUT, ease: 'power2.in', overwrite: 'auto' });
  }

  function enter(e) { current = e.currentTarget; move(e); }
  function move(e) {
    xTo(e.clientX + OFFSET_X);
    yTo(e.clientY + OFFSET_Y);
    var ok = fits(e);
    if (ok && !shown) reveal();
    else if (!ok && shown) conceal();
  }
  function leave() { current = null; if (shown) conceal(); }

  areas.forEach(function (a) {
    a.addEventListener('mouseenter', enter);
    a.addEventListener('mousemove', move);
    a.addEventListener('mouseleave', leave);
  });
})();
