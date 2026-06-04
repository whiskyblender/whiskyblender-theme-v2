/**
 * WB Lab — Interactive whisky blending controls
 *
 * Fetches whisky options from the app API, renders the flavour cards,
 * manages flavour percentages via +/− buttons, updates the pie chart
 * visualisation and sticky fill meter in real time, and saves the
 * finished blend back to the app via POST /api/blends.
 */
(function () {
  'use strict';

  var STEP = 5;
  var MAX_TOTAL = 100;

  /* ── Visitor token ─────────────────────────────────────────────── */
  function getVisitorToken() {
    var key = 'wb_visitor_token';
    var token = localStorage.getItem(key);
    if (!token) {
      token = 'vt_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, token);
    }
    return token;
  }

  /* ── HTML helpers ──────────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildCardHTML(option, index) {
    var color = (option.colour || '').toLowerCase();
    var bgStyle = option.image ? 'background-image: url(\'' + option.image + '\')' : '';
    var caskStyle = option.caskImage ? 'background-image: url(\'' + option.caskImage + '\')' : '';

    return (
      '<li data-flavour-index="' + index + '"' +
          ' data-flavour-identifier="' + escapeHtml(option.identifier) + '"' +
          ' data-flavour-color="' + escapeHtml(color) + '">' +
        '<div class="wb-card-image wb-background-' + color + '-opacity"' +
            (bgStyle ? ' style="' + bgStyle + '"' : '') + '>' +
          '<div class="wb-cask"' + (caskStyle ? ' style="' + caskStyle + '"' : '') + '></div>' +
          '<div class="wb-option-amount wb-background-' + color + '" style="display:none">0%</div>' +
          '<div class="wb-option-controls">' +
            '<div class="wb-liquidGlass-wrapper wb-option-control wb-remove-option wb-' + color + '-option wb-disabled-option"' +
                ' data-action="remove" data-flavour-index="' + index + '">' +
              '<div class="wb-liquidGlass-effect"></div>' +
              '<div class="wb-liquidGlass-tint"></div>' +
              '<div class="wb-liquidGlass-shine"></div>' +
              '<span class="wb-liquidGlass-text">-</span>' +
            '</div>' +
            '<div class="wb-liquidGlass-wrapper wb-option-control wb-add-option wb-' + color + '-option"' +
                ' data-action="add" data-flavour-index="' + index + '">' +
              '<div class="wb-liquidGlass-effect"></div>' +
              '<div class="wb-liquidGlass-tint"></div>' +
              '<div class="wb-liquidGlass-shine"></div>' +
              '<span class="wb-liquidGlass-text">+</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wb-card-details">' +
          '<h3>' + escapeHtml(option.name) + '</h3>' +
          (option.tastingNote ? '<p>' + escapeHtml(option.tastingNote) + '</p>' : '') +
        '</div>' +
      '</li>'
    );
  }

  function buildPieHTML(option, index) {
    var color = (option.colour || '').toLowerCase();
    return '<div class="wb-pie wb-' + color + '-pie wb-pie-0" data-pie-for="' + index + '"><div></div></div>';
  }

  /* ── Main init ─────────────────────────────────────────────────── */
  function init() {
    var container = document.getElementById('wb-lab-flavours');
    if (!container) return;

    var apiBase = (container.getAttribute('data-api-base') || '').replace(/\/$/, '');
    if (!apiBase) {
      console.warn('[WB Lab] No API base URL configured in section settings.');
      return;
    }

    fetch(apiBase + '/api/whisky-options')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (options) {
        renderLab(container, options, apiBase);
      })
      .catch(function (err) {
        console.error('[WB Lab] Failed to load whisky options:', err);
      });
  }

  /* ── Render ────────────────────────────────────────────────────── */
  function renderLab(container, options, apiBase) {
    if (!options || options.length === 0) return;

    /* Inject flavour cards before the .wb-notoption pie cell */
    var notoption = container.querySelector('.wb-notoption');
    notoption.insertAdjacentHTML('beforebegin', options.map(buildCardHTML).join(''));

    /* Inject pie slices */
    var pieContainer = document.getElementById('wb-lab-pie');
    if (pieContainer) {
      pieContainer.innerHTML = options.map(buildPieHTML).join('');
    }

    /* Build flavour state — keep full option data for recipe building */
    var flavourCards = container.querySelectorAll('li[data-flavour-index]');
    var flavours = [];

    flavourCards.forEach(function (card) {
      var idx = parseInt(card.getAttribute('data-flavour-index'), 10);
      var opt = options[idx];
      flavours[idx] = {
        amount: 0,
        identifier: opt.identifier,
        name: opt.name,
        colour: opt.colour,
        abv: opt.abv,
        color: card.getAttribute('data-flavour-color'),
        card: card,
      };
    });

    /* ── Pre-load recipe from Perfect Drams sessionStorage ── */
    (function () {
      try {
        var params = new URLSearchParams(window.location.search);
        var code = params.get('blend');
        if (!code) return;
        var stored = sessionStorage.getItem('wb_' + code);
        if (!stored) return;
        var preload = JSON.parse(stored);
        if (!preload || !Array.isArray(preload.recipe)) return;
        preload.recipe.forEach(function (amount, idx) {
          if (flavours[idx] !== undefined) flavours[idx].amount = amount;
        });
      } catch (e) {}
    })();

    /* ── Save panel ── */
    var savePanel = document.getElementById('wb-save-panel');
    var saveBtn = document.getElementById('wb-save-blend-btn');
    var titleInput = document.getElementById('wb-blend-title');
    var authorInput = document.getElementById('wb-blend-author');
    var errorEl = document.getElementById('wb-save-error');
    var successEl = document.getElementById('wb-save-success');
    var slugDisplay = document.getElementById('wb-blend-slug-display');
    var productLink = document.getElementById('wb-blend-product-link');

    var savePanelData = savePanel ? {
      apiBase: (savePanel.getAttribute('data-api-base') || '').replace(/\/$/, ''),
      productId: savePanel.getAttribute('data-product-id') || '',
      variantId: savePanel.getAttribute('data-variant-id') || '',
      productUrl: savePanel.getAttribute('data-product-url') || '',
    } : null;

    var blendSaved = false;

    /* ── Helpers ── */
    function getTotal() {
      var sum = 0;
      for (var i = 0; i < flavours.length; i++) sum += flavours[i].amount;
      return sum;
    }

    function clamp(n) {
      return Math.max(0, Math.min(MAX_TOTAL, n));
    }

    /* ── UI update ── */
    function updateUI() {
      var total = getTotal();

      flavours.forEach(function (f, i) {
        /* Amount badge */
        var badge = f.card.querySelector('.wb-option-amount');
        if (badge) {
          badge.textContent = f.amount + '%';
          badge.style.display = f.amount > 0 ? '' : 'none';
        }

        /* + button */
        var addBtn = f.card.querySelector('[data-action="add"]');
        if (addBtn) {
          addBtn.classList.toggle('wb-disabled-option', total >= MAX_TOTAL);
        }

        /* − button */
        var removeBtn = f.card.querySelector('[data-action="remove"]');
        if (removeBtn) {
          removeBtn.classList.toggle('wb-disabled-option', f.amount <= 0);
        }

        /* Pie slice */
        var pie = document.querySelector('[data-pie-for="' + i + '"]');
        if (pie) {
          pie.className = pie.className.replace(/\bwb-pie-\d+\b/g, '').trim() + ' wb-pie-' + f.amount;
        }
      });

      /* Fill meter */
      var meter = document.getElementById('wb-lab-meter');
      if (meter) {
        var visual = meter.querySelector('.wb-lab-fillvisual');
        var label = meter.querySelector('.wb-lab-fillmeter span');
        if (visual) visual.style.width = total + '%';
        if (label) {
          label.textContent = total + '% filled';
        }
      }

      /* Save button state — disabled until blend is 100% and both fields are filled */
      if (saveBtn && !blendSaved) {
        var title  = titleInput  ? titleInput.value.trim()  : '';
        var author = authorInput ? authorInput.value.trim() : '';
        var ready  = (total === MAX_TOTAL && title.length > 0 && author.length > 0);

        saveBtn.classList.toggle('wb-button-disabled', !ready);

        if (total === 0) {
          saveBtn.textContent = 'Draw from casks';
        } else if (total < MAX_TOTAL) {
          saveBtn.textContent = 'Add more whisky';
        } else if (!title || !author) {
          saveBtn.textContent = 'Fill in your details';
        } else {
          saveBtn.textContent = 'Save my blend';
        }
      }
    }

    /* ── Save blend ── */
    if (saveBtn && savePanelData) {
      /* JS is running — hand off disabled state to CSS class only */
      saveBtn.removeAttribute('disabled');

      saveBtn.addEventListener('click', function () {
        /* Not ready — scroll back up to the blending options */
        if (saveBtn.classList.contains('wb-button-disabled')) {
          var flavoursEl = document.getElementById('wb-lab-flavours');
          if (flavoursEl) flavoursEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        var title = titleInput ? titleInput.value.trim() : '';
        var author = authorInput ? authorInput.value.trim() : '';

        if (!title) {
          showError('Please give your blend a name.');
          titleInput && titleInput.focus();
          return;
        }
        if (!author) {
          showError('Please add your name.');
          authorInput && authorInput.focus();
          return;
        }

        /* Build slots: { identifier: amount } for non-zero */
        var slots = {};
        var recipe = [];
        flavours.forEach(function (f) {
          if (f.amount > 0) {
            slots[f.identifier] = f.amount;
            recipe.push({
              identifier: f.identifier,
              name: f.name,
              colour: f.colour,
              abv: f.abv,
              amount: f.amount,
            });
          }
        });

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving\u2026';
        clearError();

        var payload = {
          title: title,
          author: author,
          slots: slots,
          recipe: recipe,
          productId: savePanelData.productId,
          visitorToken: getVisitorToken(),
        };
        if (savePanelData.variantId) {
          payload.variantId = savePanelData.variantId;
        }

        fetch(savePanelData.apiBase + '/api/blends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            return res.json().then(function (data) {
              return { ok: res.ok, data: data };
            });
          })
          .then(function (result) {
            if (!result.ok) {
              throw new Error(result.data.error || 'Save failed');
            }
            blendSaved = true;
            var slug = result.data.slug;

            /* Redirect straight to the bottle options page */
            if (savePanelData.productUrl) {
              window.location.href = savePanelData.productUrl + '?blend=' + encodeURIComponent(slug);
            }
          })
          .catch(function (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save my blend';
            showError(err.message || 'Something went wrong. Please try again.');
          });
      });
    }

    function showError(msg) {
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = '';
      }
    }

    function clearError() {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    }

    /* Re-evaluate button state when name/author fields change */
    if (titleInput)  titleInput.addEventListener('input',  updateUI);
    if (authorInput) authorInput.addEventListener('input', updateUI);

    /* ── Name generator ── */
    var generateBtn = document.getElementById('wb-generate-name');
    if (generateBtn && titleInput) {
      var adjectives = ['Braw','Gallus','Nippy','Dreich','Canny','Jaggy','Coorie','Stoatin','Crouse','Gleg','Reekin','Swanky','Glaikit','Drookit','Clarty','Puggled','Dour','Blate','Wabbit','Crabbit','Glen','Brae','Loch','Rare','Bonnie','Grand','Leal','Canty','Blithe','Douce','Wee','Auld','Couthie','Thrawn','Bauld','Pawky','Sonsie','Snell','Steamin','Radge','Daft','Trig','Bricht','Fou','Birlin','Blootered','Lang','Pure','Hoachin','Mingin'];
      var nouns      = ['Burn','Haar','Stane','Croft','Mist','Peat','Gloam','Brig','Wynd','Smirr','Dram','Rammy','Blether','Clyde','Knowe','Tattie','Scran','Quaich','Kist','Fairin','Drap','Toast','Hearth','Thistle','Plaid','Gill','Keek','Nip','Tryst','Ceilidh','Bothy','Heather','Tartan','Ben','Cairn','Corrie','Neuk','Hame','Kin','Donder','Stooshie','Skirl','Strath','Clachan','Birl','Haver','Guddle','Cratur','Uisge','Bawbag'];
      generateBtn.addEventListener('click', function () {
        titleInput.value = adjectives[Math.floor(Math.random() * adjectives.length)] + ' ' + nouns[Math.floor(Math.random() * nouns.length)];
        updateUI();
        titleInput.focus();
      });
    }

    /* ── Event delegation ── */
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (blendSaved) return;

      var action = btn.getAttribute('data-action');
      var idx = parseInt(btn.getAttribute('data-flavour-index'), 10);
      if (isNaN(idx) || !flavours[idx]) return;

      var totalBefore = getTotal();

      if (action === 'add' && totalBefore < MAX_TOTAL) {
        flavours[idx].amount = clamp(flavours[idx].amount + STEP);
      } else if (action === 'remove' && flavours[idx].amount > 0) {
        flavours[idx].amount = clamp(flavours[idx].amount - STEP);
      }

      updateUI();

      /* Scroll to the name/author form when the blend first hits 100% */
      if (action === 'add' && getTotal() === MAX_TOTAL) {
        var savePanel = document.getElementById('wb-save-panel');
        if (savePanel) savePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    /* Initial render */
    updateUI();
  }

  /* ── Bootstrap ─────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
