/* confetti.min.js — inlined to avoid separate asset load */
var confetti={maxCount:150,speed:2,frameInterval:15,alpha:1,gradient:!1,start:null,stop:null,toggle:null,pause:null,resume:null,togglePause:null,remove:null,isPaused:null,isRunning:null};!function(){confetti.start=s,confetti.stop=w,confetti.toggle=function(){e?w():s()},confetti.pause=u,confetti.resume=m,confetti.togglePause=function(){i?m():u()},confetti.isPaused=function(){return i},confetti.remove=function(){stop(),i=!1,a=[]},confetti.isRunning=function(){return e};var t=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame,n=["rgba(30,144,255,","rgba(107,142,35,","rgba(255,215,0,","rgba(255,192,203,","rgba(106,90,205,","rgba(173,216,230,","rgba(238,130,238,","rgba(152,251,152,","rgba(70,130,180,","rgba(244,164,96,","rgba(210,105,30,","rgba(220,20,60,"],e=!1,i=!1,o=Date.now(),a=[],r=0,l=null;function d(t,e,i){return t.color=n[Math.random()*n.length|0]+(confetti.alpha+")"),t.color2=n[Math.random()*n.length|0]+(confetti.alpha+")"),t.x=Math.random()*e,t.y=Math.random()*i-i,t.diameter=10*Math.random()+5,t.tilt=10*Math.random()-10,t.tiltAngleIncrement=.07*Math.random()+.05,t.tiltAngle=Math.random()*Math.PI,t}function u(){i=!0}function m(){i=!1,c()}function c(){if(!i)if(0===a.length)l.clearRect(0,0,window.innerWidth,window.innerHeight),null;else{var n=Date.now(),u=n-o;(!t||u>confetti.frameInterval)&&(l.clearRect(0,0,window.innerWidth,window.innerHeight),function(){var t,n=window.innerWidth,i=window.innerHeight;r+=.01;for(var o=0;o<a.length;o++)t=a[o],!e&&t.y<-15?t.y=i+100:(t.tiltAngle+=t.tiltAngleIncrement,t.x+=Math.sin(r)-.5,t.y+=.5*(Math.cos(r)+t.diameter+confetti.speed),t.tilt=15*Math.sin(t.tiltAngle)),(t.x>n+20||t.x<-20||t.y>i)&&(e&&a.length<=confetti.maxCount?d(t,n,i):(a.splice(o,1),o--))}(),function(t){for(var n,e,i,o,r=0;r<a.length;r++){if(n=a[r],t.beginPath(),t.lineWidth=n.diameter,i=n.x+n.tilt,e=i+n.diameter/2,o=n.y+n.tilt+n.diameter/2,confetti.gradient){var l=t.createLinearGradient(e,n.y,i,o);l.addColorStop("0",n.color),l.addColorStop("1.0",n.color2),t.strokeStyle=l}else t.strokeStyle=n.color;t.moveTo(e,n.y),t.lineTo(i,o),t.stroke()}}(l),o=n-u%confetti.frameInterval),requestAnimationFrame(c)}}function s(t,n,o){var r=window.innerWidth,u=window.innerHeight;window.requestAnimationFrame=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(t){return window.setTimeout(t,confetti.frameInterval)};var m=document.getElementById("confetti-canvas");null===m?((m=document.createElement("canvas")).setAttribute("id","confetti-canvas"),m.setAttribute("style","display:block;z-index:999999;pointer-events:none;position:fixed;top:0"),document.body.prepend(m),m.width=r,m.height=u,window.addEventListener("resize",function(){m.width=window.innerWidth,m.height=window.innerHeight},!0),l=m.getContext("2d")):null===l&&(l=m.getContext("2d"));var s=confetti.maxCount;if(n)if(o)if(n==o)s=a.length+o;else{if(n>o){var f=n;n=o,o=f}s=a.length+(Math.random()*(o-n)+n|0)}else s=a.length+n;else o&&(s=a.length+o);for(;a.length<s;)a.push(d({},r,u));e=!0,i=!1,c(),t&&window.setTimeout(w,t)}function w(){e=!1}}();

