/**
 * wb-single-malt.js — cart property injection for personalised single malt product pages
 *
 * Injects a hidden `_label_url` cart property on form submission, constructed from:
 *   - product slug (singlemalt or singlecask, from data-product-slug)
 *   - distillery name (from custom.distilled metafield via data-distillery)
 *   - selected variant title (label style, e.g. "Birthday")
 *   - label text input value (user's personalisation)
 *
 * URL format:
 *   /pages/label?product=singlemalt&distillery=<distillery>&variant=<variant_title>&text=<label_text>
 */
(function () {
  'use strict';

  function init() {
    var loader = document.getElementById('wb-single-malt-loader');
    if (!loader) return;

    var productSlug  = loader.getAttribute('data-product-slug') || 'singlemalt';
    var distillery   = loader.getAttribute('data-distillery') || loader.getAttribute('data-product-title') || '';
    var bottleSize   = loader.getAttribute('data-bottle-size') || '';
    var labelPage    = loader.getAttribute('data-label-page') || '/pages/label';
    var variantsEl   = document.getElementById('wb-sm-variants-data');
    var variantsJson = variantsEl ? variantsEl.textContent : '[]';

    var form = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    if (!form) return;

    /* Require at least 1 character in label text before allowing add to cart */
    var labelInput = document.getElementById('label-text');
    var addBtn     = form.querySelector('[name="add"]');
    if (labelInput && addBtn) {
      var btnSpan    = addBtn.querySelector('span');
      var defaultText = btnSpan ? btnSpan.textContent.trim() : '';
      function syncBtn() {
        var hasText = labelInput.value.trim().length > 0;
        addBtn.disabled = !hasText;
        addBtn.classList.toggle('wb-button-disabled', !hasText);
        if (btnSpan) btnSpan.textContent = hasText ? defaultText : 'Fill in label';
      }
      syncBtn();
      labelInput.addEventListener('input', syncBtn);
    }

    form.addEventListener('formdata', function (e) {
      var variantTitle = '';
      try {
        var variants = JSON.parse(variantsJson || '[]');
        var idInput  = form.querySelector('[name="id"]');
        if (idInput) {
          var selected = variants.find(function (v) {
            return String(v.id) === String(idInput.value);
          });
          if (selected) variantTitle = selected.title;
        }
      } catch (err) { /* ignore */ }

      var labelText = (document.getElementById('label-text') || {}).value || '';

      var labelUrl = window.location.origin + labelPage +
        '?product='    + encodeURIComponent(productSlug) +
        '&distillery=' + encodeURIComponent(distillery) +
        '&variant='    + encodeURIComponent(variantTitle) +
        '&text='       + encodeURIComponent(labelText) +
        (bottleSize ? '&size=' + encodeURIComponent(bottleSize) : '');

      e.formData.set('properties[_label_url]', labelUrl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
