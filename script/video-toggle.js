/* video play / pause — one independent toggle per video block */

document.querySelectorAll('.cs-media[data-media="video"]').forEach((block) => {
  const video = block.querySelector('video');
  const btn = block.querySelector('.video-toggle');
  if (!video || !btn) return;

  // reflect the video's real state (autoplay can silently fail to start,
  // in which case the button's hardcoded "playing" markup would be wrong)
  function syncButton() {
    btn.classList.toggle('paused', video.paused);
    btn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
  }
  video.addEventListener('play', syncButton);
  video.addEventListener('pause', syncButton);
  syncButton();

  btn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  // if every <source> fails (network error, unsupported format, etc.),
  // fall back to a static image instead of leaving a dead video box
  video.addEventListener('error', () => {
    const poster = video.getAttribute('poster');
    if (!poster) return;
    const img = document.createElement('img');
    img.src = poster;
    img.alt = '';
    video.replaceWith(img);
    btn.remove();
  });
});
