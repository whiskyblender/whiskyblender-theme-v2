/**
 * wb-price-format.js — tidies rendered prices, without changing any value.
 *
 * Two display-only transforms, applied to the text of known price elements:
 *   1. Drop the decimals when a price is whole:  £120.00 → £120  (keeps £19.99).
 *   2. Hide the ISO currency code only where the symbol is unambiguous
 *      (£ GBP, € EUR); keep it where the symbol is shared ($ = USD / AUD / …):
 *          £120.00 GBP → £120         $108.00 USD → $108 USD
 *
 * Safety:
 *   - Only text INSIDE the curated price selectors below is touched, and only
 *     text that contains a currency symbol — so prose like "3.00pm" or a "GBP"
 *     mention in copy is never altered.
 *   - It edits the RENDERED string, never a price value. If this script fails to
 *     run, the full correct price (e.g. "£120.00 GBP") still shows — the fallback
 *     is always correct, never wrong.
 *   - The zero-decimal strip only removes a decimal separator followed by exactly
 *     two zeros at the END of a number (before a non-digit), so it is safe for
 *     both "1,234.00" and the European "1.234,00" (and never turns €1.005,00 into
 *     €15).
 *
 * Currency for the current market comes from Shopify.currency.active, refreshed
 * on every page load (switching market reloads the page).
 */
(function () {
  'use strict';

  /* Currencies whose symbol is unique enough to drop the code. Everything else
     (USD, AUD, CAD, NZD, … — all "$") keeps its code so the amount is unambiguous.
     Add JPY etc. here only if you're sure the symbol can't be confused. */
  var HIDE_CODE_FOR = ['GBP', 'EUR'];

  /* Elements that contain ONLY a money string (or, for wb-meta-deetz, a list where
     just one item is money). Text nodes elsewhere are never touched. */
  var SCOPES = [
    '.price-item',
    '.totals__total-value',
    '.cart-item__price-wrapper',
    '.wb-meta-deetz',
    'volume-pricing',
    '.unit-price'
  ].join(',');

  function activeCurrency() {
    try {
      return (window.Shopify && Shopify.currency && Shopify.currency.active) || '';
    } catch (e) {
      return '';
    }
  }

  function cleanText(text, currency) {
    var out = text;
    /* 1. Hide the ISO code for unambiguous currencies (word-boundary so it can't
          eat part of another word; \s also matches the non-breaking space Shopify
          may put before the code). */
    if (currency && HIDE_CODE_FOR.indexOf(currency) !== -1) {
      out = out.replace(new RegExp('\\s*' + currency + '\\b', 'g'), '');
    }
    /* 2. Drop a trailing ".00" / ",00" (the whole-number case). The lookahead keeps
          it from matching zeros inside a number, e.g. the ",00" in "1,005". */
    out = out.replace(/([.,])0{2}(?=\D|$)/g, '');
    return out;
  }

  function processScope(root, currency) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var v = node.nodeValue;
      if (!v || !/[£$€¥]/.test(v)) continue; // only touch text that carries a symbol
      var cleaned = cleanText(v, currency);
      if (cleaned !== v) node.nodeValue = cleaned; // characterData change only — see observer note
    }
  }

  function sweep() {
    var currency = activeCurrency();
    var els = document.querySelectorAll(SCOPES);
    for (var i = 0; i < els.length; i++) processScope(els[i], currency);
  }

  /* Re-run after Shopify re-renders prices (variant switch, cart update, filtered
     collection). We observe childList only: our own edits are characterData, so
     they never re-trigger the observer — no loop, no disconnect needed. Debounced
     so a burst of inserted nodes coalesces into one sweep. */
  var pending = null;
  function schedule() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; sweep(); }, 50);
  }

  function init() {
    sweep();
    if (!window.MutationObserver || !document.body) return;
    try {
      new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
