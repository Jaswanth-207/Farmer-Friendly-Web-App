/* Small form helpers: confirm dialogs, live sale totals and price guidance. */
(function () {
  "use strict";

  var CURRENCY = document.documentElement.getAttribute("data-currency") || "\u20b9";

  // Unit conversion factors against the per-kg benchmark data.
  var KG_FACTOR = { kg: 1, quintal: 100, tonne: 1000, litre: 1 };

  function money(value) {
    var rounded = Math.round(value * 100) / 100;
    return CURRENCY + rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function num(value) {
    return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  // ----- confirmation dialogs -------------------------------------------
  document.querySelectorAll("form[data-confirm]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      if (!window.confirm(form.getAttribute("data-confirm"))) {
        event.preventDefault();
      }
    });
  });

  // ----- record-a-sale form --------------------------------------------
  var saleForm = document.querySelector("[data-sale-product]");
  if (saleForm) {
    var selected = function () {
      return saleForm.options[saleForm.selectedIndex];
    };
    var qtyInput = document.querySelector("[data-sale-quantity]");
    var priceInput = document.querySelector("[data-sale-price]");
    var totalOut = document.querySelector("[data-sale-total]");
    var stockOut = document.querySelector("[data-sale-stock]");

    function refreshSale() {
      var option = selected();
      var price = parseFloat(priceInput && priceInput.value) || 0;
      var qty = parseFloat(qtyInput && qtyInput.value) || 0;
      if (totalOut) {
        totalOut.textContent = qty > 0 && price > 0 ? money(qty * price) : "\u2014";
      }
      if (stockOut && option && option.dataset.stock) {
        stockOut.textContent =
          "In stock: " + num(option.dataset.stock) + " " + option.dataset.unit;
      } else if (stockOut) {
        stockOut.textContent = "";
      }
    }

    // Prefill the asking price when the listing changes.
    saleForm.addEventListener("change", function () {
      var option = selected();
      if (option && option.dataset.price && priceInput) {
        priceInput.value = option.dataset.price;
        if (qtyInput && !qtyInput.value) {
          qtyInput.focus();
        }
      }
      refreshSale();
    });
    [qtyInput, priceInput].forEach(function (input) {
      if (input) {
        input.addEventListener("input", refreshSale);
      }
    });
    refreshSale();
  }

  // ----- listing form: unit default + benchmark hint ---------------------
  var categorySelect = document.querySelector("[data-category-select]");
  var unitSelect = document.querySelector("[data-unit-select]");
  var hint = document.querySelector("[data-benchmark-hint]");

  if (categorySelect && unitSelect) {
    var defaultsNode = document.getElementById("unit-defaults");
    var unitDefaults = {};
    if (defaultsNode) {
      try {
        unitDefaults = JSON.parse(defaultsNode.textContent);
      } catch (err) {
        unitDefaults = {};
      }
    }

    categorySelect.addEventListener("change", function () {
      var fallback = unitDefaults[categorySelect.value];
      if (fallback) {
        unitSelect.value = fallback;
      }
      loadBenchmark();
    });
  }

  function loadBenchmark() {
    if (!hint || !categorySelect) {
      return;
    }
    var form = hint.closest("form");
    var endpoint = form ? form.getAttribute("data-price-check") : null;
    var category = categorySelect.value;
    if (!endpoint || !category) {
      return;
    }
    hint.textContent = "Checking the latest benchmark\u2026";
    fetch(endpoint + "?category=" + encodeURIComponent(category) + "&months=12", {
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(response.status);
      })
      .then(function (data) {
        if (!data || data.latest == null) {
          hint.textContent = "No benchmark data for this category yet.";
          return;
        }
        var unit = unitSelect ? unitSelect.value : "kg";
        var factor = KG_FACTOR[unit];
        var latest = data.latest;
        var trend =
          data.trend_pct == null
            ? ""
            : " (" +
              (data.trend_pct >= 0 ? "+" : "") +
              data.trend_pct +
              "% over the period)";
        hint.textContent =
          data.category +
          " benchmark: " +
          money(latest) +
          "/kg" +
          (factor
            ? " \u2248 " + money(latest * factor) + "/" + unit
            : " (per kg only)") +
          trend;
      })
      .catch(function () {
        hint.textContent = "Could not load the benchmark right now.";
      });
  }

  if (hint) {
    loadBenchmark();
  }
})();
