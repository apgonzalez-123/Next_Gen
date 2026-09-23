/* NextGen Portfolio Builder — portfolio base loader.
 *
 * The shelf lives in data/portfolios.json so it can be replaced without
 * touching any code. portfolios.js carries the same eight as a built-in
 * fallback, so the site still works if the JSON is missing or malformed
 * (and on file:// where fetch is blocked).
 *
 * Every page waits on BASE.ready before its first render.
 */
window.BASE = (function () {
  var DEFAULTS = { portfolios: window.PORTFOLIOS, weights: window.WEIGHTS };

  /* A replacement base is written by hand — check it before trusting it,
     and say plainly what is wrong rather than failing silently. */
  function validate(data) {
    var problems = [];
    if (!data || !Array.isArray(data.portfolios) || !data.portfolios.length) {
      return ["no `portfolios` array"];
    }
    data.portfolios.forEach(function (p, i) {
      var where = "portfolios[" + i + "]" + (p && p.id ? " (" + p.id + ")" : "");
      if (!p.id)   problems.push(where + ": missing id");
      if (!p.name) problems.push(where + ": missing name");
      if (!p.target) { problems.push(where + ": missing target"); return; }
      window.AXES.forEach(function (axis) {
        var t = p.target[axis.id];
        if (t === undefined) { problems.push(where + ": no target for '" + axis.id + "'"); return; }
        if (axis.kind === "scale" && typeof t !== "number") {
          problems.push(where + ": target '" + axis.id + "' must be a number 0-3");
        }
        if (axis.kind === "choice" && (!t || typeof t.v !== "string")) {
          problems.push(where + ": target '" + axis.id + "' must be { v: \"option\", also: [...] }");
        }
      });
      if (p.alloc) {
        var sum = Object.keys(p.alloc).reduce(function (a, k) { return a + p.alloc[k]; }, 0);
        if (Math.abs(sum - 100) > 0.5) problems.push(where + ": alloc sums to " + sum + ", not 100");
      }
      if (p.holdings) {
        var hw = p.holdings.reduce(function (a, h) { return a + (h.weight || 0); }, 0);
        if (Math.abs(hw - 100) > 0.5) {
          problems.push(where + ": holdings sum to " + hw + "%, not 100");
        }
        /* The sleeve and the headline allocation must tell the same story,
           or the pie chart and the line items contradict each other. */
        if (p.alloc) {
          var byCls = {};
          p.holdings.forEach(function (h) { byCls[h.cls] = (byCls[h.cls] || 0) + (h.weight || 0); });
          Object.keys(p.alloc).forEach(function (k) {
            if (Math.abs((byCls[k] || 0) - p.alloc[k]) > 0.5) {
              problems.push(where + ": holdings give " + (byCls[k] || 0) + "% " + k +
                            " but alloc says " + p.alloc[k] + "%");
            }
          });
        }
      }
      if (p.risk && p.risk.scenarios && !Array.isArray(p.risk.scenarios)) {
        problems.push(where + ": risk.scenarios must be an array");
      }
    });
    return problems;
  }

  /* The product shelf for the room simulation. Optional: without it the
     admin board shows the allocation but not the instruments inside it. */
  window.PRODUCTS = null;
  var productsReady = fetch("data/products.json?v=202609231908", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && d.equities && d.fixedIncome && d.notes && d.fx) window.PRODUCTS = d;
      else console.warn("[NextGen] data/products.json missing or malformed, room simulation disabled.");
    })
    .catch(function () {
      console.warn("[NextGen] could not load data/products.json, room simulation disabled.");
    });

  var ready = fetch("data/portfolios.json?v=202609231908", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      var problems = validate(data);
      if (problems.length) {
        console.warn(
          "[NextGen] data/portfolios.json rejected, using the built-in base instead:\n  " +
          problems.slice(0, 12).join("\n  ")
        );
        window.BASE_SOURCE = "built-in (JSON invalid)";
        window.BASE_PROBLEMS = problems;
        return DEFAULTS;
      }
      window.PORTFOLIOS = data.portfolios;
      if (data.weights) window.WEIGHTS = Object.assign({}, DEFAULTS.weights, data.weights);
      window.BASE_SOURCE = "data/portfolios.json";
      return data;
    })
    .catch(function (e) {
      console.warn("[NextGen] could not load data/portfolios.json (" + e.message +
                   ") and fell back to the built-in base.");
      window.BASE_SOURCE = "built-in (no JSON)";
      return DEFAULTS;
    });

  return {
    ready: Promise.all([ready, productsReady]).then(function (r) { return r[0]; }),
    validate: validate
  };
})();
