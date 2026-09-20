/**
 * wb-artwork-addon.js
 *
 * Two jobs, one file (it loads on product pages via the add-on snippet and globally
 * via cart-drawer.liquid, so the guard at the top stops it initialising twice):
 *
 *   1. Product page - reveal the add-on panel, and when it is ticked, add BOTH the
 *      bottle and the GBP20 artwork origination fee in a single /cart/add.js call.
 *   2. Anywhere - guard the cart against a stranded or duplicated fee line.
 *
 * Three things here are load-bearing. Changing them quietly breaks orders:
 *
 *   - The submit listener is attached to `document` with capture:true, NOT to the
 *     form. Dawn's ProductForm binds its own submit handler on the form element, and
 *     listeners on the target element fire in registration order regardless of the
 *     capture flag - so a capture listener on the form is not reliably first. Capture
 *     on an ancestor always precedes listeners on the target.
 *
 *   - The payload is built from `new FormData(form)`. Constructing a FormData FIRES
 *     the formdata event, which is how wb-blend-product.js and wb-single-malt.js
 *     inject _blend_slug / _blend_title / _blend_author / _blend_url / _label_url.
 *     Read the fields off the DOM instead and those properties vanish from exactly
 *     the orders that most need them - a bespoke bottle with no record of its blend.
 *
 *   - When the box is unticked this file does nothing at all and Dawn's normal path
 *     runs untouched. The override is opt-in, so the default journey carries no risk.
 */
