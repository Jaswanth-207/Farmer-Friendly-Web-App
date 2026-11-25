/* Dependency-free SVG line chart for market price trends. */
(function () {
  "use strict";

  var container = document.getElementById("price-chart");
  if (!container) {
    return;
  }

  var CURRENCY = document.documentElement.getAttribute("data-currency") || "\u20b9";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var WIDTH = 900;
  var HEIGHT = 340;
  var PAD = { top: 18, right: 18, bottom: 42, left: 66 };
  var COLORS = [
    "#23803f",
    "#1a5fb4",
    "#a86400",
    "#8e44ad",
    "#c0392b",
    "#16a085",
    "#7f8c8d",
    "#d35400",
  ];

  var endpoint = container.getAttribute("data-endpoint");
  var params = new URLSearchParams({
    category: container.getAttribute("data-category") || "",
    months: container.getAttribute("data-months") || "12",
    scope: container.getAttribute("data-scope") || "all",
  });
  var status = document.querySelector("[data-chart-status]");
  var legend = document.getElementById("price-chart-legend");

  function money(value) {
    return CURRENCY + value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function render(payload) {
    var months = payload.months || [];
    var series = (payload.series || []).filter(function (entry) {
      return entry.points.some(function (point) {
        return point.price != null;
      });
    });
    var overall = payload.overall || [];

    var values = [];
    months.forEach(function (_, index) {
      series.forEach(function (entry) {
        var price = entry.points[index] && entry.points[index].price;
        if (price != null) {
          values.push(price);
        }
      });
      if (overall[index] && overall[index].price != null) {
        values.push(overall[index].price);
      }
    });

    if (!values.length) {
      container.innerHTML =
        '<p class="muted">No benchmark prices recorded for this category yet.</p>';
      if (status) {
        status.textContent = "No data";
      }
      return;
    }

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = max - min || max * 0.1 || 1;
    min = Math.max(0, min - span * 0.12);
    max = max + span * 0.12;

    var innerW = WIDTH - PAD.left - PAD.right;
    var innerH = HEIGHT - PAD.top - PAD.bottom;
    var step = months.length > 1 ? innerW / (months.length - 1) : 0;

    function x(index) {
      return PAD.left + step * index;
    }
    function y(value) {
      return PAD.top + innerH - ((value - min) / (max - min)) * innerH;
    }

    var svg = el("svg", {
      viewBox: "0 0 " + WIDTH + " " + HEIGHT,
      role: "img",
      "aria-label": payload.category + " price trend",
      preserveAspectRatio: "xMidYMid meet",
    });

    // horizontal grid + y labels
    var ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var value = min + ((max - min) * t) / ticks;
      var gy = y(value);
      svg.appendChild(
        el("line", {
          class: "grid-line",
          x1: PAD.left,
          x2: WIDTH - PAD.right,
          y1: gy,
          y2: gy,
        })
      );
      var label = el("text", {
        class: "axis-text",
        x: PAD.left - 8,
        y: gy + 4,
        "text-anchor": "end",
      });
      label.textContent = CURRENCY + Math.round(value).toLocaleString("en-IN");
      svg.appendChild(label);
    }

    // x labels - thin them out on long ranges
    var labelEvery = Math.ceil(months.length / 12);
    months.forEach(function (month, index) {
      if (index % labelEvery !== 0 && index !== months.length - 1) {
        return;
      }
      var node = el("text", {
        class: "axis-text",
        x: x(index),
        y: HEIGHT - PAD.bottom + 18,
        "text-anchor": "middle",
      });
      node.textContent = (overall[index] && overall[index].label) || month;
      svg.appendChild(node);
    });

    var title = el("text", { class: "axis-title", x: PAD.left, y: 12 });
    title.textContent = payload.category + " - wholesale average per kg";
    svg.appendChild(title);

    // one line per market
    series.forEach(function (entry, seriesIndex) {
      var color = COLORS[seriesIndex % COLORS.length];
      entry.color = color;
      var path = [];
      var started = false;
      entry.points.forEach(function (point, index) {
        if (point.price == null) {
          started = false;
          return;
        }
        path.push((started ? "L" : "M") + x(index) + " " + y(point.price));
        started = true;
      });
      if (path.length) {
        svg.appendChild(el("path", { class: "series-line", d: path.join(" "), stroke: color }));
      }
      entry.points.forEach(function (point, index) {
        if (point.price == null) {
          return;
        }
        var dot = el("circle", {
          class: "series-dot",
          cx: x(index),
          cy: y(point.price),
          r: seriesIndex === 0 ? 3.2 : 2.4,
          fill: color,
        });
        var tip = el("title");
        tip.textContent =
          point.label + " - " + entry.market + ": " + money(point.price) + "/kg";
        dot.appendChild(tip);
        svg.appendChild(dot);
      });
    });

    // overall average, dashed
    var overallPath = [];
    var overallStarted = false;
    overall.forEach(function (point, index) {
      if (point.price == null) {
        overallStarted = false;
        return;
      }
      overallPath.push((overallStarted ? "L" : "M") + x(index) + " " + y(point.price));
      overallStarted = true;
    });
    if (overallPath.length) {
      svg.appendChild(
        el("path", { class: "overall-line", d: overallPath.join(" ") })
      );
    }

    // hover guide
    var hoverLine = el("line", {
      class: "hover-line",
      x1: 0,
      x2: 0,
      y1: PAD.top,
      y2: PAD.top + innerH,
      opacity: 0,
    });
    svg.appendChild(hoverLine);

    var capture = el("rect", {
      x: PAD.left - step / 2,
      y: PAD.top,
      width: innerW + step,
      height: innerH,
      fill: "transparent",
    });
    svg.appendChild(capture);

    var tipLine = document.createElement("p");
    tipLine.className = "chart-tip";
    tipLine.textContent = "Hover the chart for month-by-month detail.";

    function showIndex(index) {
      index = Math.max(0, Math.min(months.length - 1, index));
      hoverLine.setAttribute("x1", x(index));
      hoverLine.setAttribute("x2", x(index));
      hoverLine.setAttribute("opacity", 1);
      var parts = [];
      series.forEach(function (entry) {
        var point = entry.points[index];
        if (point && point.price != null) {
          parts.push(entry.market + " " + money(point.price));
        }
      });
      var label = (overall[index] && overall[index].label) || months[index];
      tipLine.textContent = label + ": " + (parts.length ? parts.join(" | ") : "no data");
    }

    capture.addEventListener("mousemove", function (event) {
      var box = svg.getBoundingClientRect();
      var svgX = ((event.clientX - box.left) / box.width) * WIDTH;
      showIndex(Math.round((svgX - PAD.left) / (step || 1)));
    });
    capture.addEventListener("mouseleave", function () {
      hoverLine.setAttribute("opacity", 0);
      tipLine.textContent = "Hover the chart for month-by-month detail.";
    });

    container.innerHTML = "";
    container.appendChild(svg);
    container.appendChild(tipLine);

    if (legend) {
      legend.innerHTML = "";
      series.forEach(function (entry) {
        var item = document.createElement("span");
        item.className = "legend-item";
        var swatch = document.createElement("span");
        swatch.className = "legend-swatch";
        swatch.style.background = entry.color;
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(entry.market));
        legend.appendChild(item);
      });
      var avg = document.createElement("span");
      avg.className = "legend-item";
      avg.innerHTML =
        '<span class="legend-swatch" style="background:linear-gradient(90deg,#1b2a22 0 50%,transparent 50% 100%)"></span>' +
        "All-market average";
      legend.appendChild(avg);
    }

    if (status) {
      status.textContent =
        months.length + " months \u00b7 " + series.length + " markets";
    }
  }

  if (status) {
    status.textContent = "Loading data\u2026";
  }

  fetch(endpoint + "?" + params.toString(), { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Request failed: " + response.status);
      }
      return response.json();
    })
    .then(render)
    .catch(function (error) {
      container.innerHTML =
        '<p class="muted">Could not load chart data. ' + error.message + "</p>";
      if (status) {
        status.textContent = "Chart unavailable";
      }
    });
})();
