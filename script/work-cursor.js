/* Follow cursor for the landing work cards (.work__card): a small accent square
   with a plus icon, offset so its top-left corner sits at the pointer (plus a
   little extra push). It only shows while the whole square fits inside the card —
   near a card's right/bottom edge the offset would push it outside, so it hides
   until the pointer moves back in. On enter it grows from a tiny, 90°-rotated,
   square-cornered box to its resting state, then the plus icon appears; leaving
   reverses that. GSAP-based (quickTo); only on hover-capable, fine-pointer,
   non-reduced-motion devices. */
(function () {
  if (!window.gsap) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = document.querySelectorAll('.work__card');
  if (!items.length) return;

  var FOLLOW = 0.4;

  var el = document.createElement('div');
  el.className = 'work-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<img class="work-cursor__icon" src="assets/plus-icon.svg" alt="" />';
  document.body.appendChild(el);

  // offset = half the cursor's own size (top-left corner at the pointer) + extra
  function off() { return (el.offsetWidth || 63) / 2 + 18; }

  gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
  var xTo = gsap.quickTo(el, 'x', { duration: FOLLOW, ease: 'power3' });
  var yTo = gsap.quickTo(el, 'y', { duration: FOLLOW, ease: 'power3' });

  var icon = el.querySelector('.work-cursor__icon');
  var current = null;      // the card currently under the pointer
  var shown = false;       // whether the cursor is currently revealed
  var animTl;              // enter/leave animation (separate from the x/y follow)

  // is the whole offset square inside `current`'s box for this pointer position?
  function fits(e) {
    if (!current) return false;
    var r = current.getBoundingClientRect();
    var half = off();
    var cx = e.clientX + half;
    var cy = e.clientY + half;
    return cx - half >= r.left && cx + half <= r.right &&
           cy - half >= r.top  && cy + half <= r.bottom;
  }

  function reveal() {
    shown = true;
    if (animTl) animTl.kill();
    gsap.set(icon, { autoAlpha: 0 });
    animTl = gsap.timeline();
    animTl.fromTo(el,
            { scale: 0.15, rotation: 90, borderRadius: 0, autoAlpha: 1 },
            { scale: 1, rotation: 0, borderRadius: 4, duration: 0.3, ease: 'back.out(1.7)' })
          .to(icon, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
  }
  function conceal() {
    shown = false;
    if (animTl) animTl.kill();
    animTl = gsap.timeline();
    animTl.to(icon, { autoAlpha: 0, duration: 0.15, ease: 'power2.in' })
          .to(el, { scale: 0.15, rotation: 90, borderRadius: 0, autoAlpha: 0, duration: 0.25, ease: 'power2.in' });
  }

  function enter(e) {
    current = e.currentTarget;
    var o = off();
    gsap.set(el, { x: e.clientX + o, y: e.clientY + o });
    move(e);
  }
  function move(e) {
    var o = off();
    xTo(e.clientX + o);
    yTo(e.clientY + o);
    var ok = fits(e);
    if (ok && !shown) reveal();
    else if (!ok && shown) conceal();
  }
  function leave(e) {
    var next = e.relatedTarget && e.relatedTarget.closest('.work__card');
    if (next) { current = next; return; }          // moving straight into another card
    current = null;
    if (shown) conceal();
  }

  items.forEach(function (it) {
    it.addEventListener('mouseenter', enter);
    it.addEventListener('mousemove', move);
    it.addEventListener('mouseleave', leave);
  });
})();
