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
    });
    return problems;
  }

  var ready = fetch("data/portfolios.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      var problems = validate(data);
      if (problems.length) {
        console.warn(
          "[NextGen] data/portfolios.json rejected — using the built-in base instead:\n  " +
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
                   ") — using the built-in base.");
      window.BASE_SOURCE = "built-in (no JSON)";
      return DEFAULTS;
    });

  return { ready: ready, validate: validate };
})();
