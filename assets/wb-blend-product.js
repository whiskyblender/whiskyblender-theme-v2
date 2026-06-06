/**
 * WB Blend Product — loads blend data on product pages reached via ?blend=<slug>
 *
 * With ?blend=: fetches blend from app API, renders recipe bar chart, pre-fills
 * "Label text" and "Created by" inputs, injects hidden _blend_* cart properties.
 *
 * Without ?blend=: hides the buy form and shows the no-blend options panel.
 *
 * Recipe bar chart: each <li> has a coloured background (inline style from API colour)
 * with a light overlay bar (.wb-recipebar) positioned left: X% — the colour shows
 * through from 0 to X%, masking the rest. X = (item% / max%) * 100.
 */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────────────── */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  /* ── Recipe bar chart ────────────────────────────────────────────── */

  function renderRecipe(blend, labUrl) {
    var recipeEl = document.getElementById('wb-blend-recipe');
    if (!recipeEl) return;

    var recipe  = Array.isArray(blend.recipe) ? blend.recipe : [];
    var maxAmt  = recipe.reduce(function (m, i) { return Math.max(m, i.amount || 0); }, 0);

    var rows = recipe
      .filter(function (i) { return i.amount > 0; })
      .map(function (item) {
        var barLeft = maxAmt > 0 ? ((item.amount / maxAmt) * 100).toFixed(1) + '%' : '0%';
        return (
          '<li style="background-color:' + esc(item.colour || '#cccccc') + '">' +
            '<span class="wb-label">' + esc(String(item.amount)) + '% ' + esc(item.name) + '</span>' +
            '<span class="wb-recipebar" style="left:' + barLeft + '"></span>' +
          '</li>'
        );
      })
      .join('');

    var changeHref = labUrl
      ? labUrl + '?blend=' + encodeURIComponent(blend.slug)
      : '#';

    recipeEl.innerHTML =
      '<p class="wb-blend-ref">' +
        'Blend code: ' + esc(blend.slug) +
        ' <a href="' + esc(changeHref) + '">(Change)</a>' +
      '</p>' +
      '<ul class="wb-recipe">' + rows + '</ul>';

    show(recipeEl);
  }

  /* ── Pre-fill visible inputs ─────────────────────────────────────── */

  function populateInputs(blend) {
    var labelInput  = document.getElementById('label-text');
    var authorInput = document.getElementById('created-by');

    if (labelInput  && !labelInput.value)  labelInput.value  = blend.title  || '';
    if (authorInput && !authorInput.value) authorInput.value = blend.author || '';
  }

  /* ── Hidden cart properties ──────────────────────────────────────── */

  function injectCartProperties(blend, variantsJson, labelPage, bottleSize) {
    /* Two forms share action="/cart/add" — the main product form and an
       installment/BNPL form. Skip the installment one explicitly. */
    var form = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    if (!form) return;

    form.addEventListener('formdata', function (e) {
      var variantTitle = '';
      try {
        var variants = JSON.parse(variantsJson || '[]');
        var idInput  = form.querySelector('[name="id"]');
        if (idInput) {
          var selected = variants.find(function (v) { return String(v.id) === String(idInput.value); });
          if (selected) variantTitle = selected.title;
        }
      } catch (err) { /* ignore */ }

      var labelText  = (document.getElementById('label-text') || {}).value || '';
      var authorText = (document.getElementById('created-by') || {}).value || '';

      var labelUrl = window.location.origin + (labelPage || '/pages/label') +
        '?blend='   + encodeURIComponent(blend.slug) +
        '&product=customblend' +
        '&variant=' + encodeURIComponent(variantTitle) +
        '&text='    + encodeURIComponent(labelText) +
        '&author='  + encodeURIComponent(authorText) +
        (bottleSize ? '&size=' + encodeURIComponent(bottleSize) : '');

      e.formData.set('properties[_blend_slug]',   blend.slug);
      e.formData.set('properties[_blend_title]',  blend.title);
      e.formData.set('properties[_blend_author]', blend.author);
      e.formData.set('properties[_blend_url]',    labelUrl);
    });

  }

  /* ── No-blend state ──────────────────────────────────────────────── */

  function showNoBlendState(failedSlug) {
    hide(document.querySelector('[name="add"]'));
    hide(document.querySelector('.product-form__quantity'));

    var panel = document.getElementById('wb-noblend-panel');
    if (panel) show(panel);

    if (failedSlug) {
      var codeInput = document.getElementById('wb-blend-code-input');
      var codeBtn   = document.getElementById('wb-blend-code-go');
      if (codeInput) codeInput.value = failedSlug;
      if (codeBtn)   codeBtn.disabled = failedSlug.length < 6;
    }

    initCodeEntry();
  }

  /* ── Blend code entry ────────────────────────────────────────────── */

  function initCodeEntry() {
    var codeInput = document.getElementById('wb-blend-code-input');
    var codeBtn   = document.getElementById('wb-blend-code-go');
    if (!codeInput || !codeBtn) return;

    codeInput.addEventListener('input', function () {
      codeBtn.disabled = codeInput.value.trim().length < 6;
    });

    function submit() {
      var code = codeInput.value.trim().toUpperCase();
      if (code.length >= 6) {
        window.location.href = window.location.pathname + '?blend=' + encodeURIComponent(code);
      }
    }

    codeBtn.addEventListener('click', submit);
    codeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
  }

  /* ── Error ───────────────────────────────────────────────────────── */

  function showError(html) {
    var el = document.getElementById('wb-blend-error');
    if (el) { el.innerHTML = html; show(el); }
  }

  /* ── Carry blend code through product link clicks ───────────────── */

  function patchProductLinks(slug) {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.indexOf('/products/') === -1) return;
      if (href.indexOf('blend=') !== -1) return;
      e.preventDefault();
      var sep = href.indexOf('?') !== -1 ? '&' : '?';
      window.location.href = href + sep + 'blend=' + encodeURIComponent(slug);
    });
  }

  /* ── Init ────────────────────────────────────────────────────────── */

  function init() {
    var container = document.getElementById('wb-blend-product-loader');
    if (!container) return;

    var apiBase      = (container.getAttribute('data-api-base') || '').replace(/\/$/, '');
    var labUrl       = container.getAttribute('data-lab-url')   || '';
    var labelPage    = container.getAttribute('data-label-page')|| '/pages/label';
    var bottleSize   = container.getAttribute('data-bottle-size') || '';
    var variantsEl   = document.getElementById('wb-variants-data');
    var variantsJson = variantsEl ? variantsEl.textContent : '[]';
    var slug         = new URLSearchParams(window.location.search).get('blend');

    if (!slug) {
      showNoBlendState();
      return;
    }

    patchProductLinks(slug);

    var loadingEl = document.getElementById('wb-blend-loading');
    show(loadingEl);

    fetch(apiBase + '/api/blend?slug=' + encodeURIComponent(slug))
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        hide(loadingEl);

        if (!result.ok) {
          showNoBlendState(slug);
          showError('We can’t find that blend. Either your code is wrong or it’s an old one, sorry. Check it and try again, or <a href="/pages/the-lab">create a new one</a>.');
          return;
        }

        renderRecipe(result.data, labUrl);
        populateInputs(result.data);
        injectCartProperties(result.data, variantsJson, labelPage, bottleSize);
      })
      .catch(function () {
        hide(loadingEl);
        showNoBlendState(slug);
        showError('We can't find that blend. Either your code is wrong or it's an old one, sorry. Check it and try again, or <a href="/pages/the-lab">create a new one</a>.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
