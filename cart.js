// Delt handlekurv via Shopify Storefront Cart API.
// Lagrer cart-id i localStorage og viser en drawer på alle shop-sider.
(function () {
  var DOMAIN = "tr92xp-z0.myshopify.com";
  var STOREFRONT_TOKEN = "ce1eebab03474d0860572ab66eb6af72";
  var API_VERSION = "2024-04";
  var STORAGE_KEY = "bergentees_cart_id";

  var COLOR_LABELS = {
    Black: "Svart",
    Navy: "Navy",
    White: "Hvit",
    Red: "Rød",
    "Light Blue": "Blå",
    "Light Pink": "Rosa",
  };

  var cart = null;
  var busy = false;

  var CART_FIELDS =
    "id checkoutUrl totalQuantity cost { totalAmount { amount currencyCode } } lines(first: 50) { edges { node { id quantity merchandise { ... on ProductVariant { id title image { url altText } price { amount } selectedOptions { name value } product { title } } } } } }";

  function gql(query, variables) {
    return fetch("https://" + DOMAIN + "/api/" + API_VERSION + "/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: query, variables: variables }),
    }).then(function (res) {
      return res.json();
    });
  }

  function getStoredId() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredId(id) {
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function optionLabel(option) {
    if (/color|colour|farge/i.test(option.name)) {
      return COLOR_LABELS[option.value] || option.value;
    }
    return option.value;
  }

  function formatPrice(amount) {
    return Number(amount).toFixed(2) + " kr";
  }

  function lineTotal(line) {
    return Number(line.merchandise.price.amount) * line.quantity;
  }

  function updateBadges() {
    var count = cart && cart.totalQuantity ? cart.totalQuantity : 0;
    document.querySelectorAll(".cart-btn").forEach(function (btn) {
      btn.textContent = "Handlekurv (" + count + ")";
    });
  }

  function ensureDrawer() {
    if (document.getElementById("cart-drawer")) return;

    var overlay = document.createElement("div");
    overlay.id = "cart-overlay";
    overlay.className = "cart-overlay";
    overlay.hidden = true;

    var drawer = document.createElement("aside");
    drawer.id = "cart-drawer";
    drawer.className = "cart-drawer";
    drawer.hidden = true;
    drawer.setAttribute("aria-label", "Handlekurv");
    drawer.innerHTML =
      '<div class="cart-drawer-header">' +
      '<h2 class="cart-drawer-title">Handlekurv</h2>' +
      '<button type="button" class="cart-close" aria-label="Lukk handlekurv">Lukk</button>' +
      "</div>" +
      '<div class="cart-drawer-body" id="cart-drawer-body"></div>' +
      '<div class="cart-drawer-footer" id="cart-drawer-footer"></div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener("click", closeDrawer);
    drawer.querySelector(".cart-close").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
  }

  function openDrawer() {
    ensureDrawer();
    renderDrawer();
    document.getElementById("cart-overlay").hidden = false;
    document.getElementById("cart-drawer").hidden = false;
    document.body.classList.add("cart-open");
  }

  function closeDrawer() {
    var overlay = document.getElementById("cart-overlay");
    var drawer = document.getElementById("cart-drawer");
    if (overlay) overlay.hidden = true;
    if (drawer) drawer.hidden = true;
    document.body.classList.remove("cart-open");
  }

  function renderDrawer() {
    ensureDrawer();
    var body = document.getElementById("cart-drawer-body");
    var footer = document.getElementById("cart-drawer-footer");
    if (!body || !footer) return;

    var lines =
      cart && cart.lines && cart.lines.edges
        ? cart.lines.edges.map(function (e) {
            return e.node;
          })
        : [];

    if (!lines.length) {
      body.innerHTML = '<p class="cart-empty">Handlekurven er tom.</p>';
      footer.innerHTML = "";
      return;
    }

    var html = '<ul class="cart-lines">';
    lines.forEach(function (line) {
      var m = line.merchandise;
      var opts = (m.selectedOptions || [])
        .slice()
        .sort(function (a, b) {
          var aColor = /color|colour|farge/i.test(a.name) ? 1 : 0;
          var bColor = /color|colour|farge/i.test(b.name) ? 1 : 0;
          return bColor - aColor;
        })
        .map(optionLabel)
        .filter(Boolean)
        .join(" / ");
      html += '<li class="cart-line" data-line-id="' + line.id + '">';
      html += '<div class="cart-line-image">';
      if (m.image && m.image.url) {
        html +=
          '<img src="' +
          m.image.url +
          '" alt="' +
          (m.image.altText || m.product.title) +
          '" />';
      }
      html += "</div>";
      html += '<div class="cart-line-main">';
      html += '<div class="cart-line-top">';
      html += '<div class="cart-line-text">';
      html += '<p class="cart-line-title">' + m.product.title + "</p>";
      if (opts) html += '<p class="cart-line-meta">' + opts + "</p>";
      html += "</div>";
      html += '<p class="cart-line-price">' + formatPrice(lineTotal(line)) + "</p>";
      html += "</div>";
      html += '<div class="cart-line-bottom">';
      html += '<div class="cart-line-qty">';
      html +=
        '<button type="button" class="cart-qty-btn" data-action="dec" aria-label="Reduser antall">−</button>';
      html += '<span class="cart-qty-value">' + line.quantity + "</span>";
      html +=
        '<button type="button" class="cart-qty-btn" data-action="inc" aria-label="Øk antall">+</button>';
      html += "</div>";
      html +=
        '<button type="button" class="cart-remove-btn" data-action="remove">Fjern</button>';
      html += "</div></div></li>";
    });
    html += "</ul>";
    body.innerHTML = html;

    var total =
      cart.cost && cart.cost.totalAmount
        ? cart.cost.totalAmount.amount
        : lines.reduce(function (sum, line) {
            return sum + lineTotal(line);
          }, 0);

    footer.innerHTML =
      '<div class="cart-total"><span>Totalt</span><span>' +
      formatPrice(total) +
      "</span></div>" +
      '<button type="button" class="buy-btn" id="cart-checkout-btn">Gå til kasse</button>';

    body.querySelectorAll(".cart-line").forEach(function (row) {
      var lineId = row.getAttribute("data-line-id");
      var qty = Number(row.querySelector(".cart-qty-value").textContent);
      row.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var action = btn.getAttribute("data-action");
          if (action === "inc") setLineQuantity(lineId, qty + 1);
          else if (action === "dec") setLineQuantity(lineId, qty - 1);
          else if (action === "remove") setLineQuantity(lineId, 0);
        });
      });
    });

    var checkoutBtn = document.getElementById("cart-checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", checkout);
    }
  }

  function applyCart(next) {
    cart = next;
    if (!cart) setStoredId(null);
    else setStoredId(cart.id);
    updateBadges();
    if (document.getElementById("cart-drawer") && !document.getElementById("cart-drawer").hidden) {
      renderDrawer();
    }
  }

  function fetchCart(id) {
    return gql(
      "query getCart($id: ID!) { cart(id: $id) { " + CART_FIELDS + " } }",
      { id: id }
    ).then(function (data) {
      return data.data && data.data.cart;
    });
  }

  function createCart(lines) {
    return gql(
      "mutation cartCreate($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { " +
        CART_FIELDS +
        " } userErrors { message } } }",
      { lines: lines || [] }
    ).then(function (data) {
      var payload = data.data && data.data.cartCreate;
      if (!payload) throw new Error("Kunne ikke opprette handlekurv");
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return payload.cart;
    });
  }

  function refresh() {
    var id = getStoredId();
    if (!id) {
      applyCart(null);
      return Promise.resolve(null);
    }
    return fetchCart(id)
      .then(function (next) {
        applyCart(next);
        return next;
      })
      .catch(function () {
        applyCart(null);
        return null;
      });
  }

  function addLine(variantId, quantity) {
    if (busy) return Promise.reject(new Error("Opptatt"));
    busy = true;
    var qty = quantity || 1;
    var lines = [{ merchandiseId: variantId, quantity: qty }];

    var promise;
    if (cart && cart.id) {
      promise = gql(
        "mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { " +
          CART_FIELDS +
          " } userErrors { message } } }",
        { cartId: cart.id, lines: lines }
      ).then(function (data) {
        var payload = data.data && data.data.cartLinesAdd;
        if (!payload) throw new Error("Kunne ikke legge til i handlekurv");
        if (payload.userErrors && payload.userErrors.length) {
          throw new Error(payload.userErrors[0].message);
        }
        return payload.cart;
      });
    } else {
      promise = createCart(lines);
    }

    return promise
      .then(function (next) {
        applyCart(next);
        busy = false;
        return next;
      })
      .catch(function (err) {
        busy = false;
        // Utløpt/ugyldig cart → start på nytt
        if (cart && cart.id) {
          applyCart(null);
          return addLine(variantId, qty);
        }
        throw err;
      });
  }

  function setLineQuantity(lineId, quantity) {
    if (!cart || !cart.id || busy) return Promise.resolve(cart);
    busy = true;

    var promise;
    if (quantity <= 0) {
      promise = gql(
        "mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { " +
          CART_FIELDS +
          " } userErrors { message } } }",
        { cartId: cart.id, lineIds: [lineId] }
      ).then(function (data) {
        var payload = data.data && data.data.cartLinesRemove;
        if (!payload) throw new Error("Kunne ikke fjerne vare");
        if (payload.userErrors && payload.userErrors.length) {
          throw new Error(payload.userErrors[0].message);
        }
        return payload.cart;
      });
    } else {
      promise = gql(
        "mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { " +
          CART_FIELDS +
          " } userErrors { message } } }",
        { cartId: cart.id, lines: [{ id: lineId, quantity: quantity }] }
      ).then(function (data) {
        var payload = data.data && data.data.cartLinesUpdate;
        if (!payload) throw new Error("Kunne ikke oppdatere antall");
        if (payload.userErrors && payload.userErrors.length) {
          throw new Error(payload.userErrors[0].message);
        }
        return payload.cart;
      });
    }

    return promise
      .then(function (next) {
        applyCart(next);
        busy = false;
        return next;
      })
      .catch(function () {
        busy = false;
        return refresh();
      });
  }

  function checkout() {
    if (!cart || !cart.checkoutUrl) return;
    window.location.href = cart.checkoutUrl;
  }

  function bindButtons() {
    document.querySelectorAll(".cart-btn").forEach(function (btn) {
      if (btn.getAttribute("data-cart-bound")) return;
      btn.setAttribute("data-cart-bound", "true");
      btn.addEventListener("click", function () {
        openDrawer();
      });
    });
  }

  window.BergenCart = {
    refresh: refresh,
    addLine: addLine,
    open: openDrawer,
    close: closeDrawer,
    checkout: checkout,
    getCart: function () {
      return cart;
    },
  };

  function init() {
    ensureDrawer();
    bindButtons();
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