(function () {
  'use strict';

  /* Default recipe (11 Oct 2026). With no ?blend= in the URL the page used to
     hide the buy form behind "Enter the lab / Already have a blend code?". Now it
     loads this house blend instead — the Lab's "All rounder" preset button
     (page.lab-page.json preset_2) — so the customer only has to fill in the
     label, or hit Change to make their own. It goes through exactly the same
     load → cart-properties path as a real code, so the order carries
     _blend_slug / _blend_url as usual. Differences for the default: label
     fields start empty, no confetti, product links aren't stamped with the code,
     and _blend_title / _blend_author record what the customer typed (the panel
     in the order shows those as the label text — "All rounder / whiskyblender.com"
     would be wrong). If it can't load, the page falls back to the old panel. */
  var DEFAULT_BLEND = 'WB01767';

  /* House presets offered as a "Whisky" choice when a custom bottle opens without
     ?blend= (Andrew, 22 Oct 2026). Same codes as the Lab's house presets
     (sections/wb-lab.liquid preset_1..4); the All rounder is DEFAULT_BLEND and
     starts selected. Order = roughly how well they sell. */
  var HOUSE_PRESETS = [
    { slug: 'WB01767', name: 'All rounder' },
    { slug: 'WB00836', name: 'Smoke on the Water' },
    { slug: 'WB00820', name: 'Soft & fruity' },
    { slug: 'WB00821', name: 'Sweet tooth' }
  ];
  var chooserActive = false;   /* set by buildWhiskyChooser */

  /* ── Sold out (11 Oct 2026) ───────────────────────────────────────────
     Dawn renders the add button disabled with "Sold out" when the selected
     variant can't be bought, and re-renders that on every variant change. The
     "fill in your label" guards here and in the other product script toggle the
     same button, so they must never enable a sold-out variant: it showed as a
     live green "Sold out" button on Personalised 500ml round. Shared state lives
     on the button (data-wb-sold-out), so both scripts agree. */
  function wbSoldOutText() {
    return (window.variantStrings && window.variantStrings.soldOut) || 'Sold out';
  }
  function wbAddText(fallback) {
    return (window.variantStrings && window.variantStrings.addToCart) || fallback || 'Add to cart';
  }
  /* Call before anything touches the button: records whether it loaded sold out */
  function wbNoteSoldOut(btn) {
    if (!btn || btn.hasAttribute('data-wb-sold-out')) return;
    var span = btn.querySelector('span');
    var text = (span ? span.textContent : btn.textContent).trim();
    btn.setAttribute('data-wb-sold-out', (btn.disabled && text === wbSoldOutText()) ? '1' : '0');
  }
  function wbIsSoldOut(btn) { return !!btn && btn.getAttribute('data-wb-sold-out') === '1'; }
  /* Shows the sold-out state exactly as Dawn does (disabled, its own pale style) */
  function wbShowSoldOut(btn) {
    btn.disabled = true;
    btn.classList.remove('wb-button-disabled');
    var span = btn.querySelector('span');
    if (span) span.textContent = wbSoldOutText();
  }
  /* After Dawn finishes a variant change: record the new variant's sold-out
     state from the HTML it rendered, then re-run our guard — Dawn has just
     enabled the button ("Add to cart") without knowing about the label fields. */
  function wbOnVariantChange(btn, resync) {
    if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;
    subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
      var html = event && event.data && event.data.html;
      var rendered = html && html.querySelector('[id^="ProductSubmitButton-"]');
      if (rendered && btn) btn.setAttribute('data-wb-sold-out', rendered.hasAttribute('disabled') ? '1' : '0');
      setTimeout(resync, 0);
    });
  }

  /* External-label mode (data-label-mode="external" on the loader, 11 Oct 2026 —
     The Nip Before Christmas). The product's label belongs to another script
     (wb-single-malt.js: To/From, its own limits, guard, preview and _label_url),
     so this script handles only the RECIPE: load it (default or ?blend=), show it
     with Change, gate the buy form until it's loaded, and record _blend_slug. It
     doesn't touch the label inputs, the add-button guard or the counters, and it
     doesn't build _blend_url — instead it publishes the code on the loader as
     data-blend-slug, which wb-single-malt.js adds to _label_url as &blend=. */

  /* Where the Lab should send the customer after they save a blend: back to this
     product (keeping the chosen variant), not the bottle options page.
     wb-lab.js reads ?return= and only accepts a /products/ path. */
  function returnParam() {
    var variant = new URLSearchParams(window.location.search).get('variant');
    var path = window.location.pathname + (variant && /^\d+$/.test(variant) ? '?variant=' + variant : '');
    return 'return=' + encodeURIComponent(path);
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  function fetchWithTimeout(url, ms) {
    var ctrl = new AbortController();
    var id = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, { signal: ctrl.signal }).then(
      function (res) { clearTimeout(id); return res; },
      function (err) { clearTimeout(id); throw err; }
    );
  }

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

  /* When a blend IS present, the recipe reads better below the buy button (just
     above the description) than up in the buy box. Relocate it there once it's
     populated — the no-blend panel (blend-code entry) stays where it is. Falls
     back to placing it after the buy form if the description block is absent. */
  function moveRecipeBelowBuy(recipeEl) {
    var desc = document.querySelector('.product__description');
    if (desc && desc.parentNode) {
      desc.parentNode.insertBefore(recipeEl, desc);
      return;
    }
    var form = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    var buyBox = form ? (form.closest('product-form') || form) : null;
    if (buyBox && buyBox.parentNode) {
      buyBox.parentNode.insertBefore(recipeEl, buyBox.nextSibling);
    }
  }

  function renderRecipe(blend, labUrl, inactiveIds, isDefault) {
    var recipeEl = document.getElementById('wb-blend-recipe');
    if (!recipeEl) return;

    var inactiveSet = inactiveIds || [];
    var recipe  = Array.isArray(blend.recipe) ? blend.recipe : [];
    var maxAmt  = recipe.reduce(function (m, i) { return Math.max(m, i.amount || 0); }, 0);

    var rows = recipe
      .filter(function (i) { return i.amount > 0; })
      .map(function (item) {
        var isInactive = inactiveSet.indexOf(item.identifier) !== -1;
        var barLeft    = maxAmt > 0 ? ((item.amount / maxAmt) * 100).toFixed(1) + '%' : '0%';
        var bgColor    = isInactive ? '#cccccc' : esc(item.colour || '#cccccc');
        var liClass    = isInactive ? ' class="wb-recipe-item--inactive"' : '';
        return (
          '<li' + liClass + ' style="background-color:' + bgColor + '">' +
            '<span class="wb-label">' + esc(String(item.amount)) + '% ' + esc(item.name) + '</span>' +
            '<span class="wb-recipebar" style="left:' + barLeft + '"></span>' +
          '</li>'
        );
      })
      .join('');

    /* Change → the Lab, then straight back here once the new blend is saved.
       A real blend reopens in the Lab (?blend= fills its recipe, name and
       creator); the default opens a fresh Lab — the house blend's name isn't
       theirs to edit. */
    var changeHref = labUrl
      ? labUrl + '?' + (isDefault ? '' : 'blend=' + encodeURIComponent(blend.slug) + '&') + returnParam()
      : '#';

    var refHtml = isDefault
      ? 'Filled with our ' + esc(blend.title || 'house') + ' blend' +
        ' <a href="' + esc(changeHref) + '">(Change)</a>'
      : 'Blend code: ' + esc(blend.slug) +
        ' <a href="' + esc(changeHref) + '">(Change)</a>';

    /* With the Whisky chooser the bars sit under the preset pills, and the way out
       is "create your own" rather than "(Change)" */
    if (chooserActive) {
      recipeEl.innerHTML =
        '<ul class="wb-recipe">' + rows + '</ul>' +
        '<p class="wb-blend-ref"><a href="' + esc(changeHref) + '">Or create your own in the Lab \u2192</a></p>';
      show(recipeEl);
      return;
    }

    recipeEl.innerHTML =
      '<p class="wb-blend-ref">' + refHtml + '</p>' +
      '<ul class="wb-recipe">' + rows + '</ul>';

    show(recipeEl);
    moveRecipeBelowBuy(recipeEl);
  }

  /* External label (The Nip Before Christmas): only "From" comes from the blend —
     its creator. "To" is the recipient, so the blend name never goes there; it's
     left blank to fill in. Capped at the input's own limit (20), and the input
     event lets wb-single-malt.js update its preview, counter and guard. */
  function populateExternalFrom(blend) {
    var fromInput = document.getElementById('created-by');
    if (!fromInput || fromInput.value || !blend.author) return;
    var max = fromInput.maxLength > 0 ? fromInput.maxLength : 32;
    fromInput.value = [...String(blend.author)].slice(0, max).join('');
    fromInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* External label + default recipe that couldn't be loaded (API down, code
     missing, retired whisky). The Nip is pre-filled with the default, so it must
     stay buyable: record the default code, show the buy form, skip the recipe. */
  function useDefaultUnseen(container, variantsJson, labelPage, bottleSize, productTitle) {
    var blend = { slug: DEFAULT_BLEND, title: '', author: '' };
    injectCartProperties(blend, variantsJson, labelPage, bottleSize, productTitle, true, true);
    container.setAttribute('data-blend-slug', DEFAULT_BLEND);
    showBuyForm(DEFAULT_BLEND, true);
  }

  function houseSlug(value) {
    if (!value) return null;
    var match = HOUSE_PRESETS.filter(function (p) { return p.slug === value; })[0];
    return match ? match.slug : null;
  }

  /* ?label= from a Perfect Drams card: a starting point the customer can edit.
     Only fills an empty field, capped at 32 characters like the order property. */
  function prefillLabel(text) {
    var labelInput = document.getElementById('label-text');
    if (!labelInput || labelInput.value) return;
    labelInput.value = [...text].slice(0, 32).join('').trim();
    labelInput.dispatchEvent(new Event('input'));
  }

  function populateInputs(blend) {
    var labelInput  = document.getElementById('label-text');
    var authorInput = document.getElementById('created-by');
    if (labelInput && !labelInput.value) {
      labelInput.value = blend.title || '';
      labelInput.dispatchEvent(new Event('input'));
    }
    if (authorInput && !authorInput.value) authorInput.value = blend.author || '';
  }


  function injectCartProperties(blend, variantsJson, labelPage, bottleSize, productTitle, isDefault, externalLabel) {
    var form = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    if (!form) return;

    if (externalLabel) {
      /* Recipe only — the label link (_label_url, with &blend=) comes from
         wb-single-malt.js. The order panel shows the label's own properties. */
      form.addEventListener('formdata', function (e) {
        e.formData.set('properties[_blend_slug]',   blend.slug);
        e.formData.set('properties[_blend_title]',  blend.title || '');
        e.formData.set('properties[_blend_author]', blend.author || '');
      });
      return;
    }

    form.addEventListener('formdata', function (e) {
      var variantTitle = '';
      try {
        var variants = JSON.parse(variantsJson || '[]');
        var idInput  = form.querySelector('[name="id"]');
        if (idInput) {
          var selected = variants.find(function (v) { return String(v.id) === String(idInput.value); });
          if (selected) variantTitle = selected.title;
        }
      } catch (err) {}

      var labelText  = [...((document.getElementById('label-text') || {}).value || '')].slice(0, 32).join('');
      var authorText = [...((document.getElementById('created-by') || {}).value || '')].slice(0, 32).join('');

      var labelUrl = window.location.origin + (labelPage || '/pages/label') +
        '?blend='   + encodeURIComponent(blend.slug) +
        '&product=customblend' +
        '&variant=' + encodeURIComponent(variantTitle) +
        '&text='    + encodeURIComponent(labelText) +
        '&author='  + encodeURIComponent(authorText) +
        (bottleSize ? '&size=' + encodeURIComponent(bottleSize) : '') +
        (productTitle ? '&productname=' + encodeURIComponent(productTitle) : '');

      e.formData.set('properties[_blend_slug]',   blend.slug);
      /* Default recipe: the house blend's name and creator aren't the customer's —
         record what they typed, which is what the order panel shows as the label. */
      e.formData.set('properties[_blend_title]',  isDefault ? labelText  : blend.title);
      e.formData.set('properties[_blend_author]', isDefault ? authorText : blend.author);
      e.formData.set('properties[_blend_url]',    labelUrl);
    });
  }

  function hideBuyForm() {
    hide(document.querySelector('[name="add"]'));
    hide(document.querySelector('.product-form__quantity'));
    var bottleForms = document.querySelectorAll('.wb-bottle-form');
    for (var i = 0; i < bottleForms.length; i++) { hide(bottleForms[i]); }
  }

  function showBuyForm(slug, isDefault) {
    document.documentElement.classList.remove('wb-blend-loading');
    show(document.querySelector('[name="add"]'));
    show(document.querySelector('.product-form__quantity'));
    var bottleForms = document.querySelectorAll('.wb-bottle-form');
    for (var i = 0; i < bottleForms.length; i++) { show(bottleForms[i]); }
    if (!isDefault) fireConfetti(slug);   /* confetti celebrates THEIR blend */
  }

  function fireConfetti(slug) {
    if (typeof window.confetti === 'undefined' || typeof window.confetti.start !== 'function') return;
    try {
      var key = 'wb_confetti_' + slug;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (e) {}
    setTimeout(function () { window.confetti.start(); }, 600);
    setTimeout(function () { window.confetti.stop(); }, 4000);
  }

  function showInactiveWarning(names, slug, labUrl) {
    document.documentElement.classList.remove('wb-blend-loading');
    hideBuyForm();
    var recipeEl = document.getElementById('wb-blend-recipe');
    if (!recipeEl) return;
    var labHref  = (labUrl && slug) ? labUrl + '?blend=' + encodeURIComponent(slug) + '&' + returnParam() : '/pages/the-lab?' + returnParam();
    var nameList = names.map(function (n) { return '‘' + esc(n) + '’'; }).join(', ');
    var verb     = names.length === 1 ? 'is' : 'are';
    var warn     = document.createElement('div');
    warn.className = 'wb-inactive-warning';
    warn.innerHTML =
      '<p><strong>' + nameList + ' ' + verb + ' no longer available.</strong></p>' +
      '<p><a href="' + esc(labHref) + '">Return to the lab</a> to complete your recipe with our current whiskies.</p>';
    recipeEl.appendChild(warn);
  }

  function initInputGuard() {
    var form = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    if (!form) return;
    var labelInput  = document.getElementById('label-text');
    var authorInput = document.getElementById('created-by');
    var addBtn      = form.querySelector('[name="add"]');
    if (!addBtn) return;
    var btnSpan     = addBtn.querySelector('span');
    /* The button's own wording ("Add to cart"), captured in init() before any
       script changed it. Reading it here is too late on the 200ml/500ml pages:
       wb-single-malt.js has already set it to "Fill in label" on an empty label,
       and with the default recipe nothing refills it — so the button would keep
       saying "Fill in label" once enabled. */
    var defaultText = wbAddText(addBtn.getAttribute('data-wb-default-text') || (btnSpan ? btnSpan.textContent.trim() : ''));

    function syncBtn() {
      if (wbIsSoldOut(addBtn)) { wbShowSoldOut(addBtn); return; }
      var hasLabel  = labelInput  ? labelInput.value.trim().length  > 0 : true;
      var hasAuthor = authorInput ? authorInput.value.trim().length > 0 : true;
      var ok = hasLabel && hasAuthor;
      addBtn.disabled = !ok;
      addBtn.classList.toggle('wb-button-disabled', !ok);
      if (btnSpan) {
        if (ok)           btnSpan.textContent = defaultText;
        else if (!hasLabel) btnSpan.textContent = 'Fill in label';
        else              btnSpan.textContent = 'Add your name';
      }
    }

    syncBtn();
    if (labelInput)  labelInput.addEventListener('input', syncBtn);
    if (authorInput) authorInput.addEventListener('input', syncBtn);
    wbOnVariantChange(addBtn, syncBtn);
    if (labelInput)  addCounter(labelInput, 32);
    if (authorInput) addCounter(authorInput, 32);
  }

  function showNoBlendState(failedSlug) {
    document.documentElement.classList.remove('wb-blend-loading');
    hideBuyForm();
    var panel = document.getElementById('wb-noblend-panel');
    if (panel) {
      show(panel);
      /* "Enter the lab" comes back to this product after saving */
      var labLink = panel.querySelector('a[href^="/pages/the-lab"]');
      if (labLink) labLink.setAttribute('href', '/pages/the-lab?' + returnParam());
    }
    if (failedSlug) {
      var codeInput = document.getElementById('wb-blend-code-input');
      var codeBtn   = document.getElementById('wb-blend-code-go');
      if (codeInput) codeInput.value = failedSlug;
      if (codeBtn)   codeBtn.disabled = failedSlug.length < 6;
    }
    initCodeEntry();
  }

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
        codeBtn.disabled = true;
        codeBtn.textContent = 'Loading…';
        window.location.href = window.location.pathname + '?blend=' + encodeURIComponent(code);
      }
    }

    codeBtn.addEventListener('click', submit);
    codeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
  }

  function showError(html) {
    var el = document.getElementById('wb-blend-error');
    if (el) { el.innerHTML = html; show(el); }
  }

  function patchProductLinks(slug) {
    var scope = document.getElementById('MainContent') || document;
    scope.addEventListener('click', function (e) {
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

  /* "Whisky" choice on the default path: the house presets as pills above Label
     style, reusing the variant pill markup (the newlines between the pairs are
     what space the pills). The radios belong to no form. A choice reaches the
     order only by switching the one blend object that injectCartProperties reads
     at submit, so _blend_slug is always the recipe on screen; presets record like
     the default (the label is what the customer typed). A preset holding a
     retired whisky is disabled and the selection stays put. */
  function buildWhiskyChooser(blend, labUrl, apiBase, activeOptions) {
    /* Above Label style; minis have no Label style yet (one variant, so Dawn
       renders no variant-selects), so there it sits above the label text */
    var labelText = document.getElementById('label-text');
    var anchor   = document.querySelector('variant-selects') ||
                   (labelText && labelText.closest('.wb-bottle-form'));
    var recipeEl = document.getElementById('wb-blend-recipe');
    if (!anchor || !anchor.parentNode || !recipeEl) return false;

    var activeIds = activeOptions ? activeOptions.map(function (o) { return o.identifier; }) : null;
    var cache = {};
    cache[blend.slug] = { slug: blend.slug, title: blend.title, author: blend.author, recipe: blend.recipe };
    var pending = 0;

    var fs = document.createElement('fieldset');
    fs.className = 'wb-bottle-form js product-form__input product-form__input--pill wb-whisky-choice';
    fs.innerHTML =
      '<legend class="form__label">Whisky</legend>' +
      '<span class="wb-radio">' +
      HOUSE_PRESETS.map(function (p, i) {
        return '\n<input type="radio" id="wb-whisky-' + i + '" name="wb-whisky" value="' + esc(p.slug) + '"' +
          (p.slug === blend.slug ? ' checked' : '') + '>' +
          '\n    <label for="wb-whisky-' + i + '" data-wb-track="whisky_choice">\n      ' + esc(p.name) + '</label>';
      }).join('\n') +
      '\n</span>';
    anchor.parentNode.insertBefore(fs, anchor);
    fs.appendChild(recipeEl);

    function keepCurrent() {
      var current = fs.querySelector('input[value="' + blend.slug + '"]');
      if (current) current.checked = true;
    }

    fs.addEventListener('change', function (e) {
      var input = e.target;
      if (!input || input.name !== 'wb-whisky') return;
      var slug   = input.value;
      var ticket = ++pending;
      var got = cache[slug]
        ? Promise.resolve(cache[slug])
        : fetchWithTimeout(apiBase + '/api/blend?slug=' + encodeURIComponent(slug), 10000)
            .then(function (res) { if (!res.ok) throw new Error('blend ' + res.status); return res.json(); });
      got.then(function (data) {
        if (ticket !== pending) return;   /* a later tap won */
        var recipe  = Array.isArray(data.recipe) ? data.recipe : [];
        var retired = activeIds && recipe.some(function (item) {
          return item.amount > 0 && activeIds.indexOf(item.identifier) === -1;
        });
        if (retired || !recipe.length) { input.disabled = true; keepCurrent(); return; }
        cache[slug]  = data;
        blend.slug   = data.slug || slug;
        blend.title  = data.title;
        blend.author = data.author;
        blend.recipe = recipe;
        renderRecipe(blend, labUrl, [], true);
      }).catch(function () { if (ticket === pending) keepCurrent(); });
    });
    return true;
  }

  function init() {
    var container = document.getElementById('wb-blend-product-loader');
    if (!container) return;

    var apiBase      = (container.getAttribute('data-api-base') || '').replace(/\/$/, '');
    var labUrl       = container.getAttribute('data-lab-url')   || '';
    var labelPage    = container.getAttribute('data-label-page') || '/pages/label';
    var bottleSize    = container.getAttribute('data-bottle-size') || '';
    var productTitle  = container.getAttribute('data-product-title') || '';
    var variantsEl   = document.getElementById('wb-variants-data');
    var variantsJson = variantsEl ? variantsEl.textContent : '[]';
    var params       = new URLSearchParams(window.location.search);
    var slug         = params.get('blend');
    var isDefault    = !slug;
    /* Perfect Drams links (24 Oct 2026): ?preset=<house preset> starts the default
       path on that preset instead of the All rounder, and ?label= prefills the label.
       Only the HOUSE_PRESETS slugs count; anything else is ignored. */
    var presetSlug   = isDefault ? houseSlug(params.get('preset')) : null;
    var labelParam   = isDefault ? (params.get('label') || '').trim() : '';
    if (isDefault) slug = presetSlug || DEFAULT_BLEND;
    var externalLabel = container.getAttribute('data-label-mode') === 'external';

    /* A preset that won't load (or holds a retired whisky) falls back to the plain
       default path: drop ?preset= and start again, keeping ?label=. */
    function dropPreset() {
      params.delete('preset');
      var qs = params.toString();
      history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
      init();
    }

    /* Remember the add button's own wording before anything changes it (see initInputGuard) */
    var mainForm = document.querySelector('form[action="/cart/add"]:not([id*="installment"])');
    var mainAdd  = mainForm && mainForm.querySelector('[name="add"]');
    var mainSpan = mainAdd && mainAdd.querySelector('span');
    if (mainSpan && !mainAdd.hasAttribute('data-wb-default-text')) {
      mainAdd.setAttribute('data-wb-default-text', mainSpan.textContent.trim());
    }
    wbNoteSoldOut(mainAdd);

    if (!isDefault) patchProductLinks(slug);
    hideBuyForm();

    var loadingEl = document.getElementById('wb-blend-loading');
    show(loadingEl);

    Promise.all([
      fetchWithTimeout(apiBase + '/api/blend?slug=' + encodeURIComponent(slug), 10000)
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        }),
      fetchWithTimeout(apiBase + '/api/whisky-options', 10000)
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; }),
    ])
      .then(function (results) {
        hide(loadingEl);
        var blendResult   = results[0];
        var activeOptions = results[1];

        if (!blendResult.ok) {
          if (presetSlug) { dropPreset(); return; }
          if (isDefault && externalLabel) { useDefaultUnseen(container, variantsJson, labelPage, bottleSize, productTitle); return; }
          if (isDefault) { showNoBlendState(); return; }   /* default missing: old panel */
          showNoBlendState(slug);
          showError('We can\'t find that blend. Either your code is wrong or it\'s an old one, sorry. Check it and try again, or <a href="/pages/the-lab">create a new one</a>.');
          return;
        }

        var blend  = blendResult.data;
        var recipe = Array.isArray(blend.recipe) ? blend.recipe : [];

        var inactiveIds   = [];
        var inactiveNames = [];
        if (activeOptions !== null) {
          var activeIds     = activeOptions.map(function (o) { return o.identifier; });
          var inactiveItems = recipe.filter(function (item) {
            return item.amount > 0 && activeIds.indexOf(item.identifier) === -1;
          });
          inactiveIds   = inactiveItems.map(function (i) { return i.identifier; });
          inactiveNames = inactiveItems.map(function (i) { return i.name; });
        }

        /* Default uses a retired whisky: don't show it — fall back to the old panel */
        if (isDefault && inactiveIds.length > 0) {
          if (presetSlug) { dropPreset(); return; }
          if (externalLabel) { useDefaultUnseen(container, variantsJson, labelPage, bottleSize, productTitle); return; }
          showNoBlendState();
          return;
        }

        /* Default path: offer the house presets as a "Whisky" choice */
        if (isDefault && !externalLabel) {
          chooserActive = buildWhiskyChooser(blend, labUrl, apiBase, activeOptions);
        }

        renderRecipe(blend, labUrl, inactiveIds, isDefault);
        /* default: the label is theirs to fill; external label: not ours to fill */
        if (!isDefault && !externalLabel) populateInputs(blend);
        if (!isDefault && externalLabel) populateExternalFrom(blend);

        if (inactiveIds.length > 0) {
          showInactiveWarning(inactiveNames, slug, labUrl);
          return;
        }

        injectCartProperties(blend, variantsJson, labelPage, bottleSize, productTitle, isDefault, externalLabel);
        if (externalLabel) container.setAttribute('data-blend-slug', blend.slug);
        showBuyForm(slug, isDefault);
        if (!externalLabel) initInputGuard();
        if (isDefault && !externalLabel && labelParam) prefillLabel(labelParam);
      })
      .catch(function (err) {
        hide(loadingEl);
        if (presetSlug) { dropPreset(); return; }
        if (isDefault && externalLabel) { useDefaultUnseen(container, variantsJson, labelPage, bottleSize, productTitle); return; }
        if (isDefault) { showNoBlendState(); return; }
        showNoBlendState(slug);
        if (err && err.name === 'AbortError') {
          showError('The connection timed out. Please check your connection and try again.');
        } else {
          showError('We can\'t find that blend. Either your code is wrong or it\'s an old one, sorry. Check it and try again, or <a href="/pages/the-lab">create a new one</a>.');
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
