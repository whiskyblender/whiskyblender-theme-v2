/* confetti.min.js — inlined to avoid separate asset load */
var confetti={maxCount:150,speed:2,frameInterval:15,alpha:1,gradient:!1,start:null,stop:null,toggle:null,pause:null,resume:null,togglePause:null,remove:null,isPaused:null,isRunning:null};!function(){confetti.start=s,confetti.stop=w,confetti.toggle=function(){e?w():s()},confetti.pause=u,confetti.resume=m,confetti.togglePause=function(){i?m():u()},confetti.isPaused=function(){return i},confetti.remove=function(){stop(),i=!1,a=[]},confetti.isRunning=function(){return e};var t=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame,n=["rgba(30,144,255,","rgba(107,142,35,","rgba(255,215,0,","rgba(255,192,203,","rgba(106,90,205,","rgba(173,216,230,","rgba(238,130,238,","rgba(152,251,152,","rgba(70,130,180,","rgba(244,164,96,","rgba(210,105,30,","rgba(220,20,60,"],e=!1,i=!1,o=Date.now(),a=[],r=0,l=null;function d(t,e,i){return t.color=n[Math.random()*n.length|0]+(confetti.alpha+")"),t.color2=n[Math.random()*n.length|0]+(confetti.alpha+")"),t.x=Math.random()*e,t.y=Math.random()*i-i,t.diameter=10*Math.random()+5,t.tilt=10*Math.random()-10,t.tiltAngleIncrement=.07*Math.random()+.05,t.tiltAngle=Math.random()*Math.PI,t}function u(){i=!0}function m(){i=!1,c()}function c(){if(!i)if(0===a.length)l.clearRect(0,0,window.innerWidth,window.innerHeight),null;else{var n=Date.now(),u=n-o;(!t||u>confetti.frameInterval)&&(l.clearRect(0,0,window.innerWidth,window.innerHeight),function(){var t,n=window.innerWidth,i=window.innerHeight;r+=.01;for(var o=0;o<a.length;o++)t=a[o],!e&&t.y<-15?t.y=i+100:(t.tiltAngle+=t.tiltAngleIncrement,t.x+=Math.sin(r)-.5,t.y+=.5*(Math.cos(r)+t.diameter+confetti.speed),t.tilt=15*Math.sin(t.tiltAngle)),(t.x>n+20||t.x<-20||t.y>i)&&(e&&a.length<=confetti.maxCount?d(t,n,i):(a.splice(o,1),o--))}(),function(t){for(var n,e,i,o,r=0;r<a.length;r++){if(n=a[r],t.beginPath(),t.lineWidth=n.diameter,i=n.x+n.tilt,e=i+n.diameter/2,o=n.y+n.tilt+n.diameter/2,confetti.gradient){var l=t.createLinearGradient(e,n.y,i,o);l.addColorStop("0",n.color),l.addColorStop("1.0",n.color2),t.strokeStyle=l}else t.strokeStyle=n.color;t.moveTo(e,n.y),t.lineTo(i,o),t.stroke()}}(l),o=n-u%confetti.frameInterval),requestAnimationFrame(c)}}function s(t,n,o){var r=window.innerWidth,u=window.innerHeight;window.requestAnimationFrame=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(t){return window.setTimeout(t,confetti.frameInterval)};var m=document.getElementById("confetti-canvas");null===m?((m=document.createElement("canvas")).setAttribute("id","confetti-canvas"),m.setAttribute("style","display:block;z-index:999999;pointer-events:none;position:fixed;top:0"),document.body.prepend(m),m.width=r,m.height=u,window.addEventListener("resize",function(){m.width=window.innerWidth,m.height=window.innerHeight},!0),l=m.getContext("2d")):null===l&&(l=m.getContext("2d"));var s=confetti.maxCount;if(n)if(o)if(n==o)s=a.length+o;else{if(n>o){var f=n;n=o,o=f}s=a.length+(Math.random()*(o-n)+n|0)}else s=a.length+n;else o&&(s=a.length+o);for(;a.length<s;)a.push(d({},r,u));e=!0,i=!1,c(),t&&window.setTimeout(w,t)}function w(){e=!1}}();

