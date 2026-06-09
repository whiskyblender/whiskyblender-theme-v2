/**
 * wb-single-malt.js — personalised single malt product page
 *
 * 1. Requires at least 1 character in label text before allowing add to cart.
 * 2. Shows an inline label preview below the label text input.
 * 3. Injects a hidden _label_url cart property on form submission.
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
    var cdn          = loader.getAttribute('data-cdn') || '';
    var av           = loader.getAttribute('data-av') || '1';
    var barsUrl      = loader.getAttribute('data-bars-url') || '';
    var cropsUrl     = loader.getAttribute('data-crops-url') || '';
    var variantsEl   = document.getElementById('wb-sm-variants-data');
    var variantsJson = variantsEl ? variantsEl.textContent : '[]';

    var form = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    if (!form) return;

    var labelInput = document.getElementById('label-text');
    var addBtn     = form.querySelector('[name="add"]');

    /* ── Add to cart guard ──────────────────────────────────────────────── */

    if (labelInput && addBtn) {
      var btnSpan     = addBtn.querySelector('span');
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

    /* ── Preview utilities ──────────────────────────────────────────────── */

    var PREVIEW_PAGE_W = 794;
    var PREVIEW_CROP_H = 560;

    var PREVIEW_D = {
      sideLabelTop: 184, sideLabelLeft: 142,
      panelLength: 232, panelTop: 4,
      tallFont: 14, domainFont: 9,
    };

    function prevEsc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function prevSlugify(s) {
      return String(s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    function prevWordWrap(s) {
      return String(s || '').split(' ').map(function (w) {
        if (w.length > 14) {
          var out = '';
          for (var i = 0; i < w.length; i += 14) out += w.slice(i, i + 14) + ' ';
          return out.trim();
        }
        return w;
      }).join(' ');
    }

    function prevZigzag(w, h, step, depth) {
      var count = Math.ceil(w / step), pts = [];
      for (var i = 0; i <= count; i++) {
        var x = Math.min(i * step, w);
        pts.push(x + 'px ' + (i % 2 === 0 ? 0 : depth) + 'px');
      }
      pts.push(w + 'px ' + h + 'px');
      pts.push('0px ' + h + 'px');
      return 'polygon(' + pts.join(', ') + ')';
    }

    function prevResizeText(el) {
      var min = 18, max = 52, step = 0.5;
      var parent = el.parentNode;
      var maxH = parent.clientHeight || 80;
      var maxW = parent.clientWidth  || 90;
      var i = min, overflow = false;
      while (!overflow && i < max) {
        el.style.fontSize   = i + 'px';
        el.style.lineHeight = (i * 0.74) + 'px';
        /* Check child's natural dimensions — more reliable than parent.scrollHeight
           with display:grid + overflow:hidden (grid clips but scrollHeight stays == clientHeight) */
        overflow = el.scrollHeight > maxH || el.scrollWidth > maxW;
        if (!overflow) i += step;
      }
      var final = Math.max(min, i - step - 1);
      el.style.fontSize   = final + 'px';
      el.style.lineHeight = (final * 0.74) + 'px';
    }

    function getCurrentVariantTitle() {
      try {
        var variants = JSON.parse(variantsJson || '[]');
        var idInput = form.querySelector('input[name="id"]');
        if (idInput) {
          var v = variants.find(function (x) { return String(x.id) === String(idInput.value); });
          if (v) return v.title;
        }
      } catch (e) {}
      return 'Standard';
    }

    /* ── Preview state ──────────────────────────────────────────────────── */

    var previewWrap      = null;
    var previewContainer = null;
    var previewDebounce  = null;

    function renderPreviewLabel() {
      if (!previewContainer) return;
      var d = PREVIEW_D;

      var pageEl = previewContainer.querySelector('.wbp-page');
      if (pageEl) {
        pageEl.className = 'wbp-page size50 ' + productSlug;
        if (barsUrl) pageEl.style.backgroundImage = 'url(' + barsUrl + ')';
      }

      var cropsEl = previewContainer.querySelector('.wbp-crops');
      if (cropsEl) {
        cropsEl.style.cssText = [
          'display:block',
          'position:absolute',
          'top:0',
          'left:0',
          'width:794px',
          'height:560px',
          'pointer-events:none',
          'z-index:10',
          cropsUrl ? 'background-image:url(' + cropsUrl + ')' : '',
          'background-position:center center',
          'background-repeat:no-repeat',
          'background-size:auto',
        ].filter(Boolean).join(';');
      }

      var artworkEl = previewContainer.querySelector('.wbp-image');
      if (artworkEl) {
        var variantSlug = prevSlugify(getCurrentVariantTitle());
        var artworkProduct = productSlug === 'singlecask' ? 'singlemalt' : productSlug;
        var artworkUrl = cdn + 'wb-' + artworkProduct + '-' + variantSlug + '-500ml.jpg?v=' + av;
        artworkEl.style.cssText = [
          'display:block',
          'position:absolute',
          'top:4px',
          'left:-9px',
          'width:570px',
          'height:232px',
          'background-image:url(' + artworkUrl + ')',
          'background-size:cover',
          'background-position:center center',
          'z-index:1',
        ].join(';');
      }

      var text = labelInput ? labelInput.value : '';
      var blendNameEl = previewContainer.querySelector('.wbp-blend-name');
      if (blendNameEl) {
        blendNameEl.innerHTML = prevEsc(prevWordWrap(text));
        blendNameEl.style.color = '#ffffff';
        blendNameEl.style.textShadow = '1px 1px #000000';
        document.fonts.ready.then(function () { prevResizeText(blendNameEl); });
      }

      var sideNameEl = previewContainer.querySelector('.wbp-side-name');
      if (sideNameEl) {
        sideNameEl.textContent = distillery;
        sideNameEl.style.color = '#ffffff';
        sideNameEl.style.textShadow = '1px 1px #000000';
      }

      var sideLabelEl = previewContainer.querySelector('.wbp-side-label');
      if (sideLabelEl) {
        sideLabelEl.textContent = 'Distilled at';
        sideLabelEl.style.color = '#ffffff';
        sideLabelEl.style.textShadow = '1px 1px #000000';
        sideLabelEl.style.top  = d.sideLabelTop + 'px';
        sideLabelEl.style.left = d.sideLabelLeft + 'px';
      }

      /* Side info panel */
      previewContainer.querySelectorAll('.wbp-side-panel').forEach(function (el) {
        el.parentNode.removeChild(el);
      });
      var labelEl = previewContainer.querySelector('.wbp-label');
      if (labelEl) {
        var s = d.panelLength / 232;
        var pad = Math.round(10 * s) + 'px ' + Math.round(16 * s) + 'px ' + Math.round(17 * s) + 'px';
        var info = document.createElement('div');
        info.className = 'wbp-side-panel';
        info.style.cssText = [
          'box-sizing:border-box',
          'position:absolute',
          'top:' + d.panelTop + 'px',
          'left:47px',
          'width:' + d.panelLength + 'px',
          'height:56px',
          'transform:rotate(90deg)',
          'transform-origin:left top',
          'clip-path:' + prevZigzag(d.panelLength, 56, 8, 5),
          'background-color:#ffffff',
          'color:#111111',
          'text-shadow:none',
          'display:grid',
          'grid-template-columns:1fr 1fr 1fr',
          'align-items:center',
          'padding:' + pad,
          'z-index:2',
        ].join(';');
        var tall = 'font-family:Antonio,sans-serif;font-weight:300;font-size:' + d.tallFont + 'px;text-transform:uppercase;letter-spacing:-0.5px';
        info.innerHTML =
          '<span style="' + tall + '">46% abv</span>' +
          '<span style="font-size:' + d.domainFont + 'px;font-weight:700;text-align:center;letter-spacing:0.4px;font-family:Raleway,sans-serif">whiskyblender.com</span>' +
          '<span style="' + tall + ';text-align:right">500ml &#8467;</span>';
        labelEl.appendChild(info);
      }
    }

    function scalePreview() {
      if (!previewWrap || !previewContainer) return;
      var w = previewWrap.offsetWidth;
      if (!w) return;
      var scale = w / PREVIEW_PAGE_W;
      previewContainer.style.transform = 'scale(' + scale + ')';
      previewContainer.style.transformOrigin = 'top left';
      previewWrap.style.height = Math.round(PREVIEW_CROP_H * scale) + 'px';
    }

    function initPreview() {
      if (previewContainer) return;

      previewWrap = document.createElement('div');
      previewWrap.id = 'wb-label-preview-wrap';

      var heading = document.createElement('p');
      heading.className = 'wb-preview-heading';
      heading.textContent = 'Your label';
      previewWrap.appendChild(heading);

      previewContainer = document.createElement('div');
      previewContainer.className = 'wbp-scale-wrap';
      previewContainer.innerHTML =
        '<div class="wbp-page size50 ' + productSlug + '">' +
          '<div class="wbp-label-area">' +
            '<div class="wbp-crops"></div>' +
            '<div class="wbp-label">' +
              '<div class="wbp-outer"><div class="wbp-blend-name"></div></div>' +
              '<div class="wbp-side"><div class="wbp-side-name"></div></div>' +
              '<div class="wbp-side-label"></div>' +
              '<div class="wbp-image"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      previewWrap.appendChild(previewContainer);

      var loaderEl = document.getElementById('wb-single-malt-loader');
      var isPreviewTest = loaderEl && loaderEl.dataset.template === 'product.preview-test';
      var mediaGallery = isPreviewTest && document.querySelector('media-gallery');
      if (mediaGallery) {
        mediaGallery.appendChild(previewWrap);
      } else {
        var anchor = labelInput ? (labelInput.closest('.wb-bottle-form') || form) : form;
        anchor.insertAdjacentElement('afterend', previewWrap);
      }

      renderPreviewLabel();
      scalePreview();
      window.addEventListener('resize', scalePreview);
    }

    /* ── Input + variant listeners ──────────────────────────────────────── */

    if (labelInput) {
      labelInput.addEventListener('input', function () {
        if (!previewContainer && labelInput.value.trim().length > 0) initPreview();
        clearTimeout(previewDebounce);
        previewDebounce = setTimeout(renderPreviewLabel, 200);
      });
    }

    var variantIdInput = form.querySelector('input[name="id"]');
    if (variantIdInput) {
      variantIdInput.addEventListener('change', function () {
        renderPreviewLabel();
      });
    }

    /* ── Cart property injection ────────────────────────────────────────── */

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
      } catch (err) {}

      var labelText = ((document.getElementById('label-text') || {}).value || '').slice(0, 32);

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
