/**
 * wb-single-malt.js — cart property injection for personalised single malt product pages
 *
 * Injects a hidden `_label_url` cart property on form submission, constructed from:
 *   - product title (distillery name, e.g. "Aultmore 2011")
 *   - selected variant title (label style, e.g. "Birthday")
 *   - label text input value (user's personalisation)
 *
 * URL format:
 *   /pages/label?type=single-malt&distillery=<product_title>&variant=<variant_title>&text=<label_text>
 */
(function () {
  'use strict';

  function init() {
    var loader = document.getElementById('wb-single-malt-loader');
    if (!loader) return;

    var productTitle = loader.getAttribute('data-product-title') || '';
    var labelPage    = loader.getAttribute('data-label-page') || '/pages/label';
    var variantsEl   = document.getElementById('wb-sm-variants-data');
    var variantsJson = variantsEl ? variantsEl.textContent : '[]';

    var form = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    if (!form) return;

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
        '?type=single-malt' +
        '&distillery=' + encodeURIComponent(productTitle) +
        '&variant='    + encodeURIComponent(variantTitle) +
        '&text='       + encodeURIComponent(labelText);

      e.formData.set('properties[_label_url]', labelUrl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