(function () {
  'use strict';

  if (window.__wbArtworkAddonLoaded) return;
  window.__wbArtworkAddonLoaded = true;

  /* ------------------------------------------------------------------ helpers */

  function cartUrl(path) {
    var base = (window.routes && window.routes.cart_url) || '/cart';
    return base + path;
  }

  function addUrl() {
    return ((window.routes && window.routes.cart_add_url) || '/cart/add') + '.js';
  }

  function getCart() {
    return fetch(cartUrl('.js'), { headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json();
    });
  }

  /* -------------------------------------------------- product page: the panel */

  function initAddon(root) {
    if (root.__wbInit) return;
    root.__wbInit = true;

    var checkbox = root.querySelector('[data-wb-artwork-optin]');
    var panel = root.querySelector('[data-wb-artwork-panel]');
    if (!checkbox || !panel) return;

    // The checkbox keeps its name deliberately: it carries properties[Artwork]=Yes
    // whether or not this script runs, so a tick is never lost silently.
    var brief = panel.querySelector('[data-wb-artwork-brief]');

    function sync() {
      var on = !!checkbox.checked;
      panel.hidden = !on;
      if (brief) brief.disabled = !on;
    }

    checkbox.addEventListener('change', sync);
    sync();
  }

  function initAll() {
    var nodes = document.querySelectorAll('[data-wb-artwork-addon]');
    for (var i = 0; i < nodes.length; i++) initAddon(nodes[i]);
  }

  /* ------------------------------------------- product page: add bottle + fee */

  function addonForForm(form) {
    var scope = form.closest('.shopify-section') || document;
    return scope.querySelector('[data-wb-artwork-addon]');
  }

  function setLoading(button, on) {
    if (!button) return;
    var spinner = button.querySelector('.loading__spinner');
    if (on) {
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('loading');
      if (spinner) spinner.classList.remove('hidden');
    } else {
      button.removeAttribute('aria-disabled');
      button.classList.remove('loading');
      if (spinner) spinner.classList.add('hidden');
    }
  }

  function showError(productForm, message) {
    if (!productForm) return;
    var wrapper = productForm.querySelector('.product-form__error-message-wrapper');
    var target = productForm.querySelector('.product-form__error-message');
    if (!wrapper || !target) return;
    target.textContent = message || '';
    wrapper.toggleAttribute('hidden', !message);
  }

  /**
   * True when the fee is already in the cart, so it is never added twice.
   * On a network error this returns TRUE - deliberately. Skipping the fee
   * undercharges by GBP20 and a human reads every one of these orders; adding it
   * twice overcharges a customer, which is the worse of the two failures.
   */
  function cartHasFee(variantId) {
    return getCart()
      .then(function (cart) {
        return (cart.items || []).some(function (item) {
          return item.variant_id === variantId;
        });
      })
      .catch(function () {
        return true;
      });
  }

  function buildBottleItem(form) {
    var fd = new FormData(form); // fires `formdata` - see the header note
    var item = {
      id: fd.get('id'),
      quantity: parseInt(fd.get('quantity') || '1', 10) || 1,
      properties: {}
    };
    fd.forEach(function (value, key) {
      var match = key.match(/^properties\[(.+)\]$/);
      if (match && String(value).length) item.properties[match[1]] = value;
    });
    return item;
  }

  function submitWithFee(form, addon) {
    var productForm = form.closest('product-form');
    var button = productForm ? productForm.querySelector('[type="submit"]') : null;
    var feeId = parseInt(addon.getAttribute('data-fee-variant-id'), 10);

    setLoading(button, true);
    showError(productForm, '');

    var bottle = buildBottleItem(form);

    cartHasFee(feeId)
      .then(function (present) {
        var items = [bottle];
        if (!present && feeId) items.push({ id: feeId, quantity: 1 });

        var body = { items: items };
        var drawer = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (drawer && typeof drawer.getSectionsToRender === 'function') {
          body.sections = drawer.getSectionsToRender().map(function (s) {
            return s.id;
          });
          body.sections_url = window.location.pathname;
        }

        return fetch(addUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body)
        }).then(function (r) {
          return r.json();
        });
      })
      .then(function (response) {
        setLoading(button, false);

        if (response && response.status) {
          showError(productForm, response.description || response.message || 'Sorry, that could not be added.');
          return;
        }

        // Rendering is kept out of the promise chain above on purpose: an exception
        // thrown while painting the drawer must not be reported to the customer as
        // a failed add-to-cart. (A .catch() that swallows success-path errors has
        // bitten this theme before.)
        setTimeout(function () {
          renderCart(response, bottle.id);
        }, 0);
      })
      .catch(function () {
        setLoading(button, false);
        showError(productForm, 'Sorry, something went wrong adding this to your cart.');
      });
  }

  function renderCart(response, variantId) {
    var drawer = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

    if (!drawer || !response || !response.sections) {
      window.location = cartUrl('');
      return;
    }

    // Dawn strips `is-empty` off the cart drawer HOST in ProductForm's .finally()
    // (product-form.js:104), NOT in renderContents, which only clears it from
    // .drawer__inner. Miss this and a cart that was empty before the add renders a
    // blank drawer: totals and Checkout visible, every line hidden by CSS. It only
    // shows up when the cart starts empty, which is exactly the state a first
    // add-to-cart is in.
    if (drawer.classList.contains('is-empty')) drawer.classList.remove('is-empty');

    drawer.renderContents(response);

    if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS) {
      window.publish(window.PUB_SUB_EVENTS.cartUpdate, {
        source: 'product-form',
        productVariantId: variantId,
        cartData: response
      });
    }
  }

  document.addEventListener(
    'submit',
    function (evt) {
      var form = evt.target;
      if (!form || form.tagName !== 'FORM') return;
      if ((form.getAttribute('action') || '').indexOf('/cart/add') === -1) return;

      var addon = addonForForm(form);
      if (!addon) return;

      var checkbox = addon.querySelector('[data-wb-artwork-optin]');
      if (!checkbox || !checkbox.checked) return; // untouched: Dawn handles it

      evt.preventDefault();
      evt.stopPropagation();
      submitWithFee(form, addon);
    },
    true // capture, on document - see the header note
  );

  /* ------------------------------------------------------------- cart guard */

  function changeLine(line, quantity) {
    return fetch(cartUrl('/change.js'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity })
    });
  }

  /**
   * Removes a fee line left behind after its bottle was deleted, and pulls the fee
   * back to quantity 1 if it ever multiplies. Capped at one corrective reload per
   * session so a failing change can never loop.
   */
  function guardCart() {
    if (!window.wbArtworkFee || !window.wbArtworkFee.variantId) return;
    var feeId = window.wbArtworkFee.variantId;

    getCart()
      .then(function (cart) {
        var items = cart.items || [];
        var feeLine = 0;
        var feeQty = 0;
        var wanted = false;

        for (var i = 0; i < items.length; i++) {
          if (items[i].variant_id === feeId) {
            feeLine = i + 1;
            feeQty = items[i].quantity;
          } else if (items[i].properties && items[i].properties.Artwork) {
            wanted = true;
          }
        }

        if (!feeLine) return null;
        if (!wanted) return changeLine(feeLine, 0);
        if (feeQty > 1) return changeLine(feeLine, 1);
        return null;
      })
      .then(function (changed) {
        if (!changed) return;
        var key = 'wbArtworkGuardRan';
        try {
          if (sessionStorage.getItem(key)) return;
          sessionStorage.setItem(key, '1');
        } catch (e) {
          // Private mode or blocked storage: fall through and reload once anyway.
        }
        window.location.reload();
      })
      .catch(function () {
        /* a cart we cannot read is a cart we leave alone */
      });
  }

  /* ------------------------------------------------------------------- boot */

  function boot() {
    initAll();
    guardCart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Section re-renders (variant change, theme editor) reinstate the markup.
  document.addEventListener('shopify:section:load', initAll);
})();
