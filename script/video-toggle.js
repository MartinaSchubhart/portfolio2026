/* Play/pause toggle for case-study videos.
   Videos autoplay muted + looped; the .cs-video__toggle button pauses/resumes
   and reflects the state via .is-paused on the .cs-figure__media wrapper (CSS
   swaps the pause/play icon). Progressive enhancement — without JS the video
   still autoplays; the button simply does nothing. */
(function () {
  var toggles = document.querySelectorAll('.cs-video__toggle');
  Array.prototype.forEach.call(toggles, function (btn) {
    var media = btn.closest('.cs-figure__media');
    var video = media && media.querySelector('video');
    if (!video) return;

    function sync() {
      media.classList.toggle('is-paused', video.paused);
      btn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    }

    btn.addEventListener('click', function () {
      if (video.paused) video.play(); else video.pause();
      sync();
    });

    /* keep the icon in sync if playback changes for other reasons */
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
  });
})();
