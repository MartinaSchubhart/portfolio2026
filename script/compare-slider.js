/* Before / after comparison slider (.cs-compare).
   Dragging anywhere on the component moves the split; the divider's --pos
   custom property drives the clip on the "before" image. A visually-hidden
   range input mirrors the value for keyboard users (arrow keys). Progressive
   enhancement: with no JS the "before" image simply shows at its default 50%. */
(function () {
  var sliders = document.querySelectorAll('.cs-compare');
  if (!sliders.length) return;

  sliders.forEach(function (el) {
    var range = el.querySelector('.cs-compare__range');
    var dragging = false;

    function set(pct) {
      pct = Math.max(0, Math.min(100, pct));
      el.style.setProperty('--pos', pct + '%');
      if (range) range.value = pct;
    }

    function pctFromEvent(e) {
      var r = el.getBoundingClientRect();
      if (!r.width) return 50;
      return ((e.clientX - r.left) / r.width) * 100;
    }

    el.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      set(pctFromEvent(e));
    });
    el.addEventListener('pointermove', function (e) {
      if (dragging) set(pctFromEvent(e));
    });
    function stop() { dragging = false; }
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);

    // keyboard (arrow keys move the focused range input)
    if (range) range.addEventListener('input', function () { set(+range.value); });

    set(range ? +range.value : 50);
  });
})();
