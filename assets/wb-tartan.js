/* Clan tartans (PLAN-CLAN-BOTTLES.md, 27 Oct 2026). A tartan is drawn from its
   thread count — no artwork files — so the same code serves the label page's
   print and, later, the product-page preview. window.WBTartan:
     CLANS        the clan list (handle → name, label text, aliases the clan picker
                  also matches, sett, colours, source; optional tone: 'white' or
                  'black' to fix the text colour instead of the automatic rule)
     find(handle) a clan by handle, or null
     draw(canvas, clan, repeatPx)  2/2 twill filling the canvas, the sett's
                                   mirror axis on the canvas centre; repeatPx =
                                   one full sett repeat in canvas px
     tone(canvas, x, y, w, h)      text tone for that area of the canvas
   Historic thread counts are PROVISIONAL until checked against the original
   books; Dramlover is our own design. Not on sale yet. */
(function () {
  'use strict';

  /* Thread counts: "R/36 G6 ..." with "/" marking a pivot (symmetric sett,
     mirrored about the pivots); no "/" = the full repeat. */
  var CLANS = [
    { handle: 'dramlover', name: 'Dramlover', label: 'Clan Dramlover', aliases: [],
      sett: 'D/4 A36 W2 A6 G24 D3 G24 A6 Y/2',
      colours: { A: '#b8741a', D: '#3a2416', G: '#107a5f', W: '#efe3c2', Y: '#d9a536' },
      source: 'Original Whisky Blender design (draft colours)' },
    { handle: 'nicolson', name: 'Nicolson', label: 'Clan Nicolson', aliases: ['MacNicol', 'Nicholson', 'Nicol'],
      sett: 'R/36 G6 R36 K24 R6 T6 R6 G48 R36 K6 R36 G/6',
      colours: { R: '#c80000', G: '#006818', K: '#101010', T: '#8b5e34' },
      source: 'PROVISIONAL: McIan/Logan 1845, as listed by tartandictionary.org' },
    { handle: 'davidson', name: 'Davidson', label: 'Clan Davidson', aliases: ['Davison'],
      sett: 'R/4 B24 G4 B4 G32 K4 G32 K4 G4 K24 R/4',
      colours: { R: '#c80000', B: '#2c2c80', G: '#006818', K: '#101010' },
      source: 'PROVISIONAL: Stewart 1893; sources disagree on G32 vs G24' },
    { handle: 'bruce', name: 'Bruce', label: 'Clan Bruce', aliases: [],
      sett: 'R32 G8 R8 G24 R4 G24 R8 G8 R32 Y4 R32 G8 R8 G24 R4 G24 R8 G8 R32 W4',
      colours: { R: '#c80000', G: '#006818', Y: '#e8c000', W: '#e0e0e0' },
      source: 'PROVISIONAL: Vestiarium Scoticum 1842, reconstruction (chart lost)' },
    { handle: 'macleod-of-lewis', name: 'MacLeod of Lewis', label: 'Clan MacLeod', aliases: ['MacLeod', 'McLeod', 'Macleod'],
      tone: 'white',   /* Andrew, 31 Oct 2026: reads better white; the centred name sits on mostly yellow */
      sett: 'K/32 Y4 K32 Y48 R/4',
      colours: { K: '#101010', Y: '#d8b000', R: '#c80000' },
      source: 'PROVISIONAL: Vestiarium Scoticum 1842, as listed by tartandictionary.org' }
  ];

  function find(handle) {
    for (var i = 0; i < CLANS.length; i++) if (CLANS[i].handle === handle) return CLANS[i];
    return null;
  }

  function parse(sett) {
    var toks = sett.trim().split(/\s+/).map(function (t) {
      var m = /^([A-Z]+)\/?(\d+)\/?$/i.exec(t);
      return { c: m[1].toUpperCase(), n: +m[2], pivot: t.indexOf('/') !== -1 };
    });
    var symmetric = toks.some(function (t) { return t.pivot; });
    var full = symmetric ? toks.concat(toks.slice(1, -1).reverse()) : toks;
    var threads = [];
    full.forEach(function (t) { for (var i = 0; i < t.n; i++) threads.push(t.c); });
    return threads;
  }

  function hex(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  /* The sett's first mirror axis, in threads from the start of the repeat: the
     first pivot for a "/" sett, found by search for a full repeat (Bruce); 0 if
     the sett has none. Thread i mirrors thread c - 1 - i about axis c / 2. */
  function axis(threads) {
    var n = threads.length;
    for (var c = 0; c < 2 * n; c++) {
      var ok = true;
      for (var i = 0; i < n && ok; i++) ok = threads[i] === threads[(((c - 1 - i) % n) + n) % n];
      if (ok) return c / 2;
    }
    return 0;
  }

  /* 2/2 twill: each cell shows the warp (vertical) or weft (horizontal) thread;
     the weft is shaded slightly for a woven look. The sett's mirror axis sits on
     the canvas centre both ways (Andrew, 31 Oct 2026: tartan centred on the label,
     as the text is; the artwork area is centred on the label horizontally). */
  function draw(canvas, clan, repeatPx) {
    var threads = parse(clan.sett), n = threads.length, px = repeatPx / n;
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    var img = ctx.createImageData(w, h), d = img.data, rgb = {};
    var a = axis(threads), ox = w / 2 / px - a, oy = h / 2 / px - a;
    Object.keys(clan.colours).forEach(function (k) { rgb[k] = hex(clan.colours[k]); });
    for (var y = 0; y < h; y++) {
      var ty = Math.floor(y / px - oy), weft = rgb[threads[((ty % n) + n) % n]];
      for (var x = 0; x < w; x++) {
        var tx = Math.floor(x / px - ox), warp = ((tx + ty) & 3) < 2;
        var c = warp ? rgb[threads[((tx % n) + n) % n]] : weft, s = warp ? 1 : 0.94, i = (y * w + x) * 4;
        d[i] = c[0] * s; d[i + 1] = c[1] * s; d[i + 2] = c[2] * s; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function lum(r, g, b) {
    function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  }

  /* White text (black shadow) unless over 60% of the area is too light for it
     (under 3:1 against white); then black (white shadow). Andrew, 27 Oct 2026:
     busy black-and-yellow MacLeod reads better in white, so the rule leans white. */
  function tone(canvas, x, y, w, h) {
    x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
    w = Math.max(1, Math.min(canvas.width - x, Math.round(w)));
    h = Math.max(1, Math.min(canvas.height - y, Math.round(h)));
    var d = canvas.getContext('2d').getImageData(x, y, w, h).data;
    var count = d.length / 4, light = 0;
    for (var i = 0; i < count; i++) {
      if (1.05 / (lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) + 0.05) < 3) light++;
    }
    var share = light / count;
    return { text: share > 0.6 ? 'black' : 'white', lightShare: share };
  }

  window.WBTartan = { CLANS: CLANS, find: find, draw: draw, tone: tone };
})();
