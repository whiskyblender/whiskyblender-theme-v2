/*
 * WBOverlay: the site's one overlay (modal). Use this for every overlay instead
 * of building a new one, so they all look and behave the same. Styles: wb-overlay.css.
 * Loaded site-wide from layout/theme.liquid.
 *
 *   WBOverlay.open({
 *     title:    'We can\'t use that',          // required
 *     body:     'Plain text message',          // optional
 *     button:   'OK',                          // optional, default 'OK'
 *     footnote: { text: 'Think we\'ve got it wrong?', linkText: 'Email us',
 *                 href: 'mailto:info@whiskyblender.com' },  // optional
 *     onClose:  function () { ... }            // runs however it's closed (button, ×, Esc, backdrop)
 *   });
 *
 * All text goes in via textContent, never innerHTML, so it's safe to pass
 * server or customer text. Built on the native <dialog>: focus is trapped
 * inside, Esc closes it, and screen readers announce it as a dialog.
 */
(function () {
  if (window.WBOverlay) return;

  var current = null; /* finish() of the overlay that's open, if any */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function open(opts) {
    opts = opts || {};
    if (current) current();

    var dialog = el('dialog', 'wb-overlay');
    var inner = el('div', 'wb-overlay__inner');
    var titleId = 'wb-overlay-title-' + Date.now();

    var close = el('button', 'wb-overlay__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '&times;';
    inner.appendChild(close);

    var title = el('h2', 'wb-overlay__title', opts.title || '');
    title.id = titleId;
    dialog.setAttribute('aria-labelledby', titleId);
    inner.appendChild(title);

    if (opts.body) inner.appendChild(el('p', 'wb-overlay__body', opts.body));

    var button = el('button', 'wb-overlay__button', opts.button || 'OK');
    button.type = 'button';
    inner.appendChild(button);

    if (opts.footnote) {
      var foot = el('p', 'wb-overlay__footnote', opts.footnote.text ? opts.footnote.text + ' ' : '');
      if (opts.footnote.linkText && opts.footnote.href) {
        var a = el('a', null, opts.footnote.linkText);
        a.href = opts.footnote.href;
        foot.appendChild(a);
      }
      inner.appendChild(foot);
    }

    dialog.appendChild(inner);
    document.body.appendChild(dialog);

    /* Every way of closing runs finish() directly, once. Don't rely on the
       dialog's 'close' event alone: browsers defer it (e.g. while the tab is
       hidden), which once left a closed overlay in the page with onClose unrun.
       The event stays as a fallback for any other way the dialog gets closed. */
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      if (current === finish) current = null;
      if (typeof opts.onClose === 'function') opts.onClose();
    }
    dialog.addEventListener('close', finish);
    /* Esc fires 'cancel' first; close it ourselves so finish() runs now */
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); finish(); });
    close.addEventListener('click', finish);
    button.addEventListener('click', finish);
    /* A click on the backdrop lands on the <dialog> itself, outside the card */
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) finish();
    });

    current = finish;
    if (dialog.showModal) {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    button.focus();
    return dialog;
  }

  window.WBOverlay = { open: open };
})();
