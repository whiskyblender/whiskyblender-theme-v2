/**
 * wb-label.js — Whisky Blender label generator
 *
 * Products: customblend | singlemalt | singlecask | miniatures | doctorsspecial |
 *           nipbeforechristmas (text = To, author = From, blend = recipe — the
 *           recipe panel shows under the label as for a custom blend)
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

  /* New 500ml template dimensions: a clone of the Classic 500ml entry with the
     side-strip geometry overridden. renderLabel feeds roundelTop -> the strip's
     panelTop, and panelLength is the strip's length, so these move the ABV /
     single-cask side strips up 37px and lengthen them 37px (top -33, length 269) to
     align with the taller New artwork — the strip's bottom stays pinned at 236
     (-33 + 269 == the Classic 4 + 232). The roundel image position is CSS
     (body.wb-tpl-new .size50 .image), independent of roundelTop here. svgW/svgH size
     the single-cask "SINGLE CASK" SVG (232x52 for New, up from 202x34). sideLabelTop
     positions the "Distilled at" label (170 for New, up from 184). Classic keeps
     using the DIMS entry above (frozen snapshot). Only 500ml has a New entry. */
  var DIMS_NEW = {
    '500ml': Object.assign({}, DIMS['500ml'], { roundelTop: -33, panelLength: 269, svgW: 232, svgH: 52, sideLabelTop: 170 }),
  };

  /* ── Plain-front stock (PLAN-LABELS-UNIFIED.md, 27 Oct 2026) ──────────────────
     New Single Malt / Blended Malt stocks: only the copper rule and the black band
     are pre-printed. With state.plain, every 500ml label prints on the New 570x269
     layout and every 200ml label on the full-width 445x193 single malt layout, all
     with the single malt side strip, and we print "Created by" and "Create your
     own at whiskyblender.com", which the old stock carried. No roundel (Andrew,
     29 Oct 2026: removed from the new-stock and clan labels). OFF until the
     stock arrives: flip PLAIN_STOCK_DEFAULT then. Per print: the Edit panel's
     "Plain stock" box, or &stock=plain / &stock=current in the URL.
     Doctors' Special and the Nip keep their artwork placement until their new
     artwork exists (their printed text is positioned on it). */
  var PLAIN_STOCK_DEFAULT = false;
  /* Positions in label px. "Create your own": left, line 1 baseline, line 2
     baseline, font size (500ml sits in the artwork's white pill). Measured from
     the stock photos and wb-standard-dark.jpg. */
  var PLAIN = {
    '500ml': { cyo: [455.8, 206.9, 218.8, 8.3] },
    '200ml': { cyo: [346.7, 155.8, 164.8, 6.8] }
  };

  /* Doctors' Special name limit — matches the product page input (maxlength 24) */
  var DS_MAX_CHARS = 24;

  /* The Nip Before Christmas To / From limit — matches the product page inputs (maxlength 20) */
  var NIP_MAX_CHARS = 20;

  /* ── Contact sheet ─────────────────────────────────────────────────────────── */

  var CONTACT = { cols: 3, rows: 4, w: 250, h: 250, gap: 4, pageW: 794, pageH: 1123 };

  /* Label range (Andrew, 24 Oct 2026): print only slots slotFrom–slotTo so a
     part-used sheet can be finished off (11–12 = the last two). Slots count left
     to right, top to bottom. Skipped slots stay in the grid as blank cells so the
     printed labels keep their place on the sheet. */
  var SLOT_COUNT = CONTACT.cols * CONTACT.rows;

  /* Clamp to 1–SLOT_COUNT and keep from ≤ to. `changed` is the field just edited:
     the other one moves to meet it. */
  function normaliseSlots(changed) {
    function clamp(v, dflt) {
      v = parseInt(v, 10);
      if (isNaN(v)) return dflt;
      return Math.min(SLOT_COUNT, Math.max(1, v));
    }
    state.slotFrom = clamp(state.slotFrom, 1);
    state.slotTo   = clamp(state.slotTo, SLOT_COUNT);
    if (state.slotFrom > state.slotTo) {
      if (changed === 'to') state.slotFrom = state.slotTo;
      else state.slotTo = state.slotFrom;
    }
  }

  /* ── State ─────────────────────────────────────────────────────────────────── */

  var state = {
    product:    'customblend',  /* customblend | singlemalt | singlecask */
    plain:      PLAIN_STOCK_DEFAULT,   /* plain-front stock: one layout per size (see PLAIN) */
    clanProduct: false,         /* product=clan: a custom blend with a clan tartan label. Kept
                                   as product 'customblend' inside, so the blend, recipe and
                                   order fields work as they do for custom blend */
    clan:       '',             /* clan handle (wb-tartan.js), product=clan only */
    template:   'new',          /* new | classic — 500ml label template version.
                                   Per-product DEFAULT is set in readParams (2026-09-07):
                                   custom blend → 'new', single malt/cask → 'classic'
                                   (not on taller stock yet). The "Legacy template"
                                   checkbox still overrides per print. This literal is
                                   just the pre-readParams seed. */
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
    slotFrom:   1,              /* contact-sheet label range — see normaliseSlots */
    slotTo:     12,
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
    var max = 52, step = 0.5;
    function isOverflown(el) {
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    }
    elements.forEach(function (el) {
      /* Minimum 18, unless the label style sets --wb-name-min in CSS (a wide font
         needs a lower floor so a 32-character name fits — e.g. .wb-christmas). */
      var min = parseFloat(getComputedStyle(el).getPropertyValue('--wb-name-min')) || 18;
      var parent = el.parentNode;
      var i = min, overflow = false;
      while (!overflow && i < max) {
        el.style.fontSize   = i + 'px';
        el.style.lineHeight = (i * 0.80) + 'px';
        overflow = isOverflown(parent);
        if (!overflow) i += step;
      }
      var final = i - step - 1;
      el.style.fontSize   = final + 'px';
      el.style.lineHeight = (final * 0.80) + 'px';
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

  function resizeMiniName(el) {
    var min = 8, max = 80, step = 0.5;
    var outer = el.parentNode;
    function isOverflown() {
      return outer.scrollWidth > outer.clientWidth || outer.scrollHeight > outer.clientHeight;
    }
    var i = min, overflow = false;
    while (!overflow && i < max) {
      el.style.fontSize   = i + 'px';
      el.style.lineHeight = (i * 0.8) + 'px';
      overflow = isOverflown();
      if (!overflow) i += step;
    }
    var final = Math.max(min, i - step - 1);
    el.style.fontSize   = final + 'px';
    el.style.lineHeight = (final * 0.8) + 'px';
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

  /* Dimensions for the current size, aware of the label template version.
     New (default) → DIMS_NEW when it has an entry (500ml only); Classic → the
     frozen DIMS entry. Phase 2: DIMS_NEW['500ml'] clones DIMS['500ml'], so both
     paths are identical until Phase 3 diverges New. */
  /* Products that print on the one-layout-per-size plain stock (not Doctors' /
     the Nip yet, not the miniature contact sheet) */
  function onPlainLayout() {
    if (!state.plain) return false;
    var p = state.product;
    if (p !== 'customblend' && p !== 'singlemalt' && p !== 'singlecask') return false;
    return state.size === '500ml' || state.size === '200ml';
  }

  /* ── Clan labels (PLAN-CLAN-BOTTLES.md) ──────────────────────────────────────
     product=clan&clan=<handle> (or Product: Clan in the Edit panel): the artwork
     is the clan's tartan, drawn from its thread count by wb-tartan.js, and the
     text and "Create your own" take one tone picked from the tartan
     behind the name (white unless it's mostly light). Always on the plain stock.
     No other product reads &clan=, so nothing here runs for them. */
  var CLAN_REPEAT = 0.42 * 570;   /* one full sett repeat, label px (same physical scale at both sizes) */
  var CLAN_RES = 4;               /* canvas px per label px — print resolution */
  var clanArt = {};

  function clanFor() {
    return (state.clan && window.WBTartan) ? window.WBTartan.find(state.clan) : null;
  }
  function clanActive() {
    return (state.clanProduct && state.product === 'customblend' && onPlainLayout()) ? clanFor() : null;
  }

  /* Draws the tartan into the artwork area (cached per clan and size) and returns
     the tone for the name box: 'white' or 'black' */
  function paintClan(artworkEl, clan) {
    var cs = getComputedStyle(artworkEl);
    var w = parseFloat(cs.width), h = parseFloat(cs.height);
    var key = clan.handle + '|' + w + 'x' + h;
    if (!clanArt[key]) {
      var c = document.createElement('canvas');
      c.width = Math.round(w * CLAN_RES); c.height = Math.round(h * CLAN_RES);
      window.WBTartan.draw(c, clan, CLAN_REPEAT * CLAN_RES);
      clanArt[key] = { canvas: c, url: c.toDataURL('image/png') };
    }
    var art = clanArt[key];
    artworkEl.style.backgroundImage = 'url(' + art.url + ')';
    var outer = document.getElementById('outer');
    var ar = artworkEl.getBoundingClientRect(), or = outer && outer.getBoundingClientRect();
    if (!or || !ar.width) return 'white';
    var k = art.canvas.width / ar.width;
    return window.WBTartan.tone(art.canvas, (or.left - ar.left) * k, (or.top - ar.top) * k, or.width * k, or.height * k).text;
  }

  /* Per-product label template default: custom blend New; single malt / cask
     Classic on today's stock (not taller), New on the plain stock; Doctors' and
     the Nip always Classic. Staff can still override with the Legacy box. */
  function defaultTemplate() {
    var p = state.product;
    if (p === 'doctorsspecial' || p === 'nipbeforechristmas') return 'classic';
    if (p === 'singlemalt' || p === 'singlecask') return state.plain ? 'new' : 'classic';
    return 'new';
  }

  function getDims() {
    if (state.template === 'new' && DIMS_NEW[state.size]) return DIMS_NEW[state.size];
    return DIMS[state.size] || DIMS['200ml'];
  }

  function getArtworkUrl(product, variant, size) {
    var root = document.getElementById('wb-label-root');
    /* Doctors' Special: one full-resolution artwork for every variant */
    if (product === 'doctorsspecial') return root.getAttribute('data-doctors-art') || null;
    /* The Nip Before Christmas: one fixed 200ml artwork */
    if (product === 'nipbeforechristmas') return root.getAttribute('data-nip-art') || null;
    if (!product || !variant) return null;
    var cdn = root.getAttribute('data-cdn') || '';
    var av  = root.getAttribute('data-av') || '1';

    /* New 500ml backgrounds: wb-<variant>-<light|dark>.jpg — light for custom blend,
       dark for single malt / cask. Resolved via data-tone-map, whose URLs come from
       Liquid asset_url so they carry Shopify's content-hash ?v= and auto-bust the
       CDN cache when the file is replaced (no data-av bump needed). Falls back to a
       constructed ?v=<data-av> URL only if the map is missing. */
    if (state.template === 'new' && size === '500ml') {
      var tone = (product === 'customblend') ? 'light' : 'dark';
      var toneKey = slugify(variant) + '-' + tone;
      var toneMap = root.getAttribute('data-tone-map');
      if (toneMap) {
        try {
          var tm = JSON.parse(toneMap);
          if (tm[toneKey]) return tm[toneKey];
        } catch (e) {}
      }
      return cdn + 'wb-' + slugify(variant) + '-' + tone + '.jpg?v=' + av;
    }

    /* Classic (and 200ml): map first, then the per-product filename fallback.
       Classic reads its own map; falls back to the default map. */
    var key = product + '-' + slugify(variant) + '-' + size;
    var mapName = state.template === 'classic' ? 'data-artwork-map-classic' : 'data-artwork-map';
    var mapAttr = root.getAttribute(mapName) || root.getAttribute('data-artwork-map');
    if (mapAttr) {
      try {
        var map = JSON.parse(mapAttr);
        if (map[key]) return map[key];
      } catch (e) {}
    }
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
    /* The Halloween style launched as "Pumpkin" (17 Oct 2026): orders from then carry
       variant=pumpkin, so read it as halloween and they still print correctly. */
    if (slugify(state.variant) === 'pumpkin') state.variant = 'halloween';
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
    /* stock=plain / stock=current overrides PLAIN_STOCK_DEFAULT for this print */
    if (p.get('stock') === 'plain') state.plain = true;
    if (p.get('stock') === 'current') state.plain = false;
    /* product=clan&clan=<handle>: a custom blend on a clan tartan label. Clan labels
       exist only on the plain stock. &clan= on any other product is ignored. */
    if (state.product === 'clan') {
      state.product = 'customblend';
      state.clanProduct = true;
      state.clan = p.get('clan') || '';
      state.plain = true;
    }
    /* slots=11-12 → label range on the miniature contact sheet */
    var slots = /^(\d+)-(\d+)$/.exec(p.get('slots') || '');
    if (slots) { state.slotFrom = slots[1]; state.slotTo = slots[2]; normaliseSlots(); }

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

    /* Template default by product (2026-09-07): custom blend prints the New taller
       label; single malt / cask are NOT on taller stock yet, so default them to
       Classic to avoid misregistering New onto old stock. Staff can still override
       per print with the Legacy checkbox. template isn't a URL param, so this is the
       effective default. Malt/cask move to New on the plain stock (defaultTemplate). */
    state.template = defaultTemplate();

    /* Doctors' Special: one fixed 500ml artwork on the blended-malt stock. Never the
       New taller template (that's custom blend's frame and side strips). */
    if (state.product === 'doctorsspecial') { state.size = '500ml'; state.template = 'classic'; }
    /* The Nip Before Christmas: 200ml only (200ml has no New template) */
    if (state.product === 'nipbeforechristmas') { state.size = '200ml'; state.template = 'classic'; }
  }

  /* ── Build shareable URL from state ────────────────────────────────────────── */

  function buildUrl() {
    var p = new URLSearchParams();
    p.set('product', state.clanProduct ? 'clan' : state.product);
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
    /* (a clan label is always on the plain stock, so it needs no stock=) */
    if (!state.clanProduct && state.plain !== PLAIN_STOCK_DEFAULT) p.set('stock', state.plain ? 'plain' : 'current');
    if (state.clanProduct && state.clan) p.set('clan', state.clan);
    if (state.slotFrom !== 1 || state.slotTo !== SLOT_COUNT) p.set('slots', state.slotFrom + '-' + state.slotTo);
    return window.location.pathname + '?' + p.toString();
  }

  /* ── Zone 1: Summary ───────────────────────────────────────────────────────── */

  function renderSummary() {
    var el = document.getElementById('wb-summary');
    if (!el) return;
    var items = [];
    if (state.productname) items.push({ label: 'Product', value: state.productname });
    if (state.reference) items.push({ label: 'Order', value: state.reference });
    if (state.product === 'nipbeforechristmas') {
      if (state.blend) items.push({ label: 'Blend', value: state.blend });
      if (state.text) items.push({ label: 'To', value: state.text });
      if (state.author) items.push({ label: 'From', value: state.author });
      if (state.size) items.push({ label: 'Size', value: state.size });
    } else if (state.product === 'customblend') {
      if (state.blend) items.push({ label: 'Blend', value: state.blend });
      if (state.author) items.push({ label: 'Created by', value: state.author });
      /* Clan: flag a missing or unknown handle, so staff don't print a plain label by mistake */
      if (state.clanProduct) {
        var clanDef = clanFor();
        items.push({ label: 'Clan', value: clanDef ? clanDef.name : state.clan ? state.clan + ' (not found)' : '(none chosen)' });
      }
    } else {
      if (state.distillery) items.push({ label: 'Product', value: state.distillery });
    }
    if (state.product !== 'nipbeforechristmas') {
      if (state.text) items.push({ label: state.product === 'doctorsspecial' ? 'Prescribed for' : 'Label text', value: state.text });
      /* (a clan label has no style: the tartan is the artwork) */
      if (state.variant && state.product !== 'doctorsspecial' && !state.clanProduct) items.push({ label: 'Style', value: state.variant });
      if (state.size) items.push({ label: 'Size', value: state.size });
    }

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
    var infoH = 56;

    /* Info strip */
    var info = document.createElement('div');
    info.className = 'wb-side-panel';
    info.style.cssText = [
      'box-sizing:border-box',
      'position:absolute',
      'top:' + d.panelTop + 'px',
      'left:47px',
      'width:' + d.panelLength + 'px',
      'height:' + infoH + 'px',
      'transform:rotate(90deg)',
      'transform-origin:left top',
      'clip-path:' + buildZigzagClip(d.panelLength, infoH, 8, 5),
      'background-color:' + state.bg,
      'color:' + state.fg,
      'text-shadow:none',
      'display:grid',
      'grid-template-columns:1fr 1fr 1fr',
      'align-items:center',
      'padding:' + pad,
      'z-index:2',
    ].join(';');

    /* d.blank → an empty white strip (New custom blend), same shape, no content. */
    if (!d.blank) {
      var tallStyle = 'font-family:Antonio,sans-serif;font-weight:300;font-size:' + d.tallFont + 'px;text-transform:uppercase;letter-spacing:-0.5px';
      info.innerHTML =
        '<span style="' + tallStyle + '">' + esc(state.strength || '46') + '% abv</span>' +
        '<span style="font-size:' + d.domainFont + 'px;font-weight:700;text-align:center;letter-spacing:0.4px;font-family:Raleway,sans-serif">whiskyblender.com</span>' +
        '<span style="' + tallStyle + ';text-align:right">' + esc(sizeText) + '</span>';
    }
    label.appendChild(info);

    /* Single cask strip — also drawn (blank, no SVG) for the New custom-blend blank
       panel, so its white area matches single cask exactly (this strip's zigzag,
       at left:scCaskLeft, is the outer edge; it overlaps and hides the info strip's). */
    if (state.product === 'singlecask' || d.blank) {
      /* Custom blend (blank) uses a bigger white strip — wider (height 80 vs 70)
         and shifted left (112 vs scCaskLeft). Single cask keeps its original size. */
      var scH = d.blank ? 80 : 70;
      var scLeft = d.blank ? 112 : d.scCaskLeft;
      var sc = document.createElement('div');
      sc.className = 'wb-side-panel';
      sc.style.cssText = [
        'box-sizing:border-box',
        'position:absolute',
        'top:' + d.panelTop + 'px',
        'left:' + scLeft + 'px',
        'width:' + d.panelLength + 'px',
        'height:' + scH + 'px',
        'padding-top:6px',
        'transform:rotate(90deg)',
        'transform-origin:left top',
        'clip-path:' + buildZigzagClip(d.panelLength, scH, 8, 5),
        'background-color:' + state.bg,
        'color:' + state.fg,
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'z-index:2',
      ].join(';');
      var svgTemplate = d.blank ? null : document.getElementById('wb-singlecask-svg');
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

  /* Plain stock: print "Create your own at whiskyblender.com", which the old
     stock carried. Removed when not on the plain layout. tone: a clan label's
     'white' / 'black' — on tartan, not in the artwork's white pill, so it takes
     the label's tone and shadow instead of dark ink */
  function renderPlainPrint(tone) {
    var label = document.getElementById('label');
    if (!label) return;
    var old = label.querySelectorAll('.wb-plain-print');
    old.forEach(function (el) { el.parentNode.removeChild(el); });
    if (!onPlainLayout()) return;

    var ink = tone ? (tone === 'white' ? '#ffffff' : '#111111') : '';
    var shade = tone ? (tone === 'white' ? '#000000' : '#ffffff') : '';
    var g = PLAIN[state.size];
    var c = g.cyo;
    [['Create your own at', 500, c[1]], ['whiskyblender.com', 700, c[2]]].forEach(function (line) {
      var el = document.createElement('div');
      el.className = 'wb-plain-print wb-plain-cyo';
      el.textContent = line[0];
      el.style.cssText = [
        'left:' + c[0] + 'px',
        'top:' + (line[2] - c[3] * 0.92) + 'px',
        'font-size:' + c[3] + 'px',
        'font-weight:' + line[1]
      ].concat(tone ? ['color:' + ink, 'text-shadow:1px 1px 0 ' + shade] : []).join(';');
      label.appendChild(el);
    });
  }

  function renderLabel() {
    /* Template version → body class. New overrides key off wb-tpl-new, Classic off
       wb-tpl-classic; the two are mutually exclusive so their CSS never competes. */
    document.body.classList.toggle('wb-tpl-new', state.template === 'new');
    document.body.classList.toggle('wb-tpl-classic', state.template === 'classic');

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

    var d = getDims();
    var page = document.getElementById('page');
    var label = document.getElementById('label');
    if (!page || !label) return;

    /* Size + product class */
    var sizeClass = state.size === '500ml' ? 'size50' : 'size20';
    var productClass = (state.product === 'singlemalt' || state.product === 'singlecask' || state.product === 'doctorsspecial' || state.product === 'nipbeforechristmas') ? state.product : '';
    page.className = (sizeClass + ' ' + productClass).trim();
    /* Plain stock: one artwork area per size for every product (wb-label.css #page.wb-plain) */
    if (onPlainLayout()) page.classList.add('wb-plain');
    /* Clan labels: centred text (wb-label.css #page.wb-clan-label) */
    if (clanActive()) page.classList.add('wb-clan-label');
    /* "Halloween" label style: carved lettering (wb-label.css .wb-halloween + snippets/wb-halloween-carve) */
    if (state.product === 'customblend' && !state.clanProduct && slugify(state.variant) === 'halloween') page.classList.add('wb-halloween');
    /* "Christmas" label style: Chicle name (wb-label.css .wb-christmas) */
    if (state.product === 'customblend' && !state.clanProduct && slugify(state.variant) === 'christmas') page.classList.add('wb-christmas');

    /* Artwork — singlecask shares singlemalt image files */
    var artworkEl = document.getElementById('artwork');
    var artworkProduct = state.product === 'singlecask' ? 'singlemalt' : state.product;
    var artworkUrl = getArtworkUrl(artworkProduct, state.variant, state.size);
    if (artworkEl) artworkEl.style.backgroundImage = artworkUrl ? 'url(' + artworkUrl + ')' : 'none';

    /* Clan: the tartan replaces the style artwork, and sets the text tone */
    var clan = clanActive();
    var clanTone = (clan && artworkEl) ? paintClan(artworkEl, clan) : null;

    /* Label text colour — fixed by product type, independent of fg/bg picker.
       customblend: black; singlemalt/singlecask: white (text sits on dark artwork);
       clan: from the tartan */
    var isBlend = state.product === 'customblend';
    var labelColor  = isBlend ? '#111111' : '#ffffff';
    var labelShadow = isBlend ? '#ffffff' : '#000000';
    if (clanTone) {
      labelColor  = clanTone === 'white' ? '#ffffff' : '#111111';
      labelShadow = clanTone === 'white' ? '#000000' : '#ffffff';
    }

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

    /* Side label ("Distilled at" — single malt/cask; "Created by" — custom blend on
       the plain stock, where it's no longer pre-printed) */
    var sideLabelEl = document.getElementById('sideLabel');
    if (sideLabelEl) {
      if (isBlend && !onPlainLayout()) {
        sideLabelEl.style.display = 'none';
      } else {
        sideLabelEl.style.display = '';
        sideLabelEl.textContent = isBlend ? 'Created by' : 'Distilled at';
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
      /* on tartan the reference takes the label's tone; otherwise the CSS colour */
      refEl.style.color = clanTone ? labelColor : '';
      refEl.style.textShadow = clanTone ? '1px 1px 0 ' + labelShadow : '';
    }

    renderPlainPrint(clanTone);

    /* Doctors' Special: name in the "Prescribed for" box; no blend name, side
       name, "Distilled at" (hidden by CSS) or side strips. */
    if (state.product === 'doctorsspecial') {
      removeSidePanels();
      var dsName = document.getElementById('dsName');
      if (dsName) {
        dsName.textContent = (state.text || '').slice(0, DS_MAX_CHARS);   /* fixed 18px — wb-label.css */
      }
      return;
    }

    /* The Nip Before Christmas: To / From on the artwork's dashed lines (fixed
       16px, rotated to match — wb-label.css); nothing else is printed. */
    if (state.product === 'nipbeforechristmas') {
      removeSidePanels();
      var nipTo = document.getElementById('nipTo');
      var nipFrom = document.getElementById('nipFrom');
      if (nipTo) nipTo.textContent = (state.text || '').slice(0, NIP_MAX_CHARS);
      if (nipFrom) nipFrom.textContent = (state.author || '').slice(0, NIP_MAX_CHARS);
      return;
    }

    /* Side panel — single malt / single cask (ABV / domain / ml strip); on the
       plain stock every product gets that strip */
    if (state.product !== 'customblend' || onPlainLayout()) {
      /* panelTop shifts to roundelTop (4) so strip sits alongside the artwork */
      renderSidePanel(Object.assign({}, d, { panelTop: d.roundelTop }));
    } else if (state.template === 'new' && state.size === '500ml') {
      /* New custom blend: a blank white side strip, same shape as the single
         malt / cask one but with no content. */
      renderSidePanel(Object.assign({}, d, { panelTop: d.roundelTop, blank: true }));
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
            '<div class="wb-mini-name-outer"><div class="wb-mini-name">' + esc(name || 'Whisky Name') + '</div></div>' +
            '<div class="wb-mini-by">By</div>' +
            '<div class="wb-mini-author">' + esc(author || '—') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wb-mini-strip wb-mini-strip--right">' +
          (ref ? '<span class="wb-mini-ref">' + esc(ref) + '</span>' : '') +
          '<span>' + esc(strength) + '% abv. · 50ml</span>' +
        '</div>' +
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
    for (var i = 1; i <= SLOT_COUNT; i++) {
      html += (i >= state.slotFrom && i <= state.slotTo)
        ? buildMiniLabel()
        : '<div class="wb-mini-label wb-mini-empty"><span>' + i + '</span></div>';
    }
    grid.innerHTML = html;

    renderMiniPageSummary(page);
    renderMiniPageRecipe(page);
    if (typeof fitToScreen === 'function') fitToScreen();

    document.fonts.ready.then(function () {
      requestAnimationFrame(function () {
        document.querySelectorAll('.wb-mini-name').forEach(resizeMiniName);
      });
    });
  }

  function renderMiniPageSummary(page) {
    var el = page.querySelector('.wb-mini-page-top');
    if (!el) {
      el = document.createElement('div');
      el.className = 'wb-mini-page-top';
      page.appendChild(el);
    }
    var items = [];
    if (state.productname) items.push({ label: 'Product',  value: state.productname });
    if (state.reference)   items.push({ label: 'Order',    value: state.reference });
    if (state.blend)       items.push({ label: 'Blend',    value: state.blend });
    if (state.text)        items.push({ label: 'Name',     value: state.text });
    if (state.author)      items.push({ label: 'By',       value: state.author });
    if (state.strength)    items.push({ label: 'Strength', value: state.strength + '% abv · 50ml' });
    el.innerHTML = items.map(function (item) {
      return '<span class="wb-mpt-item">'
        + '<span class="wb-mpt-label">' + esc(item.label) + '</span>'
        + '<span class="wb-mpt-value">' + esc(item.value) + '</span>'
        + '</span>';
    }).join('');
  }

  function renderMiniPageRecipe(page) {
    var el = page.querySelector('.wb-mini-page-bottom');
    if (!el) {
      el = document.createElement('div');
      el.className = 'wb-mini-page-bottom';
      page.appendChild(el);
    }
    if (!state.recipe || !Array.isArray(state.recipe)) { el.innerHTML = ''; return; }
    var items = state.recipe.filter(function (r) { return r.amount > 0; });
    if (!items.length) { el.innerHTML = ''; return; }
    var lis = items.map(function (item) {
      var ml = Math.round(item.amount * 600 / 100);
      return '<li class="wb-mpr-item">'
        + '<span class="wb-mpr-swatch" style="background:' + esc(item.colour || '#ccc') + '"></span>'
        + '<span class="wb-mpr-ml">' + esc(String(ml)) + 'ml</span>'
        + '<span class="wb-mpr-name">' + esc(item.name) + '</span>'
        + '</li>';
    }).join('');
    el.innerHTML = '<ul class="wb-mpr-list">' + lis + '</ul>';
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

    /* The Nip Before Christmas carries a recipe too (11 Oct 2026): the All rounder
       by default, or the customer's own blend from the Lab. */
    /* Doctors' Special: a fixed recipe — the two casks it is made from (Andrew,
       27 Oct 2026). Staff only, below the crops like a custom blend's. */
    if (state.product === 'doctorsspecial') {
      panel.style.display = '';
      if (loading) loading.style.display = 'none';
      if (error) error.style.display = 'none';
      list.innerHTML = DS_CASKS.map(function (c) {
        return '<li>' +
          '<span class="wb-recipe-ml">' + esc(String(c.ml)) + 'ml</span>' +
          '<span class="wb-recipe-name">' + esc(c.name) + '</span>' +
          '</li>';
      }).join('');
      list.style.display = 'flex';
      return;
    }

    if (state.product !== 'customblend' && state.product !== 'nipbeforechristmas') {
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

    var d = getDims();
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
        var isMiniNow = (state.product === 'miniatures') || (state.product === 'customblend' && state.size === '50ml');
        if (isMiniNow) { renderContactSheet(); } else { renderRecipePanel(); }
        if (onDone) onDone(result.data);
      })
      .catch(function () {
        showRecipeError('Could not load recipe. Check your connection.');
      });
  }

  /* ── Full render ───────────────────────────────────────────────────────────── */

  /* ── Stock tag: which pre-printed label each product is overprinted on ─────
     Printed outside the left crop line so the lab loads the right stock
     (Andrew, 13 Oct 2026). Miniatures print on contact sheets: no tag. */
  var STOCK = {
    customblend:        'Custom Blended Malt Scotch Whisky (roundel)',
    singlemalt:         'Single Malt Scotch Whisky (roundel)',
    singlecask:         'Single Malt Scotch Whisky (roundel)',
    doctorsspecial:     'Blended Malt Scotch Whisky (blank)',
    nipbeforechristmas: 'Blended Malt Scotch Whisky (blank)'
  };

  /* The new plain-front stocks (PLAN-LABELS-UNIFIED.md): one per malt type */
  var STOCK_PLAIN = {
    customblend:        'Blended Malt Scotch Whisky (plain)',
    singlemalt:         'Single Malt Scotch Whisky (plain)',
    singlecask:         'Single Malt Scotch Whisky (plain)',
    doctorsspecial:     'Blended Malt Scotch Whisky (plain)',
    nipbeforechristmas: 'Blended Malt Scotch Whisky (plain)'
  };

  function renderStock() {
    var el = document.getElementById('wb-stock');
    if (!el) return;
    var stock = (state.plain ? STOCK_PLAIN : STOCK)[state.product];
    el.textContent = stock ? 'Stock: ' + stock : '';
  }

  /* ── Bottle tag: which bottle to fill, outside the RIGHT crop line, opposite
     the stock tag (Andrew, 27 Oct 2026). Only products with one fixed bottle. */
  var BOTTLE = {
    doctorsspecial: '500ml round (black)'
  };

  function renderBottle() {
    var el = document.getElementById('wb-bottle');
    if (!el) return;
    var bottle = BOTTLE[state.product];
    el.textContent = bottle ? 'Bottle: ' + bottle : '';
  }

  /* Doctors' Special is two casks, in ml of the 500ml bottle */
  var DS_CASKS = [
    { ml: 400, name: 'Glasgow' },
    { ml: 100, name: 'Craigellachie' }
  ];

  /* ── Finished-label view: overprint on a photo of its blank stock ───────────
     The same stock photos as the product-page previews (wb-single-malt.js).
     Only stocks we have a photo for; others hide the toggle. (Andrew, 14 Oct 2026.
     Missing: single malt blank, 200ml single malt, and single malt on the taller
     New template.) */
  var showFinished = false;

  function mockFor() {
    var p = state.product;
    /* Plain stock: the single malt blank photo is the plain front with the taller
       bars (500ml). No 200ml photo yet; Doctors' / the Nip have no plain photo. */
    if (state.plain) return onPlainLayout() && state.size === '500ml' ? 'singlemaltlabelmockblank.webp' : null;
    if (p === 'customblend') {
      if (state.size === '200ml') return 'customblendlabelmock200.webp';
      if (state.size === '500ml') return state.template === 'new' ? 'customblendlabelmock500.webp' : 'customblendlabelmock.webp';
      return null;
    }
    if ((p === 'singlemalt' || p === 'singlecask') && state.size === '500ml' && state.template !== 'new') return 'singlemaltlabelmock.webp';
    if (p === 'doctorsspecial') return 'blendlabelmock.webp';
    if (p === 'nipbeforechristmas') return 'blendlabelmock200.webp';
    return null;
  }

  function renderFinished() {
    var btn  = document.getElementById('wb-btn-finished');
    var page = document.getElementById('page');
    var root = document.getElementById('wb-label-root');
    var mock = mockFor();
    if (!mock) showFinished = false;
    if (btn) {
      btn.hidden = !mock;
      btn.setAttribute('aria-pressed', showFinished ? 'true' : 'false');
      btn.textContent = showFinished ? 'Show overprint only' : 'Show finished label';
    }
    document.body.classList.toggle('wb-finished', showFinished);
    if (page) {
      var base = (root && root.getAttribute('data-asset-base')) || '';
      page.style.setProperty('--wb-mock', mock ? 'url("' + base + mock + '")' : 'none');
    }
  }

  /* ── Phones: scale the print page to fit the screen (screen-only CSS zoom) ──
     The page keeps its real pixel size, so Print is unaffected. */
  function fitToScreen() {
    if (document.body.classList.contains('wb-preview-mode')) return;
    var wrap = document.getElementById('wb-page-wrapper');
    if (!wrap) return;
    var sheet = document.getElementById('wb-contact-sheet');
    var useSheet = sheet && getComputedStyle(sheet).display !== 'none';
    var el = useSheet ? document.getElementById('wb-contact-page') : document.getElementById('page');
    if (!el) return;
    var cs = getComputedStyle(el);
    var w = parseFloat(cs.width) + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      + Math.min(0, parseFloat(cs.marginLeft)) + Math.min(0, parseFloat(cs.marginRight));
    var avail = wrap.clientWidth - (useSheet ? 16 : 0);
    var fit = w > 0 ? Math.min(1, avail / w) : 1;
    document.documentElement.style.setProperty('--wb-fit', fit.toFixed(4));
  }
  window.addEventListener('resize', fitToScreen);

  function render() {
    renderSummary();
    renderLabel();
    renderRecipePanel();
    renderStock();
    renderBottle();
    renderFinished();
    fitToScreen();
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

    if (t)        t.value        = state.clanProduct ? 'clan' : state.product;
    if (blend)    blend.value    = state.blend;
    if (text)     text.value     = state.text;
    if (author)   author.value   = state.author;
    if (dist)     dist.value     = state.distillery;
    if (strength) strength.value = state.strength;
    if (size)     size.value     = state.size;
    /* order links say variant=Birthday; the options are slugs (the artwork lookup slugifies too) */
    if (variant)  variant.value  = slugify(state.variant);
    if (fg)       fg.value       = state.fg;
    if (bg)       bg.value       = state.bg;
    if (ref)      ref.value      = state.reference;
    if (pname)    pname.value    = state.productname || '';   /* not "undefined" when the link has none */
    var slotFrom = document.getElementById('wb-f-slotfrom');
    var slotTo   = document.getElementById('wb-f-slotto');
    if (slotFrom) slotFrom.value = state.slotFrom;
    if (slotTo)   slotTo.value   = state.slotTo;

    var legacy = document.getElementById('wb-f-legacy');
    if (legacy) legacy.checked = (state.template === 'classic');
    var plain = document.getElementById('wb-f-plain');
    if (plain) plain.checked = state.plain;
    var clanSel = document.getElementById('wb-f-clan');
    if (clanSel) {
      /* options come from wb-tartan.js, so the clan list lives in one place */
      if (clanSel.options.length === 1 && window.WBTartan) {
        window.WBTartan.CLANS.forEach(function (c) { clanSel.add(new Option(c.name, c.handle)); });
      }
      clanSel.value = clanFor() ? state.clan : '';
    }

    updateTypeVisibility();
  }

  function updateTypeVisibility() {
    var isBlend = state.product === 'customblend';
    var isMalt  = state.product === 'singlemalt' || state.product === 'singlecask';
    var isMini  = state.product === 'miniatures';
    var isDoctors = state.product === 'doctorsspecial';
    var isNip = state.product === 'nipbeforechristmas';

    /* Doctors' Special: the text is the "Prescribed for" name. The Nip Before
       Christmas: text is "To", author is "From". Style and size are fixed on both. */
    var textLabel = document.querySelector('label[for="wb-f-text"]');
    if (textLabel) textLabel.textContent = isDoctors ? 'Prescribed for' : isNip ? 'To' : 'Label text';
    var textInput = document.getElementById('wb-f-text');
    if (textInput) textInput.maxLength = isDoctors ? DS_MAX_CHARS : isNip ? NIP_MAX_CHARS : 32;
    var authorLabel = document.querySelector('label[for="wb-f-author"]');
    if (authorLabel) authorLabel.textContent = isNip ? 'From' : 'Created by';
    var authorInput = document.getElementById('wb-f-author');
    if (authorInput) authorInput.maxLength = isNip ? NIP_MAX_CHARS : 32;
    /* (Clan: no style either — the tartan is the artwork) */
    document.querySelectorAll('.wb-has-style').forEach(function (el) {
      el.style.display = (isDoctors || isNip || state.clanProduct) ? 'none' : '';
    });

    /* Blend code: customblend + The Nip Before Christmas */
    document.querySelectorAll('.wb-blendcode-only').forEach(function (el) {
      el.style.display = (isBlend || isNip) ? '' : 'none';
    });
    /* Author ("Created by"): customblend + miniature */
    document.querySelectorAll('.wb-has-author').forEach(function (el) {
      el.style.display = (isBlend || isMini || isNip) ? '' : 'none';
    });
    /* Distillery + fg/bg pickers: singlemalt + singlecask only */
    document.querySelectorAll('.wb-singlemalt-only').forEach(function (el) {
      el.style.display = isMalt ? '' : 'none';
    });
    /* Strength: singlemalt + singlecask + miniature */
    document.querySelectorAll('.wb-has-strength').forEach(function (el) {
      el.style.display = (isMalt || isMini) ? '' : 'none';
    });
    /* Bottle size: all except miniature, Doctors' Special (500ml only) and
       The Nip Before Christmas (200ml only) */
    document.querySelectorAll('.wb-nonmini-only').forEach(function (el) {
      el.style.display = (isMini || isDoctors || isNip) ? 'none' : '';
    });
    /* Label range: the miniature contact sheet only (miniatures, or custom blend at 50ml) */
    var isSheet = isMini || (isBlend && state.size === '50ml');
    document.querySelectorAll('.wb-sheet-only').forEach(function (el) {
      el.style.display = isSheet ? '' : 'none';
    });
    /* Label template toggle: 500ml only (only 500ml has a New template); not on the
       plain stock, which has one layout */
    document.querySelectorAll('.wb-500-only').forEach(function (el) {
      el.style.display = (state.size === '500ml' && !isMini && !isDoctors && !isNip && !state.plain) ? '' : 'none';
    });
    /* Plain-stock box: everything but the miniature contact sheet, and not Clan
       (always plain) */
    document.querySelectorAll('.wb-plain-toggle').forEach(function (el) {
      el.style.display = (isSheet || state.clanProduct) ? 'none' : '';
    });
    /* Clan list: the Clan product only */
    document.querySelectorAll('.wb-clan-only').forEach(function (el) {
      el.style.display = state.clanProduct ? '' : 'none';
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
        /* Clan = custom blend on a clan tartan, always on the plain stock; starts on
           the default tartan (Dramlover), changed with the Clan list. Leaving Clan
           puts the stock back to the default. */
        var wasClan = state.clanProduct;
        var prevProduct = state.product;
        state.clanProduct = (t.value === 'clan');
        state.product = state.clanProduct ? 'customblend' : t.value;
        if (state.clanProduct) {
          state.plain = true;
          if (!state.clan) state.clan = 'dramlover';
          if (state.size !== '500ml' && state.size !== '200ml') {
            state.size = '500ml';
            var clanSizeSel = document.getElementById('wb-f-size');
            if (clanSizeSel) clanSizeSel.value = '500ml';
          }
        } else if (wasClan) {
          state.clan = '';
          state.plain = PLAIN_STOCK_DEFAULT;
        }
        var plainCbx = document.getElementById('wb-f-plain');
        if (plainCbx) plainCbx.checked = state.plain;
        var clanSelx = document.getElementById('wb-f-clan');
        if (clanSelx) clanSelx.value = state.clan;
        /* Clan <-> Custom Blend is the same blend, so keep its recipe */
        if (state.product !== prevProduct) state.recipe = null;
        if (state.product === 'customblend') state.fg = '#111111';
        /* Re-apply the per-product template default (defaultTemplate) and sync the
           Legacy checkbox, matching readParams. Keeps the in-form product switcher
           from leaving a malt/cask on New on today's stock. */
        state.template = defaultTemplate();
        if (state.product === 'doctorsspecial') {
          state.size = '500ml';
          state.template = 'classic';
          var sizeSel = document.getElementById('wb-f-size');
          if (sizeSel) sizeSel.value = '500ml';
        }
        if (state.product === 'nipbeforechristmas') {
          state.size = '200ml';
          state.template = 'classic';
          var nipSizeSel = document.getElementById('wb-f-size');
          if (nipSizeSel) nipSizeSel.value = '200ml';
        }
        var legacyCb = document.getElementById('wb-f-legacy');
        if (legacyCb) legacyCb.checked = (state.template === 'classic');
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

    /* Label range: typing applies straight away without rewriting the field being
       typed in; on change (blur, Enter, spinner) both fields show the clamped values. */
    [['slotFrom', 'wb-f-slotfrom', 'from'], ['slotTo', 'wb-f-slotto', 'to']].forEach(function (f) {
      var el = document.getElementById(f[1]);
      if (!el) return;
      el.addEventListener('input', function () {
        if (isNaN(parseInt(el.value, 10))) return;
        state[f[0]] = el.value;
        normaliseSlots(f[2]);
        var other = document.getElementById(f[2] === 'from' ? 'wb-f-slotto' : 'wb-f-slotfrom');
        if (other) other.value = f[2] === 'from' ? state.slotTo : state.slotFrom;
        render();
      });
      el.addEventListener('change', function () {
        state[f[0]] = el.value;
        normaliseSlots(f[2]);
        syncFormToState();
        render();
      });
    });

    var size = document.getElementById('wb-f-size');
    if (size) {
      size.addEventListener('change', function () {
        state.size = size.value;
        updateTypeVisibility();
        render();
      });
    }

    var legacyToggle = document.getElementById('wb-f-legacy');
    if (legacyToggle) {
      legacyToggle.addEventListener('change', function () {
        state.template = legacyToggle.checked ? 'classic' : 'new';
        render();
      });
    }

    var plainToggle = document.getElementById('wb-f-plain');
    if (plainToggle) {
      plainToggle.addEventListener('change', function () {
        state.plain = plainToggle.checked;
        state.template = defaultTemplate();
        var legacyCb = document.getElementById('wb-f-legacy');
        if (legacyCb) legacyCb.checked = (state.template === 'classic');
        updateTypeVisibility();
        render();
      });
    }

    var clanToggle = document.getElementById('wb-f-clan');
    if (clanToggle) {
      clanToggle.addEventListener('change', function () {
        state.clan = clanToggle.value;
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

    /* Finished-label toggle (screen only; Print still outputs the overprint) */
    var finishedBtn = document.getElementById('wb-btn-finished');
    if (finishedBtn) {
      finishedBtn.addEventListener('click', function () {
        showFinished = !showFinished;
        renderFinished();
        fitToScreen();
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
        ((state.product === 'singlemalt' || state.product === 'singlecask' || state.product === 'doctorsspecial' || state.product === 'nipbeforechristmas') && !state.text)
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
      /* miniatures too: its contact sheet shows the recipe along the bottom (it was
         only ever fetched via product=customblend&size=50ml, so ?product=miniatures had none) */
      if ((state.product === 'customblend' || state.product === 'nipbeforechristmas' || state.product === 'miniatures') && state.blend) {
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
