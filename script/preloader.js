/* Intro for the landing. The hero image is shown straightaway (no image
   animation); the nameplate letters rise in and the intro text + header links
   (and, on mobile, the brand + rule) fade/slide up over it.

   The .lp-loading class (added in <head>) hides those elements pre-paint so
   there's no flash before this deferred script runs.

   Degrades safely: without GSAP, with reduced motion, or when arriving via a
   page transition (?pt=1) or scrolled down, nothing animates — the class is just
   removed and the hero shown. */
(function () {
  var html = document.documentElement;
  function reveal() { html.classList.remove('lp-loading'); }

  var nameImgs = document.querySelectorAll('.lp__nameplate image');
  var intro = document.querySelector('.lp__intro');
  var nav = document.querySelector('.lp__nav');
  var heroWrap = document.querySelector('.lp__name');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // veil.js strips ?pt=1 before this runs, so read the flag captured pre-paint in
  // the <head> (fall back to the param in case that didn't run)
  var viaTransition = window.__fromTransition || /[?&]pt=1(?:&|$)/.test(location.search);

  if (!window.gsap || reduce || viaTransition || !nameImgs.length || !intro || !nav || !heroWrap) {
    reveal();
    return;
  }
  // only play the intro at the very top; if the page loaded/restored scrolled
  // down, just show the hero without animating
  if ((window.pageYOffset || document.documentElement.scrollTop || 0) > 1) {
    reveal();
    return;
  }

  var LETTER_DUR = 0.5, STAGGER = 0.035;
  var TEXT_DUR = 1;                                   // fade length for the intro + header

  // the brand + white rule show in the header row on mobile only — animate them
  // in with the rest there
  var isMobile = window.matchMedia('(max-width: 699px)').matches;
  var brand = document.querySelector('.lp__brand');
  var rule = document.querySelector('.lp__rule');
  var textEls = (brand && isMobile) ? [intro, nav, brand] : [intro, nav];

  // start states
  gsap.set(nameImgs, { attr: { y: 161 } });           // letters below the svg's clip (mask)
  gsap.set(heroWrap, { autoAlpha: 1 });               // wrapper visible; letters clipped, so empty
  gsap.set(textEls, { autoAlpha: 0, y: 24 });         // hidden, sitting a touch below
  if (rule && isMobile) gsap.set(rule, { scaleX: 0, autoAlpha: 1, transformOrigin: 'left center' });

  reveal();                                           // inline styles now control visibility

  var tl = gsap.timeline();

  tl.to(nameImgs, {                                   // nameplate letters rise in
        attr: { y: 0 },
        duration: LETTER_DUR,
        ease: 'power3.out',
        stagger: STAGGER
     }, 0)
    .to(textEls, {                                    // fade: linear, over the full duration
        autoAlpha: 1,
        duration: TEXT_DUR,
        ease: 'none'
     }, 0)
    .to(textEls, {                                    // rise: twice as fast as the fade
        y: 0,
        duration: TEXT_DUR / 2,
        ease: 'power2.out'
     }, 0);

  if (rule && isMobile) {                              // white rule grows left→right, alongside the text
    tl.to(rule, { scaleX: 1, duration: TEXT_DUR, ease: 'power3.out' }, 0);
  }
})();