(function () {
  'use strict';

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  function renderRecipe(blend, labUrl, inactiveIds) {
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

    var changeHref = labUrl ? labUrl + '?blend=' + encodeURIComponent(blend.slug) : '#';

    recipeEl.innerHTML =
      '<p class="wb-blend-ref">Blend code: ' + esc(blend.slug) +
      ' <a href="' + esc(changeHref) + '">(Change)</a></p>' +
      '<ul class="wb-recipe">' + rows + '</ul>';

    show(recipeEl);
  }

  function populateInputs(blend) {
    var labelInput  = document.getElementById('label-text');
    var authorInput = document.getElementById('created-by');
    if (labelInput  && !labelInput.value)  labelInput.value  = blend.title  || '';
    if (authorInput && !authorInput.value) authorInput.value = blend.author || '';
  }

  function injectCartProperties(blend, variantsJson, labelPage, bottleSize) {
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
      } catch (err) {}

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

  function hideBuyForm() {
    hide(document.querySelector('[name="add"]'));
    hide(document.querySelector('.product-form__quantity'));
    var bottleForms = document.querySelectorAll('.wb-bottle-form');
    for (var i = 0; i < bottleForms.length; i++) { hide(bottleForms[i]); }
  }

  function showBuyForm(slug) {
    document.documentElement.classList.remove('wb-blend-loading');
    show(document.querySelector('[name="add"]'));
    show(document.querySelector('.product-form__quantity'));
    var bottleForms = document.querySelectorAll('.wb-bottle-form');
    for (var i = 0; i < bottleForms.length; i++) { show(bottleForms[i]); }
    fireConfetti(slug);
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
    var labHref  = (labUrl && slug) ? labUrl + '?blend=' + encodeURIComponent(slug) : '/pages/the-lab';
    var nameList = names.map(function (n) { return '‘' + esc(n) + '’'; }).join(', ');
    var verb     = names.length === 1 ? 'is' : 'are';
    var warn     = document.createElement('div');
    warn.className = 'wb-inactive-warning';
    warn.innerHTML =
      '<p>' + nameList + ' ' + verb + ' no longer available.</p>' +
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
    var defaultText = btnSpan ? btnSpan.textContent.trim() : '';

    function syncBtn() {
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
  }

  function showNoBlendState(failedSlug) {
    hideBuyForm();
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

  function init() {
    var container = document.getElementById('wb-blend-product-loader');
    if (!container) return;

    var apiBase      = (container.getAttribute('data-api-base') || '').replace(/\/$/, '');
    var labUrl       = container.getAttribute('data-lab-url')   || '';
    var labelPage    = container.getAttribute('data-label-page') || '/pages/label';
    var bottleSize   = container.getAttribute('data-bottle-size') || '';
    var variantsEl   = document.getElementById('wb-variants-data');
    var variantsJson = variantsEl ? variantsEl.textContent : '[]';
    var slug         = new URLSearchParams(window.location.search).get('blend');

    if (!slug) {
      showNoBlendState();
      return;
    }

    patchProductLinks(slug);
    hideBuyForm();

    var loadingEl = document.getElementById('wb-blend-loading');
    show(loadingEl);

    Promise.all([
      fetch(apiBase + '/api/blend?slug=' + encodeURIComponent(slug))
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        }),
      fetch(apiBase + '/api/whisky-options')
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; }),
    ])
      .then(function (results) {
        hide(loadingEl);
        var blendResult   = results[0];
        var activeOptions = results[1];

        if (!blendResult.ok) {
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

        renderRecipe(blend, labUrl, inactiveIds);
        populateInputs(blend);

        if (inactiveIds.length > 0) {
          showInactiveWarning(inactiveNames, slug, labUrl);
          return;
        }

        injectCartProperties(blend, variantsJson, labelPage, bottleSize);
        showBuyForm(slug);
        initInputGuard();
      })
      .catch(function () {
        hide(loadingEl);
        showNoBlendState(slug);
        showError('We can\'t find that blend. Either your code is wrong or it\'s an old one, sorry. Check it and try again, or <a href="/pages/the-lab">create a new one</a>.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
