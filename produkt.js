// Henter produktdata fra Shopify Storefront API og bygger en egen produktside
// med knapper for farge/størrelse i stedet for Buy Button-widgetens drop-down.
(function () {
  var DOMAIN = "tr92xp-z0.myshopify.com";
  var STOREFRONT_TOKEN = "ce1eebab03474d0860572ab66eb6af72";
  var API_VERSION = "2024-04";

  var root = document.getElementById("product-detail");
  var PRODUCT_ID = "gid://shopify/Product/" + root.getAttribute("data-product-id");
  var selectedOptions = {};
  var HIDDEN_SIZE_VALUES = ["XL", "2XL", "3XL", "4XL", "5XL"];
  var SIZE_ORDER = ["S", "M", "L"];
  var DEFAULT_COLORS = {
    "15398585663622": "Navy",
    "15398630162566": "Red",
    "15398633275526": "Light Pink"
  };
  var COLOR_LABELS = {
    "Black": "Svart",
    "Navy": "Navy",
    "White": "Hvit",
    "Red": "Rød",
    "Light Blue": "Blå",
    "Light Pink": "Rosa"
  };

  function isSizeOption(option) {
    return /size|str/i.test(option.name);
  }

  function isColorOption(option) {
    return /color|colour|farge/i.test(option.name);
  }

  function visibleValues(option) {
    if (!isSizeOption(option)) return option.values;
    return option.values
      .filter(function (v) {
        return HIDDEN_SIZE_VALUES.indexOf(v) === -1;
      })
      .sort(function (a, b) {
        return SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b);
      });
  }

  function colorLabel(value) {
    return COLOR_LABELS[value] || value;
  }

  function defaultValue(option) {
    var values = visibleValues(option);
    if (isColorOption(option)) {
      var preferred = DEFAULT_COLORS[root.getAttribute("data-product-id")];
      if (preferred && values.indexOf(preferred) !== -1) {
        return preferred;
      }
    }
    return values[0];
  }

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

  function findVariant(product, options) {
    return product.variants.edges
      .map(function (e) {
        return e.node;
      })
      .find(function (variant) {
        return variant.selectedOptions.every(function (o) {
          return options[o.name] === o.value;
        });
      });
  }

  function isValueAvailable(product, optionName, value) {
    var candidate = Object.assign({}, selectedOptions);
    candidate[optionName] = value;
    return product.variants.edges.some(function (e) {
      var variant = e.node;
      return (
        variant.availableForSale &&
        variant.selectedOptions.every(function (o) {
          return !(o.name in candidate) || candidate[o.name] === o.value;
        })
      );
    });
  }

  function render(product) {
    var variant = findVariant(product, selectedOptions);
    var image = (variant && variant.image) || (product.images.edges[0] && product.images.edges[0].node);
    var price = variant ? variant.price : product.variants.edges[0].node.price;

    var html = "";
    html += '<div class="product-detail-image">';
    html += image
      ? '<img src="' + image.url + '" alt="' + (image.altText || product.title) + '" />'
      : "";
    html += "</div>";

    html += '<div class="product-detail-info">';
    html += '<div class="product-detail-heading">';
    html += '<h1 class="product-detail-title">' + product.title + "</h1>";
    html += '<p class="product-price">' + Number(price.amount).toFixed(2) + " kr</p>";
    html += "</div>";

    html += '<div class="product-options-wrapper">';
    product.options
      .slice()
      .sort(function (a, b) {
        return (isColorOption(b) ? 1 : 0) - (isColorOption(a) ? 1 : 0);
      })
      .forEach(function (option) {
        html += '<div class="option-group">';
        html += '<div class="option-buttons">';
        visibleValues(option).forEach(function (value) {
          var selected = selectedOptions[option.name] === value;
          var available = isValueAvailable(product, option.name, value);
          html +=
            '<button type="button" class="option-btn' +
            (selected ? " selected" : "") +
            '" data-option="' + option.name + '" data-value="' + value + '"' +
            (available ? "" : " disabled") +
            ">" + (isColorOption(option) ? colorLabel(value) : value) + "</button>";
        });
        html += "</div></div>";
      });
    html += "</div>";
    html += '<a class="size-chart-link" href="assets/size-chart.png" target="_blank" rel="noopener">Størrelsesguide</a>';
    html += '<div class="product-actions">';
    html += '<button type="button" id="add-to-cart-btn" class="buy-btn buy-btn-outline"' +
      (variant && variant.availableForSale ? "" : " disabled") +
      ">" + (variant ? (variant.availableForSale ? "LEGG I HANDLEKURV" : "UTSOLGT") : "VELG ALTERNATIVER") + "</button>";
    html += '<button type="button" id="buy-now-btn" class="buy-btn"' +
      (variant && variant.availableForSale ? "" : " disabled") +
      ">" + (variant ? (variant.availableForSale ? "KJØP NÅ" : "UTSOLGT") : "VELG ALTERNATIVER") + "</button>";
    html += "</div>";
    html += "</div>";

    root.innerHTML = html;

    root.querySelectorAll(".option-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedOptions[btn.getAttribute("data-option")] = btn.getAttribute("data-value");
        render(product);
      });
    });

    var addBtn = document.getElementById("add-to-cart-btn");
    if (addBtn && variant) {
      addBtn.addEventListener("click", function () {
        addToCart(variant.id, addBtn);
      });
    }

    var buyNowBtn = document.getElementById("buy-now-btn");
    if (buyNowBtn && variant) {
      buyNowBtn.addEventListener("click", function () {
        buyNow(variant.id, buyNowBtn);
      });
    }
  }

  function addToCart(variantId, button) {
    if (!window.BergenCart) {
      button.textContent = "HANDLEKURV IKKE LASTET";
      return;
    }
    button.disabled = true;
    button.textContent = "LEGGER I HANDLEKURV...";
    window.BergenCart
      .addLine(variantId, 1)
      .then(function () {
        button.disabled = false;
        button.textContent = "LAGT I HANDLEKURV";
        window.BergenCart.open();
        setTimeout(function () {
          if (button.textContent === "LAGT I HANDLEKURV") {
            button.textContent = "LEGG I HANDLEKURV";
          }
        }, 1800);
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = "NOE GIKK GALT, PRØV IGJEN";
      });
  }

  function buyNow(variantId, button) {
    if (!window.BergenCart) {
      button.textContent = "HANDLEKURV IKKE LASTET";
      return;
    }
    button.disabled = true;
    button.textContent = "ÅPNER KASSE...";
    window.BergenCart
      .addLine(variantId, 1)
      .then(function () {
        window.BergenCart.checkout();
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = "NOE GIKK GALT, PRØV IGJEN";
      });
  }

  gql(
    "query getProduct($id: ID!) { product(id: $id) { title options { name values } images(first: 5) { edges { node { url altText } } } variants(first: 50) { edges { node { id availableForSale price { amount } selectedOptions { name value } image { url altText } } } } } }",
    { id: PRODUCT_ID }
  ).then(function (data) {
    var product = data.data && data.data.product;
    if (!product) {
      root.innerHTML = "<p>Fant ikke produktet.</p>";
      return;
    }
    document.title = product.title + " – BergenTees";
    product.options.forEach(function (option) {
      selectedOptions[option.name] = defaultValue(option);
    });
    render(product);
  });
})();
