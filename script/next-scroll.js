/* Over-scroll to open the next case study.
   Once the page is scrolled to the very bottom, further downward scroll intent
   (wheel / touch) accumulates; past a threshold it "clicks" the .cs-endnext
   link, so veil.js runs its normal page-transition to the next case study.
   Progressive enhancement: the prompt is a real link, so it also works on click
   / keyboard without this script. */
(function () {
  var link = document.querySelector('.cs-endnext');
  if (!link) return;

  var THRESHOLD = 500;        // px of extra wheel scroll past the bottom (desktop)
  var TOUCH_THRESHOLD = 220;  // px of extra finger drag past the bottom (mobile)
  var accum = 0;
  var fired = false;

  function atBottom() {
    var doc = document.documentElement;
    return (window.innerHeight + window.scrollY) >= (doc.scrollHeight - 4);
  }

  function trigger() {
    if (fired) return;
    fired = true;
    link.click();        // veil.js intercepts same-origin links and transitions
  }

  window.addEventListener('wheel', function (e) {
    if (fired) return;
    if (e.deltaY > 0 && atBottom()) {
      accum += e.deltaY;
      if (accum >= THRESHOLD) trigger();
    } else if (e.deltaY < 0) {
      accum = 0;
    }
  }, { passive: true });

  // Touch: unlike wheel, a phone scrolls in discrete swipes, so we must let the
  // extra downward drag accumulate ACROSS swipes while parked at the bottom —
  // resetting on every touchstart made the threshold effectively unreachable.
  var lastY = null;
  window.addEventListener('touchstart', function (e) {
    lastY = e.touches[0].clientY;
    if (!atBottom()) accum = 0;   // fresh gesture away from the bottom starts over
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (fired || lastY === null) return;
    var y = e.touches[0].clientY;
    var dy = lastY - y;  // > 0 while scrolling down
    lastY = y;
    if (dy > 0 && atBottom()) {
      accum += dy;
      if (accum >= TOUCH_THRESHOLD) trigger();
    } else if (dy < 0) {
      accum = 0;         // any upward drag cancels the intent
    }
  }, { passive: true });
  // dragging up cancels intent; if the swipe ends away from the bottom, reset too
  window.addEventListener('touchend', function () {
    lastY = null;
    if (!atBottom()) accum = 0;
  }, { passive: true });
})();
