/*
 * Personalised label text check.
 *
 * Asks the Lab (/api/moderate) whether the customer's label wording is OK as
 * they type. A refusal shows in the site overlay (WBOverlay) when they leave the
 * field or press Add to cart, and blocks Add to cart; OK clears that field (slurs, sexual terms,
 * other whisky brand names; ordinary swearing is allowed). The word list and
 * policy live in the Lab: whiskyblender-lab/app/lib/moderation.server.ts.
 *
 * Fail-open on purpose: if the check is slow, pending or the Lab is down, the
 * order goes through. A person still reads every label before it's printed.
 *
 * No-op on pages without label fields.
 */
(function () {
  var API = 'https://lab.whiskyblender.com/api/moderate';
  /* Monitoring: is the filter costing sales? Logs "shown" and "recovered" to the
     Lab's ModerationEvent table (scripts/moderation-report.mjs). */
  var EVENT_API = 'https://lab.whiskyblender.com/api/moderation-event';
  var NAMES = ['Label text', 'Created by', 'Prescribed for', 'To', 'From'];

  var inputs = [];
  NAMES.forEach(function (n) {
    document.querySelectorAll('input[name="properties[' + n + ']"]').forEach(function (el) {
      inputs.push(el);
    });
  });
  if (!inputs.length) return;

  var blocked = null; /* { input, message, reason } while refused, else null */
  /* Random id for this page load, ties an overlay to a later Add to cart */
  var pageSession = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  var refusedReason = null; /* set once the overlay has been shown on this page */

  function logEvent(stage, extra) {
    try {
      var body = { stage: stage, pageSession: pageSession, path: location.pathname };
      for (var k in extra) body[k] = extra[k];
      fetch(EVENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* monitoring must never break the page */ }
  }

  function fieldName(input) {
    var m = /properties\[(.+)\]/.exec(input.name || '');
    return m ? m[1] : input.name;
  }
  var seq = 0;
  var timer = null;
  var showWhenChecked = false; /* set on blur: show the overlay once the check answers */

  /* Refusal message in the site overlay (WBOverlay, wb-overlay.js). OK clears the
     refused field so the customer starts that line again. */
  function showOverlay() {
    if (!blocked) return;
    var input = blocked.input;
    var message = String(blocked.message).replace(/ Think we.*$/, '');
    refusedReason = blocked.reason || 'offensive';
    logEvent('shown', { reason: blocked.reason, field: fieldName(input), text: input.value });
    var reset = function () {
      input.value = '';
      /* label previews redraw on 'input' */
      input.dispatchEvent(new Event('input', { bubbles: true }));
      blocked = null;
      input.removeAttribute('aria-invalid');
      input.focus();
    };
    if (!window.WBOverlay) { window.alert(message); reset(); return; }
    window.WBOverlay.open({
      title: 'We can’t print that',
      body: message,
      button: 'OK',
      footnote: { text: 'Think we’ve got it wrong?', linkText: 'Email us', href: 'mailto:info@whiskyblender.com' },
      onClose: reset
    });
  }

  function check() {
    var texts = inputs.map(function (i) { return i.value || ''; });
    var mine = ++seq;
    if (!texts.join('').trim()) { blocked = null; return; }
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: texts })
    })
      .then(function (res) { return res.ok ? res.json() : { ok: true }; })
      .then(function (data) {
        if (mine !== seq) return; /* a newer check is in flight */
        inputs.forEach(function (i) { i.removeAttribute('aria-invalid'); });
        blocked = null;
        if (data && data.ok === false) {
          /* The Lab says which field failed; older replies don't, so fall back
             to the field being edited, else the first */
          var target = inputs[data.index] ||
            (inputs.indexOf(document.activeElement) !== -1 ? document.activeElement : inputs[0]);
          blocked = { input: target, message: data.message, reason: data.reason };
          target.setAttribute('aria-invalid', 'true');
          if (showWhenChecked) showOverlay();
        }
        showWhenChecked = false;
      })
      .catch(function () { showWhenChecked = false; /* fail-open */ });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(check, 500);
  }

  inputs.forEach(function (i) {
    /* Check quietly while typing; only interrupt once they leave the field */
    i.addEventListener('input', schedule);
    i.addEventListener('change', function () {
      clearTimeout(timer);
      showWhenChecked = true;
      check();
    });
  });
  /* Fields can be prefilled (Lab blend title/author), so check once on load too */
  check();

  /* Capture phase on document runs before Dawn's product-form submit handler */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!inputs.some(function (i) { return i.form === form; })) return;
    if (!blocked) {
      /* Not blocked now, but refused earlier on this page: they changed the
         wording and carried on. Log it, and tag the order with a hidden
         property so orders placed after a refusal can be counted in Shopify. */
      if (refusedReason) {
        logEvent('recovered', { reason: refusedReason });
        if (!form.querySelector('input[name="properties[_moderation_refused]"]')) {
          var tag = document.createElement('input');
          tag.type = 'hidden';
          tag.name = 'properties[_moderation_refused]';
          tag.value = refusedReason;
          form.appendChild(tag);
        }
      }
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    showOverlay();
  }, true);
})();
