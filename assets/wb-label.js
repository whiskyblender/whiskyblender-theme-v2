/**
 * wb-label.js — print label page for Whisky Blender custom blends
 *
 * URL params:
 *   blend    — blend slug (WBxxxxxx), used to fetch recipe from the Lab API
 *   variant  — Shopify variant title (e.g. "Standard", "Style 1")
 *   text     — label text (whisky name)
 *   author   — created by
 */
(function () {
  'use strict';

  /* ── Variant → artwork + colour mapping ─────────────────────────────────── */

  function buildVariantMap(root) {
    return {
      'Standard': {
        image: null,
        color: 'colorblack',
      },
      'Style 1': {
        image: root.getAttribute('data-artwork-style1') || '',
        color: 'colorblack',
      },
    };
  }

  /* ── Auto-resize text to fill container ─────────────────────────────────── */

  function resizeText(elements, min, max, step) {
    min  = min  || 18;
    max  = max  || 52;
    step = step || 0.5;

    var isOverflown = function (el) {
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    };

    elements.forEach(function (el) {
      var parent   = el.parentNode;
      var i        = min;
      var overflow = false;

      while (!overflow && i < max) {
        el.style.fontSize   = i + 'px';
        el.style.lineHeight = (i * 0.74) + 'px';
        overflow = isOverflown(parent);
        if (!overflow) i += step;
      }

      el.style.fontSize   = (i - step - 1) + 'px';
      el.style.lineHeight = ((i - step - 1) * 0.74) + 'px';
    });
  }

  /* ── Insert soft breaks in long words ───────────────────────────────────── */

  function insertSpaceForLongWords(str) {
    return String(str).split(' ').map(function (word) {
      if (word.length > 14) {
        var out = '';
        for (var i = 0; i < word.length; i += 14) {
          out += word.slice(i, i + 14) + ' ';
        }
        return out.trim();
      }
      return word;
    }).join(' ');
  }

  /* ── Recipe panel ────────────────────────────────────────────────────────── */

  function showRecipe(recipe) {
    var list    = document.getElementById('wb-recipe-list');
    var loading = document.getElementById('wb-recipe-loading');
    if (!list) return;

    if (loading) loading.style.display = 'none';

    var items = Array.isArray(recipe) ? recipe.filter(function (i) { return i.amount > 0; }) : [];

    if (items.length === 0) {
      list.style.display = 'none';
      return;
    }

    list.innerHTML = items.map(function (item) {
      return '<li>' +
        '<span class="wb-recipe-swatch" style="background:' + esc(item.colour || '#ccc') + '"></span>' +
        '<span class="wb-recipe-pct">' + esc(String(item.amount)) + '%</span>' +
        '<span class="wb-recipe-name">' + esc(item.name) + '</span>' +
      '</li>';
    }).join('');

    list.style.display = 'flex';
  }

  function showRecipeError(msg) {
    var loading = document.getElementById('wb-recipe-loading');
    var error   = document.getElementById('wb-recipe-error');
    if (loading) loading.style.display = 'none';
    if (error)   { error.textContent = msg; error.style.display = ''; }
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */

  function init() {
    var root = document.getElementById('wb-label-root');
    if (!root) return;

    var params      = new URLSearchParams(window.location.search);
    var type        = params.get(‘type’)    || ‘’;
    var slug        = params.get(‘blend’)   || ‘’;
    var variantName = params.get(‘variant’) || ‘Standard’;
    var text        = params.get(‘text’)    || ‘’;
    var author      = params.get(‘author’)  || ‘’;
    var distillery  = params.get(‘distillery’) || ‘’;
    var apiBase     = (root.getAttribute(‘data-api-base’) || ‘’).replace(/\/$/, ‘’);

    var VARIANTS    = buildVariantMap(root);
    var variantData = VARIANTS[variantName] || VARIANTS[‘Standard’];

    var page       = document.getElementById(‘page’);
    var label      = document.getElementById(‘label’);
    var blendNameEl = document.getElementById(‘blendName’);
    var createdByEl = document.getElementById(‘createdBy’);
    var referenceEl = document.getElementById(‘reference’);
    var imageEl    = label ? label.querySelector(‘.image’) : null;

    /* ── Apply size class (200ml for now, extend later via URL param) ── */
    if (page) page.classList.add(‘size20’);

    /* ── Apply colour class + artwork (shared by both types) ── */
    if (label) label.classList.add(variantData.color);
    if (imageEl && variantData.image) {
      imageEl.style.backgroundImage = ‘url(‘ + variantData.image + ‘)’;
    }

    /* ── Resize text after fonts load (shared) ── */
    document.fonts.ready.then(function () {
      resizeText(Array.prototype.slice.call(document.querySelectorAll(‘#blendName’)));
    });

    /* ── Single malt branch ── */
    if (type === ‘single-malt’) {
      if (blendNameEl) blendNameEl.innerHTML = esc(insertSpaceForLongWords(text || ‘’));
      if (createdByEl) createdByEl.textContent = ‘’;
      if (referenceEl) referenceEl.textContent = distillery;

      var recipePanel = document.getElementById(‘wb-recipe-panel’);
      if (recipePanel) recipePanel.style.display = ‘none’;
      return;
    }

    /* ── Blend branch ── */
    if (blendNameEl) blendNameEl.innerHTML = esc(insertSpaceForLongWords(text || slug));
    if (createdByEl) createdByEl.textContent = author;
    if (referenceEl) referenceEl.textContent = slug;

    if (!slug) {
      showRecipeError(‘No blend code provided.’);
      return;
    }

    fetch(apiBase + ‘/api/blend?slug=’ + encodeURIComponent(slug))
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          showRecipeError(‘Blend ‘’ + slug + ‘’ not found.’);
          return;
        }
        showRecipe(result.data.recipe);
      })
      .catch(function () {
        showRecipeError(‘Could not load recipe. Check your connection.’);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
