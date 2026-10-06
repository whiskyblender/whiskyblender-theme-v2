/**
 * wb-track.js
 *
 * First-party page-view and link-click log, plus a GA4 click event.
 *
 * Why: GA4 only sees visitors who accept analytics cookies (~55%), and it can say
 * someone went from page A to page B but not WHICH link they used — the Lab nudge,
 * the nav item and the announcement bar all look the same. This posts one event per
 * page view and per link click to our own lab app (/api/track), which stores them
 * for querying (whiskyblender-lab/scripts/site-events.mjs). Each click is also sent
 * to GA4 as `wb_link_click` for anyone who has consented.
 *
 * Anonymous by construction: no cookie, no storage, no visitor ID — so events can't
 * be joined into one person's journey. That's why a view carries `entry` (this page
 * started the visit) and the campaign tags, and why a click carries the page it
 * happened on: "landed on X and clicked Y there" is answerable without an ID.
 *
 * Naming a link: add data-wb-track="name" to the link or any ancestor. Untagged
 * links fall back to their Shopify section's name (header, announcement-bar, ...).
 */
(function () {
  'use strict';

  if (window.__wbTrackLoaded) return;
  window.__wbTrackLoaded = true;
  if (navigator.webdriver) return; /* bots inflate everything; the server filters by UA too */

  var ENDPOINT = 'https://lab.whiskyblender.com/api/track';
  var MAX_EVENTS = 50; /* per page load — a runaway page can't flood the log */
  var sent = 0;
  var host = location.host;

  /* Account pages carry order numbers in the path; collapse them. */
  function cleanPath(p) {
    if (/^\/account(\/|$)/.test(p)) return '/account';
    return p.slice(0, 255);
  }

  var path = cleanPath(location.pathname);

  function send(data) {
    if (sent >= MAX_EVENTS) return;
    sent++;
    data.path = path;
    try {
      var body = JSON.stringify(data);
      /* text/plain is a CORS-safe type: no preflight, and sendBeacon survives the
         page unloading — which is exactly when a click event is sent. */
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
      fetch(ENDPOINT, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
    } catch (e) {}
  }

  /* ── Page view ── */
  var view = { type: 'view', entry: true, ref: '' };
  try {
    if (document.referrer) {
      var r = new URL(document.referrer);
      if (r.host === host) {
        view.ref = cleanPath(r.pathname);
        view.entry = false;
      } else {
        view.ref = r.host; /* host only: an external referrer's path can carry anything */
      }
    }
  } catch (e) {}

  if (view.entry) {
    try {
      var q = new URLSearchParams(location.search);
      view.utmSource = q.get('utm_source') || '';
      view.utmMedium = q.get('utm_medium') || '';
      view.utmCampaign = q.get('utm_campaign') || '';
      /* Which ad network, from the presence of its click ID. The ID is never sent. */
      if (q.has('fbclid')) view.adClick = 'meta';
      else if (q.has('gclid') || q.has('gbraid') || q.has('wbraid')) view.adClick = 'google';
      else if (q.has('msclkid')) view.adClick = 'microsoft';
      else if (q.has('ttclid')) view.adClick = 'tiktok';
    } catch (e) {}
  }

  send(view);

  /* ── Link clicks ── */
  function areaFor(el) {
    var tagged = el.closest('[data-wb-track]');
    if (tagged) return tagged.getAttribute('data-wb-track');
    var section = el.closest('.shopify-section');
    if (section && section.id) {
      /* shopify-section-template--26141750460681__main_landing → main_landing
         shopify-section-sections--26141750525961__header       → header */
      return section.id
        .replace(/^shopify-section-/, '')
        .replace(/^(template|sections)--\d+__/, '');
    }
    return el.closest('header') ? 'header' : el.closest('footer') ? 'footer' : 'page';
  }

  function hrefFor(a) {
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#' || /^javascript:/i.test(raw)) return '';
    try {
      var u = new URL(a.href, location.href);
      if (u.host === host) return cleanPath(u.pathname);
      if (u.protocol === 'mailto:' || u.protocol === 'tel:') return u.protocol.replace(':', '');
      return (u.host + u.pathname).slice(0, 255);
    } catch (e) {
      return '';
    }
  }

  /* Capture phase on document, so a handler that stops propagation can't hide a click. */
  document.addEventListener('click', function (e) {
    try {
      var target = e.target;
      if (!target || !target.closest) return;
      var a = target.closest('a[href], [data-wb-track]');
      if (!a) return;
      /* A tagged wrapper with no link inside the click is just a container. */
      if (a.tagName !== 'A' && !target.closest('a[href], button')) return;
      if (a.tagName !== 'A') a = target.closest('a[href], button') || a;

      var area = areaFor(a);
      var href = a.tagName === 'A' ? hrefFor(a) : '';
      var label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);

      send({ type: 'click', area: area, href: href, label: label });

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'wb_link_click', { link_area: area, link_url: href, link_text: label });
      }
    } catch (err) {}
  }, true);
})();
