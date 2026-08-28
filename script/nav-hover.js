/* "Roll" hover (ported from Website2): the link label slides up out of a
   clipped frame while a duplicate rises from below to replace it. Applied to
   the header text links (name + nav), the header copy-email link, and the
   footer email/linkedin links. Progressive enhancement — without this script
   the links fall back to a plain underline (see navigation.scss / footer.scss).

   rollify(host, textEl) wraps textEl's text in .nav-roll__inner > span and
   mirrors it via data-text; `host` is the element that carries .nav-roll so the
   whole link is the hover target. For most links host === textEl (the <a>). For
   the copy-email link textEl is the inner <span> only, so its sibling <svg> icon
   is left untouched and stays still while the address rolls. */
(function () {
  function rollify(host, textEl) {
    var text = textEl.textContent.trim();
    if (!text) return;
    host.classList.add('nav-roll');
    textEl.textContent = '';

    var inner = document.createElement('span');
    inner.className = 'nav-roll__inner';
    inner.setAttribute('data-text', text);

    var span = document.createElement('span');
    span.textContent = text;

    inner.appendChild(span);
    textEl.appendChild(inner);
  }

  /* plain text links: the whole <a> is both hover host and text container */
  document.querySelectorAll(
    '.site-header__left a, .site-header__nav a, .closing__email, .closing__linkedin'
  ).forEach(function (a) { rollify(a, a); });

  /* copy-email: roll the address text only; the copy icon stays still */
  document.querySelectorAll('.site-header__copy-email').forEach(function (a) {
    var textEl = a.querySelector('span');
    if (textEl) rollify(a, textEl);
  });
})();
