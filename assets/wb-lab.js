/**
 * WB Lab — Interactive whisky blending controls
 *
 * Manages flavour percentages via +/− buttons, updates the pie chart
 * visualisation and the sticky fill meter in real time.
 *
 * Expects DOM produced by snippets/wb-lab-markup.liquid.
 */
(function () {
  'use strict';

  var STEP = 5;
  var MAX_TOTAL = 100;

  function init() {
    var container = document.getElementById('wb-lab-flavours');
    if (!container) return;

    /* ── Build flavour state from card elements ── */
    var flavourCards = container.querySelectorAll('li[data-flavour-index]');
    var flavours = [];

    flavourCards.forEach(function (card) {
      var idx = parseInt(card.getAttribute('data-flavour-index'), 10);
      flavours[idx] = {
        amount: 0,
        color: card.getAttribute('data-flavour-color'),
        card: card,
      };
    });

    if (flavours.length === 0) return;

    /* ── Helpers ── */
    function getTotal() {
      var sum = 0;
      for (var i = 0; i < flavours.length; i++) {
        sum += flavours[i].amount;
      }
      return sum;
    }

    /* Clamp a value to the nearest valid step (0 – 100) */
    function clamp(n) {
      return Math.max(0, Math.min(MAX_TOTAL, n));
    }

    /* ── UI update ── */
    function updateUI() {
      var total = getTotal();

      flavours.forEach(function (f, i) {
        /* Amount badge */
        var badge = f.card.querySelector('[data-amount-for="' + i + '"]');
        if (badge) {
          var text = badge.querySelector('.wb-liquidGlass-text');
          if (text) text.textContent = f.amount + '%';
          badge.style.display = f.amount > 0 ? '' : 'none';
        }

        /* + button */
        var addBtn = f.card.querySelector('[data-action="add"]');
        if (addBtn) {
          if (total >= MAX_TOTAL) {
            addBtn.classList.add('wb-disabled-option');
          } else {
            addBtn.classList.remove('wb-disabled-option');
          }
        }

        /* − button */
        var removeBtn = f.card.querySelector('[data-action="remove"]');
        if (removeBtn) {
          if (f.amount <= 0) {
            removeBtn.classList.add('wb-disabled-option');
          } else {
            removeBtn.classList.remove('wb-disabled-option');
          }
        }

        /* Pie slice */
        var pie = document.querySelector('[data-pie-for="' + i + '"]');
        if (pie) {
          /* Strip old wb-pie-N class and apply the new one */
          var classes = pie.className.replace(/\bwb-pie-\d+\b/g, '').trim();
          pie.className = classes + ' wb-pie-' + f.amount;
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
    }

    /* ── Event delegation ── */
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

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

  /* Run when DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
