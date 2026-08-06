/**
 * wb-label.js — Whisky Blender label generator
 *
 * URL params: type, blend, text, author, distillery, strength, singlecask,
 *             variant, size, product, fg, bg, reference
 */
(function () {
  'use strict';

  /* ── Dimensions ────────────────────────────────────────────────────────────── */

  var DIMS = {
    '200ml': {
      pageH: 325, pagePaddingTop: 73, cropsH: 398,
      labelW: 427, labelH: 252, scale: 1.6,
      outerTop: 36,  outerLeft: 145,
      sideTop:  158, sideLeft:  153,
      sideLabelTop: 140, sideLabelLeft: 108,
      refRight: -36, refTop: 45,
      imgTop: -7, imgLeft: 93, imgW: 342, imgH: 188,
      roundelTop: 4, roundelLeft: -9, roundelW: 445, roundelH: 193,
      panelLength: 193, panelTop: -33,
      scCaskLeft: 102,
      tallFont: 12, domainFont: 7,
      svgW: 168, svgH: 28,
      volume: 200,
    },
    '500ml': {
      pageH: 432, pagePaddingTop: 128, cropsH: 560,
      labelW: 552, labelH: 303, scale: 2.2,
      outerTop: 56,  outerLeft: 195,
      sideTop:  204, sideLeft:  210,
      sideLabelTop: 184, sideLabelLeft: 142,
      refRight: -30, refTop: 45,
      imgTop: -8, imgLeft: 112, imgW: 448, imgH: 244,
      roundelTop: 4,  roundelLeft: -9, roundelW: 570, roundelH: 232,
      panelLength: 232, panelTop: -33,
      scCaskLeft: 102,
      tallFont: 14, domainFont: 9,
      svgW: 202, svgH: 34,
      volume: 500,
    },
  };

  /* ── Contact sheet ─────────────────────────────────────────────────────────── */

  var CONTACT = { cols: 3, rows: 4, w: 250, h: 250, gap: 4, pageW: 794, pageH: 1123 };

  /* ── State ─────────────────────────────────────────────────────────────────── */

  var state = {
    product:    'customblend',  /* customblend | singlemalt | singlecask */
    blend:      '',
    text:       '',
    author:     '',
    distillery: '',
    strength:   '46',
    variant:    'standard',
    size:       '200ml',
    fg:         '#111111',
    bg:         '#ffffff',
    reference:  '',
    recipe:     null,
  };

  /* ── Utilities ─────────────────────────────────────────────────────────────── */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function insertSpaceForLongWords(str) {
    return String(str || '').split(' ').map(function (w) {
      if (w.length > 14) {
        var out = '';
        for (var i = 0; i < w.length; i += 14) out += w.slice(i, i + 14) + ' ';
        return out.trim();
      }
      return w;
    }).join(' ');
  }

  function resizeText(elements) {
    var min = 18, max = 52, step = 0.5;
    function isOverflown(el) {
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    }
    elements.forEach(function (el) {
      var parent = el.parentNode;
      var i = min, overflow = false;
      while (!overflow && i < max) {
        el.style.fontSize   = i + 'px';
        el.style.lineHeight = (i * 0.74) + 'px';
        overflow = isOverflown(parent);
        if (!overflow) i += step;
      }
      var final = i - step - 1;
      el.style.fontSize   = final + 'px';
      el.style.lineHeight = (final * 0.74) + 'px';
    });
  }

  function resizeMiniText(el) {
    var max = 26, min = 6, step = 0.5;
    var frame = el.parentNode;
    var i = max;
    el.style.fontSize   = i + 'px';
    el.style.lineHeight = (i * 0.9) + 'px';
    while (i > min && (frame.scrollHeight > frame.clientHeight || el.scrollWidth > frame.clientWidth)) {
      i -= step;
      el.style.fontSize   = i + 'px';
      el.style.lineHeight = (i * 0.9) + 'px';
    }
  }

  function buildZigzagClip(w, h, step, depth) {
    var count = Math.ceil(w / step);
    var pts = [];
    for (var i = 0; i <= count; i++) {
      var x = Math.min(i * step, w);
      pts.push(x + 'px ' + (i % 2 === 0 ? 0 : depth) + 'px');
    }
    pts.push(w + 'px ' + h + 'px');
    pts.push('0px ' + h + 'px');
    return 'polygon(' + pts.join(', ') + ')';
  }

  function slugify(str) {
    return String(str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function getArtworkUrl(product, variant, size) {
    if (!product || !variant) return null;
    var root = document.getElementById('wb-label-root');
    var key = product + '-' + slugify(variant) + '-' + size;
    var mapAttr = root.getAttribute('data-artwork-map');
    if (mapAttr) {
      try {
        var map = JSON.parse(mapAttr);
        if (map[key]) return map[key];
      } catch (e) {}
    }
    var cdn = root.getAttribute('data-cdn') || '';
    var av  = root.getAttribute('data-av') || '1';
    return cdn + 'wb-' + product + '-' + slugify(variant) + '-' + size + '.jpg?v=' + av;
  }

  function luminance(hex) {
    var dark = ['#111111', '#1a2744', '#1c3320', '#3b0d17'];
    return dark.indexOf(hex.toLowerCase()) !== -1 ? 'dark' : 'light';
  }

  function shadowColor(hex) {
    return luminance(hex) === 'dark' ? '#ffffff' : '#000000';
  }

  /* ── URL params → state ────────────────────────────────────────────────────── */

  function readParams() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('blend'))      state.blend      = p.get('blend');
    if (p.get('text'))       state.text       = p.get('text');
    if (p.get('author'))     state.author     = p.get('author');
    if (p.get('distillery')) state.distillery = p.get('distillery');
    if (p.get('strength'))   state.strength   = p.get('strength');
    if (p.get('variant'))    state.variant    = p.get('variant');
    if (p.get('product'))    state.product    = p.get('product');
    /* Legacy: size=miniature used to drive the contact sheet — now a product slug */
    if (!p.get('product') && p.get('size') === 'miniature') state.product = 'miniatures';
    /* Backward compat: product=miniature (singular) → miniatures */
    if (state.product === 'miniature') state.product = 'miniatures';
    if (p.get('size') && p.get('size') !== 'miniature') state.size = p.get('size');
    var hexRe = /^#[0-9A-Fa-f]{3,6}$/;
    if (p.get('fg') && hexRe.test(p.get('fg'))) state.fg = p.get('fg');
    if (p.get('bg') && hexRe.test(p.get('bg'))) state.bg = p.get('bg');
    if (p.get('reference'))  state.reference  = p.get('reference');
    if (p.get('productname')) state.productname = p.get('productname');

    /* Legacy: map old type= and singlecask= params to product slug */
    if (!p.get('product')) {
      var legacyType = p.get('type');
      var legacySC   = p.get('singlecask') === 'true';
      if (legacyType === 'single-malt') {
        state.product = legacySC ? 'singlecask' : 'singlemalt';
      } else {
        state.product = 'customblend';
      }
    }

    /* singlemalt/singlecask only have 500ml artwork — upgrade silently if size is missing or 200ml */
    if ((state.product === 'singlemalt' || state.product === 'singlecask') && state.size !== '500ml') {
      state.size = '500ml';
    }

  }

  /* ── Build shareable URL from state ────────────────────────────────────────── */

  function buildUrl() {
    var p = new URLSearchParams();
    p.set('product', state.product);
    if (state.blend)      p.set('blend',      state.blend);
    if (state.text)       p.set('text',       state.text);
    if (state.author)     p.set('author',     state.author);
    if (state.distillery) p.set('distillery', state.distillery);
    if (state.strength)   p.set('strength',   state.strength);
    if (state.variant)    p.set('variant',    state.variant);
    if (state.size)       p.set('size',       state.size);
    if (state.fg && state.fg !== '#111111') p.set('fg', state.fg);
    if (state.bg && state.bg !== '#ffffff') p.set('bg', state.bg);
    if (state.reference)  p.set('reference',  state.reference);
    if (state.productname) p.set('productname', state.productname);
    return window.location.pathname + '?' + p.toString();
  }

  /* ── Zone 1: Summary ───────────────────────────────────────────────────────── */

  function renderSummary() {
    var el = document.getElementById('wb-summary');
    if (!el) return;
    var items = [];
    if (state.productname) items.push({ label: 'Product', value: state.productname });
    if (state.reference) items.push({ label: 'Order', value: state.reference });
    if (state.product === 'customblend') {
      if (state.blend) items.push({ label: 'Blend', value: state.blend });
      if (state.author) items.push({ label: 'Created by', value: state.author });
    } else {
      if (state.distillery) items.push({ label: 'Product', value: state.distillery });
    }
    if (state.text) items.push({ label: 'Label text', value: state.text });
    if (state.variant) items.push({ label: 'Style', value: state.variant });
    if (state.size) items.push({ label: 'Size', value: state.size });

    el.innerHTML = items.map(function (item) {
      return '<span class="wb-summary-item">' +
        '<span class="wb-summary-item__label">' + esc(item.label) + '</span>' +
        '<span class="wb-summary-item__value">' + esc(item.value) + '</span>' +
        '</span>';
    }).join('');
  }

  /* ── Zone 2: Label ─────────────────────────────────────────────────────────── */

  function removeSidePanels() {
    var existing = document.querySelectorAll('.wb-side-panel');
    existing.forEach(function (el) { el.parentNode.removeChild(el); });
  }

  function renderSidePanel(d) {
    var label = document.getElementById('label');
    if (!label) return;

    removeSidePanels();

    var s = d.panelLength / 232;
    var pad = Math.round(10 * s) + 'px ' + Math.round(16 * s) + 'px ' + Math.round(17 * s) + 'px';
    var sizeText = d.volume + 'ml ℮';

    /* Info strip */
    var info = document.createElement('div');
    info.className = 'wb-side-panel';
    info.style.cssText = [
      'box-sizing:border-box',
      'position:absolute',
      'top:' + d.panelTop + 'px',
      'left:47px',
      'width:' + d.panelLength + 'px',
      'height:56px',
      'transform:rotate(90deg)',
      'transform-origin:left top',
      'clip-path:' + buildZigzagClip(d.panelLength, 56, 8, 5),
      'background-color:' + state.bg,
      'color:' + state.fg,
      'text-shadow:none',
      'display:grid',
      'grid-template-columns:1fr 1fr 1fr',
      'align-items:center',
      'padding:' + pad,
      'z-index:2',
    ].join(';');

    var tallStyle = 'font-family:Antonio,sans-serif;font-weight:300;font-size:' + d.tallFont + 'px;text-transform:uppercase;letter-spacing:-0.5px';
    info.innerHTML =
      '<span style="' + tallStyle + '">' + esc(state.strength || '46') + '% abv</span>' +
      '<span style="font-size:' + d.domainFont + 'px;font-weight:700;text-align:center;letter-spacing:0.4px;font-family:Raleway,sans-serif">whiskyblender.com</span>' +
      '<span style="' + tallStyle + ';text-align:right">' + esc(sizeText) + '</span>';
    label.appendChild(info);

    /* Single cask strip */
    if (state.product === 'singlecask') {
      var sc = document.createElement('div');
      sc.className = 'wb-side-panel';
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
        'clip-path:' + buildZigzagClip(d.panelLength, 70, 8, 5),
        'background-color:' + state.bg,
        'color:' + state.fg,
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'z-index:2',
      ].join(';');
      var svgTemplate = document.getElementById('wb-singlecask-svg');
      if (svgTemplate) {
        var svgClone = svgTemplate.cloneNode(true);
        svgClone.removeAttribute('id');
        svgClone.removeAttribute('style');
        svgClone.setAttribute('width', d.svgW);
        svgClone.setAttribute('height', d.svgH);
        svgClone.setAttribute('fill', state.fg);
        sc.appendChild(svgClone);
      }
      label.appendChild(sc);
    }
  }

  function renderLabel() {
    var isMini = (state.product === 'miniatures') || (state.product === 'customblend' && state.size === '50ml');
    var pageEl = document.getElementById('page');
    var contactSheet = document.getElementById('wb-contact-sheet');

    if (isMini) {
      if (pageEl) pageEl.style.display = 'none';
      if (contactSheet) contactSheet.classList.add('is-visible');
      renderContactSheet();
      renderRecipePanel();
      return;
    }

    if (pageEl) pageEl.style.display = '';
    if (contactSheet) contactSheet.classList.remove('is-visible');

    var d = DIMS[state.size] || DIMS['200ml'];
    var page = document.getElementById('page');
    var label = document.getElementById('label');
    if (!page || !label) return;

    /* Size + product class */
    var sizeClass = state.size === '500ml' ? 'size50' : 'size20';
    var productClass = (state.product === 'singlemalt' || state.product === 'singlecask') ? state.product : '';
    page.className = (sizeClass + ' ' + productClass).trim();

    /* Artwork — singlecask shares singlemalt image files */
    var artworkEl = document.getElementById('artwork');
    var artworkProduct = state.product === 'singlecask' ? 'singlemalt' : state.product;
    var artworkUrl = getArtworkUrl(artworkProduct, state.variant, state.size);
    if (artworkEl) artworkEl.style.backgroundImage = artworkUrl ? 'url(' + artworkUrl + ')' : 'none';

    /* Label text colour — fixed by product type, independent of fg/bg picker.
       customblend: black; singlemalt/singlecask: white (text sits on dark artwork) */
    var isBlend = state.product === 'customblend';
    var labelColor  = isBlend ? '#111111' : '#ffffff';
    var labelShadow = isBlend ? '#ffffff' : '#000000';

    /* Blend name */
    var blendNameEl = document.getElementById('blendName');
    if (blendNameEl) {
      blendNameEl.innerHTML = esc(insertSpaceForLongWords(state.text || ''));
      blendNameEl.style.color = labelColor;
      blendNameEl.style.textShadow = '1px 1px ' + labelShadow;
    }

    /* Side name (author or distillery) */
    var sideNameEl = document.getElementById('sideName');
    if (sideNameEl) {
      sideNameEl.textContent = isBlend ? (state.author || '') : (state.distillery || '');
      sideNameEl.style.color = labelColor;
      sideNameEl.style.textShadow = '1px 1px ' + labelShadow;
    }

    /* Side label ("Distilled at" — single malt/cask only) */
    var sideLabelEl = document.getElementById('sideLabel');
    if (sideLabelEl) {
      if (isBlend) {
        sideLabelEl.style.display = 'none';
      } else {
        sideLabelEl.style.display = '';
        sideLabelEl.textContent = 'Distilled at';
        sideLabelEl.style.color = labelColor;
        sideLabelEl.style.textShadow = '1px 1px ' + labelShadow;
        sideLabelEl.style.top  = d.sideLabelTop + 'px';
        sideLabelEl.style.left = d.sideLabelLeft + 'px';
      }
    }

    /* Reference */
    var refEl = document.getElementById('reference');
    if (refEl) {
      var refParts = [state.blend, state.reference].filter(Boolean);
      refEl.textContent = refParts.join(' · ');
    }

    /* Side panel — single malt / single cask only (ABV / domain / ml strip) */
    if (state.product !== 'customblend') {
      /* panelTop shifts to roundelTop (4) so strip sits alongside the artwork */
      renderSidePanel(Object.assign({}, d, { panelTop: d.roundelTop }));
    } else {
      removeSidePanels();
    }

    /* Resize text after fonts load */
    document.fonts.ready.then(function () {
      if (blendNameEl) resizeText([blendNameEl]);
    });
  }

  /* ── Miniature contact sheet ────────────────────────────────────────────────── */

  function buildMiniLabel() {
    var name = state.text || '';
    var author = (state.product === 'customblend' || state.product === 'miniatures') ? (state.author || '') : (state.distillery || '');
    var ref = state.reference || '';
    var strength = state.strength || '46';

    return '<div class="wb-mini-label">' +
      '<div class="wb-mini-row">' +
        '<div class="wb-mini-strip wb-mini-strip--left"><span>Bottled by whiskyblender.com</span></div>' +
        '<div class="wb-mini-centre">' +
          '<div class="wb-mini-frame">' +
            '<div class="wb-mini-name">' + esc(name || 'Whisky Name') + '</div>' +
            '<div class="wb-mini-by">By</div>' +
            '<div class="wb-mini-author">' + esc(author || '—') + '</div>' +
            (ref ? '<div class="wb-mini-ref">' + esc(ref) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="wb-mini-strip wb-mini-strip--right"><span>' + esc(strength) + '% abv. · 50ml</span></div>' +
      '</div>' +
      '<div class="wb-mini-bar">Blended Malt<br>Scotch Whisky</div>' +
    '</div>';
  }

  function renderContactSheet() {
    var grid = document.getElementById('wb-contact-grid');
    var page = document.getElementById('wb-contact-page');
    if (!grid || !page) return;

    var totalW = CONTACT.cols * CONTACT.w + (CONTACT.cols - 1) * CONTACT.gap;
    var totalH = CONTACT.rows * CONTACT.h + (CONTACT.rows - 1) * CONTACT.gap;
    var marginX = Math.round((CONTACT.pageW - totalW) / 2);
    var marginY = Math.round((CONTACT.pageH - totalH) / 2);

    page.style.width  = CONTACT.pageW + 'px';
    page.style.height = CONTACT.pageH + 'px';
    grid.style.top  = marginY + 'px';
    grid.style.left = marginX + 'px';
    grid.style.gridTemplateColumns = 'repeat(' + CONTACT.cols + ', ' + CONTACT.w + 'px)';
    grid.style.gap = CONTACT.gap + 'px';

    var html = '';
    for (var i = 0; i < CONTACT.cols * CONTACT.rows; i++) html += buildMiniLabel();
    grid.innerHTML = html;

    document.fonts.ready.then(function () {
      requestAnimationFrame(function () {
        document.querySelectorAll('.wb-mini-name').forEach(resizeMiniText);
      });
    });
  }

  /* ── Zone 3: Recipe panel ───────────────────────────────────────────────────── */

  function showRecipeError(msg) {
    var loading = document.getElementById('wb-recipe-loading');
    var error   = document.getElementById('wb-recipe-error');
    var list    = document.getElementById('wb-recipe-list');
    if (loading) loading.style.display = 'none';
    if (error)  { error.textContent = msg; error.style.display = ''; }
    if (list)   list.style.display = 'none';
  }

  function renderRecipePanel() {
    var panel   = document.getElementById('wb-recipe-panel');
    var loading = document.getElementById('wb-recipe-loading');
    var error   = document.getElementById('wb-recipe-error');
    var list    = document.getElementById('wb-recipe-list');
    if (!panel) return;

    if (state.product !== 'customblend') {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = '';
    if (error) error.style.display = 'none';

    if (!state.recipe) {
      if (list) list.style.display = 'none';
      if (loading) loading.style.display = state.blend ? '' : 'none';
      return;
    }

    if (loading) loading.style.display = 'none';

    var d = DIMS[state.size] || DIMS['200ml'];
    var volume = d.volume;
    var items = Array.isArray(state.recipe) ? state.recipe.filter(function (r) { return r.amount > 0; }) : [];

    if (items.length === 0) {
      if (list) list.style.display = 'none';
      return;
    }

    list.innerHTML = items.map(function (item) {
      var ml = Math.round(item.amount * volume / 100);
      return '<li>' +
        '<span class="wb-recipe-swatch" style="background:' + esc(item.colour || '#ccc') + '"></span>' +
        '<span class="wb-recipe-ml">' + esc(String(ml)) + 'ml</span>' +
        '<span class="wb-recipe-name">' + esc(item.name) + '</span>' +
        '</li>';
    }).join('');
    list.style.display = 'flex';
  }

  /* ── Fetch blend from API ──────────────────────────────────────────────────── */

  function loadBlend(slug, onDone) {
    if (!slug) return;
    var root = document.getElementById('wb-label-root');
    var apiBase = (root ? root.getAttribute('data-api-base') : '') || '';
    var loading = document.getElementById('wb-recipe-loading');
    if (loading) loading.style.display = '';

    fetch(apiBase + '/api/blend?slug=' + encodeURIComponent(slug))
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          showRecipeError('Blend ‘' + esc(slug) + '’ not found.');
          return;
        }
        state.recipe = result.data.recipe;
        renderRecipePanel();
        if (onDone) onDone(result.data);
      })
      .catch(function () {
        showRecipeError('Could not load recipe. Check your connection.');
      });
  }

  /* ── Full render ───────────────────────────────────────────────────────────── */

  function render() {
    renderSummary();
    renderLabel();
    renderRecipePanel();
  }

  /* ── Form ──────────────────────────────────────────────────────────────────── */

  function syncFormToState() {
    var t = document.getElementById('wb-f-type');
    var blend    = document.getElementById('wb-f-blend');
    var text     = document.getElementById('wb-f-text');
    var author   = document.getElementById('wb-f-author');
    var dist     = document.getElementById('wb-f-distillery');
    var strength = document.getElementById('wb-f-strength');
    var scask    = document.getElementById('wb-f-singlecask');
    var size     = document.getElementById('wb-f-size');
    var variant  = document.getElementById('wb-f-variant');
    var fg       = document.getElementById('wb-f-fg');
    var bg       = document.getElementById('wb-f-bg');
    var ref      = document.getElementById('wb-f-reference');
    var pname    = document.getElementById('wb-f-productname');

    if (t)        t.value        = state.product;
    if (blend)    blend.value    = state.blend;
    if (text)     text.value     = state.text;
    if (author)   author.value   = state.author;
    if (dist)     dist.value     = state.distillery;
    if (strength) strength.value = state.strength;
    if (size)     size.value     = state.size;
    if (variant)  variant.value  = state.variant;
    if (fg)       fg.value       = state.fg;
    if (bg)       bg.value       = state.bg;
    if (ref)      ref.value      = state.reference;
    if (pname)    pname.value    = state.productname;

    updateTypeVisibility();
  }

  function updateTypeVisibility() {
    var isBlend = state.product === 'customblend';
    var isMalt  = state.product === 'singlemalt' || state.product === 'singlecask';
    var isMini  = state.product === 'miniatures';

    /* Blend code: customblend only */
    document.querySelectorAll('.wb-blendcode-only').forEach(function (el) {
      el.style.display = isBlend ? '' : 'none';
    });
    /* Author ("Created by"): customblend + miniature */
    document.querySelectorAll('.wb-has-author').forEach(function (el) {
      el.style.display = (isBlend || isMini) ? '' : 'none';
    });
    /* Distillery + fg/bg pickers: singlemalt + singlecask only */
    document.querySelectorAll('.wb-singlemalt-only').forEach(function (el) {
      el.style.display = isMalt ? '' : 'none';
    });
    /* Strength: singlemalt + singlecask + miniature */
    document.querySelectorAll('.wb-has-strength').forEach(function (el) {
      el.style.display = (isMalt || isMini) ? '' : 'none';
    });
    /* Bottle size: all except miniature */
    document.querySelectorAll('.wb-nonmini-only').forEach(function (el) {
      el.style.display = isMini ? 'none' : '';
    });
  }

  function initForm() {
    syncFormToState();

    function onChange(key, el, transform) {
      el.addEventListener('input', function () {
        state[key] = transform ? transform(el.value) : el.value;
        render();
      });
    }

    var t = document.getElementById('wb-f-type');
    if (t) {
      t.addEventListener('change', function () {
        state.product = t.value;
        state.recipe = null;
        if (state.product === 'customblend') state.fg = '#111111';
        updateTypeVisibility();
        render();
      });
    }

    onChange('blend',      document.getElementById('wb-f-blend'),       null);
    onChange('text',       document.getElementById('wb-f-text'),        null);
    onChange('author',     document.getElementById('wb-f-author'),      null);
    onChange('distillery', document.getElementById('wb-f-distillery'),  null);
    onChange('strength',   document.getElementById('wb-f-strength'),    null);
    onChange('reference',  document.getElementById('wb-f-reference'),   null);
    onChange('productname', document.getElementById('wb-f-productname'), null);

    var size = document.getElementById('wb-f-size');
    if (size) {
      size.addEventListener('change', function () {
        state.size = size.value;
        render();
      });
    }

    var variant = document.getElementById('wb-f-variant');
    if (variant) {
      variant.addEventListener('change', function () {
        state.variant = variant.value;
        render();
      });
    }

    var fg = document.getElementById('wb-f-fg');
    if (fg) {
      fg.addEventListener('change', function () {
        state.fg = fg.value;
        render();
      });
    }

    var bg = document.getElementById('wb-f-bg');
    if (bg) {
      bg.addEventListener('change', function () {
        state.bg = bg.value;
        render();
      });
    }

    /* Load blend button */
    var loadBtn = document.getElementById('wb-btn-load');
    var blendInput = document.getElementById('wb-f-blend');
    if (loadBtn && blendInput) {
      loadBtn.addEventListener('click', function () {
        state.blend  = blendInput.value.trim();
        state.recipe = null;
        render();
        if (state.blend) {
          loadBlend(state.blend);
        }
      });
    }

    /* Edit toggle */
    var editBtn = document.getElementById('wb-btn-edit');
    var formPanel = document.getElementById('wb-form-panel');
    if (editBtn && formPanel) {
      editBtn.addEventListener('click', function () {
        var visible = formPanel.classList.toggle('is-visible');
        editBtn.classList.toggle('is-active', visible);
      });
    }

    /* Copy URL */
    var copyBtn = document.getElementById('wb-btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = window.location.origin + buildUrl();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = 'Copy URL'; }, 2000);
          });
        } else {
          window.prompt('Copy this URL:', url);
        }
      });
    }
  }

  /* ── Init ──────────────────────────────────────────────────────────────────── */

  function init() {
    var isPreview = window !== window.parent;

    if (isPreview) {
      document.body.classList.add('wb-preview-mode');
      window.addEventListener('message', function (e) {
        if (!e.data || e.data.type !== 'wb-preview-update') return;
        var p = e.data.params;
        if (p.text        !== undefined) state.text        = p.text;
        if (p.variant     !== undefined) state.variant     = p.variant;
        if (p.distillery  !== undefined) state.distillery  = p.distillery;
        if (p.size        !== undefined) state.size        = p.size;
        if (p.product     !== undefined) state.product     = p.product;
        if (p.strength    !== undefined) state.strength    = p.strength;
        if (p.fg          !== undefined) state.fg          = p.fg;
        if (p.bg          !== undefined) state.bg          = p.bg;
        renderLabel();
      });
    }

    readParams();

    if (!isPreview) {
      var p = new URLSearchParams(window.location.search);
      var productInUrl = !!p.get('product') || !!p.get('type');
      var missingKey = productInUrl && (
        (state.product === 'customblend' && !state.blend) ||
        ((state.product === 'singlemalt' || state.product === 'singlecask') && !state.text)
      );
      if (missingKey) {
        var root = document.getElementById('wb-label-root');
        if (root) {
          root.innerHTML = '';
          var msg = document.createElement('div');
          msg.style.cssText = 'font-family:sans-serif;padding:40px;max-width:480px;margin:60px auto;text-align:center;';
          var heading = document.createElement('p');
          heading.style.cssText = 'font-size:18px;font-weight:700;margin:0 0 12px;';
          heading.textContent = 'Invalid label URL';
          var body = document.createElement('p');
          body.style.cssText = 'font-size:15px;color:#555;margin:0 0 24px;line-height:1.5;';
          body.textContent = 'This link is missing some required details. Please click “Print Label” again from the order in Shopify admin.';
          var back = document.createElement('button');
          back.textContent = '← Go back';
          back.style.cssText = 'font-size:14px;cursor:pointer;padding:8px 16px;';
          back.onclick = function () { history.back(); };
          msg.appendChild(heading);
          msg.appendChild(body);
          msg.appendChild(back);
          root.appendChild(msg);
        }
        return;
      }
    }

    render();

    if (!isPreview) {
      initForm();
      if (state.product === 'customblend' && state.blend) {
        loadBlend(state.blend);
      }
    }

    if (isPreview) {
      document.fonts.ready.then(function () {
        window.parent.postMessage({ type: 'wb-preview-ready' }, '*');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
