/* Over-scroll to open the next case study.
   Once the page is scrolled to the very bottom, further downward scroll intent
   (wheel / touch) accumulates; past a threshold it "clicks" the .cs-endnext
   link, so veil.js runs its normal page-transition to the next case study.
   Progressive enhancement: the prompt is a real link, so it also works on click
   / keyboard without this script. */
(function () {
  var link = document.querySelector('.cs-endnext');
  if (!link) return;

  var THRESHOLD = 500;   // px of extra downward scroll past the bottom
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

  var lastY = null;
  window.addEventListener('touchstart', function (e) {
    lastY = e.touches[0].clientY;
    accum = 0;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (fired || lastY === null) return;
    var y = e.touches[0].clientY;
    var dy = lastY - y;  // > 0 while scrolling down
    lastY = y;
    if (dy > 0 && atBottom()) {
      accum += dy;
      if (accum >= THRESHOLD) trigger();
    } else if (dy < 0) {
      accum = 0;
    }
  }, { passive: true });
})();
