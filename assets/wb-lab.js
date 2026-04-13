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
          if (total === 0) {
            label.textContent = '0% filled \u2014 add some flavours!';
          } else if (total < MAX_TOTAL) {
            label.textContent = total + '% filled';
          } else {
            label.textContent = '100% \u2014 your blend is ready!';
          }
        }
      }

      /* Save panel visibility */
      if (savePanel && !blendSaved) {
        if (total === MAX_TOTAL) {
          savePanel.classList.add('wb-save-panel--visible');
          savePanel.setAttribute('aria-hidden', 'false');
          savePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          savePanel.classList.remove('wb-save-panel--visible');
          savePanel.setAttribute('aria-hidden', 'true');
        }
      }
    }

    /* ── Save blend ── */
    if (saveBtn && savePanelData) {
      saveBtn.addEventListener('click', function () {
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

            /* Show success state */
            saveBtn.style.display = 'none';
            if (slugDisplay) slugDisplay.textContent = slug;
            if (productLink && savePanelData.productUrl) {
              productLink.href = savePanelData.productUrl + '?blend=' + encodeURIComponent(slug);
            }
            if (successEl) successEl.style.display = 'block';

            /* Confetti 🎉 */
            if (typeof confetti === 'function') {
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });
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

    /* ── Event delegation ── */
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (blendSaved) return;

      var action = btn.getAttribute('data-action');
      var idx = parseInt(btn.getAttribute('data-flavour-index'), 10);
      if (isNaN(idx) || !flavours[idx]) return;

      var total = getTotal();

      if (action === 'add' && total < MAX_TOTAL) {
        flavours[idx].amount = clamp(flavours[idx].amount + STEP);
      } else if (action === 'remove' && flavours[idx].amount > 0) {
        flavours[idx].amount = clamp(flavours[idx].amount - STEP);
      }

      updateUI();
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
