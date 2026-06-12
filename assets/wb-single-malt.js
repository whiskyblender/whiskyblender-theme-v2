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

    var labelInput     = document.getElementById('label-text');
    var createdByInput = document.getElementById('created-by');
    var addBtn         = form.querySelector('[name="add"]');

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

    /* ── Character counter ──────────────────────────────────────────────── */

    function addCounter(input, max) {
      var counter = document.createElement('span');
      counter.className = 'wb-char-counter';
      function update() {
        var left = max - [...input.value].length;
        counter.textContent = left + ' left';
        counter.classList.toggle('wb-char-counter--low', left < 5);
      }
      update();
      input.addEventListener('input', update);
      input.parentNode.appendChild(counter);
    }

    if (labelInput) addCounter(labelInput, 32);

    /* ── Preview utilities ──────────────────────────────────────────────── */

    var PREVIEW_PAGE_W  = 794;
    var PREVIEW_PAGE_H  = 432;
    var PREVIEW_CROP_H  = 560;
    var PREVIEW_LABEL_W = 552;
    var PREVIEW_LABEL_H = 303;
    var PREVIEW_LABEL_X = (PREVIEW_PAGE_W - PREVIEW_LABEL_W) / 2; // 121px from page left
    var PREVIEW_LABEL_Y = 128; // px from page top
    // vertical offset to centre label in page: page centre - label centre
    var PREVIEW_CENTER_TY = (PREVIEW_PAGE_H / 2) - (PREVIEW_LABEL_Y + PREVIEW_LABEL_H / 2); // -63.5

    var PREVIEW_D = {
      sideLabelTop: 184, sideLabelLeft: 142,
      panelLength: 232, panelTop: 4,
      tallFont: 14, domainFont: 9,
      scCaskLeft: 102, svgW: 202, svgH: 34,
    };

    var SINGLECASK_SVG_PATHS = '<path d="M.12,15.12l1.73-3.07.15.06c-.88,6.92,1.52,9.69,4.31,9.81,2.76.12,4.83-2.79,4.04-5.77C9.2,11.75.36,10.57.36,5.16.36,2.13,3.19,0,6.16,0,9.32,0,11.66,1.76,12.21,5.13l-1.52,3.07-.15-.06c.21-4.43-1.46-7.23-4.22-7.44-1.91-.15-4.52,1.21-3.98,4.46.7,4.16,10.05,5.65,10.05,11.3,0,4.19-3.49,6.16-6.13,6.16-3.43,0-6.95-2.61-6.13-7.5Z"/><path d="M13.03,22.01c.82-.39,1.43-1.24,1.43-2.58V3.19c0-1.09-.49-2.16-1.43-2.58v-.15h4.77v.15c-.97.43-1.43,1.49-1.43,2.58v16.25c0,1.34.67,2.19,1.43,2.58v.15h-4.77v-.15Z"/><path d="M19.28,22.01c.85-.46,1.37-1.37,1.37-2.58V3.19c0-1.25-.52-2.16-1.37-2.58v-.15h4.65v.15c-.85.43-1.37,1.34-1.37,2.58v2.64C23.69,1.97,25.69,0,28.36,0c3.8,0,5.77,3.13,6.13,7.29.27,3.28-.61,7.83-2.43,12.15-.46,1.06-.15,1.97.97,2.58v.15h-4.52v-.15c.39-.12,1-1.03,1.7-2.58,1.76-3.89,2.52-8.2,2.34-11.42-.21-3.8-1.03-7.29-4.19-7.32-4.28-.03-5.8,8.87-5.8,12.09v6.65c0,1.21.52,2.12,1.37,2.58v.15h-4.65v-.15Z"/><path d="M35.53,11.42C35.53,4.62,38.23,0,42.6,0c2,0,3.7.88,4.74,2.13l-.82,3.07-.15.06c-.42-3.13-2.12-4.56-3.76-4.56-3.07,0-4.46,4.98-4.92,8.53h12.66v.15c-.76.4-1.43,1.18-1.43,2.52v6.16c-1,2.73-2.79,4.55-5.98,4.55-4.65,0-7.41-4.49-7.41-11.2ZM46.98,16.85v-3.61c0-3.13-.7-3.25-6.13-3.25h-3.25c-.03.55-.06,1.06-.06,1.49,0,6.13,2.22,10.45,5.41,10.45,1.91,0,4.04-1.85,4.04-5.07Z"/><path d="M62.31,17.61l-1.73,4.55h-10.11v-.15c.82-.39,1.43-1.24,1.43-2.58V3.19c0-1.09-.49-2.16-1.43-2.58v-.15h4.77v.15c-.97.43-1.43,1.49-1.43,2.58v16.25c0,.39.06.76.15,1.06.3.64,1,.97,1.82.97,2.64,0,4.8-1,6.32-3.92l.21.06Z"/><path d="M62.22,11.39C62.22,4.56,65.13,0,69.51,0c3.25,0,5.13,1.76,6.07,5.13l-1.52,3.07-.15-.06c.21-4.43-1.64-7.44-4.46-7.44-2.67,0-4.65,3.34-5.1,8.5h3.49c1.09,0,2.22-.49,2.64-1.43h.15v3.64h-.15c-.43-.97-1.55-1.4-2.64-1.4h-3.55c-.03.46-.06.91-.06,1.37-.06,6.32,2.07,10.54,5.28,10.54,2.82,0,4.68-3.01,4.46-7.44l.15-.06,1.52,3.07c-.94,3.37-2.82,5.13-6.07,5.13-4.43,0-7.35-4.49-7.35-11.23Z"/><path d="M81.78,11.39C81.78,4.56,84.69,0,89.06,0c3.25,0,5.13,1.76,6.07,5.13l-1.52,3.07-.15-.06c.21-4.43-1.64-7.44-4.46-7.44-3.04,0-5.16,4.28-5.22,10.69-.06,6.32,2.06,10.54,5.28,10.54,2.82,0,4.68-3.01,4.46-7.44l.15-.06,1.52,3.07c-.94,3.37-2.82,5.13-6.07,5.13-4.43,0-7.35-4.49-7.35-11.23Z"/><path d="M94.56,22.01c.39-.12,1.4-1.21,1.91-3.34l3.64-15.15c.24-1.73-.58-2.55-1.34-2.92v-.15h4.65l4.37,18.19c.52,2.13,1.52,3.25,1.91,3.37v.15h-5.16v-.15c.82-.39,1.73-1.34,1.25-3.34l-.91-3.83v.06h-6.47l-.88,3.77c-.49,2,.42,2.95,1.25,3.34v.15h-4.22v-.15ZM104.7,14.06l-3.04-12.75-3.04,12.75h6.07Z"/><path d="M109.13,15.12l1.73-3.07.15.06c-.88,6.92,1.52,9.69,4.31,9.81,2.76.12,4.83-2.79,4.04-5.77-1.15-4.4-9.99-5.59-9.99-10.99C109.38,2.13,112.2,0,115.18,0c3.16,0,5.5,1.76,6.04,5.13l-1.52,3.07-.15-.06c.21-4.43-1.46-7.23-4.22-7.44-1.91-.15-4.52,1.21-3.98,4.46.7,4.16,10.05,5.65,10.05,11.3,0,4.19-3.49,6.16-6.13,6.16-3.43,0-6.95-2.61-6.13-7.5Z"/><path d="M122.04,22.01c.82-.39,1.43-1.24,1.43-2.58V3.19c0-1.09-.49-2.16-1.43-2.58v-.15h4.77v.15c-.97.43-1.43,1.49-1.43,2.58v8.56l6.16-8.56c1.12-1.55-.18-2.55-.27-2.58v-.15h4.25v.15c-.21.09-1.31.61-2.46,2.16l-3.89,5.25,5.1,10.66c1,2.1,1.79,3.01,2.16,3.34v.15h-4.71v-.15c.76-.39,1.55-1.06.61-3.04l-4.4-9.26-2.55,3.46v6.26c0,1.34.61,2.19,1.37,2.58v.15h-4.71v-.15Z"/>';

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
    var previewCrop      = null;
    var previewContainer = null;
    var previewDebounce  = null;
    var previewDismissed = false;

    function renderPreviewLabel() {
      if (!previewContainer) return;
      var d = PREVIEW_D;
      var isBlend = productSlug === 'customblend';

      var pageEl = previewContainer.querySelector('.wbp-page');
      if (pageEl) {
        pageEl.className = 'wbp-page size50 ' + productSlug;
        if (barsUrl && !isBlend) pageEl.style.backgroundImage = 'url(' + barsUrl + ')';
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
        var artTop  = isBlend ? '-8px'  : '4px';
        var artLeft = isBlend ? '102px' : '-9px';
        var artW    = isBlend ? '458px' : '570px';
        var artH    = isBlend ? '244px' : '232px';
        artworkEl.style.cssText = [
          'display:block',
          'position:absolute',
          'top:'    + artTop,
          'left:'   + artLeft,
          'width:'  + artW,
          'height:' + artH,
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
        blendNameEl.style.color      = isBlend ? '#111111' : '#ffffff';
        blendNameEl.style.textShadow = isBlend ? '1px 1px #ffffff' : '1px 1px #000000';
        document.fonts.ready.then(function () { prevResizeText(blendNameEl); });
      }

      var sideNameEl = previewContainer.querySelector('.wbp-side-name');
      if (sideNameEl) {
        sideNameEl.textContent       = isBlend ? (createdByInput ? createdByInput.value : '') : distillery;
        sideNameEl.style.color       = isBlend ? '#111111' : '#ffffff';
        sideNameEl.style.textShadow  = isBlend ? '1px 1px #ffffff' : '1px 1px #000000';
      }

      var sideLabelEl = previewContainer.querySelector('.wbp-side-label');
      if (sideLabelEl) {
        if (isBlend) {
          sideLabelEl.style.display = 'none';
        } else {
          sideLabelEl.style.display    = '';
          sideLabelEl.textContent      = 'Distilled at';
          sideLabelEl.style.color      = '#ffffff';
          sideLabelEl.style.textShadow = '1px 1px #000000';
          sideLabelEl.style.top        = d.sideLabelTop + 'px';
          sideLabelEl.style.left       = d.sideLabelLeft + 'px';
        }
      }

      /* Side info panel — singlemalt/singlecask only */
      previewContainer.querySelectorAll('.wbp-side-panel').forEach(function (el) {
        el.parentNode.removeChild(el);
      });
      var labelEl = previewContainer.querySelector('.wbp-label');
      if (labelEl && !isBlend) {
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

        /* Single cask strip */
        if (productSlug === 'singlecask') {
          var sc = document.createElement('div');
          sc.className = 'wbp-side-panel';
          sc.style.cssText = [
            'box-sizing:border-box',
            'position:absolute',
            'top:' + d.panelTop + 'px',
            'left:' + d.scCaskLeft + 'px',
            'width:' + d.panelLength + 'px',
            'height:70px',
            'padding-top:6px',
            'transform:rotate(90deg)',
            'transform-origin:left top',
            'clip-path:' + prevZigzag(d.panelLength, 70, 8, 5),
            'background-color:#ffffff',
            'color:#111111',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'z-index:2',
          ].join(';');
          sc.innerHTML = '<svg viewBox="0 0 136.43 22.62" xmlns="http://www.w3.org/2000/svg" width="' + d.svgW + '" height="' + d.svgH + '" fill="#111111">' + SINGLECASK_SVG_PATHS + '</svg>';
          labelEl.appendChild(sc);
        }
      }
    }

    function scalePreview() {
      if (!previewWrap || !previewContainer) return;
      var mediaEl = document.querySelector('.product-media-container.constrain-height .media');
      var gallery = document.querySelector('media-gallery');
      if (!mediaEl || !gallery) return;
      var mediaRect  = mediaEl.getBoundingClientRect();
      var galleryRect = gallery.getBoundingClientRect();
      var h = mediaRect.height;
      if (!h) return;
      previewWrap.style.top    = (mediaRect.top - galleryRect.top) + 'px';
      previewWrap.style.height = h + 'px';
      var scale = (h / PREVIEW_LABEL_H) * 0.70;
      previewContainer.style.transform = 'scale(' + scale + ') translate(0, ' + (PREVIEW_CENTER_TY - 30) + 'px)';
      previewContainer.style.transformOrigin = 'center center';
      previewCrop.style.transform = '';
    }

    function initPreview() {
      if (previewContainer) return;

      previewWrap = document.createElement('div');
      previewWrap.id = 'wb-label-preview-wrap';
      if (productSlug === 'customblend') previewWrap.classList.add('wbp-customblend');

      previewCrop = document.createElement('div');
      previewCrop.className = 'wbp-preview-crop';

      previewContainer = document.createElement('div');
      previewContainer.className = 'wbp-scale-wrap';
      var mockImg = productSlug === 'customblend' ? 'customblendlabelmock.png' : 'singlemaltlabelmock.png';
      previewContainer.style.backgroundImage = 'url(' + cdn + mockImg + ')';
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
      previewCrop.appendChild(previewContainer);
      previewWrap.appendChild(previewCrop);

      var closeBtn = document.createElement('button');
      closeBtn.className = 'wbp-close-btn';
      closeBtn.setAttribute('aria-label', 'Close preview');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', function () {
        previewDismissed = true;
        previewWrap.style.display = 'none';
      });
      previewWrap.appendChild(closeBtn);

      var loaderEl = document.getElementById('wb-single-malt-loader');
      var isPreviewTest = loaderEl && (
        loaderEl.dataset.template === 'product.preview-test' ||
        loaderEl.dataset.template === 'product.personalised-whisky'
      );
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
        if (labelInput.value.trim().length > 0) {
          if (previewDismissed) {
            previewDismissed = false;
            previewWrap.style.display = '';
          } else if (!previewContainer) {
            initPreview();
          }
        }
        clearTimeout(previewDebounce);
        previewDebounce = setTimeout(renderPreviewLabel, 200);
      });
    }

    if (createdByInput) {
      createdByInput.addEventListener('input', function () {
        if (previewContainer && !previewDismissed) {
          clearTimeout(previewDebounce);
          previewDebounce = setTimeout(renderPreviewLabel, 200);
        }
      });
    }

    var variantIdInput = form.querySelector('input[name="id"]');
    if (variantIdInput) {
      variantIdInput.addEventListener('change', function () {
        if (previewDismissed) {
          previewDismissed = false;
          previewWrap.style.display = '';
        } else if (!previewContainer) {
          initPreview();
        }
        renderPreviewLabel();
      });
    }

    /* ── URL param pre-population ───────────────────────────────────────── */

    var urlLabel = new URLSearchParams(window.location.search).get('label');
    if (urlLabel && labelInput) {
      labelInput.value = urlLabel.slice(0, 32);
      labelInput.dispatchEvent(new Event('input'));
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
