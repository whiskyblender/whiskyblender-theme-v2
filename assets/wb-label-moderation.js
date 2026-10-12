/*
 * Personalised label text check.
 *
 * Asks the Lab (/api/moderate) whether the customer's label wording is OK as
 * they type, and blocks Add to cart while it's refused (slurs, sexual terms,
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
  var NAMES = ['Label text', 'Created by', 'Prescribed for', 'To', 'From'];

  var inputs = [];
  NAMES.forEach(function (n) {
    document.querySelectorAll('input[name="properties[' + n + ']"]').forEach(function (el) {
      inputs.push(el);
    });
  });
  if (!inputs.length) return;

  var blocked = null; /* { input, message } while refused, else null */
  var seq = 0;
  var timer = null;

  function msgEl(input) {
    var el = input.parentNode.querySelector('.wb-moderation-msg');
    if (!el) {
      el = document.createElement('p');
      el.className = 'wb-moderation-msg';
      el.setAttribute('role', 'alert');
      el.style.cssText = 'color:#b3261e;font-size:0.9em;margin:0.4em 0 0;';
      input.insertAdjacentElement('afterend', el);
    }
    return el;
  }

  /* Message + a way to appeal, as a clickable email link */
  function setMsg(el, message) {
    el.textContent = message + ' Think we\'ve got it wrong? ';
    var a = document.createElement('a');
    a.href = 'mailto:info@whiskyblender.com';
    a.textContent = 'Email us';
    a.style.color = 'inherit';
    el.appendChild(a);
  }

  function clearAll() {
    blocked = null;
    inputs.forEach(function (i) {
      i.removeAttribute('aria-invalid');
      var el = i.parentNode.querySelector('.wb-moderation-msg');
      if (el) el.remove();
    });
  }

  function check() {
    var texts = inputs.map(function (i) { return i.value || ''; });
    if (!texts.join('').trim()) { clearAll(); return; }
    var mine = ++seq;
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: texts })
    })
      .then(function (res) { return res.ok ? res.json() : { ok: true }; })
      .then(function (data) {
        if (mine !== seq) return; /* a newer check is in flight */
        clearAll();
        if (data && data.ok === false) {
          /* Point at the first non-empty field that fails on its own is overkill
             for 2 short fields; flag the one the customer is editing, else the first. */
          var target = document.activeElement && inputs.indexOf(document.activeElement) !== -1
            ? document.activeElement : inputs[0];
          blocked = { input: target, message: data.message };
          target.setAttribute('aria-invalid', 'true');
          setMsg(msgEl(target), data.message);
        }
      })
      .catch(function () { /* fail-open */ });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(check, 500);
  }

  inputs.forEach(function (i) {
    i.addEventListener('input', schedule);
    i.addEventListener('change', check);
  });
  /* Fields can be prefilled (Lab blend author → From), so check once on load too */
  check();

  /* Capture phase on document runs before Dawn's product-form submit handler */
  document.addEventListener('submit', function (e) {
    if (!blocked) return;
    var form = e.target;
    if (!inputs.some(function (i) { return i.form === form; })) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setMsg(msgEl(blocked.input), blocked.message);
    blocked.input.focus();
  }, true);
})();
