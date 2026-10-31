/* Clan bottles (PLAN-CLAN-BOTTLES.md, 28 Oct 2026). Loaded only by the
   product.custom-clan-500 / -200 templates, after wb-tartan.js. The page is
   otherwise a custom blend page (wb-blend-product.js for the whisky,
   wb-single-malt.js for the label preview); this script adds:
   - the clan picker (#wb-clan): a type-ahead over clan names and their other
     spellings. Choosing a clan puts "Clan {Name}" in the label text, unless the
     customer has typed their own text;
   - the preview on the new plain stock: the tartan as the artwork, one text
     tone picked from the tartan behind the name, and the side strip,
     "Created by" and "Create your own" the label page prints there. Done with
     classes and CSS variables on <html> (wb-clan.css) plus a few elements added
     to .wbp-label, so wb-single-malt.js needs no changes;
   - the order: Clan / _clan properties, and _blend_url pointed at the label
     page's Clan product (product=clan&clan=<handle>).
   ?clan=<handle> picks the clan on arrival (the 500ml / 200ml switch uses it). */
(function () {
  'use strict';

  var T = window.WBTartan;
  var root = document.getElementById('wb-clan');
  if (!T || !root) return;

  var DEFAULT_CLAN = 'dramlover';
  var size = root.getAttribute('data-size') === '200ml' ? '200ml' : '500ml';

  /* Label px, the same frame as the label page (wb-label.js) and the preview.
     art: the plain-stock artwork area; name: the name box relative to the
     artwork (for the text tone; centred clan layout, 31 Oct 2026, as wb-label.css
     #page.wb-clan-label); panel: side strip top + length; sideLabel:
     "Created by" top + left; cyo: "Create
     your own" left, line 1 + 2 baselines, font size. */
  var GEO = {
    '500ml': { art: [-9, -33, 570, 269], name: [142, 9.8, 286, 180.4], panel: [-33, 269],
               tallFont: 14, domainFont: 9, volume: 500, sideLabel: [170, 126],
               cyo: [455.8, 206.9, 218.8, 8.3] },
    '200ml': { art: [-9, 4, 445, 193], name: [118.5, 8, 208, 128], panel: [4, 193],
               tallFont: 12, domainFont: 7, volume: 200, sideLabel: [140, 63.5],
               cyo: [346.7, 155.8, 164.8, 6.8] }
  };
  var g = GEO[size];
  var REPEAT = 0.42 * 570;   /* one sett repeat in label px, as the label page */
  var RES = 2;               /* canvas px per label px (screen) */

  var html = document.documentElement;
  var input = document.getElementById('wb-clan-input');
  var list = document.getElementById('wb-clan-list');
  var labelInput = document.getElementById('label-text');
  var clan = null, lastDefault = '', tone = 'white';
  var art = {};

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ── Tartan + tone ── */
  function artFor(c) {
    if (!art[c.handle]) {
      var cv = document.createElement('canvas');
      cv.width = Math.round(g.art[2] * RES); cv.height = Math.round(g.art[3] * RES);
      T.draw(cv, c, REPEAT * RES);
      var n = g.name;
      art[c.handle] = {
        url: cv.toDataURL('image/png'),
        tone: c.tone || T.tone(cv, n[0] * RES, n[1] * RES, n[2] * RES, n[3] * RES).text   /* fixed per clan, or automatic */
      };
    }
    return art[c.handle];
  }

  function applyClan() {
    var a = artFor(clan);
    tone = a.tone;
    html.style.setProperty('--wb-clan-art', 'url("' + a.url + '")');
    html.style.setProperty('--wb-clan-ink', tone === 'white' ? '#ffffff' : '#111111');
    html.style.setProperty('--wb-clan-shade', tone === 'white' ? '#000000' : '#ffffff');
    input.value = clan.name;
  }

  /* ── Preview additions (what the label page prints on the plain stock) ── */
  /* The side strip's zigzag edge, as wb-label.js buildZigzagClip */
  function zigzag(w, h, step, depth) {
    var pts = [];
    for (var i = 0; i <= Math.ceil(w / step); i++) pts.push(Math.min(i * step, w) + 'px ' + (i % 2 ? depth : 0) + 'px');
    pts.push(w + 'px ' + h + 'px', '0px ' + h + 'px');
    return 'polygon(' + pts.join(', ') + ')';
  }
  function decorate() {
    var label = document.querySelector('.wbp-label');
    if (!label || label.querySelector('.wbp-clan-print')) return;

    var strip = document.createElement('div');
    strip.className = 'wbp-clan-print wbp-clan-strip';
    var s = g.panel[1] / 232;
    strip.style.cssText = 'top:' + g.panel[0] + 'px;width:' + g.panel[1] + 'px;padding:' +
      Math.round(10 * s) + 'px ' + Math.round(16 * s) + 'px ' + Math.round(17 * s) + 'px;' +
      'clip-path:' + zigzag(g.panel[1], 56, 8, 5);
    var tall = 'font-size:' + g.tallFont + 'px';
    strip.innerHTML = '<span class="wbp-clan-tall" style="' + tall + '">46% abv</span>' +
      '<span class="wbp-clan-domain" style="font-size:' + g.domainFont + 'px">whiskyblender.com</span>' +
      '<span class="wbp-clan-tall" style="' + tall + ';text-align:right">' + g.volume + 'ml &#8494;</span>';
    label.appendChild(strip);

    var by = document.createElement('div');
    by.className = 'wbp-clan-print wbp-clan-by';
    by.textContent = 'Created by';
    by.style.cssText = 'top:' + g.sideLabel[0] + 'px;left:' + g.sideLabel[1] + 'px';
    label.appendChild(by);

    var c = g.cyo;
    [['Create your own at', 500, c[1]], ['whiskyblender.com', 700, c[2]]].forEach(function (line) {
      var el = document.createElement('div');
      el.className = 'wbp-clan-print wbp-clan-cyo';
      el.textContent = line[0];
      el.style.cssText = 'left:' + c[0] + 'px;top:' + (line[2] - c[3] * 0.92) + 'px;font-size:' + c[3] + 'px;font-weight:' + line[1];
      label.appendChild(el);
    });
  }

  /* The preview is built when the label text first changes; add to it then */
  new MutationObserver(function () { decorate(); })
    .observe(document.body, { childList: true, subtree: true });

  /* ── Choosing a clan ── */
  function choose(c, quiet) {
    var text = labelInput ? labelInput.value.trim() : '';
    clan = c;
    applyClan();
    /* Replace the label text only if it's empty or still the last clan's default */
    if (labelInput && (!text || text === lastDefault)) {
      labelInput.value = c.label;
      labelInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    lastDefault = c.label;
    if (!quiet) hideList();
  }

  /* ── Type-ahead (ARIA combobox) ── */
  var matches = [], active = -1;
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return T.CLANS.slice();
    return T.CLANS.filter(function (c) {
      return [c.name].concat(c.aliases || []).some(function (n) { return n.toLowerCase().indexOf(q) !== -1; });
    });
  }
  function alias(c, q) {
    q = q.trim().toLowerCase();
    if (!q || c.name.toLowerCase().indexOf(q) !== -1) return '';
    var a = (c.aliases || []).filter(function (n) { return n.toLowerCase().indexOf(q) !== -1; })[0];
    return a ? 'also ' + a : '';
  }
  function swatch(c) {
    var keys = Object.keys(c.colours);
    return 'linear-gradient(90deg,' + keys.map(function (k, i) {
      return c.colours[k] + ' ' + (i * 100 / keys.length) + '% ' + ((i + 1) * 100 / keys.length) + '%';
    }).join(',') + ')';
  }
  function showList() {
    matches = search(input.value);
    active = matches.length ? 0 : -1;
    list.innerHTML = matches.length ? matches.map(function (c, i) {
      return '<li role="option" id="wb-clan-opt-' + i + '" data-i="' + i + '" aria-selected="' + (i === active) + '">' +
        '<span class="wb-clan-swatch" style="background:' + swatch(c) + '"></span>' +
        '<span class="wb-clan-name">' + esc(c.name) + '</span>' +
        '<small>' + esc(c.handle === DEFAULT_CLAN ? 'our own tartan' : alias(c, input.value)) + '</small></li>';
    }).join('') : '<li class="wb-clan-empty">No clan by that name yet. Choose Dramlover, our own tartan.</li>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', active >= 0 ? 'wb-clan-opt-' + active : '');
  }
  function hideList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function setActive(i) {
    active = i;
    [].forEach.call(list.querySelectorAll('li[role="option"]'), function (li, j) { li.setAttribute('aria-selected', String(j === i)); });
    input.setAttribute('aria-activedescendant', i >= 0 ? 'wb-clan-opt-' + i : '');
    var el = document.getElementById('wb-clan-opt-' + i);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('focus', function () { input.select(); showList(); });
  input.addEventListener('input', showList);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) showList(); else setActive(Math.min(matches.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) choose(matches[active]); }
    else if (e.key === 'Escape') { hideList(); input.value = clan.name; }
  });
  input.addEventListener('blur', function () {
    setTimeout(function () { hideList(); input.value = clan.name; }, 150);
  });
  list.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li[data-i]');
    if (!li) return;
    e.preventDefault();
    choose(matches[+li.getAttribute('data-i')]);
  });

  /* ── The other size: carry the clan, label and whisky across ── */
  var other = root.querySelector('.wb-clan-other');
  if (other) {
    other.addEventListener('click', function () {
      var href = other.getAttribute('data-href') + '?clan=' + encodeURIComponent(clan.handle);
      var text = labelInput ? labelInput.value.trim() : '';
      if (text) href += '&label=' + encodeURIComponent(text);
      var preset = document.querySelector('input[name="wb-whisky"]:checked');
      if (preset) href += '&preset=' + encodeURIComponent(preset.value);
      other.setAttribute('href', href);   /* a Lab blend's ?blend= is added by wb-blend-product.js */
    });
  }

  /* ── The order ── After the custom blend script has set its properties (its
     formdata listener was added at load; this one is added at submit, so it runs
     after), add the clan and point the label link at the Clan product. */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.matches || !form.matches('form[action="/cart/add"]:not([id*="installment"])')) return;
    form.addEventListener('formdata', function (fe) {
      var fd = fe.formData;
      fd.set('properties[Clan]', clan.name);
      fd.set('properties[_clan]', clan.handle);
      var url = fd.get('properties[_blend_url]');
      if (url && url.indexOf('&clan=') === -1) {
        fd.set('properties[_blend_url]', url.replace('&product=customblend', '&product=clan') + '&clan=' + encodeURIComponent(clan.handle));
      }
    }, { once: true });
  }, true);

  /* ── Start ── after the other scripts' load handlers, so the preview is listening */
  function start() {
    html.classList.add('wb-clan');
    html.style.setProperty('--wb-clan-stock', 'url("' + root.getAttribute('data-stock') + '")');
    var params = new URLSearchParams(window.location.search);
    /* ?label= from the size switch: the customer's own text, kept over the default */
    var carried = (params.get('label') || '').trim();
    if (carried && labelInput && !labelInput.value) labelInput.value = [...carried].slice(0, 32).join('');
    choose(T.find(params.get('clan')) || T.find(DEFAULT_CLAN), true);
    decorate();
  }
  function boot() { setTimeout(start, 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
