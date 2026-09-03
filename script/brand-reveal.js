/* Reveals the fixed home link (.lp__brand) on index2 once the header scrolls
   into the work section, and hides it again over the hero. Toggles .is-visible
   by comparing the work section's top edge against the header line. Lenis moves
   the native scroll position (no transform), so getBoundingClientRect tracks it;
   reads are rAF-throttled. */
(function () {
  var brand = document.querySelector('.lp__brand');
  var work = document.getElementById('work');
  if (!brand || !work) return;

  var LINE = 40;                                    // header line, viewport px from top
  var ticking = false;

  function update() {
    ticking = false;
    var into = work.getBoundingClientRect().top <= LINE;
    brand.classList.toggle('is-visible', into);
    /* header is now over the light area → tint the nav accordingly (see home.scss) */
    document.documentElement.classList.toggle('lp-header-light', into);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
})();
