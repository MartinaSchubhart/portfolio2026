/* Make each work teaser card clickable (navigates to its case study).
   The hit area is the card's image box only — clicks on the transparent 14%
   WebGL bleed margin (the magnetic hover area, which overflows the card via an
   absolutely-positioned canvas) are ignored. The destination is read from the
   card's own "View Case Study" button, so cards without a real case study
   (href="#") stay non-clickable. */
(function () {
  document.querySelectorAll('.work__teaser').forEach(function (card) {
    var btn = card.querySelector('.work__teaser__btn');
    var href = btn && btn.getAttribute('href');
    if (!href || href === '#') return;

    card.style.cursor = 'pointer';
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return; // real links (the button) act normally
      var r = card.getBoundingClientRect(); // image box — excludes the bleed
      if (e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top && e.clientY <= r.bottom) {
        // click the button rather than navigating directly, so the page-
        // transition veil (script/veil.js) intercepts it like any link
        btn.click();
      }
    });
  });
})();
